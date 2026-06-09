/**
 * CorpSync — Frontend React (connecté au backend)
 * Basé sur plateforme-entreprise.jsx
 * Ajouts : Auth JWT · API REST · WebSockets Socket.io
 * ===================================================
 * Installer : npm install socket.io-client
 * Variable d'env : VITE_API_URL=http://votre-serveur:4000
 */

const { useState, useEffect, useRef, useCallback } = React;
const io = window.io;

// ─── URL du backend ───────────────────────────────────────────────────────────
 const API_URL = "https://corpsync-production.up.railway.app";

// ─── Client HTTP générique ────────────────────────────────────────────────────
async function api(path, options = {}, token = null) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erreur || "Erreur serveur");
  return data;
}

// ─── Icônes SVG (identiques à l'original) ────────────────────────────────────
const Icon = ({ name, size = 20 }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    message:   <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    task:      <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    doc:       <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    calendar:  <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    bell:      <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    send:      <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    check:     <><polyline points="20 6 9 17 4 12"/></>,
    clock:     <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    file:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    user:      <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    upload:    <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>,
    lock:      <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    wifi:      <><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ─── Styles (identiques à l'original + ajouts pour auth/toast/typing) ─────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold: #C8A96E; --gold-light: #E8D5A8; --gold-dark: #9A7A48;
    --green: #7B9E87; --ink: #1A1A2E; --ink-soft: #2D2D4A;
    --parchment: #F7F3EC; --parchment-dark: #EDE8DE; --cream: #FDFAF5;
    --text: #2C2C3E; --text-soft: #6B6B85;
    --border: rgba(200,169,110,0.2);
    --shadow: 0 4px 24px rgba(26,26,46,0.08);
    --shadow-lg: 0 12px 48px rgba(26,26,46,0.14);
    --radius: 12px; --sidebar-w: 260px;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--text); }
  .app { display: flex; height: 100vh; overflow: hidden; }

  /* ── Sidebar ── */
  .sidebar { width: var(--sidebar-w); background: var(--ink); color: white; display: flex; flex-direction: column; flex-shrink: 0; position: relative; overflow: hidden; }
  .sidebar::before { content: ''; position: absolute; top: -80px; right: -80px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(200,169,110,0.15), transparent 70%); pointer-events: none; }
  .sidebar-logo { padding: 28px 24px 20px; border-bottom: 1px solid rgba(200,169,110,0.15); }
  .sidebar-logo h1 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: var(--gold); letter-spacing: 0.5px; }
  .sidebar-logo p { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; letter-spacing: 1.5px; text-transform: uppercase; }
  .sidebar-user { padding: 20px 24px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(200,169,110,0.1); }
  .avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; flex-shrink: 0; border: 2px solid rgba(200,169,110,0.3); }
  .sidebar-user-info .name { font-size: 14px; font-weight: 500; color: white; }
  .sidebar-user-info .role { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 1px; }
  .online-pill { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #4CAF50; margin-top: 3px; }
  .online-dot { width: 6px; height: 6px; background: #4CAF50; border-radius: 50%; }
  .offline-pill { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 3px; }
  .sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 2px; }
  .nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-size: 14px; color: rgba(255,255,255,0.55); }
  .nav-item:hover { background: rgba(200,169,110,0.08); color: rgba(255,255,255,0.85); }
  .nav-item.active { background: rgba(200,169,110,0.15); color: var(--gold); font-weight: 500; }
  .nav-item .badge { margin-left: auto; background: #E8524A; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 20px; min-width: 18px; text-align: center; }
  .sidebar-footer { padding: 16px 12px; border-top: 1px solid rgba(200,169,110,0.1); }
  .logout-btn { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-radius: 10px; cursor: pointer; color: rgba(255,255,255,0.4); font-size: 14px; transition: all 0.2s; width: 100%; background: none; border: none; font-family: 'DM Sans', sans-serif; }
  .logout-btn:hover { color: #E8524A; background: rgba(232,82,74,0.08); }

  /* ── Main ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { background: var(--cream); border-bottom: 1px solid var(--border); padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .topbar-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; color: var(--ink); }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .notif-btn { width: 40px; height: 40px; border-radius: 10px; background: var(--parchment); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; color: var(--text-soft); transition: all 0.2s; }
  .notif-btn:hover { border-color: var(--gold); color: var(--gold); }
  .notif-dot { position: absolute; top: 7px; right: 7px; width: 8px; height: 8px; background: #E8524A; border-radius: 50%; border: 2px solid var(--cream); }
  .date-chip { padding: 6px 14px; background: var(--parchment); border: 1px solid var(--border); border-radius: 20px; font-size: 12px; color: var(--text-soft); font-weight: 500; }
  .content { flex: 1; overflow-y: auto; padding: 32px; }

  /* ── Toast ── */
  .toast { position: fixed; top: 20px; right: 20px; background: var(--ink); color: var(--gold); padding: 14px 20px; border-radius: 12px; font-size: 14px; z-index: 999; box-shadow: var(--shadow-lg); animation: slideLeft 0.3s ease; max-width: 300px; display: flex; gap: 10px; align-items: center; }
  @keyframes slideLeft { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  /* ── Dashboard ── */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; transition: all 0.25s; }
  .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); border-color: var(--gold); }
  .stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .stat-value { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: var(--ink); line-height: 1; margin-bottom: 4px; }
  .stat-label { font-size: 13px; color: var(--text-soft); }
  .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .dash-card { background: white; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .dash-card-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .dash-card-header h3 { font-size: 15px; font-weight: 600; color: var(--ink); }
  .view-all { font-size: 12px; color: var(--gold); cursor: pointer; font-weight: 500; }
  .activity-item { padding: 16px 24px; display: flex; gap: 14px; align-items: flex-start; border-bottom: 1px solid var(--border); }
  .activity-item:last-child { border-bottom: none; }
  .activity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
  .activity-text { font-size: 14px; color: var(--text); }
  .activity-text span { font-weight: 500; }
  .activity-time { font-size: 12px; color: var(--text-soft); margin-top: 3px; }

  /* ── Messages ── */
  .messages-layout { display: grid; grid-template-columns: 280px 1fr; height: calc(100vh - 64px - 64px); background: white; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .msg-sidebar { border-right: 1px solid var(--border); display: flex; flex-direction: column; }
  .msg-sidebar-header { padding: 20px; border-bottom: 1px solid var(--border); }
  .msg-sidebar-header h3 { font-size: 15px; font-weight: 600; }
  .msg-contact { padding: 16px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.15s; }
  .msg-contact:hover, .msg-contact.active { background: var(--parchment); }
  .msg-contact-name { font-size: 14px; font-weight: 500; }
  .msg-contact-preview { font-size: 12px; color: var(--text-soft); margin-top: 2px; }
  .unread-badge { margin-left: auto; background: var(--gold); color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 20px; }
  .msg-main { display: flex; flex-direction: column; }
  .msg-topbar { padding: 16px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
  .msg-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: var(--cream); }
  .msg-bubble { display: flex; gap: 10px; max-width: 75%; }
  .msg-bubble.mine { align-self: flex-end; flex-direction: row-reverse; }
  .bubble-text { padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5; background: white; border: 1px solid var(--border); }
  .msg-bubble.mine .bubble-text { background: var(--ink); color: white; border-color: var(--ink); border-radius: 16px 4px 16px 16px; }
  .msg-bubble:not(.mine) .bubble-text { border-radius: 4px 16px 16px 16px; }
  .bubble-time { font-size: 10px; color: var(--text-soft); margin-top: 4px; }
  .msg-bubble.mine .bubble-time { text-align: right; }
  .typing-wrap { display: flex; gap: 10px; align-items: center; }
  .typing-dots { display: flex; gap: 4px; align-items: center; background: white; border: 1px solid var(--border); padding: 12px 16px; border-radius: 4px 16px 16px 16px; }
  .typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-soft); animation: bounce 1.2s infinite; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  .msg-input-area { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 12px; }
  .msg-input { flex: 1; padding: 12px 16px; border: 1px solid var(--border); border-radius: 24px; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; background: var(--parchment); transition: border-color 0.2s; }
  .msg-input:focus { border-color: var(--gold); }
  .send-btn { width: 44px; height: 44px; border-radius: 50%; background: var(--ink); border: none; color: var(--gold); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
  .send-btn:hover { background: var(--gold-dark); }

  /* ── Tâches ── */
  .tasks-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .tasks-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .task-col { background: var(--parchment); border-radius: var(--radius); padding: 16px; min-height: 400px; }
  .task-col-header { font-size: 13px; font-weight: 600; color: var(--text-soft); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
  .task-col-count { background: rgba(200,169,110,0.2); padding: 2px 8px; border-radius: 20px; font-size: 11px; }
  .task-card { background: white; border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 12px; transition: all 0.2s; }
  .task-card:hover { box-shadow: var(--shadow); transform: translateY(-1px); }
  .task-title { font-size: 14px; font-weight: 500; margin-bottom: 10px; color: var(--ink); }
  .task-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .priority-badge { padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .priority-haute   { background: #FEE2E2; color: #DC2626; }
  .priority-normale { background: #E0F2FE; color: #0284C7; }
  .priority-basse   { background: #F0FDF4; color: #16A34A; }
  .task-assignee { font-size: 12px; color: var(--text-soft); display: flex; align-items: center; gap: 4px; }

  /* ── Documents ── */
  .docs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .doc-card { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: all 0.2s; }
  .doc-card:hover { box-shadow: var(--shadow); border-color: var(--gold-light); }
  .doc-type-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-bottom: 14px; }
  .doc-pdf  { background: #FEE2E2; color: #DC2626; }
  .doc-xlsx { background: #DCFCE7; color: #16A34A; }
  .doc-docx { background: #DBEAFE; color: #2563EB; }
  .doc-name { font-size: 14px; font-weight: 500; color: var(--ink); margin-bottom: 8px; word-break: break-word; }
  .doc-info { font-size: 12px; color: var(--text-soft); display: flex; gap: 8px; margin-bottom: 12px; }
  .doc-status { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 20px; }
  .doc-valide  { background: #DCFCE7; color: #16A34A; }
  .doc-attente { background: #FEF3C7; color: #D97706; }

  /* ── Agenda ── */
  .agenda-layout { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
  .agenda-event { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 12px; display: flex; gap: 16px; transition: all 0.2s; }
  .agenda-event:hover { box-shadow: var(--shadow); }
  .agenda-event-bar { width: 4px; border-radius: 4px; flex-shrink: 0; }
  .agenda-event-time { font-size: 12px; color: var(--text-soft); margin-bottom: 4px; }
  .agenda-event-title { font-size: 15px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .agenda-event-lieu { font-size: 12px; color: var(--text-soft); }

  /* ── Boutons ── */
  .btn-primary { padding: 10px 20px; background: var(--ink); color: var(--gold); border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
  .btn-primary:hover { background: var(--gold-dark); color: white; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { padding: 10px 20px; background: white; color: var(--ink); border: 1px solid var(--border); border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
  .btn-secondary:hover { border-color: var(--gold); color: var(--gold); }

  /* ── Modal ── */
  .modal-overlay { position: fixed; inset: 0; background: rgba(26,26,46,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
  .modal { background: white; border-radius: 16px; padding: 32px; width: 480px; max-width: 95vw; box-shadow: var(--shadow-lg); animation: slideUp 0.25s ease; }
  .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: var(--ink); margin-bottom: 24px; }
  .form-group { margin-bottom: 18px; }
  .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-soft); margin-bottom: 6px; }
  .form-input, .form-select, .form-textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; background: var(--parchment); }
  .form-input:focus, .form-select:focus { border-color: var(--gold); }
  .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  /* ── Login ── */
  .login-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--ink); position: relative; overflow: hidden; }
  .login-bg { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(200,169,110,0.12), transparent 70%); pointer-events: none; }
  .login-card { background: white; border-radius: 20px; padding: 48px; width: 420px; max-width: 95vw; box-shadow: 0 32px 80px rgba(0,0,0,0.3); position: relative; z-index: 1; }
  .login-logo { text-align: center; margin-bottom: 36px; }
  .login-logo h1 { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: var(--ink); }
  .login-logo p { font-size: 12px; color: var(--text-soft); letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
  .login-btn { width: 100%; padding: 14px; background: var(--ink); color: var(--gold); border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px; margin-top: 4px; }
  .login-btn:hover { background: var(--gold-dark); color: white; }
  .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .error-box { background: #FEE2E2; color: #DC2626; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; text-align: center; }
  .demo-box { background: var(--parchment); border-radius: 10px; padding: 14px; font-size: 12px; color: var(--text-soft); margin-top: 20px; }
  .demo-box strong { color: var(--text); }

  /* ── Divers ── */
  .section-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: var(--ink); }
  .text-soft { color: var(--text-soft); font-size: 13px; }
  .mt-1 { margin-top: 4px; } .mt-2 { margin-top: 8px; } .mb-4 { margin-bottom: 16px; }
  .upload-zone { border: 2px dashed var(--border); border-radius: 10px; padding: 32px; text-align: center; color: var(--text-soft); cursor: pointer; transition: all 0.2s; margin-bottom: 20px; }
  .upload-zone:hover { border-color: var(--gold); color: var(--gold); }
  .spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-page { display: flex; align-items: center; justify-content: center; height: 200px; gap: 12px; color: var(--text-soft); font-size: 14px; }
`;

// ─── Hook Socket.io ───────────────────────────────────────────────────────────
function useSocket(token) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const s = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = s;
    s.on("connect",    () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    return () => s.disconnect();
  }, [token]);

  return { socket: socketRef.current, connected };
}

// ─── Composant Toast ──────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="toast">
      <Icon name="bell" size={16} /> {message}
    </div>
  );
}

// ─── Écran de connexion (remplace la sélection de profil) ─────────────────────
function LoginScreen({ onLogin }) {
  const [form, setForm]     = useState({ id: "directeur", password: "" });
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.password) return setErreur("Veuillez entrer votre mot de passe.");
    setLoading(true); setErreur("");
    try {
      const data = await api("/api/auth/login", { method: "POST", body: form });
      onLogin(data.token, data.user);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-bg" style={{ width: 500, height: 500, top: -200, left: -150 }} />
      <div className="login-bg" style={{ width: 400, height: 400, bottom: -150, right: -100 }} />
      <div className="login-card">
        <div className="login-logo">
          <h1>CorpSync</h1>
          <p>Plateforme de Direction</p>
        </div>

        <div className="form-group">
          <label className="form-label">Profil</label>
          <select className="form-select" value={form.id}
            onChange={e => setForm(f => ({ ...f, id: e.target.value }))}>
            <option value="directeur">M. Directeur — Directeur Général</option>
            <option value="secretaire">Mme Secrétaire — Secrétaire de Direction</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="lock" size={13} /> Mot de passe
          </label>
          <input type="password" className="form-input" placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>

        {erreur && <div className="error-box">{erreur}</div>}

        <button className="login-btn" onClick={submit} disabled={loading}>
          {loading ? <><span className="spinner" /> Connexion...</> : "Accéder à la plateforme →"}
        </button>

        <div className="demo-box">
          <strong>Comptes démo :</strong><br />
          Directeur&nbsp; → <code>directeur123</code><br />
          Secrétaire → <code>secretaire123</code>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ user, taches, messages, docs, notifications, setPage }) {
  const nonLus      = messages.filter(m => m.a === user.id && !m.lu).length;
  const mesTaches   = taches.filter(t => t.assigne_a === user.id && t.statut !== "termine");
  const docsAttente = docs.filter(d => d.statut === "en_attente").length;
  const notifNonLues = notifications.filter(n => !n.lu).length;

  return (
    <div>
      <div className="stats-grid">
        {[
          { label: "Messages non lus",    value: nonLus,          icon: "message",  color: "#C8A96E", bg: "rgba(200,169,110,0.1)" },
          { label: "Mes tâches actives",  value: mesTaches.length, icon: "task",    color: "#7B9E87", bg: "rgba(123,158,135,0.1)" },
          { label: "Documents en attente",value: docsAttente,      icon: "doc",     color: "#8B6B9E", bg: "rgba(139,107,158,0.1)" },
          { label: "Notifications",       value: notifNonLues,     icon: "bell",    color: "#4A90D9", bg: "rgba(74,144,217,0.1)"  },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <Icon name={s.icon} size={22} />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Notifications récentes</h3>
            <span className="view-all">Tout voir</span>
          </div>
          {notifications.slice(0, 5).map((n, i) => (
            <div key={i} className="activity-item">
              <div className="activity-dot" style={{ background: n.lu ? "var(--border)" : "var(--gold)" }} />
              <div>
                <div className="activity-text">{n.texte}</div>
                <div className="activity-time">
                  {new Date(n.created_at).toLocaleString("fr-FR")}
                </div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div style={{ padding: 24, color: "var(--text-soft)", fontSize: 14 }}>Aucune notification</div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Mes tâches en cours</h3>
            <span className="view-all" onClick={() => setPage("taches")}>Voir tout</span>
          </div>
          {mesTaches.slice(0, 4).map(t => (
            <div key={t.id} className="activity-item">
              <div className="activity-dot"
                style={{ background: t.priorite === "haute" ? "#DC2626" : "#0284C7" }} />
              <div>
                <div className="activity-text"><span>{t.titre}</span></div>
                <div className="activity-time">
                  {t.date_echeance ? `Échéance : ${t.date_echeance}` : "Sans échéance"} · {t.statut}
                </div>
              </div>
            </div>
          ))}
          {mesTaches.length === 0 && (
            <div style={{ padding: 24, color: "var(--text-soft)", fontSize: 14 }}>Aucune tâche active</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Messagerie ───────────────────────────────────────────────────────────────
function Messages({ user, messages, socket, usersStatus }) {
  const [texte, setTexte]           = useState("");
  const [autreEnTrain, setAutreEnTrain] = useState(false);
  const bottomRef  = useRef();
  const typingTimer = useRef();

  // Profil de l'interlocuteur
  const autreId   = user.id === "directeur" ? "secretaire" : "directeur";
  const autreInfo = {
    directeur:  { nom: "M. Directeur",   avatar: "DG", couleur: "#C8A96E" },
    secretaire: { nom: "Mme Secrétaire", avatar: "SD", couleur: "#7B9E87" },
  }[autreId];
  const autreEnLigne = usersStatus.find(u => u.id === autreId)?.en_ligne;

  // Défilement automatique
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Écoute "interlocuteur tape"
  useEffect(() => {
    if (!socket) return;
    const handler = ({ de, actif }) => { if (de !== user.id) setAutreEnTrain(actif); };
    socket.on("interlocuteur_tape", handler);
    return () => socket.off("interlocuteur_tape", handler);
  }, [socket, user.id]);

  const handleChange = (val) => {
    setTexte(val);
    if (!socket) return;
    socket.emit("en_train_de_taper", { a: autreId, actif: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("en_train_de_taper", { a: autreId, actif: false });
    }, 1500);
  };

  const envoyer = () => {
    if (!texte.trim() || !socket) return;
    socket.emit("envoyer_message", { a: autreId, texte: texte.trim() });
    socket.emit("en_train_de_taper", { a: autreId, actif: false });
    setTexte("");
  };

  // Filtrer la conversation
  const conv = messages.filter(m =>
    (m.de === user.id && m.a === autreId) ||
    (m.de === autreId && m.a === user.id)
  );
  const nonLus = conv.filter(m => m.a === user.id && !m.lu).length;

  return (
    <div className="messages-layout">
      {/* Sidebar contacts */}
      <div className="msg-sidebar">
        <div className="msg-sidebar-header"><h3>Conversations</h3></div>
        <div className="msg-contact active">
          <div className="avatar"
            style={{ background: autreInfo.couleur + "22", color: autreInfo.couleur, width: 36, height: 36 }}>
            {autreInfo.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <div className="msg-contact-name">{autreInfo.nom}</div>
            <div className={autreEnLigne ? "online-pill" : "offline-pill"}>
              <div className="online-dot" style={{ background: autreEnLigne ? "#4CAF50" : "#999" }} />
              {autreEnLigne ? "En ligne" : "Hors ligne"}
            </div>
          </div>
          {nonLus > 0 && <span className="unread-badge">{nonLus}</span>}
        </div>
      </div>

      {/* Zone de conversation */}
      <div className="msg-main">
        <div className="msg-topbar">
          <div className="avatar"
            style={{ background: autreInfo.couleur + "22", color: autreInfo.couleur, width: 36, height: 36 }}>
            {autreInfo.avatar}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{autreInfo.nom}</div>
            <div className={autreEnLigne ? "online-pill" : "offline-pill"} style={{ marginTop: 2 }}>
              <div className="online-dot" style={{ background: autreEnLigne ? "#4CAF50" : "#999" }} />
              {autreEnLigne ? "En ligne" : "Hors ligne"}
            </div>
          </div>
        </div>

        <div className="msg-body">
          {conv.map(m => (
            <div key={m.id} className={`msg-bubble ${m.de === user.id ? "mine" : ""}`}>
              {m.de !== user.id && (
                <div className="avatar"
                  style={{ background: autreInfo.couleur + "22", color: autreInfo.couleur, width: 30, height: 30, fontSize: 11 }}>
                  {autreInfo.avatar}
                </div>
              )}
              <div>
                <div className="bubble-text">{m.texte}</div>
                <div className="bubble-time">
                  {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}

          {/* Indicateur "en train de taper" */}
          {autreEnTrain && (
            <div className="typing-wrap">
              <div className="avatar"
                style={{ background: autreInfo.couleur + "22", color: autreInfo.couleur, width: 30, height: 30, fontSize: 11 }}>
                {autreInfo.avatar}
              </div>
              <div className="typing-dots">
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="msg-input-area">
          <input className="msg-input" placeholder="Écrire un message..."
            value={texte}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && envoyer()} />
          <button className="send-btn" onClick={envoyer}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tâches ───────────────────────────────────────────────────────────────────
function Taches({ user, taches, token, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ titre: "", assigne_a: "secretaire", priorite: "normale", date_echeance: "" });

  const cols = [
    { key: "en_attente", label: "En attente" },
    { key: "en_cours",   label: "En cours"   },
    { key: "termine",    label: "Terminé"    },
  ];

  const creer = async () => {
    await api("/api/taches", { method: "POST", body: form }, token);
    setModal(false);
    setForm({ titre: "", assigne_a: "secretaire", priorite: "normale", date_echeance: "" });
    onRefresh();
  };

  const changeStatut = async (id, statut) => {
    await api(`/api/taches/${id}`, { method: "PUT", body: { statut } }, token);
    onRefresh();
  };

  return (
    <div>
      <div className="tasks-header">
        <div>
          <div className="section-title">Gestion des tâches</div>
          <div className="text-soft mt-1">{taches.length} tâches au total</div>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Icon name="plus" size={16} /> Nouvelle tâche
        </button>
      </div>

      <div className="tasks-cols">
        {cols.map(col => {
          const items = taches.filter(t => t.statut === col.key);
          return (
            <div key={col.key} className="task-col">
              <div className="task-col-header">
                {col.label} <span className="task-col-count">{items.length}</span>
              </div>
              {items.map(t => (
                <div key={t.id} className="task-card">
                  <div className="task-title">{t.titre}</div>
                  <div className="task-meta">
                    <span className={`priority-badge priority-${t.priorite}`}>
                      {t.priorite === "haute" ? "Haute" : t.priorite === "normale" ? "Normale" : "Basse"}
                    </span>
                    <span className="task-assignee">
                      <Icon name="user" size={12} /> {t.assigne_a}
                    </span>
                  </div>
                  {t.date_echeance && <div className="text-soft mt-2" style={{ fontSize: 11 }}>📅 {t.date_echeance}</div>}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {col.key === "en_attente" && (
                      <button className="btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={() => changeStatut(t.id, "en_cours")}>→ En cours</button>
                    )}
                    {col.key === "en_cours" && (
                      <button className="btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={() => changeStatut(t.id, "termine")}>✓ Terminer</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">Nouvelle tâche</div>
            <div className="form-group">
              <label className="form-label">Titre de la tâche</label>
              <input className="form-input" placeholder="Ex : Préparer le rapport..."
                value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Assigner à</label>
              <select className="form-select" value={form.assigne_a}
                onChange={e => setForm(f => ({ ...f, assigne_a: e.target.value }))}>
                <option value="directeur">M. Directeur</option>
                <option value="secretaire">Mme Secrétaire</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priorité</label>
              <select className="form-select" value={form.priorite}
                onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))}>
                <option value="haute">Haute</option>
                <option value="normale">Normale</option>
                <option value="basse">Basse</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date d'échéance</label>
              <input type="date" className="form-input" value={form.date_echeance}
                onChange={e => setForm(f => ({ ...f, date_echeance: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={creer} disabled={!form.titre}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────
function Documents({ user, docs, token, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ nom: "" });

  const ajouter = async () => {
    const ext = form.nom.split(".").pop()?.toLowerCase() || "doc";
    await api("/api/documents", { method: "POST", body: { nom: form.nom, type: ext } }, token);
    setModal(false); setForm({ nom: "" }); onRefresh();
  };

  const valider = async (id) => {
    await api(`/api/documents/${id}/valider`, { method: "PUT" }, token);
    onRefresh();
  };

  const typeColor = t => t === "pdf" ? "doc-pdf" : t === "xlsx" ? "doc-xlsx" : "doc-docx";

  return (
    <div>
      <div className="tasks-header">
        <div>
          <div className="section-title">Gestion des documents</div>
          <div className="text-soft mt-1">{docs.length} documents partagés</div>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Icon name="plus" size={16} /> Ajouter un document
        </button>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className={`doc-status ${d.statut === "valide" ? "doc-valide" : "doc-attente"}`}>
                {d.statut === "valide" ? "✓ Validé" : "⏳ En attente"}
              </span>
              {d.statut === "en_attente" && d.cree_par !== user.id && (
                <button className="btn-secondary" style={{ padding: "5px 12px", fontSize: 12 }}
                  onClick={() => valider(d.id)}>Valider</button>
              )}
            </div>
            <div className="text-soft mt-2" style={{ fontSize: 11 }}>Partagé par {d.cree_par}</div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">Ajouter un document</div>
            <div className="upload-zone">
              <Icon name="upload" size={32} />
              <div style={{ marginTop: 12, fontWeight: 500 }}>Glissez un fichier ici</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>PDF, DOCX, XLSX acceptés</div>
            </div>
            <div className="form-group">
              <label className="form-label">Nom du document</label>
              <input className="form-input" placeholder="Ex : Rapport_Juin_2026.pdf"
                value={form.nom} onChange={e => setForm({ nom: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={ajouter} disabled={!form.nom}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agenda ───────────────────────────────────────────────────────────────────
function Agenda({ user, agenda, token, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ titre: "", date: "", heure: "", duree: "1h", lieu: "" });
  const COULEURS = ["#C8A96E", "#7B9E87", "#8B6B9E", "#4A90D9", "#E8524A"];

  const creer = async () => {
    await api("/api/agenda", {
      method: "POST",
      body: { ...form, couleur: COULEURS[agenda.length % COULEURS.length] },
    }, token);
    setModal(false);
    setForm({ titre: "", date: "", heure: "", duree: "1h", lieu: "" });
    onRefresh();
  };

  const sorted = [...agenda].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <div className="tasks-header">
        <div>
          <div className="section-title">Agenda partagé</div>
          <div className="text-soft mt-1">{agenda.length} événements planifiés</div>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Icon name="plus" size={16} /> Nouvel événement
        </button>
      </div>

      <div className="agenda-layout">
        {/* Liste des événements */}
        <div>
          {sorted.map(ev => (
            <div key={ev.id} className="agenda-event">
              <div className="agenda-event-bar" style={{ background: ev.couleur }} />
              <div style={{ flex: 1 }}>
                <div className="agenda-event-time">
                  📅 {new Date(ev.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  &nbsp;·&nbsp;{ev.heure} ({ev.duree})
                </div>
                <div className="agenda-event-title">{ev.titre}</div>
                <div className="agenda-event-lieu">📍 {ev.lieu}</div>
                <div className="text-soft mt-1" style={{ fontSize: 11 }}>Créé par {ev.cree_par}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Mini calendrier */}
        <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Juin 2026</div>
          {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(j => (
            <span key={j} style={{ display: "inline-block", width: "14.28%", textAlign: "center", fontSize: 11, color: "var(--text-soft)", fontWeight: 600, marginBottom: 8 }}>{j}</span>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {[...Array(35)].map((_, i) => {
              const dayNum = i + 1;
              const hasEvent = agenda.some(ev => new Date(ev.date).getDate() === dayNum && new Date(ev.date).getMonth() === 5);
              const isToday  = dayNum === 9;
              return (
                <div key={i} style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, borderRadius: 8, position: "relative", background: isToday ? "var(--ink)" : "transparent", color: isToday ? "var(--gold)" : dayNum > 30 ? "transparent" : "var(--text)", fontWeight: isToday ? 700 : 400 }}>
                  {dayNum <= 30 ? dayNum : ""}
                  {hasEvent && dayNum <= 30 && (
                    <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "var(--gold)" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">Nouvel événement</div>
            {[
              { label: "Titre", key: "titre", ph: "Ex : Réunion d'équipe" },
              { label: "Lieu",  key: "lieu",  ph: "Ex : Bureau, En ligne..." },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <input className="form-input" placeholder={f.ph}
                  value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <input type="time" className="form-input" value={form.heure}
                  onChange={e => setForm(p => ({ ...p, heure: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Durée</label>
              <select className="form-select" value={form.duree}
                onChange={e => setForm(p => ({ ...p, duree: e.target.value }))}>
                {["30min","1h","1h30","2h","3h","Journée"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={creer} disabled={!form.titre || !form.date}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Application principale ───────────────────────────────────────────────────
function App() {
  // ── État auth (persisté dans localStorage) ──────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem("corpsync_token"));
  const [user,  setUser]  = useState(() => {
    const t = localStorage.getItem("corpsync_token");
    if (!t) return null;
    try { return JSON.parse(atob(t.split(".")[1])); } catch { return null; }
  });

  // ── État UI ──────────────────────────────────────────────────────────────────
  const [page,          setPage]          = useState("dashboard");
  const [messages,      setMessages]      = useState([]);
  const [taches,        setTaches]        = useState([]);
  const [docs,          setDocs]          = useState([]);
  const [agenda,        setAgenda]        = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [usersStatus,   setUsersStatus]   = useState([]);
  const [toast,         setToast]         = useState(null);
  const [loading,       setLoading]       = useState(false);

  // ── Socket.io ────────────────────────────────────────────────────────────────
  const { socket } = useSocket(token);

  // ── Chargement initial des données ───────────────────────────────────────────
  const charger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [msgs, tch, dcs, agd, notifs, status] = await Promise.all([
        api("/api/messages",          {}, token),
        api("/api/taches",            {}, token),
        api("/api/documents",         {}, token),
        api("/api/agenda",            {}, token),
        api("/api/notifications",     {}, token),
        api("/api/utilisateurs/status", {}, token),
      ]);
      setMessages(msgs); setTaches(tch); setDocs(dcs);
      setAgenda(agd); setNotifications(notifs); setUsersStatus(status);
    } catch (e) {
      // Token expiré → déconnexion automatique
      if (e.message.includes("Token")) { logout(); }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) charger(); }, [token]);

  // ── Événements WebSocket ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Nouveau message reçu en temps réel
    socket.on("nouveau_message", (msg) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      if (msg.de !== user?.id) setToast("💬 Nouveau message");
    });

    // Mise à jour tâche
    socket.on("tache_update", (t) => {
      setTaches(prev => prev.find(x => x.id === t.id) ? prev.map(x => x.id === t.id ? t : x) : [...prev, t]);
    });
    socket.on("tache_deleted", ({ id }) => setTaches(prev => prev.filter(t => t.id !== id)));

    // Mise à jour document
    socket.on("doc_update", (d) => {
      setDocs(prev => prev.find(x => x.id === d.id) ? prev.map(x => x.id === d.id ? d : x) : [...prev, d]);
    });

    // Mise à jour agenda
    socket.on("agenda_update", (ev) => {
      setAgenda(prev => prev.find(x => x.id === ev.id) ? prev.map(x => x.id === ev.id ? ev : x) : [...prev, ev]);
    });
    socket.on("agenda_deleted", ({ id }) => setAgenda(prev => prev.filter(e => e.id !== id)));

    // Notification push
    socket.on("notification", ({ texte }) => {
      setToast(texte);
      setNotifications(prev => [{ id: Date.now(), texte, lu: 0, created_at: new Date().toISOString() }, ...prev]);
    });

    // Statut en ligne/hors ligne
    socket.on("user_status", ({ id, en_ligne }) => {
      setUsersStatus(prev => prev.map(u => u.id === id ? { ...u, en_ligne } : u));
    });

    return () => {
      ["nouveau_message","tache_update","tache_deleted","doc_update",
       "agenda_update","agenda_deleted","notification","user_status"]
        .forEach(ev => socket.off(ev));
    };
  }, [socket, user]);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const login = (tok, userData) => {
    localStorage.setItem("corpsync_token", tok);
    setToken(tok); setUser(userData);
  };

  const logout = async () => {
    try { await api("/api/auth/logout", { method: "POST" }, token); } catch {}
    localStorage.removeItem("corpsync_token");
    setToken(null); setUser(null);
    setMessages([]); setTaches([]); setDocs([]); setAgenda([]);
    setNotifications([]); setUsersStatus([]);
    setPage("dashboard");
  };

  // ── Badges nav ───────────────────────────────────────────────────────────────
  const nonLus      = messages.filter(m => m.a === user?.id && !m.lu).length;
  const tachesActives = taches.filter(t => t.assigne_a === user?.id && t.statut !== "termine").length;
  const notifNonLues  = notifications.filter(n => !n.lu).length;

  const nav = [
    { key: "dashboard", label: "Tableau de bord", icon: "dashboard" },
    { key: "messages",  label: "Messages",        icon: "message",  badge: nonLus       },
    { key: "taches",    label: "Tâches",          icon: "task",     badge: tachesActives },
    { key: "documents", label: "Documents",       icon: "doc"                            },
    { key: "agenda",    label: "Agenda",          icon: "calendar"                       },
  ];

  const titles = { dashboard: "Tableau de bord", messages: "Messagerie", taches: "Tâches", documents: "Documents", agenda: "Agenda" };

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (!token || !user) return (
    <><style>{styles}</style><LoginScreen onLogin={login} /></>
  );

  return (
    <>
      <style>{styles}</style>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="app">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>CorpSync</h1>
            <p>Plateforme de Direction</p>
          </div>
          <div className="sidebar-user">
            <div className="avatar" style={{ background: user.couleur + "33", color: user.couleur }}>
              {user.avatar}
            </div>
            <div className="sidebar-user-info">
              <div className="name">{user.nom}</div>
              <div className="role">{user.role}</div>
              <div className="online-pill"><div className="online-dot" /> En ligne</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {nav.map(n => (
              <div key={n.key} className={`nav-item ${page === n.key ? "active" : ""}`}
                onClick={() => setPage(n.key)}>
                <Icon name={n.icon} size={18} />
                {n.label}
                {n.badge > 0 && <span className="badge">{n.badge}</span>}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={logout}>
              <Icon name="logout" size={18} /> Se déconnecter
            </button>
          </div>
        </aside>

        {/* ── Contenu principal ── */}
        <main className="main">
          <div className="topbar">
            <div className="topbar-title">{titles[page]}</div>
            <div className="topbar-right">
              <div className="date-chip">
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="notif-btn" onClick={() => setPage("dashboard")}>
                <Icon name="bell" size={18} />
                {notifNonLues > 0 && <div className="notif-dot" />}
              </div>
            </div>
          </div>

          <div className="content">
            {loading && <div className="loading-page"><div className="spinner" /> Chargement...</div>}
            {!loading && <>
              {page === "dashboard" && <Dashboard user={user} taches={taches} messages={messages} docs={docs} notifications={notifications} setPage={setPage} />}
              {page === "messages"  && <Messages  user={user} messages={messages} socket={socket} usersStatus={usersStatus} />}
              {page === "taches"    && <Taches    user={user} taches={taches} token={token} onRefresh={charger} />}
              {page === "documents" && <Documents user={user} docs={docs} token={token} onRefresh={charger} />}
              {page === "agenda"    && <Agenda    user={user} agenda={agenda} token={token} onRefresh={charger} />}
            </>}
          </div>
        </main>
      </div>
    </>
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
            
