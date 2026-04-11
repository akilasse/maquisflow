import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'



// Pages Maquis
import Login from './pages/maquis/Login'
import Dashboard       from './pages/maquis/Dashboard'
import Caisse          from './pages/maquis/Caisse'
import Stock           from './pages/maquis/Stock'
import Inventaire      from './pages/maquis/Inventaire'
import Parametrage     from './pages/maquis/Parametrage'

// Pages Restaurant
import DashboardResto   from './pages/resto/Dashboard'
import CaisseResto      from './pages/resto/Caisse'
import StockResto       from './pages/resto/Stock'
import InventaireResto  from './pages/resto/Inventaire'
import ParametrageResto from './pages/resto/Parametrage'

// page admin
import AdminLogin     from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

// Redirige vers le bon espace selon le type de l'utilisateur connecté
const RedirectParType = () => {
  const userData = localStorage.getItem('utilisateur')
  if (!userData) return <Navigate to="/login" replace />
  const utilisateur = JSON.parse(userData)
  if (utilisateur?.maquis?.type === 'restaurant') {
    return <Navigate to="/resto/dashboard" replace />
  }
  return <Navigate to="/dashboard" replace />
}

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>

            {/* Page de connexion commune */}
            <Route path="/login" element={<Login />} />

            {/* Redirection racine selon le type */}
            <Route path="/" element={<RedirectParType />} />

            {/* ── ESPACE MAQUIS ── */}
            <Route path="/dashboard" element={
              <ProtectedRoute roles={['patron', 'gerant']} type="maquis">
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/caisse" element={
              <ProtectedRoute roles={['caissier', 'gerant', 'patron']} type="maquis">
                <Layout><Caisse /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/stock" element={
              <ProtectedRoute roles={['gerant', 'patron']} type="maquis">
                <Layout><Stock /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/inventaire" element={
              <ProtectedRoute roles={['gerant', 'patron']} type="maquis">
                <Layout><Inventaire /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/parametrage" element={
              <ProtectedRoute roles={['gerant', 'patron']} type="maquis">
                <Layout><Parametrage /></Layout>
              </ProtectedRoute>
            }/>

            {/* ── ESPACE RESTAURANT ── */}
            <Route path="/resto/dashboard" element={
              <ProtectedRoute roles={['patron', 'gerant']} type="restaurant">
                <Layout><DashboardResto /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/resto/caisse" element={
              <ProtectedRoute roles={['caissier', 'gerant', 'patron']} type="restaurant">
                <Layout><CaisseResto /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/resto/stock" element={
              <ProtectedRoute roles={['gerant', 'patron']} type="restaurant">
                <Layout><StockResto /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/resto/inventaire" element={
              <ProtectedRoute roles={['gerant', 'patron']} type="restaurant">
                <Layout><InventaireResto /></Layout>
              </ProtectedRoute>
            }/>
            <Route path="/resto/parametrage" element={
              <ProtectedRoute roles={['gerant', 'patron']} type="restaurant">
                <Layout><ParametrageResto /></Layout>
              </ProtectedRoute>
            }/>

            {/* ── ESPACE ADMIN ── */}
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