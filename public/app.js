/**
 * CorpSync — Frontend v3
 * ✅ Responsive (mobile, tablette, desktop)
 * ✅ Fix messagerie (plus de doublons)
 * ✅ Upload via Cloudinary
 */

const { useState, useEffect, useRef, useCallback } = React;
const io = window.io;
const API_URL = "https://corpsync-production.up.railway.app";

// ─── Client HTTP ──────────────────────────────────────────────────────────────
async function api(path, options = {}, token = null) {
  const headers = { ...(token ? { Authorization:`Bearer ${token}` } : {}), ...options.headers };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res  = await fetch(`${API_URL}${path}`, {
    ...options, headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erreur || "Erreur serveur");
  return data;
}

// ─── Icônes ───────────────────────────────────────────────────────────────────
function Icon({ name, size = 20 }) {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    message:   <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    task:      <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    doc:       <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    calendar:  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    bell:      <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    send:      <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    edit:      <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:     <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>,
    user:      <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    users:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    upload:    <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>,
    download:  <><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></>,
    lock:      <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    menu:      <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    close:     <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    shield:    <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    back:      <><polyline points="15 18 9 12 15 6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --gold:#C8A96E;--gold-light:#E8D5A8;--gold-dark:#9A7A48;
    --green:#7B9E87;--ink:#1A1A2E;--parchment:#F7F3EC;--cream:#FDFAF5;
    --text:#2C2C3E;--text-soft:#6B6B85;--border:rgba(200,169,110,0.2);
    --shadow:0 4px 24px rgba(26,26,46,0.08);--shadow-lg:0 12px 48px rgba(26,26,46,0.14);
    --radius:12px;--sidebar-w:260px;--topbar-h:64px;
  }
  body{font-family:'DM Sans',sans-serif;background:var(--cream);color:var(--text)}
  .app{display:flex;height:100vh;overflow:hidden}

  /* ══ SIDEBAR ══ */
  .sidebar{width:var(--sidebar-w);background:var(--ink);color:white;display:flex;flex-direction:column;flex-shrink:0;position:relative;overflow:hidden;transition:transform 0.3s ease;z-index:200}
  .sidebar::before{content:'';position:absolute;top:-80px;right:-80px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(200,169,110,0.15),transparent 70%);pointer-events:none}
  .sidebar-logo{padding:24px 20px 18px;border-bottom:1px solid rgba(200,169,110,0.15)}
  .sidebar-logo h1{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--gold)}
  .sidebar-logo p{font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;letter-spacing:1.5px;text-transform:uppercase}
  .sidebar-user{padding:16px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(200,169,110,0.1)}
  .avatar{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0;border:2px solid rgba(200,169,110,0.3)}
  .sidebar-user-info .uname{font-size:13px;font-weight:500;color:white}
  .sidebar-user-info .urole{font-size:10px;color:rgba(255,255,255,0.4);margin-top:1px}
  .online-pill{display:flex;align-items:center;gap:4px;font-size:10px;color:#4CAF50;margin-top:2px}
  .online-dot{width:5px;height:5px;background:#4CAF50;border-radius:50%}
  .sidebar-nav{flex:1;padding:12px 8px;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer;transition:all 0.2s;font-size:13px;color:rgba(255,255,255,0.55);white-space:nowrap}
  .nav-item:hover{background:rgba(200,169,110,0.08);color:rgba(255,255,255,0.85)}
  .nav-item.active{background:rgba(200,169,110,0.15);color:var(--gold);font-weight:500}
  .nav-item .badge{margin-left:auto;background:#E8524A;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;min-width:18px;text-align:center}
  .sidebar-footer{padding:12px 8px;border-top:1px solid rgba(200,169,110,0.1)}
  .logout-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer;color:rgba(255,255,255,0.4);font-size:13px;transition:all 0.2s;width:100%;background:none;border:none;font-family:'DM Sans',sans-serif}
  .logout-btn:hover{color:#E8524A;background:rgba(232,82,74,0.08)}

  /* Overlay mobile */
  .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:199}

  /* ══ MAIN ══ */
  .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
  .topbar{background:var(--cream);border-bottom:1px solid var(--border);padding:0 20px;height:var(--topbar-h);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:12px}
  .topbar-left{display:flex;align-items:center;gap:12px}
  .menu-btn{display:none;width:36px;height:36px;border-radius:8px;background:var(--parchment);border:1px solid var(--border);align-items:center;justify-content:center;cursor:pointer;color:var(--text-soft)}
  .topbar-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--ink);white-space:nowrap}
  .topbar-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
  .notif-btn{width:36px;height:36px;border-radius:10px;background:var(--parchment);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;color:var(--text-soft);transition:all 0.2s;flex-shrink:0}
  .notif-btn:hover{border-color:var(--gold);color:var(--gold)}
  .notif-dot{position:absolute;top:6px;right:6px;width:7px;height:7px;background:#E8524A;border-radius:50%;border:2px solid var(--cream)}
  .date-chip{padding:5px 12px;background:var(--parchment);border:1px solid var(--border);border-radius:20px;font-size:11px;color:var(--text-soft);font-weight:500;white-space:nowrap}
  .content{flex:1;overflow-y:auto;padding:20px}

  /* Toast */
  .toast{position:fixed;top:16px;right:16px;background:var(--ink);color:var(--gold);padding:12px 18px;border-radius:12px;font-size:13px;z-index:999;box-shadow:var(--shadow-lg);animation:slideLeft 0.3s ease;max-width:280px;display:flex;gap:8px;align-items:center}
  @keyframes slideLeft{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}

  /* Stats */
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
  .stat-card{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:20px;transition:all 0.25s;cursor:default}
  .stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--gold)}
  .stat-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
  .stat-value{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:var(--ink);line-height:1;margin-bottom:4px}
  .stat-label{font-size:12px;color:var(--text-soft)}
  .dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .dash-card{background:white;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  .dash-card-header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .dash-card-header h3{font-size:14px;font-weight:600;color:var(--ink)}
  .view-all{font-size:12px;color:var(--gold);cursor:pointer;font-weight:500}
  .activity-item{padding:12px 20px;display:flex;gap:12px;align-items:flex-start;border-bottom:1px solid var(--border)}
  .activity-item:last-child{border-bottom:none}
  .activity-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:6px}
  .activity-text{font-size:13px;color:var(--text)}
  .activity-text span{font-weight:500}
  .activity-time{font-size:11px;color:var(--text-soft);margin-top:2px}

  /* Messages */
  .messages-layout{display:grid;grid-template-columns:260px 1fr;height:calc(100vh - var(--topbar-h) - 40px);background:white;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  .msg-sidebar{border-right:1px solid var(--border);display:flex;flex-direction:column}
  .msg-sidebar-header{padding:16px 18px;border-bottom:1px solid var(--border)}
  .msg-sidebar-header h3{font-size:14px;font-weight:600}
  .msg-contact{padding:14px 18px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:background 0.15s}
  .msg-contact:hover,.msg-contact.active{background:var(--parchment)}
  .msg-contact-name{font-size:13px;font-weight:500}
  .unread-badge{margin-left:auto;background:var(--gold);color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px}
  .msg-main{display:flex;flex-direction:column;min-width:0}
  .msg-topbar{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0}
  .msg-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;background:var(--cream)}
  .msg-bubble{display:flex;gap:8px;max-width:80%}
  .msg-bubble.mine{align-self:flex-end;flex-direction:row-reverse}
  .bubble-text{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;background:white;border:1px solid var(--border);word-break:break-word}
  .msg-bubble.mine .bubble-text{background:var(--ink);color:white;border-color:var(--ink);border-radius:14px 4px 14px 14px}
  .msg-bubble:not(.mine) .bubble-text{border-radius:4px 14px 14px 14px}
  .bubble-time{font-size:10px;color:var(--text-soft);margin-top:3px}
  .msg-bubble.mine .bubble-time{text-align:right}
  .typing-wrap{display:flex;gap:8px;align-items:center}
  .typing-dots{display:flex;gap:4px;align-items:center;background:white;border:1px solid var(--border);padding:10px 14px;border-radius:4px 14px 14px 14px}
  .typing-dot{width:5px;height:5px;border-radius:50%;background:var(--text-soft);animation:bounce 1.2s infinite}
  .typing-dot:nth-child(2){animation-delay:0.2s}
  .typing-dot:nth-child(3){animation-delay:0.4s}
  @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  .msg-input-area{padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:10px;flex-shrink:0}
  .msg-input{flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:24px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;background:var(--parchment);transition:border-color 0.2s;min-width:0}
  .msg-input:focus{border-color:var(--gold)}
  .send-btn{width:40px;height:40px;border-radius:50%;background:var(--ink);border:none;color:var(--gold);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;flex-shrink:0}
  .send-btn:hover{background:var(--gold-dark)}

  /* Tâches */
  .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
  .tasks-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .task-col{background:var(--parchment);border-radius:var(--radius);padding:14px;min-height:300px}
  .task-col-header{font-size:12px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
  .task-col-count{background:rgba(200,169,110,0.2);padding:2px 7px;border-radius:20px;font-size:10px}
  .task-card{background:white;border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;transition:all 0.2s}
  .task-card:hover{box-shadow:var(--shadow);transform:translateY(-1px)}
  .task-title{font-size:13px;font-weight:500;margin-bottom:6px;color:var(--ink)}
  .task-desc{font-size:11px;color:var(--text-soft);margin-bottom:8px;line-height:1.4}
  .task-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .priority-badge{padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600}
  .priority-haute{background:#FEE2E2;color:#DC2626}
  .priority-normale{background:#E0F2FE;color:#0284C7}
  .priority-basse{background:#F0FDF4;color:#16A34A}
  .task-actions{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}
  .btn-icon{width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-soft);transition:all 0.2s}
  .btn-icon:hover{border-color:var(--gold);color:var(--gold)}
  .btn-icon.danger:hover{border-color:#DC2626;color:#DC2626}

  /* Documents */
  .docs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .doc-card{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:18px;transition:all 0.2s}
  .doc-card:hover{box-shadow:var(--shadow);border-color:var(--gold-light)}
  .doc-type-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;margin-bottom:12px}
  .doc-pdf{background:#FEE2E2;color:#DC2626}
  .doc-xlsx,.doc-xls{background:#DCFCE7;color:#16A34A}
  .doc-docx,.doc-doc{background:#DBEAFE;color:#2563EB}
  .doc-other{background:#F3E8FF;color:#7C3AED}
  .doc-name{font-size:13px;font-weight:500;color:var(--ink);margin-bottom:6px;word-break:break-word}
  .doc-info{font-size:11px;color:var(--text-soft);display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
  .doc-status{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;padding:3px 8px;border-radius:20px}
  .doc-valide{background:#DCFCE7;color:#16A34A}
  .doc-attente{background:#FEF3C7;color:#D97706}
  .upload-zone{border:2px dashed var(--border);border-radius:10px;padding:28px;text-align:center;color:var(--text-soft);cursor:pointer;transition:all 0.2s;margin-bottom:16px}
  .upload-zone:hover,.upload-zone.dragover{border-color:var(--gold);color:var(--gold);background:rgba(200,169,110,0.04)}

  /* Agenda */
  .agenda-layout{display:grid;grid-template-columns:1fr 300px;gap:20px}
  .agenda-event{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:10px;display:flex;gap:14px;transition:all 0.2s}
  .agenda-event:hover{box-shadow:var(--shadow)}
  .agenda-event-bar{width:4px;border-radius:4px;flex-shrink:0}
  .agenda-event-time{font-size:11px;color:var(--text-soft);margin-bottom:3px}
  .agenda-event-title{font-size:14px;font-weight:600;color:var(--ink);margin-bottom:3px}
  .agenda-event-lieu{font-size:11px;color:var(--text-soft)}

  /* Utilisateurs */
  .users-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .user-card{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:20px;text-align:center;transition:all 0.2s;position:relative}
  .user-card:hover{box-shadow:var(--shadow)}
  .user-card-name{font-size:15px;font-weight:600;color:var(--ink);margin-bottom:3px}
  .user-card-role{font-size:12px;color:var(--text-soft);margin-bottom:10px}
  .user-card-actions{display:flex;gap:6px;justify-content:center}
  .admin-badge{position:absolute;top:10px;right:10px;background:rgba(200,169,110,0.15);color:var(--gold);font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;display:flex;align-items:center;gap:3px}

  /* Boutons */
  .btn-primary{padding:9px 18px;background:var(--ink);color:var(--gold);border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:7px;transition:all 0.2s;white-space:nowrap}
  .btn-primary:hover{background:var(--gold-dark);color:white}
  .btn-primary:disabled{opacity:0.5;cursor:not-allowed}
  .btn-secondary{padding:9px 18px;background:white;color:var(--ink);border:1px solid var(--border);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:7px;transition:all 0.2s;white-space:nowrap}
  .btn-secondary:hover{border-color:var(--gold);color:var(--gold)}
  .btn-danger{padding:9px 18px;background:#FEE2E2;color:#DC2626;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:7px;transition:all 0.2s}
  .btn-danger:hover{background:#DC2626;color:white}
  .btn-sm{padding:5px 10px;font-size:11px;border-radius:7px}

  /* Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(26,26,46,0.5);display:flex;align-items:center;justify-content:center;z-index:300;backdrop-filter:blur(4px);animation:fadeIn 0.2s ease;padding:16px}
  .modal{background:white;border-radius:16px;padding:28px;width:100%;max-width:460px;box-shadow:var(--shadow-lg);animation:slideUp 0.25s ease;max-height:90vh;overflow-y:auto}
  .modal-title{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--ink);margin-bottom:20px}
  .form-group{margin-bottom:16px}
  .form-label{display:block;font-size:12px;font-weight:500;color:var(--text-soft);margin-bottom:5px}
  .form-input,.form-select,.form-textarea{width:100%;padding:9px 13px;border:1px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color 0.2s;background:var(--parchment)}
  .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--gold)}
  .form-textarea{resize:vertical;min-height:72px}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

  /* Login */
  .login-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--ink);position:relative;overflow:hidden;padding:16px}
  .login-bg{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(200,169,110,0.12),transparent 70%);pointer-events:none}
  .login-card{background:white;border-radius:20px;padding:36px 28px;width:100%;max-width:400px;box-shadow:0 32px 80px rgba(0,0,0,0.3);position:relative;z-index:1}
  .login-logo{text-align:center;margin-bottom:28px}
  .login-logo h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:700;color:var(--ink)}
  .login-logo p{font-size:11px;color:var(--text-soft);letter-spacing:2px;text-transform:uppercase;margin-top:4px}
  .login-btn{width:100%;padding:13px;background:var(--ink);color:var(--gold);border:none;border-radius:12px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;margin-top:4px}
  .login-btn:hover{background:var(--gold-dark);color:white}
  .login-btn:disabled{opacity:0.5;cursor:not-allowed}
  .error-box{background:#FEE2E2;color:#DC2626;padding:9px 13px;border-radius:8px;font-size:12px;margin-top:10px;text-align:center}

  /* Divers */
  .section-title{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:var(--ink)}
  .text-soft{color:var(--text-soft);font-size:12px}
  .mt-1{margin-top:4px}.mt-2{margin-top:8px}
  .spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block}
  @keyframes spin{to{transform:rotate(360deg)}}
  .loading-page{display:flex;align-items:center;justify-content:center;height:200px;gap:10px;color:var(--text-soft);font-size:13px}
  .empty-state{text-align:center;padding:40px;color:var(--text-soft);font-size:13px}

  /* ══ RESPONSIVE ══ */

  /* Tablette (≤ 900px) */
  @media (max-width:900px){
    :root{ --sidebar-w:220px }
    .stats-grid{ grid-template-columns:repeat(2,1fr) }
    .dash-grid{ grid-template-columns:1fr }
    .tasks-cols{ grid-template-columns:1fr 1fr }
    .docs-grid{ grid-template-columns:repeat(2,1fr) }
    .users-grid{ grid-template-columns:repeat(2,1fr) }
    .agenda-layout{ grid-template-columns:1fr }
    .date-chip{ display:none }
    .messages-layout{ grid-template-columns:220px 1fr }
  }

  /* Mobile (≤ 640px) */
  @media (max-width:640px){
    /* Sidebar hors écran par défaut */
    .sidebar{
      position:fixed;top:0;left:0;height:100vh;
      transform:translateX(-100%);
      box-shadow:var(--shadow-lg);
    }
    .sidebar.open{ transform:translateX(0) }
    .sidebar-overlay{ display:block }

    /* Bouton menu visible */
    .menu-btn{ display:flex }

    .content{ padding:14px }
    .topbar{ padding:0 14px }
    .topbar-title{ font-size:18px }

    /* Stats 2 colonnes sur mobile */
    .stats-grid{ grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px }
    .stat-card{ padding:14px }
    .stat-value{ font-size:26px }

    /* Dashboard 1 colonne */
    .dash-grid{ grid-template-columns:1fr }

    /* Tâches 1 colonne */
    .tasks-cols{ grid-template-columns:1fr }

    /* Documents 1 colonne */
    .docs-grid{ grid-template-columns:1fr }

    /* Utilisateurs 1 colonne */
    .users-grid{ grid-template-columns:1fr }

    /* Agenda 1 colonne */
    .agenda-layout{ grid-template-columns:1fr }

    /* Messages plein écran */
    .messages-layout{ grid-template-columns:1fr;height:calc(100vh - var(--topbar-h) - 28px) }
    .msg-sidebar{ display:none }
    .msg-sidebar.show{ display:flex;position:absolute;inset:0;z-index:10;background:white }

    /* Page header wrap */
    .page-header{ flex-direction:column;align-items:flex-start }

    /* Modal plein écran */
    .modal{ padding:20px 16px;border-radius:12px }
    .form-row{ grid-template-columns:1fr }
  }

  /* Très petit (≤ 380px) */
  @media (max-width:380px){
    .stats-grid{ grid-template-columns:1fr }
    .topbar-title{ font-size:16px }
  }
`;

// ─── Hook Socket ──────────────────────────────────────────────────────────────
function useSocket(token) {
  const ref = useRef(null);
  useEffect(() => {
    if (!token) return;
    const s = io(API_URL, { auth:{ token }, transports:["websocket","polling"] });
    ref.current = s;
    return () => { s.disconnect(); ref.current = null; };
  }, [token]);
  return ref;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  return <div className="toast"><Icon name="bell" size={15}/> {message}</div>;
}

// ─── Confirm ──────────────────────────────────────────────────────────────────
function Confirm({ message, onOk, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:340 }}>
        <div className="modal-title" style={{ fontSize:17 }}>Confirmation</div>
        <p style={{ color:"var(--text-soft)",fontSize:13,lineHeight:1.6 }}>{message}</p>
        <div className="modal-actions">
          <button className="btn-secondary btn-sm" onClick={onCancel}>Annuler</button>
          <button className="btn-danger btn-sm" onClick={onOk}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, utilisateurs }) {
  const opts = utilisateurs.length > 0 ? utilisateurs : [
    { id:"directeur",  nom:"M. Directeur",   role:"Directeur Général"       },
    { id:"secretaire", nom:"Mme Secrétaire", role:"Secrétaire de Direction" },
  ];
  const [form,    setForm]    = useState({ id: opts[0]?.id||"", password:"" });
  const [erreur,  setErreur]  = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (opts.length && !form.id) setForm(f=>({...f,id:opts[0].id})); }, [opts]);

  const submit = async () => {
    if (!form.password) return setErreur("Veuillez entrer votre mot de passe.");
    setLoading(true); setErreur("");
    try {
      const data = await api("/api/auth/login", { method:"POST", body:form });
      onLogin(data.token, data.user);
    } catch(e) { setErreur(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-screen">
      <div className="login-bg" style={{ width:400,height:400,top:-150,left:-100 }}/>
      <div className="login-bg" style={{ width:350,height:350,bottom:-100,right:-80 }}/>
      <div className="login-card">
        <div className="login-logo">
          <h1>CorpSync</h1>
          <p>Plateforme de Direction</p>
        </div>
        <div className="form-group">
          <label className="form-label">Profil</label>
          <select className="form-select" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))}>
            {opts.map(u=><option key={u.id} value={u.id}>{u.nom} — {u.role}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display:"flex",alignItems:"center",gap:5 }}>
            <Icon name="lock" size={12}/> Mot de passe
          </label>
          <input type="password" className="form-input" placeholder="••••••••"
            value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        {erreur && <div className="error-box">{erreur}</div>}
        <button className="login-btn" onClick={submit} disabled={loading||!form.id}>
          {loading ? <><span className="spinner"/> Connexion...</> : "Accéder à la plateforme →"}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ user, taches, messages, docs, notifications, setPage }) {
  const nonLus    = messages.filter(m=>m.a===user.id&&!m.lu).length;
  const mesTaches = taches.filter(t=>t.assigne_a===user.id&&t.statut!=="termine");
  const docsAtt   = docs.filter(d=>d.statut==="en_attente").length;
  const notifNL   = notifications.filter(n=>!n.lu).length;
  return (
    <div>
      <div className="stats-grid">
        {[
          { label:"Messages non lus",   value:nonLus,           icon:"message", color:"#C8A96E", bg:"rgba(200,169,110,0.1)" },
          { label:"Mes tâches actives", value:mesTaches.length,  icon:"task",   color:"#7B9E87", bg:"rgba(123,158,135,0.1)" },
          { label:"Docs en attente",    value:docsAtt,           icon:"doc",    color:"#8B6B9E", bg:"rgba(139,107,158,0.1)" },
          { label:"Notifications",      value:notifNL,           icon:"bell",   color:"#4A90D9", bg:"rgba(74,144,217,0.1)"  },
        ].map((s,i)=>(
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg,color:s.color }}><Icon name={s.icon} size={20}/></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-header"><h3>Notifications récentes</h3></div>
          {notifications.slice(0,5).map((n,i)=>(
            <div key={i} className="activity-item">
              <div className="activity-dot" style={{ background:n.lu?"var(--border)":"var(--gold)" }}/>
              <div>
                <div className="activity-text">{n.texte}</div>
                <div className="activity-time">{new Date(n.created_at).toLocaleString("fr-FR")}</div>
              </div>
            </div>
          ))}
          {notifications.length===0&&<div className="empty-state">Aucune notification</div>}
        </div>
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Mes tâches actives</h3>
            <span className="view-all" onClick={()=>setPage("taches")}>Voir tout</span>
          </div>
          {mesTaches.slice(0,4).map(t=>(
            <div key={t.id} className="activity-item">
              <div className="activity-dot" style={{ background:t.priorite==="haute"?"#DC2626":"#0284C7" }}/>
              <div>
                <div className="activity-text"><span>{t.titre}</span></div>
                <div className="activity-time">{t.date_echeance?`Échéance : ${t.date_echeance}`:"Sans échéance"}</div>
              </div>
            </div>
          ))}
          {mesTaches.length===0&&<div className="empty-state">Aucune tâche active 🎉</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────
function Messages({ user, messages, setMessages, socketRef, usersStatus, utilisateurs, token }) {
  const [texte,        setTexte]        = useState("");
  const [autreEnTrain, setAutreEnTrain] = useState(false);
  const bottomRef   = useRef();
  const typingTimer = useRef();

  const autreId   = user.id === "directeur" ? "secretaire" : "directeur";
  const autreUser = utilisateurs.find(u=>u.id===autreId) || { id:autreId, nom:autreId, avatar:"??", couleur:"#999" };
  const autreEnLigne = usersStatus.find(u=>u.id===autreId)?.en_ligne;

  // ── Marquer tous les messages reçus comme lus dès l'ouverture ──────────────
  useEffect(()=>{
    const nonLus = messages.filter(m=>m.a===user.id&&!m.lu).length;
    if (nonLus === 0) return;
    api("/api/messages/lire", { method:"PUT" }, token)
      .then(()=>{
        // Mise à jour locale immédiate : badge disparaît sans recharger
        setMessages(prev => prev.map(m => m.a === user.id ? { ...m, lu:1 } : m));
      })
      .catch(()=>{});
  }, []); // S'exécute une seule fois à l'ouverture de la page Messages

  // ── Aussi marquer lu quand un nouveau message arrive pendant qu'on est sur la page
  useEffect(()=>{
    const nouveauxNonLus = messages.filter(m=>m.a===user.id&&!m.lu);
    if (nouveauxNonLus.length === 0) return;
    // Petite pause pour laisser le message s'afficher avant de le marquer lu
    const t = setTimeout(()=>{
      setMessages(prev => prev.map(m => m.a === user.id ? { ...m, lu:1 } : m));
    }, 800);
    return () => clearTimeout(t);
  }, [messages.length]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  useEffect(()=>{
    const s = socketRef.current;
    if (!s) return;
    const h = ({ de, actif }) => { if (de!==user.id) setAutreEnTrain(actif); };
    s.on("interlocuteur_tape", h);
    return ()=>s.off("interlocuteur_tape", h);
  }, [socketRef.current]);

  const handleChange = val => {
    setTexte(val);
    const s = socketRef.current;
    if (!s) return;
    s.emit("en_train_de_taper", { a:autreId, actif:true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(()=>s.emit("en_train_de_taper",{ a:autreId, actif:false }), 1500);
  };

  const envoyer = () => {
    const s = socketRef.current;
    if (!texte.trim() || !s) return;
    // Message temporaire (optimistic) affiché immédiatement
    const tempMsg = { id:"temp_"+Date.now(), de:user.id, a:autreId, texte:texte.trim(), lu:1, created_at:new Date().toISOString(), _temp:true };
    setMessages(prev=>[...prev, tempMsg]);
    s.emit("envoyer_message", { a:autreId, texte:texte.trim() });
    s.emit("en_train_de_taper", { a:autreId, actif:false });
    setTexte("");
  };

  const conv = messages.filter(m=>(m.de===user.id&&m.a===autreId)||(m.de===autreId&&m.a===user.id));
  const nonLus = conv.filter(m=>m.a===user.id&&!m.lu).length;

  return (
    <div className="messages-layout">
      <div className="msg-sidebar active">
        <div className="msg-sidebar-header"><h3>Conversations</h3></div>
        <div className="msg-contact active">
          <div className="avatar" style={{ background:autreUser.couleur+"22",color:autreUser.couleur,width:34,height:34,fontSize:12 }}>{autreUser.avatar}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <div className="msg-contact-name">{autreUser.nom}</div>
            <div style={{ fontSize:10,color:autreEnLigne?"#4CAF50":"var(--text-soft)",display:"flex",alignItems:"center",gap:3,marginTop:2 }}>
              <div style={{ width:5,height:5,borderRadius:"50%",background:autreEnLigne?"#4CAF50":"#999",flexShrink:0 }}/>
              {autreEnLigne?"En ligne":"Hors ligne"}
            </div>
          </div>
          {nonLus>0&&<span className="unread-badge">{nonLus}</span>}
        </div>
      </div>

      <div className="msg-main">
        <div className="msg-topbar">
          <div className="avatar" style={{ background:autreUser.couleur+"22",color:autreUser.couleur,width:34,height:34,fontSize:12 }}>{autreUser.avatar}</div>
          <div>
            <div style={{ fontWeight:600,fontSize:13 }}>{autreUser.nom}</div>
            <div style={{ fontSize:10,color:autreEnLigne?"#4CAF50":"var(--text-soft)",display:"flex",alignItems:"center",gap:3 }}>
              <div style={{ width:5,height:5,borderRadius:"50%",background:autreEnLigne?"#4CAF50":"#999" }}/>
              {autreEnLigne?"En ligne":"Hors ligne"}
            </div>
          </div>
        </div>

        <div className="msg-body">
          {conv.map(m=>(
            <div key={m.id} className={`msg-bubble ${m.de===user.id?"mine":""}`}>
              {m.de!==user.id&&<div className="avatar" style={{ background:autreUser.couleur+"22",color:autreUser.couleur,width:28,height:28,fontSize:10,flexShrink:0 }}>{autreUser.avatar}</div>}
              <div>
                <div className="bubble-text" style={{ opacity:m._temp?0.7:1 }}>{m.texte}</div>
                <div className="bubble-time">{new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>
              </div>
            </div>
          ))}
          {autreEnTrain&&(
            <div className="typing-wrap">
              <div className="avatar" style={{ background:autreUser.couleur+"22",color:autreUser.couleur,width:28,height:28,fontSize:10 }}>{autreUser.avatar}</div>
              <div className="typing-dots"><div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/></div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        <div className="msg-input-area">
          <input className="msg-input" placeholder="Écrire un message..." value={texte}
            onChange={e=>handleChange(e.target.value)} onKeyDown={e=>e.key==="Enter"&&envoyer()}/>
          <button className="send-btn" onClick={envoyer}><Icon name="send" size={15}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Tâches ───────────────────────────────────────────────────────────────────
function Taches({ user, taches, token, onRefresh, utilisateurs }) {
  const [modal,   setModal]   = useState(false);
  const [editItem,setEditItem]= useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form,    setForm]    = useState({ titre:"",description:"",assigne_a:"",priorite:"normale",date_echeance:"" });

  useEffect(()=>{ if (utilisateurs.length&&!form.assigne_a) setForm(f=>({...f,assigne_a:utilisateurs.find(u=>u.id!==user.id)?.id||utilisateurs[0].id})); },[utilisateurs]);

  const ouvrir = (item=null) => {
    if (item) { setEditItem(item); setForm({ titre:item.titre,description:item.description||"",assigne_a:item.assigne_a,priorite:item.priorite,date_echeance:item.date_echeance||"" }); }
    else { setEditItem(null); setForm({ titre:"",description:"",assigne_a:utilisateurs.find(u=>u.id!==user.id)?.id||"",priorite:"normale",date_echeance:"" }); }
    setModal(true);
  };

  const sauvegarder = async () => {
    if (editItem) await api(`/api/taches/${editItem.id}`,{ method:"PUT",body:form },token);
    else          await api("/api/taches",               { method:"POST",body:form},token);
    setModal(false); onRefresh();
  };

  const supprimer = async id => { await api(`/api/taches/${id}`,{ method:"DELETE" },token); setConfirm(null); onRefresh(); };
  const changeStatut = async (id,statut) => { await api(`/api/taches/${id}`,{ method:"PUT",body:{statut} },token); onRefresh(); };

  const cols = [
    { key:"en_attente",label:"En attente",next:"en_cours",  nextLabel:"→ En cours" },
    { key:"en_cours",  label:"En cours",  next:"termine",   nextLabel:"✓ Terminer"  },
    { key:"termine",   label:"Terminé",   next:null },
  ];

  return (
    <div>
      <div className="page-header">
        <div><div className="section-title">Gestion des tâches</div><div className="text-soft mt-1">{taches.length} tâches au total</div></div>
        <button className="btn-primary" onClick={()=>ouvrir()}><Icon name="plus" size={15}/> Nouvelle tâche</button>
      </div>
      <div className="tasks-cols">
        {cols.map(col=>{
          const items = taches.filter(t=>t.statut===col.key);
          return (
            <div key={col.key} className="task-col">
              <div className="task-col-header">{col.label}<span className="task-col-count">{items.length}</span></div>
              {items.map(t=>(
                <div key={t.id} className="task-card">
                  <div className="task-title">{t.titre}</div>
                  {t.description&&<div className="task-desc">{t.description}</div>}
                  <div className="task-meta">
                    <span className={`priority-badge priority-${t.priorite}`}>{t.priorite==="haute"?"Haute":t.priorite==="normale"?"Normale":"Basse"}</span>
                    <span style={{ fontSize:11,color:"var(--text-soft)" }}>👤 {t.assigne_a}</span>
                  </div>
                  {t.date_echeance&&<div className="text-soft mt-2" style={{ fontSize:10 }}>📅 {t.date_echeance}</div>}
                  <div className="task-actions">
                    {col.next&&<button className="btn-secondary btn-sm" onClick={()=>changeStatut(t.id,col.next)}>{col.nextLabel}</button>}
                    <button className="btn-icon" onClick={()=>ouvrir(t)}><Icon name="edit" size={13}/></button>
                    <button className="btn-icon danger" onClick={()=>setConfirm(t.id)}><Icon name="trash" size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editItem?"Modifier la tâche":"Nouvelle tâche"}</div>
            <div className="form-group"><label className="form-label">Titre</label><input className="form-input" placeholder="Ex : Préparer le rapport..." value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Description (optionnel)</label><textarea className="form-textarea" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Assigner à</label>
                <select className="form-select" value={form.assigne_a} onChange={e=>setForm(f=>({...f,assigne_a:e.target.value}))}>
                  {utilisateurs.map(u=><option key={u.id} value={u.id}>{u.nom}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Priorité</label>
                <select className="form-select" value={form.priorite} onChange={e=>setForm(f=>({...f,priorite:e.target.value}))}>
                  <option value="haute">Haute</option><option value="normale">Normale</option><option value="basse">Basse</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Date d'échéance</label><input type="date" className="form-input" value={form.date_echeance} onChange={e=>setForm(f=>({...f,date_echeance:e.target.value}))}/></div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={sauvegarder} disabled={!form.titre}>{editItem?"Modifier":"Créer"}</button>
            </div>
          </div>
        </div>
      )}
      {confirm&&<Confirm message="Supprimer cette tâche définitivement ?" onOk={()=>supprimer(confirm)} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────
function Documents({ user, docs, token, onRefresh }) {
  const [modal,    setModal]    = useState(false);
  const [fichier,  setFichier]  = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [uploading,setUploading] = useState(false);
  const [drag,     setDrag]     = useState(false);
  // ID unique pour le <label> — compatible mobile sans inputRef.click()
  const inputId = "doc-upload-input";

  const typeClass = t => ["xlsx","xls"].includes(t)?"doc-xlsx":["docx","doc"].includes(t)?"doc-docx":t==="pdf"?"doc-pdf":"doc-other";

  const handleFile = f => { if (f && f.size > 0) { setFichier(f); setModal(true); } };

  // Construit l'URL de téléchargement Cloudinary compatible mobile
  // fl_attachment force le téléchargement au lieu d'afficher dans le navigateur
  const buildDownloadUrl = url => {
    if (!url) return "#";
    // Insère fl_attachment dans l'URL Cloudinary raw
    return url.replace("/upload/", "/upload/fl_attachment/");
  };

  const ajouter = async () => {
    if (!fichier) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur upload");
      setModal(false); setFichier(null); onRefresh();
    } catch(e) { alert("Erreur : " + e.message); }
    finally { setUploading(false); }
  };

  const valider   = async id => { await api(`/api/documents/${id}/valider`, { method:"PUT" }, token); onRefresh(); };
  const supprimer = async id => { await api(`/api/documents/${id}`, { method:"DELETE" }, token); setConfirm(null); onRefresh(); };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">Documents</div>
          <div className="text-soft mt-1">{docs.length} documents partagés</div>
        </div>
        {/* label natif = compatible iOS/Android sans JS click() */}
        <label htmlFor={inputId} className="btn-primary" style={{ cursor:"pointer" }}>
          <Icon name="upload" size={15}/> Uploader
        </label>
      </div>

      {/* Input fichier déclenché par label — fonctionne sur mobile */}
      <input
        id={inputId} type="file" style={{ display:"none" }}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
        onChange={e => { handleFile(e.target.files[0]); e.target.value = ""; }}
      />

      {/* Zone drag & drop (desktop uniquement) */}
      <label htmlFor={inputId}
        className={`upload-zone ${drag?"dragover":""}`}
        onDragOver={e=>{e.preventDefault();setDrag(true)}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0])}}>
        <Icon name="upload" size={28}/>
        <div style={{ marginTop:10,fontWeight:500,fontSize:13 }}>Glissez un fichier ici ou appuyez pour choisir</div>
        <div style={{ fontSize:11,marginTop:3 }}>PDF, Word, Excel, Images — 20 MB max</div>
      </label>

      <div className="docs-grid">
        {docs.map(d=>(
          <div key={d.id} className="doc-card">
            <div className={`doc-type-icon ${typeClass(d.type)}`}>{d.type?.toUpperCase()}</div>
            <div className="doc-name">{d.nom}</div>
            <div className="doc-info">
              <span>{d.taille}</span><span>·</span>
              <span>{new Date(d.created_at).toLocaleDateString("fr-FR")}</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
              <span className={`doc-status ${d.statut==="valide"?"doc-valide":"doc-attente"}`}>
                {d.statut==="valide"?"✓ Validé":"⏳ En attente"}
              </span>
              {d.statut==="en_attente"&&d.cree_par!==user.id&&(
                <button className="btn-secondary btn-sm" onClick={()=>valider(d.id)}>Valider</button>
              )}
            </div>
            <div style={{ display:"flex",gap:5 }}>
              {d.url&&(
                // fl_attachment garantit le téléchargement sur mobile et desktop
                <a href={buildDownloadUrl(d.url)} download={d.nom} target="_blank" rel="noreferrer">
                  <button className="btn-icon" title="Télécharger/Ouvrir">
                    <Icon name="download" size={13}/>
                  </button>
                </a>
              )}
              <button className="btn-icon danger" onClick={()=>setConfirm(d.id)}>
                <Icon name="trash" size={13}/>
              </button>
            </div>
            <div className="text-soft mt-2" style={{ fontSize:10 }}>Partagé par {d.cree_par}</div>
          </div>
        ))}
        {docs.length===0&&<div className="empty-state" style={{ gridColumn:"1/-1" }}>Aucun document partagé</div>}
      </div>

      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">Uploader un document</div>
            <div style={{ background:"var(--parchment)",borderRadius:10,padding:14,marginBottom:16 }}>
              <div style={{ fontWeight:500,fontSize:13 }}>📎 {fichier?.name}</div>
              <div style={{ fontSize:11,color:"var(--text-soft)",marginTop:3 }}>
                {fichier?(fichier.size>1024*1024?(fichier.size/1024/1024).toFixed(1)+" MB":Math.round(fichier.size/1024)+" KB"):""}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={()=>{setModal(false);setFichier(null);}}>Annuler</button>
              <button className="btn-primary" onClick={ajouter} disabled={uploading}>
                {uploading?<><span className="spinner"/> Envoi en cours...</>:"Envoyer le fichier"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirm&&<Confirm message="Supprimer ce document ?" onOk={()=>supprimer(confirm)} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ─── Agenda ───────────────────────────────────────────────────────────────────
function Agenda({ user, agenda, token, onRefresh }) {
  const [modal,   setModal]   = useState(false);
  const [editItem,setEditItem]= useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form,    setForm]    = useState({ titre:"",date:"",heure:"",duree:"1h",lieu:"" });
  const COULEURS = ["#C8A96E","#7B9E87","#8B6B9E","#4A90D9","#E8524A"];

  const ouvrir = (item=null) => {
    if (item) { setEditItem(item); setForm({ titre:item.titre,date:item.date,heure:item.heure,duree:item.duree,lieu:item.lieu||"" }); }
    else      { setEditItem(null); setForm({ titre:"",date:"",heure:"",duree:"1h",lieu:"" }); }
    setModal(true);
  };
  const sauvegarder = async () => {
    if (editItem) await api(`/api/agenda/${editItem.id}`,{ method:"PUT",body:form },token);
    else          await api("/api/agenda",               { method:"POST",body:{ ...form,couleur:COULEURS[agenda.length%COULEURS.length] } },token);
    setModal(false); onRefresh();
  };
  const supprimer = async id => { await api(`/api/agenda/${id}`,{ method:"DELETE" },token); setConfirm(null); onRefresh(); };

  return (
    <div>
      <div className="page-header">
        <div><div className="section-title">Agenda partagé</div><div className="text-soft mt-1">{agenda.length} événements</div></div>
        <button className="btn-primary" onClick={()=>ouvrir()}><Icon name="plus" size={15}/> Nouvel événement</button>
      </div>
      <div className="agenda-layout">
        <div>
          {[...agenda].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(ev=>(
            <div key={ev.id} className="agenda-event">
              <div className="agenda-event-bar" style={{ background:ev.couleur }}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div className="agenda-event-time">📅 {new Date(ev.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} · {ev.heure} ({ev.duree})</div>
                <div className="agenda-event-title">{ev.titre}</div>
                {ev.lieu&&<div className="agenda-event-lieu">📍 {ev.lieu}</div>}
                <div className="text-soft mt-1" style={{ fontSize:10 }}>Créé par {ev.cree_par}</div>
                <div style={{ display:"flex",gap:5,marginTop:8 }}>
                  <button className="btn-icon" onClick={()=>ouvrir(ev)}><Icon name="edit" size={13}/></button>
                  <button className="btn-icon danger" onClick={()=>setConfirm(ev.id)}><Icon name="trash" size={13}/></button>
                </div>
              </div>
            </div>
          ))}
          {agenda.length===0&&<div className="empty-state">Aucun événement planifié</div>}
        </div>
        <div style={{ background:"white",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:20,alignSelf:"start" }}>
          <div style={{ fontFamily:"Cormorant Garamond,serif",fontSize:16,fontWeight:600,marginBottom:14 }}>
            {new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}
          </div>
          {["L","M","M","J","V","S","D"].map((j,i)=>(
            <span key={i} style={{ display:"inline-block",width:"14.28%",textAlign:"center",fontSize:10,color:"var(--text-soft)",fontWeight:600,marginBottom:6 }}>{j}</span>
          ))}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2 }}>
            {[...Array(35)].map((_,i)=>{
              const d=i+1, now=new Date();
              const hasEv=agenda.some(ev=>{ const dd=new Date(ev.date); return dd.getDate()===d&&dd.getMonth()===now.getMonth()&&dd.getFullYear()===now.getFullYear(); });
              const isToday=d===now.getDate();
              return (
                <div key={i} style={{ height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,borderRadius:7,position:"relative",background:isToday?"var(--ink)":"transparent",color:isToday?"var(--gold)":d>31?"transparent":"var(--text)",fontWeight:isToday?700:400 }}>
                  {d<=31?d:""}
                  {hasEv&&d<=31&&<div style={{ position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",width:3,height:3,borderRadius:"50%",background:"var(--gold)" }}/>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editItem?"Modifier l'événement":"Nouvel événement"}</div>
            {[{l:"Titre",k:"titre",p:"Ex : Réunion d'équipe"},{l:"Lieu",k:"lieu",p:"Ex : Bureau, En ligne..."}].map(f=>(
              <div key={f.k} className="form-group"><label className="form-label">{f.l}</label><input className="form-input" placeholder={f.p} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}/></div>
            ))}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Heure</label><input type="time" className="form-input" value={form.heure} onChange={e=>setForm(p=>({...p,heure:e.target.value}))}/></div>
            </div>
            <div className="form-group"><label className="form-label">Durée</label>
              <select className="form-select" value={form.duree} onChange={e=>setForm(p=>({...p,duree:e.target.value}))}>
                {["30min","1h","1h30","2h","3h","Journée"].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={sauvegarder} disabled={!form.titre||!form.date}>{editItem?"Modifier":"Créer"}</button>
            </div>
          </div>
        </div>
      )}
      {confirm&&<Confirm message="Supprimer cet événement ?" onOk={()=>supprimer(confirm)} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ─── Gestion Utilisateurs ─────────────────────────────────────────────────────
function GestionUtilisateurs({ utilisateurs, token, onRefresh }) {
  const [modal,   setModal]   = useState(false);
  const [editItem,setEditItem]= useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form,    setForm]    = useState({ id:"",nom:"",role:"",password:"",couleur:"#4A90D9" });

  const ouvrir = (item=null) => {
    if (item) { setEditItem(item); setForm({ id:item.id,nom:item.nom,role:item.role,password:"",couleur:item.couleur }); }
    else      { setEditItem(null); setForm({ id:"",nom:"",role:"",password:"",couleur:"#4A90D9" }); }
    setModal(true);
  };
  const sauvegarder = async () => {
    try {
      if (editItem) await api(`/api/utilisateurs/${editItem.id}`,{ method:"PUT",body:{ nom:form.nom,role:form.role,password:form.password||undefined,couleur:form.couleur } },token);
      else          await api("/api/utilisateurs",               { method:"POST",body:form },token);
      setModal(false); onRefresh();
    } catch(e){ alert(e.message); }
  };
  const supprimer = async id => {
    try { await api(`/api/utilisateurs/${id}`,{ method:"DELETE" },token); setConfirm(null); onRefresh(); }
    catch(e){ alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="section-title">Gestion des utilisateurs</div><div className="text-soft mt-1">{utilisateurs.length} comptes actifs</div></div>
        <button className="btn-primary" onClick={()=>ouvrir()}><Icon name="plus" size={15}/> Nouveau compte</button>
      </div>
      <div className="users-grid">
        {utilisateurs.map(u=>(
          <div key={u.id} className="user-card">
            {u.is_admin&&<div className="admin-badge"><Icon name="shield" size={10}/> Admin</div>}
            <div style={{ position:"relative",width:60,margin:"0 auto 12px" }}>
              <div className="avatar" style={{ background:u.couleur+"22",color:u.couleur,borderColor:u.couleur+"44",width:60,height:60,fontSize:18,margin:"0 auto" }}>{u.avatar}</div>
              <div style={{ position:"absolute",bottom:1,right:1,width:11,height:11,borderRadius:"50%",background:u.en_ligne?"#4CAF50":"#ccc",border:"2px solid white" }}/>
            </div>
            <div className="user-card-name">{u.nom}</div>
            <div className="user-card-role">{u.role}</div>
            <div className="user-card-actions">
              <button className="btn-icon" onClick={()=>ouvrir(u)}><Icon name="edit" size={13}/></button>
              {!u.is_admin&&<button className="btn-icon danger" onClick={()=>setConfirm(u.id)}><Icon name="trash" size={13}/></button>}
            </div>
          </div>
        ))}
      </div>
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editItem?"Modifier le compte":"Nouveau compte"}</div>
            {!editItem&&<div className="form-group"><label className="form-label">Identifiant de connexion</label><input className="form-input" placeholder="Ex : jean.dupont" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value.toLowerCase().replace(/\s/g,"")}))} /></div>}
            <div className="form-group"><label className="form-label">Nom complet</label><input className="form-input" placeholder="Ex : M. Jean Dupont" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Poste / Rôle</label><input className="form-input" placeholder="Ex : Responsable Commercial" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}/></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{editItem?"Nouveau mot de passe":"Mot de passe"}</label><input type="password" className="form-input" placeholder="••••••••" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Couleur</label><input type="color" className="form-input" style={{ height:40,cursor:"pointer" }} value={form.couleur} onChange={e=>setForm(f=>({...f,couleur:e.target.value}))}/></div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={sauvegarder} disabled={!form.nom||!form.role||(editItem?false:!form.id||!form.password)}>
                {editItem?"Modifier":"Créer le compte"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirm&&<Confirm message="Supprimer ce compte ? Cette action est irréversible." onOk={()=>supprimer(confirm)} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ─── App principale ───────────────────────────────────────────────────────────
function App() {
  const [token, setToken] = useState(()=>localStorage.getItem("corpsync_token"));
  const [user,  setUser]  = useState(()=>{
    const t=localStorage.getItem("corpsync_token");
    if(!t) return null;
    try{ return JSON.parse(atob(t.split(".")[1])); } catch{ return null; }
  });

  const [page,          setPage]          = useState("dashboard");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [messages,      setMessages]      = useState([]);
  const [taches,        setTaches]        = useState([]);
  const [docs,          setDocs]          = useState([]);
  const [agenda,        setAgenda]        = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [usersStatus,   setUsersStatus]   = useState([]);
  const [utilisateurs,  setUtilisateurs]  = useState([]);
  const [usersPublics,  setUsersPublics]  = useState([]);
  const [toast,         setToast]         = useState(null);
  const [loading,       setLoading]       = useState(false);

  const socketRef = useSocket(token);

  // Charger utilisateurs publics pour le login
  useEffect(()=>{
    fetch(`${API_URL}/api/utilisateurs`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setUsersPublics(d); }).catch(()=>{});
  },[]);

  const charger = useCallback(async ()=>{
    if(!token) return;
    setLoading(true);
    try {
      const [msgs,tch,dcs,agd,notifs,status,users] = await Promise.all([
        api("/api/messages",{}           ,token),
        api("/api/taches",{}             ,token),
        api("/api/documents",{}          ,token),
        api("/api/agenda",{}             ,token),
        api("/api/notifications",{}      ,token),
        api("/api/utilisateurs/status",{},token),
        api("/api/utilisateurs",{}       ,token),
      ]);
      setMessages(msgs); setTaches(tch); setDocs(dcs); setAgenda(agd);
      setNotifications(notifs); setUsersStatus(status); setUtilisateurs(users);
    } catch(e){ if(e.message.includes("Token")) logout(); }
    finally{ setLoading(false); }
  },[token]);

  useEffect(()=>{ if(token) charger(); },[token]);

  // WebSocket events
  useEffect(()=>{
    const s = socketRef.current;
    if(!s) return;

    // ── Fix doublon messagerie ──
    // message_envoye = confirmation pour l'expéditeur (remplace le message temp)
    s.on("message_envoye", msg=>{
      setMessages(prev=>prev.map(m=>m._temp ? msg : m).filter((m,i,arr)=>arr.findIndex(x=>x.id===m.id)===i));
    });
    // nouveau_message = reçu par le destinataire uniquement
    s.on("nouveau_message", msg=>{
      setMessages(prev=>{ if(prev.find(m=>m.id===msg.id)) return prev; return [...prev,msg]; });
      if(msg.de!==user?.id) setToast("💬 Nouveau message");
    });

    s.on("tache_update",   t  =>setTaches(prev=>prev.find(x=>x.id===t.id)?prev.map(x=>x.id===t.id?t:x):[...prev,t]));
    s.on("tache_deleted",  ({id})=>setTaches(prev=>prev.filter(t=>t.id!==id)));
    s.on("doc_update",     d  =>setDocs(prev=>prev.find(x=>x.id===d.id)?prev.map(x=>x.id===d.id?d:x):[...prev,d]));
    s.on("doc_deleted",    ({id})=>setDocs(prev=>prev.filter(d=>d.id!==id)));
    s.on("agenda_update",  ev =>setAgenda(prev=>prev.find(x=>x.id===ev.id)?prev.map(x=>x.id===ev.id?ev:x):[...prev,ev]));
    s.on("agenda_deleted", ({id})=>setAgenda(prev=>prev.filter(e=>e.id!==id)));
    s.on("utilisateur_ajoute",  u =>setUtilisateurs(prev=>[...prev,u]));
    s.on("utilisateur_modifie", u =>setUtilisateurs(prev=>prev.map(x=>x.id===u.id?u:x)));
    s.on("utilisateur_supprime",({id})=>setUtilisateurs(prev=>prev.filter(u=>u.id!==id)));
    s.on("notification", ({ texte })=>{
      setToast(texte);
      setNotifications(prev=>[{ id:Date.now(),texte,lu:0,created_at:new Date().toISOString() },...prev]);
    });
    s.on("user_status", ({ id, en_ligne })=>setUsersStatus(prev=>prev.map(u=>u.id===id?{...u,en_ligne}:u)));

    return ()=>{
      ["message_envoye","nouveau_message","tache_update","tache_deleted","doc_update","doc_deleted",
       "agenda_update","agenda_deleted","utilisateur_ajoute","utilisateur_modifie","utilisateur_supprime",
       "notification","user_status"].forEach(e=>s.off(e));
    };
  },[socketRef.current, user]);

  const login = (tok, userData)=>{ localStorage.setItem("corpsync_token",tok); setToken(tok); setUser(userData); };
  const logout = async ()=>{
    try{ await api("/api/auth/logout",{ method:"POST" },token); }catch{}
    localStorage.removeItem("corpsync_token");
    setToken(null); setUser(null);
    setMessages([]); setTaches([]); setDocs([]); setAgenda([]);
    setNotifications([]); setUsersStatus([]); setUtilisateurs([]);
    setPage("dashboard");
  };

  const nonLus      = messages.filter(m=>m.a===user?.id&&!m.lu).length;
  const tachesActiv = taches.filter(t=>t.assigne_a===user?.id&&t.statut!=="termine").length;
  const notifNL     = notifications.filter(n=>!n.lu).length;

  const nav = [
    { key:"dashboard",    label:"Tableau de bord",   icon:"dashboard" },
    { key:"messages",     label:"Messages",           icon:"message",  badge:nonLus       },
    { key:"taches",       label:"Tâches",             icon:"task",     badge:tachesActiv  },
    { key:"documents",    label:"Documents",          icon:"doc"                          },
    { key:"agenda",       label:"Agenda",             icon:"calendar"                     },
    ...(user?.is_admin?[{ key:"utilisateurs", label:"Utilisateurs", icon:"users" }]:[]),
  ];

  const titles = { dashboard:"Tableau de bord",messages:"Messagerie",taches:"Tâches",documents:"Documents",agenda:"Agenda",utilisateurs:"Utilisateurs" };

  const navigate = key => { setPage(key); setSidebarOpen(false); };

  if(!token||!user) return (
    <><style>{styles}</style><LoginScreen onLogin={login} utilisateurs={usersPublics}/></>
  );

  return (
    <>
      <style>{styles}</style>
      {toast&&<Toast message={toast} onClose={()=>setToast(null)}/>}

      {/* Overlay mobile */}
      {sidebarOpen&&<div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}/>}

      <div className="app">
        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen?"open":""}`}>
          <div className="sidebar-logo">
            <h1>CorpSync</h1>
            <p>Plateforme de Direction</p>
          </div>
          <div className="sidebar-user">
            <div className="avatar" style={{ background:user.couleur+"33",color:user.couleur,width:36,height:36,fontSize:12 }}>{user.avatar}</div>
            <div className="sidebar-user-info">
              <div className="uname">{user.nom}</div>
              <div className="urole">{user.role}</div>
              <div className="online-pill"><div className="online-dot"/> En ligne</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {nav.map(n=>(
              <div key={n.key} className={`nav-item ${page===n.key?"active":""}`} onClick={()=>navigate(n.key)}>
                <Icon name={n.icon} size={17}/> {n.label}
                {n.badge>0&&<span className="badge">{n.badge}</span>}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={logout}>
              <Icon name="logout" size={17}/> Se déconnecter
            </button>
          </div>
        </aside>

        {/* ── Contenu ── */}
        <main className="main">
          <div className="topbar">
            <div className="topbar-left">
              <div className="menu-btn" onClick={()=>setSidebarOpen(!sidebarOpen)}>
                <Icon name={sidebarOpen?"close":"menu"} size={18}/>
              </div>
              <div className="topbar-title">{titles[page]}</div>
            </div>
            <div className="topbar-right">
              <div className="date-chip">{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</div>
              <div className="notif-btn" onClick={()=>navigate("dashboard")}>
                <Icon name="bell" size={17}/>
                {notifNL>0&&<div className="notif-dot"/>}
              </div>
            </div>
          </div>

          <div className="content">
            {loading&&<div className="loading-page"><div className="spinner"/> Chargement...</div>}
            {!loading&&<>
              {page==="dashboard"   &&<Dashboard user={user} taches={taches} messages={messages} docs={docs} notifications={notifications} setPage={setPage}/>}
              {page==="messages"    &&<Messages  user={user} messages={messages} setMessages={setMessages} socketRef={socketRef} usersStatus={usersStatus} utilisateurs={utilisateurs} token={token}/>}
              {page==="taches"      &&<Taches    user={user} taches={taches} token={token} onRefresh={charger} utilisateurs={utilisateurs}/>}
              {page==="documents"   &&<Documents user={user} docs={docs} token={token} onRefresh={charger}/>}
              {page==="agenda"      &&<Agenda    user={user} agenda={agenda} token={token} onRefresh={charger}/>}
              {page==="utilisateurs"&&user.is_admin&&<GestionUtilisateurs utilisateurs={utilisateurs} token={token} onRefresh={charger}/>}
            </>}
          </div>
        </main>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);


            
