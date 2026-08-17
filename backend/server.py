"""
CivicPulse — Smart City Intelligence Platform (Backend API)

Modular sections:
  - Config & DB
  - Security (password hashing, JWT, RBAC)
  - Models
  - Domain logic (SLA, rules-based classifier, duplicate detection, AI analysis)
  - Demo data seeding
  - Routes: auth, complaints, notifications, meta, analytics, data-sources, reports

NOTE: Demo/seed data is flagged with is_demo=True and is clearly fictional.
"""
import os
import uuid
import json
import math
import hashlib
import logging
import random
import asyncio
import requests
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------------------------------------------------------------------------
# Config & DB
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-change-me')
JWT_ALGO = 'HS256'
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('civicpulse')

app = FastAPI(title='CivicPulse API')
api = APIRouter(prefix='/api')

# ---------------------------------------------------------------------------
# Domain constants
# ---------------------------------------------------------------------------
DEPARTMENTS = [
    'Water & Sewage', 'Waste Management', 'Traffic', 'Police / Public Safety',
    'Electricity', 'Roads & Infrastructure', 'Parks',
]
PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
STATUSES = ['NEW', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED',
            'RESOLVED', 'REOPENED', 'ESCALATED', 'REJECTED', 'CANCELLED']

# SLA windows (hours) by priority
SLA_HOURS = {'CRITICAL': 6, 'HIGH': 24, 'MEDIUM': 72, 'LOW': 168}

WARDS = ['Indiranagar', 'Koramangala', 'Whitefield', 'Jayanagar', 'Malleshwaram',
         'HSR Layout', 'Yelahanka', 'BTM Layout', 'Rajajinagar', 'Hebbal']

# Keyword map for rules-based fallback classifier
RULES_MAP = {
    'Water & Sewage': ['water', 'pipe', 'pipeline', 'leak', 'sewage', 'drain', 'drainage', 'tap', 'overflow', 'flood', 'manhole', 'contaminat'],
    'Waste Management': ['garbage', 'trash', 'waste', 'litter', 'dump', 'dustbin', 'rubbish', 'debris', 'sanitation', 'smell'],
    'Traffic': ['traffic', 'signal', 'congestion', 'jam', 'parking', 'vehicle', 'road block', 'zebra', 'junction'],
    'Police / Public Safety': ['theft', 'safety', 'crime', 'harass', 'assault', 'suspicious', 'accident', 'violence', 'unsafe'],
    'Electricity': ['electric', 'power', 'wire', 'cable', 'transformer', 'streetlight', 'street light', 'outage', 'shock', 'pole', 'voltage'],
    'Roads & Infrastructure': ['road', 'pothole', 'footpath', 'sidewalk', 'bridge', 'crack', 'construction', 'pavement', 'flyover'],
    'Parks': ['park', 'tree', 'garden', 'playground', 'bench', 'lawn', 'greenery', 'plant'],
}
SEVERITY_WORDS = {
    'CRITICAL': ['exposed wire', 'live wire', 'electrocut', 'gas leak', 'collapse', 'fire', 'danger', 'injury', 'sinkhole', 'major leak', 'sewage overflow'],
    'HIGH': ['leak', 'burst', 'accident', 'blocked', 'overflow', 'flood', 'no power', 'outage', 'deep pothole'],
    'MEDIUM': ['garbage', 'pothole', 'signal', 'streetlight', 'broken'],
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


# ---------------------------------------------------------------------------
# Security helpers
# ---------------------------------------------------------------------------

def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or uuid.uuid4().hex
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120000)
    return f"{salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split('$', 1)
    except ValueError:
        return False
    return hash_password(password, salt) == stored


