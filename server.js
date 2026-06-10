/**
 * CorpSync — Serveur Backend v3
 * Nouveautés : Cloudinary pour upload, fix WebSocket, CRUD complet
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
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ─── Configuration ────────────────────────────────────────────────────────────
const PORT       = process.env.PORT       || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "corpsync_secret_CHANGEZ_EN_PROD";

// ─── Cloudinary ───────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dlj4xjh5d",
  api_key:    process.env.CLOUDINARY_API_KEY    || "162889619451555",
  api_secret: process.env.CLOUDINARY_API_SECRET || "RdFUtW4p8YgxwfMHvTEbb7pSD5Y",
});

// ─── Multer + Cloudinary Storage ─────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:        "corpsync_documents",
    resource_type: "raw",
    public_id:     Date.now() + "_" + file.originalname.replace(/\s/g, "_"),
    use_filename:  true,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf",".doc",".docx",".xls",".xlsx",".ppt",".pptx",".txt",".png",".jpg",".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error("Type non autorisé"));
  },
});

// ─── App + HTTP + Socket.io ───────────────────────────────────────────────────
const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET","POST"] },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── SQLite ───────────────────────────────────────────────────────────────────
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
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS taches (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    titre         TEXT NOT NULL,
    description   TEXT DEFAULT '',
    assigne_a     TEXT NOT NULL,
    cree_par      TEXT NOT NULL,
    statut        TEXT DEFAULT 'en_attente',
    priorite      TEXT DEFAULT 'normale',
    date_echeance TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS documents (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nom          TEXT NOT NULL,
    url          TEXT,
    public_id    TEXT,
    taille       TEXT DEFAULT '—',
    type         TEXT NOT NULL,
    statut       TEXT DEFAULT 'en_attente',
    cree_par     TEXT NOT NULL,
    created_at   TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS agenda (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    titre      TEXT NOT NULL,
    date       TEXT NOT NULL,
    heure      TEXT NOT NULL,
    duree      TEXT DEFAULT '1h',
    lieu       TEXT DEFAULT '',
    couleur    TEXT DEFAULT '#C8A96E',
    cree_par   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pour       TEXT NOT NULL,
    texte      TEXT NOT NULL,
    lu         INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Seed ─────────────────────────────────────────────────────────────────────
function seed() {
  if (db.prepare("SELECT COUNT(*) as c FROM utilisateurs").get().c > 0) return;
  const h = p => bcrypt.hashSync(p, 10);
  db.prepare("INSERT INTO utilisateurs (id,nom,role,avatar,couleur,password,is_admin) VALUES (?,?,?,?,?,?,?)")
    .run("directeur","M. Directeur","Directeur Général","DG","#C8A96E",h("directeur123"),1);
  db.prepare("INSERT INTO utilisateurs (id,nom,role,avatar,couleur,password,is_admin) VALUES (?,?,?,?,?,?,?)")
    .run("secretaire","Mme Secrétaire","Secrétaire de Direction","SD","#7B9E87",h("secretaire123"),0);
  console.log("✅ Comptes initiaux créés.");
}
seed();

// ─── Middlewares auth ─────────────────────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ erreur: "Token manquant" });
  try { req.user = jwt.verify(h.split(" ")[1], JWT_SECRET); next(); }
  catch { res.status(401).json({ erreur: "Token invalide ou expiré" }); }
}

function adminOnly(req, res, next) {
  const u = db.prepare("SELECT is_admin FROM utilisateurs WHERE id=?").get(req.user.id);
  if (!u?.is_admin) return res.status(403).json({ erreur: "Accès réservé au Directeur" });
  next();
}

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
  const user = db.prepare("SELECT * FROM utilisateurs WHERE id=?").get(id);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ erreur: "Identifiant ou mot de passe incorrect" });
  const token = jwt.sign(
    { id:user.id, nom:user.nom, role:user.role, avatar:user.avatar, couleur:user.couleur, is_admin:user.is_admin },
    JWT_SECRET, { expiresIn: "24h" }
  );
  res.json({ token, user:{ id:user.id, nom:user.nom, role:user.role, avatar:user.avatar, couleur:user.couleur, is_admin:user.is_admin } });
});

app.get("/api/auth/me",      auth, (req, res) => res.json({ user: req.user }));
app.post("/api/auth/logout", auth, (req, res) => {
  db.prepare("UPDATE utilisateurs SET en_ligne=0 WHERE id=?").run(req.user.id);
  res.json({ ok: true });
});

// ── Utilisateurs ──────────────────────────────────────────────────
app.get("/api/utilisateurs", (req, res) => {
  res.json(db.prepare("SELECT id,nom,role,avatar,couleur,is_admin,en_ligne FROM utilisateurs").all());
});

app.post("/api/utilisateurs", auth, adminOnly, (req, res) => {
  const { id, nom, role, password, couleur } = req.body;
  if (!id||!nom||!role||!password) return res.status(400).json({ erreur: "Champs requis" });
  if (db.prepare("SELECT id FROM utilisateurs WHERE id=?").get(id))
    return res.status(409).json({ erreur: "Cet identifiant existe déjà" });
  const avatar = nom.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  db.prepare("INSERT INTO utilisateurs (id,nom,role,avatar,couleur,password) VALUES (?,?,?,?,?,?)")
    .run(id, nom, role, avatar, couleur||"#4A90D9", bcrypt.hashSync(password,10));
  const user = db.prepare("SELECT id,nom,role,avatar,couleur,is_admin FROM utilisateurs WHERE id=?").get(id);
  io.emit("utilisateur_ajoute", user);
  res.json(user);
});

app.put("/api/utilisateurs/:id", auth, adminOnly, (req, res) => {
  const { nom, role, password, couleur } = req.body;
  const u = db.prepare("SELECT * FROM utilisateurs WHERE id=?").get(req.params.id);
  if (!u) return res.status(404).json({ erreur: "Introuvable" });
  const newNom = nom||u.nom, newRole = role||u.role, newCouleur = couleur||u.couleur;
  const newAvatar = newNom.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const newPwd = password ? bcrypt.hashSync(password,10) : u.password;
  db.prepare("UPDATE utilisateurs SET nom=?,role=?,avatar=?,couleur=?,password=? WHERE id=?")
    .run(newNom,newRole,newAvatar,newCouleur,newPwd,req.params.id);
  const updated = db.prepare("SELECT id,nom,role,avatar,couleur,is_admin FROM utilisateurs WHERE id=?").get(req.params.id);
  io.emit("utilisateur_modifie", updated);
  res.json(updated);
});

app.delete("/api/utilisateurs/:id", auth, adminOnly, (req, res) => {
  if (req.params.id==="directeur") return res.status(403).json({ erreur: "Impossible de supprimer le Directeur" });
  db.prepare("DELETE FROM utilisateurs WHERE id=?").run(req.params.id);
  io.emit("utilisateur_supprime", { id: req.params.id });
  res.json({ ok: true });
});

app.get("/api/utilisateurs/status", auth, (req, res) => {
  res.json(db.prepare("SELECT id,nom,couleur,avatar,en_ligne FROM utilisateurs").all());
});

// ── Messages ──────────────────────────────────────────────────────
app.get("/api/messages", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM messages WHERE de=? OR a=? ORDER BY created_at ASC").all(req.user.id,req.user.id));
});
app.put("/api/messages/lire", auth, (req, res) => {
  db.prepare("UPDATE messages SET lu=1 WHERE a=?").run(req.user.id);
  res.json({ ok: true });
});

// ── Tâches ────────────────────────────────────────────────────────
app.get("/api/taches",  auth, (req,res) => res.json(db.prepare("SELECT * FROM taches ORDER BY created_at DESC").all()));

app.post("/api/taches", auth, (req, res) => {
  const { titre, description, assigne_a, priorite, date_echeance } = req.body;
  if (!titre||!assigne_a) return res.status(400).json({ erreur:"Champs requis" });
  const r = db.prepare("INSERT INTO taches (titre,description,assigne_a,cree_par,priorite,date_echeance) VALUES (?,?,?,?,?,?)")
    .run(titre, description||"", assigne_a, req.user.id, priorite||"normale", date_echeance||null);
  const t = db.prepare("SELECT * FROM taches WHERE id=?").get(r.lastInsertRowid);
  notifier(assigne_a, `✅ Nouvelle tâche : "${titre}"`);
  io.emit("tache_update", t);
  res.json(t);
});

app.put("/api/taches/:id", auth, (req, res) => {
  const t = db.prepare("SELECT * FROM taches WHERE id=?").get(req.params.id);
  if (!t) return res.status(404).json({ erreur:"Introuvable" });
  const { titre,description,statut,priorite,assigne_a,date_echeance } = req.body;
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

// ── Documents (Cloudinary) ────────────────────────────────────────
app.get("/api/documents", auth, (req,res) =>
  res.json(db.prepare("SELECT * FROM documents ORDER BY created_at DESC").all())
);

app.post("/api/documents/upload", auth, upload.single("fichier"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erreur:"Aucun fichier reçu" });
    const ext    = path.extname(req.file.originalname).toLowerCase().replace(".","");
    const taille = req.file.size > 1024*1024
      ? (req.file.size/1024/1024).toFixed(1)+" MB"
      : Math.round(req.file.size/1024)+" KB";
    const url       = req.file.path;
    const public_id = req.file.filename;
    const r  = db.prepare("INSERT INTO documents (nom,url,public_id,taille,type,cree_par) VALUES (?,?,?,?,?,?)")
      .run(req.file.originalname, url, public_id, taille, ext, req.user.id);
    const doc = db.prepare("SELECT * FROM documents WHERE id=?").get(r.lastInsertRowid);
    const autre = db.prepare("SELECT id FROM utilisateurs WHERE id!=?").get(req.user.id);
    if (autre) notifier(autre.id, `📎 Nouveau document : "${req.file.originalname}"`);
    io.emit("doc_update", doc);
    res.json(doc);
  } catch(e) {
    console.error("Upload error:", e);
    res.status(500).json({ erreur: e.message });
  }
});

app.put("/api/documents/:id/valider", auth, (req, res) => {
  db.prepare("UPDATE documents SET statut='valide' WHERE id=?").run(req.params.id);
  const doc = db.prepare("SELECT * FROM documents WHERE id=?").get(req.params.id);
  io.emit("doc_update", doc);
  res.json(doc);
});

app.delete("/api/documents/:id", auth, async (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id=?").get(req.params.id);
  if (doc?.public_id) {
    try { await cloudinary.uploader.destroy(doc.public_id, { resource_type:"raw" }); } catch(e) { console.error(e); }
  }
  db.prepare("DELETE FROM documents WHERE id=?").run(req.params.id);
  io.emit("doc_deleted", { id: parseInt(req.params.id) });
  res.json({ ok: true });
});

// ── Agenda ────────────────────────────────────────────────────────
app.get("/api/agenda",  auth, (req,res) => res.json(db.prepare("SELECT * FROM agenda ORDER BY date ASC, heure ASC").all()));

app.post("/api/agenda", auth, (req, res) => {
  const { titre,date,heure,duree,lieu,couleur } = req.body;
  if (!titre||!date||!heure) return res.status(400).json({ erreur:"Champs requis" });
  const r  = db.prepare("INSERT INTO agenda (titre,date,heure,duree,lieu,couleur,cree_par) VALUES (?,?,?,?,?,?,?)")
    .run(titre,date,heure,duree||"1h",lieu||"",couleur||"#C8A96E",req.user.id);
  const ev = db.prepare("SELECT * FROM agenda WHERE id=?").get(r.lastInsertRowid);
  const autre = db.prepare("SELECT id FROM utilisateurs WHERE id!=?").get(req.user.id);
  if (autre) notifier(autre.id, `📅 Nouvel événement : "${titre}" le ${date}`);
  io.emit("agenda_update", ev);
  res.json(ev);
});

app.put("/api/agenda/:id", auth, (req, res) => {
  const ev = db.prepare("SELECT * FROM agenda WHERE id=?").get(req.params.id);
  if (!ev) return res.status(404).json({ erreur:"Introuvable" });
  const { titre,date,heure,duree,lieu,couleur } = req.body;
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
app.get("/api/notifications", auth, (req,res) =>
  res.json(db.prepare("SELECT * FROM notifications WHERE pour=? ORDER BY created_at DESC LIMIT 20").all(req.user.id))
);
app.put("/api/notifications/lire", auth, (req,res) => {
  db.prepare("UPDATE notifications SET lu=1 WHERE pour=?").run(req.user.id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════
// WEBSOCKET
// ════════════════════════════════════════════════════════════════════
io.use((socket, next) => {
  try { socket.user = jwt.verify(socket.handshake.auth.token, JWT_SECRET); next(); }
  catch { next(new Error("Token invalide")); }
});

io.on("connection", (socket) => {
  const uid = socket.user.id;
  socket.join(uid);
  db.prepare("UPDATE utilisateurs SET en_ligne=1 WHERE id=?").run(uid);
  io.emit("user_status", { id:uid, en_ligne:true });
  console.log(`🟢 ${socket.user.nom} connecté`);

  // ── Message : stocké UNE SEULE FOIS ici, pas via /api/messages POST ──────
  socket.on("envoyer_message", ({ a, texte }) => {
    if (!texte?.trim() || !a) return;
    const r   = db.prepare("INSERT INTO messages (de,a,texte) VALUES (?,?,?)").run(uid, a, texte.trim());
    const msg = db.prepare("SELECT * FROM messages WHERE id=?").get(r.lastInsertRowid);
    // Émettre UNIQUEMENT au destinataire (l'expéditeur ajoute lui-même localement)
    io.to(a).emit("nouveau_message", msg);
    // Confirmer à l'expéditeur avec l'ID réel (pour éviter les doublons)
    socket.emit("message_envoye", msg);
    notifier(a, `💬 Nouveau message de ${socket.user.nom}`);
  });

  socket.on("en_train_de_taper", ({ a, actif }) => io.to(a).emit("interlocuteur_tape", { de:uid, actif }));

  socket.on("disconnect", () => {
    db.prepare("UPDATE utilisateurs SET en_ligne=0 WHERE id=?").run(uid);
    io.emit("user_status", { id:uid, en_ligne:false });
    console.log(`🔴 ${socket.user.nom} déconnecté`);
  });
});

// ─── Démarrage ────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 CorpSync v3 → http://localhost:${PORT}`);
  console.log(`☁️  Cloudinary : ${cloudinary.config().cloud_name}`);
  console.log(`\n🔑 directeur/directeur123 | secretaire/secretaire123\n`);
});


