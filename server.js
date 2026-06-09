/**
 * CorpSync — Serveur Backend v2
 * Node.js + Express + SQLite + Socket.io + JWT
 * Nouveautés : gestion utilisateurs, upload fichiers, CRUD complet
 */

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const Database   = require("better-sqlite3");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const cors       = require("cors");
const path       = require("path");
const multer     = require("multer");
const fs         = require("fs");

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
app.use(express.static(path.join(__dirname, "public")));

// Dossier uploads
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// ─── Multer (upload fichiers) ─────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + "_" + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error("Type de fichier non autorisé"));
  },
});

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
    is_admin   INTEGER DEFAULT 0,
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
    description   TEXT,
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
    nom_fichier TEXT,
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

// ─── Seed initial ─────────────────────────────────────────────────────────────
function seed() {
  const n = db.prepare("SELECT COUNT(*) as c FROM utilisateurs").get().c;
  if (n > 0) return;

  const h = pwd => bcrypt.hashSync(pwd, 10);

  db.prepare("INSERT INTO utilisateurs (id,nom,role,avatar,couleur,password,is_admin) VALUES (?,?,?,?,?,?,?)")
    .run("directeur","M. Directeur","Directeur Général","DG","#C8A96E",h("directeur123"),1);
  db.prepare("INSERT INTO utilisateurs (id,nom,role,avatar,couleur,password,is_admin) VALUES (?,?,?,?,?,?,?)")
    .run("secretaire","Mme Secrétaire","Secrétaire de Direction","SD","#7B9E87",h("secretaire123"),0);

  console.log("✅ Comptes initiaux créés.");
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

// Middleware admin uniquement
function adminOnly(req, res, next) {
  const user = db.prepare("SELECT is_admin FROM utilisateurs WHERE id = ?").get(req.user.id);
  if (!user?.is_admin) return res.status(403).json({ erreur: "Accès réservé au Directeur" });
  next();
}

// ─── Utilitaire notification ──────────────────────────────────────────────────
function notifier(pour, texte) {
  db.prepare("INSERT INTO notifications (pour,texte) VALUES (?,?)").run(pour, texte);
  io.to(pour).emit("notification", { texte, heure: new Date().toISOString() });
}

// ════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════

// ── Auth ──────────────────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ erreur: "Champs requis" });

  const user = db.prepare("SELECT * FROM utilisateurs WHERE id = ?").get(id);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ erreur: "Identifiant ou mot de passe incorrect" });

  const token = jwt.sign(
    { id: user.id, nom: user.nom, role: user.role, avatar: user.avatar, couleur: user.couleur, is_admin: user.is_admin },
    JWT_SECRET, { expiresIn: JWT_EXPIRY }
  );
  res.json({ token, user: { id: user.id, nom: user.nom, role: user.role, avatar: user.avatar, couleur: user.couleur, is_admin: user.is_admin } });
});

app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));

app.post("/api/auth/logout", auth, (req, res) => {
  db.prepare("UPDATE utilisateurs SET en_ligne = 0 WHERE id = ?").run(req.user.id);
  res.json({ ok: true });
});

// ── Gestion utilisateurs (admin uniquement) ───────────────────────
app.get("/api/utilisateurs", auth, (req, res) => {
  const users = db.prepare("SELECT id,nom,role,avatar,couleur,is_admin,en_ligne,created_at FROM utilisateurs").all();
  res.json(users);
});

app.post("/api/utilisateurs", auth, adminOnly, (req, res) => {
  const { id, nom, role, password, couleur } = req.body;
  if (!id || !nom || !role || !password) return res.status(400).json({ erreur: "Champs requis" });

  const existe = db.prepare("SELECT id FROM utilisateurs WHERE id = ?").get(id);
  if (existe) return res.status(409).json({ erreur: "Cet identifiant existe déjà" });

  const avatar  = nom.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
  const couleurFinal = couleur || "#4A90D9";
  db.prepare("INSERT INTO utilisateurs (id,nom,role,avatar,couleur,password) VALUES (?,?,?,?,?,?)")
    .run(id, nom, role, avatar, couleurFinal, bcrypt.hashSync(password, 10));

  const user = db.prepare("SELECT id,nom,role,avatar,couleur,is_admin FROM utilisateurs WHERE id = ?").get(id);
  io.emit("utilisateur_ajoute", user);
  res.json(user);
});