def create_token(user_id: str, role: str) -> str:
    payload = {'sub': user_id, 'role': role, 'iat': int(now_utc().timestamp()),
               'exp': int((now_utc() + timedelta(days=7)).timestamp())}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = authorization.split(' ', 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    user = await db.users.find_one({'id': payload['sub']}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


def require_roles(*roles):
    async def checker(user: Dict[str, Any] = Depends(get_current_user)):
        if user['role'] not in roles:
            raise HTTPException(status_code=403, detail='Insufficient permissions')
        return user
    return checker


async def audit(action: str, user: Optional[Dict[str, Any]], meta: Dict[str, Any] = None):
    await db.audit_logs.insert_one({
        'id': str(uuid.uuid4()), 'action': action,
        'user_id': (user or {}).get('id'), 'role': (user or {}).get('role'),
        'meta': meta or {}, 'at': iso(now_utc()),
    })


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = 'citizen'
    department: Optional[str] = None
    phone: Optional[str] = None
    language: str = 'en'


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class LocationIn(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None
    ward: Optional[str] = None


class MediaIn(BaseModel):
    type: str  # image | video | voice
    data: Optional[str] = None  # base64 (small) or transcript for voice
    name: Optional[str] = None


class AnalyzeIn(BaseModel):
    description: str = ''
    image_base64: Optional[str] = None
    location: Optional[LocationIn] = None


class AIPrediction(BaseModel):
    detected_issue: str
    department: str
    category: str
    priority: str
    confidence: int
    reasoning: str
    tags: List[str] = []
    safety_flag: bool = False
    source: str = 'rules'


class ComplaintIn(BaseModel):
    model_config = ConfigDict(extra='ignore')
    title: str
    description: str = ''
    department: str
    category: str
    priority: str
    location: LocationIn
    media: List[MediaIn] = []
    ai_prediction: Optional[Dict[str, Any]] = None


class StatusUpdateIn(BaseModel):
    status: str
    note: Optional[str] = ''


class AssignIn(BaseModel):
    officer_id: Optional[str] = None


class ResolutionIn(BaseModel):
    before_image: Optional[str] = None
    after_image: Optional[str] = None
    work_note: str = ''


class VerifyIn(BaseModel):
    confirmed: bool
    rating: Optional[int] = None
    comment: Optional[str] = ''


class ReopenIn(BaseModel):
    reason: str


# ---------------------------------------------------------------------------
# Domain logic
# ---------------------------------------------------------------------------

def haversine_m(lat1, lng1, lat2, lng2) -> float:
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def sla_due(priority: str, start: datetime) -> datetime:
    return start + timedelta(hours=SLA_HOURS.get(priority, 72))


def rules_classify(text: str) -> AIPrediction:
    t = (text or '').lower()
    scores = {d: 0 for d in DEPARTMENTS}
    for dept, kws in RULES_MAP.items():
        for kw in kws:
            if kw in t:
                scores[dept] += 1
    dept = max(scores, key=scores.get)
    matched = scores[dept]
    if matched == 0:
        dept = 'Roads & Infrastructure'
    # priority
    priority = 'LOW'
    safety = False
    for pr in ['CRITICAL', 'HIGH', 'MEDIUM']:
        if any(w in t for w in SEVERITY_WORDS[pr]):
            priority = pr
            if pr == 'CRITICAL':
                safety = True
            break
    confidence = min(92, 55 + matched * 10) if matched else 45
    return AIPrediction(
        detected_issue=(text.strip()[:60] or 'Civic issue') if text else 'Civic issue reported',
        department=dept, category=dept.split(' ')[0], priority=priority,
        confidence=confidence,
        reasoning='Baseline rules engine matched keywords in the description to determine routing and priority.',
        tags=[w for w in RULES_MAP[dept] if w in t][:4],
        safety_flag=safety, source='rules',
    )


async def ai_analyze(payload: AnalyzeIn) -> AIPrediction:
    """Real LLM analysis with a robust rules-based fallback so the demo never breaks."""
    fallback = rules_classify(payload.description)
    if not EMERGENT_LLM_KEY:
        return fallback
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        system = (
            'You are the AI triage engine for a municipal Smart City civic-complaint platform. '
            'Analyze the citizen report (photo if provided + description + location) and respond with STRICT JSON only, no markdown.\n'
            f'Valid departments (choose exactly one): {DEPARTMENTS}.\n'
            f'Valid priorities: {PRIORITIES}.\n'
            'Priority guidance: LOW=minor/cosmetic, MEDIUM=service degradation e.g. garbage accumulation, '
            'HIGH=significant disruption e.g. major water leakage / road blockage, '
            'CRITICAL=immediate danger to life/safety e.g. exposed live electrical wire, structural collapse, sewage flooding.\n'
            'Return JSON with keys: detected_issue (short string), department (one of the list), category (short label), '
            'priority (one of the list), confidence (integer 0-100, be honest, do not overclaim), '
            'reasoning (1-2 factual sentences), tags (array of 2-5 short strings), safety_flag (boolean).'
        )
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f'triage-{uuid.uuid4().hex[:8]}', system_message=system).with_model('gemini', 'gemini-2.5-flash')
        loc = payload.location
        loc_txt = f"Location: {loc.address or ''} (lat {loc.lat}, lng {loc.lng}), ward {loc.ward or 'unknown'}." if loc else 'Location: not provided.'
        text = f"Citizen description: {payload.description or '(no text provided)'}\n{loc_txt}\nReturn strict JSON only."
        files = []
        if payload.image_base64:
            b64 = payload.image_base64
            if ',' in b64 and b64.strip().startswith('data:'):
                b64 = b64.split(',', 1)[1]
            files = [ImageContent(image_base64=b64)]
        msg = UserMessage(text=text, file_contents=files)
        raw = await chat.send_message(msg)
        cleaned = (raw or '').strip()
        if cleaned.startswith('```'):
            cleaned = cleaned.strip('`')
            if cleaned.lower().startswith('json'):
                cleaned = cleaned[4:]
        start, end = cleaned.find('{'), cleaned.rfind('}')
        if start != -1 and end != -1:
            cleaned = cleaned[start:end + 1]
        data = json.loads(cleaned)
        dept = data.get('department', fallback.department)
        if dept not in DEPARTMENTS:
            dept = fallback.department
        pr = str(data.get('priority', fallback.priority)).upper()
        if pr not in PRIORITIES:
            pr = fallback.priority
        conf = int(data.get('confidence', fallback.confidence))
        conf = max(0, min(100, conf))
        return AIPrediction(
            detected_issue=str(data.get('detected_issue', fallback.detected_issue))[:120],
            department=dept, category=str(data.get('category', dept.split(' ')[0]))[:40],
            priority=pr, confidence=conf,
            reasoning=str(data.get('reasoning', fallback.reasoning))[:400],
            tags=[str(x)[:30] for x in (data.get('tags') or [])][:5],
            safety_flag=bool(data.get('safety_flag', pr == 'CRITICAL')),
            source='llm',
        )
    except Exception as e:  # noqa: BLE001
        logger.warning(f'AI analyze fell back to rules engine: {e}')
        return fallback


async def find_duplicate_group(dept: str, loc: LocationIn) -> Optional[str]:
    """Lightweight duplicate detection: same department, within 200m, within 72h."""
    since = iso(now_utc() - timedelta(hours=72))
    cursor = db.complaints.find(
        {'department': dept, 'created_at': {'$gte': since},
         'status': {'$nin': ['RESOLVED', 'REJECTED', 'CANCELLED']}},
        {'_id': 0, 'id': 1, 'location': 1, 'duplicate_group_id': 1})
    async for c in cursor:
        cl = c.get('location') or {}
        if 'lat' in cl and 'lng' in cl:
            if haversine_m(loc.lat, loc.lng, cl['lat'], cl['lng']) <= 200:
                return c.get('duplicate_group_id') or c['id']
    return None


def public_complaint(c: Dict[str, Any], viewer_role: str) -> Dict[str, Any]:
    """Strip sensitive citizen info for non-owner / public views."""
    c = dict(c)
    c.pop('_id', None)
    if viewer_role == 'public':
        c.pop('citizen_name', None)
        c.pop('citizen_id', None)
        c.pop('citizen_email', None)
        c.pop('citizen_phone', None)
    else:
        c.pop('citizen_email', None)
        c.pop('citizen_phone', None)
    return c


def gen_tracking_id(n: int) -> str:
    return f"SCP-{now_utc().year}-{100000 + n}"


# ---------------------------------------------------------------------------
# Routes: health & meta
# ---------------------------------------------------------------------------
@api.get('/')
async def root():
    return {'platform': 'CivicPulse', 'status': 'ok', 'departments': DEPARTMENTS}


@api.get('/meta')
async def meta():
    return {'departments': DEPARTMENTS, 'priorities': PRIORITIES, 'statuses': STATUSES,
            'wards': WARDS, 'sla_hours': SLA_HOURS}


@api.get('/departments')
async def departments():
    out = []
    for d in DEPARTMENTS:
        total = await db.complaints.count_documents({'department': d})
        active = await db.complaints.count_documents({'department': d, 'status': {'$nin': ['RESOLVED', 'REJECTED', 'CANCELLED']}})
        officers = await db.users.count_documents({'role': 'officer', 'department': d})
        out.append({'name': d, 'total': total, 'active': active, 'officers': officers})
    return out


# ---------------------------------------------------------------------------
# Routes: auth
# ---------------------------------------------------------------------------
@api.post('/auth/register')
async def register(body: RegisterIn):
    existing = await db.users.find_one({'email': body.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail='An account with this email already exists')
    role = body.role if body.role in ['citizen', 'officer', 'admin'] else 'citizen'
    user = {
        'id': str(uuid.uuid4()), 'name': body.name, 'email': body.email.lower(),
        'password_hash': hash_password(body.password), 'role': role,
        'department': body.department if role == 'officer' else None,
        'phone': body.phone, 'language': body.language,
        'created_at': iso(now_utc()), 'is_demo': False,
    }
    await db.users.insert_one(user)
    await audit('register', user, {'role': role})
    token = create_token(user['id'], role)
    user.pop('password_hash', None)
    user.pop('_id', None)
    return {'token': token, 'user': user}


@api.post('/auth/login')
async def login(body: LoginIn):
    user = await db.users.find_one({'email': body.email.lower()})
    if not user or not verify_password(body.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    token = create_token(user['id'], user['role'])
    await audit('login', user)
    user.pop('password_hash', None)
    user.pop('_id', None)
    return {'token': token, 'user': user}


@api.get('/auth/me')
async def me(user: Dict[str, Any] = Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# Routes: AI analysis
# ---------------------------------------------------------------------------
@api.post('/ai/analyze')
async def analyze(body: AnalyzeIn, user: Dict[str, Any] = Depends(get_current_user)):
    pred = await ai_analyze(body)
    await db.ai_predictions.insert_one({'id': str(uuid.uuid4()), 'user_id': user['id'],
                                        'prediction': pred.model_dump(), 'at': iso(now_utc())})
    return pred.model_dump()


# ---------------------------------------------------------------------------
# Routes: complaints
# ---------------------------------------------------------------------------
async def push_notification(user_id: str, ntype: str, title: str, body: str, complaint_id: str):
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()), 'user_id': user_id, 'type': ntype, 'title': title,
        'body': body, 'complaint_id': complaint_id, 'read': False, 'created_at': iso(now_utc()),
    })


@api.post('/complaints')
async def create_complaint(body: ComplaintIn, user: Dict[str, Any] = Depends(require_roles('citizen'))):
    if body.department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail='Invalid department')
    if body.priority not in PRIORITIES:
        raise HTTPException(status_code=400, detail='Invalid priority')
    count = await db.complaints.count_documents({})
    ts = now_utc()
    dup_group = await find_duplicate_group(body.department, body.location)
    cid = str(uuid.uuid4())
    complaint = {
        'id': cid,
        'tracking_id': gen_tracking_id(count + 1),
        'citizen_id': user['id'], 'citizen_name': user['name'],
        'title': body.title, 'description': body.description,
        'department': body.department, 'category': body.category, 'priority': body.priority,
        'ai_confidence': (body.ai_prediction or {}).get('confidence'),
        'ai_prediction': body.ai_prediction,
        'status': 'ROUTED',
        'location': body.location.model_dump(),
        'media': [m.model_dump() for m in body.media],
        'assigned_officer_id': None, 'assigned_officer_name': None,
        'status_history': [
            {'status': 'NEW', 'note': 'Complaint submitted by citizen', 'by': user['name'], 'at': iso(ts)},
            {'status': 'ROUTED', 'note': f'AI routed to {body.department}', 'by': 'AI Triage Engine', 'at': iso(ts)},
        ],
        'resolution': None, 'feedback': None,
        'duplicate_group_id': dup_group, 'is_duplicate': bool(dup_group),
        'supporters': [], 'support_count': 0,
        'sla': {'due_at': iso(sla_due(body.priority, ts)), 'breached': False},
        'created_at': iso(ts), 'updated_at': iso(ts), 'is_demo': False,
    }
    await db.complaints.insert_one(complaint)
    await audit('complaint_create', user, {'complaint_id': cid, 'department': body.department})
    await push_notification(user['id'], 'submitted', 'Complaint submitted',
                            f"{complaint['tracking_id']} routed to {body.department}", cid)
    return public_complaint(complaint, 'citizen')


@api.get('/complaints')
async def list_complaints(
    scope: str = 'mine', status: Optional[str] = None, department: Optional[str] = None,
    priority: Optional[str] = None, q: Optional[str] = None, sort: str = 'recent',
    user: Dict[str, Any] = Depends(get_current_user),
):
    query: Dict[str, Any] = {}
    role = user['role']
    if role == 'citizen':
        query['citizen_id'] = user['id']
    elif role == 'officer':
        query['department'] = user.get('department')
        if department and department != user.get('department'):
            raise HTTPException(status_code=403, detail='Cannot view other departments')
    elif role == 'admin':
        if department:
            query['department'] = department
    if status:
        query['status'] = status
    if priority:
        query['priority'] = priority
    if q:
        query['$or'] = [
            {'title': {'$regex': q, '$options': 'i'}},
            {'description': {'$regex': q, '$options': 'i'}},
            {'tracking_id': {'$regex': q, '$options': 'i'}},
            {'location.address': {'$regex': q, '$options': 'i'}},
        ]
    docs = await db.complaints.find(query, {'_id': 0}).to_list(1000)
    # SLA breach compute (read-time)
    nowi = now_utc()
    for d in docs:
        due = d.get('sla', {}).get('due_at')
        if due and d['status'] not in ['RESOLVED', 'REJECTED', 'CANCELLED']:
            try:
                d['sla']['breached'] = datetime.fromisoformat(due) < nowi
            except Exception:  # noqa: BLE001
                pass
    pr_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
    if sort == 'priority':
        docs.sort(key=lambda x: (pr_order.get(x.get('priority'), 9), x.get('created_at')), reverse=False)
    elif sort == 'oldest':
        docs.sort(key=lambda x: x.get('created_at', ''))
    else:
        docs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    viewer = 'citizen' if role == 'citizen' else role
    return [public_complaint(d, viewer) for d in docs]


@api.get('/complaints/nearby')
async def nearby(user: Dict[str, Any] = Depends(get_current_user)):
    docs = await db.complaints.find(
        {'status': {'$nin': ['CANCELLED', 'REJECTED']}}, {'_id': 0}
    ).sort('created_at', -1).to_list(20)
    out = []
    for d in docs:
        is_own = d.get('citizen_id') == user['id']
        supported = user['id'] in (d.get('supporters') or [])
        pub = public_complaint(d, 'public')
        pub['support_count'] = d.get('support_count', 0)
        pub['supported'] = supported
        pub['is_own'] = is_own
        out.append(pub)
    return out


@api.post('/complaints/{cid}/support')
async def support_complaint(cid: str, user: Dict[str, Any] = Depends(require_roles('citizen'))):
    """Citizens 'rally' behind an existing incident instead of filing a duplicate."""
    c = await db.complaints.find_one({'id': cid}, {'_id': 0})
    if not c:
        raise HTTPException(status_code=404, detail='Complaint not found')
    if c.get('citizen_id') == user['id']:
        raise HTTPException(status_code=400, detail='You already reported this incident')
    supporters = set(c.get('supporters') or [])
    if user['id'] in supporters:
        supporters.discard(user['id'])
        supported = False
    else:
        supporters.add(user['id'])
        supported = True
    await db.complaints.update_one({'id': cid}, {'$set': {'supporters': list(supporters), 'support_count': len(supporters)}})
    if supported:
        await push_notification(c['citizen_id'], 'status', 'More residents affected',
                                f"Another resident confirmed {c['tracking_id']} \u2014 {len(supporters)} now backing this report", cid)
    return {'supported': supported, 'support_count': len(supporters)}


@api.get('/incidents')
async def grouped_incidents(user: Dict[str, Any] = Depends(get_current_user)):
    """Group complaints into master incidents (by duplicate group / proximity) for the map."""
    query: Dict[str, Any] = {'status': {'$nin': ['CANCELLED', 'REJECTED']}}
    if user['role'] == 'officer':
        query['department'] = user.get('department')
    docs = await db.complaints.find(query, {'_id': 0}).to_list(3000)
    groups: Dict[str, Dict[str, Any]] = {}
    pr_rank = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3}
    for d in docs:
        gid = d.get('duplicate_group_id') or d['id']
        g = groups.get(gid)
        if not g:
            groups[gid] = {
                'group_id': gid, 'title': d['title'], 'department': d['department'],
                'category': d.get('category'), 'priority': d.get('priority', 'LOW'),
                'location': d.get('location'), 'reports': 1,
                'supporters': d.get('support_count', 0), 'lead_id': d['id'],
                'created_at': d.get('created_at'),
            }
        else:
            g['reports'] += 1
            g['supporters'] += d.get('support_count', 0)
            if pr_rank.get(d.get('priority', 'LOW'), 0) > pr_rank.get(g['priority'], 0):
                g['priority'] = d.get('priority')
            if d.get('created_at', '') < g.get('created_at', ''):
                g['location'] = d.get('location')
                g['lead_id'] = d['id']
                g['created_at'] = d.get('created_at')
    result = list(groups.values())
    for g in result:
        g['total_voices'] = g['reports'] + g['supporters']
    result.sort(key=lambda x: x['total_voices'], reverse=True)
    return result


