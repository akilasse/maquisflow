// ============================================================
// PAGE LOGIN - Connexion à l'application
// Choix de l'espace (Maquis ou Restaurant) avant connexion
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ESPACES = [
  {
    type:        'maquis',
    label:       'Maquis',
    description: 'Bar & boissons',
    icone:       '🍺',
    bg:          '#FF6B35',
    bgHover:     '#e55a24',
  },
  {
    type:        'restaurant',
    label:       'Restaurant',
    description: 'Cuisine & repas',
    icone:       '🍽️',
    bg:          '#1D4ED8',
    bgHover:     '#1a43c0',
  },
]

const Login = () => {
  const [type, setType]           = useState('maquis')
  const [email, setEmail]         = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur]       = useState('')
  const [chargement, setChargement] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    try {
      const utilisateur = await login(email, motDePasse, type)

      // Redirige selon le rôle
      if (utilisateur.role === 'patron' || utilisateur.role === 'gerant') {
        navigate('/dashboard')
      } else {
        navigate('/caisse')
      }
    } catch (error) {
      setErreur(error.response?.data?.message || 'Erreur de connexion')
    } finally {
      setChargement(false)
    }
  }

  const espaceActif = ESPACES.find(e => e.type === type)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '36px 32px', width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: 72, height: 72, background: espaceActif.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', transition: 'background 0.3s', fontSize: 32 }}>
            {espaceActif.icone}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>MaquisFlow</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Gestion commerciale</p>
        </div>

        {/* Choix de l'espace */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, textAlign: 'center' }}>
            Choisissez votre espace
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {ESPACES.map(espace => (
              <button
                key={espace.type}
                type="button"
                onClick={() => { setType(espace.type); setErreur('') }}
                style={{
                  padding: '14px 10px',
                  borderRadius: 12,
                  border: type === espace.type ? `2px solid ${espace.bg}` : '2px solid #e5e7eb',
                  backgroundColor: type === espace.type ? espace.bg : 'white',
                  color: type === espace.type ? 'white' : '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 26 }}>{espace.icone}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{espace.label}</span>
                <span style={{ fontSize: 11, opacity: 0.85 }}>{espace.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              style={{
                width: '100%', padding: '12px 14px', fontSize: 15,
                border: '1px solid #e5e7eb', borderRadius: 10,
                boxSizing: 'border-box', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = espaceActif.bg}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Mot de passe */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '12px 14px', fontSize: 15,
                border: '1px solid #e5e7eb', borderRadius: 10,
                boxSizing: 'border-box', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = espaceActif.bg}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Erreur */}
          {erreur && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '12px 14px', fontSize: 14, marginBottom: 14 }}>
              {erreur}
            </div>
          )}

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={chargement}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              backgroundColor: chargement ? '#9ca3af' : espaceActif.bg,
              color: 'white', fontSize: 16, fontWeight: 700,
              cursor: chargement ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              marginTop: 4,
            }}
          >
            {chargement ? 'Connexion...' : `Se connecter — ${espaceActif.label}`}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 20 }}>
          MaquisFlow v1.0 — Gestion commerciale
        </p>
      </div>
    </div>
  )
}

export default Login