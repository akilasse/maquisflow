// ============================================================
// API - Configuration Axios
// Toutes les requêtes vers le backend passent par ici
// Gère automatiquement le token JWT et le refresh
// ============================================================

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true // Pour les cookies (refresh token)
})

// Intercepteur : ajoute le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Singleton refresh — une seule tentative à la fois même si plusieurs 401 simultanés
let _refreshPromise = null

// Intercepteur : gère le refresh token si token expiré
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requeteOriginale = error.config

    if (error.response?.status === 401 && !requeteOriginale._retry) {
      // Ne pas intercepter les 401 du login/sélection (mauvais identifiants = erreur normale)
      const url = requeteOriginale.url || ''
      if (url.includes('/auth/login') || url.includes('/auth/selectionner')) {
        return Promise.reject(error)
      }

      requeteOriginale._retry = true

      try {
        if (!_refreshPromise) {
          _refreshPromise = axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
            {},
            { withCredentials: true }
          ).then(res => {
            const token = res.data.data.accessToken
            localStorage.setItem('accessToken', token)
            return token
          }).catch(err => {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('utilisateur')
            window.location.href = '/login'
            throw err
          }).finally(() => {
            _refreshPromise = null
          })
        }

        const nouveauToken = await _refreshPromise
        requeteOriginale.headers.Authorization = `Bearer ${nouveauToken}`
        return api(requeteOriginale)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api