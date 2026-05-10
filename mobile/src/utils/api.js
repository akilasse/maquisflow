import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'https://maquisflow.com'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
})

// Ajoute le token JWT à chaque requête
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Refresh automatique si 401
let enCoursDeRefresh = false
let fileAttente = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requeteOriginale = error.config

    if (error.response?.status !== 401 || requeteOriginale._retry) {
      return Promise.reject(error)
    }

    // Ne pas intercepter les 401 du login (mauvais identifiants = erreur normale)
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

    requeteOriginale._retry = true
    enCoursDeRefresh = true

    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken')
      const response = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
      const { accessToken } = response.data.data
      await AsyncStorage.setItem('accessToken', accessToken)
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
      fileAttente.forEach(({ resolve }) => resolve(accessToken))
      fileAttente = []
      requeteOriginale.headers.Authorization = `Bearer ${accessToken}`
      return api(requeteOriginale)
    } catch {
      fileAttente.forEach(({ reject }) => reject(error))
      fileAttente = []
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'utilisateur'])
      return Promise.reject(error)
    } finally {
      enCoursDeRefresh = false
    }
  }
)

export { BASE_URL }
export default api
