"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getData: () => electron.ipcRenderer.invoke("get-data"),
  saveData: (data) => electron.ipcRenderer.invoke("save-data", data)
});