app.put("/api/utilisateurs/:id", auth, adminOnly, (req, res) => {
  const { nom, role, password, couleur } = req.body;
  const user = db.prepare("SELECT * FROM utilisateurs WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ erreur: "Utilisateur introuvable" });

  const newNom    = nom    || user.nom;
  const newRole   = role   || user.role;
  const newCouleur = couleur || user.couleur;
  const newAvatar = newNom.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
  const newPwd    = password ? bcrypt.hashSync(password, 10) : user.password;

  db.prepare("UPDATE utilisateurs SET nom=?,role=?,avatar=?,couleur=?,password=? WHERE id=?")
    .run(newNom, newRole, newAvatar, newCouleur, newPwd, req.params.id);

  const updated = db.prepare("SELECT id,nom,role,avatar,couleur,is_admin FROM utilisateurs WHERE id=?").get(req.params.id);
  io.emit("utilisateur_modifie", updated);
  res.json(updated);
});

app.delete("/api/utilisateurs/:id", auth, adminOnly, (req, res) => {
  if (req.params.id === "directeur") return res.status(403).json({ erreur: "Impossible de supprimer le Directeur" });
  db.prepare("DELETE FROM utilisateurs WHERE id = ?").run(req.params.id);
  io.emit("utilisateur_supprime", { id: req.params.id });
  res.json({ ok: true });
});

app.get("/api/utilisateurs/status", auth, (req, res) => {
  res.json(db.prepare("SELECT id,nom,couleur,avatar,en_ligne FROM utilisateurs").all());
});

// ── Messages ──────────────────────────────────────────────────────
app.get("/api/messages", auth, (req, res) => {
  const msgs = db.prepare("SELECT * FROM messages WHERE de=? OR a=? ORDER BY created_at ASC")
    .all(req.user.id, req.user.id);
  res.json(msgs);
});

app.post("/api/messages", auth, (req, res) => {
  const { texte, a } = req.body;
  if (!texte || !a) return res.status(400).json({ erreur: "Champs requis" });
  const r   = db.prepare("INSERT INTO messages (de,a,texte) VALUES (?,?,?)").run(req.user.id, a, texte);
  const msg = db.prepare("SELECT * FROM messages WHERE id=?").get(r.lastInsertRowid);
  notifier(a, `💬 Nouveau message de ${req.user.nom}`);
  res.json(msg);
});

app.put("/api/messages/lire", auth, (req, res) => {
  db.prepare("UPDATE messages SET lu=1 WHERE a=?").run(req.user.id);
  res.json({ ok: true });
});

// ── Tâches ────────────────────────────────────────────────────────
app.get("/api/taches", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM taches ORDER BY created_at DESC").all());
});

app.post("/api/taches", auth, (req, res) => {
  const { titre, description, assigne_a, priorite, date_echeance } = req.body;
  if (!titre || !assigne_a) return res.status(400).json({ erreur: "Champs requis" });
  const r = db.prepare("INSERT INTO taches (titre,description,assigne_a,cree_par,priorite,date_echeance) VALUES (?,?,?,?,?,?)")
    .run(titre, description||"", assigne_a, req.user.id, priorite||"normale", date_echeance||null);
  const t = db.prepare("SELECT * FROM taches WHERE id=?").get(r.lastInsertRowid);
  notifier(assigne_a, `✅ Nouvelle tâche : "${titre}"`);
  io.emit("tache_update", t);
  res.json(t);
});

