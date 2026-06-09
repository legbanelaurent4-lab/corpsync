/**
 * CorpSync — Serveur Backend
 * Node.js + Express + SQLite + Socket.io + JWT
 * ============================================
 * Démarrage : node server.js
 * Port par défaut : 4000
 */

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const Database   = require("better-sqlite3");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const cors       = require("cors");
const path       = require("path");

// ─── Configuration ────────────────────────────────────────────────────────────
const PORT       = process.env.PORT       || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "corpsync_secret_CHANGEZ_EN_PROD";
const JWT_EXPIRY = "24h";

// ─── App Express + serveur HTTP ───────────────────────────────────────────────
const app        = express();
const httpServer = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
// Servir le frontend buildé (dossier public/)
app.use(express.static(path.join(__dirname, "public")));

// ─── Base de données SQLite ───────────────────────────────────────────────────
const db = new Database(path.join(__dirname, "corpsync.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS utilisateurs (
    id         TEXT PRIMARY KEY,
    nom        TEXT NOT NULL,
    role       TEXT NOT NULL,
    avatar     TEXT NOT NULL,
    couleur    TEXT NOT NULL,
    password   TEXT NOT NULL,
    en_ligne   INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    de         TEXT NOT NULL,
    a          TEXT NOT NULL,
    texte      TEXT NOT NULL,
    lu         INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (de) REFERENCES utilisateurs(id),
    FOREIGN KEY (a)  REFERENCES utilisateurs(id)
  );

  CREATE TABLE IF NOT EXISTS taches (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    titre         TEXT NOT NULL,
    assigne_a     TEXT NOT NULL,
    cree_par      TEXT NOT NULL,
    statut        TEXT DEFAULT 'en_attente',
    priorite      TEXT DEFAULT 'normale',
    date_echeance TEXT,
    created_at    TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (assigne_a) REFERENCES utilisateurs(id),
    FOREIGN KEY (cree_par)  REFERENCES utilisateurs(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nom        TEXT NOT NULL,
    taille     TEXT DEFAULT '—',
    type       TEXT NOT NULL,
    statut     TEXT DEFAULT 'en_attente',
    cree_par   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (cree_par) REFERENCES utilisateurs(id)
  );

  CREATE TABLE IF NOT EXISTS agenda (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    titre      TEXT NOT NULL,
    date       TEXT NOT NULL,
    heure      TEXT NOT NULL,
    duree      TEXT DEFAULT '1h',
    lieu       TEXT,
    couleur    TEXT DEFAULT '#C8A96E',
    cree_par   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (cree_par) REFERENCES utilisateurs(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pour       TEXT NOT NULL,
    texte      TEXT NOT NULL,
    lu         INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (pour) REFERENCES utilisateurs(id)
  );
`);

// ─── Données initiales (seed) ─────────────────────────────────────────────────
function seed() {
  const n = db.prepare("SELECT COUNT(*) as c FROM utilisateurs").get().c;
  if (n > 0) return;

  const h = pwd => bcrypt.hashSync(pwd, 10);

  db.prepare("INSERT INTO utilisateurs (id, nom, role, avatar, couleur, password) VALUES (?,?,?,?,?,?)")
    .run("directeur",  "M. Directeur",    "Directeur Général",        "DG", "#C8A96E", h("directeur123"));
  db.prepare("INSERT INTO utilisateurs (id, nom, role, avatar, couleur, password) VALUES (?,?,?,?,?,?)")
    .run("secretaire", "Mme Secrétaire",  "Secrétaire de Direction",  "SD", "#7B9E87", h("secretaire123"));

  // Messages de démo
  db.prepare("INSERT INTO messages (de,a,texte) VALUES (?,?,?)").run("secretaire","directeur","Bonjour, j'ai préparé le rapport mensuel.");
  db.prepare("INSERT INTO messages (de,a,texte) VALUES (?,?,?)").run("directeur","secretaire","Merci, je vais le consulter.");
  db.prepare("INSERT INTO messages (de,a,texte,lu) VALUES (?,?,?,?)").run("secretaire","directeur","N'oubliez pas la réunion à 14h avec les partenaires.",0);

  // Tâches de démo
  db.prepare("INSERT INTO taches (titre,assigne_a,cree_par,priorite,date_echeance) VALUES (?,?,?,?,?)").run("Valider le rapport Q2","directeur","secretaire","haute","2026-06-10");
  db.prepare("INSERT INTO taches (titre,assigne_a,cree_par,statut) VALUES (?,?,?,?)").run("Préparer ordre du jour réunion","secretaire","directeur","en_cours");
  db.prepare("INSERT INTO taches (titre,assigne_a,cree_par,statut) VALUES (?,?,?,?)").run("Envoyer convocations clients","secretaire","directeur","termine");

  // Documents de démo
  db.prepare("INSERT INTO documents (nom,taille,type,statut,cree_par) VALUES (?,?,?,?,?)").run("Rapport_Mensuel_Mai_2026.pdf","2.4 MB","pdf","en_attente","secretaire");
  db.prepare("INSERT INTO documents (nom,taille,type,statut,cree_par) VALUES (?,?,?,?,?)").run("Budget_Previsionnel_2026.xlsx","1.1 MB","xlsx","valide","secretaire");
  db.prepare("INSERT INTO documents (nom,taille,type,statut,cree_par) VALUES (?,?,?,?,?)").run("Contrat_Partenaire_Alpha.docx","890 KB","docx","valide","directeur");

  // Agenda de démo
  db.prepare("INSERT INTO agenda (titre,date,heure,duree,lieu,couleur,cree_par) VALUES (?,?,?,?,?,?,?)").run("Réunion partenaires","2026-06-08","14:00","2h","Siège social","#C8A96E","secretaire");
  db.prepare("INSERT INTO agenda (titre,date,heure,duree,lieu,couleur,cree_par) VALUES (?,?,?,?,?,?,?)").run("Appel conférence équipes","2026-06-10","10:00","1h","En ligne","#7B9E87","directeur");
  db.prepare("INSERT INTO agenda (titre,date,heure,duree,lieu,couleur,cree_par) VALUES (?,?,?,?,?,?,?)").run("Revue budgétaire","2026-06-12","09:00","3h","Bureau direction","#8B6B9E","secretaire");

  console.log("✅ Données initiales créées.");
}
seed();

// ─── Middleware JWT ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ erreur: "Token manquant" });
  try {
    req.user = jwt.verify(h.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erreur: "Token invalide ou expiré" });
  }
}

// ─── Utilitaire : créer une notification + push WebSocket ────────────────────
function notifier(pour, texte) {
  db.prepare("INSERT INTO notifications (pour, texte) VALUES (?,?)").run(pour, texte);
  io.to(pour).emit("notification", { texte, heure: new Date().toISOString() });
}

// ════════════════════════════════════════════════════════════════════
// ROUTES REST
// ════════════════════════════════════════════════════════════════════

// ── Authentification ──────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ erreur: "Champs requis" });

  const user = db.prepare("SELECT * FROM utilisateurs WHERE id = ?").get(id);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ erreur: "Identifiant ou mot de passe incorrect" });

  const token = jwt.sign(
    { id: user.id, nom: user.nom, role: user.role, avatar: user.avatar, couleur: user.couleur },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
  res.json({ token, user: { id: user.id, nom: user.nom, role: user.role, avatar: user.avatar, couleur: user.couleur } });
});

app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));

app.post("/api/auth/logout", auth, (req, res) => {
  db.prepare("UPDATE utilisateurs SET en_ligne = 0 WHERE id = ?").run(req.user.id);
  res.json({ ok: true });
});

// ── Messages ──────────────────────────────────────────────────────
app.get("/api/messages", auth, (req, res) => {
  const msgs = db.prepare(
    "SELECT * FROM messages WHERE de = ? OR a = ? ORDER BY created_at ASC"
  ).all(req.user.id, req.user.id);
  res.json(msgs);
});

app.post("/api/messages", auth, (req, res) => {
  const { texte, a } = req.body;
  if (!texte || !a) return res.status(400).json({ erreur: "Champs requis" });
  const r   = db.prepare("INSERT INTO messages (de,a,texte) VALUES (?,?,?)").run(req.user.id, a, texte);
  const msg = db.prepare("SELECT * FROM messages WHERE id = ?").get(r.lastInsertRowid);
  notifier(a, `💬 Nouveau message de ${req.user.nom}`);
  res.json(msg);
});

app.put("/api/messages/lire", auth, (req, res) => {
  db.prepare("UPDATE messages SET lu = 1 WHERE a = ?").run(req.user.id);
  res.json({ ok: true });
});

// ── Tâches ────────────────────────────────────────────────────────
app.get("/api/taches", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM taches ORDER BY created_at DESC").all());
});

app.post("/api/taches", auth, (req, res) => {
  const { titre, assigne_a, priorite, date_echeance } = req.body;
  if (!titre || !assigne_a) return res.status(400).json({ erreur: "Champs requis" });
  const r = db.prepare(
    "INSERT INTO taches (titre,assigne_a,cree_par,priorite,date_echeance) VALUES (?,?,?,?,?)"
  ).run(titre, assigne_a, req.user.id, priorite || "normale", date_echeance || null);
  const t = db.prepare("SELECT * FROM taches WHERE id = ?").get(r.lastInsertRowid);
  notifier(assigne_a, `✅ Nouvelle tâche : "${titre}"`);
  io.emit("tache_update", t);
  res.json(t);
});

app.put("/api/taches/:id", auth, (req, res) => {
  const { statut } = req.body;
  db.prepare("UPDATE taches SET statut = ? WHERE id = ?").run(statut, req.params.id);
  const t = db.prepare("SELECT * FROM taches WHERE id = ?").get(req.params.id);
  io.emit("tache_update", t);
  res.json(t);
});

app.delete("/api/taches/:id", auth, (req, res) => {
  db.prepare("DELETE FROM taches WHERE id = ?").run(req.params.id);
  io.emit("tache_deleted", { id: parseInt(req.params.id) });
  res.json({ ok: true });
});

// ── Documents ─────────────────────────────────────────────────────
app.get("/api/documents", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM documents ORDER BY created_at DESC").all());
});

app.post("/api/documents", auth, (req, res) => {
  const { nom, taille, type } = req.body;
  if (!nom) return res.status(400).json({ erreur: "Nom requis" });
  const ext  = (type || nom.split(".").pop() || "doc").toLowerCase();
  const r    = db.prepare("INSERT INTO documents (nom,taille,type,cree_par) VALUES (?,?,?,?)").run(nom, taille||"—", ext, req.user.id);
  const doc  = db.prepare("SELECT * FROM documents WHERE id = ?").get(r.lastInsertRowid);
  const autre = db.prepare("SELECT id FROM utilisateurs WHERE id != ?").get(req.user.id);
  if (autre) notifier(autre.id, `📎 Nouveau document partagé : "${nom}"`);
  io.emit("doc_update", doc);
  res.json(doc);
});

app.put("/api/documents/:id/valider", auth, (req, res) => {
  db.prepare("UPDATE documents SET statut = 'valide' WHERE id = ?").run(req.params.id);
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  io.emit("doc_update", doc);
  res.json(doc);
});

// ── Agenda ────────────────────────────────────────────────────────
app.get("/api/agenda", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM agenda ORDER BY date ASC, heure ASC").all());
});

app.post("/api/agenda", auth, (req, res) => {
  const { titre, date, heure, duree, lieu, couleur } = req.body;
  if (!titre || !date || !heure) return res.status(400).json({ erreur: "Champs requis" });
  const r  = db.prepare(
    "INSERT INTO agenda (titre,date,heure,duree,lieu,couleur,cree_par) VALUES (?,?,?,?,?,?,?)"
  ).run(titre, date, heure, duree||"1h", lieu||"", couleur||"#C8A96E", req.user.id);
  const ev = db.prepare("SELECT * FROM agenda WHERE id = ?").get(r.lastInsertRowid);
  const autre = db.prepare("SELECT id FROM utilisateurs WHERE id != ?").get(req.user.id);
  if (autre) notifier(autre.id, `📅 Nouvel événement : "${titre}" le ${date}`);
  io.emit("agenda_update", ev);
  res.json(ev);
});

app.delete("/api/agenda/:id", auth, (req, res) => {
  db.prepare("DELETE FROM agenda WHERE id = ?").run(req.params.id);
  io.emit("agenda_deleted", { id: parseInt(req.params.id) });
  res.json({ ok: true });
});

// ── Notifications ─────────────────────────────────────────────────
app.get("/api/notifications", auth, (req, res) => {
  res.json(db.prepare(
    "SELECT * FROM notifications WHERE pour = ? ORDER BY created_at DESC LIMIT 20"
  ).all(req.user.id));
});

app.put("/api/notifications/lire", auth, (req, res) => {
  db.prepare("UPDATE notifications SET lu = 1 WHERE pour = ?").run(req.user.id);
  res.json({ ok: true });
});

// ── Statut utilisateurs ───────────────────────────────────────────
app.get("/api/utilisateurs/status", auth, (req, res) => {
  res.json(db.prepare("SELECT id, nom, couleur, avatar, en_ligne FROM utilisateurs").all());
});

// ════════════════════════════════════════════════════════════════════
// WEBSOCKET — Socket.io
// ════════════════════════════════════════════════════════════════════

// Authentification Socket via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Token requis"));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("Token invalide"));
  }
});

io.on("connection", (socket) => {
  const uid = socket.user.id;

  // Rejoindre la salle privée (ex: "directeur" ou "secretaire")
  socket.join(uid);

  // Marquer en ligne
  db.prepare("UPDATE utilisateurs SET en_ligne = 1 WHERE id = ?").run(uid);
  io.emit("user_status", { id: uid, en_ligne: true });

  console.log(`🟢 ${socket.user.nom} connecté (${socket.id})`);

  // ── Envoi de message en temps réel ──────────────────────────────
  socket.on("envoyer_message", ({ a, texte }) => {
    if (!texte?.trim() || !a) return;
    const r   = db.prepare("INSERT INTO messages (de,a,texte) VALUES (?,?,?)").run(uid, a, texte.trim());
    const msg = db.prepare("SELECT * FROM messages WHERE id = ?").get(r.lastInsertRowid);
    // Envoyer aux deux côtés simultanément
    io.to(a).emit("nouveau_message", msg);
    socket.emit("nouveau_message", msg);
    notifier(a, `💬 Nouveau message de ${socket.user.nom}`);
  });

  // ── Indicateur "en train de taper" ──────────────────────────────
  socket.on("en_train_de_taper", ({ a, actif }) => {
    io.to(a).emit("interlocuteur_tape", { de: uid, actif });
  });

  // ── Déconnexion ──────────────────────────────────────────────────
  socket.on("disconnect", () => {
    db.prepare("UPDATE utilisateurs SET en_ligne = 0 WHERE id = ?").run(uid);
    io.emit("user_status", { id: uid, en_ligne: false });
    console.log(`🔴 ${socket.user.nom} déconnecté`);
  });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 CorpSync Backend démarré → http://localhost:${PORT}`);
  console.log(`📡 WebSocket actif (Socket.io)`);
  console.log(`🗄️  Base de données  : corpsync.db\n`);
  console.log(`🔑 Comptes par défaut :`);
  console.log(`   Directeur  : id=directeur  | mdp=directeur123`);
  console.log(`   Secrétaire : id=secretaire | mdp=secretaire123\n`);
});
