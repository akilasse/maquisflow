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

    const timeout = setTimeout(() => finish({ success: false, error: 'timeout' }), 15000)

    win.webContents.once('did-finish-load', async () => {
      clearTimeout(timeout)
      const printerName = store.get('printerName') || ''
      // Mesure la hauteur réelle du contenu pour éviter le papier blanc
      const hauteurPx = await win.webContents.executeJavaScript('document.body.scrollHeight')
      const hauteurMicrons = Math.ceil(hauteurPx * 264.583) + 5000 // px → microns + 5mm marge
      win.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: printerName,
        margins: { marginType: 'none' },
        pageSize: { width: 76200, height: Math.max(hauteurMicrons, 150000) }
      }, (success, err) => {
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

    const logoHtml = t.logo_url ? `<img src="${t.logo_url}" style="max-width:60mm;max-height:22mm;object-fit:contain;margin-bottom:4px;">` : ''
    const contactHtml = (t.adresse || t.telephone) ? `
      <hr>
      <div class="contact">${t.adresse ? `${t.adresse}` : ''}${t.adresse && t.telephone ? '<br>' : ''}${t.telephone ? `Tél : ${t.telephone}` : ''}</div>` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { margin: 0; }
      html { width: 76mm; }
      body { width: 70mm; margin: 0 auto; padding: 15mm 0; text-align: center; font-family: monospace; font-size: 16px; color: #000; font-weight: bold; }
      h2 { font-size: 20px; margin: 4px 0; }
      .sub { font-size: 14px; margin-bottom: 4px; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 2px 0; text-align: left; }
      td:last-child { text-align: right; }
      .total td { font-size: 18px; border-top: 1px solid #000; padding-top: 4px; }
      .footer { margin-top: 6px; font-size: 14px; }
      .contact { font-size: 14px; font-weight: bold; margin-top: 10mm; }
    </style></head><body>
      ${logoHtml}
      <h2>${t.maquis || 'Flowix'}</h2>
      <div class="sub">${t.copie ? 'REÇU CAISSIER (Payé)' : 'REÇU CLIENT (Payé)'}</div>
      <hr>
      ${t.numero_journee ? `<div style="font-size:16px;font-weight:bold;">Vente N° ${t.numero_journee}</div>` : ''}
      <div>${t.date}</div>
      <div>Caissier : ${t.caissier}</div>
      <hr>
      <table>${lignesHtml}</table>
      <hr>
      <table>
        <tr class="total"><td>TOTAL</td><td>${t.total.toLocaleString()} F</td></tr>
        <tr><td>Paiement</td><td>${t.mode_paiement}</td></tr>
        ${monnaieHtml}
      </table>
      <div class="footer">${t.copie ? '' : 'Merci pour votre visite !'}</div>
      ${contactHtml}
    </body></html>`

    return await imprimerHTML(html)
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ── IPC — Impression bon de commande ──────────────────────
ipcMain.handle('print:bon', async (_, bon) => {
  try {
    const total = bon.lignes.reduce((s, l) => s + (parseFloat(l.total) || parseFloat(l.prix_unitaire || 0) * parseFloat(l.quantite || 1)), 0)

    const lignesHtml = bon.lignes.map(l => {
      const sousTotal = parseFloat(l.total) || parseFloat(l.prix_unitaire || 0) * parseFloat(l.quantite || 1)
      return `
      <tr>
        <td style="text-align:left">${l.quantite}× ${l.nom}${l.variante_nom ? ` (${l.variante_nom})` : ''}</td>
        <td style="text-align:right">${sousTotal.toLocaleString()} F</td>
      </tr>
      ${l.note ? `<tr><td colspan="2" style="font-size:12px;color:#333;padding-left:8px">↳ ${l.note}</td></tr>` : ''}`
    }).join('')

    const logoHtml = bon.logo_url ? `<img src="${bon.logo_url}" style="max-width:60mm;max-height:22mm;object-fit:contain;margin-bottom:4px;">` : ''
    const contactHtml = (bon.adresse || bon.telephone) ? `
      <hr>
      <div class="contact">${bon.adresse ? `${bon.adresse}` : ''}${bon.adresse && bon.telephone ? '<br>' : ''}${bon.telephone ? `Tél : ${bon.telephone}` : ''}</div>` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { margin: 0; }
      html { width: 76mm; }
      body { width: 70mm; margin: 0 auto; padding: 15mm 0; text-align: center; font-family: monospace; font-size: 16px; color: #000; font-weight: bold; }
      h2 { font-size: 20px; margin: 4px 0; }
      .sub { font-size: 14px; margin-bottom: 2px; }
      hr { border: none; border-top: 2px dashed #000; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 2px 0; text-align: left; }
      td:last-child { text-align: right; }
      .total td { font-size: 18px; border-top: 1px solid #000; padding-top: 4px; }
      .contact { font-size: 14px; font-weight: bold; margin-top: 10mm; }
    </style></head><body>
      ${logoHtml}
      <h2>${bon.maquis || 'Flowix'}</h2>
      <div class="sub">BON DE COMMANDE</div>
      <div class="sub">(En attente de paiement)</div>
      <hr>
      <div style="font-size:18px;font-weight:bold">N° ${bon.numero_journee || bon.numero}</div>
      ${bon.table ? `<div>Table ${bon.table}</div>` : ''}
      <div>${bon.date}</div>
      <div>Serveur : ${bon.serveur}</div>
      <hr>
      <table>${lignesHtml}</table>
      <hr>
      <table>
        <tr class="total"><td>TOTAL DÛ</td><td>${total.toLocaleString()} F</td></tr>
      </table>
      ${bon.note ? `<hr><div>Note : ${bon.note}</div>` : ''}
      <hr>
      ${contactHtml}
    </body></html>`

    return await imprimerHTML(html)
  } catch (error) {
    return { success: false, error: error.message }
  }
})