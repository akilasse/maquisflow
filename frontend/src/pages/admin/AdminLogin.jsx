// ============================================================
// ADMIN LOGIN - Connexion super admin MaquisFlow
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
      const response = await axios.post('http://localhost:3000/api/admin/login', {
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
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 24
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0 }}>
            MaquisFlow Admin
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
              placeholder="admin@maquisflow.com"
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
          Accès restreint — MaquisFlow v1.0
        </p>
      </div>
    </div>
  )
}

export default AdminLogin