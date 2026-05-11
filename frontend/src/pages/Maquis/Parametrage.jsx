import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

const WHATSAPP = '2250779127543'

function SelectRecherche({ valeur, onChange, options, placeholder, style }) {
  const [ouvert, setOuvert] = useState(false)
  const [recherche, setRecherche] = useState('')
  const filtres = options.filter(o => o.toLowerCase().includes(recherche.toLowerCase()))
  const fermer = () => { setOuvert(false); setRecherche('') }
  return (
    <div style={{ position: 'relative', marginBottom: 0 }}>
      <div onClick={() => setOuvert(o => !o)}
        style={{ ...style, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: 0 }}>
        <span style={{ color: valeur ? '#111827' : '#9ca3af', fontSize: 14 }}>{valeur || placeholder}</span>
        <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 4 }}>{ouvert ? '▴' : '▾'}</span>
      </div>
      {ouvert && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={fermer} />
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: 2 }}>
            {options.length > 4 && (
              <input autoFocus placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ padding: '8px 12px', border: 'none', borderBottom: '1px solid #f3f4f6', fontSize: 13, outline: 'none' }} />
            )}
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {filtres.map(o => (
                <div key={o} onClick={() => { onChange(o); fermer() }}
                  style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontWeight: o === valeur ? 700 : 400, color: o === valeur ? 'var(--couleur-principale)' : '#111827', backgroundColor: o === valeur ? 'var(--couleur-principale-light, #fff7ed)' : 'white' }}
                  onMouseEnter={e => { if (o !== valeur) e.currentTarget.style.backgroundColor = '#f9fafb' }}
                  onMouseLeave={e => { if (o !== valeur) e.currentTarget.style.backgroundColor = 'white' }}>
                  {o}
                </div>
              ))}
              {filtres.length === 0 && <p style={{ padding: '10px 14px', fontSize: 13, color: '#9ca3af', margin: 0 }}>Aucun résultat</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ImportCSV({ couleur, onImporte, onAnnuler }) {
  const [lignes,   setLignes]   = useState([])
  const [erreur,   setErreur]   = useState('')
  const [enCours,  setEnCours]  = useState(false)

  const parseCSV = (texte) => {
    const textePropre = texte.replace(/^﻿/, '').trim()
    const rows = textePropre.split(/\r?\n/)
    if (rows.length < 2) { setErreur('Le fichier doit contenir au moins une ligne de données après l\'en-tête.'); return }
    const sep = rows[0].includes(';') ? ';' : ','
    const entetes = rows[0].split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''))
    const colonnesRequises = ['nom', 'prix_vente']
    for (const c of colonnesRequises) {
      if (!entetes.includes(c)) { setErreur(`Colonne manquante : "${c}" — vérifiez que votre fichier utilise ; ou , comme séparateur`); return }
    }
    const data = []
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue
      const vals = rows[i].split(sep)
      const obj = {}
      entetes.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim() })
      if (!obj.nom) continue
      data.push(obj)
    }
    if (data.length === 0) { setErreur('Aucune ligne valide trouvée.'); return }
    setErreur('')
    setLignes(data)
  }

  const lireFichier = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => parseCSV(ev.target.result)
    reader.readAsText(f, 'UTF-8')
  }

  const telechargerModele = () => {
    const contenu = 'nom;categorie;prix_vente;prix_achat;stock_actuel;stock_min;unite;code_barre\nCoca Cola 33cl;Boissons;500;300;0;5;bouteille;\nEau minerale;Boissons;200;100;0;10;bouteille;\n'
    const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'modele_produits.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const importer = async () => {
    setEnCours(true)
    try { await onImporte(lignes) } catch (e) { setErreur(e.response?.data?.message || e.message) }
    setEnCours(false)
  }

  const styleInput = { border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '15px' }}>Importer des produits (CSV)</h3>
        <button onClick={telechargerModele} style={{ fontSize: '12px', color: couleur, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>⬇ Télécharger le modèle</button>
      </div>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px' }}>
        Fichier CSV séparé par <strong>point-virgule (;)</strong> — colonnes : <code>nom</code>, <code>prix_vente</code> obligatoires, les autres optionnelles.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={lireFichier} style={styleInput} />
      {erreur && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>{erreur}</p>}
      {lignes.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '13px', color: '#374151', marginBottom: '8px', fontWeight: '600' }}>{lignes.length} produit(s) détecté(s) — aperçu :</p>
          <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ backgroundColor: '#f3f4f6', position: 'sticky', top: 0 }}>
                <tr>{['Nom','Catégorie','Prix vente','Prix achat','Unité'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {lignes.slice(0, 50).map((l, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '5px 10px' }}>{l.nom}</td>
                    <td style={{ padding: '5px 10px', color: '#6b7280' }}>{l.categorie || '—'}</td>
                    <td style={{ padding: '5px 10px' }}>{l.prix_vente}</td>
                    <td style={{ padding: '5px 10px', color: '#6b7280' }}>{l.prix_achat || '—'}</td>
                    <td style={{ padding: '5px 10px', color: '#6b7280' }}>{l.unite || 'unité'}</td>
                  </tr>
                ))}
                {lignes.length > 50 && <tr><td colSpan={5} style={{ padding: '6px 10px', color: '#9ca3af', textAlign: 'center' }}>... et {lignes.length - 50} autres</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button onClick={importer} disabled={lignes.length === 0 || enCours}
          style={{ padding: '9px 20px', backgroundColor: lignes.length === 0 ? '#d1d5db' : couleur, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: lignes.length === 0 ? 'default' : 'pointer' }}>
          {enCours ? 'Import en cours...' : `Importer ${lignes.length > 0 ? lignes.length + ' produits' : ''}`}
        </button>
        <button onClick={onAnnuler} style={{ padding: '9px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Annuler</button>
      </div>
    </div>
  )
}

const Parametrage = () => {
  const { mettreAJourMaquis } = useAuth()
  const [onglet, setOnglet] = useState('produits')
  const [produits, setProduits] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [utilisateurs, setUtilisateurs] = useState([])
  const [maquis, setMaquis] = useState(null)
  const [abonnement, setAbonnement] = useState(null)
  const [message, setMessage] = useState(null)
  const [modal, setModal] = useState(null)

  const [formProduit, setFormProduit] = useState({
    nom: '', categorie: '', prix_vente: '', prix_achat: '', stock_min: '', unite: 'unité', code_barre: '',
    conditionnement: '', nb_par_cond: '', prix_cond: '', variantes: []
  })

  const NOMS_VARIANTES_SUGGERES = ['Casier', 'Carton', 'Bouteille', 'Verre', 'Demi', 'Coupe', 'Dose', 'Portion', 'Litre', '50cl', '33cl', 'Pack']
  const [formFournisseur, setFormFournisseur] = useState({ nom: '', telephone: '', email: '', adresse: '' })
  const [formUtilisateur, setFormUtilisateur] = useState({ nom: '', email: '', login: '', mot_de_passe: '', role: 'serveur' })
  const [formMaquis, setFormMaquis] = useState({ nom: '', couleur_primaire: '', devise: '', fuseau_horaire: '', type: 'maquis', activite: '', module_commandes_actif: false, module_kds_actif: false, module_commandes_direct: false, paiement_avant: false, heure_debut_journee: 0, categories_custom: [], unites_custom: [], variantes_gabarits: [] })
  const [stations, setStations] = useState([])
  const [tables, setTables]     = useState([])
  const [formStation, setFormStation] = useState({ nom: '', couleur: '#6b7280', type: 'preparation' })
  const [formTable, setFormTable]     = useState({ numero: '', nom: '', capacite: '' })
  const [catalogueOnglet, setCatalogueOnglet] = useState('categories')
  const [ajoutCatalogue, setAjoutCatalogue]   = useState(false)
  const [nouvelleCategorie, setNouvelleCategorie] = useState('')
  const [nouvelleUnite, setNouvelleUnite]         = useState('')
  const [nouveauGabarit, setNouveauGabarit]       = useState({ nom: '', coefficient: '' })
  const [editCatIdx,  setEditCatIdx]  = useState(null)
  const [editCatVal,  setEditCatVal]  = useState('')
  const [editUniteIdx, setEditUniteIdx] = useState(null)
  const [editUniteVal, setEditUniteVal] = useState('')
  const [editGabIdx,  setEditGabIdx]  = useState(null)
  const [editGabVal,  setEditGabVal]  = useState({ nom: '', coefficient: '' })

  useEffect(() => { chargerDonnees() }, [])

  const chargerDonnees = async () => {
    try {
      const [p, f, u, m] = await Promise.all([
        api.get('/api/parametrage/produits'),
        api.get('/api/parametrage/fournisseurs'),
        api.get('/api/parametrage/utilisateurs'),
        api.get('/api/parametrage/maquis')
      ])
      setProduits(p.data.data || [])
      setFournisseurs(f.data.data || [])
      setUtilisateurs(u.data.data || [])
      const maquisData = m.data.data
      setMaquis(maquisData)
      setAbonnement(maquisData.abonnement || null)
      setFormMaquis({
        nom: maquisData.nom || '',
        couleur_primaire: maquisData.couleur_primaire || '#FF6B35',
        devise: maquisData.devise || 'XOF',
        fuseau_horaire: maquisData.fuseau_horaire || 'Africa/Abidjan',
        type: maquisData.type || 'maquis',
        activite: maquisData.activite || '',
        module_commandes_actif:  maquisData.module_commandes_actif  || false,
        module_kds_actif:        maquisData.module_kds_actif        || false,
        module_commandes_direct: maquisData.module_commandes_direct || false,
        paiement_avant:          maquisData.paiement_avant          || false,
        heure_debut_journee:     maquisData.heure_debut_journee     ?? 0,
        categories_custom:       Array.isArray(maquisData.categories_custom)  ? maquisData.categories_custom  : [],
        unites_custom:           Array.isArray(maquisData.unites_custom)      ? maquisData.unites_custom      : [],
        variantes_gabarits:      Array.isArray(maquisData.variantes_gabarits) ? maquisData.variantes_gabarits : [],
      })
      mettreAJourMaquis(maquisData)
      // Charge stations et tables si module actif — isolé pour ne pas bloquer le reste
      if (maquisData.module_commandes_actif) {
        try {
          const [st, tb] = await Promise.all([
            api.get('/api/commandes/stations'),
            api.get('/api/commandes/tables')
          ])
          setStations(st.data.data || [])
          setTables(tb.data.data || [])
        } catch {}
      }
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
  const toggleModule = (titre, desc, champ, form, setForm, couleur = 'var(--couleur-principale)') => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ flex: 1, marginRight: 12 }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>{titre}</p>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>{desc}</p>
      </div>
      <button onClick={() => setForm({ ...form, [champ]: !form[champ] })}
        style={{ flexShrink: 0, width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', backgroundColor: form[champ] ? couleur : '#d1d5db', position: 'relative', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 3, left: form[champ] ? 26 : 3, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
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
      setFormProduit({ nom: '', categorie: '', prix_vente: '', prix_achat: '', stock_min: '', unite: 'unité', code_barre: '', conditionnement: '', nb_par_cond: '', prix_cond: '', variantes: [] })
      await chargerDonnees()
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
      await chargerDonnees()
    } catch (error) { afficherMessage('erreur', error.response?.data?.message || 'Erreur') }
  }

  const soumettreUtilisateur = async () => {
    try {
      await api.put(`/api/parametrage/utilisateurs/${modal.id}`, formUtilisateur)
      afficherMessage('succes', 'Utilisateur modifié !')
      setModal(null)
      setFormUtilisateur({ nom: '', email: '', login: '', mot_de_passe: '', role: 'serveur' })
      await chargerDonnees()
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

  const saveCatalogue = async (patch) => {
    const updated = { ...formMaquis, ...patch }
    setFormMaquis(updated)
    try {
      await api.put('/api/parametrage/maquis', updated)
      afficherMessage('succes', 'Sauvegardé !')
      chargerDonnees()
    } catch { afficherMessage('erreur', 'Erreur sauvegarde') }
  }

  // Catégories
  const ajouterCategorie = () => {
    const v = nouvelleCategorie.trim()
    if (!v || (formMaquis.categories_custom || []).includes(v)) return
    saveCatalogue({ categories_custom: [...(formMaquis.categories_custom || []), v] })
    setNouvelleCategorie(''); setAjoutCatalogue(false)
  }
  const modifierCategorie = (i) => {
    const v = editCatVal.trim()
    if (!v) return
    const arr = [...(formMaquis.categories_custom || [])]
    arr[i] = v
    saveCatalogue({ categories_custom: arr })
    setEditCatIdx(null)
  }
  const supprimerCategorie = (i) =>
    saveCatalogue({ categories_custom: (formMaquis.categories_custom || []).filter((_, j) => j !== i) })

  // Unités
  const ajouterUnite = () => {
    const v = nouvelleUnite.trim()
    if (!v || (formMaquis.unites_custom || []).includes(v)) return
    saveCatalogue({ unites_custom: [...(formMaquis.unites_custom || []), v] })
    setNouvelleUnite(''); setAjoutCatalogue(false)
  }
  const modifierUnite = (i) => {
    const v = editUniteVal.trim()
    if (!v) return
    const arr = [...(formMaquis.unites_custom || [])]
    arr[i] = v
    saveCatalogue({ unites_custom: arr })
    setEditUniteIdx(null)
  }
  const supprimerUnite = (i) =>
    saveCatalogue({ unites_custom: (formMaquis.unites_custom || []).filter((_, j) => j !== i) })

  // Gabarits
  const ajouterGabarit = () => {
    const nom   = nouveauGabarit.nom.trim()
    const coeff = parseFloat(nouveauGabarit.coefficient)
    if (!nom || isNaN(coeff) || coeff <= 0) return
    saveCatalogue({ variantes_gabarits: [...(formMaquis.variantes_gabarits || []), { nom, coefficient: coeff }] })
    setNouveauGabarit({ nom: '', coefficient: '' }); setAjoutCatalogue(false)
  }
  const modifierGabarit = (i) => {
    const nom   = editGabVal.nom.trim()
    const coeff = parseFloat(editGabVal.coefficient)
    if (!nom || isNaN(coeff) || coeff <= 0) return
    const arr = [...(formMaquis.variantes_gabarits || [])]
    arr[i] = { nom, coefficient: coeff }
    saveCatalogue({ variantes_gabarits: arr })
    setEditGabIdx(null)
  }
  const supprimerGabarit = (i) =>
    saveCatalogue({ variantes_gabarits: (formMaquis.variantes_gabarits || []).filter((_, j) => j !== i) })

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Paramétrage</h1>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Gérez vos produits, fournisseurs, utilisateurs et paramètres</p>
        </div>
        <button onClick={chargerDonnees} style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
          🔄 Actualiser
        </button>
      </div>

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
          { key: 'commandes',    label: '🪑 Tables & Stations' },
          { key: 'catalogue',    label: '🏷️ Catalogue' },
          { key: 'abonnement',   label: `💳 Abonnement${urgence ? ' ⚠️' : estExpire ? ' ❌' : ''}` },
        ].map(o => (
          <button key={o.key} onClick={() => { setOnglet(o.key); setModal(null) }} style={styleOnglet(onglet === o.key)}>{o.label}</button>
        ))}
      </div>

      {/* PRODUITS */}
      {onglet === 'produits' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Produits ({produits.length})</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setModal({ type: 'import_csv' })} style={styleBouton('#6b7280')}>⬆ Importer CSV</button>
              <button onClick={() => { setModal({ type: 'produit' }); setFormProduit({ nom: '', categorie: '', prix_vente: '', prix_achat: '', stock_min: '', unite: 'unité', code_barre: '', conditionnement: '', nb_par_cond: '', prix_cond: '', variantes: [] }) }} style={styleBouton()}>+ Nouveau produit</button>
            </div>
          </div>

          {modal?.type === 'import_csv' && (
            <ImportCSV
              couleur={maquis?.couleur_primaire || 'var(--couleur-principale)'}
              onImporte={async (lignes) => {
                await api.post('/api/parametrage/produits/import', { lignes })
                afficherMessage('succes', `${lignes.length} produit(s) importé(s) !`)
                setModal(null)
                chargerDonnees()
              }}
              onAnnuler={() => setModal(null)}
            />
          )}

          {modal?.type === 'produit' && (
            <div id="form-produit" style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>{modal.id ? 'Modifier' : 'Nouveau'} produit</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', overflow: 'visible' }}>
                <input placeholder="Nom du produit *" value={formProduit.nom} onChange={e => setFormProduit({ ...formProduit, nom: e.target.value })} style={styleInput} />
                {(maquis?.categories_custom || []).length > 0
                  ? <SelectRecherche valeur={formProduit.categorie} onChange={v => setFormProduit({ ...formProduit, categorie: v })} options={maquis.categories_custom} placeholder="Choisir une catégorie..." style={styleInput} />
                  : <input placeholder="Catégorie (ex: Boissons)" value={formProduit.categorie} onChange={e => setFormProduit({ ...formProduit, categorie: e.target.value })} style={styleInput} />
                }
                <input type="number" placeholder="Prix de vente *" value={formProduit.prix_vente} onChange={e => setFormProduit({ ...formProduit, prix_vente: e.target.value })} style={styleInput} />
                <input type="number" placeholder="Prix d'achat (optionnel)" value={formProduit.prix_achat} onChange={e => setFormProduit({ ...formProduit, prix_achat: e.target.value })} style={styleInput} />
                <input type="number" placeholder="Seuil d'alerte (stock min)" value={formProduit.stock_min} onChange={e => setFormProduit({ ...formProduit, stock_min: e.target.value })} style={styleInput} />
                {(maquis?.unites_custom || []).length > 0
                  ? <SelectRecherche valeur={formProduit.unite} onChange={v => setFormProduit({ ...formProduit, unite: v })} options={maquis.unites_custom} placeholder="Choisir une unité..." style={styleInput} />
                  : <input placeholder="Unité (bouteille, portion...)" value={formProduit.unite} onChange={e => setFormProduit({ ...formProduit, unite: e.target.value })} style={styleInput} />
                }
                <input placeholder="Code barre (optionnel)" value={formProduit.code_barre} onChange={e => setFormProduit({ ...formProduit, code_barre: e.target.value })} style={styleInput} />
                <input placeholder="Conditionnement (ex: casier, carton)" value={formProduit.conditionnement} onChange={e => setFormProduit({ ...formProduit, conditionnement: e.target.value })} style={styleInput} />
                <input type="number" placeholder="Nb unités par cond. (ex: 24)" value={formProduit.nb_par_cond} onChange={e => setFormProduit({ ...formProduit, nb_par_cond: e.target.value })} style={styleInput} />
                <input type="number" placeholder="Prix du conditionnement" value={formProduit.prix_cond} onChange={e => setFormProduit({ ...formProduit, prix_cond: e.target.value })} style={styleInput} />
              </div>

              {/* Section variantes de vente */}
              <div style={{ marginTop: '4px', marginBottom: '10px', padding: '14px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#374151' }}>Variantes de vente</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>Ex : Casier (24 btle), Verre (0.2 btle)... Le stock se décrémente en unité de base.</p>
                  </div>
                  <button onClick={() => setFormProduit({ ...formProduit, variantes: [...formProduit.variantes, { nom: '', coefficient: '', prix_vente: '' }] })}
                    style={{ padding: '6px 14px', backgroundColor: 'var(--couleur-principale)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                    + Ajouter
                  </button>
                </div>

                {/* Gabarits rapides */}
                {(maquis?.variantes_gabarits || []).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Gabarits rapides :</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {maquis.variantes_gabarits.map((g, i) => (
                        <button key={i} type="button"
                          onClick={() => setFormProduit({ ...formProduit, variantes: [...formProduit.variantes, { nom: g.nom, coefficient: String(g.coefficient), prix_vente: '' }] })}
                          style={{ padding: '4px 12px', borderRadius: 20, border: '1.5px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          + {g.nom} ×{g.coefficient}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <datalist id="noms-variantes">
                  {NOMS_VARIANTES_SUGGERES.map(n => <option key={n} value={n} />)}
                </datalist>

                {formProduit.variantes.length === 0 && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '10px 0' }}>Aucune variante — le produit se vend à l'unité de base</p>
                )}
                {formProduit.variantes.map((v, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input list="noms-variantes" placeholder="Nom (ex: Casier, Verre)" value={v.nom}
                      onChange={e => { const vv = [...formProduit.variantes]; vv[i] = { ...vv[i], nom: e.target.value }; setFormProduit({ ...formProduit, variantes: vv }) }}
                      style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} />
                    <input type="number" placeholder="Coeff (ex: 24)" value={v.coefficient} min="0.01" step="0.01"
                      onChange={e => { const vv = [...formProduit.variantes]; vv[i] = { ...vv[i], coefficient: e.target.value }; setFormProduit({ ...formProduit, variantes: vv }) }}
                      style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} />
                    <input type="number" placeholder="Prix XOF" value={v.prix_vente}
                      onChange={e => { const vv = [...formProduit.variantes]; vv[i] = { ...vv[i], prix_vente: e.target.value }; setFormProduit({ ...formProduit, variantes: vv }) }}
                      style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} />
                    <button onClick={() => { const vv = formProduit.variantes.filter((_, j) => j !== i); setFormProduit({ ...formProduit, variantes: vv }) }}
                      style={{ width: 30, height: 30, backgroundColor: '#fef2f2', border: 'none', borderRadius: '7px', cursor: 'pointer', color: '#dc2626', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                  </div>
                ))}
                {formProduit.variantes.length > 0 && (
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#9ca3af' }}>
                    Coeff = nombre d'unités de base consommées — ex: Verre = 0.33 bouteille
                  </p>
                )}
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
                    {p.variantes?.length > 0 && (
                      <span style={{ display: 'inline-block', marginTop: 3, fontSize: '11px', color: 'var(--couleur-principale)', fontWeight: '600', backgroundColor: 'var(--couleur-principale-light)', padding: '1px 7px', borderRadius: '10px' }}>
                        {p.variantes.length} variante{p.variantes.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{p.categorie || '-'}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: 'var(--couleur-principale)', fontWeight: '600' }}>{parseFloat(p.prix_vente).toLocaleString()} XOF</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{p.prix_achat ? parseFloat(p.prix_achat).toLocaleString() + ' XOF' : '-'}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: parseFloat(p.stock_actuel) <= parseFloat(p.stock_min) ? '#dc2626' : '#16a34a', fontWeight: '600' }}>{p.stock_actuel} {p.unite}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{p.stock_min} {p.unite}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '12px', backgroundColor: p.actif ? '#f0fdf4' : '#f3f4f6', color: p.actif ? '#16a34a' : '#6b7280' }}>{p.actif ? 'Actif' : 'Inactif'}</span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setModal({ type: 'produit', id: p.id }); setFormProduit({ nom: p.nom, categorie: p.categorie || '', prix_vente: p.prix_vente, prix_achat: p.prix_achat || '', stock_min: p.stock_min, unite: p.unite, code_barre: p.code_barre || '', conditionnement: p.conditionnement || '', nb_par_cond: p.nb_par_cond || '', prix_cond: p.prix_cond || '', variantes: (p.variantes || []).map(v => ({ nom: v.nom, coefficient: v.coefficient, prix_vente: v.prix_vente })) }); setTimeout(() => document.getElementById('form-produit')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Modifier</button>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Nom complet *</label>
                  <input value={formUtilisateur.nom} onChange={e => setFormUtilisateur({ ...formUtilisateur, nom: e.target.value })} style={styleInput} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Email *</label>
                  <input type="email" value={formUtilisateur.email} onChange={e => setFormUtilisateur({ ...formUtilisateur, email: e.target.value })} style={styleInput} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Login court <span style={{ fontWeight: '400', color: '#9ca3af' }}>(optionnel — pour se connecter sans email)</span></label>
                  <input placeholder="ex: lamine, vivian..." value={formUtilisateur.login} onChange={e => setFormUtilisateur({ ...formUtilisateur, login: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    style={styleInput} autoComplete="off" />
                  {formUtilisateur.login && <p style={{ fontSize: '11px', color: '#6b7280', margin: '3px 0 0' }}>Laisser vide pour supprimer le login</p>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Nouveau mot de passe <span style={{ fontWeight: '400', color: '#9ca3af' }}>(laisser vide = inchangé)</span></label>
                  <input type="password" placeholder="••••••••" value={formUtilisateur.mot_de_passe} onChange={e => setFormUtilisateur({ ...formUtilisateur, mot_de_passe: e.target.value })} style={styleInput} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Rôle</label>
                  <select value={formUtilisateur.role} onChange={e => setFormUtilisateur({ ...formUtilisateur, role: e.target.value })} style={styleInput}>
                    <option value="serveur">Serveur / Station</option>
                    <option value="caissier">Caissier</option>
                    <option value="gerant">Gérant</option>
                    <option value="patron">Patron</option>
                  </select>
                </div>
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
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                    {u.email}
                    {u.login && <span style={{ display: 'block', fontSize: '11px', color: '#9ca3af' }}>login: {u.login}</span>}
                  </td>
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
                      <button onClick={() => { setModal({ type: 'utilisateur', id: u.id }); setFormUtilisateur({ nom: u.nom, email: u.email, login: u.login || '', mot_de_passe: '', role: u.role }) }} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Modifier</button>
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

          <select value={formMaquis.type} onChange={e => {
            const t = e.target.value
            const couleurs = { maquis: '#FF6B35', restaurant: '#1D4ED8', bar: '#7C3AED', fast_food: '#ea580c', boutique: '#7C3AED', pharmacie: '#16A34A', salon: '#EC4899', autre: '#6b7280' }
            setFormMaquis({ ...formMaquis, type: t, couleur_primaire: couleurs[t] || formMaquis.couleur_primaire })
          }} style={styleInput}>
            <option value="maquis">🍺 Maquis / Gargote</option>
            <option value="restaurant">🍽️ Restaurant</option>
            <option value="bar">🍸 Bar / Café</option>
            <option value="fast_food">🍔 Fast Food</option>
            <option value="boutique">🛍️ Boutique / Commerce</option>
            <option value="pharmacie">💊 Pharmacie</option>
            <option value="salon">💅 Salon de beauté</option>
            <option value="autre">🏪 Autre</option>
          </select>
          <input placeholder="Description (ex: Chez Yigo, Bar de la paix...)" value={formMaquis.activite} onChange={e => setFormMaquis({ ...formMaquis, activite: e.target.value })} style={styleInput} />

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

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Début de journée
              <span style={{ fontWeight: '400', color: '#9ca3af', marginLeft: '6px' }}>— pour les établissements qui travaillent la nuit</span>
            </label>
            <select value={formMaquis.heure_debut_journee} onChange={e => setFormMaquis({ ...formMaquis, heure_debut_journee: parseInt(e.target.value) })} style={styleInput}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h === 0 ? '00h00 — Minuit (défaut)' : `${String(h).padStart(2, '0')}h00`}
                </option>
              ))}
            </select>
            {formMaquis.heure_debut_journee !== 0 && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                La journée du dashboard va de {String(formMaquis.heure_debut_journee).padStart(2,'0')}h00 à {String((formMaquis.heure_debut_journee + 23) % 24).padStart(2,'0')}h59
              </p>
            )}
          </div>

          {/* Modules — visibles seulement pour les activités de service */}
          {['maquis','restaurant','bar','fast_food'].includes(formMaquis.type) && (
            <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: '0 0 4px' }}>Modules commandes</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 14px' }}>Activez selon votre mode de fonctionnement</p>

              {/* Master toggle tablette */}
              {toggleModule('Prise de commande tablette', 'Serveurs sur tablette, gestion des tables', 'module_commandes_actif', formMaquis, setFormMaquis)}

              {formMaquis.module_commandes_actif && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {/* Option KDS */}
                  {toggleModule('🍳 Tablette → KDS → Caisse', 'Commandes passent par l\'écran cuisine/bar avant la caisse', 'module_kds_actif', formMaquis, setFormMaquis, '#7C3AED')}

                  {/* Option Direct */}
                  {toggleModule('💳 Tablette → Direct en caisse', 'Commandes arrivent directement à la caisse sans KDS', 'module_commandes_direct', formMaquis, setFormMaquis, '#16a34a')}

                  {/* Paiement avant */}
                  {toggleModule('⚡ Paiement avant service', 'Mode fast food — client paie à la commande', 'paiement_avant', formMaquis, setFormMaquis, '#f59e0b')}
                </div>
              )}
            </div>
          )}

          <button onClick={soumettreMaquis} style={{ ...styleBouton(), width: '100%', padding: '12px' }}>Sauvegarder les paramètres</button>
        </div>
      )}

      {/* TABLES & STATIONS */}
      {onglet === 'commandes' && (
        <div>
          {!maquis?.module_commandes_actif ? (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>Module non activé</p>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>Activez le module Tablette & KDS dans l'onglet Mon Commerce.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

              {/* Stations */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Stations ({stations.length})</h2>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input placeholder="Nom (ex: Cuisine, Caisse Bar...)" value={formStation.nom} onChange={e => setFormStation({ ...formStation, nom: e.target.value })}
                    style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }} />
                  <input type="color" value={formStation.couleur} onChange={e => setFormStation({ ...formStation, couleur: e.target.value })}
                    style={{ width: 40, height: 36, border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  {[{ v: 'preparation', label: '🍳 Préparation', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' }, { v: 'caisse', label: '💳 Caisse', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }].map(opt => (
                    <button key={opt.v} onClick={() => setFormStation({ ...formStation, type: opt.v })}
                      style={{ flex: 1, padding: '7px', borderRadius: '8px', border: `1px solid ${formStation.type === opt.v ? opt.border : '#e5e7eb'}`, backgroundColor: formStation.type === opt.v ? opt.bg : 'white', color: formStation.type === opt.v ? opt.color : '#6b7280', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                      {opt.label}
                    </button>
                  ))}
                  <button onClick={async () => {
                    try {
                      await api.post('/api/commandes/stations', formStation)
                      setFormStation({ nom: '', couleur: '#6b7280', type: 'preparation' })
                      const res = await api.get('/api/commandes/stations')
                      setStations(res.data.data)
                      afficherMessage('succes', 'Station créée !')
                    } catch (e) { afficherMessage('erreur', e.response?.data?.message || 'Erreur') }
                  }} style={{ ...styleBouton(), padding: '8px 14px' }}>+</button>
                </div>
                <div>
                  {stations.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', backgroundColor: '#f9fafb', marginBottom: '8px' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: s.couleur, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{s.nom}</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', backgroundColor: s.type === 'caisse' ? '#f0fdf4' : '#fff7ed', color: s.type === 'caisse' ? '#16a34a' : '#ea580c' }}>{s.type === 'caisse' ? '💳 Caisse' : '🍳 Prépa'}</span>
                      <button onClick={async () => {
                        try {
                          await api.delete(`/api/commandes/stations/${s.id}`)
                          const res = await api.get('/api/commandes/stations')
                          setStations(res.data.data)
                          afficherMessage('succes', 'Station supprimée')
                        } catch (e) { afficherMessage('erreur', e.response?.data?.message || 'Erreur') }
                      }} style={{ padding: '4px 8px', backgroundColor: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#dc2626' }}>
                        Supprimer
                      </button>
                    </div>
                  ))}
                  {stations.length === 0 && <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '16px' }}>Aucune station. Créez Cuisine, Bar...</p>}
                </div>
              </div>

              {/* Tables */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Tables ({tables.length})</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '6px', marginBottom: '16px', alignItems: 'end' }}>
                  <input type="number" placeholder="N°" value={formTable.numero} onChange={e => setFormTable({ ...formTable, numero: e.target.value })}
                    style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }} />
                  <input placeholder="Nom (optionnel)" value={formTable.nom} onChange={e => setFormTable({ ...formTable, nom: e.target.value })}
                    style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }} />
                  <input type="number" placeholder="Capacité" value={formTable.capacite} onChange={e => setFormTable({ ...formTable, capacite: e.target.value })}
                    style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }} />
                  <button onClick={async () => {
                    try {
                      await api.post('/api/commandes/tables', { numero: parseInt(formTable.numero), nom: formTable.nom || null, capacite: formTable.capacite ? parseInt(formTable.capacite) : null })
                      setFormTable({ numero: '', nom: '', capacite: '' })
                      const res = await api.get('/api/commandes/tables')
                      setTables(res.data.data)
                      afficherMessage('succes', 'Table créée !')
                    } catch (e) { afficherMessage('erreur', e.response?.data?.message || 'Erreur') }
                  }} style={styleBouton()}>+</button>
                </div>
                <div>
                  {tables.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', backgroundColor: '#f9fafb', marginBottom: '8px' }}>
                      <span style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--couleur-principale-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'var(--couleur-principale)', flexShrink: 0 }}>{t.numero}</span>
                      <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{t.nom || `Table ${t.numero}`}{t.capacite ? ` · ${t.capacite} pers.` : ''}</span>
                      <button onClick={async () => {
                        try {
                          await api.delete(`/api/commandes/tables/${t.id}`)
                          const res = await api.get('/api/commandes/tables')
                          setTables(res.data.data)
                          afficherMessage('succes', 'Table supprimée')
                        } catch (e) { afficherMessage('erreur', e.response?.data?.message || 'Erreur') }
                      }} style={{ padding: '4px 8px', backgroundColor: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#dc2626' }}>
                        Supprimer
                      </button>
                    </div>
                  ))}
                  {tables.length === 0 && <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '16px' }}>Aucune table configurée.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CATALOGUE */}
      {onglet === 'catalogue' && (
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

          {/* Sous-onglets */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { key: 'categories', label: `📂 Catégories (${(formMaquis.categories_custom||[]).length})` },
              { key: 'unites',     label: `📏 Unités (${(formMaquis.unites_custom||[]).length})` },
              { key: 'gabarits',   label: `🔖 Gabarits variantes (${(formMaquis.variantes_gabarits||[]).length})` },
            ].map(o => (
              <button key={o.key} onClick={() => { setCatalogueOnglet(o.key); setAjoutCatalogue(false) }}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 13,
                  backgroundColor: catalogueOnglet === o.key ? 'var(--couleur-principale)' : '#f3f4f6',
                  color: catalogueOnglet === o.key ? 'white' : '#374151' }}>
                {o.label}
              </button>
            ))}
          </div>

          {/* SOUS-ONGLET : Catégories */}
          {catalogueOnglet === 'categories' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Catégories ({(formMaquis.categories_custom||[]).length})</h2>
                <button onClick={() => { setAjoutCatalogue(v => !v); setNouvelleCategorie('') }} style={styleBouton()}>
                  {ajoutCatalogue ? 'Annuler' : '+ Nouvelle catégorie'}
                </button>
              </div>
              {ajoutCatalogue && (
                <div style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
                  <input autoFocus placeholder="Nom de la catégorie (ex: Boissons)" value={nouvelleCategorie}
                    onChange={e => setNouvelleCategorie(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { ajouterCategorie() } }}
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
                  <button onClick={() => { ajouterCategorie() }} style={styleBouton()}>Enregistrer</button>
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Nom</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(formMaquis.categories_custom||[]).map((cat, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                      {editCatIdx === i ? (
                        <>
                          <td style={{ padding: '8px 10px' }}>
                            <input autoFocus value={editCatVal} onChange={e => setEditCatVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') modifierCategorie(i); if (e.key === 'Escape') setEditCatIdx(null) }}
                              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--couleur-principale)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => modifierCategorie(i)} style={{ padding: '4px 10px', backgroundColor: 'var(--couleur-principale)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Enregistrer</button>
                              <button onClick={() => setEditCatIdx(null)} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Annuler</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '12px 10px', fontSize: 14, fontWeight: 500 }}>{cat}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => { setEditCatIdx(i); setEditCatVal(cat) }} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Modifier</button>
                              <button onClick={() => supprimerCategorie(i)} style={{ padding: '4px 10px', backgroundColor: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>Supprimer</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {(formMaquis.categories_custom||[]).length === 0 && (
                    <tr><td colSpan={2} style={{ padding: '24px 10px', color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>Aucune catégorie — cliquez sur "+ Nouvelle catégorie"</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* SOUS-ONGLET : Unités */}
          {catalogueOnglet === 'unites' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Unités ({(formMaquis.unites_custom||[]).length})</h2>
                <button onClick={() => { setAjoutCatalogue(v => !v); setNouvelleUnite('') }} style={styleBouton()}>
                  {ajoutCatalogue ? 'Annuler' : '+ Nouvelle unité'}
                </button>
              </div>
              {ajoutCatalogue && (
                <div style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
                  <input autoFocus placeholder="Nom de l'unité (ex: bouteille, kg, portion...)" value={nouvelleUnite}
                    onChange={e => setNouvelleUnite(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { ajouterUnite() } }}
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
                  <button onClick={() => { ajouterUnite() }} style={styleBouton()}>Enregistrer</button>
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Nom</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(formMaquis.unites_custom||[]).map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                      {editUniteIdx === i ? (
                        <>
                          <td style={{ padding: '8px 10px' }}>
                            <input autoFocus value={editUniteVal} onChange={e => setEditUniteVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') modifierUnite(i); if (e.key === 'Escape') setEditUniteIdx(null) }}
                              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--couleur-principale)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => modifierUnite(i)} style={{ padding: '4px 10px', backgroundColor: 'var(--couleur-principale)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Enregistrer</button>
                              <button onClick={() => setEditUniteIdx(null)} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Annuler</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '12px 10px', fontSize: 14, fontWeight: 500 }}>{u}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => { setEditUniteIdx(i); setEditUniteVal(u) }} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Modifier</button>
                              <button onClick={() => supprimerUnite(i)} style={{ padding: '4px 10px', backgroundColor: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>Supprimer</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {(formMaquis.unites_custom||[]).length === 0 && (
                    <tr><td colSpan={2} style={{ padding: '24px 10px', color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>Aucune unité — cliquez sur "+ Nouvelle unité"</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* SOUS-ONGLET : Gabarits */}
          {catalogueOnglet === 'gabarits' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Gabarits de variantes ({(formMaquis.variantes_gabarits||[]).length})</h2>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>Coefficient = nb d'unités de base (ex: Casier = 24 bouteilles). Le prix est renseigné par produit.</p>
                </div>
                <button onClick={() => { setAjoutCatalogue(v => !v); setNouveauGabarit({ nom: '', coefficient: '' }) }} style={styleBouton()}>
                  {ajoutCatalogue ? 'Annuler' : '+ Nouveau gabarit'}
                </button>
              </div>
              {ajoutCatalogue && (
                <div style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
                  <input list="gabarit-noms" autoFocus placeholder="Nom (ex: Casier, Verre, Demi...)" value={nouveauGabarit.nom}
                    onChange={e => setNouveauGabarit({ ...nouveauGabarit, nom: e.target.value })}
                    style={{ flex: 2, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
                  <datalist id="gabarit-noms">{['Casier','Carton','Bouteille','Verre','Demi','Coupe','Dose','Portion','Litre','Pack'].map(n => <option key={n} value={n} />)}</datalist>
                  <input type="number" placeholder="Coefficient (ex: 24)" value={nouveauGabarit.coefficient} min="0.01" step="0.01"
                    onChange={e => setNouveauGabarit({ ...nouveauGabarit, coefficient: e.target.value })}
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
                  <button onClick={() => { ajouterGabarit() }} style={styleBouton()}>Enregistrer</button>
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Nom</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Coefficient</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(formMaquis.variantes_gabarits||[]).map((g, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                      {editGabIdx === i ? (
                        <>
                          <td style={{ padding: '8px 6px' }}>
                            <input autoFocus list="gabarit-noms-edit" value={editGabVal.nom} onChange={e => setEditGabVal({ ...editGabVal, nom: e.target.value })}
                              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--couleur-principale)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
                            <datalist id="gabarit-noms-edit">{['Casier','Carton','Bouteille','Verre','Demi','Coupe','Dose','Portion','Litre','Pack'].map(n => <option key={n} value={n} />)}</datalist>
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <input type="number" value={editGabVal.coefficient} min="0.01" step="0.01" onChange={e => setEditGabVal({ ...editGabVal, coefficient: e.target.value })}
                              onKeyDown={e => { if (e.key === 'Enter') modifierGabarit(i); if (e.key === 'Escape') setEditGabIdx(null) }}
                              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--couleur-principale)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => modifierGabarit(i)} style={{ padding: '4px 10px', backgroundColor: 'var(--couleur-principale)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Enregistrer</button>
                              <button onClick={() => setEditGabIdx(null)} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Annuler</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '12px 10px', fontSize: 14, fontWeight: 600 }}>{g.nom}</td>
                          <td style={{ padding: '12px 10px', fontSize: 13, color: '#6b7280' }}>× {g.coefficient} unité{parseFloat(g.coefficient) > 1 ? 's' : ''}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => { setEditGabIdx(i); setEditGabVal({ nom: g.nom, coefficient: String(g.coefficient) }) }} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Modifier</button>
                              <button onClick={() => supprimerGabarit(i)} style={{ padding: '4px 10px', backgroundColor: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>Supprimer</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {(formMaquis.variantes_gabarits||[]).length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '24px 10px', color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>Aucun gabarit — cliquez sur "+ Nouveau gabarit"</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}

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