const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DB_PATH = path.join(__dirname, "task_manager.json");

const EMPTY_DB = {
  counters: { user: 1, folder: 1, note: 1 },
  users: [],
  folders: [],
  notes: [],
};

function nowIso() {
  return new Date().toISOString();
}

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      writeDb(EMPTY_DB);
      return structuredClone(EMPTY_DB);
    }
    const raw = fs.readFileSync(DB_PATH, "utf8");
    if (!raw.trim()) {
      writeDb(EMPTY_DB);
      return structuredClone(EMPTY_DB);
    }
    const data = JSON.parse(raw);
    data.counters ||= { user: 1, folder: 1, note: 1 };
    data.users ||= [];
    data.folders ||= [];
    data.notes ||= [];
    return data;
  } catch {
    writeDb(EMPTY_DB);
    return structuredClone(EMPTY_DB);
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

function nextId(data, key) {
  const id = data.counters[key] || 1;
  data.counters[key] = id + 1;
  return id;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const digest = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256");
  return `${salt.toString("hex")}:${digest.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [saltHex, digestHex] = String(storedHash || "").split(":");
    if (!saltHex || !digestHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const digest = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(digestHex, "hex"));
  } catch {
    return false;
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function register({ username, email, password }) {
  const cleanUsername = String(username || "").trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || "");

  if (!cleanUsername || !cleanEmail || !cleanPassword) {
    return { ok: false, message: "Заполните все поля" };
  }

  const db = readDb();
  const exists = db.users.some((u) => u.email === cleanEmail);
  if (exists) return { ok: false, message: "Пользователь с таким email уже существует" };

  const userId = nextId(db, "user");
  db.users.push({
    id: userId,
    username: cleanUsername,
    email: cleanEmail,
    password_hash: hashPassword(cleanPassword),
    created_at: nowIso(),
  });

  db.folders.push({
    id: nextId(db, "folder"),
    user_id: userId,
    name: "My Notes",
    parent_id: null,
    created_at: nowIso(),
  });

  writeDb(db);
  return { ok: true };
}

function login({ email, password }) {
  const db = readDb();
  const user = db.users.find((u) => u.email === normalizeEmail(email));
  if (!user || !verifyPassword(String(password || ""), user.password_hash)) {
    return { ok: false, message: "Неверный email или пароль" };
  }

  return {
    ok: true,
    user: { id: user.id, username: user.username, email: user.email },
  };
}

function getUser(userId) {
  const db = readDb();
  const user = db.users.find((u) => u.id === Number(userId));
  if (!user) return null;
  return { id: user.id, username: user.username, email: user.email };
}

function listFolders(userId) {
  const db = readDb();
  return db.folders
    .filter((f) => f.user_id === Number(userId))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"));
}

function createFolder({ userId, name, parentId }) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return { ok: false, message: "Введите название папки" };

  const db = readDb();
  db.folders.push({
    id: nextId(db, "folder"),
    user_id: Number(userId),
    name: cleanName,
    parent_id: parentId ?? null,
    created_at: nowIso(),
  });
  writeDb(db);
  return { ok: true };
}

function listNotes({ userId, folderId, search }) {
  const db = readDb();
  const cleanSearch = String(search || "").trim().toLowerCase();

  return db.notes
    .filter((n) => n.user_id === Number(userId))
    .filter((n) => n.is_deleted !== 1)
    .filter((n) => (folderId == null ? true : n.folder_id === Number(folderId)))
    .filter((n) => {
      if (!cleanSearch) return true;
      const hay = `${n.title || ""}\n${n.content || ""}\n${(n.tags || []).join(",")}`.toLowerCase();
      return hay.includes(cleanSearch);
    })
    .sort((a, b) => {
      if (b.is_pinned !== a.is_pinned) return b.is_pinned - a.is_pinned;
      return String(b.updated_at).localeCompare(String(a.updated_at));
    });
}

function createNote({ userId, folderId }) {
  const db = readDb();
  const id = nextId(db, "note");
  const createdAt = nowIso();
  db.notes.push({
    id,
    user_id: Number(userId),
    folder_id: folderId == null ? null : Number(folderId),
    title: "",
    content: "",
    image_path: "",
    deadline: null,
    is_pinned: 0,
    is_deleted: 0,
    tags: [],
    created_at: createdAt,
    updated_at: createdAt,
  });
  writeDb(db);
  return { id };
}

function getNote({ userId, noteId }) {
  const db = readDb();
  const note = db.notes.find((n) => n.id === Number(noteId) && n.user_id === Number(userId));
  if (!note) return null;
  return { ...note, tags: (note.tags || []).join(", ") };
}

function saveNote({ userId, noteId, title, content, folderId, imagePath, deadline, isPinned, tags }) {
  const db = readDb();
  const note = db.notes.find((n) => n.id === Number(noteId) && n.user_id === Number(userId));
  if (!note) return { ok: false, message: "Заметка не найдена" };

  note.title = String(title || "").trim() || "Новая заметка";
  note.content = String(content || "");
  note.folder_id = folderId == null ? null : Number(folderId);
  note.image_path = String(imagePath || "").trim();
  note.deadline = deadline || null;
  note.is_pinned = isPinned ? 1 : 0;
  note.tags = String(tags || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  note.updated_at = nowIso();

  writeDb(db);
  return { ok: true };
}

function deleteNote({ userId, noteId }) {
  const db = readDb();
  const note = db.notes.find((n) => n.id === Number(noteId) && n.user_id === Number(userId));
  if (!note) return { ok: false, message: "Заметка не найдена" };
  note.is_deleted = 1;
  note.updated_at = nowIso();
  writeDb(db);
  return { ok: true };
}

module.exports = {
  register,
  login,
  getUser,
  listFolders,
  createFolder,
  listNotes,
  createNote,
  getNote,
  saveNote,
  deleteNote,
};
