import { useEffect } from 'react'
import Navbar from './Navbar'
import { useAuth } from '../context/AuthContext'

const Layout = ({ children }) => {
  const { utilisateur } = useAuth()

  useEffect(() => {
    const couleur = (utilisateur?.maquis?.couleur_primaire && utilisateur.maquis.couleur_primaire !== 'null')
      ? utilisateur.maquis.couleur_primaire
      : '#FF6B35'
    document.documentElement.style.setProperty('--couleur-principale', couleur)
    document.documentElement.style.setProperty('--couleur-principale-light', couleur + '22')
  }, [utilisateur])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <Navbar />
      <main className="main-content" style={{ marginLeft: '224px', padding: '16px' }}>
        {children}
      </main>
      <style>{`
        :root {
          --couleur-principale: #FF6B35;
          --couleur-principale-light: #FF6B3522;
        }
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
            padding: 12px 10px 76px 10px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Layout
