// ============================================================
// PROTECTED ROUTE - Protège les pages selon le rôle et le type
// Redirige vers /login si non connecté
// Redirige vers le bon espace si mauvais type
// ============================================================

import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, roles, type }) => {
  const { utilisateur, chargement } = useAuth()

  // Attend que l'auth soit chargée
  if (chargement) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  // Non connecté → redirige vers login
  if (!utilisateur) {
    return <Navigate to="/login" replace />
  }

  // Mauvais type → redirige vers le bon espace
  if (type && utilisateur.maquis?.type !== type) {
    if (utilisateur.maquis?.type === 'restaurant') {
      return <Navigate to="/resto/dashboard" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  // Mauvais rôle → redirige vers unauthorized
  if (roles && !roles.includes(utilisateur.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute