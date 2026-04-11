import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LIENS_MAQUIS = [
  { path: '/caisse',      label: 'Caisse',      icone: '🧾', roles: ['caissier', 'gerant', 'patron'] },
  { path: '/stock',       label: 'Stock',       icone: '📦', roles: ['gerant', 'patron'] },
  { path: '/inventaire',  label: 'Inventaire',  icone: '📋', roles: ['gerant', 'patron'] },
  { path: '/dashboard',   label: 'Dashboard',   icone: '📊', roles: ['gerant', 'patron'] },
  { path: '/parametrage', label: 'Paramétrage', icone: '⚙️', roles: ['gerant', 'patron'] },
]

const LIENS_RESTO = [
  { path: '/resto/caisse',      label: 'Caisse',      icone: '🧾', roles: ['caissier', 'gerant', 'patron'] },
  { path: '/resto/stock',       label: 'Stock',       icone: '📦', roles: ['gerant', 'patron'] },
  { path: '/resto/inventaire',  label: 'Inventaire',  icone: '📋', roles: ['gerant', 'patron'] },
  { path: '/resto/dashboard',   label: 'Dashboard',   icone: '📊', roles: ['gerant', 'patron'] },
  { path: '/resto/parametrage', label: 'Paramétrage', icone: '⚙️', roles: ['gerant', 'patron'] },
]

const Navbar = () => {
  const location   = useLocation()
  const { utilisateur, logout } = useAuth()

  const isResto = utilisateur?.maquis?.type === 'restaurant'
  const liens   = isResto ? LIENS_RESTO : LIENS_MAQUIS

  const liensAutorises = liens.filter(l => l.roles.includes(utilisateur?.role))

  const couleur = (utilisateur?.maquis?.couleur_primaire && utilisateur.maquis.couleur_primaire !== 'null')
    ? utilisateur.maquis.couleur_primaire
    : isResto ? '#1D4ED8' : '#FF6B35'

  const sidebarStyle = {
    display: 'flex', flexDirection: 'column',
    position: 'fixed', left: 0, top: 0,
    height: '100vh', width: '224px', zIndex: 100,
    backgroundColor: couleur,
    boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
  }

  const lienStyle = (actif) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px', borderRadius: '12px',
    color: 'white', textDecoration: 'none',
    fontSize: '14px', fontWeight: '500',
    backgroundColor: actif ? 'rgba(255,255,255,0.3)' : 'transparent',
    marginBottom: '4px'
  })

  return (
    <aside style={sidebarStyle}>

      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px',
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '18px', color: 'white'
          }}>
            {isResto ? '🍽️' : utilisateur?.maquis?.nom?.charAt(0) || 'M'}
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>
              {utilisateur?.maquis?.nom || 'MaquisFlow'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: 0 }}>
              {isResto ? 'Restaurant' : 'Maquis'} · <span style={{ textTransform: 'capitalize' }}>{utilisateur?.role}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px' }}>
        {liensAutorises.map((lien) => (
          <Link
            key={lien.path}
            to={lien.path}
            style={lienStyle(location.pathname === lien.path)}
            onMouseEnter={e => { if (location.pathname !== lien.path) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { if (location.pathname !== lien.path) e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <span style={{ fontSize: '20px' }}>{lien.icone}</span>
            <span>{lien.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <p style={{ color: 'white', fontSize: '14px', margin: '0 0 8px 0', fontWeight: '500' }}>
          {utilisateur?.nom}
        </p>
        <button
          onClick={logout}
          style={{
            width: '100%', backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white', padding: '8px', borderRadius: '12px',
            border: 'none', cursor: 'pointer', fontSize: '14px'
          }}
        >
          Déconnexion
        </button>
      </div>

    </aside>
  )
}

export default Navbar