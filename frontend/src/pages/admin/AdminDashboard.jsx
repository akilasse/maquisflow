// ============================================================
// ADMIN DASHBOARD - Panneau super admin Flowix
// ============================================================

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const api = () => axios.create({
  baseURL: '/api/admin',
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
})

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
const fmtNum  = (n) => Number(n || 0).toLocaleString('fr-FR')

const STATUT_COLORS = {
  actif:    { bg: '#f0fdf4', color: '#16a34a' },
  expire:   { bg: '#fef2f2', color: '#dc2626' },
  suspendu: { bg: '#fef9c3', color: '#a16207' },
  essai:    { bg: '#eff6ff', color: '#2563eb' },
}

// Activités avec couleurs automatiques
const ACTIVITES = [
  { label: '🍺 Maquis / Bar',       value: 'Maquis',       couleur: '#FF6B35' },
  { label: '🍽️ Restaurant',         value: 'Restaurant',   couleur: '#1D4ED8' },
  { label: '🛍️ Boutique',           value: 'Boutique',     couleur: '#7C3AED' },
  { label: '💊 Pharmacie',           value: 'Pharmacie',    couleur: '#16A34A' },
  { label: '✂️ Salon / Coiffure',   value: 'Salon',        couleur: '#EC4899' },
  { label: '🏪 Épicerie',            value: 'Épicerie',     couleur: '#F59E0B' },
  { label: '🔧 Quincaillerie',       value: 'Quincaillerie',couleur: '#6B7280' },
  { label: '🏨 Hôtel',               value: 'Hôtel',        couleur: '#0EA5E9' },
  { label: '🎓 École / Formation',   value: 'École',        couleur: '#8B5CF6' },
  { label: '🏥 Clinique / Médecin',  value: 'Clinique',     couleur: '#14B8A6' },
  { label: '🍕 Fast Food',           value: 'Fast Food',    couleur: '#EF4444' },
  { label: '🏋️ Salle de sport',     value: 'Sport',        couleur: '#F97316' },
  { label: '🛺 Autre commerce',      value: 'Autre',        couleur: '#FF6B35' },
]

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [onglet, setOnglet]                       = useState('dashboard')
  const [stats, setStats]                         = useState(null)
  const [maquis, setMaquis]                       = useState([])
  const [maquisSelectionne, setMaquisSelectionne] = useState(null)
  const [chargement, setChargement]               = useState(true)
  const [message, setMessage]                     = useState(null)
  const [modal, setModal]                         = useState(null)
  const [logoFichier, setLogoFichier]             = useState(null)
  const [logoPreview, setLogoPreview]             = useState(null)
  const [editMaquis, setEditMaquis]               = useState(null) // { id, nom, couleur_primaire, activite, devise }

  const [formMaquis, setFormMaquis] = useState({
    nom: '', activite: '', couleur_primaire: '#FF6B35', type_acces: 'abonnement', periodicite: 'mensuel', montant: '35000',
  })

  const admin = JSON.parse(localStorage.getItem('adminInfo') || '{}')

  const afficherMessage = (type, texte) => {
    setMessage({ type, texte })
    setTimeout(() => setMessage(null), 4000)
  }

  const charger = async () => {
    try {
      const [s, m] = await Promise.all([
        api().get('/dashboard'),
        api().get('/maquis')
      ])
      setStats(s.data.data)
      const maquisData = m.data.data
      setMaquis(maquisData)
      if (maquisSelectionne) {
        const updated = maquisData.find(m => m.id === maquisSelectionne.id)
        if (updated) setMaquisSelectionne(updated)
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken')
        navigate('/admin/login')
      }
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) { navigate('/admin/login'); return }
    charger()
  }, [])

  const logout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminInfo')
    navigate('/admin/login')
  }

  const toggleMaquis = async (id, actif) => {
    try {
      await api().put(`/maquis/${id}`, { actif: !actif })
      afficherMessage('succes', actif ? 'Établissement désactivé' : 'Établissement activé')
      charger()
    } catch { afficherMessage('erreur', 'Erreur') }
  }

  const renouvelerAbonnement = async (maquisId) => {
    try {
      await api().put(`/maquis/${maquisId}/abonnement`, {
        statut: 'actif', mode_paiement: 'wave', note: 'Renouvellement manuel'
      })
      afficherMessage('succes', 'Abonnement renouvelé (+1 mois)')
      charger()
    } catch { afficherMessage('erreur', 'Erreur renouvellement') }
  }

  const suspendreAbonnement = async (maquisId) => {
    try {
      await api().put(`/maquis/${maquisId}/abonnement`, { statut: 'suspendu' })
      afficherMessage('succes', 'Abonnement suspendu')
      charger()
    } catch { afficherMessage('erreur', 'Erreur') }
  }

  const calculerEcheance = (periodicite) => {
    const date = new Date()
    if (periodicite === 'mensuel') date.setMonth(date.getMonth() + 1)
    if (periodicite === 'annuel')  date.setFullYear(date.getFullYear() + 1)
    return date.toISOString()
  }

  const selectionnerActivite = (activite) => {
    setFormMaquis({ ...formMaquis, activite: activite.value, couleur_primaire: activite.couleur })
  }

  const handleLogoChange = (e) => {
    const fichier = e.target.files[0]
    if (fichier) {
      setLogoFichier(fichier)
      setLogoPreview(URL.createObjectURL(fichier))
    }
  }

  const creerMaquis = async (e) => {
    e.preventDefault()
    try {
      // Détermine le type selon l'activité
      const type = formMaquis.activite === 'Restaurant' || formMaquis.activite === 'Fast Food' ? 'restaurant' : 'maquis'

      const res = await api().post('/maquis', {
        nom:           formMaquis.nom,
        type,
        activite:      formMaquis.activite,
        couleur_primaire: formMaquis.couleur_primaire,
        type_acces:    formMaquis.type_acces,
        periodicite:   formMaquis.type_acces === 'abonnement' ? formMaquis.periodicite : null,
        montant:       parseFloat(formMaquis.montant),
        date_echeance: formMaquis.type_acces === 'abonnement' ? calculerEcheance(formMaquis.periodicite) : null,
      })

      // Upload logo si sélectionné
      if (logoFichier && res.data.data?.id) {
        const formData = new FormData()
        formData.append('logo', logoFichier)
        await axios.post(`/api/admin/maquis/${res.data.data.id}/logo`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      }

      afficherMessage('succes', 'Établissement créé !')
      setModal(null)
      setFormMaquis({ nom: '', activite: '', couleur_primaire: '#FF6B35', type_acces: 'abonnement', periodicite: 'mensuel', montant: '35000' })
      setLogoFichier(null)
      setLogoPreview(null)
      charger()
    } catch (err) { afficherMessage('erreur', err.response?.data?.message || 'Erreur') }
  }

  const creerUtilisateur = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    try {
      await api().post('/utilisateurs', {
        nom:          form.get('nom'),
        email:        form.get('email'),
        mot_de_passe: form.get('mot_de_passe'),
        role:         form.get('role'),
        maquis_id:    parseInt(form.get('maquis_id'))
      })
      afficherMessage('succes', 'Utilisateur créé !')
      setModal(null)
      await charger()
    } catch (err) { afficherMessage('erreur', err.response?.data?.message || 'Erreur') }
  }

  const sauvegarderMaquis = async () => {
    try {
      await api().put(`/maquis/${editMaquis.id}`, {
        nom:              editMaquis.nom,
        couleur_primaire: editMaquis.couleur_primaire,
        activite:         editMaquis.activite,
        devise:           editMaquis.devise,
      })
      afficherMessage('succes', 'Établissement mis à jour !')
      setEditMaquis(null)
      await charger()
    } catch { afficherMessage('erreur', 'Erreur lors de la mise à jour') }
  }

  const toggleUser = async (utilisateur_id, maquis_id, actif) => {
    try {
      await api().put('/utilisateurs/toggle', { utilisateur_id, maquis_id, actif: !actif })
      afficherMessage('succes', actif ? 'Utilisateur désactivé' : 'Utilisateur activé')
      await charger()
    } catch { afficherMessage('erreur', 'Erreur') }
  }

  const S = {
    sidebar: { width: 220, minHeight: '100vh', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0 },
    main:    { marginLeft: 220, padding: 24, backgroundColor: '#f8fafc', minHeight: '100vh', width: 'calc(100% - 220px)' },
    card:    { backgroundColor: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px' },
    btn:     (bg = '#6366f1') => ({ padding: '8px 16px', backgroundColor: bg, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }),
    input:   { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 10 },
  }

  if (chargement) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0f172a' }}>
      <p style={{ color: 'white', fontSize: 16 }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex' }}>

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>Flowix</p>
              <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>Super Admin</p>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: 12 }}>
          {[
            { key: 'dashboard',   label: 'Dashboard',      icone: '📊' },
            { key: 'maquis',      label: 'Établissements', icone: '🏪' },
            { key: 'abonnements', label: 'Abonnements',    icone: '💳' },
          ].map(item => (
            <button key={item.key} onClick={() => { setOnglet(item.key); setMaquisSelectionne(null) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: onglet === item.key ? '#1e293b' : 'transparent', color: onglet === item.key ? 'white' : '#64748b', fontSize: 14, fontWeight: 500, marginBottom: 4, textAlign: 'left' }}>
              <span style={{ fontSize: 18 }}>{item.icone}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: 12, borderTop: '1px solid #1e293b' }}>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 8px', paddingLeft: 12 }}>{admin.nom}</p>
          <button onClick={logout} style={{ ...S.btn('#334155'), width: '100%' }}>Déconnexion</button>
        </div>
      </aside>

      {/* Contenu */}
      <main style={S.main}>

        {message && (
          <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, backgroundColor: message.type === 'succes' ? '#f0fdf4' : '#fef2f2', color: message.type === 'succes' ? '#16a34a' : '#dc2626', border: `1px solid ${message.type === 'succes' ? '#bbf7d0' : '#fecaca'}` }}>
            {message.texte}
          </div>
        )}

        {/* DASHBOARD */}
        {onglet === 'dashboard' && stats && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Dashboard Admin</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Établissements',     val: stats.totalMaquis,                    bg: '#eff6ff', col: '#1d4ed8' },
                { label: 'Utilisateurs',       val: stats.totalUtilisateurs,              bg: '#f0fdf4', col: '#15803d' },
                { label: 'Abonnements actifs', val: stats.abonnementsActifs,              bg: '#fefce8', col: '#a16207' },
                { label: 'Revenus/mois',       val: `${fmtNum(stats.revenusMensuels)} F`, bg: '#faf5ff', col: '#7e22ce' },
              ].map(c => (
                <div key={c.label} style={{ ...S.card, backgroundColor: c.bg }}>
                  <p style={{ fontSize: 12, color: c.col, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px' }}>{c.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: c.col, margin: 0 }}>{c.val}</p>
                </div>
              ))}
            </div>
            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Tous les établissements</h2>
              {maquis.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {m.logo_url ? (
                      <img src={m.logo_url} alt={m.nom} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: m.couleur_primaire || '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
                        {m.nom?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{m.nom}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{m.activite || m.type} · {m.nb_utilisateurs} user(s)</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {m.abonnement && (
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: STATUT_COLORS[m.abonnement.statut]?.bg, color: STATUT_COLORS[m.abonnement.statut]?.color }}>
                        {m.abonnement.statut}
                      </span>
                    )}
                    <button onClick={() => { setMaquisSelectionne(m); setOnglet('detail') }} style={S.btn()}>Détail</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÉTABLISSEMENTS */}
        {onglet === 'maquis' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Établissements</h1>
              <button onClick={() => setModal('creerMaquis')} style={S.btn()}>+ Nouveau</button>
            </div>

            {modal === 'creerMaquis' && (
              <div style={{ ...S.card, marginBottom: 20, border: '2px solid #6366f1' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, color: '#0f172a' }}>Nouvel établissement</h3>
                <form onSubmit={creerMaquis}>

                  {/* Nom */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Nom de l'établissement *</label>
                    <input value={formMaquis.nom} onChange={e => setFormMaquis({ ...formMaquis, nom: e.target.value })} placeholder="Ex: Maquis Le Bonheur" required style={S.input} />
                  </div>

                  {/* Activité */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Type d'activité *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {ACTIVITES.map(act => (
                        <div key={act.value} onClick={() => selectionnerActivite(act)}
                          style={{ border: `2px solid ${formMaquis.activite === act.value ? act.couleur : '#e2e8f0'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', backgroundColor: formMaquis.activite === act.value ? `${act.couleur}15` : 'white', transition: 'all 0.2s' }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: formMaquis.activite === act.value ? act.couleur : '#374151' }}>{act.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Couleur et Logo */}
                  {formMaquis.activite && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, padding: 16, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      {/* Couleur */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Couleur principale</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input type="color" value={formMaquis.couleur_primaire} onChange={e => setFormMaquis({ ...formMaquis, couleur_primaire: e.target.value })}
                            style={{ width: 48, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: formMaquis.couleur_primaire, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
                            {formMaquis.nom?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span style={{ fontSize: 13, color: '#64748b' }}>{formMaquis.couleur_primaire}</span>
                        </div>
                      </div>

                      {/* Logo */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Logo (optionnel)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '2px dashed #e2e8f0' }}>🏪</div>
                          )}
                          <label style={{ padding: '8px 12px', backgroundColor: '#6366f1', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            📷 Choisir
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modèle commercial */}
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Modèle commercial *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      { val: 'achat_unique', label: '💰 Achat unique', desc: 'Paiement une fois, accès permanent' },
                      { val: 'abonnement',   label: '🔄 Abonnement',   desc: 'Récurrent mensuel ou annuel' },
                    ].map(opt => (
                      <div key={opt.val} onClick={() => setFormMaquis({ ...formMaquis, type_acces: opt.val })}
                        style={{ border: `2px solid ${formMaquis.type_acces === opt.val ? '#6366f1' : '#e2e8f0'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', backgroundColor: formMaquis.type_acces === opt.val ? '#f5f3ff' : 'white' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: formMaquis.type_acces === opt.val ? '#6366f1' : '#374151' }}>{opt.label}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{opt.desc}</p>
                      </div>
                    ))}
                  </div>

                  {formMaquis.type_acces === 'abonnement' && (
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Périodicité</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {[
                          { val: 'mensuel', label: '📅 Mensuel', montant: '35000', desc: '35 000 F / mois' },
                          { val: 'annuel',  label: '📆 Annuel',  montant: '350000', desc: '350 000 F / an' },
                        ].map(opt => (
                          <div key={opt.val} onClick={() => setFormMaquis({ ...formMaquis, periodicite: opt.val, montant: opt.montant })}
                            style={{ border: `2px solid ${formMaquis.periodicite === opt.val ? '#6366f1' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', backgroundColor: formMaquis.periodicite === opt.val ? '#f5f3ff' : 'white' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: formMaquis.periodicite === opt.val ? '#6366f1' : '#374151' }}>{opt.label}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{opt.desc}</p>
                          </div>
                        ))}
                      </div>
                      <input type="number" value={formMaquis.montant} onChange={e => setFormMaquis({ ...formMaquis, montant: e.target.value })} style={S.input} />
                      <p style={{ margin: 0, fontSize: 12, color: '#6366f1', fontWeight: 500 }}>
                        📅 Échéance : {formMaquis.periodicite === 'mensuel' ? '+1 mois' : '+1 an'} à partir d'aujourd'hui
                      </p>
                    </div>
                  )}

                  {formMaquis.type_acces === 'achat_unique' && (
                    <div style={{ backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#15803d', fontWeight: 500 }}>✅ Accès permanent</p>
                      <input type="number" value={formMaquis.montant} onChange={e => setFormMaquis({ ...formMaquis, montant: e.target.value })} placeholder="Montant facturé (FCFA)" style={S.input} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={S.btn()}>✅ Créer l'établissement</button>
                    <button type="button" onClick={() => { setModal(null); setLogoFichier(null); setLogoPreview(null) }} style={S.btn('#64748b')}>Annuler</button>
                  </div>
                </form>
              </div>
            )}

            {maquis.map(m => (
              <div key={m.id} style={{ ...S.card, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {m.logo_url ? (
                      <img src={m.logo_url} alt={m.nom} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: m.couleur_primaire || '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20 }}>
                        {m.nom?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{m.nom}</p>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>{m.activite || m.type}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, backgroundColor: m.actif ? '#f0fdf4' : '#fef2f2', color: m.actif ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{m.actif ? 'Actif' : 'Inactif'}</span>
                        {m.abonnement && (
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, backgroundColor: '#f5f3ff', color: '#6366f1', fontWeight: 600 }}>
                            {m.abonnement.type_acces === 'achat_unique' ? '💰 Achat unique' : `🔄 ${m.abonnement.periodicite || 'Abonnement'}`}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{m.nb_utilisateurs} utilisateur(s) · {m.nb_ventes} vente(s) · {m.nb_produits} produit(s)</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>Créé le {fmtDate(m.created_at)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setMaquisSelectionne(m); setOnglet('detail') }} style={S.btn()}>Gérer</button>
                    <button onClick={() => toggleMaquis(m.id, m.actif)} style={S.btn(m.actif ? '#dc2626' : '#16a34a')}>{m.actif ? 'Désactiver' : 'Activer'}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DETAIL */}
        {onglet === 'detail' && maquisSelectionne && (
          <div>
            <button onClick={() => { setOnglet('maquis'); setMaquisSelectionne(null) }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14, marginBottom: 16, fontWeight: 600 }}>← Retour</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              {maquisSelectionne.logo_url ? (
                <img src={maquisSelectionne.logo_url} alt={maquisSelectionne.nom} style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: maquisSelectionne.couleur_primaire || '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 28 }}>
                  {maquisSelectionne.nom?.charAt(0)}
                </div>
              )}
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>{maquisSelectionne.nom}</h1>
                <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>{maquisSelectionne.activite || maquisSelectionne.type} · Créé le {fmtDate(maquisSelectionne.created_at)}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={S.card}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Abonnement</h2>
                {maquisSelectionne.abonnement ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#64748b' }}>Type d'accès</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>
                        {maquisSelectionne.abonnement.type_acces === 'achat_unique' ? '💰 Achat unique' : `🔄 ${maquisSelectionne.abonnement.periodicite || 'Abonnement'}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#64748b' }}>Statut</span>
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, backgroundColor: STATUT_COLORS[maquisSelectionne.abonnement.statut]?.bg, color: STATUT_COLORS[maquisSelectionne.abonnement.statut]?.color }}>
                        {maquisSelectionne.abonnement.statut}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#64748b' }}>Montant</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtNum(maquisSelectionne.abonnement.montant)} FCFA</span>
                    </div>
                    {maquisSelectionne.abonnement.type_acces === 'abonnement' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ fontSize: 13, color: '#64748b' }}>Échéance</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: maquisSelectionne.abonnement.date_echeance && new Date(maquisSelectionne.abonnement.date_echeance) < new Date() ? '#dc2626' : '#16a34a' }}>
                          {fmtDate(maquisSelectionne.abonnement.date_echeance)}
                        </span>
                      </div>
                    )}
                    {maquisSelectionne.abonnement.type_acces === 'achat_unique' && (
                      <div style={{ backgroundColor: '#f0fdf4', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#15803d' }}>✅ Accès permanent</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {maquisSelectionne.abonnement.type_acces === 'abonnement' && (
                        <button onClick={() => renouvelerAbonnement(maquisSelectionne.id)} style={S.btn('#16a34a')}>✅ Renouveler +1 mois</button>
                      )}
                      <button onClick={() => suspendreAbonnement(maquisSelectionne.id)} style={S.btn('#dc2626')}>Suspendre</button>
                    </div>
                  </div>
                ) : <p style={{ color: '#94a3b8', fontSize: 14 }}>Aucun abonnement</p>}
              </div>

              <div style={S.card}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Statistiques</h2>
                {[
                  { label: 'Ventes totales', val: maquisSelectionne.nb_ventes },
                  { label: 'Produits',       val: maquisSelectionne.nb_produits },
                  { label: 'Utilisateurs',   val: maquisSelectionne.nb_utilisateurs },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Paramètres établissement */}
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Paramètres</h2>
                {!editMaquis && (
                  <button onClick={() => setEditMaquis({ id: maquisSelectionne.id, nom: maquisSelectionne.nom, couleur_primaire: maquisSelectionne.couleur_primaire || '#FF6B35', activite: maquisSelectionne.activite || '', devise: maquisSelectionne.devise || 'XOF' })} style={S.btn()}>
                    ✏️ Modifier
                  </button>
                )}
              </div>

              {editMaquis ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Nom</label>
                      <input value={editMaquis.nom} onChange={e => setEditMaquis({ ...editMaquis, nom: e.target.value })} style={{ ...S.input, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Activité</label>
                      <select value={editMaquis.activite} onChange={e => { const act = ACTIVITES.find(a => a.value === e.target.value); setEditMaquis({ ...editMaquis, activite: e.target.value, couleur_primaire: act?.couleur || editMaquis.couleur_primaire }) }} style={{ ...S.input, marginBottom: 0 }}>
                        <option value="">-- Choisir --</option>
                        {ACTIVITES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Couleur principale</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="color" value={editMaquis.couleur_primaire} onChange={e => setEditMaquis({ ...editMaquis, couleur_primaire: e.target.value })} style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                        <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: editMaquis.couleur_primaire, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>{editMaquis.nom?.charAt(0)?.toUpperCase()}</div>
                        <span style={{ fontSize: 13, color: '#64748b' }}>{editMaquis.couleur_primaire}</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Devise</label>
                      <select value={editMaquis.devise} onChange={e => setEditMaquis({ ...editMaquis, devise: e.target.value })} style={{ ...S.input, marginBottom: 0 }}>
                        <option value="XOF">XOF (FCFA)</option>
                        <option value="XAF">XAF (FCFA)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={sauvegarderMaquis} style={S.btn('#16a34a')}>✅ Sauvegarder</button>
                    <button onClick={() => setEditMaquis(null)} style={S.btn('#64748b')}>Annuler</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Nom', val: maquisSelectionne.nom },
                    { label: 'Activité', val: maquisSelectionne.activite || maquisSelectionne.type || '—' },
                    { label: 'Devise', val: maquisSelectionne.devise || 'XOF' },
                    { label: 'Couleur', val: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: maquisSelectionne.couleur_primaire, display: 'inline-block' }} />
                        {maquisSelectionne.couleur_primaire}
                      </span>
                    )},
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 13, color: '#64748b' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Utilisateurs ({maquisSelectionne.utilisateurs?.length})</h2>
                <button onClick={() => setModal('creerUser')} style={S.btn()}>+ Ajouter</button>
              </div>

              {modal === 'creerUser' && (
                <div style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                  <form onSubmit={creerUtilisateur}>
                    <input name="maquis_id" type="hidden" value={maquisSelectionne.id} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input name="nom" placeholder="Nom *" required style={S.input} />
                      <input name="email" type="email" placeholder="Email *" required style={S.input} />
                      <input name="mot_de_passe" type="password" placeholder="Mot de passe *" required style={S.input} />
                      <select name="role" style={S.input}>
                        <option value="serveur">Serveur / Station</option>
                        <option value="caissier">Caissier</option>
                        <option value="gerant">Gérant</option>
                        <option value="patron">Patron</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" style={S.btn()}>Créer</button>
                      <button type="button" onClick={() => setModal(null)} style={S.btn('#64748b')}>Annuler</button>
                    </div>
                  </form>
                </div>
              )}

              {maquisSelectionne.utilisateurs?.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{u.nom}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{u.email} · {u.role}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, backgroundColor: u.actif ? '#f0fdf4' : '#fef2f2', color: u.actif ? '#16a34a' : '#dc2626' }}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                    <button onClick={() => toggleUser(u.id, maquisSelectionne.id, u.actif)} style={S.btn(u.actif ? '#dc2626' : '#16a34a')}>
                      {u.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABONNEMENTS */}
        {onglet === 'abonnements' && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Abonnements</h1>
            <div style={S.card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    {['Établissement', 'Accès', 'Statut', 'Montant', 'Échéance', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {maquis.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px', fontSize: 14, fontWeight: 600 }}>{m.nom}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
                        {m.abonnement?.type_acces === 'achat_unique' ? '💰 Achat unique' : `🔄 ${m.abonnement?.periodicite || '—'}`}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {m.abonnement ? (
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: STATUT_COLORS[m.abonnement.statut]?.bg, color: STATUT_COLORS[m.abonnement.statut]?.color }}>
                            {m.abonnement.statut}
                          </span>
                        ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, fontWeight: 600 }}>{m.abonnement ? `${fmtNum(m.abonnement.montant)} F` : '—'}</td>
                      <td style={{ padding: '12px', fontSize: 13 }}>
                        {m.abonnement?.type_acces === 'achat_unique' ? '∞ Permanent' : fmtDate(m.abonnement?.date_echeance)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {m.abonnement?.type_acces === 'abonnement' && (
                            <button onClick={() => renouvelerAbonnement(m.id)} style={{ ...S.btn('#16a34a'), padding: '6px 12px', fontSize: 12 }}>Renouveler</button>
                          )}
                          <button onClick={() => suspendreAbonnement(m.id)} style={{ ...S.btn('#dc2626'), padding: '6px 12px', fontSize: 12 }}>Suspendre</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default AdminDashboard