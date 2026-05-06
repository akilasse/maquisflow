// ============================================================
// FLOWIX CAISSE — App Electron principale
// ============================================================

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const Store = require('electron-store')

// Windows 7 : certificats Let's Encrypt non reconnus
app.commandLine.appendSwitch('ignore-certificate-errors')
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault()
  callback(true)
})

const store = new Store()

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    fullscreen: false,
    title: 'Flowix Caisse',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('renderer/index.html')

  // Masquer la barre de menu
  mainWindow.setMenuBarVisibility(false)

  // Ouvrir DevTools pour debug
  mainWindow.webContents.openDevTools()

  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('Erreur chargement:', code, desc)
  })
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

// ── IPC — Stockage local (offline) ────────────────────────
ipcMain.handle('store:get', (_, key) => store.get(key))
ipcMain.handle('store:set', (_, key, value) => store.set(key, value))
ipcMain.handle('store:delete', (_, key) => store.delete(key))

// ── IPC — Impression ESC/POS ───────────────────────────────
ipcMain.handle('print:ticket', async (_, ticketData) => {
  try {
    const { USB } = require('escpos-usb')
    const escpos = require('escpos')
    escpos.USB = USB

    const device = new escpos.USB()
    const printer = new escpos.Printer(device)

    await new Promise((resolve, reject) => {
      device.open((err) => {
        if (err) return reject(err)

        printer
          .font('a')
          .align('ct')
          .style('bu')
          .size(1, 1)
          .text(ticketData.maquis || 'Flowix')
          .style('normal')
          .size(0, 0)
          .text('------------------------')
          .text(`Date: ${ticketData.date}`)
          .text(`Caissier: ${ticketData.caissier}`)
          .text('------------------------')

        ticketData.lignes.forEach(ligne => {
          printer.tableCustom([
            { text: `${ligne.nom} x${ligne.quantite}`, align: 'LEFT', width: 0.6 },
            { text: `${ligne.total.toLocaleString()}`, align: 'RIGHT', width: 0.4 }
          ])
        })

        printer
          .text('------------------------')
          .tableCustom([
            { text: 'TOTAL', align: 'LEFT', width: 0.5 },
            { text: `${ticketData.total.toLocaleString()} XOF`, align: 'RIGHT', width: 0.5 }
          ])
          .text(`Paiement: ${ticketData.mode_paiement}`)

        if (ticketData.monnaie > 0) {
          printer
            .text(`Reçu: ${ticketData.montant_recu.toLocaleString()} XOF`)
            .text(`Monnaie: ${ticketData.monnaie.toLocaleString()} XOF`)
        }

        printer
          .text('------------------------')
          .align('ct')
          .text('Merci pour votre visite !')
          .text(' ')
          .cut()
          .close(resolve)
      })
    })

    return { success: true }
  } catch (error) {
    console.error('Erreur impression:', error)
    return { success: false, error: error.message }
  }
})