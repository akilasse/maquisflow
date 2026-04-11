// ============================================================
// AUTH CONTEXT - Gestion de l'authentification mobile
// Stocke le token et les infos utilisateur avec AsyncStorage
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../utils/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement]   = useState(true)

  useEffect(() => {
    chargerSession()
  }, [])

  const chargerSession = async () => {
    try {
      const userData = await AsyncStorage.getItem('utilisateur')
      const token    = await AsyncStorage.getItem('accessToken')
      if (userData && token) {
        setUtilisateur(JSON.parse(userData))
      }
    } catch (error) {
      console.error('Erreur chargement session:', error)
    } finally {
      setChargement(false)
    }
  }

  // type = 'maquis' | 'restaurant'
  const login = async (email, mot_de_passe, type = 'maquis') => {
    const response = await api.post('/api/auth/login', { email, mot_de_passe, type })
    const { accessToken, utilisateur } = response.data.data
    await AsyncStorage.setItem('accessToken', accessToken)
    await AsyncStorage.setItem('utilisateur', JSON.stringify(utilisateur))
    setUtilisateur(utilisateur)
    return utilisateur
  }

  const logout = async () => {
    await AsyncStorage.removeItem('accessToken')
    await AsyncStorage.removeItem('utilisateur')
    setUtilisateur(null)
  }

  return (
    <AuthContext.Provider value={{ utilisateur, login, logout, chargement }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)