// Lightweight translation-key architecture. English implemented; other langs plug in later.
export const translations = {
  en: {
    app_name: 'CivicPulse',
    tagline: 'Smart City Intelligence Platform',
    // nav
    nav_home: 'Home',
    nav_reports: 'Reports',
    nav_notifications: 'Alerts',
    nav_profile: 'Profile',
    // home
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening: 'Good evening',
    report_issue: 'Report an Issue',
    report_issue_sub: 'Snap a photo, describe it, and let AI route it to the right department',
    my_complaints: 'My Complaints',
    nearby_issues: 'Nearby Issues',
    recent_activity: 'Recent Activity',
    view_all: 'View all',
    // report flow
    step_media: 'Add Evidence',
    step_describe: 'Describe',
    step_location: 'Location',
    step_analysis: 'AI Analysis',
    step_confirm: 'Confirm',
    location: 'Location',
    priority: 'Priority',
    department: 'Department',
    submit_complaint: 'Submit Complaint',
    // misc
    logout: 'Log out',
    language: 'Language',
  },
};

const LANG_KEY = 'cp_lang';
export const getLang = () => localStorage.getItem(LANG_KEY) || 'en';
export const setLang = (l) => localStorage.setItem(LANG_KEY, l);

export const t = (key, fallback) => {
  const lang = getLang();
  return (translations[lang] && translations[lang][key]) || translations.en[key] || fallback || key;
};