@api.get('/complaints/{cid}')
async def get_complaint(cid: str, user: Dict[str, Any] = Depends(get_current_user)):
    c = await db.complaints.find_one({'id': cid}, {'_id': 0})
    if not c:
        raise HTTPException(status_code=404, detail='Complaint not found')
    role = user['role']
    if role == 'citizen' and c.get('citizen_id') != user['id']:
        raise HTTPException(status_code=403, detail='Not authorized to view this complaint')
    if role == 'officer' and c.get('department') != user.get('department'):
        raise HTTPException(status_code=403, detail='Not authorized to view this complaint')
    # linked duplicates
    group = c.get('duplicate_group_id')
    linked = 0
    if group:
        linked = await db.complaints.count_documents({'$or': [{'duplicate_group_id': group}, {'id': group}]})
    c['linked_reports'] = linked
    return public_complaint(c, 'citizen' if role == 'citizen' else role)


async def _apply_status(c, new_status, note, actor, extra=None):
    ts = now_utc()
    update = {'status': new_status, 'updated_at': iso(ts)}
    if extra:
        update.update(extra)
    hist = c.get('status_history', [])
    hist.append({'status': new_status, 'note': note, 'by': actor, 'at': iso(ts)})
    update['status_history'] = hist
    await db.complaints.update_one({'id': c['id']}, {'$set': update})
    return update


@api.patch('/complaints/{cid}/assign')
async def assign_complaint(cid: str, body: AssignIn, user: Dict[str, Any] = Depends(require_roles('officer', 'admin'))):
    c = await db.complaints.find_one({'id': cid}, {'_id': 0})
    if not c:
        raise HTTPException(status_code=404, detail='Complaint not found')
    if user['role'] == 'officer' and c.get('department') != user.get('department'):
        raise HTTPException(status_code=403, detail='Not your department')
    officer_id = body.officer_id or user['id']
    officer = await db.users.find_one({'id': officer_id}, {'_id': 0, 'password_hash': 0})
    if not officer:
        raise HTTPException(status_code=404, detail='Officer not found')
    await _apply_status(c, 'ASSIGNED', f"Assigned to {officer['name']}", user['name'],
                        {'assigned_officer_id': officer_id, 'assigned_officer_name': officer['name']})
    await push_notification(c['citizen_id'], 'assigned', 'Officer assigned',
                            f"{c['tracking_id']} assigned to {officer['name']}", cid)
    await audit('complaint_assign', user, {'complaint_id': cid})
    return await get_complaint_raw(cid)