app.put("/api/taches/:id", auth, (req, res) => {
  const { titre, description, statut, priorite, assigne_a, date_echeance } = req.body;
  const t = db.prepare("SELECT * FROM taches WHERE id=?").get(req.params.id);
  if (!t) return res.status(404).json({ erreur: "Tâche introuvable" });

  db.prepare("UPDATE taches SET titre=?,description=?,statut=?,priorite=?,assigne_a=?,date_echeance=? WHERE id=?")
    .run(titre||t.titre, description??t.description, statut||t.statut, priorite||t.priorite, assigne_a||t.assigne_a, date_echeance??t.date_echeance, req.params.id);
  const updated = db.prepare("SELECT * FROM taches WHERE id=?").get(req.params.id);
  io.emit("tache_update", updated);
  res.json(updated);
});

app.delete("/api/taches/:id", auth, (req, res) => {
  db.prepare("DELETE FROM taches WHERE id=?").run(req.params.id);
  io.emit("tache_deleted", { id: parseInt(req.params.id) });
  res.json({ ok: true });
});

// ── Documents ─────────────────────────────────────────────────────
app.get("/api/documents", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM documents ORDER BY created_at DESC").all());
});

// Upload fichier réel
app.post("/api/documents/upload", auth, upload.single("fichier"), (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: "Aucun fichier reçu" });

  const ext      = path.extname(req.file.originalname).toLowerCase().replace(".", "");
  const tailleKo = Math.round(req.file.size / 1024);
  const taille   = tailleKo > 1024 ? (tailleKo/1024).toFixed(1)+" MB" : tailleKo+" KB";

  const r = db.prepare("INSERT INTO documents (nom,nom_fichier,taille,type,cree_par) VALUES (?,?,?,?,?)")
    .run(req.file.originalname, req.file.filename, taille, ext, req.user.id);
  const doc = db.prepare("SELECT * FROM documents WHERE id=?").get(r.lastInsertRowid);

  const autre = db.prepare("SELECT id FROM utilisateurs WHERE id!=?").get(req.user.id);
  if (autre) notifier(autre.id, `📎 Nouveau document : "${req.file.originalname}"`);
  io.emit("doc_update", doc);
  res.json(doc);
});

// Ajouter document sans fichier (nom manuel)
app.post("/api/documents", auth, (req, res) => {
  const { nom, taille, type } = req.body;
  if (!nom) return res.status(400).json({ erreur: "Nom requis" });
  const ext = (type || nom.split(".").pop() || "doc").toLowerCase();
  const r   = db.prepare("INSERT INTO documents (nom,taille,type,cree_par) VALUES (?,?,?,?)")
    .run(nom, taille||"—", ext, req.user.id);
  const doc = db.prepare("SELECT * FROM documents WHERE id=?").get(r.lastInsertRowid);
  const autre = db.prepare("SELECT id FROM utilisateurs WHERE id!=?").get(req.user.id);
  if (autre) notifier(autre.id, `📎 Nouveau document : "${nom}"`);
  io.emit("doc_update", doc);
  res.json(doc);
});

app.put("/api/documents/:id/valider", auth, (req, res) => {
  db.prepare("UPDATE documents SET statut='valide' WHERE id=?").run(req.params.id);
  const doc = db.prepare("SELECT * FROM documents WHERE id=?").get(req.params.id);
  io.emit("doc_update", doc);
  res.json(doc);
});

app.delete("/api/documents/:id", auth, (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id=?").get(req.params.id);
  if (doc?.nom_fichier) {
    const filePath = path.join(uploadsDir, doc.nom_fichier);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare("DELETE FROM documents WHERE id=?").run(req.params.id);
  io.emit("doc_deleted", { id: parseInt(req.params.id) });
  res.json({ ok: true });
});

// Télécharger un fichier
app.get("/api/documents/:id/download", auth, (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id=?").get(req.params.id);
  if (!doc?.nom_fichier) return res.status(404).json({ erreur: "Fichier introuvable" });
  const filePath = path.join(uploadsDir, doc.nom_fichier);
  if (!fs.existsSync(filePath)) return res.status(404).json({ erreur: "Fichier introuvable" });
  res.download(filePath, doc.nom);
});

// ── Agenda ────────────────────────────────────────────────────────
app.get("/api/agenda", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM agenda ORDER BY date ASC, heure ASC").all());
});

