import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Pages (une seule interface universelle)
import Login       from './pages/Maquis/Login'
import Dashboard   from './pages/Maquis/Dashboard'
import Caisse      from './pages/Maquis/Caisse'
import Stock       from './pages/Maquis/Stock'
import Inventaire  from './pages/Maquis/Inventaire'
import Parametrage from './pages/Maquis/Parametrage'
import Tablette    from './pages/Maquis/Tablette'
import KDS         from './pages/Maquis/KDS'

// Admin
import AdminLogin     from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>

            {/* Login */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* App principale */}
            <Route path="/dashboard" element={
              <ProtectedRoute roles={['patron', 'gerant']}>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/caisse" element={
              <ProtectedRoute roles={['caissier', 'gerant', 'patron']}>
                <Layout><Caisse /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/stock" element={
              <ProtectedRoute roles={['gerant', 'patron']}>
                <Layout><Stock /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/inventaire" element={
              <ProtectedRoute roles={['gerant', 'patron']}>
                <Layout><Inventaire /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/parametrage" element={
              <ProtectedRoute roles={['gerant', 'patron']}>
                <Layout><Parametrage /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/tablette" element={
              <ProtectedRoute roles={['caissier', 'gerant', 'patron', 'serveur']}>
                <Layout><Tablette /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/kds" element={
              <ProtectedRoute roles={['caissier', 'gerant', 'patron', 'serveur']}>
                <Layout><KDS /></Layout>
              </ProtectedRoute>
            }/>

            {/* Admin */}
            <Route path="/admin/login"     element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />

          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App