// ============================================================
// API - Configuration Axios pour l'app mobile
// Pointe vers le backend Flowix
// ============================================================

import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Change cette IP par l'IP de ton PC sur le réseau local
// Pour trouver ton IP : ipconfig dans le terminal Windows
const BASE_URL = 'https://Flowix.com'

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

export { BASE_URL }
export default api