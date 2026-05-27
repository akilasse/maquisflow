import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'

const ResetPassword = () => {
  const [params]          = useSearchParams()
  const navigate          = useNavigate()
  const token             = params.get('token') || ''
  const [mdp, setMdp]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [erreur, setErreur]   = useState('')
  const [succes, setSucces]   = useState(false)
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    if (!token) {
      setErreur('Lien invalide ou expiré.')
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    if (mdp.length < 6) return setErreur('Le mot de passe doit faire au moins 6 caractères.')
    if (mdp !== confirm) return setErreur('Les mots de passe ne correspondent pas.')
    setChargement(true)
    try {
      await api.post('/api/auth/reset-password', { token, mot_de_passe: mdp })
      setSucces(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setErreur(err.response?.data?.message || 'Lien invalide ou expiré. Refaites une demande.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FF6B35 0%, #ff8c5a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: '40px 36px', width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #FF6B35, #ff8c5a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
            🔑
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Nouveau mot de passe</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>Choisissez un nouveau mot de passe sécurisé</p>
        </div>

        {succes ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 12, padding: '16px 18px', textAlign: 'center', fontSize: 14 }}>
            ✅ Mot de passe mis à jour avec succès !<br/>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Redirection vers la connexion...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Nouveau mot de passe</label>
              <input
                type="password" value={mdp} onChange={e => setMdp(e.target.value)}
                placeholder="Au moins 6 caractères" required
                style={{ width: '100%', padding: '13px 16px', fontSize: 14, border: '2px solid #f3f4f6', borderRadius: 10, boxSizing: 'border-box', outline: 'none', backgroundColor: '#f9fafb' }}
                onFocus={e => { e.target.style.borderColor = '#FF6B35'; e.target.style.backgroundColor = 'white' }}
                onBlur={e => { e.target.style.borderColor = '#f3f4f6'; e.target.style.backgroundColor = '#f9fafb' }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Confirmer le mot de passe</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Répétez le mot de passe" required
                style={{ width: '100%', padding: '13px 16px', fontSize: 14, border: '2px solid #f3f4f6', borderRadius: 10, boxSizing: 'border-box', outline: 'none', backgroundColor: '#f9fafb' }}
                onFocus={e => { e.target.style.borderColor = '#FF6B35'; e.target.style.backgroundColor = 'white' }}
                onBlur={e => { e.target.style.borderColor = '#f3f4f6'; e.target.style.backgroundColor = '#f9fafb' }}
              />
            </div>

            {erreur && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
                ⚠️ {erreur}
              </div>
            )}

            <button type="submit" disabled={chargement || !token}
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: (chargement || !token) ? '#9ca3af' : 'linear-gradient(135deg, #FF6B35, #ff8c5a)', color: 'white', fontSize: 15, fontWeight: 700, cursor: (chargement || !token) ? 'not-allowed' : 'pointer', boxShadow: '0 6px 18px rgba(255,107,53,0.3)' }}>
              {chargement ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        )}

        <button onClick={() => navigate('/login')}
          style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 10, border: '2px solid #f3f4f6', background: 'white', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          ← Retour à la connexion
        </button>

        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 20 }}>Flowix — Gestion commerciale</p>
      </div>
    </div>
  )
}

export default ResetPassword
