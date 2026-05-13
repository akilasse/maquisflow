// ============================================================
// FLOWIX CAISSE — App Electron principale
// ============================================================

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const Store = require('electron-store')

// Empêcher les crashs silencieux sur erreurs non gérées
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason)
})

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
  // Ne quitter que si c'est la mainWindow qui est fermée, pas une fenêtre d'impression
  if (process.platform !== 'darwin' && (!mainWindow || mainWindow.isDestroyed())) {
    app.quit()
  }
})

// ── IPC — Stockage local (offline) ────────────────────────
ipcMain.handle('store:get', (_, key) => store.get(key))
ipcMain.handle('store:set', (_, key, value) => store.set(key, value))
ipcMain.handle('store:delete', (_, key) => store.delete(key))

// ── Utilitaire : ouvre une fenêtre cachée et imprime le HTML ──
function imprimerHTML(html) {
  return new Promise((resolve) => {
    let done = false
    const finish = (result) => {
      if (done) return
      done = true
      try { if (!win.isDestroyed()) win.destroy() } catch (_) {}
      resolve(result)
    }

    const win = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })

    // Timeout de sécurité : 15s max pour imprimer
    const timeout = setTimeout(() => finish({ success: false, error: 'timeout' }), 15000)

    win.webContents.once('did-finish-load', () => {
      clearTimeout(timeout)
      win.webContents.print({ silent: true, printBackground: true }, (success, err) => {
        finish({ success, error: err || null })
      })
    })

    win.webContents.once('did-fail-load', (_, code, desc) => {
      clearTimeout(timeout)
      finish({ success: false, error: desc })
    })

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  })
}

// ── IPC — Liste des imprimantes Windows ───────────────────
ipcMain.handle('print:get-printers', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return []
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
      body { font-family: monospace; font-size: 14px; width: 72mm; margin: 0 auto; color: #000; font-weight: bold; }
      h2 { text-align: center; font-size: 18px; margin: 4px 0; font-weight: bold; }
      .sub { text-align: center; font-size: 13px; color: #000; margin-bottom: 4px; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 2px 0; }
      .total td { font-weight: bold; font-size: 16px; border-top: 1px solid #000; padding-top: 4px; }
      .footer { text-align: center; margin-top: 6px; font-size: 13px; }
    </style></head><body>
      <h2>${t.maquis || 'Flowix'}</h2>
      <div class="sub">${t.copie ? '-- COPIE CAISSIER --' : '-- COPIE CLIENT --'}</div>
      <hr>
      <div>${t.date}</div>
      <div>Caissier : ${t.caissier}</div>
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
        <td style="text-align:right">${l.note || ''}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      @page { margin: 2mm; size: 80mm auto; }
      body { font-family: monospace; font-size: 15px; width: 72mm; margin: 0 auto; color: #000; font-weight: bold; }
      h2 { text-align: center; font-size: 20px; margin: 4px 0; font-weight: bold; }
      hr { border: none; border-top: 2px dashed #000; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 3px 0; color: #000; }
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