import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const LIENS = [
  { path: '/commandes',   label: 'Commandes',   icone: '📝', roles: ['serveur', 'gerant', 'patron'], moduleCommandes: true },
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
  const [alertes, setAlertes] = useState([])
  const [panneauAlerte, setPanneauAlerte] = useState(false)
  const alerteRef = useRef(null)

  useEffect(() => {
    const roles = ['caissier', 'gerant', 'patron']
    if (!utilisateur?.role || !roles.includes(utilisateur.role)) return
    const charger = () => api.get('/api/stock/alertes').then(r => setAlertes(r.data.data || [])).catch(() => {})
    charger()
    const timer = setInterval(charger, 60000)
    return () => clearInterval(timer)
  }, [utilisateur?.maquis_id])

  useEffect(() => {
    const fermer = (e) => { if (alerteRef.current && !alerteRef.current.contains(e.target)) setPanneauAlerte(false) }
    document.addEventListener('mousedown', fermer)
    return () => document.removeEventListener('mousedown', fermer)
  }, [])

  const couleur = (utilisateur?.maquis?.couleur_primaire && utilisateur.maquis.couleur_primaire !== 'null')
    ? utilisateur.maquis.couleur_primaire
    : '#FF6B35'

  const liensAutorises = LIENS.filter(l => {
    if (!l.roles.includes(utilisateur?.role)) return false
    if (l.moduleCommandes && !utilisateur?.maquis?.module_commandes_actif) return false
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
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }} ref={alerteRef}>
          {/* Cloche alertes */}
          {alertes.length > 0 && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <button onClick={() => setPanneauAlerte(v => !v)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: panneauAlerte ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)',
                color: 'white', padding: '8px 12px', borderRadius: '10px',
                border: '1px solid rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
              }}>
                <span>🔔 Alertes stock</span>
                <span style={{
                  backgroundColor: '#ef4444', color: 'white',
                  borderRadius: '50%', width: '20px', height: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '700', flexShrink: 0
                }}>{alertes.length}</span>
              </button>
              {panneauAlerte && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '6px',
                  backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  overflow: 'hidden', zIndex: 200
                }}>
                  <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#991b1b' }}>
                      ⚠️ {alertes.length} produit(s) en rupture ou sous seuil
                    </p>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                    {alertes.map(p => (
                      <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #f9fafb' }}>
                        <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{p.nom}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: parseFloat(p.stock_actuel) <= 0 ? '#dc2626' : '#f59e0b', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          {parseFloat(p.stock_actuel)} {p.unite}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
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
        {/* Cloche alertes mobile */}
        {alertes.length > 0 && (
          <button onClick={() => setPanneauAlerte(v => !v)} className="bottom-nav-item"
            style={{ color: '#ef4444', borderTop: panneauAlerte ? '3px solid #ef4444' : '3px solid transparent', background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
            <span style={{ fontSize: 22, position: 'relative' }}>
              🔔
              <span style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: 15, height: 15, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{alertes.length}</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: 500 }}>Alertes</span>
          </button>
        )}
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
