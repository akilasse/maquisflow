import { useState, useEffect } from 'react'
import api from '../../utils/api'

const Stock = () => {
  const [produits, setProduits] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [historique, setHistorique] = useState([])
  const [bons, setBons] = useState([])
  const [onglet, setOnglet] = useState('produits')
  const [chargement, setChargement] = useState(true)
  const [message, setMessage] = useState(null)

  // Approvisionnement
  const [fournisseurId, setFournisseurId] = useState('')
  const [noteBon, setNoteBon] = useState('')
  const [lignesBon, setLignesBon] = useState([{ produit_id: '', quantite: '', prix_achat: '' }])
  const [lignesConfirmees, setLignesConfirmees] = useState([])

  // Sortie manuelle
  const [noteSortie, setNoteSortie] = useState('')
  const [ligneSortie, setLigneSortie] = useState({ produit_id: '', quantite: '', raison: '' })
  const [lignesSortieConfirmees, setLignesSortieConfirmees] = useState([])

  useEffect(() => { chargerDonnees() }, [])

  const chargerDonnees = async () => {
    try {
      const [p, f, h, b] = await Promise.all([
        api.get('/api/stock/produits'),
        api.get('/api/parametrage/fournisseurs'),
        api.get('/api/stock/historique'),
        api.get('/api/stock/bons')
      ])
      setProduits(p.data.data)
      setFournisseurs(f.data.data)
      setHistorique(h.data.data.mouvements)
      setBons(b.data.data)
    } catch (error) {
      setMessage({ type: 'erreur', texte: 'Erreur chargement données' })
    } finally {
      setChargement(false)
    }
  }

  const afficherMessage = (type, texte) => {
    setMessage({ type, texte })
    setTimeout(() => setMessage(null), 4000)
  }

  const modifierLigne = (index, champ, valeur) => {
    const nouvelles = [...lignesBon]
    nouvelles[index][champ] = valeur
    if (champ === 'produit_id') {
      const produit = produits.find(p => p.id === parseInt(valeur))
      if (produit) nouvelles[index].prix_achat = produit.prix_achat
    }
    setLignesBon(nouvelles)
  }

  const soumettrebon = async () => {
    try {
      if (lignesConfirmees.length === 0) {
        afficherMessage('erreur', 'Ajoutez au moins un produit')
        return
      }
      await api.post('/api/stock/bons', {
        fournisseur_id: fournisseurId || null,
        note: noteBon,
        lignes: lignesConfirmees.map(l => ({
          produit_id: parseInt(l.produit_id),
          quantite: parseFloat(l.quantite),
          prix_achat: parseFloat(l.prix_achat)
        }))
      })
      afficherMessage('succes', "Bon d'approvisionnement enregistré !")
      setLignesConfirmees([])
      setLignesBon([{ produit_id: '', quantite: '', prix_achat: '' }])
      setFournisseurId('')
      setNoteBon('')
      chargerDonnees()
    } catch (error) {
      afficherMessage('erreur', error.response?.data?.message || 'Erreur')
    }
  }

  const soumettreSortie = async () => {
    if (lignesSortieConfirmees.length === 0) {
      afficherMessage('erreur', 'Ajoutez au moins un produit')
      return
    }
    try {
      await api.post('/api/stock/sortie', {
        lignes: lignesSortieConfirmees.map(l => ({
          produit_id: parseInt(l.produit_id),
          quantite: parseFloat(l.quantite),
          raison: l.raison
        })),
        note: noteSortie
      })
      afficherMessage('succes', 'Sortie enregistrée !')
      setLignesSortieConfirmees([])
      setLigneSortie({ produit_id: '', quantite: '', raison: '' })
      setNoteSortie('')
      chargerDonnees()
    } catch (error) {
      afficherMessage('erreur', error.response?.data?.message || 'Erreur')
    }
  }

  const styleOnglet = (actif) => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontWeight: '500', fontSize: '14px',
    backgroundColor: actif ? 'var(--couleur-principale)' : '#f3f4f6',
    color: actif ? 'white' : '#374151'
  })

  const styleInput = {
    width: '100%', padding: '10px 12px',
    border: '1px solid #e5e7eb', borderRadius: '8px',
    fontSize: '14px', boxSizing: 'border-box'
  }

  if (chargement) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Chargement...</div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
            Gestion du stock
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
            Approvisionnements, sorties et historique
          </p>
        </div>
        <button onClick={chargerDonnees} style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
          🔄 Actualiser
        </button>
      </div>

      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
          backgroundColor: message.type === 'succes' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'succes' ? '#16a34a' : '#dc2626',
          border: `1px solid ${message.type === 'succes' ? '#bbf7d0' : '#fecaca'}`
        }}>{message.texte}</div>
      )}

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'produits', label: '📦 Produits' },
          { key: 'approvisionnement', label: '🚚 Approvisionnement' },
          { key: 'sortie', label: '⬇️ Sortie manuelle' },
          { key: 'bons', label: '📋 Bons' },
          { key: 'historique', label: '🕐 Historique' }
        ].map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key)} style={styleOnglet(onglet === o.key)}>
            {o.label}
          </button>
        ))}
      </div>

      {/* PRODUITS */}
      {onglet === 'produits' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Produit', 'Catégorie', 'Stock actuel', 'Seuil alerte', 'Prix vente', 'Statut'].map(h => (
                  <th key={h} style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {produits.map(p => {
                const critique = parseFloat(p.stock_actuel) <= parseFloat(p.stock_min)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px 10px', fontSize: '14px', fontWeight: '500' }}>{p.nom}</td>
                    <td style={{ padding: '12px 10px', fontSize: '13px', color: '#6b7280' }}>{p.categorie || '-'}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '600', color: critique ? '#dc2626' : '#16a34a' }}>
                      {p.stock_actuel} {p.unite}
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: '13px', color: '#6b7280' }}>{p.stock_min} {p.unite}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--couleur-principale)', fontWeight: '500' }}>
                      {parseFloat(p.prix_vente).toLocaleString()} XOF
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
                        backgroundColor: critique ? '#fef2f2' : '#f0fdf4',
                        color: critique ? '#dc2626' : '#16a34a'
                      }}>
                        {critique ? '⚠️ Critique' : '✅ Normal'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* APPROVISIONNEMENT */}
      {onglet === 'approvisionnement' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '600' }}>
            Nouveau bon d'approvisionnement
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', marginBottom: '6px', display: 'block' }}>Fournisseur (optionnel)</label>
              <select value={fournisseurId} onChange={e => setFournisseurId(e.target.value)} style={styleInput}>
                <option value="">Sélectionner un fournisseur</option>
                {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', marginBottom: '6px', display: 'block' }}>Note (optionnel)</label>
              <input placeholder="Ex: Livraison du matin" value={noteBon} onChange={e => setNoteBon(e.target.value)} style={styleInput} />
            </div>
          </div>

          <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Ajouter un produit</p>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Produit</label>
                <select value={lignesBon[0].produit_id} onChange={e => modifierLigne(0, 'produit_id', e.target.value)} style={styleInput}>
                  <option value="">Sélectionner un produit</option>
                  {produits.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.unite})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Quantité</label>
                <input type="number" placeholder="0" value={lignesBon[0].quantite} onChange={e => modifierLigne(0, 'quantite', e.target.value)} style={styleInput} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Prix d'achat</label>
                <input type="number" placeholder="0" value={lignesBon[0].prix_achat} onChange={e => modifierLigne(0, 'prix_achat', e.target.value)} style={styleInput} />
              </div>
              <button
                onClick={() => {
                  const ligne = lignesBon[0]
                  if (!ligne.produit_id || !ligne.quantite || !ligne.prix_achat) {
                    afficherMessage('erreur', 'Remplissez tous les champs')
                    return
                  }
                  setLignesConfirmees([...lignesConfirmees, { ...ligne }])
                  setLignesBon([{ produit_id: '', quantite: '', prix_achat: '' }])
                }}
                style={{ padding: '10px 20px', backgroundColor: 'var(--couleur-principale)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
              >
                + Ajouter
              </button>
            </div>
          </div>

          {lignesConfirmees.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                Récapitulatif ({lignesConfirmees.length} produit{lignesConfirmees.length > 1 ? 's' : ''})
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', borderBottom: '1px solid #e5e7eb', width: '40%' }}>Produit</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', borderBottom: '1px solid #e5e7eb', width: '18%' }}>Quantité</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', borderBottom: '1px solid #e5e7eb', width: '18%' }}>Prix achat</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', borderBottom: '1px solid #e5e7eb', width: '16%' }}>Total ligne</th>
                    <th style={{ padding: '10px', width: '8%', borderBottom: '1px solid #e5e7eb' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lignesConfirmees.map((ligne, index) => {
                    const produit = produits.find(p => p.id === parseInt(ligne.produit_id))
                    const totalLigne = parseFloat(ligne.prix_achat) * parseFloat(ligne.quantite)
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px', fontSize: '14px', fontWeight: '500' }}>{produit?.nom}</td>
                        <td style={{ padding: '10px', fontSize: '14px' }}>{ligne.quantite} {produit?.unite}</td>
                        <td style={{ padding: '10px', fontSize: '14px', color: '#6b7280' }}>{parseFloat(ligne.prix_achat).toLocaleString()} XOF</td>
                        <td style={{ padding: '10px', fontSize: '14px', fontWeight: '600', color: 'var(--couleur-principale)' }}>{totalLigne.toLocaleString()} XOF</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <button onClick={() => setLignesConfirmees(lignesConfirmees.filter((_, i) => i !== index))}
                            style={{ padding: '4px 10px', backgroundColor: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#dc2626' }}>
                            Retirer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                    <td colSpan="5" style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginRight: '16px' }}>Total d'achat</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--couleur-principale)' }}>
                        {lignesConfirmees.reduce((t, l) => t + parseFloat(l.prix_achat) * parseFloat(l.quantite), 0).toLocaleString()} XOF
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <button onClick={soumettrebon} disabled={lignesConfirmees.length === 0}
            style={{
              width: '100%', padding: '14px',
              backgroundColor: lignesConfirmees.length === 0 ? '#e5e7eb' : '#16a34a',
              color: lignesConfirmees.length === 0 ? '#9ca3af' : 'white',
              border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600',
              cursor: lignesConfirmees.length === 0 ? 'not-allowed' : 'pointer'
            }}>
            Valider le bon d'approvisionnement ({lignesConfirmees.length} produit{lignesConfirmees.length > 1 ? 's' : ''})
          </button>
        </div>
      )}

      {/* SORTIE MANUELLE */}
      {onglet === 'sortie' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>Sortie manuelle</h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>
            Pour les pertes, casses ou consommations internes
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: '#374151', marginBottom: '6px', display: 'block' }}>Note générale (optionnel)</label>
            <input placeholder="Ex: Casse du soir, Consommation interne..." value={noteSortie} onChange={e => setNoteSortie(e.target.value)} style={styleInput} />
          </div>

          <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Ajouter un produit</p>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 2fr auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Produit</label>
                <select value={ligneSortie.produit_id} onChange={e => setLigneSortie({ ...ligneSortie, produit_id: e.target.value })} style={styleInput}>
                  <option value="">Sélectionner un produit</option>
                  {produits.map(p => <option key={p.id} value={p.id}>{p.nom} (stock: {p.stock_actuel} {p.unite})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Quantité</label>
                <input type="number" placeholder="0" value={ligneSortie.quantite} onChange={e => setLigneSortie({ ...ligneSortie, quantite: e.target.value })} style={styleInput} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Raison</label>
                <input placeholder="Casse, Perte..." value={ligneSortie.raison} onChange={e => setLigneSortie({ ...ligneSortie, raison: e.target.value })} style={styleInput} />
              </div>
              <button
                onClick={() => {
                  if (!ligneSortie.produit_id || !ligneSortie.quantite || !ligneSortie.raison) {
                    afficherMessage('erreur', 'Remplissez tous les champs')
                    return
                  }
                  setLignesSortieConfirmees([...lignesSortieConfirmees, { ...ligneSortie }])
                  setLigneSortie({ produit_id: '', quantite: '', raison: '' })
                }}
                style={{ padding: '10px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
              >
                + Ajouter
              </button>
            </div>
          </div>

          {lignesSortieConfirmees.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                Récapitulatif ({lignesSortieConfirmees.length} produit{lignesSortieConfirmees.length > 1 ? 's' : ''})
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', borderBottom: '1px solid #e5e7eb', width: '35%' }}>Produit</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', borderBottom: '1px solid #e5e7eb', width: '15%' }}>Quantité</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', borderBottom: '1px solid #e5e7eb', width: '35%' }}>Raison</th>
                    <th style={{ padding: '10px', width: '15%', borderBottom: '1px solid #e5e7eb' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lignesSortieConfirmees.map((ligne, index) => {
                    const produit = produits.find(p => p.id === parseInt(ligne.produit_id))
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px', fontSize: '14px', fontWeight: '500' }}>{produit?.nom}</td>
                        <td style={{ padding: '10px', fontSize: '14px' }}>{ligne.quantite} {produit?.unite}</td>
                        <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{ligne.raison}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <button onClick={() => setLignesSortieConfirmees(lignesSortieConfirmees.filter((_, i) => i !== index))}
                            style={{ padding: '4px 10px', backgroundColor: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#dc2626' }}>
                            Retirer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                    <td colSpan="4" style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        Total : {lignesSortieConfirmees.length} produit{lignesSortieConfirmees.length > 1 ? 's' : ''} à sortir
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <button onClick={soumettreSortie} disabled={lignesSortieConfirmees.length === 0}
            style={{
              width: '100%', padding: '14px',
              backgroundColor: lignesSortieConfirmees.length === 0 ? '#e5e7eb' : '#dc2626',
              color: lignesSortieConfirmees.length === 0 ? '#9ca3af' : 'white',
              border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600',
              cursor: lignesSortieConfirmees.length === 0 ? 'not-allowed' : 'pointer'
            }}>
            Valider la sortie ({lignesSortieConfirmees.length} produit{lignesSortieConfirmees.length > 1 ? 's' : ''})
          </button>
        </div>
      )}

      {/* BONS */}
      {onglet === 'bons' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>
            Bons d'approvisionnement ({bons.length})
          </h2>
          {bons.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Aucun bon enregistré</p>
          ) : (
            bons.map(bon => (
              <div key={bon.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '15px' }}>Bon #00{bon.id}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                      {bon.fournisseur ? `🚚 ${bon.fournisseur.nom}` : 'Sans fournisseur'} — {new Date(bon.date_livraison).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: '700', fontSize: '16px', color: 'var(--couleur-principale)' }}>{parseFloat(bon.total_achat).toLocaleString()} XOF</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>{bon.lignes.length} produit(s)</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {bon.lignes.map(l => (
                    <span key={l.id} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', borderRadius: '20px', fontSize: '12px', color: '#374151' }}>
                      {l.produit.nom} × {l.quantite} {l.produit.unite}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* HISTORIQUE */}
      {onglet === 'historique' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Date', 'Produit', 'Type', 'Quantité', 'Raison', 'Par'].map(h => (
                  <th key={h} style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historique.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{new Date(m.date_mouvement).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '10px', fontSize: '13px', fontWeight: '500' }}>{m.produit?.nom}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                      backgroundColor: m.type_mouvement === 'entree' ? '#f0fdf4' : '#fef2f2',
                      color: m.type_mouvement === 'entree' ? '#16a34a' : '#dc2626'
                    }}>
                      {m.type_mouvement.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{m.quantite} {m.produit?.unite}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{m.raison || '-'}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{m.utilisateur?.nom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Stock