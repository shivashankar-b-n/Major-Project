// Translation-key architecture. English is the source; Kannada & Hindi provided.
// Missing keys gracefully fall back to English, then to the key itself.
export const translations = {
  en: {
    app_name: 'CivicPulse',
    tagline: 'Smart City Intelligence Platform',
    nav_home: 'Home', nav_reports: 'Reports', nav_notifications: 'Alerts', nav_profile: 'Profile',
    greeting_morning: 'Good morning', greeting_afternoon: 'Good afternoon', greeting_evening: 'Good evening',
    report_issue: 'Report an Issue',
    report_issue_sub: 'Snap a photo, describe it, and let AI route it to the right department',
    my_complaints: 'My Complaints', nearby_issues: 'Nearby Issues', view_all: 'View all',
    stat_active: 'Active', stat_resolved: 'Resolved', stat_total: 'Total',
    community: 'Community', me_too: 'Me too', backing: 'backing this', residents_affected: 'residents affected',
    no_complaints_title: 'No complaints yet', no_complaints_desc: 'Report your first civic issue and track it here.',
    // report flow
    step_evidence: 'Add Evidence', step_describe: 'Describe', step_location: 'Location',
    step_analysis: 'AI Analysis', step_confirm: 'Confirm', step_word: 'Step', of_word: 'of',
    continue: 'Continue', looks_good: 'Looks good, continue', submit_complaint: 'Submit Complaint',
    skip_media: 'Skip — continue without media',
    complaint_submitted: 'Complaint submitted!', tracking_id: 'Tracking ID',
    track_complaint: 'Track complaint', back_home: 'Back to home',
    department: 'Department', priority: 'Priority', location: 'Location',
    use_my_location: 'Use my current location', ward_area: 'Ward / Area',
    describe_prompt: 'Describe what is wrong. You can type or use your voice.',
    // my complaints
    tab_all: 'All', tab_active: 'Active', tab_verify: 'Verify', tab_resolved: 'Resolved',
    search_complaints: 'Search by title, ID or location', new_btn: 'New',
    nothing_here: 'Nothing here yet', nothing_here_desc: 'Complaints matching this view will appear here.',
    // notifications
    alerts: 'Alerts', mark_all_read: 'Mark all read', unread: 'unread', no_notifications: 'No notifications',
    // profile
    profile: 'Profile', language: 'Language', push_notifications: 'Push notifications',
    share_location: 'Share location for reports', about: 'About CivicPulse',
    demo_account: 'This is a demonstration account.', logout: 'Log out', language_updated: 'Language updated',
  },
  kn: {
    nav_home: 'ಮುಖಪುಟ', nav_reports: 'ದೂರುಗಳು', nav_notifications: 'ಎಚ್ಚರಿಕೆಗಳು', nav_profile: 'ಪ್ರೊಫೈಲ್',
    greeting_morning: 'ಶುಭೋದಯ', greeting_afternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ', greeting_evening: 'ಶುಭ ಸಂಜೆ',
    report_issue: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
    report_issue_sub: 'ಫೋಟೋ ತೆಗೆದು, ವಿವರಿಸಿ — AI ಸರಿಯಾದ ಇಲಾಖೆಗೆ ಕಳುಹಿಸುತ್ತದೆ',
    my_complaints: 'ನನ್ನ ದೂರುಗಳು', nearby_issues: 'ಸಮೀಪದ ಸಮಸ್ಯೆಗಳು', view_all: 'ಎಲ್ಲಾ ನೋಡಿ',
    stat_active: 'ಸಕ್ರಿಯ', stat_resolved: 'ಪರಿಹರಿಸಲಾಗಿದೆ', stat_total: 'ಒಟ್ಟು',
    community: 'ಸಮುದಾಯ', me_too: 'ನನಗೂ', backing: 'ಬೆಂಬಲಿಸುತ್ತಿದ್ದಾರೆ', residents_affected: 'ನಿವಾಸಿಗಳು ಬಾಧಿತರಾಗಿದ್ದಾರೆ',
    no_complaints_title: 'ಇನ್ನೂ ದೂರುಗಳಿಲ್ಲ', no_complaints_desc: 'ನಿಮ್ಮ ಮೊದಲ ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ ಇಲ್ಲಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.',
    step_evidence: 'ಸಾಕ್ಷ್ಯ ಸೇರಿಸಿ', step_describe: 'ವಿವರಿಸಿ', step_location: 'ಸ್ಥಳ',
    step_analysis: 'AI ವಿಶ್ಲೇಷಣೆ', step_confirm: 'ದೃಢೀಕರಿಸಿ', step_word: 'ಹಂತ', of_word: '/',
    continue: 'ಮುಂದುವರಿಸಿ', looks_good: 'ಸರಿ, ಮುಂದುವರಿಸಿ', submit_complaint: 'ದೂರು ಸಲ್ಲಿಸಿ',
    skip_media: 'ಬಿಟ್ಟುಬಿಡಿ — ಮಾಧ್ಯಮವಿಲ್ಲದೆ ಮುಂದುವರಿಸಿ',
    complaint_submitted: 'ದೂರು ಸಲ್ಲಿಸಲಾಗಿದೆ!', tracking_id: 'ಟ್ರ್ಯಾಕಿಂಗ್ ID',
    track_complaint: 'ದೂರು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ', back_home: 'ಮುಖಪುಟಕ್ಕೆ',
    department: 'ಇಲಾಖೆ', priority: 'ಆದ್ಯತೆ', location: 'ಸ್ಥಳ',
    use_my_location: 'ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಳಸಿ', ward_area: 'ವಾರ್ಡ್ / ಪ್ರದೇಶ',
    describe_prompt: 'ಏನು ತಪ್ಪಾಗಿದೆ ಎಂದು ವಿವರಿಸಿ. ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಧ್ವನಿ ಬಳಸಿ.',
    tab_all: 'ಎಲ್ಲಾ', tab_active: 'ಸಕ್ರಿಯ', tab_verify: 'ಪರಿಶೀಲಿಸಿ', tab_resolved: 'ಪರಿಹರಿಸಲಾಗಿದೆ',
    search_complaints: 'ಶೀರ್ಷಿಕೆ, ID ಅಥವಾ ಸ್ಥಳದಿಂದ ಹುಡುಕಿ', new_btn: 'ಹೊಸ',
    nothing_here: 'ಇಲ್ಲಿ ಇನ್ನೂ ಏನೂ ಇಲ್ಲ', nothing_here_desc: 'ಈ ವೀಕ್ಷಣೆಗೆ ಹೊಂದುವ ದೂರುಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.',
    alerts: 'ಎಚ್ಚರಿಕೆಗಳು', mark_all_read: 'ಎಲ್ಲಾ ಓದಿದಂತೆ ಗುರುತಿಸಿ', unread: 'ಓದದಿರುವ', no_notifications: 'ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ',
    profile: 'ಪ್ರೊಫೈಲ್', language: 'ಭಾಷೆ', push_notifications: 'ಪುಶ್ ಅಧಿಸೂಚನೆಗಳು',
    share_location: 'ವರದಿಗಳಿಗೆ ಸ್ಥಳ ಹಂಚಿಕೊಳ್ಳಿ', about: 'CivicPulse ಬಗ್ಗೆ',
    demo_account: 'ಇದು ಪ್ರದರ್ಶನ ಖಾತೆ.', logout: 'ಲಾಗ್ ಔಟ್', language_updated: 'ಭಾಷೆ ನವೀಕರಿಸಲಾಗಿದೆ',
  },
  hi: {
    nav_home: 'होम', nav_reports: 'रिपोर्ट', nav_notifications: 'अलर्ट', nav_profile: 'प्रोफ़ाइल',
    greeting_morning: 'सुप्रभात', greeting_afternoon: 'नमस्कार', greeting_evening: 'शुभ संध्या',
    report_issue: 'समस्या दर्ज करें',
    report_issue_sub: 'फ़ोटो लें, बताएं — AI इसे सही विभाग तक पहुंचाएगा',
    my_complaints: 'मेरी शिकायतें', nearby_issues: 'आस-पास की समस्याएं', view_all: 'सभी देखें',
    stat_active: 'सक्रिय', stat_resolved: 'हल हुआ', stat_total: 'कुल',
    community: 'समुदाय', me_too: 'मुझे भी', backing: 'समर्थन कर रहे हैं', residents_affected: 'निवासी प्रभावित',
    no_complaints_title: 'अभी कोई शिकायत नहीं', no_complaints_desc: 'अपनी पहली समस्या दर्ज करें और यहाँ ट्रैक करें.',
    step_evidence: 'साक्ष्य जोड़ें', step_describe: 'विवरण', step_location: 'स्थान',
    step_analysis: 'AI विश्लेषण', step_confirm: 'पुष्टि करें', step_word: 'चरण', of_word: '/',
    continue: 'जारी रखें', looks_good: 'ठीक है, जारी रखें', submit_complaint: 'शिकायत जमा करें',
    skip_media: 'छोड़ें — बिना मीडिया जारी रखें',
    complaint_submitted: 'शिकायत जमा हो गई!', tracking_id: 'ट्रैकिंग आईडी',
    track_complaint: 'शिकायत ट्रैक करें', back_home: 'होम पर वापस',
    department: 'विभाग', priority: 'प्राथमिकता', location: 'स्थान',
    use_my_location: 'मेरा वर्तमान स्थान उपयोग करें', ward_area: 'वार्ड / क्षेत्र',
    describe_prompt: 'क्या गलत है बताएं। आप टाइप कर सकते हैं या आवाज़ का उपयोग कर सकते हैं।',
    tab_all: 'सभी', tab_active: 'सक्रिय', tab_verify: 'सत्यापित करें', tab_resolved: 'हल',
    search_complaints: 'शीर्षक, आईडी या स्थान से खोजें', new_btn: 'नया',
    nothing_here: 'यहाँ अभी कुछ नहीं है', nothing_here_desc: 'इस दृश्य से मेल खाती शिकायतें यहाँ दिखेंगी.',
    alerts: 'अलर्ट', mark_all_read: 'सभी पढ़ा हुआ चिह्नित करें', unread: 'अपठित', no_notifications: 'कोई सूचना नहीं',
    profile: 'प्रोफ़ाइल', language: 'भाषा', push_notifications: 'पुश सूचनाएं',
    share_location: 'रिपोर्ट के लिए स्थान साझा करें', about: 'CivicPulse के बारे में',
    demo_account: 'यह एक डेमो खाता है।', logout: 'लॉग आउट', language_updated: 'भाषा अपडेट हुई',
  },
};

const LANG_KEY = 'cp_lang';
export const getLang = () => localStorage.getItem(LANG_KEY) || 'en';
export const setLang = (l) => localStorage.setItem(LANG_KEY, l);

export const t = (key, fallback) => {
  const lang = getLang();
  return (translations[lang] && translations[lang][key]) || translations.en[key] || fallback || key;
};
