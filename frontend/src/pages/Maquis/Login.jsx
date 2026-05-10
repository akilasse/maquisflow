import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Login = () => {
  const [email, setEmail]           = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur]         = useState('')
  const [chargement, setChargement] = useState(false)
  const { login, selectionRequise, etablissements, selectionnerEtablissement, utilisateurTemp, logout } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    try {
      const resultat = await login(email, motDePasse)
      if (resultat?.selection_requise) return
      if (resultat.role === 'patron' || resultat.role === 'gerant') {
        navigate('/dashboard')
      } else {
        navigate('/caisse')
      }
    } catch (error) {
      setErreur(error.response?.data?.message || 'Email ou mot de passe incorrect')
    } finally {
      setChargement(false)
    }
  }

  const handleSelection = async (maquis_id) => {
    setChargement(true)
    setErreur('')
    try {
      const utilisateur = await selectionnerEtablissement(maquis_id)
      if (utilisateur.role === 'patron' || utilisateur.role === 'gerant') {
        navigate('/dashboard')
      } else {
        navigate('/caisse')
      }
    } catch (error) {
      setErreur(error.response?.data?.message || 'Erreur de sélection')
    } finally {
      setChargement(false)
    }
  }

  const retourLogin = () => {
    logout()
    setErreur('')
  }

  // Écran sélection établissement
  if (selectionRequise && etablissements.length > 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FF6B35 0%, #ff8c5a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: '40px 36px', width: '100%', maxWidth: '480px' }}>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #FF6B35, #ff8c5a)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36 }}>⚡</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>Choisir un établissement</h1>
            <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 6 }}>Bonjour {utilisateurTemp?.nom}, sélectionnez votre espace</p>
          </div>

          {erreur && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '12px 14px', fontSize: 14, marginBottom: 16 }}>
              ⚠️ {erreur}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {etablissements.map(etab => (
              <button
                key={etab.maquis_id}
                onClick={() => handleSelection(etab.maquis_id)}
                disabled={chargement}
                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '14px', border: `2px solid ${etab.couleur_primaire || '#FF6B35'}`, backgroundColor: 'white', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff7f4'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                {etab.logo_url ? (
                  <img src={etab.logo_url} alt={etab.nom} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: etab.couleur_primaire || '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'white', fontWeight: 700, flexShrink: 0 }}>
                    {etab.nom?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111827' }}>{etab.nom}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9ca3af' }}>
                    {etab.activite || etab.type} · <span style={{ textTransform: 'capitalize', color: etab.couleur_primaire || '#FF6B35' }}>{etab.role}</span>
                  </p>
                </div>
                <span style={{ fontSize: 20, color: etab.couleur_primaire || '#FF6B35' }}>→</span>
              </button>
            ))}
          </div>

          {/* Bouton retour */}
          <button
            onClick={retourLogin}
            style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px solid #f3f4f6', backgroundColor: 'white', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            ← Changer de compte
          </button>

          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 20 }}>
            Flowix — Gestion commerciale
          </p>
        </div>
      </div>
    )
  }

  // Écran login
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FF6B35 0%, #ff8c5a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: '40px 36px', width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #FF6B35, #ff8c5a)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(255,107,53,0.35)', fontSize: 36 }}>⚡</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>Flowix</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 6 }}>Gestion commerciale intelligente</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Email ou login</label>
            <input
              type="text" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email ou identifiant" required autoCapitalize="none"
              style={{ width: '100%', padding: '13px 16px', fontSize: 15, border: '2px solid #f3f4f6', borderRadius: 12, boxSizing: 'border-box', outline: 'none', backgroundColor: '#f9fafb', transition: 'all 0.2s' }}
              onFocus={e => { e.target.style.borderColor = '#FF6B35'; e.target.style.backgroundColor = 'white' }}
              onBlur={e => { e.target.style.borderColor = '#f3f4f6'; e.target.style.backgroundColor = '#f9fafb' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Mot de passe</label>
            <input
              type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)}
              placeholder="••••••••" required
              style={{ width: '100%', padding: '13px 16px', fontSize: 15, border: '2px solid #f3f4f6', borderRadius: 12, boxSizing: 'border-box', outline: 'none', backgroundColor: '#f9fafb', transition: 'all 0.2s' }}
              onFocus={e => { e.target.style.borderColor = '#FF6B35'; e.target.style.backgroundColor = 'white' }}
              onBlur={e => { e.target.style.borderColor = '#f3f4f6'; e.target.style.backgroundColor = '#f9fafb' }}
            />
          </div>

          {erreur && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '12px 14px', fontSize: 14, marginBottom: 16 }}>
              ⚠️ {erreur}
            </div>
          )}

          <button type="submit" disabled={chargement}
            style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: chargement ? '#9ca3af' : 'linear-gradient(135deg, #FF6B35, #ff8c5a)', color: 'white', fontSize: 16, fontWeight: 700, cursor: chargement ? 'not-allowed' : 'pointer', boxShadow: chargement ? 'none' : '0 8px 20px rgba(255,107,53,0.35)', transition: 'all 0.2s' }}>
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 }}>
          Flowix — Gestion commerciale
        </p>
      </div>
    </div>
  )
}

export default Login