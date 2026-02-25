const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  register: (payload) => ipcRenderer.invoke("auth:register", payload),
  login: (payload) => ipcRenderer.invoke("auth:login", payload),
  getUser: (userId) => ipcRenderer.invoke("user:get", userId),

  listFolders: (userId) => ipcRenderer.invoke("folders:list", userId),
  createFolder: (payload) => ipcRenderer.invoke("folders:create", payload),

  listNotes: (payload) => ipcRenderer.invoke("notes:list", payload),
  createNote: (payload) => ipcRenderer.invoke("notes:create", payload),
  getNote: (payload) => ipcRenderer.invoke("notes:get", payload),
  saveNote: (payload) => ipcRenderer.invoke("notes:save", payload),
  deleteNote: (payload) => ipcRenderer.invoke("notes:delete", payload),

  pickImage: () => ipcRenderer.invoke("image:pick"),
});
