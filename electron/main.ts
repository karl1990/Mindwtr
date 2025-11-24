import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// The built directory structure
//
// ├─┬─ dist
// │ └── index.html
// ├── dist-electron
// │ ├── main.js
// │ └── preload.js
//
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null

const DATA_FILE = path.join(app.getPath('userData'), 'data.json')

// Helper to ensure data file exists
async function ensureDataFile() {
    try {
        await fs.access(DATA_FILE)
    } catch {
        const initialData = { tasks: [], projects: [], settings: {} }
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2))
    }
}

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(process.env.DIST || path.join(__dirname, '../dist'), 'index.html'))
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(async () => {
    await ensureDataFile()

    ipcMain.handle('get-data', async () => {
        try {
            const data = await fs.readFile(DATA_FILE, 'utf-8')
            return JSON.parse(data)
        } catch (error) {
            console.error('Failed to read data:', error)
            return { tasks: [], projects: [], settings: {} }
        }
    })

    ipcMain.handle('save-data', async (_, data) => {
        try {
            await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
            return { success: true }
        } catch (error) {
            console.error('Failed to save data:', error)
            throw error
        }
    })

    createWindow()
})
