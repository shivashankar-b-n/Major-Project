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
    ).sort('created_at', -1).to_list(12)
    return [public_complaint(d, 'public') for d in docs]


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
                    'sla': {'due_at': iso(sla_due(priority, created)), 'breached': False},
                    'created_at': iso(created), 'updated_at': iso(created), 'is_demo': True,
                }
                await db.complaints.insert_one(complaint)

    # Notifications for demo citizen
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
    logger.info('Demo seeding complete.')


async def generate_reports_seed():
    nowi = now_utc()
    all_docs = await db.complaints.find({}, {'_id': 0}).to_list(5000)
    for period in range(2):
        gen_at = nowi - timedelta(hours=12 * period)
        window_start = gen_at - timedelta(hours=12)
        window_docs = [d for d in all_docs if window_start.isoformat() <= d.get('created_at', '') <= gen_at.isoformat()]
        new_reports = len(window_docs)
        resolved = len([d for d in all_docs if d['status'] == 'RESOLVED'])
        active = len([d for d in all_docs if d['status'] not in ['RESOLVED', 'REJECTED', 'CANCELLED']])
        critical = [d for d in all_docs if d.get('priority') == 'CRITICAL' and d['status'] not in ['RESOLVED']]
        ward_counts = {}
        for d in all_docs:
            w = (d.get('location') or {}).get('ward', 'Unknown')
            ward_counts[w] = ward_counts.get(w, 0) + 1
        hotspots = sorted(ward_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        await db.analytics_reports.insert_one({
            'id': str(uuid.uuid4()), 'scope': 'city', 'department': None,
            'title': f"City Intelligence Report — {gen_at.strftime('%d %b, %I %p')}",
            'period_label': f"{window_start.strftime('%d %b %I%p')} → {gen_at.strftime('%d %b %I%p')}",
            'generated_at': iso(gen_at),
            'summary': {'new_reports': new_reports, 'resolved': resolved, 'active': active,
                        'critical': len(critical), 'sla_breaches': random.randint(2, 9)},
            'hotspots': [{'ward': w, 'count': c} for w, c in hotspots],
            'repeated_issues': ['Garbage accumulation in HSR Layout', 'Recurring pipeline leaks in Indiranagar'],
            'trends': ['Waste Management reports up 14% vs previous period',
                       'Electricity CRITICAL reports concentrated near Whitefield',
                       'Faster resolution times in Traffic (avg 11h)'],
            'recommendations': ['Pre-position waste crews in HSR Layout ahead of weekend peak',
                                'Dispatch electrical safety inspection to Whitefield exposed-wire cluster',
                                'Review Water & Sewage SLA — 3 complaints approaching breach'],
            'is_demo': True,
        })
        for dept in DEPARTMENTS:
            dept_docs = [d for d in all_docs if d['department'] == dept]
            dnew = len([d for d in window_docs if d['department'] == dept])
            dres = len([d for d in dept_docs if d['status'] == 'RESOLVED'])
            dactive = len([d for d in dept_docs if d['status'] not in ['RESOLVED', 'REJECTED', 'CANCELLED']])
            await db.analytics_reports.insert_one({
                'id': str(uuid.uuid4()), 'scope': 'department', 'department': dept,
                'title': f"{dept} Report — {gen_at.strftime('%d %b, %I %p')}",
                'period_label': f"{window_start.strftime('%d %b %I%p')} → {gen_at.strftime('%d %b %I%p')}",
                'generated_at': iso(gen_at),
                'summary': {'new_reports': dnew, 'resolved': dres, 'active': dactive,
                            'critical': len([d for d in dept_docs if d.get('priority') == 'CRITICAL']),
                            'sla_breaches': random.randint(0, 4)},
                'hotspots': [{'ward': w, 'count': c} for w, c in hotspots[:2]],
                'repeated_issues': [f'Recurring {dept.split(" ")[0].lower()} issues in high-density wards'],
                'trends': [f'{dept} workload steady vs previous 12h window'],
                'recommendations': [f'Prioritise CRITICAL {dept} tickets and confirm field crew availability'],
                'is_demo': True,
            })


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


@app.on_event('shutdown')
async def shutdown():
    client.close()
