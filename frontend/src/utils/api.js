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

// Intercepteur : gère le refresh token si token expiré
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requeteOriginale = error.config

    // Si 401 et pas déjà en train de refresh
    if (error.response?.status === 401 && !requeteOriginale._retry) {
      requeteOriginale._retry = true

      try {
        // Tente de rafraîchir le token
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const nouveauToken = response.data.data.accessToken
        localStorage.setItem('accessToken', nouveauToken)

        // Relance la requête originale avec le nouveau token
        requeteOriginale.headers.Authorization = `Bearer ${nouveauToken}`
        return api(requeteOriginale)
      } catch (refreshError) {
        // Refresh échoué → déconnexion
        localStorage.removeItem('accessToken')
        localStorage.removeItem('utilisateur')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api