// ============================================================
// AUTH CONTEXT - Gestion globale de l'authentification
// Fournit : utilisateur connecté, login, logout
// Accessible dans toute l'application via useAuth()
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement]   = useState(true)

  // Au démarrage : récupère l'utilisateur depuis localStorage
  useEffect(() => {
    const userData = localStorage.getItem('utilisateur')
    const token    = localStorage.getItem('accessToken')

    if (userData && token) {
      setUtilisateur(JSON.parse(userData))
    }
    setChargement(false)
  }, [])

  // Connexion — type = 'maquis' | 'restaurant'
  const login = async (email, mot_de_passe, type = 'maquis') => {
    const response = await api.post('/api/auth/login', { email, mot_de_passe, type })
    const { accessToken, utilisateur } = response.data.data

    // Stocke le token et les infos utilisateur
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('utilisateur', JSON.stringify(utilisateur))
    setUtilisateur(utilisateur)

    return utilisateur
  }

  // Déconnexion
  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (error) {
      console.error('Erreur logout:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('utilisateur')
      setUtilisateur(null)
    }
  }

  return (
    <AuthContext.Provider value={{ utilisateur, login, logout, chargement }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider')
  }
  return context
}