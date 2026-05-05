const { app, BrowserWindow, ipcMain } = require('electron')
const path  = require('path')
const Store = require('electron-store')

const store = new Store()
let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    fullscreen: false,
    title: 'Flowix Station KDS',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('renderer/index.html')
  mainWindow.setMenuBarVisibility(false)
  mainWindow.on('ready-to-show', () => mainWindow.show())
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('store:get',    (_, key)        => store.get(key))
ipcMain.handle('store:set',    (_, key, value) => store.set(key, value))
ipcMain.handle('store:delete', (_, key)        => store.delete(key))
