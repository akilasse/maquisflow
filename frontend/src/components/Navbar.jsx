import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LIENS = [
  { path: '/commandes',   label: 'Commandes',   icone: '📝', roles: ['serveur', 'gerant', 'patron'] },
  { path: '/caisse',      label: 'Caisse',      icone: '🧾', roles: ['caissier', 'gerant', 'patron'] },
  { path: '/ventes',      label: 'Ventes',      icone: '📄', roles: ['caissier', 'gerant', 'patron'] },
  { path: '/dashboard',   label: 'Dashboard',   icone: '📊', roles: ['gerant', 'patron'] },
  { path: '/stock',       label: 'Stock',       icone: '📦', roles: ['gerant', 'patron'] },
  { path: '/inventaire',  label: 'Inventaire',  icone: '📋', roles: ['gerant', 'patron'] },
  { path: '/parametrage', label: 'Paramétrage', icone: '⚙️', roles: ['gerant', 'patron'] },
]

const Navbar = ({ menuOuvert, setMenuOuvert }) => {
  const location  = useLocation()
  const { utilisateur, logout } = useAuth()

  const couleur = (utilisateur?.maquis?.couleur_primaire && utilisateur.maquis.couleur_primaire !== 'null')
    ? utilisateur.maquis.couleur_primaire
    : '#FF6B35'

  const liensAutorises = LIENS.filter(l => {
    if (!l.roles.includes(utilisateur?.role)) return false
    if (l.path === '/commandes' && !utilisateur?.maquis?.module_commandes_actif) return false
    return true
  })

  const lienStyle = (actif) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px', borderRadius: '12px',
    color: 'white', textDecoration: 'none',
    fontSize: '14px', fontWeight: '500',
    backgroundColor: actif ? 'rgba(255,255,255,0.3)' : 'transparent',
    marginBottom: '4px',
    transition: 'background 0.15s'
  })

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside
        className={`sidebar ${menuOuvert ? 'sidebar-open' : ''}`}
        style={{
          display: 'flex', flexDirection: 'column',
          position: 'fixed', left: 0, top: 0,
          height: '100vh', width: '224px', zIndex: 100,
          backgroundColor: couleur,
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Header établissement */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {utilisateur?.maquis?.logo_url ? (
              <img src={utilisateur.maquis.logo_url} alt={utilisateur.maquis.nom}
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '18px', color: 'white'
              }}>
                {utilisateur?.maquis?.nom?.charAt(0)?.toUpperCase() || 'F'}
              </div>
            )}
            <div>
              <p style={{ color: 'white', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>
                {utilisateur?.maquis?.nom || 'Flowix'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0, textTransform: 'capitalize' }}>
                {utilisateur?.maquis?.activite || utilisateur?.maquis?.type || 'Commerce'} · {utilisateur?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {liensAutorises.map((lien) => (
            <Link key={lien.path} to={lien.path}
              style={lienStyle(location.pathname === lien.path)}
              onClick={() => setMenuOuvert && setMenuOuvert(false)}
              onMouseEnter={e => { if (location.pathname !== lien.path) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
              onMouseLeave={e => { if (location.pathname !== lien.path) e.currentTarget.style.backgroundColor = 'transparent' }}>
              <span style={{ fontSize: '20px' }}>{lien.icone}</span>
              <span>{lien.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer utilisateur */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <p style={{ color: 'white', fontSize: '13px', margin: '0 0 8px', fontWeight: '600' }}>
            {utilisateur?.nom}
          </p>
          <button onClick={logout} style={{
            width: '100%', backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white', padding: '8px', borderRadius: '12px',
            border: 'none', cursor: 'pointer', fontSize: '13px'
          }}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Bottom navigation mobile ── */}
      <nav className="bottom-nav" style={{ backgroundColor: 'white', borderTop: `3px solid ${couleur}22` }}>
        {liensAutorises.slice(0, 5).map((lien) => {
          const actif = location.pathname === lien.path
          return (
            <Link key={lien.path} to={lien.path} className="bottom-nav-item"
              style={{ color: actif ? couleur : '#9ca3af', borderTop: actif ? `3px solid ${couleur}` : '3px solid transparent' }}>
              <span style={{ fontSize: 22 }}>{lien.icone}</span>
              <span style={{ fontSize: 10, fontWeight: actif ? 700 : 500 }}>{lien.label}</span>
            </Link>
          )
        })}
        {/* Bouton déconnexion en dernier si peu de liens */}
        {liensAutorises.length <= 2 && (
          <button onClick={logout} className="bottom-nav-item"
            style={{ color: '#ef4444', borderTop: '3px solid transparent', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 22 }}>🚪</span>
            <span style={{ fontSize: 10, fontWeight: 500 }}>Quitter</span>
          </button>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          .hamburger-btn { display: none !important; }
          .bottom-nav { display: flex !important; }
        }
        @media (min-width: 769px) {
          .sidebar { transform: none !important; }
          .bottom-nav { display: none !important; }
          .sidebar-open { transform: none; }
        }
        .bottom-nav {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0;
          height: 62px; z-index: 100;
          align-items: stretch; justify-content: space-around;
          box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
        }
        .bottom-nav-item {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 2px; flex: 1;
          text-decoration: none; margin-top: -3px;
          padding-top: 3px;
          transition: color 0.15s;
        }
      `}</style>
    </>
  )
}

export default Navbar
