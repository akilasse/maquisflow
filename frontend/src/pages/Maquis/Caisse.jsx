import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import api from '../../utils/api'
import { sauvegarderVenteOffline, getVentesPending, marquerVenteSynced, compterVentesPending } from '../../utils/offlineDB'

const MODES_PAIEMENT = [
  { value: 'especes',      label: 'Espèces',     bg: '#16a34a', color: 'white',   icone: '💵' },
  { value: 'wave',         label: 'Wave',         bg: '#1D4ED8', color: 'white',   icone: '🐧' },
  { value: 'orange_money', label: 'Orange Money', bg: '#FF6B00', color: 'white',   icone: '📱' },
  { value: 'mtn_money',    label: 'MTN Money',    bg: '#FFCC00', color: '#111827', icone: '📱' },
  { value: 'credit',       label: 'Crédit',       bg: '#7c3aed', color: 'white',   icone: '📝' },
  { value: 'autre',        label: 'Autre',        bg: '#6b7280', color: 'white',   icone: '💳' },
]

const Caisse = () => {
  const { utilisateur } = useAuth()
  const { socket } = useSocket()
  const [produits, setProduits]               = useState([])
  const [panier, setPanier]                   = useState([])
  const [recherche, setRecherche]             = useState('')
  const [modePaiement, setModePaiement]       = useState('especes')
  const [note, setNote]                       = useState('')
  const [montantRecu, setMontantRecu]         = useState('')
  const [chargement, setChargement]           = useState(false)
  const [chargementProduits, setChargementProduits] = useState(true)
  const [message, setMessage]                 = useState(null)
  const [dernierRecu, setDernierRecu]         = useState(null)
  const [afficherRecu, setAfficherRecu]       = useState(false)
  const [isOnline, setIsOnline]               = useState(navigator.onLine)
  const [ventesEnAttente, setVentesEnAttente] = useState(0)
  const [syncEnCours, setSyncEnCours]         = useState(false)
  const [categorie,        setCategorie]        = useState('Tout')
  const [ongletMobile,     setOngletMobile]     = useState('produits')
  const [commandesTablette, setCommandesTablette] = useState([])
  const [commandeActive, setCommandeActive]       = useState(null)
  const [venteActive, setVenteActive]             = useState(null)
  const [voirCommandes, setVoirCommandes]         = useState(false)
  const [modalVariantes, setModalVariantes]       = useState(null) // produit dont on choisit la variante


  // Surveiller connexion
  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  syncVentesOffline() }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Compter ventes en attente
  useEffect(() => {
    compterVentesPending().then(setVentesEnAttente).catch(() => {})
  }, [])

  const chargerProduits = useCallback(async () => {
    try {
      const response = await api.get('/api/stock/produits')
      setProduits(response.data.data)
      // Mettre en cache pour mode offline
      localStorage.setItem('produits_cache', JSON.stringify(response.data.data))
    } catch (error) {
      // Si offline, utiliser le cache
      const cache = localStorage.getItem('produits_cache')
      if (cache) {
        setProduits(JSON.parse(cache))
        setMessage({ type: 'info', texte: '📴 Mode hors ligne — produits depuis le cache' })
      } else {
        setMessage({ type: 'erreur', texte: 'Erreur chargement produits' })
      }
    } finally {
      setChargementProduits(false)
    }
  }, [])

  useEffect(() => { chargerProduits() }, [])

  // Commandes tablette + ventes remises en attente
  const chargerCommandesTablette = useCallback(async () => {
    try {
      const promises = []
      if (utilisateur?.maquis?.module_commandes_actif) {
        // Caisse : uniquement les commandes envoyées en attente de paiement
        promises.push(
          api.get('/api/commandes?statut=en_attente').then(r => (r.data.data || []).map(c => ({ ...c, _type: 'commande' })))
        )
      }
      // Ventes remises en attente par le gérant — sans filtre date (peut être d'un autre jour)
      promises.push(
        api.get('/api/ventes?statut=en_attente&date_debut=2020-01-01').then(r => (r.data.data || []).map(v => ({ ...v, _type: 'vente' })))
      )
      const results = await Promise.all(promises)
      setCommandesTablette(results.flat())
    } catch {}
  }, [utilisateur?.maquis?.module_commandes_actif])

  useEffect(() => { chargerCommandesTablette() }, [chargerCommandesTablette])


  // Socket : nouvelles commandes + ventes remises en attente
  useEffect(() => {
    if (!socket) return
    const refresh = () => chargerCommandesTablette()
    const onDashboard = (data) => {
      if (data.type === 'retour_attente') chargerCommandesTablette()
    }
    if (utilisateur?.maquis?.module_commandes_actif) {
      socket.on('commande:mise_a_jour', refresh)
      socket.on('commande:nouvelle', refresh)
      socket.on('commande:encaissee', refresh)
    }
    socket.on('dashboard:update', onDashboard)
    return () => {
      socket.off('commande:mise_a_jour', refresh)
      socket.off('commande:nouvelle', refresh)
      socket.off('commande:encaissee', refresh)
      socket.off('dashboard:update', onDashboard)
    }
  }, [socket, chargerCommandesTablette, utilisateur?.maquis?.module_commandes_actif])

  const selectionnerCommande = (commande) => {
    const lignesActives = commande.lignes.filter(l => l.statut !== 'annulee')
    const panierCommande = lignesActives.map(l => ({
      panier_key:     `loaded_${l.id}`,
      produit_id:     l.produit_id,
      nom:            l.produit?.nom || `Produit #${l.produit_id}`,
      quantite:       parseFloat(l.quantite),
      prix_catalogue: parseFloat(l.prix_unitaire),
      prix_applique:  parseFloat(l.prix_unitaire),
      unite:          l.produit?.unite || 'unité',
      stock_max:      9999,
      variante_nom:   l.variante_nom || null,
      coefficient:    l.coefficient ? parseFloat(l.coefficient) : null
    }))
    setPanier(panierCommande)
    setCommandeActive(commande)
    setVenteActive(null)
    setVoirCommandes(false)
    setOngletMobile('panier')
    setNote(`Commande #${commande.numero}${commande.table ? ` - Table ${commande.table.numero}` : ''}`)
  }

  const selectionnerVente = (vente) => {
    const lignes = vente.lignes.map(l => ({
      panier_key:     `loaded_${l.id}`,
      produit_id:     l.produit_id,
      nom:            l.produit?.nom || `Produit #${l.produit_id}`,
      quantite:       parseFloat(l.quantite),
      prix_catalogue: parseFloat(l.prix_catalogue || l.prix_unitaire),
      prix_applique:  parseFloat(l.prix_unitaire),
      unite:          l.variante_nom || l.produit?.unite || 'unité',
      stock_max:      9999,
      variante_nom:   l.variante_nom || null,
      coefficient:    l.coefficient ? parseFloat(l.coefficient) : null
    }))
    setPanier(lignes)
    setVenteActive(vente)
    setCommandeActive(null)
    setVoirCommandes(false)
    setOngletMobile('panier')
    setNote(vente.note || `Vente #${vente.id}`)
  }

  const annulerSelectionCommande = () => {
    setCommandeActive(null)
    setVenteActive(null)
    setPanier([])
    setNote('')
  }


  // Synchroniser ventes offline
  const syncVentesOffline = useCallback(async () => {
    const pending = await getVentesPending()
    if (pending.length === 0) return
    setSyncEnCours(true)
    setMessage({ type: 'info', texte: `🔄 Synchronisation de ${pending.length} vente(s) en attente...` })
    let synced = 0
    for (const vente of pending) {
      try {
        await api.post('/api/ventes', {
          mode_paiement: vente.mode_paiement,
          note:          vente.note,
          lignes:        vente.lignes
        })
        await marquerVenteSynced(vente.id)
        synced++
      } catch (e) {
        console.error('Erreur sync vente', vente.id, e)
      }
    }
    setSyncEnCours(false)
    const restant = pending.length - synced
    setVentesEnAttente(restant)
    if (synced > 0) {
      setMessage({ type: 'succes', texte: `✅ ${synced} vente(s) synchronisée(s) avec succès !` })
      chargerProduits()
    }
  }, [chargerProduits])

  const categories = ['Tout', ...new Set(produits.filter(p => p.categorie).map(p => p.categorie))]
  const produitsFiltres = produits.filter(p =>
    parseFloat(p.stock_actuel) > 0 &&
    p.nom.toLowerCase().includes(recherche.toLowerCase()) &&
    (categorie === 'Tout' || p.categorie === categorie)
  )

  const ajouterAuPanier = (produit) => {
    // Si le produit a des variantes, afficher le sélecteur de variante
    if (produit.variantes && produit.variantes.length > 0) {
      setModalVariantes(produit)
      return
    }
    const panier_key = String(produit.id)
    const existe = panier.find(p => p.panier_key === panier_key)
    if (existe) {
      if (existe.quantite >= parseFloat(produit.stock_actuel)) {
        setMessage({ type: 'erreur', texte: `Stock insuffisant pour ${produit.nom}` })
        return
      }
      setPanier(panier.map(p => p.panier_key === panier_key ? { ...p, quantite: p.quantite + 1 } : p))
    } else {
      setPanier([...panier, {
        panier_key,
        produit_id:     produit.id,
        nom:            produit.nom,
        quantite:       1,
        prix_catalogue: parseFloat(produit.prix_vente),
        prix_applique:  parseFloat(produit.prix_vente),
        unite:          produit.unite,
        stock_max:      parseFloat(produit.stock_actuel),
        variante_nom:   null,
        coefficient:    null
      }])
    }
    setMessage(null)
  }

  const ajouterVarianteAuPanier = (produit, variante) => {
    const panier_key = `${produit.id}_${variante.nom}`
    const coeff = parseFloat(variante.coefficient)
    const stockDispoVariantes = Math.floor(parseFloat(produit.stock_actuel) / coeff)
    const existe = panier.find(p => p.panier_key === panier_key)
    if (existe) {
      if (existe.quantite >= stockDispoVariantes) {
        setMessage({ type: 'erreur', texte: `Stock insuffisant pour ${produit.nom} — ${variante.nom}` })
        setModalVariantes(null)
        return
      }
      setPanier(panier.map(p => p.panier_key === panier_key ? { ...p, quantite: p.quantite + 1 } : p))
    } else {
      if (stockDispoVariantes <= 0) {
        setMessage({ type: 'erreur', texte: `Stock insuffisant pour ${produit.nom} — ${variante.nom}` })
        setModalVariantes(null)
        return
      }
      setPanier([...panier, {
        panier_key,
        produit_id:     produit.id,
        nom:            produit.nom,
        quantite:       1,
        prix_catalogue: parseFloat(variante.prix_vente),
        prix_applique:  parseFloat(variante.prix_vente),
        unite:          variante.nom,
        stock_max:      stockDispoVariantes,
        variante_nom:   variante.nom,
        coefficient:    coeff
      }])
    }
    setModalVariantes(null)
    setMessage(null)
  }

  const modifierQuantite = (panier_key, nouvelleQuantite) => {
    if (nouvelleQuantite <= 0) { retirerDuPanier(panier_key); return }
    const item = panier.find(p => p.panier_key === panier_key)
    if (nouvelleQuantite > item.stock_max) {
      setMessage({ type: 'erreur', texte: 'Quantité dépasse le stock disponible' })
      return
    }
    setPanier(panier.map(p => p.panier_key === panier_key ? { ...p, quantite: nouvelleQuantite } : p))
  }

  const modifierPrix = (panier_key, nouveauPrix) => {
    setPanier(panier.map(p => p.panier_key === panier_key ? { ...p, prix_applique: parseFloat(nouveauPrix) || 0 } : p))
  }

  const retirerDuPanier = (panier_key) => {
    setPanier(panier.filter(p => p.panier_key !== panier_key))
  }

  const totalPanier = panier.reduce((total, item) => total + (item.prix_applique * item.quantite), 0)
  const monnaie = modePaiement === 'especes' && montantRecu ? parseFloat(montantRecu) - totalPanier : null

  const viderPanier = () => {
    setPanier([])
    setNote('')
    setMontantRecu('')
    setMessage(null)
  }

  const validerVente = async () => {
    if (panier.length === 0) { setMessage({ type: 'erreur', texte: 'Le panier est vide' }); return }
    if (modePaiement === 'especes' && montantRecu && parseFloat(montantRecu) < totalPanier) {
      setMessage({ type: 'erreur', texte: 'Montant reçu insuffisant !' }); return
    }
    setChargement(true)
    setMessage(null)

    const venteData = {
      mode_paiement: modePaiement,
      note,
      lignes: panier.map(item => ({
        produit_id:    item.produit_id,
        quantite:      item.quantite,
        prix_applique: item.prix_applique,
        ...(item.variante_nom  ? { variante_nom:  item.variante_nom  } : {}),
        ...(item.coefficient   ? { coefficient:   item.coefficient   } : {})
      }))
    }

    try {
      if (!isOnline) throw new Error('OFFLINE')

      let response
      if (commandeActive) {
        // Encaissement d'une commande tablette
        response = await api.post(`/api/commandes/${commandeActive.id}/encaisser`, {
          mode_paiement: modePaiement,
          note_vente: note
        })
        setCommandeActive(null)
        await chargerCommandesTablette()
      } else if (venteActive) {
        // Ré-encaissement d'une vente remise en attente par le gérant
        response = await api.put(`/api/ventes/${venteActive.id}/encaisser`, {
          mode_paiement: modePaiement
        })
        setVenteActive(null)
        await chargerCommandesTablette()
      } else {
        response = await api.post('/api/ventes', venteData)
      }

      setDernierRecu({
        id:            response.data.data?.id || Date.now(),
        date:          new Date(),
        maquis:        utilisateur?.maquis?.nom,
        caissier:      utilisateur?.nom,
        lignes:        [...panier],
        total:         totalPanier,
        mode_paiement: modePaiement,
        montant_recu:  montantRecu ? parseFloat(montantRecu) : null,
        monnaie,
        note,
        offline:       false
      })
      setAfficherRecu(true)
      viderPanier()
      const r2 = await api.get('/api/stock/produits')
      setProduits(r2.data.data)
      localStorage.setItem('produits_cache', JSON.stringify(r2.data.data))

    } catch (error) {
      // MODE OFFLINE — sauvegarder localement
      if (!isOnline || error.message === 'OFFLINE' || !error.response) {
        await sauvegarderVenteOffline(venteData)
        const nb = await compterVentesPending()
        setVentesEnAttente(nb)

        // Mettre à jour le stock localement (respecte les coefficients)
        const produitsUpdates = produits.map(p => {
          const lignesProduit = panier.filter(l => l.produit_id === p.id)
          if (lignesProduit.length > 0) {
            const deduction = lignesProduit.reduce((s, l) => s + l.quantite * (l.coefficient || 1), 0)
            return { ...p, stock_actuel: String(parseFloat(p.stock_actuel) - deduction) }
          }
          return p
        })
        setProduits(produitsUpdates)
        localStorage.setItem('produits_cache', JSON.stringify(produitsUpdates))

        setDernierRecu({
          id:            `OFF-${Date.now()}`,
          date:          new Date(),
          maquis:        utilisateur?.maquis?.nom,
          caissier:      utilisateur?.nom,
          lignes:        [...panier],
          total:         totalPanier,
          mode_paiement: modePaiement,
          montant_recu:  montantRecu ? parseFloat(montantRecu) : null,
          monnaie,
          note,
          offline:       true
        })
        setAfficherRecu(true)
        viderPanier()
      } else {
        setMessage({ type: 'erreur', texte: error.response?.data?.message || 'Erreur lors de la vente' })
      }
    } finally {
      setChargement(false)
    }
  }

  const imprimerRecu = () => {
    const contenu = `
      <html><head><title>Reçu - ${dernierRecu?.maquis}</title>
      <style>
        body { font-family: monospace; max-width: 300px; margin: 0 auto; padding: 20px; font-size: 14px; }
        h2 { text-align: center; margin-bottom: 4px; font-size: 18px; }
        p { margin: 2px 0; }
        .centre { text-align: center; }
        .ligne { display: flex; justify-content: space-between; margin: 6px 0; }
        .sep { border-top: 1px dashed #000; margin: 10px 0; }
        .total { font-weight: bold; font-size: 16px; }
        .offline { background: #fef3c7; padding: 6px; text-align: center; font-weight: bold; }
      </style></head>
      <body>
        <h2>${dernierRecu?.maquis}</h2>
        ${dernierRecu?.offline ? '<p class="offline">⚠️ VENTE HORS LIGNE — sera synchronisée</p>' : ''}
        <p class="centre">━━━━━━━━━━━━━━━━━━━━━━━</p>
        <p class="centre">Reçu de vente</p>
        <p class="centre">${dernierRecu?.date?.toLocaleString('fr-FR')}</p>
        <p class="centre">Caissier: ${dernierRecu?.caissier}</p>
        <div class="sep"></div>
        ${dernierRecu?.lignes?.map(l => `
          <div class="ligne"><span>${l.nom}${l.variante_nom ? ` — ${l.variante_nom}` : ''} x${l.quantite}</span><span>${(l.quantite * l.prix_applique).toLocaleString()} XOF</span></div>
        `).join('')}
        <div class="sep"></div>
        <div class="ligne total"><span>TOTAL</span><span>${dernierRecu?.total?.toLocaleString()} XOF</span></div>
        <div class="ligne"><span>Paiement</span><span>${dernierRecu?.mode_paiement?.replace('_', ' ')}</span></div>
        ${dernierRecu?.montant_recu ? `
          <div class="ligne"><span>Reçu</span><span>${dernierRecu?.montant_recu?.toLocaleString()} XOF</span></div>
          <div class="ligne total"><span>Monnaie</span><span>${dernierRecu?.monnaie?.toLocaleString()} XOF</span></div>
        ` : ''}
        ${dernierRecu?.note ? `<p>Note: ${dernierRecu?.note}</p>` : ''}
        <div class="sep"></div>
        <p class="centre">Merci pour votre visite !</p>
      </body></html>
    `
    const fenetre = window.open('', '_blank')
    fenetre.document.write(contenu)
    fenetre.document.close()
    fenetre.print()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 32px)', gap: 0 }} className="caisse-page">

      {/* Barre statut connexion */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', borderRadius: '10px', marginBottom: '12px',
        backgroundColor: isOnline ? '#f0fdf4' : '#fef3c7',
        border: `1px solid ${isOnline ? '#bbf7d0' : '#fde68a'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: isOnline ? '#16a34a' : '#f59e0b' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: isOnline ? '#15803d' : '#92400e' }}>
            {isOnline ? '🌐 En ligne' : '📴 Hors ligne — les ventes sont sauvegardées localement'}
          </span>
        </div>
        {ventesEnAttente > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
              {ventesEnAttente} vente(s) en attente de sync
            </span>
            {isOnline && (
              <button onClick={syncVentesOffline} disabled={syncEnCours}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', backgroundColor: 'var(--couleur-principale)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {syncEnCours ? '🔄 Sync...' : '🔄 Synchroniser'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab switcher mobile */}
      <div className="caisse-tabs-mobile">
        <button onClick={() => setOngletMobile('produits')}
          style={{ flex:1, padding:'10px', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, borderBottom: ongletMobile === 'produits' ? '3px solid var(--couleur-principale)' : '3px solid transparent', background:'white', color: ongletMobile === 'produits' ? 'var(--couleur-principale)' : '#6b7280' }}>
          🛒 Produits
        </button>
        <button onClick={() => setOngletMobile('panier')}
          style={{ flex:1, padding:'10px', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, borderBottom: ongletMobile === 'panier' ? '3px solid var(--couleur-principale)' : '3px solid transparent', background:'white', color: ongletMobile === 'panier' ? 'var(--couleur-principale)' : '#6b7280', position:'relative' }}>
          🧾 Panier
          {panier.length > 0 && (
            <span style={{ position:'absolute', top:6, right:24, background:'var(--couleur-principale)', color:'white', borderRadius:'50%', width:18, height:18, fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {panier.length}
            </span>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden' }}>

        {/* Modal reçu */}
        {afficherRecu && dernierRecu && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '48px', margin: 0 }}>{dernierRecu.offline ? '📴' : '✅'}</p>
                <h2 style={{ margin: '8px 0 4px', fontSize: '22px', fontWeight: '700', color: dernierRecu.offline ? '#d97706' : '#16a34a' }}>
                  {dernierRecu.offline ? 'Vente sauvegardée hors ligne !' : 'Vente enregistrée !'}
                </h2>
                {dernierRecu.offline && (
                  <p style={{ fontSize: 13, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 8, padding: '6px 12px', margin: '8px 0 0' }}>
                    Sera synchronisée automatiquement dès le retour de la connexion
                  </p>
                )}
                <p style={{ color: '#9ca3af', fontSize: '15px', margin: '8px 0 0' }}>{dernierRecu.date.toLocaleString('fr-FR')}</p>
              </div>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                {dernierRecu.lignes.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '15px' }}>
                    <span>{l.nom}{l.variante_nom ? ` — ${l.variante_nom}` : ''} × {l.quantite}</span>
                    <span style={{ fontWeight: '600' }}>{(l.quantite * l.prix_applique).toLocaleString()} XOF</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '10px', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--couleur-principale)' }}>{dernierRecu.total.toLocaleString()} XOF</span>
                  </div>
                  {dernierRecu.montant_recu && (
                    <div style={{ marginTop: 8, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, color: '#16a34a' }}>
                        <span>💰 Monnaie</span>
                        <span>{dernierRecu.monnaie.toLocaleString()} XOF</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={imprimerRecu}
                  style={{ flex: 1, padding: '14px', backgroundColor: 'var(--couleur-principale)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                  🖨️ Imprimer
                </button>
                <button onClick={() => setAfficherRecu(false)}
                  style={{ flex: 1, padding: '14px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL SÉLECTEUR DE VARIANTES */}
        {modalVariantes && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '360px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#111827' }}>{modalVariantes.nom}</h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#9ca3af' }}>Stock : {modalVariantes.stock_actuel} {modalVariantes.unite}</p>
                </div>
                <button onClick={() => setModalVariantes(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>Choisir la variante :</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Option unité de base */}
                <button onClick={() => {
                  setModalVariantes(null)
                  ajouterAuPanier({ ...modalVariantes, variantes: [] })
                }} style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--couleur-principale)'; e.currentTarget.style.backgroundColor = '#fff7ed' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.backgroundColor = 'white' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>1 {modalVariantes.unite}</span>
                  <span style={{ fontWeight: '700', color: 'var(--couleur-principale)', fontSize: '15px' }}>{parseFloat(modalVariantes.prix_vente).toLocaleString()} XOF</span>
                </button>
                {/* Variantes configurées */}
                {modalVariantes.variantes.map(v => (
                  <button key={v.id} onClick={() => ajouterVarianteAuPanier(modalVariantes, v)}
                    style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--couleur-principale)'; e.currentTarget.style.backgroundColor = '#fff7ed' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.backgroundColor = 'white' }}>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{v.nom}</span>
                      <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>= {v.coefficient} {modalVariantes.unite}</span>
                    </div>
                    <span style={{ fontWeight: '700', color: 'var(--couleur-principale)', fontSize: '15px' }}>{parseFloat(v.prix_vente).toLocaleString()} XOF</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PANNEAU COMMANDES TABLETTE */}
        {voirCommandes && utilisateur?.maquis?.module_commandes_actif && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
            <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🍽️ File d'attente ({commandesTablette.length})</h3>
                <button onClick={() => setVoirCommandes(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {commandesTablette.length === 0 ? (
                  <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>Aucun élément en attente d'encaissement</p>
                ) : (
                  commandesTablette.map(item => {
                    const isVente = item._type === 'vente'
                    const lignesFiltrees = isVente
                      ? item.lignes || []
                      : item.lignes?.filter(l => l.statut !== 'annulee') || []
                    const total = lignesFiltrees.reduce((s, l) => s + parseFloat(l.prix_unitaire) * parseFloat(l.quantite), 0)

                    return (
                      <div key={`${isVente ? 'v' : 'c'}-${item.id}`}
                        onClick={() => isVente ? selectionnerVente(item) : selectionnerCommande(item)}
                        style={{ padding: 16, borderRadius: 12, border: `2px solid ${isVente ? '#ddd6fe' : '#e5e7eb'}`, marginBottom: 10, cursor: 'pointer', transition: 'all 0.15s', backgroundColor: isVente ? '#faf5ff' : 'white' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--couleur-principale)'; e.currentTarget.style.backgroundColor = '#fff7ed' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = isVente ? '#ddd6fe' : '#e5e7eb'; e.currentTarget.style.backgroundColor = isVente ? '#faf5ff' : 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            {isVente ? (
                              <>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#6d28d9' }}>
                                  🔄 Vente #{item.id} — remise en attente
                                </p>
                                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>
                                  {item.caissier?.nom} · {new Date(item.date_vente).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </>
                            ) : (
                              <>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111827' }}>
                                  {item.table ? `Table ${item.table.numero}` : 'Comptoir'} — Cmd #{item.numero}
                                </p>
                                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>
                                  {item.serveur?.nom} · {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </>
                            )}
                          </div>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: 'var(--couleur-principale)' }}>{total.toLocaleString()} XOF</p>
                        </div>
                        <div style={{ fontSize: 13, color: '#374151' }}>
                          {lignesFiltrees.map(l => `${l.produit?.nom} ×${parseFloat(l.quantite)}`).join(' · ')}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* COLONNE GAUCHE - Produits */}
        <div className={`col-produits-caisse ${ongletMobile === 'panier' ? 'mobile-hidden' : ''}`} style={{ flex: 0.8, backgroundColor: 'white', borderRadius: '12px', padding: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <button onClick={() => setVoirCommandes(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: commandesTablette.length > 0 ? '#fff7ed' : '#f9fafb', color: commandesTablette.length > 0 ? '#ea580c' : '#9ca3af', fontWeight: 600, fontSize: 14 }}>
            <span>🍽️ File d'attente</span>
            {commandesTablette.length > 0 && (
              <span style={{ backgroundColor: '#ea580c', color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {commandesTablette.length}
              </span>
            )}
          </button>
          <h2 style={{ margin: '0 0 14px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>Produits disponibles</h2>
          <input type="text" placeholder="🔍 Rechercher un produit..." value={recherche} onChange={(e) => setRecherche(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box', outline: 'none' }}
          />
          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, scrollbarWidth: 'none' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategorie(cat)} style={{
                  padding: '5px 12px', borderRadius: 16, border: `1.5px solid ${categorie === cat ? 'var(--couleur-principale)' : '#e5e7eb'}`,
                  cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600,
                  backgroundColor: categorie === cat ? 'var(--couleur-principale)' : 'white',
                  color: categorie === cat ? 'white' : '#374151', flexShrink: 0
                }}>{cat}</button>
              ))}
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {chargementProduits ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Chargement...</p>
            ) : produitsFiltres.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Aucun produit trouvé</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {produitsFiltres.map(produit => {
                  const enPanier = panier.find(p => p.produit_id === produit.id)
                  return (
                    <div key={produit.id} onClick={() => ajouterAuPanier(produit)}
                      style={{ borderRadius: 10, padding: '10px 8px', cursor: 'pointer',
                        border: `1.5px solid ${enPanier ? 'var(--couleur-principale)' : '#f3f4f6'}`,
                        backgroundColor: enPanier ? 'var(--couleur-principale-light)' : 'white',
                        transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (!enPanier) e.currentTarget.style.backgroundColor = '#fff7ed' }}
                      onMouseLeave={e => { if (!enPanier) e.currentTarget.style.backgroundColor = 'white' }}
                    >
                      {produit.photo_url && (
                        <img src={produit.photo_url} alt={produit.nom}
                          style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />
                      )}
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 12, color: '#111827', lineHeight: 1.3 }}>{produit.nom}</p>
                      {produit.categorie && <p style={{ margin: '0 0 4px', fontSize: 10, color: '#9ca3af' }}>{produit.categorie}</p>}
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--couleur-principale)', fontSize: 12 }}>{parseFloat(produit.prix_vente).toLocaleString()} XOF</p>
                      {produit.variantes?.length > 0 && (
                        <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--couleur-principale)', fontWeight: 600 }}>
                          {produit.variantes.length} variante{produit.variantes.length > 1 ? 's' : ''} →
                        </p>
                      )}
                      {enPanier && (
                        <div style={{ marginTop: 4, backgroundColor: 'var(--couleur-principale)', color: 'white', borderRadius: 5, padding: '1px 6px', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
                          × {enPanier.quantite}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE - Panier */}
        <div className={`col-panier-caisse ${ongletMobile === 'produits' ? 'mobile-hidden' : ''}`} style={{ flex: 1.2, backgroundColor: 'white', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#374151' }}>Panier ({panier.length})</h2>
              {commandeActive && (
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#ea580c', fontWeight: 600 }}>
                  🍽️ {commandeActive.table ? `Table ${commandeActive.table.numero}` : 'Comptoir'} — Cmd #{commandeActive.numero}
                </p>
              )}
              {venteActive && (
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6d28d9', fontWeight: 600 }}>
                  🔄 Vente #{venteActive.id} remise en attente — ré-encaissement
                </p>
              )}
            </div>
            {panier.length > 0 && (
              <button onClick={(commandeActive || venteActive) ? annulerSelectionCommande : viderPanier}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                {(commandeActive || venteActive) ? '← Changer' : 'Vider'}
              </button>
            )}
          </div>

          {message && (
            <div style={{
              padding: '12px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px',
              backgroundColor: message.type === 'succes' ? '#f0fdf4' : message.type === 'info' ? '#eff6ff' : '#fef2f2',
              color: message.type === 'succes' ? '#16a34a' : message.type === 'info' ? '#1d4ed8' : '#dc2626',
              border: `1px solid ${message.type === 'succes' ? '#bbf7d0' : message.type === 'info' ? '#bfdbfe' : '#fecaca'}`
            }}>
              {message.texte}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', minHeight: 0 }}>
            {panier.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 20px', fontSize: '15px' }}>Cliquez sur un produit pour l'ajouter</p>
            ) : (
              panier.map(item => (
                <div key={item.panier_key} style={{ padding: '12px', borderRadius: '10px', marginBottom: '8px', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '15px', color: '#111827' }}>{item.nom}</p>
                      {item.variante_nom && (
                        <span style={{ fontSize: '12px', color: 'var(--couleur-principale)', fontWeight: '600', backgroundColor: 'var(--couleur-principale-light)', padding: '2px 8px', borderRadius: '20px' }}>
                          {item.variante_nom}
                        </span>
                      )}
                    </div>
                    <button onClick={() => retirerDuPanier(item.panier_key)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => modifierQuantite(item.panier_key, item.quantite - 1)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '600' }}>-</button>
                      <span style={{ minWidth: '32px', textAlign: 'center', fontSize: '16px', fontWeight: '600' }}>{item.quantite}</span>
                      <button onClick={() => modifierQuantite(item.panier_key, item.quantite + 1)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '600' }}>+</button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="number" value={item.prix_applique} onChange={(e) => modifierPrix(item.panier_key, e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: '15px', boxSizing: 'border-box', border: item.prix_applique < item.prix_catalogue * 0.8 ? '1px solid #f97316' : '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                    </div>
                    <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: 'var(--couleur-principale)', minWidth: '90px', textAlign: 'right' }}>
                      {(item.prix_applique * item.quantite).toLocaleString()} XOF
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Zone paiement scrollable */}
          <div style={{ flexShrink: 0, overflowY: 'auto', maxHeight: '45%' }}>
            {/* Mode paiement */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Mode de paiement</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {MODES_PAIEMENT.map(mode => (
                  <button key={mode.value} onClick={() => { setModePaiement(mode.value); setMontantRecu('') }}
                    style={{ padding: '14px 10px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', border: modePaiement === mode.value ? `2px solid ${mode.bg}` : '1px solid #e5e7eb', backgroundColor: modePaiement === mode.value ? mode.bg : 'white', color: modePaiement === mode.value ? mode.color : '#374151', fontWeight: '600', transition: 'all 0.15s' }}>
                    {mode.icone} {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Montant reçu espèces */}
            {modePaiement === 'especes' && (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Montant reçu du client</p>
                <input type="number" placeholder={`Minimum ${totalPanier.toLocaleString()} XOF`} value={montantRecu} onChange={e => setMontantRecu(e.target.value)}
                  style={{ width: '100%', padding: '14px', fontSize: '16px', boxSizing: 'border-box', border: montantRecu && parseFloat(montantRecu) < totalPanier ? '2px solid #dc2626' : '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                {montantRecu && parseFloat(montantRecu) >= totalPanier && (
                  <div style={{ marginTop: '8px', padding: '14px 16px', backgroundColor: '#f0fdf4', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', color: '#16a34a', fontWeight: '600' }}>💰 Monnaie à rendre</span>
                    <span style={{ fontSize: '22px', fontWeight: '700', color: '#16a34a' }}>{(parseFloat(montantRecu) - totalPanier).toLocaleString()} XOF</span>
                  </div>
                )}
              </div>
            )}

            <input type="text" placeholder="Note (table, client...)" value={note} onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Total + bouton toujours visible en bas */}
          <div style={{ flexShrink: 0, borderTop: '2px solid #f3f4f6', paddingTop: '14px', backgroundColor: 'white', marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#374151' }}>Total</span>
              <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--couleur-principale)' }}>{totalPanier.toLocaleString()} XOF</span>
            </div>
            <button onClick={validerVente} disabled={chargement || panier.length === 0}
              style={{ width: '100%', padding: '18px', borderRadius: '12px', border: 'none', backgroundColor: panier.length === 0 ? '#e5e7eb' : isOnline ? 'var(--couleur-principale)' : '#f59e0b', color: panier.length === 0 ? '#9ca3af' : 'white', fontSize: '18px', fontWeight: '700', cursor: panier.length === 0 ? 'not-allowed' : 'pointer' }}>
              {chargement ? 'Enregistrement...' : isOnline ? '✅ Valider la vente' : '📴 Valider (hors ligne)'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .caisse-tabs-mobile { display: none; }
        @media (max-width: 1024px) {
          .caisse-page { height: auto !important; min-height: calc(100vh - 76px); }
          .caisse-tabs-mobile {
            display: flex; background: white; border-radius: 10px;
            margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;
          }
          .caisse-page > div:last-of-type { flex-direction: column !important; }
          .col-produits-caisse, .col-panier-caisse {
            flex: 1 !important; width: 100% !important;
            height: calc(100vh - 240px) !important;
            overflow-y: auto !important;
          }
          .mobile-hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}

export default Caisse