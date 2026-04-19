import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, roles }) => {
  const { utilisateur, chargement } = useAuth()

  if (chargement) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #f3f4f6', borderTop: '4px solid #FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!utilisateur) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(utilisateur.role)) {
    return <Navigate to="/caisse" replace />
  }

  return children
}

export default ProtectedRoute