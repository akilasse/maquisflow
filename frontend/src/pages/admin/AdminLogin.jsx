// ============================================================
// ADMIN LOGIN - Connexion super admin Flowix
// Accessible sur /admin/login — indépendant du login client
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const AdminLogin = () => {
  const [email, setEmail]         = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur]       = useState('')
  const [chargement, setChargement] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/login`, {
        email, mot_de_passe: motDePasse
      })
      const { token, admin } = response.data.data
      localStorage.setItem('adminToken', token)
      localStorage.setItem('adminInfo', JSON.stringify(admin))
      navigate('/admin/dashboard')
    } catch (error) {
      setErreur(error.response?.data?.message || 'Erreur de connexion')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        backgroundColor: '#1e293b', borderRadius: 16, padding: '40px 36px',
        width: '100%', maxWidth: 420, border: '1px solid #334155'
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <svg width="72" height="72" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 16px', display: 'block', filter: 'drop-shadow(0 8px 20px rgba(255,107,53,0.45))' }}>
            <defs>
              <linearGradient id="bgFa" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF6B35"/>
                <stop offset="100%" stopColor="#e8501a"/>
              </linearGradient>
            </defs>
            <rect width="256" height="256" rx="56" ry="56" fill="url(#bgFa)"/>
            <circle cx="192" cy="71" r="56" fill="rgba(255,255,255,0.08)"/>
            <circle cx="51" cy="205" r="46" fill="rgba(255,255,255,0.06)"/>
            <text x="128" y="174" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="148" fill="white" textAnchor="middle" letterSpacing="-2">F</text>
            <rect x="71" y="194" width="112" height="11" rx="5" fill="rgba(255,255,255,0.5)"/>
            <circle cx="184" cy="87" r="11" fill="rgba(255,255,255,0.7)"/>
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0 }}>
            Flowix Admin
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
            Panneau d'administration
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@Flowix.com"
              required
              style={{
                width: '100%', padding: '12px 14px', fontSize: 15,
                backgroundColor: '#0f172a', border: '1px solid #334155',
                borderRadius: 10, color: 'white', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={motDePasse}
              onChange={e => setMotDePasse(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '12px 14px', fontSize: 15,
                backgroundColor: '#0f172a', border: '1px solid #334155',
                borderRadius: 10, color: 'white', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>

          {erreur && (
            <div style={{
              backgroundColor: '#450a0a', border: '1px solid #7f1d1d',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontSize: 14, color: '#fca5a5'
            }}>
              {erreur}
            </div>
          )}

          <button
            type="submit"
            disabled={chargement}
            style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: chargement ? '#334155' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: chargement ? 'not-allowed' : 'pointer'
            }}
          >
            {chargement ? 'Connexion...' : '⚡ Accéder au panneau admin'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24 }}>
          Accès restreint — Flowix v1.0
        </p>
      </div>
    </div>
  )
}

export default AdminLogin