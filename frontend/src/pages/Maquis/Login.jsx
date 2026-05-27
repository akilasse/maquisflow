import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

const Login = () => {
  const [email, setEmail]           = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur]         = useState('')
  const [chargement, setChargement] = useState(false)
  const { login, selectionRequise, etablissements, selectionnerEtablissement, utilisateurTemp, logout } = useAuth()
  const navigate = useNavigate()

  // --- Mot de passe oublié ---
  const [voirOubli, setVoirOubli]       = useState(false)
  const [emailOubli, setEmailOubli]     = useState('')
  const [oubliEnvoi, setOubliEnvoi]     = useState(false)
  const [oubliMsg, setOubliMsg]         = useState('')
  const [oubliErreur, setOubliErreur]   = useState('')

  const handleForgot = async (e) => {
    e.preventDefault()
    setOubliErreur('')
    setOubliMsg('')
    setOubliEnvoi(true)
    try {
      await api.post('/api/auth/forgot-password', { email: emailOubli })
      setOubliMsg('Si cet email est connu, un lien de réinitialisation vous a été envoyé. Vérifiez votre boîte mail.')
    } catch {
      setOubliErreur('Une erreur est survenue. Réessayez.')
    } finally {
      setOubliEnvoi(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    try {
      const resultat = await login(email, motDePasse)
      if (resultat?.selection_requise) return
      if (resultat.role === 'patron' || resultat.role === 'gerant') {
        navigate('/dashboard')
      } else if (resultat.role === 'serveur') {
        navigate('/commandes')
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
      } else if (utilisateur.role === 'serveur') {
        navigate('/commandes')
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
            <svg width="80" height="80" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 16px', display: 'block', filter: 'drop-shadow(0 8px 20px rgba(255,107,53,0.45))' }}>
              <defs>
                <linearGradient id="bgF" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF6B35"/>
                  <stop offset="100%" stopColor="#e8501a"/>
                </linearGradient>
              </defs>
              <rect width="256" height="256" rx="56" ry="56" fill="url(#bgF)"/>
              <circle cx="192" cy="71" r="56" fill="rgba(255,255,255,0.08)"/>
              <circle cx="51" cy="205" r="46" fill="rgba(255,255,255,0.06)"/>
              <text x="128" y="174" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="148" fill="white" textAnchor="middle" letterSpacing="-2">F</text>
              <rect x="71" y="194" width="112" height="11" rx="5" fill="rgba(255,255,255,0.5)"/>
              <circle cx="184" cy="87" r="11" fill="rgba(255,255,255,0.7)"/>
            </svg>
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
          <svg width="80" height="80" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 16px', display: 'block', filter: 'drop-shadow(0 8px 20px rgba(255,107,53,0.45))' }}>
              <defs>
                <linearGradient id="bgF" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF6B35"/>
                  <stop offset="100%" stopColor="#e8501a"/>
                </linearGradient>
              </defs>
              <rect width="256" height="256" rx="56" ry="56" fill="url(#bgF)"/>
              <circle cx="192" cy="71" r="56" fill="rgba(255,255,255,0.08)"/>
              <circle cx="51" cy="205" r="46" fill="rgba(255,255,255,0.06)"/>
              <text x="128" y="174" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="148" fill="white" textAnchor="middle" letterSpacing="-2">F</text>
              <rect x="71" y="194" width="112" height="11" rx="5" fill="rgba(255,255,255,0.5)"/>
              <circle cx="184" cy="87" r="11" fill="rgba(255,255,255,0.7)"/>
            </svg>
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

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => { setVoirOubli(true); setOubliMsg(''); setOubliErreur(''); setEmailOubli('') }}
            style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 13, cursor: 'pointer', fontWeight: 600, padding: 0 }}>
            Mot de passe oublié ?
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 16 }}>
          Flowix — Gestion commerciale
        </p>
      </div>

      {/* Modal mot de passe oublié */}
      {voirOubli && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#111827' }}>🔑 Mot de passe oublié</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
              Entrez l'adresse email utilisée lors de la création de votre compte. Vous recevrez un lien pour réinitialiser votre mot de passe.
            </p>
            {oubliMsg ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 16 }}>
                ✅ {oubliMsg}
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <input
                  type="email" value={emailOubli} onChange={e => setEmailOubli(e.target.value)}
                  placeholder="votre@email.com" required
                  style={{ width: '100%', padding: '13px 16px', fontSize: 14, border: '2px solid #f3f4f6', borderRadius: 10, boxSizing: 'border-box', marginBottom: 12, outline: 'none', backgroundColor: '#f9fafb' }}
                  onFocus={e => { e.target.style.borderColor = '#FF6B35'; e.target.style.backgroundColor = 'white' }}
                  onBlur={e => { e.target.style.borderColor = '#f3f4f6'; e.target.style.backgroundColor = '#f9fafb' }}
                />
                {oubliErreur && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
                    ⚠️ {oubliErreur}
                  </div>
                )}
                <button type="submit" disabled={oubliEnvoi}
                  style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: oubliEnvoi ? '#9ca3af' : 'linear-gradient(135deg, #FF6B35, #ff8c5a)', color: 'white', fontSize: 14, fontWeight: 700, cursor: oubliEnvoi ? 'not-allowed' : 'pointer' }}>
                  {oubliEnvoi ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
            )}
            <button onClick={() => setVoirOubli(false)}
              style={{ width: '100%', marginTop: 12, padding: '11px', borderRadius: 10, border: '2px solid #f3f4f6', background: 'white', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ← Retour à la connexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login