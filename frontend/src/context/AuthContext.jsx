import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [utilisateur, setUtilisateur]           = useState(null)
  const [chargement, setChargement]             = useState(true)
  const [selectionRequise, setSelectionRequise] = useState(false)
  const [etablissements, setEtablissements]     = useState([])
  const [utilisateurTemp, setUtilisateurTemp]   = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('utilisateur')
    const token    = localStorage.getItem('accessToken')
    if (userData && token) setUtilisateur(JSON.parse(userData))
    setChargement(false)
  }, [])

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
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('utilisateur', JSON.stringify(utilisateur))
    setUtilisateur(utilisateur)
    return utilisateur
  }

  const selectionnerEtablissement = async (maquis_id) => {
    const response = await api.post('/api/auth/selectionner', {
      utilisateur_id: utilisateurTemp.id,
      maquis_id
    })
    const { accessToken, utilisateur } = response.data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('utilisateur', JSON.stringify(utilisateur))
    setUtilisateur(utilisateur)
    setSelectionRequise(false)
    setUtilisateurTemp(null)
    setEtablissements([])
    return utilisateur
  }

  const logout = async () => {
    try { await api.post('/api/auth/logout') } catch {}
    localStorage.removeItem('accessToken')
    localStorage.removeItem('utilisateur')
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

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}