@api.patch('/complaints/{cid}/status')
async def update_status(cid: str, body: StatusUpdateIn, user: Dict[str, Any] = Depends(require_roles('officer', 'admin'))):
    if body.status not in STATUSES:
        raise HTTPException(status_code=400, detail='Invalid status')
    c = await db.complaints.find_one({'id': cid}, {'_id': 0})
    if not c:
        raise HTTPException(status_code=404, detail='Complaint not found')
    if user['role'] == 'officer' and c.get('department') != user.get('department'):
        raise HTTPException(status_code=403, detail='Not your department')
    await _apply_status(c, body.status, body.note or f'Status changed to {body.status}', user['name'])
    ntype = {'IN_PROGRESS': 'work_started', 'ESCALATED': 'escalation'}.get(body.status, 'status')
    await push_notification(c['citizen_id'], ntype, 'Complaint update',
                            f"{c['tracking_id']} is now {body.status.replace('_', ' ').title()}", cid)
    await audit('complaint_status', user, {'complaint_id': cid, 'status': body.status})
    return await get_complaint_raw(cid)


@api.post('/complaints/{cid}/resolution')
async def submit_resolution(cid: str, body: ResolutionIn, user: Dict[str, Any] = Depends(require_roles('officer', 'admin'))):
    c = await db.complaints.find_one({'id': cid}, {'_id': 0})
    if not c:
        raise HTTPException(status_code=404, detail='Complaint not found')
    if user['role'] == 'officer' and c.get('department') != user.get('department'):
        raise HTTPException(status_code=403, detail='Not your department')
    if not body.after_image and not body.work_note:
        raise HTTPException(status_code=400, detail='Resolution requires evidence (after image or work note)')
    resolution = {
        'before_image': body.before_image, 'after_image': body.after_image,
        'work_note': body.work_note, 'submitted_by': user['name'], 'submitted_at': iso(now_utc()),
    }
    await _apply_status(c, 'RESOLUTION_SUBMITTED', 'Resolution evidence submitted; awaiting citizen verification',
                        user['name'], {'resolution': resolution})
    await push_notification(c['citizen_id'], 'verification_required', 'Verification required',
                            f"Please verify resolution for {c['tracking_id']}", cid)
    await audit('complaint_resolution', user, {'complaint_id': cid})
    return await get_complaint_raw(cid)


@api.post('/complaints/{cid}/verify')
async def verify_resolution(cid: str, body: VerifyIn, user: Dict[str, Any] = Depends(require_roles('citizen'))):
    c = await db.complaints.find_one({'id': cid}, {'_id': 0})
    if not c:
        raise HTTPException(status_code=404, detail='Complaint not found')
    if c.get('citizen_id') != user['id']:
        raise HTTPException(status_code=403, detail='Not your complaint')
    if body.confirmed:
        feedback = {'rating': body.rating, 'comment': body.comment, 'resolved_confirmed': True, 'at': iso(now_utc())}
        await _apply_status(c, 'RESOLVED', 'Citizen confirmed resolution', user['name'], {'feedback': feedback})
        await push_notification(user['id'], 'resolved', 'Complaint resolved',
                                f"{c['tracking_id']} marked resolved. Thank you!", cid)
    else:
        feedback = {'rating': body.rating, 'comment': body.comment, 'resolved_confirmed': False, 'at': iso(now_utc())}
        await _apply_status(c, 'REOPENED', f"Citizen rejected resolution: {body.comment or 'not resolved'}",
                            user['name'], {'feedback': feedback})
        await push_notification(user['id'], 'reopened', 'Complaint reopened',
                                f"{c['tracking_id']} reopened for further action", cid)
    await audit('complaint_verify', user, {'complaint_id': cid, 'confirmed': body.confirmed})
    return await get_complaint_raw(cid)


@api.post('/complaints/{cid}/feedback')
async def add_feedback(cid: str, body: VerifyIn, user: Dict[str, Any] = Depends(require_roles('citizen'))):
    c = await db.complaints.find_one({'id': cid}, {'_id': 0})
    if not c or c.get('citizen_id') != user['id']:
        raise HTTPException(status_code=404, detail='Complaint not found')
    feedback = dict(c.get('feedback') or {})
    feedback.update({'rating': body.rating, 'comment': body.comment, 'at': iso(now_utc())})
    await db.complaints.update_one({'id': cid}, {'$set': {'feedback': feedback}})
    return await get_complaint_raw(cid)


async def get_complaint_raw(cid: str):
    c = await db.complaints.find_one({'id': cid}, {'_id': 0})
    return c


# ---------------------------------------------------------------------------
# Routes: notifications
# ---------------------------------------------------------------------------
@api.get('/notifications')
async def get_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    docs = await db.notifications.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return docs


@api.post('/notifications/{nid}/read')
async def read_notification(nid: str, user: Dict[str, Any] = Depends(get_current_user)):
    await db.notifications.update_one({'id': nid, 'user_id': user['id']}, {'$set': {'read': True}})
    return {'ok': True}


@api.post('/notifications/read-all')
async def read_all(user: Dict[str, Any] = Depends(get_current_user)):
    await db.notifications.update_many({'user_id': user['id']}, {'$set': {'read': True}})
    return {'ok': True}


# ---------------------------------------------------------------------------
# Routes: analytics
# ---------------------------------------------------------------------------
@api.get('/analytics/overview')
async def analytics_overview(department: Optional[str] = None,
                             user: Dict[str, Any] = Depends(require_roles('officer', 'admin'))):
    query: Dict[str, Any] = {}
    if user['role'] == 'officer':
        query['department'] = user.get('department')
    elif department:
        query['department'] = department
    docs = await db.complaints.find(query, {'_id': 0}).to_list(5000)
    total = len(docs)
    resolved = [d for d in docs if d['status'] == 'RESOLVED']
    active = [d for d in docs if d['status'] not in ['RESOLVED', 'REJECTED', 'CANCELLED']]
    critical = [d for d in docs if d.get('priority') == 'CRITICAL' and d['status'] not in ['RESOLVED', 'REJECTED', 'CANCELLED']]
    nowi = now_utc()
    breached = 0
    for d in active:
        due = d.get('sla', {}).get('due_at')
        if due:
            try:
                if datetime.fromisoformat(due) < nowi:
                    breached += 1
            except Exception:  # noqa: BLE001
                pass
    reopened = len([d for d in docs if d['status'] == 'REOPENED'])
    # satisfaction
    ratings = [d['feedback']['rating'] for d in docs if d.get('feedback') and d['feedback'].get('rating')]
    satisfaction = round(sum(ratings) / len(ratings), 2) if ratings else None
    # resolution time
    res_hours = []
    for d in resolved:
        try:
            created = datetime.fromisoformat(d['created_at'])
            res_at = datetime.fromisoformat(d['status_history'][-1]['at'])
            res_hours.append((res_at - created).total_seconds() / 3600)
        except Exception:  # noqa: BLE001
            pass
    avg_res = round(sum(res_hours) / len(res_hours), 1) if res_hours else None

    by_department = {}
    by_priority = {p: 0 for p in PRIORITIES}
    by_status = {}
    by_ward = {}
    for d in docs:
        by_department[d['department']] = by_department.get(d['department'], 0) + 1
        by_priority[d.get('priority', 'LOW')] = by_priority.get(d.get('priority', 'LOW'), 0) + 1
        by_status[d['status']] = by_status.get(d['status'], 0) + 1
        w = (d.get('location') or {}).get('ward') or 'Unknown'
        by_ward[w] = by_ward.get(w, 0) + 1

    # 14-day trend
    trend = []
    for i in range(13, -1, -1):
        day = (nowi - timedelta(days=i)).date()
        day_str = day.isoformat()
        created_count = sum(1 for d in docs if d.get('created_at', '')[:10] == day_str)
        resolved_count = sum(1 for d in resolved if d['status_history'][-1]['at'][:10] == day_str)
        trend.append({'date': day.strftime('%d %b'), 'reported': created_count, 'resolved': resolved_count})

    hotspots = sorted([{'ward': k, 'count': v} for k, v in by_ward.items()], key=lambda x: x['count'], reverse=True)[:6]
    return {
        'total': total, 'active': len(active), 'resolved': len(resolved),
        'critical': len(critical), 'sla_breached': breached, 'reopened': reopened,
        'satisfaction': satisfaction, 'avg_resolution_hours': avg_res,
        'resolution_rate': round(len(resolved) / total * 100, 1) if total else 0,
        'by_department': [{'department': k, 'count': v} for k, v in by_department.items()],
        'by_priority': [{'priority': k, 'count': by_priority[k]} for k in PRIORITIES],
        'by_status': [{'status': k, 'count': v} for k, v in by_status.items()],
        'trend': trend, 'hotspots': hotspots,
    }


