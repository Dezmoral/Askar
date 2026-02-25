function readTheme() {
  try {
    return localStorage.getItem("tm-theme") || "light";
  } catch {
    return "light";
  }
}

const state = {
  user: null,
  selectedFolderId: null,
  selectedNoteId: null,
  search: "",
  theme: readTheme(),
  editorMode: "view",
};

let app = null;

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toast(message, isError = false) {
  if (!document.body) return;
  const el = document.createElement("div");
  el.className = `toast ${isError ? "error" : ""}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

async function callApi(call) {
  try {
    return await call();
  } catch (err) {
    toast("Ошибка приложения", true);
    throw err;
  }
}

function showFolderModal(onSubmit) {
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <div class="modal">
      <div class="modal-title">Новая папка</div>
      <input id="folder-name" placeholder="Название папки" />
      <div class="modal-actions">
        <button class="btn btn-soft" id="cancel">Отмена</button>
        <button class="btn btn-primary" id="create">Создать</button>
      </div>
    </div>
  `;

  document.body.appendChild(wrap);
  const input = wrap.querySelector("#folder-name");
  input.focus();

  const close = () => wrap.remove();
  wrap.querySelector("#cancel").onclick = close;
  wrap.onclick = (e) => {
    if (e.target === wrap) close();
  };

  const submit = () => {
    const name = input.value.trim();
    if (!name) return toast("Введите название папки", true);
    close();
    onSubmit(name);
  };

  wrap.querySelector("#create").onclick = submit;
  input.onkeydown = (e) => {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") close();
  };
}

function authView() {
  if (!app) return;
  app.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card">
        <span class="badge">Desktop Organizer</span>
        <div class="app-logo">Task Manager</div>
        <p class="app-subtitle" id="auth-subtitle">Вход в аккаунт</p>
        <div class="form-grid" id="auth-form"></div>
      </div>
    </div>
  `;

  const subtitle = document.getElementById("auth-subtitle");
  const form = document.getElementById("auth-form");

  const showLogin = () => {
    subtitle.textContent = "Вход в аккаунт";
    form.innerHTML = `
      <input id="email" type="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Пароль" />
      <button class="btn btn-primary" id="login-btn">Войти</button>
      <button class="link-btn" id="to-register">Нет аккаунта? Регистрация</button>
    `;

    document.getElementById("login-btn").onclick = async () => {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      if (!email || !password) return toast("Введите email и пароль", true);

      const res = await callApi(() => window.api.login({ email, password }));
      if (!res.ok) return toast(res.message || "Ошибка входа", true);

      state.user = res.user;
      state.selectedFolderId = null;
      state.selectedNoteId = null;
      state.search = "";
      state.editorMode = "view";
      await appView();
    };

    document.getElementById("to-register").onclick = showRegister;
  };

  const showRegister = () => {
    subtitle.textContent = "Регистрация";
    form.innerHTML = `
      <input id="username" type="text" placeholder="Username" />
      <input id="email" type="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Пароль" />
      <input id="confirm" type="password" placeholder="Подтверждение пароля" />
      <button class="btn btn-primary" id="register-btn">Создать аккаунт</button>
      <button class="link-btn" id="to-login">Уже есть аккаунт? Войти</button>
    `;

    document.getElementById("register-btn").onclick = async () => {
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirm = document.getElementById("confirm").value;

      if (!username || !email || !password || !confirm) return toast("Заполните все поля", true);
      if (!isEmail(email)) return toast("Некорректный email", true);
      if (password.length < 6) return toast("Пароль минимум 6 символов", true);
      if (password !== confirm) return toast("Пароли не совпадают", true);

      const res = await callApi(() => window.api.register({ username, email, password }));
      if (!res.ok) return toast(res.message || "Ошибка регистрации", true);

      toast("Аккаунт создан");
      showLogin();
    };

    document.getElementById("to-login").onclick = showLogin;
  };

  showLogin();
}

function folderTree(rows) {
  const byParent = new Map();
  rows.forEach((row) => {
    const key = row.parent_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(row);
  });
  byParent.forEach((items) => items.sort((a, b) => a.name.localeCompare(b.name, "ru")));

  const ordered = [];
  const walk = (parentId, depth) => {
    (byParent.get(parentId) || []).forEach((item) => {
      ordered.push({ ...item, depth });
      walk(item.id, depth + 1);
    });
  };
  walk(null, 0);
  return ordered;
}

async function appView() {
  if (!app) return;
  if (!state.user) return authView();

  app.innerHTML = `
    <div class="layout">
      <header class="topbar">
        <div class="brand">Task Manager</div>
        <input id="search" placeholder="Поиск по заметкам" />
        <div class="row-grow"></div>
        <button class="btn btn-primary" id="new-note">Новая заметка</button>
        <button class="btn btn-soft" id="theme-toggle">${state.theme === "dark" ? "Светлая" : "Тёмная"} тема</button>
        <button class="btn btn-soft" id="logout">Выход</button>
      </header>

      <div class="main">
        <aside class="panel">
          <div class="panel-title">
            <span>Папки</span>
            <button class="btn btn-soft" id="new-folder">+ Папка</button>
          </div>
          <div class="list" id="folders"></div>
        </aside>

        <aside class="panel">
          <div class="panel-title">Заметки</div>
          <div class="list" id="notes"></div>
        </aside>

        <section class="panel">
          <div class="editor" id="editor">
            <div class="status">Выберите заметку или создайте новую</div>
          </div>
        </section>
      </div>
    </div>
  `;

  document.getElementById("search").value = state.search;
  document.getElementById("search").oninput = async (e) => {
    state.search = e.target.value;
    await renderNotes();
  };

  document.getElementById("logout").onclick = () => {
    state.user = null;
    state.selectedFolderId = null;
    state.selectedNoteId = null;
    state.search = "";
    authView();
  };

  document.getElementById("theme-toggle").onclick = async () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("tm-theme", state.theme);
    } catch {}
    document.documentElement.setAttribute("data-theme", state.theme);
    await appView();
  };

  document.getElementById("new-folder").onclick = () => {
    showFolderModal(async (name) => {
      const res = await callApi(() =>
        window.api.createFolder({ userId: state.user.id, name, parentId: state.selectedFolderId })
      );
      if (!res.ok) return toast(res.message || "Ошибка", true);
      await renderFolders();
      toast("Папка создана");
    });
  };

  document.getElementById("new-note").onclick = async () => {
    const res = await callApi(() => window.api.createNote({ userId: state.user.id, folderId: state.selectedFolderId }));
    state.selectedNoteId = res.id;
    state.editorMode = "edit";
    await renderNotes();
    await renderEditor();
    toast("Новая заметка создана");
  };

  await renderFolders();
  await renderNotes();
  await renderEditor();
}

async function renderFolders() {
  if (!app) return;
  const root = document.getElementById("folders");
  if (!root) return;
  const rows = await callApi(() => window.api.listFolders(state.user.id));

  if (!rows.length) {
    root.innerHTML = `<div class="status">Нет папок</div>`;
    return;
  }

  if (!rows.some((f) => f.id === state.selectedFolderId)) {
    state.selectedFolderId = rows[0].id;
  }

  root.innerHTML = folderTree(rows)
    .map((folder) => {
      const active = folder.id === state.selectedFolderId ? "active" : "";
      const indent = 10 + folder.depth * 16;
      return `<div class="folder-item ${active}" data-id="${folder.id}" style="padding-left:${indent}px;">📁 ${esc(
        folder.name
      )}</div>`;
    })
    .join("");

  root.querySelectorAll(".folder-item").forEach((item) => {
    item.onclick = async () => {
      state.selectedFolderId = Number(item.dataset.id);
      state.selectedNoteId = null;
      state.editorMode = "view";
      await renderFolders();
      await renderNotes();
      await renderEditor();
    };
  });
}

async function renderNotes() {
  if (!app) return;
  const root = document.getElementById("notes");
  if (!root) return;
  const notes = await callApi(() =>
    window.api.listNotes({ userId: state.user.id, folderId: state.selectedFolderId, search: state.search })
  );

  if (!notes.length) {
    root.innerHTML = `<div class="status">Нет заметок</div>`;
    return;
  }

  if (!notes.some((n) => n.id === state.selectedNoteId)) {
    state.selectedNoteId = notes[0].id;
  }

  root.innerHTML = notes
    .map((note) => {
      const active = note.id === state.selectedNoteId ? "active" : "";
      const overdue = note.deadline && new Date(note.deadline) < new Date();
      const preview = (note.content || "").replace(/\n/g, " ").slice(0, 140) || "Пустая заметка";
      const title = note.title || "Новая заметка";
      return `
        <article class="note-item ${active}" data-id="${note.id}">
          <div class="note-title">${note.is_pinned ? "⭐ " : ""}${esc(title)}</div>
          <div class="note-preview">${esc(preview)}</div>
          ${overdue ? '<span class="badge badge-danger">Просрочено</span>' : ""}
        </article>
      `;
    })
    .join("");

  root.querySelectorAll(".note-item").forEach((item) => {
    item.onclick = async () => {
      state.selectedNoteId = Number(item.dataset.id);
      state.editorMode = "view";
      await renderNotes();
      await renderEditor();
    };
  });
}

function createImagePreview(imagePath) {
  if (!imagePath) return "";
  const safeSrc = `file://${encodeURI(imagePath)}`;
  return `<img class="preview-image" src="${safeSrc}" alt="preview" />`;
}

