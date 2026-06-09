/**
 * CorpSync — Frontend v2
 * Nouveautés : upload fichiers, CRUD tâches/agenda, gestion utilisateurs (admin)
 */

const { useState, useEffect, useRef, useCallback } = React;
const io = window.io;

// ─── URL Backend ──────────────────────────────────────────────────────────────
const API_URL = "https://corpsync-production.up.railway.app";

// ─── Client HTTP ──────────────────────────────────────────────────────────────
async function api(path, options = {}, token = null) {
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res  = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erreur || "Erreur serveur");
  return data;
}

// ─── Icônes SVG ───────────────────────────────────────────────────────────────
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
    check:     <><polyline points="20 6 9 17 4 12"/></>,
    shield:    <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
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
    --radius:12px;--sidebar-w:260px;
  }
  body{font-family:'DM Sans',sans-serif;background:var(--cream);color:var(--text)}
  .app{display:flex;height:100vh;overflow:hidden}

  /* Sidebar */
  .sidebar{width:var(--sidebar-w);background:var(--ink);color:white;display:flex;flex-direction:column;flex-shrink:0;position:relative;overflow:hidden}
  .sidebar::before{content:'';position:absolute;top:-80px;right:-80px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(200,169,110,0.15),transparent 70%);pointer-events:none}
  .sidebar-logo{padding:28px 24px 20px;border-bottom:1px solid rgba(200,169,110,0.15)}
  .sidebar-logo h1{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--gold)}
  .sidebar-logo p{font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;letter-spacing:1.5px;text-transform:uppercase}
  .sidebar-user{padding:20px 24px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(200,169,110,0.1)}
  .avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex-shrink:0;border:2px solid rgba(200,169,110,0.3)}
  .sidebar-user-info .name{font-size:14px;font-weight:500;color:white}
  .sidebar-user-info .role{font-size:11px;color:rgba(255,255,255,0.4);margin-top:1px}
  .online-pill{display:flex;align-items:center;gap:5px;font-size:11px;color:#4CAF50;margin-top:3px}
  .online-dot{width:6px;height:6px;background:#4CAF50;border-radius:50%}
  .sidebar-nav{flex:1;padding:16px 12px;display:flex;flex-direction:column;gap:2px}
  .nav-item{display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:10px;cursor:pointer;transition:all 0.2s;font-size:14px;color:rgba(255,255,255,0.55)}
  .nav-item:hover{background:rgba(200,169,110,0.08);color:rgba(255,255,255,0.85)}
  .nav-item.active{background:rgba(200,169,110,0.15);color:var(--gold);font-weight:500}
  .nav-item .badge{margin-left:auto;background:#E8524A;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;min-width:18px;text-align:center}
  .sidebar-footer{padding:16px 12px;border-top:1px solid rgba(200,169,110,0.1)}
  .logout-btn{display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:10px;cursor:pointer;color:rgba(255,255,255,0.4);font-size:14px;transition:all 0.2s;width:100%;background:none;border:none;font-family:'DM Sans',sans-serif}
  .logout-btn:hover{color:#E8524A;background:rgba(232,82,74,0.08)}

  /* Main */
  .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
  .topbar{background:var(--cream);border-bottom:1px solid var(--border);padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .topbar-title{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:var(--ink)}
  .topbar-right{display:flex;align-items:center;gap:16px}
  .notif-btn{width:40px;height:40px;border-radius:10px;background:var(--parchment);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;color:var(--text-soft);transition:all 0.2s}
  .notif-btn:hover{border-color:var(--gold);color:var(--gold)}
  .notif-dot{position:absolute;top:7px;right:7px;width:8px;height:8px;background:#E8524A;border-radius:50%;border:2px solid var(--cream)}
  .date-chip{padding:6px 14px;background:var(--parchment);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text-soft);font-weight:500}
  .content{flex:1;overflow-y:auto;padding:32px}

  /* Toast */
  .toast{position:fixed;top:20px;right:20px;background:var(--ink);color:var(--gold);padding:14px 20px;border-radius:12px;font-size:14px;z-index:999;box-shadow:var(--shadow-lg);animation:slideLeft 0.3s ease;max-width:300px;display:flex;gap:10px;align-items:center}
  @keyframes slideLeft{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}

  /* Stats */
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
  .stat-card{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:24px;transition:all 0.25s}
  .stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--gold)}
  .stat-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:16px}
  .stat-value{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:700;color:var(--ink);line-height:1;margin-bottom:4px}
  .stat-label{font-size:13px;color:var(--text-soft)}
  .dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .dash-card{background:white;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  .dash-card-header{padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .dash-card-header h3{font-size:15px;font-weight:600;color:var(--ink)}
  .view-all{font-size:12px;color:var(--gold);cursor:pointer;font-weight:500}
  .activity-item{padding:14px 24px;display:flex;gap:14px;align-items:flex-start;border-bottom:1px solid var(--border)}
  .activity-item:last-child{border-bottom:none}
  .activity-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:6px}
  .activity-text{font-size:14px;color:var(--text)}
  .activity-text span{font-weight:500}
  .activity-time{font-size:12px;color:var(--text-soft);margin-top:3px}

  /* Messages */
  .messages-layout{display:grid;grid-template-columns:280px 1fr;height:calc(100vh - 130px);background:white;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  .msg-sidebar{border-right:1px solid var(--border);display:flex;flex-direction:column}
  .msg-sidebar-header{padding:20px;border-bottom:1px solid var(--border)}
  .msg-sidebar-header h3{font-size:15px;font-weight:600}
  .msg-contact{padding:16px 20px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:background 0.15s}
  .msg-contact:hover,.msg-contact.active{background:var(--parchment)}
  .msg-contact-name{font-size:14px;font-weight:500}
  .msg-contact-preview{font-size:12px;color:var(--text-soft);margin-top:2px}
  .unread-badge{margin-left:auto;background:var(--gold);color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px}
  .msg-main{display:flex;flex-direction:column}
  .msg-topbar{padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}
  .msg-body{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:16px;background:var(--cream)}
  .msg-bubble{display:flex;gap:10px;max-width:75%}
  .msg-bubble.mine{align-self:flex-end;flex-direction:row-reverse}
  .bubble-text{padding:12px 16px;border-radius:16px;font-size:14px;line-height:1.5;background:white;border:1px solid var(--border)}
  .msg-bubble.mine .bubble-text{background:var(--ink);color:white;border-color:var(--ink);border-radius:16px 4px 16px 16px}
  .msg-bubble:not(.mine) .bubble-text{border-radius:4px 16px 16px 16px}
  .bubble-time{font-size:10px;color:var(--text-soft);margin-top:4px}
  .msg-bubble.mine .bubble-time{text-align:right}
  .typing-wrap{display:flex;gap:10px;align-items:center}
  .typing-dots{display:flex;gap:4px;align-items:center;background:white;border:1px solid var(--border);padding:12px 16px;border-radius:4px 16px 16px 16px}
  .typing-dot{width:6px;height:6px;border-radius:50%;background:var(--text-soft);animation:bounce 1.2s infinite}
  .typing-dot:nth-child(2){animation-delay:0.2s}
  .typing-dot:nth-child(3){animation-delay:0.4s}
  @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  .msg-input-area{padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:12px}
  .msg-input{flex:1;padding:12px 16px;border:1px solid var(--border);border-radius:24px;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;background:var(--parchment);transition:border-color 0.2s}
  .msg-input:focus{border-color:var(--gold)}
  .send-btn{width:44px;height:44px;border-radius:50%;background:var(--ink);border:none;color:var(--gold);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;flex-shrink:0}
  .send-btn:hover{background:var(--gold-dark)}

  /* Tâches */
  .page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
  .tasks-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  .task-col{background:var(--parchment);border-radius:var(--radius);padding:16px;min-height:400px}
  .task-col-header{font-size:13px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
  .task-col-count{background:rgba(200,169,110,0.2);padding:2px 8px;border-radius:20px;font-size:11px}
  .task-card{background:white;border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px;transition:all 0.2s}
  .task-card:hover{box-shadow:var(--shadow);transform:translateY(-1px)}
  .task-title{font-size:14px;font-weight:500;margin-bottom:8px;color:var(--ink)}
  .task-desc{font-size:12px;color:var(--text-soft);margin-bottom:10px}
  .task-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .priority-badge{padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600}
  .priority-haute{background:#FEE2E2;color:#DC2626}
  .priority-normale{background:#E0F2FE;color:#0284C7}
  .priority-basse{background:#F0FDF4;color:#16A34A}
  .task-actions{display:flex;gap:6px;margin-top:10px}
  .btn-icon{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-soft);transition:all 0.2s}
  .btn-icon:hover{border-color:var(--gold);color:var(--gold)}
  .btn-icon.danger:hover{border-color:#DC2626;color:#DC2626}

  /* Documents */
  .docs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .doc-card{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:20px;transition:all 0.2s}
  .doc-card:hover{box-shadow:var(--shadow);border-color:var(--gold-light)}
  .doc-type-icon{width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin-bottom:14px}
  .doc-pdf{background:#FEE2E2;color:#DC2626}
  .doc-xlsx{background:#DCFCE7;color:#16A34A}
  .doc-docx{background:#DBEAFE;color:#2563EB}
  .doc-other{background:#F3E8FF;color:#7C3AED}
  .doc-name{font-size:14px;font-weight:500;color:var(--ink);margin-bottom:8px;word-break:break-word}
  .doc-info{font-size:12px;color:var(--text-soft);display:flex;gap:8px;margin-bottom:12px}
  .doc-status{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;padding:4px 10px;border-radius:20px}
  .doc-valide{background:#DCFCE7;color:#16A34A}
  .doc-attente{background:#FEF3C7;color:#D97706}
  .upload-zone{border:2px dashed var(--border);border-radius:10px;padding:32px;text-align:center;color:var(--text-soft);cursor:pointer;transition:all 0.2s;margin-bottom:16px}
  .upload-zone:hover,.upload-zone.dragover{border-color:var(--gold);color:var(--gold);background:rgba(200,169,110,0.05)}

  /* Agenda */
  .agenda-layout{display:grid;grid-template-columns:1fr 320px;gap:24px}
  .agenda-event{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:12px;display:flex;gap:16px;transition:all 0.2s}
  .agenda-event:hover{box-shadow:var(--shadow)}
  .agenda-event-bar{width:4px;border-radius:4px;flex-shrink:0}
  .agenda-event-time{font-size:12px;color:var(--text-soft);margin-bottom:4px}
  .agenda-event-title{font-size:15px;font-weight:600;color:var(--ink);margin-bottom:4px}
  .agenda-event-lieu{font-size:12px;color:var(--text-soft)}

  /* Utilisateurs (admin) */
  .users-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .user-card{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:24px;text-align:center;transition:all 0.2s;position:relative}
  .user-card:hover{box-shadow:var(--shadow)}
  .user-card-avatar{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;margin:0 auto 14px;border:3px solid}
  .user-card-name{font-size:16px;font-weight:600;color:var(--ink);margin-bottom:4px}
  .user-card-role{font-size:13px;color:var(--text-soft);margin-bottom:12px}
  .user-card-actions{display:flex;gap:8px;justify-content:center}
  .admin-badge{position:absolute;top:12px;right:12px;background:rgba(200,169,110,0.15);color:var(--gold);font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;display:flex;align-items:center;gap:4px}
  .online-indicator{width:12px;height:12px;border-radius:50%;border:2px solid white;position:absolute;bottom:2px;right:2px}

  /* Boutons */
  .btn-primary{padding:10px 20px;background:var(--ink);color:var(--gold);border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.2s}
  .btn-primary:hover{background:var(--gold-dark);color:white}
  .btn-primary:disabled{opacity:0.5;cursor:not-allowed}
  .btn-secondary{padding:10px 20px;background:white;color:var(--ink);border:1px solid var(--border);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.2s}
  .btn-secondary:hover{border-color:var(--gold);color:var(--gold)}
  .btn-danger{padding:10px 20px;background:#FEE2E2;color:#DC2626;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.2s}
  .btn-danger:hover{background:#DC2626;color:white}

  /* Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(26,26,46,0.5);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px);animation:fadeIn 0.2s ease}
  .modal{background:white;border-radius:16px;padding:32px;width:480px;max-width:95vw;box-shadow:var(--shadow-lg);animation:slideUp 0.25s ease;max-height:90vh;overflow-y:auto}
  .modal-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--ink);margin-bottom:24px}
  .form-group{margin-bottom:18px}
  .form-label{display:block;font-size:13px;font-weight:500;color:var(--text-soft);margin-bottom:6px}
  .form-input,.form-select,.form-textarea{width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color 0.2s;background:var(--parchment)}
  .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--gold)}
  .form-textarea{resize:vertical;min-height:80px}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .modal-actions{display:flex;gap:12px;justify-content:flex-end;margin-top:24px}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

  /* Login */
  .login-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--ink);position:relative;overflow:hidden}
  .login-bg{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(200,169,110,0.12),transparent 70%);pointer-events:none}
  .login-card{background:white;border-radius:20px;padding:48px;width:420px;max-width:95vw;box-shadow:0 32px 80px rgba(0,0,0,0.3);position:relative;z-index:1}
  .login-logo{text-align:center;margin-bottom:36px}
  .login-logo h1{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:var(--ink)}
  .login-logo p{font-size:12px;color:var(--text-soft);letter-spacing:2px;text-transform:uppercase;margin-top:4px}
  .login-btn{width:100%;padding:14px;background:var(--ink);color:var(--gold);border:none;border-radius:12px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.2s;letter-spacing:0.5px;margin-top:4px}
  .login-btn:hover{background:var(--gold-dark);color:white}
  .login-btn:disabled{opacity:0.5;cursor:not-allowed}
  .error-box{background:#FEE2E2;color:#DC2626;padding:10px 14px;border-radius:8px;font-size:13px;margin-top:12px;text-align:center}

  /* Divers */
  .section-title{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--ink)}
  .text-soft{color:var(--text-soft);font-size:13px}
  .mt-1{margin-top:4px}.mt-2{margin-top:8px}.mb-4{margin-bottom:16px}
  .spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block}
  @keyframes spin{to{transform:rotate(360deg)}}
  .loading-page{display:flex;align-items:center;justify-content:center;height:200px;gap:12px;color:var(--text-soft);font-size:14px}
  .empty-state{text-align:center;padding:48px;color:var(--text-soft)}
  .divider{height:1px;background:var(--border);margin:8px 0}
`;

// ─── Hook Socket ──────────────────────────────────────────────────────────────
function useSocket(token) {
  const socketRef = useRef(null);
  useEffect(() => {
    if (!token) return;
    const s = io(API_URL, { auth: { token }, transports: ["websocket","polling"] });
    socketRef.current = s;
    return () => s.disconnect();
  }, [token]);
  return socketRef.current;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  return <div className="toast"><Icon name="bell" size={16}/> {message}</div>;
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function Confirm({ message, onOk, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 360 }}>
        <div className="modal-title" style={{ fontSize: 18 }}>Confirmation</div>
        <p style={{ color: "var(--text-soft)", fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Annuler</button>
          <button className="btn-danger" onClick={onOk}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, utilisateurs }) {
  const [form, setForm]   = useState({ id: "", password: "" });
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  // Construire la liste depuis les vrais utilisateurs
  const options = utilisateurs.length > 0 ? utilisateurs : [
    { id: "directeur", nom: "M. Directeur", role: "Directeur Général" },
    { id: "secretaire", nom: "Mme Secrétaire", role: "Secrétaire de Direction" },
  ];

  useEffect(() => { if (options.length > 0 && !form.id) setForm(f => ({ ...f, id: options[0].id })); }, [options]);

  const submit = async () => {
    if (!form.password) return setErreur("Veuillez entrer votre mot de passe.");
    setLoading(true); setErreur("");
    try {
      const data = await api("/api/auth/login", { method: "POST", body: form });
      onLogin(data.token, data.user);
    } catch(e) { setErreur(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-screen">
      <div className="login-bg" style={{ width:500,height:500,top:-200,left:-150 }}/>
      <div className="login-bg" style={{ width:400,height:400,bottom:-150,right:-100 }}/>
      <div className="login-card">
        <div className="login-logo">
          <h1>CorpSync</h1>
          <p>Plateforme de Direction</p>
        </div>
        <div className="form-group">
          <label className="form-label">Profil</label>
          <select className="form-select" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}>
            {options.map(u => <option key={u.id} value={u.id}>{u.nom} — {u.role}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display:"flex",alignItems:"center",gap:6 }}>
            <Icon name="lock" size={13}/> Mot de passe
          </label>
          <input type="password" className="form-input" placeholder="••••••••"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && submit()}/>
        </div>
        {erreur && <div className="error-box">{erreur}</div>}
        <button className="login-btn" onClick={submit} disabled={loading || !form.id}>
          {loading ? <><span className="spinner"/> Connexion...</> : "Accéder à la plateforme →"}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ user, taches, messages, docs, notifications, setPage }) {
  const nonLus     = messages.filter(m => m.a === user.id && !m.lu).length;
  const mesTaches  = taches.filter(t => t.assigne_a === user.id && t.statut !== "termine");
  const docsAtt    = docs.filter(d => d.statut === "en_attente").length;
  const notifNonLu = notifications.filter(n => !n.lu).length;
  return (
    <div>
      <div className="stats-grid">
        {[
          { label:"Messages non lus",    value:nonLus,          icon:"message",  color:"#C8A96E", bg:"rgba(200,169,110,0.1)" },
          { label:"Mes tâches actives",  value:mesTaches.length, icon:"task",    color:"#7B9E87", bg:"rgba(123,158,135,0.1)" },
          { label:"Docs en attente",     value:docsAtt,          icon:"doc",     color:"#8B6B9E", bg:"rgba(139,107,158,0.1)" },
          { label:"Notifications",       value:notifNonLu,       icon:"bell",    color:"#4A90D9", bg:"rgba(74,144,217,0.1)"  },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg, color:s.color }}><Icon name={s.icon} size={22}/></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-header"><h3>Notifications récentes</h3></div>
          {notifications.slice(0,5).map((n,i) => (
            <div key={i} className="activity-item">
              <div className="activity-dot" style={{ background: n.lu ? "var(--border)" : "var(--gold)" }}/>
              <div>
                <div className="activity-text">{n.texte}</div>
                <div className="activity-time">{new Date(n.created_at).toLocaleString("fr-FR")}</div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && <div className="empty-state">Aucune notification</div>}
        </div>
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Mes tâches actives</h3>
            <span className="view-all" onClick={() => setPage("taches")}>Voir tout</span>
          </div>
          {mesTaches.slice(0,4).map(t => (
            <div key={t.id} className="activity-item">
              <div className="activity-dot" style={{ background: t.priorite === "haute" ? "#DC2626" : "#0284C7" }}/>
              <div>
                <div className="activity-text"><span>{t.titre}</span></div>
                <div className="activity-time">{t.date_echeance ? `Échéance : ${t.date_echeance}` : "Sans échéance"}</div>
              </div>
            </div>
          ))}
          {mesTaches.length === 0 && <div className="empty-state">Aucune tâche active 🎉</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────
function Messages({ user, messages, socket, usersStatus, utilisateurs }) {
  const [texte, setTexte]   = useState("");
  const [autreEnTrain, setAutreEnTrain] = useState(false);
  const bottomRef  = useRef();
  const typingTimer = useRef();

  const autreId = user.id === "directeur" ? "secretaire" : "directeur";
  const autreUser = utilisateurs.find(u => u.id === autreId) || { id: autreId, nom: autreId, avatar: "??", couleur: "#999" };
  const autreEnLigne = usersStatus.find(u => u.id === autreId)?.en_ligne;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const h = ({ de, actif }) => { if (de !== user.id) setAutreEnTrain(actif); };
    socket.on("interlocuteur_tape", h);
    return () => socket.off("interlocuteur_tape", h);
  }, [socket]);

  const handleChange = val => {
    setTexte(val);
    if (!socket) return;
    socket.emit("en_train_de_taper", { a: autreId, actif: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("en_train_de_taper", { a: autreId, actif: false }), 1500);
  };

  const envoyer = () => {
    if (!texte.trim() || !socket) return;
    socket.emit("envoyer_message", { a: autreId, texte: texte.trim() });
    socket.emit("en_train_de_taper", { a: autreId, actif: false });
    setTexte("");
  };

  const conv = messages.filter(m => (m.de===user.id&&m.a===autreId)||(m.de===autreId&&m.a===user.id));
  const nonLus = conv.filter(m => m.a===user.id&&!m.lu).length;

  return (
    <div className="messages-layout">
      <div className="msg-sidebar">
        <div className="msg-sidebar-header"><h3>Conversations</h3></div>
        <div className="msg-contact active">
          <div className="avatar" style={{ background:autreUser.couleur+"22", color:autreUser.couleur, width:36, height:36 }}>{autreUser.avatar}</div>
          <div style={{ flex:1 }}>
            <div className="msg-contact-name">{autreUser.nom}</div>
            <div style={{ fontSize:11, color: autreEnLigne?"#4CAF50":"var(--text-soft)", display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:autreEnLigne?"#4CAF50":"#999" }}/>
              {autreEnLigne ? "En ligne" : "Hors ligne"}
            </div>
          </div>
          {nonLus > 0 && <span className="unread-badge">{nonLus}</span>}
        </div>
      </div>
      <div className="msg-main">
        <div className="msg-topbar">
          <div className="avatar" style={{ background:autreUser.couleur+"22", color:autreUser.couleur, width:36, height:36 }}>{autreUser.avatar}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:14 }}>{autreUser.nom}</div>
            <div style={{ fontSize:11, color:autreEnLigne?"#4CAF50":"var(--text-soft)", display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:autreEnLigne?"#4CAF50":"#999" }}/>
              {autreEnLigne ? "En ligne" : "Hors ligne"}
            </div>
          </div>
        </div>
        <div className="msg-body">
          {conv.map(m => (
            <div key={m.id} className={`msg-bubble ${m.de===user.id?"mine":""}`}>
              {m.de!==user.id && <div className="avatar" style={{ background:autreUser.couleur+"22", color:autreUser.couleur, width:30, height:30, fontSize:11 }}>{autreUser.avatar}</div>}
              <div>
                <div className="bubble-text">{m.texte}</div>
                <div className="bubble-time">{new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>
              </div>
            </div>
          ))}
          {autreEnTrain && (
            <div className="typing-wrap">
              <div className="avatar" style={{ background:autreUser.couleur+"22", color:autreUser.couleur, width:30, height:30, fontSize:11 }}>{autreUser.avatar}</div>
              <div className="typing-dots"><div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/></div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        <div className="msg-input-area">
          <input className="msg-input" placeholder="Écrire un message..." value={texte}
            onChange={e => handleChange(e.target.value)} onKeyDown={e => e.key==="Enter"&&envoyer()}/>
          <button className="send-btn" onClick={envoyer}><Icon name="send" size={16}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Tâches ───────────────────────────────────────────────────────────────────
function Taches({ user, taches, token, onRefresh, utilisateurs }) {
  const [modal,   setModal]   = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form,    setForm]    = useState({ titre:"", description:"", assigne_a:"", priorite:"normale", date_echeance:"" });

  useEffect(() => {
    if (utilisateurs.length > 0 && !form.assigne_a) setForm(f => ({ ...f, assigne_a: utilisateurs.find(u=>u.id!==user.id)?.id || utilisateurs[0].id }));
  }, [utilisateurs]);

  const ouvrir = (item=null) => {
    if (item) { setEditItem(item); setForm({ titre:item.titre, description:item.description||"", assigne_a:item.assigne_a, priorite:item.priorite, date_echeance:item.date_echeance||"" }); }
    else { setEditItem(null); setForm({ titre:"", description:"", assigne_a: utilisateurs.find(u=>u.id!==user.id)?.id||"", priorite:"normale", date_echeance:"" }); }
    setModal(true);
  };

  const sauvegarder = async () => {
    if (editItem) await api(`/api/taches/${editItem.id}`, { method:"PUT", body:form }, token);
    else          await api("/api/taches",                { method:"POST",body:form }, token);
    setModal(false); onRefresh();
  };

  const supprimer = async id => {
    await api(`/api/taches/${id}`, { method:"DELETE" }, token);
    setConfirm(null); onRefresh();
  };

  const changeStatut = async (id, statut) => {
    await api(`/api/taches/${id}`, { method:"PUT", body:{ statut } }, token);
    onRefresh();
  };

  const cols = [
    { key:"en_attente", label:"En attente", next:"en_cours",  nextLabel:"→ En cours" },
    { key:"en_cours",   label:"En cours",   next:"termine",   nextLabel:"✓ Terminer"  },
    { key:"termine",    label:"Terminé",    next:null },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">Gestion des tâches</div>
          <div className="text-soft mt-1">{taches.length} tâches au total</div>
        </div>
        <button className="btn-primary" onClick={() => ouvrir()}><Icon name="plus" size={16}/> Nouvelle tâche</button>
      </div>

      <div className="tasks-cols">
        {cols.map(col => {
          const items = taches.filter(t => t.statut === col.key);
          return (
            <div key={col.key} className="task-col">
              <div className="task-col-header">{col.label} <span className="task-col-count">{items.length}</span></div>
              {items.map(t => (
                <div key={t.id} className="task-card">
                  <div className="task-title">{t.titre}</div>
                  {t.description && <div className="task-desc">{t.description}</div>}
                  <div className="task-meta">
                    <span className={`priority-badge priority-${t.priorite}`}>{t.priorite==="haute"?"Haute":t.priorite==="normale"?"Normale":"Basse"}</span>
                    <span style={{ fontSize:12, color:"var(--text-soft)" }}>👤 {t.assigne_a}</span>
                  </div>
                  {t.date_echeance && <div className="text-soft mt-2" style={{ fontSize:11 }}>📅 {t.date_echeance}</div>}
                  <div className="task-actions">
                    {col.next && <button className="btn-secondary" style={{ padding:"5px 10px",fontSize:12 }} onClick={() => changeStatut(t.id, col.next)}>{col.nextLabel}</button>}
                    <button className="btn-icon" onClick={() => ouvrir(t)}><Icon name="edit" size={14}/></button>
                    <button className="btn-icon danger" onClick={() => setConfirm(t.id)}><Icon name="trash" size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editItem ? "Modifier la tâche" : "Nouvelle tâche"}</div>
            <div className="form-group">
              <label className="form-label">Titre</label>
              <input className="form-input" placeholder="Ex : Préparer le rapport..." value={form.titre} onChange={e => setForm(f=>({...f,titre:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optionnel)</label>
              <textarea className="form-textarea" placeholder="Détails de la tâche..." value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}/>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assigner à</label>
                <select className="form-select" value={form.assigne_a} onChange={e => setForm(f=>({...f,assigne_a:e.target.value}))}>
                  {utilisateurs.map(u => <option key={u.id} value={u.id}>{u.nom}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priorité</label>
                <select className="form-select" value={form.priorite} onChange={e => setForm(f=>({...f,priorite:e.target.value}))}>
                  <option value="haute">Haute</option>
                  <option value="normale">Normale</option>
                  <option value="basse">Basse</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Date d'échéance</label>
              <input type="date" className="form-input" value={form.date_echeance} onChange={e => setForm(f=>({...f,date_echeance:e.target.value}))}/>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={sauvegarder} disabled={!form.titre}>{editItem?"Modifier":"Créer"}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <Confirm message="Supprimer cette tâche définitivement ?" onOk={() => supprimer(confirm)} onCancel={() => setConfirm(null)}/>}
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────
function Documents({ user, docs, token, onRefresh }) {
  const [modal,   setModal]   = useState(false);
  const [fichier, setFichier] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [upload,  setUpload]  = useState(false);
  const [drag,    setDrag]    = useState(false);
  const inputRef = useRef();

  const typeColor = t => t==="pdf"?"doc-pdf":t==="xlsx"||t==="xls"?"doc-xlsx":t==="docx"||t==="doc"?"doc-docx":"doc-other";

  const handleFile = f => { if (f) { setFichier(f); setModal(true); } };

  const ajouter = async () => {
    if (!fichier) return;
    setUpload(true);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur);
      setModal(false); setFichier(null); onRefresh();
    } catch(e) { alert("Erreur upload : " + e.message); }
    finally { setUpload(false); }
  };

  const valider  = async id => { await api(`/api/documents/${id}/valider`, { method:"PUT" }, token); onRefresh(); };
  const supprimer = async id => { await api(`/api/documents/${id}`, { method:"DELETE" }, token); setConfirm(null); onRefresh(); };

  const telecharger = id => { window.open(`${API_URL}/api/documents/${id}/download?token=${token}`, "_blank"); };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">Gestion des documents</div>
          <div className="text-soft mt-1">{docs.length} documents partagés</div>
        </div>
        <button className="btn-primary" onClick={() => inputRef.current.click()}><Icon name="upload" size={16}/> Uploader un fichier</button>
      </div>

      <input ref={inputRef} type="file" style={{ display:"none" }} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" onChange={e => handleFile(e.target.files[0])}/>

      {/* Zone drag & drop */}
      <div className={`upload-zone ${drag?"dragover":""}`}
        onDragOver={e=>{e.preventDefault();setDrag(true)}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0])}}
        onClick={() => inputRef.current.click()}>
        <Icon name="upload" size={32}/>
        <div style={{ marginTop:12, fontWeight:500 }}>Glissez un fichier ici ou cliquez pour choisir</div>
        <div style={{ fontSize:12, marginTop:4 }}>PDF, Word, Excel, PowerPoint, Images — 20 MB max</div>
      </div>

      <div className="docs-grid">
        {docs.map(d => (
          <div key={d.id} className="doc-card">
            <div className={`doc-type-icon ${typeColor(d.type)}`}>{d.type?.toUpperCase()}</div>
            <div className="doc-name">{d.nom}</div>
            <div className="doc-info">
              <span>{d.taille}</span><span>·</span>
              <span>{new Date(d.created_at).toLocaleDateString("fr-FR")}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span className={`doc-status ${d.statut==="valide"?"doc-valide":"doc-attente"}`}>
                {d.statut==="valide" ? "✓ Validé" : "⏳ En attente"}
              </span>
              {d.statut==="en_attente" && d.cree_par!==user.id && (
                <button className="btn-secondary" style={{ padding:"4px 10px",fontSize:12 }} onClick={() => valider(d.id)}>Valider</button>
              )}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {d.nom_fichier && <button className="btn-icon" title="Télécharger" onClick={() => telecharger(d.id)}><Icon name="download" size={14}/></button>}
              <button className="btn-icon danger" title="Supprimer" onClick={() => setConfirm(d.id)}><Icon name="trash" size={14}/></button>
            </div>
            <div className="text-soft mt-2" style={{ fontSize:11 }}>Partagé par {d.cree_par}</div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">Uploader un document</div>
            <div style={{ background:"var(--parchment)", borderRadius:10, padding:16, marginBottom:20 }}>
              <div style={{ fontWeight:500, fontSize:14 }}>📎 {fichier?.name}</div>
              <div style={{ fontSize:12, color:"var(--text-soft)", marginTop:4 }}>
                {fichier ? (fichier.size > 1024*1024 ? (fichier.size/1024/1024).toFixed(1)+" MB" : Math.round(fichier.size/1024)+" KB") : ""}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setModal(false); setFichier(null); }}>Annuler</button>
              <button className="btn-primary" onClick={ajouter} disabled={upload}>
                {upload ? <><span className="spinner"/> Envoi...</> : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && <Confirm message="Supprimer ce document définitivement ?" onOk={() => supprimer(confirm)} onCancel={() => setConfirm(null)}/>}
    </div>
  );
}

// ─── Agenda ───────────────────────────────────────────────────────────────────
function Agenda({ user, agenda, token, onRefresh }) {
  const [modal,    setModal]    = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [form,     setForm]     = useState({ titre:"", date:"", heure:"", duree:"1h", lieu:"" });
  const COULEURS = ["#C8A96E","#7B9E87","#8B6B9E","#4A90D9","#E8524A"];

  const ouvrir = (item=null) => {
    if (item) { setEditItem(item); setForm({ titre:item.titre, date:item.date, heure:item.heure, duree:item.duree, lieu:item.lieu||"" }); }
    else      { setEditItem(null); setForm({ titre:"", date:"", heure:"", duree:"1h", lieu:"" }); }
    setModal(true);
  };

  const sauvegarder = async () => {
    if (editItem) await api(`/api/agenda/${editItem.id}`, { method:"PUT",  body:form }, token);
    else          await api("/api/agenda",                { method:"POST", body:{ ...form, couleur:COULEURS[agenda.length%COULEURS.length] } }, token);
    setModal(false); onRefresh();
  };

  const supprimer = async id => { await api(`/api/agenda/${id}`, { method:"DELETE" }, token); setConfirm(null); onRefresh(); };

  const sorted = [...agenda].sort((a,b) => new Date(a.date)-new Date(b.date));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">Agenda partagé</div>
          <div className="text-soft mt-1">{agenda.length} événements planifiés</div>
        </div>
        <button className="btn-primary" onClick={() => ouvrir()}><Icon name="plus" size={16}/> Nouvel événement</button>
      </div>

      <div className="agenda-layout">
        <div>
          {sorted.map(ev => (
            <div key={ev.id} className="agenda-event">
              <div className="agenda-event-bar" style={{ background:ev.couleur }}/>
              <div style={{ flex:1 }}>
                <div className="agenda-event-time">
                  📅 {new Date(ev.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} · {ev.heure} ({ev.duree})
                </div>
                <div className="agenda-event-title">{ev.titre}</div>
                {ev.lieu && <div className="agenda-event-lieu">📍 {ev.lieu}</div>}
                <div className="text-soft mt-1" style={{ fontSize:11 }}>Créé par {ev.cree_par}</div>
                <div style={{ display:"flex", gap:6, marginTop:10 }}>
                  <button className="btn-icon" onClick={() => ouvrir(ev)}><Icon name="edit" size={14}/></button>
                  <button className="btn-icon danger" onClick={() => setConfirm(ev.id)}><Icon name="trash" size={14}/></button>
                </div>
              </div>
            </div>
          ))}
          {agenda.length === 0 && <div className="empty-state">Aucun événement planifié</div>}
        </div>

        {/* Mini calendrier */}
        <div style={{ background:"white", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:24, alignSelf:"start" }}>
          <div style={{ fontFamily:"Cormorant Garamond,serif", fontSize:18, fontWeight:600, marginBottom:16 }}>
            {new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}
          </div>
          {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(j => (
            <span key={j} style={{ display:"inline-block", width:"14.28%", textAlign:"center", fontSize:11, color:"var(--text-soft)", fontWeight:600, marginBottom:8 }}>{j}</span>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {[...Array(35)].map((_,i) => {
              const dayNum = i+1;
              const now = new Date();
              const hasEvent = agenda.some(ev => {
                const d = new Date(ev.date);
                return d.getDate()===dayNum && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
              });
              const isToday = dayNum === now.getDate();
              return (
                <div key={i} style={{ height:36, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, borderRadius:8, position:"relative", background:isToday?"var(--ink)":"transparent", color:isToday?"var(--gold)":dayNum>31?"transparent":"var(--text)", fontWeight:isToday?700:400 }}>
                  {dayNum<=31?dayNum:""}
                  {hasEvent&&dayNum<=31&&<div style={{ position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:"var(--gold)" }}/>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editItem?"Modifier l'événement":"Nouvel événement"}</div>
            {[{label:"Titre",key:"titre",ph:"Ex : Réunion d'équipe"},{label:"Lieu",key:"lieu",ph:"Ex : Bureau, En ligne..."}].map(f=>(
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <input className="form-input" placeholder={f.ph} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>
              </div>
            ))}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <input type="time" className="form-input" value={form.heure} onChange={e=>setForm(p=>({...p,heure:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Durée</label>
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

      {confirm && <Confirm message="Supprimer cet événement ?" onOk={()=>supprimer(confirm)} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ─── Gestion Utilisateurs (Admin) ─────────────────────────────────────────────
function GestionUtilisateurs({ user, utilisateurs, token, onRefresh }) {
  const [modal,    setModal]    = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [form,     setForm]     = useState({ id:"", nom:"", role:"", password:"", couleur:"#4A90D9" });

  const ouvrir = (item=null) => {
    if (item) { setEditItem(item); setForm({ id:item.id, nom:item.nom, role:item.role, password:"", couleur:item.couleur }); }
    else      { setEditItem(null); setForm({ id:"", nom:"", role:"", password:"", couleur:"#4A90D9" }); }
    setModal(true);
  };

  const sauvegarder = async () => {
    try {
      if (editItem) await api(`/api/utilisateurs/${editItem.id}`, { method:"PUT", body:{ nom:form.nom, role:form.role, password:form.password||undefined, couleur:form.couleur } }, token);
      else          await api("/api/utilisateurs",                { method:"POST", body:form }, token);
      setModal(false); onRefresh();
    } catch(e) { alert(e.message); }
  };

  const supprimer = async id => {
    try { await api(`/api/utilisateurs/${id}`, { method:"DELETE" }, token); setConfirm(null); onRefresh(); }
    catch(e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-title">Gestion des utilisateurs</div>
          <div className="text-soft mt-1">{utilisateurs.length} comptes actifs</div>
        </div>
        <button className="btn-primary" onClick={() => ouvrir()}><Icon name="plus" size={16}/> Nouveau compte</button>
      </div>

      <div className="users-grid">
        {utilisateurs.map(u => (
          <div key={u.id} className="user-card">
            {u.is_admin && <div className="admin-badge"><Icon name="shield" size={11}/> Admin</div>}
            <div style={{ position:"relative", width:64, margin:"0 auto 14px" }}>
              <div className="user-card-avatar" style={{ background:u.couleur+"22", color:u.couleur, borderColor:u.couleur+"44" }}>{u.avatar}</div>
              <div className="online-indicator" style={{ background:u.en_ligne?"#4CAF50":"#ccc" }}/>
            </div>
            <div className="user-card-name">{u.nom}</div>
            <div className="user-card-role">{u.role}</div>
            <div className="user-card-actions">
              <button className="btn-icon" onClick={() => ouvrir(u)}><Icon name="edit" size={14}/></button>
              {!u.is_admin && <button className="btn-icon danger" onClick={() => setConfirm(u.id)}><Icon name="trash" size={14}/></button>}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editItem?"Modifier le compte":"Nouveau compte utilisateur"}</div>
            {!editItem && (
              <div className="form-group">
                <label className="form-label">Identifiant de connexion</label>
                <input className="form-input" placeholder="Ex : jean.dupont" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value.toLowerCase().replace(/\s/g,"")}))}/>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input className="form-input" placeholder="Ex : M. Jean Dupont" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Poste / Rôle</label>
              <input className="form-input" placeholder="Ex : Responsable Commercial" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}/>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{editItem?"Nouveau mot de passe (optionnel)":"Mot de passe"}</label>
                <input type="password" className="form-input" placeholder="••••••••" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Couleur</label>
                <input type="color" className="form-input" style={{ height:42, cursor:"pointer" }} value={form.couleur} onChange={e=>setForm(f=>({...f,couleur:e.target.value}))}/>
              </div>
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

      {confirm && <Confirm message="Supprimer ce compte utilisateur ? Cette action est irréversible." onOk={()=>supprimer(confirm)} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ─── Application principale ───────────────────────────────────────────────────
function App() {
  const [token, setToken] = useState(() => localStorage.getItem("corpsync_token"));
  const [user,  setUser]  = useState(() => {
    const t = localStorage.getItem("corpsync_token");
    if (!t) return null;
    try { return JSON.parse(atob(t.split(".")[1])); } catch { return null; }
  });

  const [page,          setPage]          = useState("dashboard");
  const [messages,      setMessages]      = useState([]);
  const [taches,        setTaches]        = useState([]);
  const [docs,          setDocs]          = useState([]);
  const [agenda,        setAgenda]        = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [usersStatus,   setUsersStatus]   = useState([]);
  const [utilisateurs,  setUtilisateurs]  = useState([]);
  const [toast,         setToast]         = useState(null);
  const [loading,       setLoading]       = useState(false);

  const socket = useSocket(token);
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  const charger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [msgs, tch, dcs, agd, notifs, status, users] = await Promise.all([
        api("/api/messages",           {}, token),
        api("/api/taches",             {}, token),
        api("/api/documents",          {}, token),
        api("/api/agenda",             {}, token),
        api("/api/notifications",      {}, token),
        api("/api/utilisateurs/status",{}, token),
        api("/api/utilisateurs",       {}, token),
      ]);
      setMessages(msgs); setTaches(tch); setDocs(dcs); setAgenda(agd);
      setNotifications(notifs); setUsersStatus(status); setUtilisateurs(users);
    } catch(e) { if (e.message.includes("Token")) logout(); }
    finally { setLoading(false); }
  }, [token]);

  // Charger les utilisateurs publics pour le login (sans token)
  const [usersPublics, setUsersPublics] = useState([]);
  useEffect(() => {
    fetch(`${API_URL}/api/utilisateurs`).then(r=>r.json()).then(data => {
      if (Array.isArray(data)) setUsersPublics(data);
    }).catch(()=>{});
  }, []);

  useEffect(() => { if (token) charger(); }, [token]);

  useEffect(() => {
    if (!socket) return;
    socket.on("nouveau_message", msg => {
      setMessages(prev => prev.find(m=>m.id===msg.id)?prev:[...prev,msg]);
      if (msg.de !== user?.id) setToast("💬 Nouveau message");
    });
    socket.on("tache_update",   t  => setTaches(prev => prev.find(x=>x.id===t.id)?prev.map(x=>x.id===t.id?t:x):[...prev,t]));
    socket.on("tache_deleted",  ({id}) => setTaches(prev => prev.filter(t=>t.id!==id)));
    socket.on("doc_update",     d  => setDocs(prev => prev.find(x=>x.id===d.id)?prev.map(x=>x.id===d.id?d:x):[...prev,d]));
    socket.on("doc_deleted",    ({id}) => setDocs(prev => prev.filter(d=>d.id!==id)));
    socket.on("agenda_update",  ev => setAgenda(prev => prev.find(x=>x.id===ev.id)?prev.map(x=>x.id===ev.id?ev:x):[...prev,ev]));
    socket.on("agenda_deleted", ({id}) => setAgenda(prev => prev.filter(e=>e.id!==id)));
    socket.on("utilisateur_ajoute",   u  => setUtilisateurs(prev => [...prev, u]));
    socket.on("utilisateur_modifie",  u  => setUtilisateurs(prev => prev.map(x=>x.id===u.id?u:x)));
    socket.on("utilisateur_supprime", ({id}) => setUtilisateurs(prev => prev.filter(u=>u.id!==id)));
    socket.on("notification", ({ texte }) => {
      setToast(texte);
      setNotifications(prev => [{ id:Date.now(), texte, lu:0, created_at:new Date().toISOString() }, ...prev]);
    });
    socket.on("user_status", ({ id, en_ligne }) => setUsersStatus(prev => prev.map(u=>u.id===id?{...u,en_ligne}:u)));
    return () => {
      ["nouveau_message","tache_update","tache_deleted","doc_update","doc_deleted",
       "agenda_update","agenda_deleted","utilisateur_ajoute","utilisateur_modifie",
       "utilisateur_supprime","notification","user_status"].forEach(e=>socket.off(e));
    };
  }, [socket, user]);

  const login = (tok, userData) => {
    localStorage.setItem("corpsync_token", tok);
    setToken(tok); setUser(userData);
  };

  const logout = async () => {
    try { await api("/api/auth/logout", { method:"POST" }, token); } catch {}
    localStorage.removeItem("corpsync_token");
    setToken(null); setUser(null);
    setMessages([]); setTaches([]); setDocs([]); setAgenda([]);
    setNotifications([]); setUsersStatus([]); setUtilisateurs([]);
    setPage("dashboard");
  };

  const nonLus       = messages.filter(m=>m.a===user?.id&&!m.lu).length;
  const tachesActive = taches.filter(t=>t.assigne_a===user?.id&&t.statut!=="termine").length;
  const notifNonLues = notifications.filter(n=>!n.lu).length;

  const nav = [
    { key:"dashboard",   label:"Tableau de bord",    icon:"dashboard" },
    { key:"messages",    label:"Messages",            icon:"message",  badge:nonLus       },
    { key:"taches",      label:"Tâches",              icon:"task",     badge:tachesActive },
    { key:"documents",   label:"Documents",           icon:"doc"                          },
    { key:"agenda",      label:"Agenda",              icon:"calendar"                     },
    ...(user?.is_admin ? [{ key:"utilisateurs", label:"Utilisateurs", icon:"users" }] : []),
  ];

  const titles = { dashboard:"Tableau de bord", messages:"Messagerie", taches:"Tâches", documents:"Documents", agenda:"Agenda", utilisateurs:"Gestion des utilisateurs" };

  if (!token || !user) return (
    <>
      <style>{styles}</style>
      <LoginScreen onLogin={login} utilisateurs={usersPublics}/>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      {toast && <Toast message={toast} onClose={()=>setToast(null)}/>}
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>CorpSync</h1>
            <p>Plateforme de Direction</p>
          </div>
          <div className="sidebar-user">
            <div className="avatar" style={{ background:user.couleur+"33", color:user.couleur }}>{user.avatar}</div>
            <div className="sidebar-user-info">
              <div className="name">{user.nom}</div>
              <div className="role">{user.role}</div>
              <div className="online-pill"><div className="online-dot"/> En ligne</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {nav.map(n => (
              <div key={n.key} className={`nav-item ${page===n.key?"active":""}`} onClick={()=>setPage(n.key)}>
                <Icon name={n.icon} size={18}/> {n.label}
                {n.badge>0 && <span className="badge">{n.badge}</span>}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={logout}>
              <Icon name="logout" size={18}/> Se déconnecter
            </button>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="topbar-title">{titles[page]}</div>
            <div className="topbar-right">
              <div className="date-chip">{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
              <div className="notif-btn" onClick={()=>setPage("dashboard")}>
                <Icon name="bell" size={18}/>
                {notifNonLues>0 && <div className="notif-dot"/>}
              </div>
            </div>
          </div>
          <div className="content">
            {loading && <div className="loading-page"><div className="spinner"/> Chargement...</div>}
            {!loading && <>
              {page==="dashboard"   && <Dashboard user={user} taches={taches} messages={messages} docs={docs} notifications={notifications} setPage={setPage}/>}
              {page==="messages"    && <Messages user={user} messages={messages} socket={socket} usersStatus={usersStatus} utilisateurs={utilisateurs}/>}
              {page==="taches"      && <Taches user={user} taches={taches} token={token} onRefresh={charger} utilisateurs={utilisateurs}/>}
              {page==="documents"   && <Documents user={user} docs={docs} token={token} onRefresh={charger}/>}
              {page==="agenda"      && <Agenda user={user} agenda={agenda} token={token} onRefresh={charger}/>}
              {page==="utilisateurs"&& user.is_admin && <GestionUtilisateurs user={user} utilisateurs={utilisateurs} token={token} onRefresh={charger}/>}
            </>}
          </div>
        </main>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);

            
