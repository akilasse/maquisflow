// ============================================================
// OFFLINE DB - Stockage local des ventes hors connexion
// Utilise IndexedDB pour persister les ventes offline
// ============================================================

const DB_NAME = 'flowix_offline'
const DB_VERSION = 1
const STORE_VENTES = 'ventes_pending'

let db = null

export const initDB = () => new Promise((resolve, reject) => {
  if (db) return resolve(db)
  const req = indexedDB.open(DB_NAME, DB_VERSION)
  req.onupgradeneeded = (e) => {
    const database = e.target.result
    if (!database.objectStoreNames.contains(STORE_VENTES)) {
      const store = database.createObjectStore(STORE_VENTES, { keyPath: 'id', autoIncrement: true })
      store.createIndex('synced', 'synced', { unique: false })
    }
  }
  req.onsuccess = (e) => { db = e.target.result; resolve(db) }
  req.onerror = () => reject(req.error)
})

export const sauvegarderVenteOffline = async (vente) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_VENTES, 'readwrite')
    const store = tx.objectStore(STORE_VENTES)
    const req = store.add({ ...vente, synced: false, created_at: new Date().toISOString() })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const getVentesPending = async () => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_VENTES, 'readonly')
    const store = tx.objectStore(STORE_VENTES)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result.filter(v => !v.synced))
    req.onerror = () => reject(req.error)
  })
}

export const marquerVenteSynced = async (id) => {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_VENTES, 'readwrite')
    const store = tx.objectStore(STORE_VENTES)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const vente = getReq.result
      vente.synced = true
      const putReq = store.put(vente)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export const compterVentesPending = async () => {
  const ventes = await getVentesPending()
  return ventes.length
}