@api.get('/analytics/department-performance')
async def department_performance(user: Dict[str, Any] = Depends(require_roles('admin'))):
    out = []
    nowi = now_utc()
    for d in DEPARTMENTS:
        docs = await db.complaints.find({'department': d}, {'_id': 0}).to_list(5000)
        total = len(docs)
        resolved = [x for x in docs if x['status'] == 'RESOLVED']
        active = [x for x in docs if x['status'] not in ['RESOLVED', 'REJECTED', 'CANCELLED']]
        breached = 0
        for x in active:
            due = x.get('sla', {}).get('due_at')
            if due:
                try:
                    if datetime.fromisoformat(due) < nowi:
                        breached += 1
                except Exception:  # noqa: BLE001
                    pass
        ratings = [x['feedback']['rating'] for x in docs if x.get('feedback') and x['feedback'].get('rating')]
        out.append({
            'department': d, 'total': total, 'active': len(active), 'resolved': len(resolved),
            'resolution_rate': round(len(resolved) / total * 100, 1) if total else 0,
            'sla_breached': breached,
            'satisfaction': round(sum(ratings) / len(ratings), 2) if ratings else None,
        })
    return out


@api.get('/map/points')
async def map_points(user: Dict[str, Any] = Depends(require_roles('officer', 'admin'))):
    query: Dict[str, Any] = {}
    if user['role'] == 'officer':
        query['department'] = user.get('department')
    docs = await db.complaints.find(query, {'_id': 0, 'id': 1, 'tracking_id': 1, 'department': 1,
                                            'priority': 1, 'status': 1, 'location': 1, 'title': 1, 'category': 1}).to_list(2000)
    return docs


# ---------------------------------------------------------------------------
# Routes: data sources & reports
# ---------------------------------------------------------------------------
@api.get('/data-sources')
async def data_sources(user: Dict[str, Any] = Depends(require_roles('admin'))):
    docs = await db.api_sources.find({}, {'_id': 0}).to_list(200)
    return docs


@api.get('/reports')
async def reports(scope: str = 'city', user: Dict[str, Any] = Depends(require_roles('officer', 'admin'))):
    query: Dict[str, Any] = {}
    if user['role'] == 'officer':
        query = {'scope': 'department', 'department': user.get('department')}
    elif scope == 'department':
        query = {'scope': 'department'}
    else:
        query = {'scope': 'city'}
    docs = await db.analytics_reports.find(query, {'_id': 0}).sort('generated_at', -1).to_list(50)
    return docs


@api.get('/reports/{rid}')
async def report_detail(rid: str, user: Dict[str, Any] = Depends(require_roles('officer', 'admin'))):
    doc = await db.analytics_reports.find_one({'id': rid}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail='Report not found')
    if user['role'] == 'officer' and doc.get('department') != user.get('department'):
        raise HTTPException(status_code=403, detail='Not authorized')
    return doc


@api.get('/admin/users')
async def admin_users(user: Dict[str, Any] = Depends(require_roles('admin'))):
    docs = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(500)
    return docs


# ---------------------------------------------------------------------------
# Routes: Live City Signals (REAL open data via Open-Meteo, no API key needed)
# ---------------------------------------------------------------------------
CITY_LAT, CITY_LNG = 12.9716, 77.5946
_signals_cache = {'data': None, 'at': None}
WEATHER_CODES = {0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog',
                 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle', 61: 'Light rain',
                 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 71: 'Light snow', 80: 'Rain showers',
                 81: 'Rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm', 96: 'Thunderstorm w/ hail',
                 99: 'Thunderstorm w/ hail'}


def _fetch_signals_sync():
    out = {'source': 'Open-Meteo (open data, no API key required)', 'city': 'Bengaluru'}
    weather = None
    try:
        w = requests.get('https://api.open-meteo.com/v1/forecast', params={
            'latitude': CITY_LAT, 'longitude': CITY_LNG,
            'current': 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
            'timezone': 'Asia/Kolkata'}, timeout=8).json()
        cur = w.get('current', {}) or {}
        if cur.get('temperature_2m') is not None:
            weather = {
                'temperature': cur.get('temperature_2m'), 'humidity': cur.get('relative_humidity_2m'),
                'precipitation': cur.get('precipitation'), 'wind_speed': cur.get('wind_speed_10m'),
                'weather_code': cur.get('weather_code'),
                'description': WEATHER_CODES.get(cur.get('weather_code'), 'Unknown'),
                'provider': 'Open-Meteo',
            }
    except Exception as e:  # noqa: BLE001
        logger.warning(f'open-meteo weather failed: {e}')
    if not weather:
        try:  # fallback: wttr.in (free, no key)
            j = requests.get('https://wttr.in/Bengaluru', params={'format': 'j1'},
                             headers={'User-Agent': 'curl/8'}, timeout=8).json()
            cc = (j.get('current_condition') or [{}])[0]
            def _num(x):
                try:
                    return float(x)
                except (TypeError, ValueError):
                    return None
            weather = {
                'temperature': _num(cc.get('temp_C')), 'humidity': _num(cc.get('humidity')),
                'precipitation': _num(cc.get('precipMM')), 'wind_speed': _num(cc.get('windspeedKmph')),
                'weather_code': None,
                'description': (cc.get('weatherDesc') or [{}])[0].get('value', 'Unknown'),
                'provider': 'wttr.in',
            }
        except Exception as e:  # noqa: BLE001
            logger.warning(f'wttr.in weather failed: {e}')
    out['weather'] = weather
    try:
        lats = ','.join([str(CITY_LAT)] + [str(WARD_COORDS[w][0]) for w in WARDS])
        lngs = ','.join([str(CITY_LNG)] + [str(WARD_COORDS[w][1]) for w in WARDS])
        aq = requests.get('https://air-quality-api.open-meteo.com/v1/air-quality', params={
            'latitude': lats, 'longitude': lngs, 'current': 'us_aqi,pm2_5,pm10',
            'timezone': 'Asia/Kolkata'}, timeout=8).json()
        items = aq if isinstance(aq, list) else [aq]
        city = (items[0].get('current', {}) if items else {}) or {}
        out['air_quality'] = {'us_aqi': city.get('us_aqi'), 'pm2_5': city.get('pm2_5'), 'pm10': city.get('pm10')}
        wards = []
        for i, wname in enumerate(WARDS):
            idx = i + 1
            if idx < len(items):
                c = (items[idx].get('current', {}) or {})
                wards.append({'ward': wname, 'us_aqi': c.get('us_aqi'), 'pm2_5': c.get('pm2_5')})
        out['ward_air_quality'] = sorted(wards, key=lambda x: (x['us_aqi'] or 0), reverse=True)
    except Exception as e:  # noqa: BLE001
        logger.warning(f'air quality fetch failed: {e}')
        out['air_quality'] = None
        out['ward_air_quality'] = []
    return out


async def get_city_signals(force=False):
    nowi = now_utc()
    cache = _signals_cache
    if not force and cache['data'] and cache['at'] and (nowi - cache['at']).total_seconds() < 1200:
        return {**cache['data'], 'fetched_at': iso(cache['at']), 'cached': True}
    data = await asyncio.to_thread(_fetch_signals_sync)
    cache['data'] = data
    cache['at'] = nowi
    return {**data, 'fetched_at': iso(nowi), 'cached': False}


