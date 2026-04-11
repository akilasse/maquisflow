import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

const MODES_PAIEMENT = [
  { value: 'especes', label: 'Espèces', bg: '#16a34a', color: 'white', icone: '💵' },
  { value: 'wave', label: 'Wave', bg: '#1D4ED8', color: 'white', icone: '🐧' },
  { value: 'orange_money', label: 'Orange Money', bg: '#FF6B00', color: 'white', icone: '📱' },
  { value: 'mtn_money', label: 'MTN Money', bg: '#FFCC00', color: '#111827', icone: '📱' },
  { value: 'credit', label: 'Crédit', bg: '#7c3aed', color: 'white', icone: '📝' },
  { value: 'autre', label: 'Autre', bg: '#6b7280', color: 'white', icone: '💳' },
]

const Caisse = () => {
  const { utilisateur } = useAuth()
  const [produits, setProduits] = useState([])
  const [panier, setPanier] = useState([])
  const [recherche, setRecherche] = useState('')
  const [modePaiement, setModePaiement] = useState('especes')
  const [note, setNote] = useState('')
  const [montantRecu, setMontantRecu] = useState('')
  const [chargement, setChargement] = useState(false)
  const [chargementProduits, setChargementProduits] = useState(true)
  const [message, setMessage] = useState(null)
  const [dernierRecu, setDernierRecu] = useState(null)
  const [afficherRecu, setAfficherRecu] = useState(false)

  useEffect(() => {
    const chargerProduits = async () => {
      try {
        const response = await api.get('/api/stock/produits')
        setProduits(response.data.data)
      } catch (error) {
        setMessage({ type: 'erreur', texte: 'Erreur chargement produits' })
      } finally {
        setChargementProduits(false)
      }
    }
    chargerProduits()
  }, [])

  const produitsFiltres = produits.filter(p =>
    p.nom.toLowerCase().includes(recherche.toLowerCase()) &&
    parseFloat(p.stock_actuel) > 0
  )

  const ajouterAuPanier = (produit) => {
    const existe = panier.find(p => p.produit_id === produit.id)
    if (existe) {
      if (existe.quantite >= parseFloat(produit.stock_actuel)) {
        setMessage({ type: 'erreur', texte: `Stock insuffisant pour ${produit.nom}` })
        return
      }
      setPanier(panier.map(p =>
        p.produit_id === produit.id ? { ...p, quantite: p.quantite + 1 } : p
      ))
    } else {
      setPanier([...panier, {
        produit_id: produit.id,
        nom: produit.nom,
        quantite: 1,
        prix_catalogue: parseFloat(produit.prix_vente),
        prix_applique: parseFloat(produit.prix_vente),
        unite: produit.unite,
        stock_max: parseFloat(produit.stock_actuel)
      }])
    }
    setMessage(null)
  }

  const modifierQuantite = (produit_id, nouvelleQuantite) => {
    if (nouvelleQuantite <= 0) { retirerDuPanier(produit_id); return }
    const item = panier.find(p => p.produit_id === produit_id)
    if (nouvelleQuantite > item.stock_max) {
      setMessage({ type: 'erreur', texte: 'Quantité dépasse le stock disponible' })
      return
    }
    setPanier(panier.map(p => p.produit_id === produit_id ? { ...p, quantite: nouvelleQuantite } : p))
  }

  const modifierPrix = (produit_id, nouveauPrix) => {
    setPanier(panier.map(p => p.produit_id === produit_id ? { ...p, prix_applique: parseFloat(nouveauPrix) || 0 } : p))
  }

  const retirerDuPanier = (produit_id) => {
    setPanier(panier.filter(p => p.produit_id !== produit_id))
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
    try {
      const response = await api.post('/api/ventes', {
        mode_paiement: modePaiement,
        note,
        lignes: panier.map(item => ({
          produit_id: item.produit_id,
          quantite: item.quantite,
          prix_applique: item.prix_applique
        }))
      })
      setDernierRecu({
        id: response.data.data?.id || Date.now(),
        date: new Date(),
        maquis: utilisateur?.maquis?.nom,
        caissier: utilisateur?.nom,
        lignes: [...panier],
        total: totalPanier,
        mode_paiement: modePaiement,
        montant_recu: montantRecu ? parseFloat(montantRecu) : null,
        monnaie,
        note
      })
      setAfficherRecu(true)
      viderPanier()
      const r2 = await api.get('/api/stock/produits')
      setProduits(r2.data.data)
    } catch (error) {
      setMessage({ type: 'erreur', texte: error.response?.data?.message || 'Erreur lors de la vente' })
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
        .monnaie { font-weight: bold; font-size: 16px; }
      </style></head>
      <body>
        <h2>${dernierRecu?.maquis}</h2>
        <p class="centre">━━━━━━━━━━━━━━━━━━━━━━━</p>
        <p class="centre">Reçu de vente</p>
        <p class="centre">${dernierRecu?.date?.toLocaleString('fr-FR')}</p>
        <p class="centre">Caissier: ${dernierRecu?.caissier}</p>
        <div class="sep"></div>
        ${dernierRecu?.lignes?.map(l => `
          <div class="ligne">
            <span>${l.nom} x${l.quantite}</span>
            <span>${(l.quantite * l.prix_applique).toLocaleString()} XOF</span>
          </div>
        `).join('')}
        <div class="sep"></div>
        <div class="ligne total"><span>TOTAL</span><span>${dernierRecu?.total?.toLocaleString()} XOF</span></div>
        <div class="ligne"><span>Paiement</span><span>${dernierRecu?.mode_paiement?.replace('_', ' ')}</span></div>
        ${dernierRecu?.montant_recu ? `
          <div class="ligne"><span>Reçu</span><span>${dernierRecu?.montant_recu?.toLocaleString()} XOF</span></div>
          <div class="ligne monnaie"><span>Monnaie</span><span>${dernierRecu?.monnaie?.toLocaleString()} XOF</span></div>
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
    <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 32px)' }}>

      {/* Modal reçu */}
      {afficherRecu && dernierRecu && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '48px', margin: 0 }}>✅</p>
              <h2 style={{ margin: '8px 0 4px', fontSize: '22px', fontWeight: '700', color: '#16a34a' }}>Vente enregistrée !</h2>
              <p style={{ color: '#9ca3af', fontSize: '15px', margin: 0 }}>{dernierRecu.date.toLocaleString('fr-FR')}</p>
            </div>
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              {dernierRecu.lignes.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '15px' }}>
                  <span>{l.nom} × {l.quantite}</span>
                  <span style={{ fontWeight: '600' }}>{(l.quantite * l.prix_applique).toLocaleString()} XOF</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '10px', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' }}>
                  <span>Total</span>
                  <span style={{ color: '#FF6B35' }}>{dernierRecu.total.toLocaleString()} XOF</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280', marginTop: '6px' }}>
                  <span>Paiement</span>
                  <span style={{ textTransform: 'capitalize' }}>{dernierRecu.mode_paiement.replace('_', ' ')}</span>
                </div>
                {dernierRecu.montant_recu && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                      <span>Reçu du client</span>
                      <span>{dernierRecu.montant_recu.toLocaleString()} XOF</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', color: '#16a34a', marginTop: '8px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                      <span>💰 Monnaie à rendre</span>
                      <span>{dernierRecu.monnaie.toLocaleString()} XOF</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={imprimerRecu}
                style={{ flex: 1, padding: '14px', backgroundColor: '#FF6B35', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                🖨️ Imprimer le reçu
              </button>
              <button onClick={() => setAfficherRecu(false)}
                style={{ flex: 1, padding: '14px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLONNE GAUCHE - Produits (réduite) */}
      <div style={{
        flex: 0.8, backgroundColor: 'white', borderRadius: '12px', padding: '20px',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 14px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
          Produits disponibles
        </h2>
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          style={{
            width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb',
            borderRadius: '8px', fontSize: '15px', marginBottom: '14px',
            boxSizing: 'border-box', outline: 'none'
          }}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chargementProduits ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Chargement...</p>
          ) : produitsFiltres.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Aucun produit trouvé</p>
          ) : (
            produitsFiltres.map(produit => (
              <div
                key={produit.id}
                onClick={() => ajouterAuPanier(produit)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px', borderRadius: '10px', marginBottom: '8px',
                  cursor: 'pointer', border: '1px solid #f3f4f6'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff7ed'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '16px', color: '#111827' }}>{produit.nom}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#9ca3af' }}>Stock : {produit.stock_actuel} {produit.unite}</p>
                </div>
                <p style={{ margin: 0, fontWeight: '700', color: '#FF6B35', fontSize: '16px' }}>
                  {parseFloat(produit.prix_vente).toLocaleString()} XOF
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLONNE DROITE - Panier (élargie) */}
      <div style={{
        flex: 1.2, backgroundColor: 'white', borderRadius: '12px', padding: '20px',
        display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#374151' }}>
            Panier ({panier.length})
          </h2>
          {panier.length > 0 && (
            <button onClick={viderPanier} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              Vider
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '12px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px',
            backgroundColor: message.type === 'succes' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'succes' ? '#16a34a' : '#dc2626',
            border: `1px solid ${message.type === 'succes' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {message.texte}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
          {panier.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 20px', fontSize: '15px' }}>
              Cliquez sur un produit pour l'ajouter
            </p>
          ) : (
            panier.map(item => (
              <div key={item.produit_id} style={{
                padding: '12px', borderRadius: '10px', marginBottom: '8px',
                backgroundColor: '#f9fafb', border: '1px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '15px', color: '#111827' }}>{item.nom}</p>
                  <button onClick={() => retirerDuPanier(item.produit_id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>
                    ×
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => modifierQuantite(item.produit_id, item.quantite - 1)}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '600' }}>
                      -
                    </button>
                    <span style={{ minWidth: '32px', textAlign: 'center', fontSize: '16px', fontWeight: '600' }}>{item.quantite}</span>
                    <button onClick={() => modifierQuantite(item.produit_id, item.quantite + 1)}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: '600' }}>
                      +
                    </button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      value={item.prix_applique}
                      onChange={(e) => modifierPrix(item.produit_id, e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px', fontSize: '15px', boxSizing: 'border-box',
                        border: item.prix_applique < item.prix_catalogue * 0.8 ? '1px solid #f97316' : '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    {item.prix_applique !== item.prix_catalogue && (
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                        Catalogue: {item.prix_catalogue.toLocaleString()} XOF
                      </p>
                    )}
                  </div>
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: '#FF6B35', minWidth: '90px', textAlign: 'right' }}>
                    {(item.prix_applique * item.quantite).toLocaleString()} XOF
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Mode de paiement — 2 colonnes pour boutons plus grands */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Mode de paiement</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {MODES_PAIEMENT.map(mode => (
              <button
                key={mode.value}
                onClick={() => { setModePaiement(mode.value); setMontantRecu('') }}
                style={{
                  padding: '14px 10px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer',
                  border: modePaiement === mode.value ? `2px solid ${mode.bg}` : '1px solid #e5e7eb',
                  backgroundColor: modePaiement === mode.value ? mode.bg : 'white',
                  color: modePaiement === mode.value ? mode.color : '#374151',
                  fontWeight: '600', transition: 'all 0.15s'
                }}
              >
                {mode.icone} {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Montant reçu - espèces uniquement */}
        {modePaiement === 'especes' && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Montant reçu du client
            </p>
            <input
              type="number"
              placeholder={`Minimum ${totalPanier.toLocaleString()} XOF`}
              value={montantRecu}
              onChange={e => setMontantRecu(e.target.value)}
              style={{
                width: '100%', padding: '14px', fontSize: '16px', boxSizing: 'border-box',
                border: montantRecu && parseFloat(montantRecu) < totalPanier ? '2px solid #dc2626' : '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            {montantRecu && parseFloat(montantRecu) >= totalPanier && (
              <div style={{
                marginTop: '8px', padding: '14px 16px', backgroundColor: '#f0fdf4',
                borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: '15px', color: '#16a34a', fontWeight: '600' }}>💰 Monnaie à rendre</span>
                <span style={{ fontSize: '22px', fontWeight: '700', color: '#16a34a' }}>
                  {(parseFloat(montantRecu) - totalPanier).toLocaleString()} XOF
                </span>
              </div>
            )}
            {montantRecu && parseFloat(montantRecu) < totalPanier && (
              <div style={{
                marginTop: '8px', padding: '14px 16px', backgroundColor: '#fef2f2',
                borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: '15px', color: '#dc2626', fontWeight: '600' }}>⚠️ Montant insuffisant</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
                  -{(totalPanier - parseFloat(montantRecu)).toLocaleString()} XOF
                </span>
              </div>
            )}
          </div>
        )}

        {/* Note */}
        <input
          type="text"
          placeholder="Note (table, client...)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb',
            borderRadius: '8px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box'
          }}
        />

        {/* Total et bouton */}
        <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#374151' }}>Total</span>
            <span style={{ fontSize: '28px', fontWeight: '800', color: '#FF6B35' }}>
              {totalPanier.toLocaleString()} XOF
            </span>
          </div>
          <button
            onClick={validerVente}
            disabled={chargement || panier.length === 0}
            style={{
              width: '100%', padding: '18px', borderRadius: '12px', border: 'none',
              backgroundColor: panier.length === 0 ? '#e5e7eb' : '#FF6B35',
              color: panier.length === 0 ? '#9ca3af' : 'white',
              fontSize: '18px', fontWeight: '700',
              cursor: panier.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {chargement ? 'Enregistrement...' : '✅ Valider la vente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Caisse