app.post("/api/agenda", auth, (req, res) => {
  const { titre, date, heure, duree, lieu, couleur } = req.body;
  if (!titre || !date || !heure) return res.status(400).json({ erreur: "Champs requis" });
  const r  = db.prepare("INSERT INTO agenda (titre,date,heure,duree,lieu,couleur,cree_par) VALUES (?,?,?,?,?,?,?)")
    .run(titre, date, heure, duree||"1h", lieu||"", couleur||"#C8A96E", req.user.id);
  const ev = db.prepare("SELECT * FROM agenda WHERE id=?").get(r.lastInsertRowid);
  const autre = db.prepare("SELECT id FROM utilisateurs WHERE id!=?").get(req.user.id);
  if (autre) notifier(autre.id, `📅 Nouvel événement : "${titre}" le ${date}`);
  io.emit("agenda_update", ev);
  res.json(ev);
});

app.put("/api/agenda/:id", auth, (req, res) => {
  const { titre, date, heure, duree, lieu, couleur } = req.body;
  const ev = db.prepare("SELECT * FROM agenda WHERE id=?").get(req.params.id);
  if (!ev) return res.status(404).json({ erreur: "Événement introuvable" });
  db.prepare("UPDATE agenda SET titre=?,date=?,heure=?,duree=?,lieu=?,couleur=? WHERE id=?")
    .run(titre||ev.titre, date||ev.date, heure||ev.heure, duree||ev.duree, lieu??ev.lieu, couleur||ev.couleur, req.params.id);
  const updated = db.prepare("SELECT * FROM agenda WHERE id=?").get(req.params.id);
  io.emit("agenda_update", updated);
  res.json(updated);
});

app.delete("/api/agenda/:id", auth, (req, res) => {
  db.prepare("DELETE FROM agenda WHERE id=?").run(req.params.id);
  io.emit("agenda_deleted", { id: parseInt(req.params.id) });
  res.json({ ok: true });
});

// ── Notifications ─────────────────────────────────────────────────
app.get("/api/notifications", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM notifications WHERE pour=? ORDER BY created_at DESC LIMIT 20").all(req.user.id));
});

app.put("/api/notifications/lire", auth, (req, res) => {
  db.prepare("UPDATE notifications SET lu=1 WHERE pour=?").run(req.user.id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════
// WEBSOCKET
// ════════════════════════════════════════════════════════════════════
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Token requis"));
  try { socket.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { next(new Error("Token invalide")); }
});

io.on("connection", (socket) => {
  const uid = socket.user.id;
  socket.join(uid);
  db.prepare("UPDATE utilisateurs SET en_ligne=1 WHERE id=?").run(uid);
  io.emit("user_status", { id: uid, en_ligne: true });
  console.log(`🟢 ${socket.user.nom} connecté`);

  socket.on("envoyer_message", ({ a, texte }) => {
    if (!texte?.trim() || !a) return;
    const r   = db.prepare("INSERT INTO messages (de,a,texte) VALUES (?,?,?)").run(uid, a, texte.trim());
    const msg = db.prepare("SELECT * FROM messages WHERE id=?").get(r.lastInsertRowid);
    io.to(a).emit("nouveau_message", msg);
    socket.emit("nouveau_message", msg);
    notifier(a, `💬 Nouveau message de ${socket.user.nom}`);
  });

  socket.on("en_train_de_taper", ({ a, actif }) => {
    io.to(a).emit("interlocuteur_tape", { de: uid, actif });
  });

  socket.on("disconnect", () => {
    db.prepare("UPDATE utilisateurs SET en_ligne=0 WHERE id=?").run(uid);
    io.emit("user_status", { id: uid, en_ligne: false });
    console.log(`🔴 ${socket.user.nom} déconnecté`);
  });
});

// ─── Démarrage ────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 CorpSync v2 → http://localhost:${PORT}`);
  console.log(`📡 WebSocket actif`);
  console.log(`\n🔑 Comptes :`);
  console.log(`   Directeur  : directeur  / directeur123`);
  console.log(`   Secrétaire : secretaire / secretaire123\n`);
});