async function renderEditor() {
  if (!app) return;
  const root = document.getElementById("editor");
  if (!root) return;
  if (!state.selectedNoteId) {
    root.innerHTML = `<div class="status">Выберите заметку или создайте новую</div>`;
    return;
  }

  const note = await callApi(() => window.api.getNote({ userId: state.user.id, noteId: state.selectedNoteId }));
  if (!note) {
    root.innerHTML = `<div class="status">Заметка не найдена</div>`;
    return;
  }

  const created = note.created_at ? new Date(note.created_at).toLocaleString("ru-RU") : "-";
  const updated = note.updated_at ? new Date(note.updated_at).toLocaleString("ru-RU") : "-";

  if (state.editorMode === "view") {
    const title = note.title || "Новая заметка";
    const deadline = note.deadline ? new Date(note.deadline).toLocaleDateString("ru-RU") : "—";
    const tags = note.tags ? esc(note.tags) : "—";
    root.innerHTML = `
      <div class="note-view-title">${esc(title)}</div>
      <div class="status">Дедлайн: ${esc(deadline)}</div>
      <div class="status">Теги: ${tags}</div>
      ${note.image_path ? createImagePreview(note.image_path) : ""}
      <div class="note-view-content">${esc(note.content || "Пустая заметка")}</div>
      <div class="separator"></div>
      <div class="status">Создано: ${esc(created)}</div>
      <div class="status">Обновлено: ${esc(updated)}</div>
      <div class="actions">
        <button class="btn btn-primary" id="start-edit">Редактировать</button>
        <button class="btn btn-danger" id="trash-note">В корзину</button>
      </div>
    `;

    document.getElementById("start-edit").onclick = async () => {
      state.editorMode = "edit";
      await renderEditor();
    };

    document.getElementById("trash-note").onclick = async () => {
      const res = await callApi(() => window.api.deleteNote({ userId: state.user.id, noteId: state.selectedNoteId }));
      if (!res.ok) return toast(res.message || "Ошибка", true);
      state.selectedNoteId = null;
      state.editorMode = "view";
      await renderNotes();
      await renderEditor();
      toast("Заметка перемещена в корзину");
    };
    return;
  }

  root.innerHTML = `
    <input id="note-title" placeholder="Новая заметка" value="${esc(note.title || "")}" />

    <div class="toolbar">
      <button class="btn btn-soft" id="pick-image">Image</button>
      <button class="btn btn-danger" id="trash-note">В корзину</button>
    </div>

    <textarea id="note-content" placeholder="Текст заметки">${esc(note.content || "")}</textarea>

    <div class="meta-grid">
      <input id="note-deadline" type="date" value="${esc(note.deadline ? String(note.deadline).slice(0, 10) : "")}" />
      <label class="pin-wrap">
        <input id="note-pin" type="checkbox" ${note.is_pinned ? "checked" : ""} />
        Закрепить
      </label>
    </div>

    <input id="note-image" placeholder="Путь к изображению" value="${esc(note.image_path || "")}" />
    ${createImagePreview(note.image_path)}

    <input id="note-tags" placeholder="Теги через запятую" value="${esc(note.tags || "")}" />

    <div class="separator"></div>
    <div class="status">Создано: ${esc(created)}</div>
    <div class="status">Обновлено: ${esc(updated)}</div>

    <button class="btn btn-primary" id="save-note">Сохранить заметку (Ctrl/Cmd + S)</button>
    <button class="btn btn-soft" id="cancel-edit">Отмена</button>
  `;

  document.getElementById("pick-image").onclick = async () => {
    const result = await callApi(() => window.api.pickImage());
    if (!result.ok) return;
    document.getElementById("note-image").value = result.path;
    await saveCurrentNote(true);
    await renderEditor();
  };

  document.getElementById("trash-note").onclick = async () => {
    const res = await callApi(() => window.api.deleteNote({ userId: state.user.id, noteId: state.selectedNoteId }));
    if (!res.ok) return toast(res.message || "Ошибка", true);
    state.selectedNoteId = null;
    await renderNotes();
    await renderEditor();
    toast("Заметка перемещена в корзину");
  };

  document.getElementById("save-note").onclick = () => saveCurrentNote(false);
  document.getElementById("cancel-edit").onclick = async () => {
    state.editorMode = "view";
    await renderEditor();
  };
}

