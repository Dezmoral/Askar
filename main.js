const path = require("node:path");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const db = require("./db");

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: "Task Manager",
    backgroundColor: "#eef3fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "src", "index.html"));
  if (process.env.TM_DEBUG === "1") {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("auth:register", (_event, payload) => db.register(payload));
ipcMain.handle("auth:login", (_event, payload) => db.login(payload));
ipcMain.handle("user:get", (_event, userId) => db.getUser(userId));

ipcMain.handle("folders:list", (_event, userId) => db.listFolders(userId));
ipcMain.handle("folders:create", (_event, payload) => db.createFolder(payload));

ipcMain.handle("notes:list", (_event, payload) => db.listNotes(payload));
ipcMain.handle("notes:create", (_event, payload) => db.createNote(payload));
ipcMain.handle("notes:get", (_event, payload) => db.getNote(payload));
ipcMain.handle("notes:save", (_event, payload) => db.saveNote(payload));
ipcMain.handle("notes:delete", (_event, payload) => db.deleteNote(payload));

ipcMain.handle("image:pick", async () => {
  const result = await dialog.showOpenDialog({
    title: "Выберите изображение",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] },
      { name: "All files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false };
  }

  return { ok: true, path: result.filePaths[0] };
});
