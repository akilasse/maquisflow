import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import api, { BASE_URL } from '../utils/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [utilisateur, setUtilisateur]           = useState(null)
  const [chargement, setChargement]             = useState(true)
  const [selectionRequise, setSelectionRequise] = useState(false)
  const [etablissements, setEtablissements]     = useState([])
  const [utilisateurTemp, setUtilisateurTemp]   = useState(null)

  // Restaurer la session sauvegardée au démarrage
  useEffect(() => {
    const chargerSession = async () => {
      try {
        const userData     = await AsyncStorage.getItem('utilisateur')
        const refreshToken = await AsyncStorage.getItem('refreshToken')
        if (userData && refreshToken) {
          const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
          const nouveauToken = res.data.data.accessToken
          await AsyncStorage.setItem('accessToken', nouveauToken)
          setUtilisateur(JSON.parse(userData))
        }
      } catch {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'utilisateur'])
      }
      setChargement(false)
    }
    chargerSession()
  }, [])

  // Refresh proactif toutes les 14 min (token expire à 15 min)
  useEffect(() => {
    if (!utilisateur) return
    const rafraichir = async () => {
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken')
        if (!refreshToken) return
        const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
        await AsyncStorage.setItem('accessToken', res.data.data.accessToken)
      } catch {}
    }
    const interval = setInterval(rafraichir, 14 * 60 * 1000)
    return () => clearInterval(interval)
  }, [utilisateur])


  const login = async (email, mot_de_passe) => {
    const response = await api.post('/api/auth/login', { email, mot_de_passe })
    const data = response.data

    if (data.selection_requise) {
      setUtilisateurTemp(data.data.utilisateur)
      setEtablissements(data.data.etablissements)
      setSelectionRequise(true)
      return { selection_requise: true }
    }

    const { accessToken, refreshToken, utilisateur } = data.data
    await AsyncStorage.setItem('accessToken', accessToken)
    await AsyncStorage.setItem('refreshToken', refreshToken)
    await AsyncStorage.setItem('utilisateur', JSON.stringify(utilisateur))
    setUtilisateur(utilisateur)
    return utilisateur
  }

  const selectionnerEtablissement = async (maquis_id) => {
    const response = await api.post('/api/auth/selectionner', {
      utilisateur_id: utilisateurTemp.id,
      maquis_id
    })
    const { accessToken, refreshToken, utilisateur } = response.data.data
    await AsyncStorage.setItem('accessToken', accessToken)
    await AsyncStorage.setItem('refreshToken', refreshToken)
    await AsyncStorage.setItem('utilisateur', JSON.stringify(utilisateur))
    setUtilisateur(utilisateur)
    setSelectionRequise(false)
    setUtilisateurTemp(null)
    setEtablissements([])
    return utilisateur
  }

  const logout = async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'utilisateur'])
    setUtilisateur(null)
    setSelectionRequise(false)
    setEtablissements([])
    setUtilisateurTemp(null)
  }

  return (
    <AuthContext.Provider value={{
      utilisateur, login, logout, chargement,
      selectionRequise, etablissements, selectionnerEtablissement, utilisateurTemp
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)