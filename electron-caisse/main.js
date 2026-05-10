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

// ── Utilitaire : ouvre une fenêtre cachée et imprime le HTML ──
function imprimerHTML(html) {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    win.webContents.once('did-finish-load', () => {
      win.webContents.print({ silent: true, printBackground: true }, (success, err) => {
        win.destroy()
        resolve({ success, error: err || null })
      })
    })
  })
}

// ── IPC — Liste des imprimantes Windows ───────────────────
ipcMain.handle('print:get-printers', async () => {
  const printers = await mainWindow.webContents.getPrintersAsync()
  return printers.map(p => p.name)
})

ipcMain.handle('print:set-printer', (_, name) => {
  store.set('printerName', name)
  return { success: true }
})

// ── IPC — Impression ticket ────────────────────────────────
ipcMain.handle('print:ticket', async (_, t) => {
  try {
const lignesHtml = t.lignes.map(l => `
      <tr>
        <td style="text-align:left">${l.nom} ×${l.quantite}</td>
        <td style="text-align:right">${l.total.toLocaleString()} F</td>
      </tr>`).join('')

    const monnaieHtml = t.monnaie > 0 ? `
      <tr><td>Reçu</td><td style="text-align:right">${t.montant_recu.toLocaleString()} F</td></tr>
      <tr><td><b>Monnaie</b></td><td style="text-align:right"><b>${t.monnaie.toLocaleString()} F</b></td></tr>` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      @page { margin: 2mm; size: 80mm auto; }
      body { font-family: monospace; font-size: 11px; width: 72mm; margin: 0 auto; }
      h2 { text-align: center; font-size: 13px; margin: 4px 0; }
      .sub { text-align: center; font-size: 10px; color: #555; margin-bottom: 4px; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 2px 0; }
      .total td { font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 4px; }
      .footer { text-align: center; margin-top: 6px; font-size: 10px; }
    </style></head><body>
      <h2>${t.maquis || 'Flowix'}</h2>
      <div class="sub">${t.copie ? '-- COPIE CAISSIER --' : '-- COPIE CLIENT --'}</div>
      <hr>
      <div style="font-size:10px">${t.date}</div>
      <div style="font-size:10px">Caissier : ${t.caissier}</div>
      <hr>
      <table>${lignesHtml}</table>
      <hr>
      <table>
        <tr class="total"><td>TOTAL</td><td style="text-align:right">${t.total.toLocaleString()} F</td></tr>
        <tr><td>Paiement</td><td style="text-align:right">${t.mode_paiement}</td></tr>
        ${monnaieHtml}
      </table>
      <div class="footer">${t.copie ? '' : 'Merci pour votre visite !'}</div>
    </body></html>`

    return await imprimerHTML(html)
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ── IPC — Impression bon de commande ──────────────────────
ipcMain.handle('print:bon', async (_, bon) => {
  try {
const lignesHtml = bon.lignes.map(l => `
      <tr>
        <td>${l.quantite}× ${l.nom}</td>
        <td style="text-align:right;color:#555">${l.note || ''}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      @page { margin: 2mm; size: 80mm auto; }
      body { font-family: monospace; font-size: 12px; width: 72mm; margin: 0 auto; }
      h2 { text-align: center; font-size: 15px; margin: 4px 0; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 3px 0; }
    </style></head><body>
      <h2>BON DE COMMANDE</h2>
      <hr>
      <div>N° ${bon.numero}</div>
      <div>${bon.table ? 'Table ' + bon.table : 'Comptoir'}</div>
      <div>Serveur : ${bon.serveur}</div>
      <div>${bon.date}</div>
      <hr>
      <table>${lignesHtml}</table>
      ${bon.note ? `<hr><div>Note : ${bon.note}</div>` : ''}
      <hr>
    </body></html>`

    return await imprimerHTML(html)
  } catch (error) {
    return { success: false, error: error.message }
  }
})