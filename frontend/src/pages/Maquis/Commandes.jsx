import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import api from '../../utils/api'

const STATUTS = {
  ouverte:    { bg: '#f3f4f6', color: '#374151', label: 'Ouverte' },
  en_attente: { bg: '#fff7ed', color: '#ea580c', label: 'En attente' },
  en_cours:   { bg: '#fefce8', color: '#ca8a04', label: 'En cours' },
  prete:      { bg: '#f0fdf4', color: '#16a34a', label: 'Prête ✓' },
  servie:     { bg: '#eff6ff', color: '#1d4ed8', label: 'Servie' },
  encaissee:  { bg: '#f9fafb', color: '#9ca3af', label: 'Encaissée' },
  annulee:    { bg: '#fef2f2', color: '#dc2626', label: 'Annulée' },
}

const fmtPrix = (n) => Number(n || 0).toLocaleString('fr-FR')

const Commandes = () => {
  const { utilisateur } = useAuth()
  const { socket } = useSocket()
  const couleur = (utilisateur?.maquis?.couleur_primaire && utilisateur.maquis.couleur_primaire !== 'null')
    ? utilisateur.maquis.couleur_primaire : '#FF6B35'

  const [onglet, setOnglet]             = useState('commander')
  const [produits, setProduits]         = useState([])
  const [tables, setTables]             = useState([])
  const [commandes, setCommandes]       = useState([])
  const [panier, setPanier]             = useState([])
  const [panierOuvert, setPanierOuvert] = useState(false)
  const [recherche, setRecherche]       = useState('')
  const [categorie, setCategorie]       = useState('Tout')
  const [tableId, setTableId]           = useState('')
  const [typeCommande, setTypeCommande] = useState('sur_place')
  const [note, setNote]                 = useState('')
  const [envoi, setEnvoi]               = useState(false)
  const [message, setMessage]           = useState(null)
  const [chargement, setChargement]     = useState(true)
  const [modalFormats, setModalFormats]       = useState(null)
  const [modalAccomp, setModalAccomp]         = useState(null)
  const [modalTourneeSucc, setModalTourneeSucc] = useState(null)
  const flash = (type, texte) => {
    setMessage({ type, texte })
    setTimeout(() => setMessage(null), 3000)
  }

  const chargerProduits = useCallback(async () => {
    try {
      const res = await api.get('/api/stock/produits')
      setProduits(res.data.data.filter(p => parseFloat(p.stock_actuel) > 0 && p.actif))
    } catch {}
  }, [])

  const chargerTables = useCallback(async () => {
    try {
      const res = await api.get('/api/commandes/tables')
      setTables(res.data.data.filter(t => t.actif))
    } catch {}
  }, [])

  const chargerCommandes = useCallback(async () => {
    try {
      const res = await api.get(`/api/commandes?serveur_id=${utilisateur.id}`)
      setCommandes(res.data.data)
    } catch {}
  }, [utilisateur.id])

  useEffect(() => {
    Promise.all([chargerProduits(), chargerTables(), chargerCommandes()])
      .finally(() => setChargement(false))
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('commande:nouvelle',    chargerCommandes)
    socket.on('commande:mise_a_jour', chargerCommandes)
    socket.on('commande:encaissee',   chargerCommandes)
    socket.on('kds:mise_a_jour',      chargerCommandes)
    return () => {
      socket.off('commande:nouvelle')
      socket.off('commande:mise_a_jour')
      socket.off('commande:encaissee')
      socket.off('kds:mise_a_jour')
    }
  }, [socket, chargerCommandes])

  // ── Panier ────────────────────────────────────────────────
  const ajouterAuPanier = (produit) => {
    if (produit.variantes && produit.variantes.length > 0) {
      setModalFormats(produit)
      return
    }
    const cle = `${produit.id}__`
    setPanier(prev => {
      const exist = prev.find(l => l.cle === cle)
      if (exist) return prev.map(l => l.cle === cle ? { ...l, quantite: l.quantite + 1 } : l)
      return [...prev, { cle, produit_id: produit.id, nom: produit.nom, prix_unitaire: parseFloat(produit.prix_vente), quantite: 1, unite: produit.unite, variante_nom: null, coefficient: null }]
    })
  }

  const choisirFormat = (produit, variante) => {
    const cle = `${produit.id}__${variante ? variante.nom : ''}`
    const nom = variante ? `${produit.nom} — ${variante.nom}` : produit.nom
    const prix = variante ? parseFloat(variante.prix_vente) : parseFloat(produit.prix_vente)
    const coeff = variante ? parseFloat(variante.coefficient) : null
    setPanier(prev => {
      const exist = prev.find(l => l.cle === cle)
      if (exist) return prev.map(l => l.cle === cle ? { ...l, quantite: l.quantite + 1 } : l)
      return [...prev, { cle, produit_id: produit.id, nom, prix_unitaire: prix, quantite: 1, unite: produit.unite, variante_nom: variante ? variante.nom : null, coefficient: coeff }]
    })
    setModalFormats(null)
    // Accompagnement offert pour bouteille / demi
    const vnom = variante?.nom?.toLowerCase() || ''
    const estSpirit = produit.variantes?.some(v => v.nom.toLowerCase().includes('tourn'))
    if (variante && vnom.includes('demi')) {
      setModalAccomp({ quantiteSucc: 2, carafeType: 'petite' })
    } else if (!variante && estSpirit) {
      setModalAccomp({ quantiteSucc: 4, carafeType: 'grande' })
    } else if (variante && vnom.includes('tourn') && !vnom.includes('sucr') && !vnom.includes('demi')) {
      const varSucc = produit.variantes?.find(v => v.nom.toLowerCase().includes('tourn') && v.nom.toLowerCase().includes('sucr'))
      setModalTourneeSucc({ produit, varSucc: varSucc || null })
    }
  }

  const choisirTourneeSucc = (produit, varSucc) => {
    // Cas bundle (Tournée + Sucrerie variante existe) : remplacer la Tournée simple
    const varTournee = produit.variantes.find(v => v.nom.toLowerCase().includes('tourn') && !v.nom.toLowerCase().includes('sucr'))
    const cleTournee = varTournee ? `${produit.id}__${varTournee.nom}` : null
    const cle = `${produit.id}__${varSucc.nom}`
    const nom = `${produit.nom} — ${varSucc.nom}`
    const prix = parseFloat(varSucc.prix_vente)
    const coeff = parseFloat(varSucc.coefficient)
    setPanier(prev => {
      const sansTournee = cleTournee ? prev.reduce((acc, l) => {
        if (l.cle === cleTournee) { if (l.quantite > 1) acc.push({ ...l, quantite: l.quantite - 1 }) }
        else acc.push(l)
        return acc
      }, []) : [...prev]
      const exist = sansTournee.find(l => l.cle === cle)
      if (exist) return sansTournee.map(l => l.cle === cle ? { ...l, quantite: l.quantite + 1 } : l)
      return [...sansTournee, { cle, produit_id: produit.id, nom, prix_unitaire: prix, quantite: 1, unite: produit.unite, variante_nom: varSucc.nom, coefficient: coeff }]
    })
    setModalTourneeSucc(null)
  }

  const ajouterSucreriePayante = (sucrerie) => {
    const cle = `${sucrerie.id}__sucr_${Date.now()}`
    setPanier(prev => [...prev, {
      cle, produit_id: sucrerie.id, nom: sucrerie.nom,
      prix_unitaire: parseFloat(sucrerie.prix_vente), quantite: 1,
      unite: sucrerie.unite, variante_nom: null, coefficient: null
    }])
    setModalTourneeSucc(null)
  }

  const ajouterAccomp = (accomp, quantite) => {
    const cle = `${accomp.id}__offert_${Date.now()}`
    setPanier(prev => [...prev, {
      cle, produit_id: accomp.id, nom: `${accomp.nom} (Offert)`,
      prix_unitaire: 0, quantite, unite: accomp.unite,
      variante_nom: 'Offert', coefficient: null
    }])
    setModalAccomp(null)
  }

  const modifierQte = (cle, delta) => {
    setPanier(prev => {
      const updated = prev.map(l => l.cle === cle ? { ...l, quantite: l.quantite + delta } : l)
      return updated.filter(l => l.quantite > 0)
    })
  }

  const totalPanier = panier.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0)
  const nbArticles  = panier.reduce((s, l) => s + l.quantite, 0)

  // ── Envoi commande ────────────────────────────────────────
  const envoyerCommande = async () => {
    if (panier.length === 0) return
    setEnvoi(true)
    try {
      await api.post('/api/commandes', {
        table_id:     tableId ? parseInt(tableId) : null,
        type_commande: typeCommande,
        note:          note.trim() || null,
        lignes:        panier.map(l => ({
          produit_id:   l.produit_id,
          quantite:     l.quantite,
          prix_unitaire: l.prix_unitaire,
          ...(l.variante_nom && { variante_nom: l.variante_nom, coefficient: l.coefficient })
        }))
      })
      setPanier([])
      setNote('')
      setTableId('')
      setPanierOuvert(false)
      flash('succes', 'Commande envoyée !')
      setOnglet('mes_commandes')
      chargerCommandes()
      chargerTables()
    } catch (e) {
      flash('erreur', e.response?.data?.message || 'Erreur lors de l\'envoi')
    } finally {
      setEnvoi(false)
    }
  }

  // ── Marquer servi ─────────────────────────────────────────
  const marquerServi = async (commandeId) => {
    try {
      await api.put(`/api/commandes/${commandeId}/statut`, { statut: 'servie' })
      chargerCommandes()
      chargerTables()
      flash('succes', 'Commande marquée comme servie')
    } catch (e) {
      flash('erreur', e.response?.data?.message || 'Erreur')
    }
  }

  // ── Produits filtrés ──────────────────────────────────────
  const categories = ['Tout', ...new Set(produits.map(p => p.categorie).filter(Boolean))]
  const produitsFiltres = produits.filter(p => {
    const matchCat = categorie === 'Tout' || p.categorie === categorie
    const matchRech = !recherche || p.nom.toLowerCase().includes(recherche.toLowerCase())
    return matchCat && matchRech
  })

  // ── Styles ────────────────────────────────────────────────
  const sOnglet = (actif) => ({
    flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: '600',
    fontSize: '14px', borderRadius: '10px',
    backgroundColor: actif ? couleur : 'transparent',
    color: actif ? 'white' : '#6b7280',
    transition: 'all 0.15s'
  })

  if (chargement) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontSize: 32 }}>⏳</div>
    </div>
  )


  return (
    <div style={{ paddingBottom: 16 }}>

      {/* Message flash */}
      {message && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: message.type === 'succes' ? '#16a34a' : '#dc2626',
          color: 'white', padding: '10px 20px', borderRadius: 12, zIndex: 1000,
          fontSize: 14, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {message.texte}
        </div>
      )}

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 6, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 16 }}>
        <button style={sOnglet(onglet === 'commander')}    onClick={() => setOnglet('commander')}>🛒 Commander</button>
        <button style={sOnglet(onglet === 'mes_commandes')} onClick={() => setOnglet('mes_commandes')}>
          📋 En cours {commandes.filter(c => ['ouverte','en_attente','en_cours','prete'].includes(c.statut)).length > 0 &&
            <span style={{ backgroundColor: couleur, color: 'white', borderRadius: '50%', padding: '0 6px', fontSize: 11, marginLeft: 4 }}>
              {commandes.filter(c => ['ouverte','en_attente','en_cours','prete'].includes(c.statut)).length}
            </span>
          }
        </button>
      </div>

      {/* ── Onglet Commander ── */}
      {onglet === 'commander' && (
        <>
          {/* Config commande */}
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {/* Type commande */}
            <div style={{ display: 'flex', gap: 6, marginBottom: tables.length > 0 ? 10 : 0 }}>
              {[['sur_place','🪑 Sur place'], ['comptoir','🏪 Comptoir'], ['emporter','📦 Emporter']].map(([val, lab]) => (
                <button key={val} onClick={() => setTypeCommande(val)} style={{
                  flex: 1, padding: '8px 4px', border: `2px solid ${typeCommande === val ? couleur : '#e5e7eb'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  backgroundColor: typeCommande === val ? couleur + '15' : 'white',
                  color: typeCommande === val ? couleur : '#6b7280'
                }}>{lab}</button>
              ))}
            </div>

            {/* Sélection table */}
            {tables.length > 0 && (
              <select value={tableId} onChange={e => setTableId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#374151', backgroundColor: 'white' }}>
                <option value="">— Table (optionnelle) —</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    Table {t.numero}{t.nom ? ` — ${t.nom}` : ''} ({t.statut})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Recherche */}
          <input
            placeholder="🔍 Rechercher un produit..."
            value={recherche} onChange={e => setRecherche(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 10, backgroundColor: 'white' }}
          />

          {/* Catégories */}
          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, scrollbarWidth: 'none' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategorie(cat)} style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: 12, fontWeight: 600,
                  backgroundColor: categorie === cat ? couleur : '#f3f4f6',
                  color: categorie === cat ? 'white' : '#374151'
                }}>{cat}</button>
              ))}
            </div>
          )}

          {/* Grille produits */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 80 }}>
            {produitsFiltres.map(p => {
              const lignesProduit = panier.filter(l => l.produit_id === p.id)
              const qteTotal = lignesProduit.reduce((s, l) => s + l.quantite, 0)
              const hasVariantes = p.variantes && p.variantes.length > 0
              return (
                <button key={p.id} onClick={() => ajouterAuPanier(p)}
                  style={{
                    backgroundColor: 'white', border: `2px solid ${qteTotal > 0 ? couleur : '#f3f4f6'}`,
                    borderRadius: 12, padding: '12px 10px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s', boxShadow: qteTotal > 0 ? `0 0 0 2px ${couleur}33` : '0 1px 3px rgba(0,0,0,0.06)'
                  }}>
                  {p.photo_url && (
                    <img src={p.photo_url} alt={p.nom}
                      style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
                  )}
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{p.nom}</p>
                  {p.categorie && <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9ca3af' }}>{p.categorie}</p>}
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: couleur }}>{fmtPrix(p.prix_vente)} XOF</p>
                  {hasVariantes && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>{p.variantes.length} format{p.variantes.length > 1 ? 's' : ''} →</p>
                  )}
                  {qteTotal > 0 && (
                    <div style={{ marginTop: 6, backgroundColor: couleur, color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                      × {qteTotal}
                    </div>
                  )}
                </button>
              )
            })}
            {produitsFiltres.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 }}>
                Aucun produit trouvé
              </div>
            )}
          </div>

          {/* Bouton panier flottant */}
          {panier.length > 0 && (
            <button onClick={() => setPanierOuvert(true)} style={{
              position: 'fixed', bottom: 78, right: 16,
              backgroundColor: couleur, color: 'white',
              border: 'none', borderRadius: 50, padding: '14px 20px',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 200,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              🛒 {nbArticles} — {fmtPrix(totalPanier)} XOF
            </button>
          )}
        </>
      )}

      {/* ── Onglet Mes commandes ── */}
      {onglet === 'mes_commandes' && (
        <div>
          {commandes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
              <p style={{ fontSize: 14 }}>Aucune commande en cours</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {commandes.map(c => {
                const s = STATUTS[c.statut] || STATUTS.ouverte
                const estPrete = c.statut === 'prete'
                return (
                  <div key={c.id} style={{
                    backgroundColor: 'white', borderRadius: 12,
                    border: `2px solid ${estPrete ? '#16a34a' : '#f3f4f6'}`,
                    padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                          Commande #{c.numero}
                        </span>
                        {c.table && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>· Table {c.table.numero}</span>
                        )}
                      </div>
                      <span style={{ backgroundColor: s.bg, color: s.color, borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                        {s.label}
                      </span>
                    </div>

                    {/* Lignes */}
                    <div style={{ marginBottom: 8 }}>
                      {c.lignes.map(l => (
                        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', padding: '2px 0' }}>
                          <span>× {Number(l.quantite)} {l.produit.nom}</span>
                          <span style={{ color: '#6b7280' }}>{fmtPrix(l.prix_unitaire * l.quantite)} XOF</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {new Date(c.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {estPrete && (
                        <button onClick={() => marquerServi(c.id)} style={{
                          backgroundColor: '#16a34a', color: 'white', border: 'none',
                          borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                        }}>
                          🍽️ Marquer servi
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal sélection format ── */}
      {modalFormats && (
        <>
          <div onClick={() => setModalFormats(null)} style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 500
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: 'white', borderRadius: '20px 20px 0 0',
            padding: '20px 16px 32px', zIndex: 501,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.2)'
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
                padding: '14px 16px', border: `2px solid #e5e7eb`, borderRadius: 12,
                backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{modalFormats.unite || 'Unité de base'}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: couleur }}>{fmtPrix(modalFormats.prix_vente)} XOF</span>
              </button>
              {modalFormats.variantes.map(v => (
                <button key={v.id} onClick={() => choisirFormat(modalFormats, v)} style={{
                  padding: '14px 16px', border: `2px solid ${couleur}`, borderRadius: 12,
                  backgroundColor: couleur + '08', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{v.nom}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: couleur }}>{fmtPrix(v.prix_vente)} XOF</span>
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
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: 'white', borderRadius: '20px 20px 0 0',
            padding: '20px 16px 32px', zIndex: 505,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Ajouter sucrerie ?</p>
              <button onClick={() => setModalTourneeSucc(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>Accompagnement payant</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modalTourneeSucc.varSucc ? (
                <button onClick={() => choisirTourneeSucc(modalTourneeSucc.produit, modalTourneeSucc.varSucc)} style={{
                  padding: '13px 16px', border: '2px solid #f59e0b', borderRadius: 12,
                  backgroundColor: '#fffbeb', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{modalTourneeSucc.varSucc.nom}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>{fmtPrix(modalTourneeSucc.varSucc.prix_vente)} XOF</span>
                </button>
              ) : (
                produits.filter(p => p.categorie === 'Sucreries').map(s => (
                  <button key={s.id} onClick={() => ajouterSucreriePayante(s)} style={{
                    padding: '13px 16px', border: '2px solid #f59e0b', borderRadius: 12,
                    backgroundColor: '#fffbeb', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{s.nom}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>{fmtPrix(s.prix_vente)} XOF</span>
                  </button>
                ))
              )}
              <button onClick={() => setModalTourneeSucc(null)} style={{
                padding: '13px 16px', border: '2px solid #e5e7eb', borderRadius: 12,
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
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: 'white', borderRadius: '20px 20px 0 0',
            padding: '20px 16px 32px', zIndex: 503,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto'
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
                  padding: '13px 16px', border: `2px solid ${couleur}`, borderRadius: 12,
                  backgroundColor: couleur + '0d', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{s.nom} × {modalAccomp.quantiteSucc}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Offert</span>
                </button>
              ))}
              {produits.filter(p => p.nom.toLowerCase().startsWith(modalAccomp.carafeType === 'grande' ? 'grande carafe' : 'petite carafe')).map(c => (
                <button key={c.id} onClick={() => ajouterAccomp(c, 1)} style={{
                  padding: '13px 16px', border: '2px solid #3b82f6', borderRadius: 12,
                  backgroundColor: '#eff6ff', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{c.nom}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Offert</span>
                </button>
              ))}
              <button onClick={() => setModalAccomp(null)} style={{
                padding: '13px 16px', border: '2px solid #e5e7eb', borderRadius: 12,
                backgroundColor: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6b7280'
              }}>Sans accompagnement</button>
            </div>
          </div>
        </>
      )}

      {/* ── Panneau panier (bottom sheet) ── */}
      {panierOuvert && (
        <>
          <div onClick={() => setPanierOuvert(false)} style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 300
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: 'white', borderRadius: '20px 20px 0 0',
            padding: '20px 16px 32px', zIndex: 301,
            maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>🛒 Panier ({nbArticles} article{nbArticles > 1 ? 's' : ''})</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setPanier([])} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}>Vider</button>
                <button onClick={() => setPanierOuvert(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
              </div>
            </div>

            {/* Lignes panier */}
            {panier.map(l => (
              <div key={l.cle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{l.nom}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{fmtPrix(l.prix_unitaire)} XOF × {l.quantite}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => modifierQte(l.cle, -1)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', backgroundColor: '#f3f4f6', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>−</button>
                  <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{l.quantite}</span>
                  <button onClick={() => modifierQte(l.cle, +1)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', backgroundColor: couleur, color: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>+</button>
                </div>
              </div>
            ))}

            {/* Note */}
            <input placeholder="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)}
              style={{ width: '100%', margin: '12px 0', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />

            {/* Total + envoyer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: couleur }}>{fmtPrix(totalPanier)} XOF</span>
            </div>
            <button onClick={envoyerCommande} disabled={envoi} style={{
              width: '100%', padding: '14px', backgroundColor: envoi ? '#9ca3af' : couleur,
              color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: envoi ? 'default' : 'pointer', boxShadow: `0 4px 12px ${couleur}55`
            }}>
              {envoi ? 'Envoi...' : '✅ Envoyer à la caisse'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Commandes
