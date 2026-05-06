import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../utils/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [utilisateur, setUtilisateur]           = useState(null)
  const [chargement, setChargement]             = useState(true)
  const [selectionRequise, setSelectionRequise] = useState(false)
  const [etablissements, setEtablissements]     = useState([])
  const [utilisateurTemp, setUtilisateurTemp]   = useState(null)

  useEffect(() => { chargerSession() }, [])

  const chargerSession = async () => {
    try {
      const userData = await AsyncStorage.getItem('utilisateur')
      const token    = await AsyncStorage.getItem('accessToken')
      if (userData && token) {
        const u = JSON.parse(userData)
        setUtilisateur(u)
        // Rafraîchir les données maquis pour avoir les derniers modules configurés
        try {
          const res = await api.get('/api/parametrage/maquis')
          const maquisFrais = res.data.data
          const mis_a_jour = { ...u, maquis: { ...u.maquis, ...maquisFrais } }
          await AsyncStorage.setItem('utilisateur', JSON.stringify(mis_a_jour))
          setUtilisateur(mis_a_jour)
        } catch {}
      }
    } catch (error) {
      console.error('Erreur chargement session:', error)
    } finally {
      setChargement(false)
    }
  }

  const login = async (email, mot_de_passe) => {
    const response = await api.post('/api/auth/login', { email, mot_de_passe })
    const data = response.data

    if (data.selection_requise) {
      setUtilisateurTemp(data.data.utilisateur)
      setEtablissements(data.data.etablissements)
      setSelectionRequise(true)
      return { selection_requise: true }
    }

    const { accessToken, utilisateur } = data.data
    await AsyncStorage.setItem('accessToken', accessToken)
    await AsyncStorage.setItem('utilisateur', JSON.stringify(utilisateur))
    setUtilisateur(utilisateur)
    return utilisateur
  }

  const selectionnerEtablissement = async (maquis_id) => {
    const response = await api.post('/api/auth/selectionner', {
      utilisateur_id: utilisateurTemp.id,
      maquis_id
    })
    const { accessToken, utilisateur } = response.data.data
    await AsyncStorage.setItem('accessToken', accessToken)
    await AsyncStorage.setItem('utilisateur', JSON.stringify(utilisateur))
    setUtilisateur(utilisateur)
    setSelectionRequise(false)
    setUtilisateurTemp(null)
    setEtablissements([])
    return utilisateur
  }

  const logout = async () => {
    await AsyncStorage.removeItem('accessToken')
    await AsyncStorage.removeItem('utilisateur')
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