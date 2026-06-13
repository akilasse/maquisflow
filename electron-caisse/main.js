// ============================================================
// FLOWIX CAISSE — App Electron principale
// ============================================================

const { app, BrowserWindow, ipcMain } = require('electron')
const path    = require('path')
const os      = require('os')
const http    = require('http')
const express = require('express')
const cors    = require('cors')
const bcrypt  = require('bcryptjs')
const mdns    = require('multicast-dns')
const { Server: SocketIO } = require('socket.io')
const Store   = require('electron-store')

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

// ============================================================
// SERVEUR LOCAL — Port 3737, accessible depuis tout le WiFi
// Fonctionne avec ET sans internet
// ============================================================
const LOCAL_PORT     = 3737
const LOCAL_SECRET   = 'flowix-local-secret-2026'
const jwt            = require('jsonwebtoken')

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address
    }
  }
  return '127.0.0.1'
}

// Génère un token local valable 24h
function genererTokenLocal(user) {
  return jwt.sign(
    { id: user.id, role: user.role, maquis_id: user.maquis_id || user.maquis?.id, local: true },
    LOCAL_SECRET,
    { expiresIn: '24h' }
  )
}

const localApp = express()
const localHttpServer = http.createServer(localApp)
const localIO = new SocketIO(localHttpServer, { cors: { origin: '*' } })

localApp.use(express.json())
localApp.use(cors({ origin: '*' }))

// -- Frontend : sert les fichiers React compilés --
// Les navigateurs et mobiles chargeront l'app depuis http://IP:3737
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
localApp.use(express.static(frontendDist))

// -- Santé --
localApp.get('/api/health', (_, res) => {
  res.json({ ok: true, local: true, version: '2.0.0', ip: getLocalIP() })
})

// -- Auth local : login sans vérification VPS (réseau LAN de confiance) --
localApp.post('/api/auth/login', async (req, res) => {
  const { email, login: loginId, mot_de_passe } = req.body
  const usersCache = store.get('users_cache') || []
  const user = usersCache.find(u => u.email === email || u.login === loginId)
  if (!user) {
    return res.status(401).json({ success: false, message: 'Identifiant non reconnu sur ce réseau' })
  }
  // Vérifier le mot de passe si le hash est connu, sinon accepter (LAN de confiance)
  if (user.mot_de_passe_hash && mot_de_passe) {
    const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe_hash)
    if (!ok) return res.status(401).json({ success: false, message: 'Mot de passe incorrect' })
  }
  const accessToken = genererTokenLocal(user)
  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken: accessToken, // local mode : même token
      utilisateur:  user.utilisateur_data,
      local_mode:   true
    }
  })
})

// -- Refresh local --
localApp.post('/api/auth/refresh', (req, res) => {
  const token = req.body.refreshToken || req.body.token
  try {
    const payload     = jwt.verify(token, LOCAL_SECRET)
    const usersCache  = store.get('users_cache') || []
    const user        = usersCache.find(u => u.id === payload.id)
    if (!user) throw new Error('Utilisateur introuvable')
    const accessToken = genererTokenLocal(user)
    res.json({ success: true, data: { accessToken } })
  } catch {
    res.status(401).json({ success: false, message: 'Token local invalide' })
  }
})

// -- Produits (depuis le cache electron-store) --
localApp.get('/api/stock/produits', (_, res) => {
  const produits = store.get('produits_cache') || []
  res.json({ success: true, data: produits })
})

// -- Paramètres maquis (depuis le cache) --
localApp.get('/api/parametrage/maquis', (_, res) => {
  const maquis = store.get('maquis_cache') || null
  if (!maquis) return res.status(503).json({ success: false, message: 'Cache non disponible' })
  res.json({ success: true, data: maquis })
})

// -- Stations (depuis le cache) --
localApp.get('/api/commandes/stations', (_, res) => {
  const stations = store.get('stations_cache') || []
  res.json({ success: true, data: stations })
})

// -- Ventes : enregistre localement + diffuse --
localApp.post('/api/ventes', (req, res) => {
  const vente = {
    ...req.body,
    id:         `local_${Date.now()}`,
    created_at: new Date().toISOString(),
    local_mode: true
  }
  const queue = store.get('ventes_local') || []
  queue.push(vente)
  store.set('ventes_local', queue)
  localIO.emit('vente:created', vente)
  res.json({ success: true, data: vente })
})

// -- Commandes serveur : liste --
localApp.get('/api/commandes', (_, res) => {
  const commandes = (store.get('commandes_local') || []).filter(c => c.statut !== 'encaisse')
  res.json({ success: true, data: commandes })
})