@api.get('/city-signals')
async def city_signals(user: Dict[str, Any] = Depends(get_current_user)):
    return await get_city_signals()


# ---------------------------------------------------------------------------
# Routes: Report Scheduler (auto-generate & deliver 12-hour reports)
# ---------------------------------------------------------------------------
SCHED_INTERVAL_HOURS = 12


async def ensure_scheduler():
    st = await db.scheduler_state.find_one({'id': 'default'}, {'_id': 0})
    if not st:
        nowi = now_utc()
        st = {'id': 'default', 'enabled': True, 'interval_hours': SCHED_INTERVAL_HOURS,
              'last_run': iso(nowi), 'next_run': iso(nowi + timedelta(hours=SCHED_INTERVAL_HOURS)),
              'last_reports': 0, 'last_deliveries': 0, 'last_trigger': 'seed'}
        await db.scheduler_state.insert_one(dict(st))
    return st


async def deliver_reports(reports, triggered_by='scheduler'):
    admins = await db.users.find({'role': 'admin'}, {'_id': 0}).to_list(50)
    officers = await db.users.find({'role': 'officer'}, {'_id': 0}).to_list(300)
    delivered = 0
    for r in reports:
        if r.get('scope') == 'city':
            recipients = [(a['id'], a['name'], 'admin') for a in admins]
        else:
            recipients = [(o['id'], o['name'], 'officer') for o in officers if o.get('department') == r.get('department')]
        for rid, rname, role in recipients:
            await db.report_deliveries.insert_one({
                'id': str(uuid.uuid4()), 'report_id': r['id'], 'report_title': r['title'],
                'scope': r.get('scope'), 'department': r.get('department'),
                'recipient_id': rid, 'recipient_name': rname, 'recipient_role': role,
                'channel': 'in-app (email/SMS queued*)', 'status': 'delivered',
                'triggered_by': triggered_by, 'at': iso(now_utc()), 'is_demo': triggered_by == 'seed',
            })
            await push_notification(rid, 'report', 'Intelligence report ready', f"{r['title']} has been delivered", None)
            delivered += 1
    return delivered


async def run_report_cycle(triggered_by='scheduler'):
    reports = await generate_period_reports(gen_at=now_utc(), is_demo=(triggered_by == 'seed'))
    delivered = await deliver_reports(reports, triggered_by)
    nowi = now_utc()
    await db.scheduler_state.update_one({'id': 'default'}, {'$set': {
        'id': 'default', 'enabled': True, 'interval_hours': SCHED_INTERVAL_HOURS,
        'last_run': iso(nowi), 'next_run': iso(nowi + timedelta(hours=SCHED_INTERVAL_HOURS)),
        'last_reports': len(reports), 'last_deliveries': delivered, 'last_trigger': triggered_by,
    }}, upsert=True)
    return {'reports': len(reports), 'deliveries': delivered}


async def scheduler_loop():
    await asyncio.sleep(25)
    while True:
        try:
            st = await ensure_scheduler()
            nr = st.get('next_run')
            if st.get('enabled') and nr and datetime.fromisoformat(nr) <= now_utc():
                logger.info('Scheduler: running 12-hour report cycle')
                await run_report_cycle('scheduler')
        except Exception as e:  # noqa: BLE001
            logger.warning(f'scheduler loop error: {e}')
        await asyncio.sleep(300)


@api.get('/scheduler')
async def scheduler_status(user: Dict[str, Any] = Depends(require_roles('officer', 'admin'))):
    st = await ensure_scheduler()
    st.pop('_id', None)
    dq: Dict[str, Any] = {}
    if user['role'] == 'officer':
        dq = {'recipient_id': user['id']}
    deliveries = await db.report_deliveries.find(dq, {'_id': 0}).sort('at', -1).to_list(40)
    return {'state': st, 'deliveries': deliveries}


@api.post('/scheduler/run')
async def scheduler_run(user: Dict[str, Any] = Depends(require_roles('admin'))):
    res = await run_report_cycle('manual')
    await audit('scheduler_run', user, res)
    return res


# ---------------------------------------------------------------------------
# Demo data seeding
# ---------------------------------------------------------------------------
WARD_COORDS = {
    'Indiranagar': (12.9719, 77.6412), 'Koramangala': (12.9352, 77.6245),
    'Whitefield': (12.9698, 77.7500), 'Jayanagar': (12.9250, 77.5938),
    'Malleshwaram': (13.0035, 77.5647), 'HSR Layout': (12.9116, 77.6474),
    'Yelahanka': (13.1007, 77.5963), 'BTM Layout': (12.9166, 77.6101),
    'Rajajinagar': (12.9915, 77.5551), 'Hebbal': (13.0358, 77.5970),
}

SEED_ISSUES = {
    'Water & Sewage': [('Water pipeline leakage flooding the street', 'HIGH', 'Pipeline Leak'),
                       ('Sewage overflow near residential block', 'CRITICAL', 'Sewage Overflow'),
                       ('Low water pressure for three days', 'MEDIUM', 'Supply Issue')],
    'Waste Management': [('Garbage accumulation not collected for a week', 'MEDIUM', 'Garbage'),
                         ('Illegal dumping of construction debris', 'MEDIUM', 'Illegal Dumping'),
                         ('Overflowing public dustbin', 'LOW', 'Bin Overflow')],
    'Traffic': [('Malfunctioning traffic signal at junction', 'HIGH', 'Signal Fault'),
                ('Illegal parking blocking the road', 'MEDIUM', 'Parking'),
                ('Faded zebra crossing near school', 'LOW', 'Road Marking')],
    'Police / Public Safety': [('Suspicious activity reported at park at night', 'HIGH', 'Public Safety'),
                               ('Poorly lit street feels unsafe', 'MEDIUM', 'Safety'),
                               ('Minor road accident, needs attention', 'HIGH', 'Accident')],
    'Electricity': [('Exposed live electrical wire on footpath', 'CRITICAL', 'Exposed Wire'),
                    ('Street light not working for a week', 'MEDIUM', 'Street Light'),
                    ('Frequent power outages in the area', 'HIGH', 'Power Outage')],
    'Roads & Infrastructure': [('Large pothole causing accidents', 'HIGH', 'Pothole'),
                               ('Broken footpath, unsafe for pedestrians', 'MEDIUM', 'Footpath'),
                               ('Cracks appearing on flyover pillar', 'CRITICAL', 'Structural')],
    'Parks': [('Broken playground equipment in park', 'MEDIUM', 'Playground'),
              ('Fallen tree blocking park path', 'LOW', 'Tree'),
              ('Park lawn needs maintenance', 'LOW', 'Maintenance')],
}

CITIZEN_NAMES = ['Aarav Sharma', 'Diya Nair', 'Rohan Verma', 'Ananya Rao', 'Vikram Singh',
                 'Meera Iyer', 'Kabir Khan', 'Sanya Gupta']


