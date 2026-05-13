import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import api from '../../utils/api'

const STATUT_LIGNE = {
  en_attente:     { bg: '#f3f4f6', color: '#374151', icone: '⏳', label: 'En attente' },
  en_preparation: { bg: '#fff7ed', color: '#ea580c', icone: '🔥', label: 'En préparation' },
  prete:          { bg: '#f0fdf4', color: '#16a34a', icone: '✅', label: 'Prête' },
  servie:         { bg: '#eff6ff', color: '#1d4ed8', icone: '🍽️', label: 'Servie' },
  annulee:        { bg: '#fef2f2', color: '#dc2626', icone: '❌', label: 'Annulée' },
}

const STATUT_TABLE = {
  libre:    { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', label: 'Libre' },
  occupee:  { bg: '#fff7ed', border: '#fed7aa', color: '#ea580c', label: 'Occupée' },
  reservee: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'Réservée' },
}

const fmtPrix = (n) => Number(n || 0).toLocaleString('fr-FR')

const Tablette = () => {
  const { utilisateur } = useAuth()
  const { socket } = useSocket()

  const [vue, setVue]                   = useState('tables')
  const [tables, setTables]             = useState([])
  const [stations, setStations]         = useState([])
  const [tableActive, setTableActive]   = useState(null)
  const [commande, setCommande]         = useState(null)
  const [produits, setProduits]         = useState([])
  const [panier, setPanier]             = useState([])
  const [recherche, setRecherche]       = useState('')
  const [chargement, setChargement]     = useState(true)
  const [envoi, setEnvoi]               = useState(false)
  const [message, setMessage]           = useState(null)
  const [typeCommande, setTypeCommande] = useState('sur_place')
  const [moduleActif, setModuleActif]   = useState(true)
  const [modalFormats, setModalFormats]       = useState(null)
  const [modalAccomp, setModalAccomp]         = useState(null)
  const [modalTourneeSucc, setModalTourneeSucc] = useState(null)

  const afficherMessage = (type, texte) => {
    setMessage({ type, texte })
    setTimeout(() => setMessage(null), 3500)
  }

  // ── Chargement initial ───────────────────────────────────────
  const chargerTables = useCallback(async () => {
    try {
      const res = await api.get('/api/commandes/tables')
      setTables(res.data.data)
      setModuleActif(true)
    } catch (e) {
      if (e.response?.data?.message?.includes('non activé')) {
        setModuleActif(false)
      }
    } finally {
      setChargement(false)
    }
  }, [])

  const chargerProduits = useCallback(async () => {
    try {
      const res = await api.get('/api/stock/produits')
      setProduits(res.data.data.filter(p => parseFloat(p.stock_actuel) > 0))
    } catch {}
  }, [])

  const chargerStations = useCallback(async () => {
    try {
      const res = await api.get('/api/commandes/stations')
      setStations(res.data.data)
    } catch {}
  }, [])

  useEffect(() => {
    chargerTables()
    chargerProduits()
    chargerStations()
  }, [])

  // ── Socket.io ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    const rafraichirCommande = (data) => {
      // Met à jour la commande active si c'est la même
      if (commande && data.id === commande.id) setCommande(data)
      // Rafraîchit le plan des tables
      chargerTables()
    }
    socket.on('commande:nouvelle',   chargerTables)
    socket.on('commande:mise_a_jour', rafraichirCommande)
    socket.on('commande:encaissee',   chargerTables)
    socket.on('kds:mise_a_jour',      rafraichirCommande)
    return () => {
      socket.off('commande:nouvelle')
      socket.off('commande:mise_a_jour')
      socket.off('commande:encaissee')
      socket.off('kds:mise_a_jour')
    }
  }, [socket, commande, chargerTables])

  // ── Sélection d'une table ────────────────────────────────────
  const selectionnerTable = async (table) => {
    setTableActive(table)
    setPanier([])
    setRecherche('')
    setTypeCommande('sur_place')
    // Cherche une commande ouverte sur cette table
    try {
      const res = await api.get(`/api/commandes?table_id=${table.id}`)
      const commandeOuverte = res.data.data.find(c =>
        ['ouverte', 'en_cours', 'prete'].includes(c.statut)
      )
      setCommande(commandeOuverte || null)
    } catch {
      setCommande(null)
    }
    setVue('commande')
  }

  const nouvelleCommandeSansTable = () => {
    setTableActive(null)
    setCommande(null)
    setPanier([])
    setRecherche('')
    setTypeCommande('comptoir')
    setVue('commande')
  }

  const retourTables = () => {
    setVue('tables')
    setTableActive(null)
    setCommande(null)
    setPanier([])
    chargerTables()
  }

  // ── Gestion du panier ────────────────────────────────────────
  const ajouterAuPanier = (produit) => {
    if (produit.variantes && produit.variantes.length > 0) {
      setModalFormats(produit)
      return
    }
    const cle = `${produit.id}__`
    setPanier(prev => {
      const existe = prev.find(p => p.cle === cle)
      if (existe) return prev.map(p => p.cle === cle ? { ...p, quantite: p.quantite + 1 } : p)
      return [...prev, { cle, produit_id: produit.id, nom: produit.nom, prix: parseFloat(produit.prix_vente), quantite: 1, note: '', station_id: null, variante_nom: null, coefficient: null }]
    })
  }

  const choisirFormat = (produit, variante) => {
    const cle = `${produit.id}__${variante ? variante.nom : ''}`
    const nom = variante ? `${produit.nom} — ${variante.nom}` : produit.nom
    const prix = variante ? parseFloat(variante.prix_vente) : parseFloat(produit.prix_vente)
    const coeff = variante ? parseFloat(variante.coefficient) : null
    setPanier(prev => {
      const existe = prev.find(p => p.cle === cle)
      if (existe) return prev.map(p => p.cle === cle ? { ...p, quantite: p.quantite + 1 } : p)
      return [...prev, { cle, produit_id: produit.id, nom, prix, quantite: 1, note: '', station_id: null, variante_nom: variante ? variante.nom : null, coefficient: coeff }]
    })
    setModalFormats(null)
    const vnom = variante?.nom?.toLowerCase() || ''
    const estSpirit = produit.variantes?.some(v => v.nom.toLowerCase().includes('tourn'))
    if (variante && vnom.includes('demi')) {
      setModalAccomp({ quantiteSucc: 2, carafeType: 'petite' })
    } else if (!variante && estSpirit) {
      setModalAccomp({ quantiteSucc: 4, carafeType: 'grande' })
    } else if (variante && vnom.includes('tourn') && !vnom.includes('sucr') && !vnom.includes('demi')) {
      const varSucc = produit.variantes?.find(v => v.nom.toLowerCase().includes('tourn') && v.nom.toLowerCase().includes('sucr'))
      if (varSucc) setModalTourneeSucc({ produit, varSucc })
    }
  }

  const choisirTourneeSucc = (produit, variante) => {
    choisirFormat(produit, variante)
    setModalTourneeSucc(null)
  }

  const ajouterAccomp = (accomp, quantite) => {
    const cle = `${accomp.id}__offert_${Date.now()}`
    setPanier(prev => [...prev, {
      cle, produit_id: accomp.id, nom: `${accomp.nom} (Offert)`,
      prix: 0, quantite, note: '', station_id: null,
      variante_nom: 'Offert', coefficient: null
    }])
    setModalAccomp(null)
  }

  const modifierStation = (cle, station_id) => {
    setPanier(prev => prev.map(p => p.cle === cle ? { ...p, station_id: station_id || null } : p))
  }

  const modifierQte = (cle, delta) => {
    setPanier(prev => {
      const item = prev.find(p => p.cle === cle)
      if (!item) return prev
      const nouvelleQte = item.quantite + delta
      if (nouvelleQte <= 0) return prev.filter(p => p.cle !== cle)
      return prev.map(p => p.cle === cle ? { ...p, quantite: nouvelleQte } : p)
    })
  }

  const modifierNote = (cle, note) => {
    setPanier(prev => prev.map(p => p.cle === cle ? { ...p, note } : p))
  }

  const retirerDuPanier = (cle) => {
    setPanier(prev => prev.filter(p => p.cle !== cle))
  }

  // ── Envoi en cuisine ─────────────────────────────────────────
  const envoyerEnCuisine = async () => {
    if (panier.length === 0) return
    setEnvoi(true)
    try {
      const lignes = panier.map(p => ({
        produit_id:    p.produit_id,
        quantite:      p.quantite,
        note:          p.note || null,
        station_id:    p.station_id || null,
        prix_unitaire: p.prix,
        ...(p.variante_nom && { variante_nom: p.variante_nom, coefficient: p.coefficient })
      }))

      if (commande) {
        // Ajouter à la commande existante
        const res = await api.post(`/api/commandes/${commande.id}/lignes`, { lignes })
        setCommande(res.data.data)
      } else {
        // Nouvelle commande
        const res = await api.post('/api/commandes', {
          table_id:      tableActive?.id || null,
          type_commande: typeCommande,
          lignes
        })
        setCommande(res.data.data)
      }

      setPanier([])
      afficherMessage('succes', `✅ ${lignes.length} article(s) envoyé(s) en cuisine !`)
      chargerTables()
    } catch (e) {
      afficherMessage('erreur', e.response?.data?.message || 'Erreur lors de l\'envoi')
    } finally {
      setEnvoi(false)
    }
  }

  // ── Annuler une ligne en attente ─────────────────────────────
  const annulerLigne = async (ligneId) => {
    try {
      const res = await api.put(`/api/commandes/lignes/${ligneId}/statut`, { statut: 'annulee' })
      setCommande(res.data.data)
      afficherMessage('succes', 'Article annulé')
    } catch (e) {
      afficherMessage('erreur', e.response?.data?.message || 'Erreur')
    }
  }

  // ── Envoyer en caisse ────────────────────────────────────────
  const envoyerEnCaisse = async () => {
    if (!commande) return
    try {
      await api.put(`/api/commandes/${commande.id}/statut`, { statut: 'servie' })
      afficherMessage('succes', '🍽️ Commande envoyée en caisse !')
      setTimeout(retourTables, 1500)
    } catch (e) {
      afficherMessage('erreur', e.response?.data?.message || 'Erreur')
    }
  }

  const produitsFiltres = produits.filter(p =>
    p.nom.toLowerCase().includes(recherche.toLowerCase())
  )

  const totalPanier = panier.reduce((s, p) => s + p.prix * p.quantite, 0)
  const totalCommande = commande?.lignes
    ?.filter(l => l.statut !== 'annulee')
    .reduce((s, l) => s + parseFloat(l.prix_unitaire) * parseFloat(l.quantite), 0) || 0

  // ── MODULE NON ACTIVÉ ────────────────────────────────────────
  if (!chargement && !moduleActif) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <p style={{ fontSize: 48 }}>🔒</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Module commandes non activé</h2>
      <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', maxWidth: 360 }}>
        Activez le module dans Paramétrage → Mon Commerce pour utiliser la tablette serveur.
      </p>
    </div>
  )

  if (chargement) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 48, height: 48, border: '4px solid #f3f4f6', borderTop: '4px solid var(--couleur-principale)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ════════════════════════════════════════════════════════════
  // VUE — PLAN DES TABLES
  // ════════════════════════════════════════════════════════════
  if (vue === 'tables') return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Tablette serveur</h1>
          <p style={{ color: '#9ca3af', fontSize: 14, margin: '4px 0 0' }}>Sélectionnez une table pour prendre une commande</p>
        </div>
        <button onClick={nouvelleCommandeSansTable}
          style={{ padding: '10px 20px', backgroundColor: 'var(--couleur-principale)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Comptoir / Emporter
        </button>
      </div>

      {message && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          backgroundColor: message.type === 'succes' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'succes' ? '#16a34a' : '#dc2626',
          border: `1px solid ${message.type === 'succes' ? '#bbf7d0' : '#fecaca'}` }}>
          {message.texte}
        </div>
      )}

      {tables.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 40, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>🪑</p>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>Aucune table configurée</h2>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Ajoutez des tables depuis Paramétrage → Mon Commerce.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {tables.map(table => {
            const s = STATUT_TABLE[table.statut] || STATUT_TABLE.libre
            const commandeEnCours = table.commandes?.[0]
            const nbArticles = commandeEnCours?.lignes?.filter(l => l.statut !== 'annulee').length || 0
            return (
              <div key={table.id} onClick={() => selectionnerTable(table)} style={{
                backgroundColor: s.bg, border: `2px solid ${s.border}`,
                borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0, fontFamily: 'Georgia, serif' }}>
                    {table.numero}
                  </p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.color, backgroundColor: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: 20 }}>
                    {s.label}
                  </span>
                </div>
                {table.nom && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', fontWeight: 500 }}>{table.nom}</p>}
                {table.capacite && <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>👥 {table.capacite} pers.</p>}
                {table.statut === 'occupee' && nbArticles > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${s.border}` }}>
                    <p style={{ fontSize: 12, color: s.color, margin: 0, fontWeight: 600 }}>
                      {nbArticles} article{nbArticles > 1 ? 's' : ''} en cours
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ════════════════════════════════════════════════════════════
  // VUE — PRISE DE COMMANDE
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 32px)', gap: 0 }}>

      {/* ── Modal sélection format ── */}
      {modalFormats && (
        <>
          <div onClick={() => setModalFormats(null)} style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 500
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: 'white', borderRadius: 16, padding: 24, zIndex: 501,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)', minWidth: 320, maxWidth: 420, width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Quel format ?</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>{modalFormats.nom}</p>
              </div>
              <button onClick={() => setModalFormats(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => choisirFormat(modalFormats, null)} style={{
                padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 10,
                backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{modalFormats.unite || 'Unité de base'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--couleur-principale)' }}>{fmtPrix(modalFormats.prix_vente)} XOF</span>
              </button>
              {modalFormats.variantes.map(v => (
                <button key={v.id} onClick={() => choisirFormat(modalFormats, v)} style={{
                  padding: '12px 16px', border: '2px solid var(--couleur-principale)', borderRadius: 10,
                  backgroundColor: 'rgba(var(--couleur-principale-rgb, 255,107,53),0.05)', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{v.nom}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--couleur-principale)' }}>{fmtPrix(v.prix_vente)} XOF</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {modalTourneeSucc && (
        <>
          <div onClick={() => setModalTourneeSucc(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 504 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: 'white', borderRadius: 16, padding: 24, zIndex: 505,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)', minWidth: 300, maxWidth: 400, width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Ajouter sucrerie ?</p>
              <button onClick={() => setModalTourneeSucc(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>Accompagnement payant</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => choisirTourneeSucc(modalTourneeSucc.produit, modalTourneeSucc.varSucc)} style={{
                padding: '12px 16px', border: '2px solid #f59e0b', borderRadius: 10,
                backgroundColor: '#fffbeb', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{modalTourneeSucc.varSucc.nom}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>{fmtPrix(modalTourneeSucc.varSucc.prix_vente)} XOF</span>
              </button>
              <button onClick={() => setModalTourneeSucc(null)} style={{
                padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 10,
                backgroundColor: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6b7280'
              }}>Non merci</button>
            </div>
          </div>
        </>
      )}

      {modalAccomp && (
        <>
          <div onClick={() => setModalAccomp(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 502 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: 'white', borderRadius: 16, padding: 24, zIndex: 503,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)', minWidth: 320, maxWidth: 440, width: '90%', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>🎁 Accompagnement offert ?</p>
              <button onClick={() => setModalAccomp(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>
              {modalAccomp.quantiteSucc} sucrerie(s) ou 1 {modalAccomp.carafeType === 'grande' ? 'Grande Carafe' : 'Petite Carafe'} — offert(e)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {produits.filter(p => p.categorie === 'Sucreries').map(s => (
                <button key={s.id} onClick={() => ajouterAccomp(s, modalAccomp.quantiteSucc)} style={{
                  padding: '12px 16px', border: '2px solid var(--couleur-principale)', borderRadius: 10,
                  backgroundColor: 'rgba(var(--couleur-principale-rgb,255,107,53),0.05)', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.nom} × {modalAccomp.quantiteSucc}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Offert</span>
                </button>
              ))}
              {produits.filter(p => p.nom.toLowerCase().startsWith(modalAccomp.carafeType === 'grande' ? 'grande carafe' : 'petite carafe')).map(c => (
                <button key={c.id} onClick={() => ajouterAccomp(c, 1)} style={{
                  padding: '12px 16px', border: '2px solid #3b82f6', borderRadius: 10,
                  backgroundColor: '#eff6ff', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{c.nom}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Offert</span>
                </button>
              ))}
              <button onClick={() => setModalAccomp(null)} style={{
                padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 10,
                backgroundColor: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6b7280'
              }}>Sans accompagnement</button>
            </div>
          </div>
        </>
      )}

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={retourTables}
          style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          ← Tables
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {tableActive ? `Table ${tableActive.numero}${tableActive.nom ? ` — ${tableActive.nom}` : ''}` : 'Comptoir / Emporter'}
          </h2>
          {commande && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
              Commande #{commande.numero} · {commande.lignes?.filter(l => l.statut !== 'annulee').length} article(s)
              {commande.temps_preparation && (
                <span style={{ marginLeft: 8, color: '#1d4ed8', fontWeight: 600 }}>
                  ⏱️ ~{commande.temps_preparation} min
                </span>
              )}
            </p>
          )}
        </div>
        {!tableActive && (
          <select value={typeCommande} onChange={e => setTypeCommande(e.target.value)}
            style={{ marginLeft: 'auto', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            <option value="comptoir">Comptoir</option>
            <option value="emporter">À emporter</option>
          </select>
        )}
      </div>

      {message && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 10, fontSize: 14,
          backgroundColor: message.type === 'succes' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'succes' ? '#16a34a' : '#dc2626',
          border: `1px solid ${message.type === 'succes' ? '#bbf7d0' : '#fecaca'}` }}>
          {message.texte}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flex: 1, overflow: 'hidden' }}>

        {/* ── COLONNE GAUCHE : catalogue produits ── */}
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <input type="text" placeholder="Rechercher un produit..." value={recherche} onChange={e => setRecherche(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, alignContent: 'start' }}>
            {produitsFiltres.map(produit => (
              <div key={produit.id} onClick={() => ajouterAuPanier(produit)}
                style={{ padding: 12, borderRadius: 10, border: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'center', transition: 'all 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff7ed'; e.currentTarget.style.borderColor = 'var(--couleur-principale)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#f3f4f6' }}
              >
                {produit.photo_url
                  ? <img src={produit.photo_url} alt={produit.nom} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', marginBottom: 6 }} />
                  : <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 6px' }}>🍽️</div>
                }
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{produit.nom}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--couleur-principale)' }}>{fmtPrix(produit.prix_vente)} XOF</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── COLONNE DROITE : commande ── */}
        <div style={{ width: 360, backgroundColor: 'white', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>

          {/* Articles déjà envoyés */}
          {commande && commande.lignes?.filter(l => l.statut !== 'annulee').length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                En cuisine
              </p>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {commande.lignes.filter(l => l.statut !== 'annulee').map(ligne => {
                  const s = STATUT_LIGNE[ligne.statut] || STATUT_LIGNE.en_attente
                  return (
                    <div key={ligne.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, backgroundColor: s.bg, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{s.icone}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ligne.produit?.nom} × {parseFloat(ligne.quantite)}
                        </p>
                        {ligne.note && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>{ligne.note}</p>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
                      {ligne.statut === 'en_attente' && (
                        <button onClick={() => annulerLigne(ligne.id)}
                          style={{ padding: '2px 6px', backgroundColor: '#fef2f2', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>
                          ✕
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>Sous-total commande</span>
                <span style={{ fontWeight: 700 }}>{fmtPrix(totalCommande)} XOF</span>
              </div>
            </div>
          )}

          {/* Séparateur si les deux sections sont visibles */}
          {commande && panier.length > 0 && (
            <div style={{ borderTop: '2px dashed #e5e7eb', margin: '4px 0 12px' }} />
          )}

          {/* Nouveau panier */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {panier.length === 0 && !commande && (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 20px', fontSize: 14 }}>
                Touchez un produit pour l'ajouter à la commande
              </p>
            )}
            {panier.length === 0 && commande && (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px', fontSize: 13 }}>
                Ajoutez des articles supplémentaires
              </p>
            )}
            {panier.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    À envoyer
                  </p>
                  <button onClick={() => setPanier([])} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}>Vider</button>
                </div>
                {panier.map(item => (
                  <div key={item.cle} style={{ padding: '10px', borderRadius: 8, backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.nom}</p>
                      <button onClick={() => retirerDuPanier(item.cle)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <button onClick={() => modifierQte(item.cle, -1)}
                        style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>-</button>
                      <span style={{ minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>{item.quantite}</span>
                      <button onClick={() => modifierQte(item.cle, 1)}
                        style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>+</button>
                      <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--couleur-principale)' }}>
                        {fmtPrix(item.prix * item.quantite)} XOF
                      </span>
                    </div>
                    <input type="text" placeholder="Note (ex: sans oignon...)" value={item.note}
                      onChange={e => modifierNote(item.cle, e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', color: '#6b7280', marginBottom: stations.length > 0 ? 4 : 0 }} />
                    {stations.length > 0 && (
                      <select value={item.station_id || ''} onChange={e => modifierStation(item.cle, e.target.value)}
                        style={{ width: '100%', padding: '5px 8px', border: `1px solid ${item.station_id ? 'var(--couleur-principale)' : '#e5e7eb'}`, borderRadius: 6, fontSize: 12, color: item.station_id ? 'var(--couleur-principale)' : '#9ca3af', fontWeight: item.station_id ? 600 : 400 }}>
                        <option value="">📍 Station (toutes)</option>
                        {stations.map(s => (
                          <option key={s.id} value={s.id}>{s.nom}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: 12, marginTop: 8 }}>
            {panier.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>À envoyer</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--couleur-principale)' }}>{fmtPrix(totalPanier)} XOF</span>
              </div>
            )}

            {panier.length > 0 && (
              <button onClick={envoyerEnCuisine} disabled={envoi}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', backgroundColor: 'var(--couleur-principale)', color: 'white', fontSize: 15, fontWeight: 700, cursor: envoi ? 'not-allowed' : 'pointer', marginBottom: 8, opacity: envoi ? 0.7 : 1 }}>
                {envoi ? '⏳ Envoi...' : `🔥 Envoyer en cuisine (${panier.length} article${panier.length > 1 ? 's' : ''})`}
              </button>
            )}

            {commande && ['en_cours', 'prete', 'ouverte'].includes(commande.statut) && panier.length === 0 && !utilisateur?.maquis?.paiement_avant && (
              <button onClick={envoyerEnCaisse}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', backgroundColor: '#16a34a', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                🍽️ Envoyer en caisse — {fmtPrix(totalCommande)} XOF
              </button>
            )}
            {commande && utilisateur?.maquis?.paiement_avant && panier.length === 0 && (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, margin: 0 }}>
                💳 Paiement à la commande — géré par la caisse
              </p>
            )}

            {!commande && panier.length === 0 && (
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, margin: 0 }}>
                Ajoutez des articles pour créer une commande
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tablette