async function saveCurrentNote(silent = false) {
  if (!state.selectedNoteId) return;

  const noteTitle = document.getElementById("note-title");
  const noteContent = document.getElementById("note-content");
  const noteImage = document.getElementById("note-image");
  const noteDeadline = document.getElementById("note-deadline");
  const notePin = document.getElementById("note-pin");
  const noteTags = document.getElementById("note-tags");

  if (!noteTitle || !noteContent) return;

  const deadline = noteDeadline?.value || null;
  if (deadline && Number.isNaN(Date.parse(deadline))) {
    return toast("Некорректный дедлайн", true);
  }

  const res = await callApi(() =>
    window.api.saveNote({
      userId: state.user.id,
      noteId: state.selectedNoteId,
      title: noteTitle.value,
      content: noteContent.value,
      folderId: state.selectedFolderId,
      imagePath: noteImage?.value || "",
      deadline,
      isPinned: Boolean(notePin?.checked),
      tags: noteTags?.value || "",
    })
  );

  if (!res.ok) return toast(res.message || "Ошибка сохранения", true);

  await renderNotes();
  state.editorMode = "view";
  await renderEditor();
  if (!silent) toast("Сохранено");
}

function renderFatal(error) {
  if (!app) return;
  app.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card">
        <span class="badge badge-danger">Ошибка запуска</span>
        <div class="app-logo" style="font-size:28px;">Task Manager</div>
        <p class="app-subtitle">Renderer упал при инициализации.</p>
        <pre style="white-space:pre-wrap;color:var(--danger);font-size:12px;">${esc(error?.message || String(error))}</pre>
      </div>
    </div>
  `;
}

document.addEventListener("keydown", async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (state.user) {
      await saveCurrentNote(false);
    }
  }
});

window.addEventListener("error", (event) => {
  renderFatal(event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  renderFatal(event.reason);
});

window.addEventListener("DOMContentLoaded", () => {
  app = document.getElementById("app");
  if (!app) return;
  document.documentElement.setAttribute("data-theme", state.theme);
  authView();
});
