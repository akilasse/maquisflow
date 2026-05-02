import { useState, useEffect } from 'react'
import api from '../../utils/api'

const WHATSAPP = '2250779127543'

const Parametrage = () => {
  const [onglet, setOnglet] = useState('produits')
  const [produits, setProduits] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [utilisateurs, setUtilisateurs] = useState([])
  const [maquis, setMaquis] = useState(null)
  const [abonnement, setAbonnement] = useState(null)
  const [message, setMessage] = useState(null)
  const [modal, setModal] = useState(null)

  const [formProduit, setFormProduit] = useState({
    nom: '', categorie: '', prix_vente: '', prix_achat: '', stock_min: '', unite: 'unité', code_barre: ''
  })
  const [formFournisseur, setFormFournisseur] = useState({ nom: '', telephone: '', email: '', adresse: '' })
  const [formUtilisateur, setFormUtilisateur] = useState({ nom: '', email: '', mot_de_passe: '', role: 'caissier' })
  const [formMaquis, setFormMaquis] = useState({ nom: '', couleur_primaire: '', devise: '', fuseau_horaire: '', activite: '' })

  useEffect(() => { chargerDonnees() }, [])

  const chargerDonnees = async () => {
    try {
      const [p, f, u, m] = await Promise.all([
        api.get('/api/parametrage/produits'),
        api.get('/api/parametrage/fournisseurs'),
        api.get('/api/parametrage/utilisateurs'),
        api.get('/api/parametrage/maquis')
      ])
      setProduits(p.data.data)
      setFournisseurs(f.data.data)
      setUtilisateurs(u.data.data)
      const maquisData = m.data.data
      setMaquis(maquisData)
      setAbonnement(maquisData.abonnement || null)
      setFormMaquis({
        nom: maquisData.nom || '',
        couleur_primaire: maquisData.couleur_primaire || '#FF6B35',
        devise: maquisData.devise || 'XOF',
        fuseau_horaire: maquisData.fuseau_horaire || 'Africa/Abidjan',
        activite: maquisData.activite || ''
      })
    } catch (error) {
      setMessage({ type: 'erreur', texte: 'Erreur chargement données' })
    }
  }

  const afficherMessage = (type, texte) => {
    setMessage({ type, texte })
    setTimeout(() => setMessage(null), 3000)
  }

  const styleInput = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '10px' }
  const styleBouton = (couleur = 'var(--couleur-principale)') => ({ padding: '10px 20px', backgroundColor: couleur, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' })
  const styleOnglet = (actif) => ({ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px', backgroundColor: actif ? 'var(--couleur-principale)' : '#f3f4f6', color: actif ? 'white' : '#374151' })

  const soumettreProdukt = async () => {
    try {
      if (modal?.id) {
        await api.put(`/api/parametrage/produits/${modal.id}`, formProduit)
        afficherMessage('succes', 'Produit modifié !')
      } else {
        await api.post('/api/parametrage/produits', formProduit)
        afficherMessage('succes', 'Produit créé !')
      }
      setModal(null)
      setFormProduit({ nom: '', categorie: '', prix_vente: '', prix_achat: '', stock_min: '', unite: 'unité', code_barre: '' })
      chargerDonnees()
    } catch (error) { afficherMessage('erreur', error.response?.data?.message || 'Erreur') }
  }

  const uploadPhotoProduit = async (produitId, fichier) => {
    try {
      const formData = new FormData()
      formData.append('photo', fichier)
      await api.post(`/api/parametrage/produits/${produitId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      afficherMessage('succes', 'Photo uploadée !')
      chargerDonnees()
    } catch { afficherMessage('erreur', 'Erreur upload photo') }
  }

  const uploadPhotoUtilisateur = async (userId, fichier) => {
    try {
      const formData = new FormData()
      formData.append('photo', fichier)
      await api.post(`/api/parametrage/utilisateurs/${userId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      afficherMessage('succes', 'Photo uploadée !')
      chargerDonnees()
    } catch { afficherMessage('erreur', 'Erreur upload photo') }
  }

  const uploadLogoMaquis = async (fichier) => {
    try {
      const formData = new FormData()
      formData.append('logo', fichier)
      await api.post('/api/parametrage/maquis/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      afficherMessage('succes', 'Logo uploadé !')
      chargerDonnees()
    } catch { afficherMessage('erreur', 'Erreur upload logo') }
  }

  const toggleActifProduit = async (produit) => {
    try {
      await api.put(`/api/parametrage/produits/${produit.id}`, { actif: !produit.actif })
      afficherMessage('succes', produit.actif ? 'Produit désactivé' : 'Produit activé')
      chargerDonnees()
    } catch { afficherMessage('erreur', 'Erreur') }
  }

  const soumettreFournisseur = async () => {
    try {
      if (modal?.id) {
        await api.put(`/api/parametrage/fournisseurs/${modal.id}`, formFournisseur)
        afficherMessage('succes', 'Fournisseur modifié !')
      } else {
        await api.post('/api/parametrage/fournisseurs', formFournisseur)
        afficherMessage('succes', 'Fournisseur créé !')
      }
      setModal(null)
      setFormFournisseur({ nom: '', telephone: '', email: '', adresse: '' })
      chargerDonnees()
    } catch (error) { afficherMessage('erreur', error.response?.data?.message || 'Erreur') }
  }

  const soumettreUtilisateur = async () => {
    try {
      await api.put(`/api/parametrage/utilisateurs/${modal.id}`, formUtilisateur)
      afficherMessage('succes', 'Utilisateur modifié !')
      setModal(null)
      setFormUtilisateur({ nom: '', email: '', mot_de_passe: '', role: 'caissier' })
      chargerDonnees()
    } catch (error) { afficherMessage('erreur', error.response?.data?.message || 'Erreur') }
  }

  const toggleActifUtilisateur = async (user) => {
    try {
      await api.put(`/api/parametrage/utilisateurs/${user.id}`, { actif: !user.actif })
      afficherMessage('succes', user.actif ? 'Utilisateur désactivé' : 'Utilisateur activé')
      chargerDonnees()
    } catch { afficherMessage('erreur', 'Erreur') }
  }

  const soumettreMaquis = async () => {
    try {
      await api.put('/api/parametrage/maquis', formMaquis)
      afficherMessage('succes', 'Paramètres sauvegardés !')
      chargerDonnees()
    } catch (error) { afficherMessage('erreur', error.response?.data?.message || 'Erreur') }
  }

  const joursRestants = (date) => {
    if (!date) return null
    const diff = new Date(date) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const statutAbo = abonnement?.statut
  const joursRest = abonnement?.date_echeance ? joursRestants(abonnement.date_echeance) : null
  const estExpire = joursRest !== null && joursRest <= 0
  const urgence   = joursRest !== null && joursRest > 0 && joursRest <= 7

  const msgWhatsApp = encodeURIComponent(
    `Bonjour Flowix, je souhaite renouveler mon abonnement pour ${maquis?.nom || 'mon établissement'}.`
  )

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Paramétrage</h1>
      <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>Gérez vos produits, fournisseurs, utilisateurs et paramètres</p>

      {message && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', backgroundColor: message.type === 'succes' ? '#f0fdf4' : '#fef2f2', color: message.type === 'succes' ? '#16a34a' : '#dc2626', border: `1px solid ${message.type === 'succes' ? '#bbf7d0' : '#fecaca'}` }}>
          {message.texte}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'produits',     label: '📦 Produits' },
          { key: 'fournisseurs', label: '🚚 Fournisseurs' },
          { key: 'utilisateurs', label: '👥 Utilisateurs' },
          { key: 'maquis',       label: '🏪 Mon Commerce' },
          { key: 'abonnement',   label: `💳 Abonnement${urgence ? ' ⚠️' : estExpire ? ' ❌' : ''}` },
        ].map(o => (
          <button key={o.key} onClick={() => { setOnglet(o.key); setModal(null) }} style={styleOnglet(onglet === o.key)}>{o.label}</button>
        ))}
      </div>

      {/* PRODUITS */}
      {onglet === 'produits' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Produits ({produits.length})</h2>
            <button onClick={() => { setModal({ type: 'produit' }); setFormProduit({ nom: '', categorie: '', prix_vente: '', prix_achat: '', stock_min: '', unite: 'unité', code_barre: '' }) }} style={styleBouton()}>+ Nouveau produit</button>
          </div>

          {modal?.type === 'produit' && (
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>{modal.id ? 'Modifier' : 'Nouveau'} produit</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input placeholder="Nom du produit *" value={formProduit.nom} onChange={e => setFormProduit({ ...formProduit, nom: e.target.value })} style={styleInput} />
                <input placeholder="Catégorie (ex: Boissons)" value={formProduit.categorie} onChange={e => setFormProduit({ ...formProduit, categorie: e.target.value })} style={styleInput} />
                <input type="number" placeholder="Prix de vente *" value={formProduit.prix_vente} onChange={e => setFormProduit({ ...formProduit, prix_vente: e.target.value })} style={styleInput} />
                <input type="number" placeholder="Prix d'achat *" value={formProduit.prix_achat} onChange={e => setFormProduit({ ...formProduit, prix_achat: e.target.value })} style={styleInput} />
                <input type="number" placeholder="Seuil d'alerte (stock min)" value={formProduit.stock_min} onChange={e => setFormProduit({ ...formProduit, stock_min: e.target.value })} style={styleInput} />
                <input placeholder="Unité (bouteille, portion...)" value={formProduit.unite} onChange={e => setFormProduit({ ...formProduit, unite: e.target.value })} style={styleInput} />
                <input placeholder="Code barre (optionnel)" value={formProduit.code_barre} onChange={e => setFormProduit({ ...formProduit, code_barre: e.target.value })} style={styleInput} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={soumettreProdukt} style={styleBouton()}>Enregistrer</button>
                <button onClick={() => setModal(null)} style={styleBouton('#6b7280')}>Annuler</button>
              </div>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Photo', 'Nom', 'Catégorie', 'Prix vente', 'Prix achat', 'Stock', 'Seuil', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {produits.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb', opacity: p.actif ? 1 : 0.5 }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ position: 'relative', width: 40, height: 40 }}>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.nom} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
                      )}
                      <label style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, backgroundColor: 'var(--couleur-principale)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, color: 'white' }}>
                        📷
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadPhotoProduit(p.id, e.target.files[0])} />
                      </label>
                    </div>
                  </td>
                  <td style={{ padding: '10px', fontSize: '14px', fontWeight: '500' }}>
                    {p.nom}
                    {p.code_barre && <span style={{ display: 'block', fontSize: '11px', color: '#9ca3af' }}>📊 {p.code_barre}</span>}
                  </td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{p.categorie || '-'}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: 'var(--couleur-principale)', fontWeight: '600' }}>{parseFloat(p.prix_vente).toLocaleString()} XOF</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{parseFloat(p.prix_achat).toLocaleString()} XOF</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: parseFloat(p.stock_actuel) <= parseFloat(p.stock_min) ? '#dc2626' : '#16a34a', fontWeight: '600' }}>{p.stock_actuel} {p.unite}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{p.stock_min} {p.unite}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '12px', backgroundColor: p.actif ? '#f0fdf4' : '#f3f4f6', color: p.actif ? '#16a34a' : '#6b7280' }}>{p.actif ? 'Actif' : 'Inactif'}</span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setModal({ type: 'produit', id: p.id }); setFormProduit({ nom: p.nom, categorie: p.categorie || '', prix_vente: p.prix_vente, prix_achat: p.prix_achat, stock_min: p.stock_min, unite: p.unite, code_barre: p.code_barre || '' }) }} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Modifier</button>
                      <button onClick={() => toggleActifProduit(p)} style={{ padding: '4px 10px', backgroundColor: p.actif ? '#fef2f2' : '#f0fdf4', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: p.actif ? '#dc2626' : '#16a34a' }}>{p.actif ? 'Désactiver' : 'Activer'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FOURNISSEURS */}
      {onglet === 'fournisseurs' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Fournisseurs ({fournisseurs.length})</h2>
            <button onClick={() => { setModal({ type: 'fournisseur' }); setFormFournisseur({ nom: '', telephone: '', email: '', adresse: '' }) }} style={styleBouton()}>+ Nouveau fournisseur</button>
          </div>
          {modal?.type === 'fournisseur' && (
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>{modal.id ? 'Modifier' : 'Nouveau'} fournisseur</h3>
              <input placeholder="Nom du fournisseur *" value={formFournisseur.nom} onChange={e => setFormFournisseur({ ...formFournisseur, nom: e.target.value })} style={styleInput} />
              <input placeholder="Téléphone" value={formFournisseur.telephone} onChange={e => setFormFournisseur({ ...formFournisseur, telephone: e.target.value })} style={styleInput} />
              <input placeholder="Email" value={formFournisseur.email} onChange={e => setFormFournisseur({ ...formFournisseur, email: e.target.value })} style={styleInput} />
              <input placeholder="Adresse" value={formFournisseur.adresse} onChange={e => setFormFournisseur({ ...formFournisseur, adresse: e.target.value })} style={styleInput} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={soumettreFournisseur} style={styleBouton()}>Enregistrer</button>
                <button onClick={() => setModal(null)} style={styleBouton('#6b7280')}>Annuler</button>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {fournisseurs.map(f => (
              <div key={f.id} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '15px' }}>🚚 {f.nom}</p>
                  <button onClick={() => { setModal({ type: 'fournisseur', id: f.id }); setFormFournisseur({ nom: f.nom, telephone: f.telephone || '', email: f.email || '', adresse: f.adresse || '' }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--couleur-principale)' }}>Modifier</button>
                </div>
                {f.telephone && <p style={{ margin: '4px 0', fontSize: '13px', color: '#6b7280' }}>📞 {f.telephone}</p>}
                {f.email && <p style={{ margin: '4px 0', fontSize: '13px', color: '#6b7280' }}>✉️ {f.email}</p>}
                {f.adresse && <p style={{ margin: '4px 0', fontSize: '13px', color: '#6b7280' }}>📍 {f.adresse}</p>}
              </div>
            ))}
            {fournisseurs.length === 0 && <p style={{ color: '#9ca3af', fontSize: '14px' }}>Aucun fournisseur enregistré</p>}
          </div>
        </div>
      )}

      {/* UTILISATEURS */}
      {onglet === 'utilisateurs' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Utilisateurs ({utilisateurs.length})</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>Pour ajouter un utilisateur, contactez l'administrateur</p>
          </div>
          {modal?.type === 'utilisateur' && modal.id && (
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>Modifier utilisateur</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input placeholder="Nom complet *" value={formUtilisateur.nom} onChange={e => setFormUtilisateur({ ...formUtilisateur, nom: e.target.value })} style={styleInput} />
                <input type="email" placeholder="Email *" value={formUtilisateur.email} onChange={e => setFormUtilisateur({ ...formUtilisateur, email: e.target.value })} style={styleInput} />
                <input type="password" placeholder="Nouveau mot de passe (optionnel)" value={formUtilisateur.mot_de_passe} onChange={e => setFormUtilisateur({ ...formUtilisateur, mot_de_passe: e.target.value })} style={styleInput} />
                <select value={formUtilisateur.role} onChange={e => setFormUtilisateur({ ...formUtilisateur, role: e.target.value })} style={styleInput}>
                  <option value="caissier">Caissier</option>
                  <option value="gerant">Gérant</option>
                  <option value="patron">Patron</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={soumettreUtilisateur} style={styleBouton()}>Enregistrer</button>
                <button onClick={() => setModal(null)} style={styleBouton('#6b7280')}>Annuler</button>
              </div>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Photo', 'Nom', 'Email', 'Rôle', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f9fafb', opacity: u.actif ? 1 : 0.5 }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ position: 'relative', width: 40, height: 40 }}>
                      {u.photo_url ? (
                        <img src={u.photo_url} alt={u.nom} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--couleur-principale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'white', fontWeight: 700 }}>
                          {u.nom?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <label style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, backgroundColor: 'var(--couleur-principale)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, color: 'white' }}>
                        📷
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadPhotoUtilisateur(u.id, e.target.files[0])} />
                      </label>
                    </div>
                  </td>
                  <td style={{ padding: '10px', fontSize: '14px', fontWeight: '500' }}>{u.nom}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{u.email}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: u.role === 'patron' ? '#fef3c7' : u.role === 'gerant' ? '#e0f2fe' : '#f3f4f6', color: u.role === 'patron' ? '#92400e' : u.role === 'gerant' ? '#0369a1' : '#374151' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '12px', backgroundColor: u.actif ? '#f0fdf4' : '#f3f4f6', color: u.actif ? '#16a34a' : '#6b7280' }}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setModal({ type: 'utilisateur', id: u.id }); setFormUtilisateur({ nom: u.nom, email: u.email, mot_de_passe: '', role: u.role }) }} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Modifier</button>
                      <button onClick={() => toggleActifUtilisateur(u)} style={{ padding: '4px 10px', backgroundColor: u.actif ? '#fef2f2' : '#f0fdf4', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: u.actif ? '#dc2626' : '#16a34a' }}>{u.actif ? 'Désactiver' : 'Activer'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MON COMMERCE */}
      {onglet === 'maquis' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '600' }}>Paramètres de mon commerce</h2>

          {/* Logo */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#374151', marginBottom: '8px', display: 'block', fontWeight: '600' }}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {maquis?.logo_url ? (
                <img src={maquis.logo_url} alt="Logo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '2px solid #e5e7eb' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: '2px dashed #e5e7eb' }}>🏪</div>
              )}
              <label style={{ padding: '8px 16px', backgroundColor: '#f3f4f6', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                📷 Changer le logo
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadLogoMaquis(e.target.files[0])} />
              </label>
            </div>
          </div>

          <input placeholder="Nom du commerce" value={formMaquis.nom} onChange={e => setFormMaquis({ ...formMaquis, nom: e.target.value })} style={styleInput} />

          <input placeholder="Type d'activité (ex: Maquis, Restaurant, Boutique, Pharmacie...)" value={formMaquis.activite} onChange={e => setFormMaquis({ ...formMaquis, activite: e.target.value })} style={styleInput} />

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '13px', color: '#374151', marginBottom: '4px', display: 'block' }}>Couleur principale</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="color" value={formMaquis.couleur_primaire} onChange={e => setFormMaquis({ ...formMaquis, couleur_primaire: e.target.value })} style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
              <span style={{ fontSize: '14px', color: '#374151' }}>{formMaquis.couleur_primaire}</span>
            </div>
          </div>

          <select value={formMaquis.devise} onChange={e => setFormMaquis({ ...formMaquis, devise: e.target.value })} style={styleInput}>
            <option value="XOF">XOF - Franc CFA</option>
            <option value="GNF">GNF - Franc Guinéen</option>
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - Dollar</option>
          </select>

          <select value={formMaquis.fuseau_horaire} onChange={e => setFormMaquis({ ...formMaquis, fuseau_horaire: e.target.value })} style={styleInput}>
            <option value="Africa/Abidjan">Abidjan (GMT+0)</option>
            <option value="Africa/Dakar">Dakar (GMT+0)</option>
            <option value="Africa/Lagos">Lagos (GMT+1)</option>
            <option value="Africa/Douala">Douala (GMT+1)</option>
          </select>

          <button onClick={soumettreMaquis} style={{ ...styleBouton(), width: '100%', padding: '12px' }}>Sauvegarder les paramètres</button>
        </div>
      )}

      {/* ABONNEMENT */}
      {onglet === 'abonnement' && (
        <div style={{ maxWidth: '520px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Mon Abonnement</h2>

          {!abonnement ? (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <p style={{ fontSize: '40px', marginBottom: '12px' }}>💳</p>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>Aucune information d'abonnement disponible</p>
            </div>
          ) : (
            <div>
              <div style={{ backgroundColor: estExpire ? '#fef2f2' : urgence ? '#fefce8' : '#f0fdf4', border: `1px solid ${estExpire ? '#fecaca' : urgence ? '#fef08a' : '#bbf7d0'}`, borderRadius: '14px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '48px', margin: '0 0 12px' }}>{estExpire ? '❌' : urgence ? '⚠️' : '✅'}</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: estExpire ? '#dc2626' : urgence ? '#a16207' : '#16a34a' }}>
                  {estExpire ? 'Abonnement expiré' : urgence ? `Expire dans ${joursRest} jour${joursRest > 1 ? 's' : ''}` : abonnement.type_acces === 'achat_unique' ? 'Accès permanent' : 'Abonnement actif'}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  {abonnement.type_acces === 'achat_unique' ? 'Vous bénéficiez d\'un accès permanent' : `Abonnement ${abonnement.periodicite || 'mensuel'}`}
                </p>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600' }}>Détails</h3>
                {[
                  { label: 'Établissement', val: maquis?.nom },
                  { label: 'Type d\'accès', val: abonnement.type_acces === 'achat_unique' ? '💰 Achat unique' : `🔄 Abonnement ${abonnement.periodicite || ''}` },
                  { label: 'Statut', val: abonnement.statut },
                  abonnement.type_acces === 'abonnement' && abonnement.date_echeance ? { label: 'Échéance', val: new Date(abonnement.date_echeance).toLocaleDateString('fr-FR') } : null,
                  abonnement.date_paiement ? { label: 'Dernier paiement', val: new Date(abonnement.date_paiement).toLocaleDateString('fr-FR') } : null,
                ].filter(Boolean).map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>{item.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{item.val}</span>
                  </div>
                ))}
              </div>

              {abonnement.type_acces === 'abonnement' && (
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '600' }}>Renouveler mon abonnement</h3>
                  <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>Contactez-nous pour renouveler votre abonnement via Wave ou Orange Money.</p>
                  <a href={`https://wa.me/${WHATSAPP}?text=${msgWhatsApp}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', width: '100%', padding: '14px', backgroundColor: '#25D366', color: 'white', borderRadius: '10px', fontSize: '15px', fontWeight: '600', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                    📱 Contacter Flowix sur WhatsApp
                  </a>
                  <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>Ou appelez le +225 07 79 12 75 43</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Parametrage