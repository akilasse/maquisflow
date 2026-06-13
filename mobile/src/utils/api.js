import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const CLOUD_URL  = 'https://maquisflow.com'
const LOCAL_PORT         = 3737
// mDNS : Electron annonce flowix.local sur le WiFi
const MDNS_URL           = `http://flowix.local:${LOCAL_PORT}`

// ── Détection de serveur disponible ──────────────────────────
let _activeURL  = CLOUD_URL
let _lastCheck  = 0
const CHECK_TTL = 20000 // re-tester toutes les 20 s

async function fetchWithTimeout(url, ms = 3000) {
  const ctrl = new AbortController()
  const tid  = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(tid)
  }
}

// Retourne l'URL active (VPS ou serveur local)
async function detectActiveURL() {
  const now = Date.now()
  if (now - _lastCheck < CHECK_TTL) return _activeURL
  _lastCheck = now

  // 1. Essayer le VPS (3 s max)
  if (await fetchWithTimeout(`${CLOUD_URL}/api/health`, 3000)) {
    _activeURL = CLOUD_URL
    return _activeURL
  }

  // 2. Essayer l'IP enregistrée (sauvegardée lors d'un login avec internet)
  const savedIP   = await AsyncStorage.getItem('local_server_ip')
  const savedPort = await AsyncStorage.getItem('local_server_port') || String(LOCAL_PORT)
  if (savedIP) {
    const url = `http://${savedIP}:${savedPort}`
    if (await fetchWithTimeout(`${url}/api/health`, 2000)) {
      _activeURL = url
      console.log('[API] Serveur local IP :', url)
      return _activeURL
    }
  }

  // 3. Essayer flowix.local via mDNS (annoncé par Electron sur le WiFi)
  if (await fetchWithTimeout(`${MDNS_URL}/api/health`, 2000)) {
    _activeURL = MDNS_URL
    console.log('[API] Serveur local mDNS :', MDNS_URL)
    return _activeURL
  }

  // Aucun serveur disponible — on laisse l'URL actuelle (l'app gérera l'erreur)
  return _activeURL
}

// Retourne true si on est actuellement sur le serveur local
export function estModeLocal() {
  return _activeURL !== CLOUD_URL
}

// Sauvegarde les coordonnées du serveur local reçues dans une réponse auth
export async function sauvegarderServeurLocal(maquis) {
  if (maquis?.local_server_ip) {
    await AsyncStorage.setItem('local_server_ip',   maquis.local_server_ip)
    await AsyncStorage.setItem('local_server_port', String(maquis.local_server_port || LOCAL_PORT))
  }
}

// Login avec fallback local si VPS inaccessible
export async function loginAvecFallback(identifiant, mot_de_passe) {
  // 1. Essayer VPS
  try {
    const res = await axios.post(
      `${CLOUD_URL}/api/auth/login`,
      { email: identifiant, mot_de_passe },
      { timeout: 5000 }
    )
    return { data: res.data, local: false }
  } catch {}

  // 2. VPS inaccessible → essayer le serveur local (IP ou mDNS)
  const localURL = await detectActiveURL()
  if (localURL === CLOUD_URL) throw new Error('Aucun serveur disponible. Vérifiez votre connexion WiFi.')

  const res = await axios.post(
    `${localURL}/api/auth/login`,
    { email: identifiant, login: identifiant, mot_de_passe },
    { timeout: 5000 }
  )
  return { data: res.data, local: true }
}

// ── Instance Axios ────────────────────────────────────────────
const api = axios.create({ timeout: 10000 })

// Avant chaque requête : résoudre l'URL active + injecter le token
api.interceptors.request.use(async (config) => {
  const baseURL = await detectActiveURL()

  // Reconstruire l'URL si relative
  if (config.url?.startsWith('/api/')) {
    config.url = `${baseURL}${config.url}`
  } else if (config.url && !config.url.startsWith('http')) {
    config.url = `${baseURL}/api/${config.url}`
  }

  // Timeout plus court en local (LAN)
  if (baseURL !== CLOUD_URL) config.timeout = 5000

  const token = await AsyncStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Refresh automatique si 401
let enCoursDeRefresh = false
let fileAttente      = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requeteOriginale = error.config

    if (error.response?.status !== 401 || requeteOriginale._retry) {
      return Promise.reject(error)
    }

    const url = requeteOriginale.url || ''
    if (url.includes('/auth/login') || url.includes('/auth/selectionner')) {
      return Promise.reject(error)
    }

    if (enCoursDeRefresh) {
      return new Promise((resolve, reject) => {
        fileAttente.push({ resolve, reject })
      }).then(token => {
        requeteOriginale.headers.Authorization = `Bearer ${token}`
        return api(requeteOriginale)
      }).catch(err => Promise.reject(err))
    }

    requeteOriginale._retry  = true
    enCoursDeRefresh         = true

    try {
      const refreshToken  = await AsyncStorage.getItem('refreshToken')
      // Tenter le refresh sur VPS puis sur serveur local
      let accessToken
      try {
        const res   = await axios.post(`${CLOUD_URL}/api/auth/refresh`, { refreshToken }, { timeout: 4000 })
        accessToken = res.data.data.accessToken
      } catch {
        const local = await detectActiveURL()
        if (local !== CLOUD_URL) {
          const res   = await axios.post(`${local}/api/auth/refresh`, { refreshToken }, { timeout: 3000 })
          accessToken = res.data.data.accessToken
        } else {
          throw new Error('Refresh impossible')
        }
      }
      await AsyncStorage.setItem('accessToken', accessToken)
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
      fileAttente.forEach(({ resolve }) => resolve(accessToken))
      fileAttente                              = []
      requeteOriginale.headers.Authorization   = `Bearer ${accessToken}`
      return api(requeteOriginale)
    } catch {
      fileAttente.forEach(({ reject }) => reject(error))
      fileAttente = []
      // Ne pas déconnecter si on est en mode local — garder la session
      if (!estModeLocal()) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'utilisateur'])
      }
      return Promise.reject(error)
    } finally {
      enCoursDeRefresh = false
    }
  }
)

export { CLOUD_URL as BASE_URL }
export default api