// -- Commandes serveur : nouvelle commande --
localApp.post('/api/commandes', (req, res) => {
  const commande = {
    ...req.body,
    id:         `local_${Date.now()}`,
    created_at: new Date().toISOString(),
    statut:     'en_attente',
    local_mode: true
  }
  const commandes = store.get('commandes_local') || []
  commandes.push(commande)
  store.set('commandes_local', commandes)
  localIO.emit('commande:nouvelle', commande)
  res.json({ success: true, data: commande })
})

// -- Commandes serveur : encaisser --
localApp.post('/api/commandes/:id/encaisser', (req, res) => {
  const commandes = store.get('commandes_local') || []
  const idx = commandes.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ success: false, message: 'Commande introuvable' })
  commandes[idx].statut       = 'encaisse'
  commandes[idx].mode_paiement = req.body.mode_paiement
  store.set('commandes_local', commandes)
  localIO.emit('commande:encaissee', commandes[idx])
  res.json({ success: true, data: commandes[idx] })
})

// -- Fallback SPA : toutes les routes non-API → index.html (React Router) --
localApp.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
  const indexPath = path.join(frontendDist, 'index.html')
  res.sendFile(indexPath, err => {
    if (err) res.status(200).send('Flowix — en attente du frontend compilé')
  })
})

localIO.on('connection', socket => {
  console.log('[Local] Client connecté:', socket.id)
  socket.on('disconnect', () => console.log('[Local] Client déconnecté:', socket.id))
})

localHttpServer.listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log(`[Local] Serveur démarré — http://${getLocalIP()}:${LOCAL_PORT}`)
  lancerMDNS()
})

// ── mDNS : annonce "flowix.local" sur le WiFi ──────────────
// Permet aux mobiles et navigateurs de trouver ce PC sans connaître son IP
function lancerMDNS() {
  try {
    const mdnsInstance = mdns()
    const localIP = getLocalIP()
    mdnsInstance.on('query', (query) => {
      const cherche = query.questions.some(q =>
        q.name === 'flowix.local' || q.name === '_flowix._tcp.local'
      )
      if (!cherche) return
      mdnsInstance.respond({
        answers: [
          { name: 'flowix.local',        type: 'A',   ttl: 300, data: localIP },
          { name: '_flowix._tcp.local',   type: 'PTR', ttl: 300, data: `Flowix._flowix._tcp.local` },
          { name: `Flowix._flowix._tcp.local`, type: 'SRV', ttl: 300, data: { priority: 0, weight: 0, port: LOCAL_PORT, target: 'flowix.local' } }
        ]
      })
    })
    console.log(`[mDNS] Annonce flowix.local → ${localIP}:${LOCAL_PORT}`)
  } catch (e) {
    console.log('[mDNS] Non disponible (normal en dev):', e.message)
  }
}

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

// ── IPC — Serveur local ────────────────────────────────────
ipcMain.handle('local:getIP',   () => getLocalIP())
ipcMain.handle('local:getPort', () => LOCAL_PORT)

// Le renderer met à jour les caches utilisés par le serveur local
ipcMain.handle('local:cacheMaquis',   (_, data) => { store.set('maquis_cache', data) })
ipcMain.handle('local:cacheStations', (_, data) => { store.set('stations_cache', data) })

// Cache les credentials d'un utilisateur pour le login offline
// Le renderer envoie le mot de passe en clair, main.js le hash avant stockage
ipcMain.handle('local:cacheUser', async (_, { loginId, email, motDePasse, utilisateurData }) => {
  const hash = await bcrypt.hash(motDePasse, 8)
  const users = store.get('users_cache') || []
  const idx   = users.findIndex(u => u.email === email || u.login === loginId)
  const entry = {
    id:                  utilisateurData.id,
    email:               email || utilisateurData.email,
    login:               loginId || utilisateurData.login || null,
    role:                utilisateurData.role,
    maquis_id:           utilisateurData.maquis?.id,
    mot_de_passe_hash:   hash,
    utilisateur_data:    utilisateurData,
    cached_at:           Date.now()
  }
  if (idx >= 0) users[idx] = entry
  else users.push(entry)
  store.set('users_cache', users)
})

// Sync des ventes collectées localement (de mobiles) vers VPS
ipcMain.handle('local:getVentesLocales', () => store.get('ventes_local') || [])
ipcMain.handle('local:clearVentesLocales', () => { store.set('ventes_local', []) })

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
      .contact { font-size: 18px; font-weight: bold; margin-top: 10mm; line-height: 1.6; }
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
      .contact { font-size: 18px; font-weight: bold; margin-top: 10mm; line-height: 1.6; }
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