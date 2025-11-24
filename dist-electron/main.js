import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname$1, "../public");
let win;
const DATA_FILE = path.join(app.getPath("userData"), "data.json");
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initialData = { tasks: [], projects: [], settings: {} };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST || path.join(__dirname$1, "../dist"), "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(async () => {
  await ensureDataFile();
  ipcMain.handle("get-data", async () => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to read data:", error);
      return { tasks: [], projects: [], settings: {} };
    }
  });
  ipcMain.handle("save-data", async (_, data) => {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
      return { success: true };
    } catch (error) {
      console.error("Failed to save data:", error);
      throw error;
    }
  });
  createWindow();
});