async def seed_demo():
    if await db.users.count_documents({'is_demo': True}) > 0:
        return
    logger.info('Seeding demo data...')
    demo_pw = hash_password('demo1234')

    # Admin
    admin = {'id': str(uuid.uuid4()), 'name': 'Rajesh Kumar', 'email': 'admin@smartcity.gov',
             'password_hash': demo_pw, 'role': 'admin', 'department': None, 'phone': '+91-90000-00001',
             'language': 'en', 'created_at': iso(now_utc()), 'is_demo': True}
    await db.users.insert_one(admin)

    # One primary officer (Water) + officers per dept
    officers_by_dept = {}
    officer_seed = [
        ('officer@smartcity.gov', 'Sunita Reddy', 'Water & Sewage'),
    ]
    dept_officer_names = {
        'Water & Sewage': 'Sunita Reddy', 'Waste Management': 'Arjun Menon', 'Traffic': 'Neha Joshi',
        'Police / Public Safety': 'Vivek Nair', 'Electricity': 'Priya Das',
        'Roads & Infrastructure': 'Karthik Rao', 'Parks': 'Fatima Sheikh',
    }
    for i, (dept, oname) in enumerate(dept_officer_names.items()):
        email = 'officer@smartcity.gov' if dept == 'Water & Sewage' else f"officer.{dept.split(' ')[0].lower().replace('/','')}@smartcity.gov"
        oid = str(uuid.uuid4())
        await db.users.insert_one({'id': oid, 'name': oname, 'email': email, 'password_hash': demo_pw,
                                   'role': 'officer', 'department': dept, 'phone': f'+91-90000-1000{i}',
                                   'language': 'en', 'created_at': iso(now_utc()), 'is_demo': True})
        officers_by_dept[dept] = {'id': oid, 'name': oname}

    # Demo citizen (login) + extra citizens
    citizen = {'id': str(uuid.uuid4()), 'name': 'Priya Menon', 'email': 'citizen@smartcity.gov',
               'password_hash': demo_pw, 'role': 'citizen', 'department': None, 'phone': '+91-98800-00001',
               'language': 'en', 'created_at': iso(now_utc()), 'is_demo': True}
    await db.users.insert_one(citizen)
    citizen_ids = [(citizen['id'], citizen['name'])]
    for nm in CITIZEN_NAMES:
        cid = str(uuid.uuid4())
        await db.users.insert_one({'id': cid, 'name': nm, 'email': f"{nm.split(' ')[0].lower()}@example.com",
                                   'password_hash': demo_pw, 'role': 'citizen', 'department': None,
                                   'phone': '+91-98800-00000', 'language': 'en',
                                   'created_at': iso(now_utc()), 'is_demo': True})
        citizen_ids.append((cid, nm))

    # Complaints
    count = 0
    statuses_pool = ['NEW', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED', 'ESCALATED', 'REOPENED']
    for dept, issues in SEED_ISSUES.items():
        for issue_text, base_pr, cat in issues:
            for rep in range(random.randint(2, 4)):
                count += 1
                ward = random.choice(WARDS)
                base = WARD_COORDS[ward]
                lat = base[0] + random.uniform(-0.006, 0.006)
                lng = base[1] + random.uniform(-0.006, 0.006)
                created = now_utc() - timedelta(hours=random.randint(2, 320))
                status = random.choice(statuses_pool)
                priority = base_pr
                cid_owner, cname = random.choice(citizen_ids)
                officer = officers_by_dept[dept]
                hist = [{'status': 'NEW', 'note': 'Complaint submitted by citizen', 'by': cname, 'at': iso(created)},
                        {'status': 'ROUTED', 'note': f'AI routed to {dept}', 'by': 'AI Triage Engine', 'at': iso(created + timedelta(minutes=2))}]
                assigned_id = assigned_name = None
                resolution = feedback = None
                order = ['NEW', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED']
                if status in order:
                    idx = order.index(status)
                else:
                    idx = 3
                if idx >= 2:
                    assigned_id, assigned_name = officer['id'], officer['name']
                    hist.append({'status': 'ASSIGNED', 'note': f"Assigned to {officer['name']}", 'by': 'Dept Dispatcher', 'at': iso(created + timedelta(hours=1))})
                if idx >= 3:
                    hist.append({'status': 'IN_PROGRESS', 'note': 'Field team dispatched', 'by': officer['name'], 'at': iso(created + timedelta(hours=3))})
                if idx >= 4:
                    resolution = {'before_image': None, 'after_image': None, 'work_note': 'Issue addressed by field team; site cleared and verified.',
                                  'submitted_by': officer['name'], 'submitted_at': iso(created + timedelta(hours=8))}
                    hist.append({'status': 'RESOLUTION_SUBMITTED', 'note': 'Resolution evidence submitted', 'by': officer['name'], 'at': iso(created + timedelta(hours=8))})
                if status == 'RESOLVED':
                    rating = random.randint(3, 5)
                    feedback = {'rating': rating, 'comment': 'Resolved satisfactorily.', 'resolved_confirmed': True, 'at': iso(created + timedelta(hours=10))}
                    hist.append({'status': 'RESOLVED', 'note': 'Citizen confirmed resolution', 'by': cname, 'at': iso(created + timedelta(hours=10))})
                if status == 'ESCALATED':
                    hist.append({'status': 'ESCALATED', 'note': 'SLA at risk — escalated to senior officer', 'by': 'SLA Monitor', 'at': iso(created + timedelta(hours=6))})
                if status == 'REOPENED':
                    feedback = {'rating': 2, 'comment': 'Issue persists after visit.', 'resolved_confirmed': False, 'at': iso(created + timedelta(hours=12))}
                    hist.append({'status': 'REOPENED', 'note': 'Citizen rejected resolution', 'by': cname, 'at': iso(created + timedelta(hours=12))})
                conf = random.randint(78, 96)
                complaint = {
                    'id': str(uuid.uuid4()), 'tracking_id': gen_tracking_id(count),
                    'citizen_id': cid_owner, 'citizen_name': cname,
                    'title': issue_text, 'description': issue_text + '. Reported by resident, needs prompt attention.',
                    'department': dept, 'category': cat, 'priority': priority, 'ai_confidence': conf,
                    'ai_prediction': {'detected_issue': issue_text, 'department': dept, 'category': cat,
                                      'priority': priority, 'confidence': conf,
                                      'reasoning': 'Classified from citizen media and description.',
                                      'tags': [cat.lower()], 'safety_flag': priority == 'CRITICAL', 'source': 'llm'},
                    'status': status, 'location': {'lat': round(lat, 6), 'lng': round(lng, 6),
                                                   'address': f'{ward}, Bengaluru', 'ward': ward},
                    'media': [{'type': 'image', 'data': None, 'name': 'evidence.jpg'}],
                    'assigned_officer_id': assigned_id, 'assigned_officer_name': assigned_name,
                    'status_history': hist, 'resolution': resolution, 'feedback': feedback,
                    'duplicate_group_id': None, 'is_duplicate': False,
                    'supporters': [], 'support_count': 0,
                    'sla': {'due_at': iso(sla_due(priority, created)), 'breached': False},
                    'created_at': iso(created), 'updated_at': iso(created), 'is_demo': True,
                }
                await db.complaints.insert_one(complaint)

    # Explicit duplicate clusters (master incidents citizens can rally behind)
    clusters = [
        ('Waste Management', 'Garbage dump overflowing at street corner', 'MEDIUM', 'Garbage', 'HSR Layout', 4),
        ('Water & Sewage', 'Major water pipeline burst flooding the lane', 'HIGH', 'Pipeline Leak', 'Indiranagar', 3),
        ('Roads & Infrastructure', 'Dangerous pothole cluster on main road', 'HIGH', 'Pothole', 'Koramangala', 3),
    ]
    for dept, text, pr, cat, ward, n in clusters:
        base = WARD_COORDS[ward]
        group_created = now_utc() - timedelta(hours=random.randint(6, 40))
        group_id = None
        supporters_pool = [cid for cid, _ in citizen_ids]
        for k in range(n):
            reporter_id, reporter_name = citizen_ids[(k + 1) % len(citizen_ids)]
            lat = base[0] + random.uniform(-0.0008, 0.0008)
            lng = base[1] + random.uniform(-0.0008, 0.0008)
            created = group_created + timedelta(minutes=15 * k)
            cid = str(uuid.uuid4())
            if group_id is None:
                group_id = cid
            count += 1
            supers = random.sample(supporters_pool, random.randint(2, 5))
            comp = {
                'id': cid, 'tracking_id': gen_tracking_id(count),
                'citizen_id': reporter_id, 'citizen_name': reporter_name,
                'title': text, 'description': text + '. Multiple residents affected.',
                'department': dept, 'category': cat, 'priority': pr, 'ai_confidence': random.randint(82, 95),
                'ai_prediction': {'detected_issue': text, 'department': dept, 'category': cat, 'priority': pr,
                                  'confidence': random.randint(82, 95), 'reasoning': 'Grouped with nearby duplicate reports.',
                                  'tags': [cat.lower()], 'safety_flag': pr == 'CRITICAL', 'source': 'llm'},
                'status': 'ASSIGNED' if k == 0 else 'ROUTED',
                'location': {'lat': round(lat, 6), 'lng': round(lng, 6), 'address': f'{ward}, Bengaluru', 'ward': ward},
                'media': [{'type': 'image', 'data': None, 'name': 'evidence.jpg'}],
                'assigned_officer_id': None, 'assigned_officer_name': None,
                'status_history': [{'status': 'NEW', 'note': 'Complaint submitted by citizen', 'by': reporter_name, 'at': iso(created)},
                                   {'status': 'ROUTED', 'note': f'AI routed to {dept}; grouped as possible duplicate', 'by': 'AI Triage Engine', 'at': iso(created)}],
                'resolution': None, 'feedback': None,
                'duplicate_group_id': group_id, 'is_duplicate': group_id != cid,
                'supporters': supers, 'support_count': len(supers),
                'sla': {'due_at': iso(sla_due(pr, created)), 'breached': False},
                'created_at': iso(created), 'updated_at': iso(created), 'is_demo': True,
            }
            await db.complaints.insert_one(comp)
    demo_complaints = await db.complaints.find({'citizen_id': citizen['id']}, {'_id': 0}).to_list(20)
    for dc in demo_complaints[:6]:
        await push_notification(citizen['id'], 'status', 'Complaint update',
                                f"{dc['tracking_id']} is now {dc['status'].replace('_',' ').title()}", dc['id'])

    # API / data-source registry
    sources = [
        ('data.gov.in — Municipal Datasets', 'Open Dataset', 'All', 'https://api.data.gov.in/resource', 'Daily', 'active', False),
        ('OpenCity Bengaluru', 'Open Dataset', 'Roads & Infrastructure', 'https://data.opencity.in', 'Weekly', 'active', False),
        ('BBMP Ward Boundaries (GIS)', 'GIS', 'All', 'https://gis.bbmp.gov.in/wards', 'Static', 'active', False),
        ('BWSSB Water Supply Feed', 'Government API', 'Water & Sewage', 'https://bwssb.gov.in/api/supply', 'Hourly', 'auth_required', True),
        ('BESCOM Outage Feed', 'Government API', 'Electricity', 'https://bescom.org/api/outages', 'Real-time', 'auth_required', True),
        ('IMD Weather', 'Real-time API', 'All', 'https://mausam.imd.gov.in/api', 'Hourly', 'active', True),
        ('CPCB Air Quality', 'Real-time API', 'Parks', 'https://cpcb.nic.in/aqi', 'Hourly', 'active', True),
        ('City Traffic Signals', 'Government API', 'Traffic', 'https://traffic.city.gov/api', 'Real-time', 'degraded', True),
    ]
    for nm, tp, dep, ep, freq, st, keyreq in sources:
        last = now_utc() - timedelta(minutes=random.randint(5, 600)) if st != 'auth_required' else None
        await db.api_sources.insert_one({
            'id': str(uuid.uuid4()), 'name': nm, 'type': tp, 'department_relevance': dep,
            'endpoint': ep, 'update_frequency': freq, 'status': st,
            'last_fetch': iso(last) if last else None,
            'data_fields': ['ward', 'timestamp', 'value', 'geo'], 'api_key_required': keyreq,
            'is_demo': True,
        })

    # Intelligence reports (12-hour) — city + per department
    await generate_reports_seed()
    # Scheduler + initial deliveries to department heads / admins
    await ensure_scheduler()
    latest = await db.analytics_reports.find({}, {'_id': 0}).sort('generated_at', -1).to_list(8)
    await deliver_reports(latest, 'seed')
    logger.info('Demo seeding complete.')


async def generate_period_reports(gen_at=None, is_demo=True):
    """Generate one city report + seven department reports for the 12h window ending at gen_at.

    Returns the list of created report docs (used by the scheduler for delivery)."""
    nowi = gen_at or now_utc()
    window_start = nowi - timedelta(hours=12)
    all_docs = await db.complaints.find({}, {'_id': 0}).to_list(5000)
    window_docs = [d for d in all_docs if window_start.isoformat() <= d.get('created_at', '') <= nowi.isoformat()]
    resolved = len([d for d in all_docs if d['status'] == 'RESOLVED'])
    active = len([d for d in all_docs if d['status'] not in ['RESOLVED', 'REJECTED', 'CANCELLED']])
    critical = [d for d in all_docs if d.get('priority') == 'CRITICAL' and d['status'] not in ['RESOLVED']]
    ward_counts = {}
    for d in all_docs:
        w = (d.get('location') or {}).get('ward', 'Unknown')
        ward_counts[w] = ward_counts.get(w, 0) + 1
    hotspots = sorted(ward_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_ward = hotspots[0][0] if hotspots else 'the city'
    created = []
    city = {
        'id': str(uuid.uuid4()), 'scope': 'city', 'department': None,
        'title': f"City Intelligence Report \u2014 {nowi.strftime('%d %b, %I %p')}",
        'period_label': f"{window_start.strftime('%d %b %I%p')} \u2192 {nowi.strftime('%d %b %I%p')}",
        'generated_at': iso(nowi),
        'summary': {'new_reports': len(window_docs), 'resolved': resolved, 'active': active,
                    'critical': len(critical), 'sla_breaches': random.randint(2, 9)},
        'hotspots': [{'ward': w, 'count': c} for w, c in hotspots],
        'repeated_issues': [f'Garbage accumulation in {top_ward}', 'Recurring pipeline leaks in Indiranagar'],
        'trends': ['Waste Management reports up 14% vs previous period',
                   'Electricity CRITICAL reports concentrated near Whitefield',
                   'Faster resolution times in Traffic (avg 11h)'],
        'recommendations': [f'Pre-position waste crews in {top_ward} ahead of peak demand',
                            'Dispatch electrical safety inspection to Whitefield exposed-wire cluster',
                            'Review Water & Sewage SLA \u2014 complaints approaching breach'],
        'is_demo': is_demo,
    }
    await db.analytics_reports.insert_one(dict(city))
    created.append(city)
    for dept in DEPARTMENTS:
        dept_docs = [d for d in all_docs if d['department'] == dept]
        dnew = len([d for d in window_docs if d['department'] == dept])
        dres = len([d for d in dept_docs if d['status'] == 'RESOLVED'])
        dactive = len([d for d in dept_docs if d['status'] not in ['RESOLVED', 'REJECTED', 'CANCELLED']])
        rpt = {
            'id': str(uuid.uuid4()), 'scope': 'department', 'department': dept,
            'title': f"{dept} Report \u2014 {nowi.strftime('%d %b, %I %p')}",
            'period_label': f"{window_start.strftime('%d %b %I%p')} \u2192 {nowi.strftime('%d %b %I%p')}",
            'generated_at': iso(nowi),
            'summary': {'new_reports': dnew, 'resolved': dres, 'active': dactive,
                        'critical': len([d for d in dept_docs if d.get('priority') == 'CRITICAL']),
                        'sla_breaches': random.randint(0, 4)},
            'hotspots': [{'ward': w, 'count': c} for w, c in hotspots[:2]],
            'repeated_issues': [f'Recurring {dept.split(" ")[0].lower()} issues in high-density wards'],
            'trends': [f'{dept} workload steady vs previous 12h window'],
            'recommendations': [f'Prioritise CRITICAL {dept} tickets and confirm field crew availability'],
            'is_demo': is_demo,
        }
        await db.analytics_reports.insert_one(dict(rpt))
        created.append(rpt)
    return created


async def generate_reports_seed():
    nowi = now_utc()
    for period in range(2):
        await generate_period_reports(gen_at=nowi - timedelta(hours=12 * period), is_demo=True)


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
async def startup():
    try:
        await db.users.create_index('email', unique=True)
        await db.users.create_index('id')
        await db.complaints.create_index('id')
        await db.complaints.create_index('citizen_id')
        await db.complaints.create_index('department')
        await db.complaints.create_index('status')
        await db.notifications.create_index('user_id')
    except Exception as e:  # noqa: BLE001
        logger.warning(f'Index creation warning: {e}')
    await seed_demo()
    await ensure_scheduler()
    asyncio.create_task(scheduler_loop())


@app.on_event('shutdown')
async def shutdown():
    client.close()
