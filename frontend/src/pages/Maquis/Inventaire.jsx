// ============================================================
// PAGE INVENTAIRE - Comptage physique des stocks
// ============================================================

import { useState, useEffect } from 'react'
import api from '../../utils/api'

const Inventaire = () => {
  const [inventaires, setInventaires] = useState([])
  const [inventaireActif, setInventaireActif] = useState(null)
  const [onglet, setOnglet] = useState('actif')
  const [chargement, setChargement] = useState(true)
  const [chargementAction, setChargementAction] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { chargerDonnees() }, [])

  const chargerDonnees = async () => {
    try {
      const response = await api.get('/api/inventaire')
      const tous = response.data.data
      setInventaires(tous)
      const enCours = tous.find(i => i.statut === 'en_cours')
      if (enCours) {
        const detail = await api.get(`/api/inventaire/${enCours.id}`)
        setInventaireActif(detail.data.data)
      } else {
        setInventaireActif(null)
      }
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

  const demarrerInventaire = async () => {
    setChargementAction(true)
    try {
      await api.post('/api/inventaire', {})
      afficherMessage('succes', 'Inventaire démarré !')
      chargerDonnees()
    } catch (error) {
      afficherMessage('erreur', error.response?.data?.message || 'Erreur')
    } finally {
      setChargementAction(false)
    }
  }

  const mettreAJourLigne = async (produit_id, qte_reelle) => {
    if (qte_reelle === '' || qte_reelle < 0) return
    try {
      await api.put(`/api/inventaire/${inventaireActif.id}/ligne`, {
        produit_id,
        qte_reelle: parseFloat(qte_reelle)
      })
      setInventaireActif(prev => ({
        ...prev,
        lignes: prev.lignes.map(l =>
          l.produit_id === produit_id
            ? { ...l, qte_reelle: parseFloat(qte_reelle), ecart: parseFloat(qte_reelle) - parseFloat(l.qte_theorique) }
            : l
        )
      }))
    } catch (error) {
      afficherMessage('erreur', 'Erreur mise à jour')
    }
  }

  const cloturerInventaire = async () => {
    if (!window.confirm('Clôturer l\'inventaire ? Les stocks seront ajustés automatiquement.')) return
    setChargementAction(true)
    try {
      await api.post(`/api/inventaire/${inventaireActif.id}/cloturer`, {})
      afficherMessage('succes', 'Inventaire clôturé ! Stocks mis à jour.')
      chargerDonnees()
      setOnglet('historique')
    } catch (error) {
      afficherMessage('erreur', error.response?.data?.message || 'Erreur')
    } finally {
      setChargementAction(false)
    }
  }

  const styleOnglet = (actif) => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontWeight: '500', fontSize: '14px',
    backgroundColor: actif ? '#FF6B35' : '#f3f4f6',
    color: actif ? 'white' : '#374151'
  })

  const stats = inventaireActif ? {
    total: inventaireActif.lignes.length,
    saisis: inventaireActif.lignes.filter(l => parseFloat(l.qte_reelle) > 0 || l.qte_reelle === 0).length,
    ecarts_positifs: inventaireActif.lignes.filter(l => parseFloat(l.ecart) > 0).length,
    ecarts_negatifs: inventaireActif.lignes.filter(l => parseFloat(l.ecart) < 0).length,
  } : null

  if (chargement) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Chargement...</div>
  )

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Inventaire</h1>
      <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>
        Comptage physique des stocks et ajustement des écarts
      </p>

      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
          backgroundColor: message.type === 'succes' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'succes' ? '#16a34a' : '#dc2626',
          border: `1px solid ${message.type === 'succes' ? '#bbf7d0' : '#fecaca'}`
        }}>{message.texte}</div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setOnglet('actif')} style={styleOnglet(onglet === 'actif')}>📋 Inventaire en cours</button>
        <button onClick={() => setOnglet('historique')} style={styleOnglet(onglet === 'historique')}>🕐 Historique</button>
      </div>

      {onglet === 'actif' && (
        <div>
          {!inventaireActif ? (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>📦</p>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Aucun inventaire en cours</h2>
              <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>Démarrez un inventaire pour compter physiquement vos stocks</p>
              <button onClick={demarrerInventaire} disabled={chargementAction}
                style={{ padding: '12px 32px', backgroundColor: '#FF6B35', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                {chargementAction ? 'Démarrage...' : '🚀 Démarrer un inventaire'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Total produits', valeur: stats.total, couleur: '#374151' },
                  { label: 'Saisis', valeur: stats.saisis, couleur: '#2563eb' },
                  { label: 'Surplus', valeur: stats.ecarts_positifs, couleur: '#16a34a' },
                  { label: 'Manques', valeur: stats.ecarts_negatifs, couleur: '#dc2626' },
                ].map(s => (
                  <div key={s.label} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: s.couleur }}>{s.valeur}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Saisie des quantités réelles</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
                    Démarré le {new Date(inventaireActif.date_debut).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', width: '30%' }}>Produit</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', width: '18%' }}>Qté théorique</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', width: '22%' }}>Qté réelle</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', width: '15%' }}>Écart</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '500', width: '15%' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventaireActif.lignes.map(ligne => {
                      const ecart = parseFloat(ligne.ecart)
                      return (
                        <tr key={ligne.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '12px 10px', fontSize: '14px', fontWeight: '500' }}>
                            {ligne.produit.nom}
                            <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontWeight: '400' }}>{ligne.produit.unite}</span>
                          </td>
                          <td style={{ padding: '12px 10px', fontSize: '14px', color: '#6b7280' }}>{ligne.qte_theorique} {ligne.produit.unite}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <input type="number" defaultValue={parseFloat(ligne.qte_reelle) || ''} placeholder="Saisir..."
                              onBlur={e => mettreAJourLigne(ligne.produit_id, e.target.value)}
                              style={{ width: '90%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                          </td>
                          <td style={{ padding: '12px 10px', fontSize: '14px', fontWeight: '600', color: ecart > 0 ? '#16a34a' : ecart < 0 ? '#dc2626' : '#9ca3af' }}>
                            {ecart > 0 ? `+${ecart}` : ecart === 0 ? '0' : ecart} {ligne.produit.unite}
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            {ecart === 0 && parseFloat(ligne.qte_reelle) === 0 ? (
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Non saisi</span>
                            ) : ecart === 0 ? (
                              <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '12px', backgroundColor: '#f0fdf4', color: '#16a34a' }}>✅ OK</span>
                            ) : ecart > 0 ? (
                              <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '12px', backgroundColor: '#f0fdf4', color: '#16a34a' }}>📈 Surplus</span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '12px', backgroundColor: '#fef2f2', color: '#dc2626' }}>📉 Manque</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <button onClick={cloturerInventaire} disabled={chargementAction}
                style={{ width: '100%', padding: '14px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                {chargementAction ? 'Clôture en cours...' : '🔒 Clôturer et ajuster les stocks'}
              </button>
            </div>
          )}
        </div>
      )}

      {onglet === 'historique' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>
            Historique des inventaires ({inventaires.filter(i => i.statut === 'cloture').length})
          </h2>
          {inventaires.filter(i => i.statut === 'cloture').length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Aucun inventaire clôturé</p>
          ) : (
            inventaires.filter(i => i.statut === 'cloture').map(inv => (
              <div key={inv.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '15px' }}>Inventaire #{inv.id}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Du {new Date(inv.date_debut).toLocaleDateString('fr-FR')} au {new Date(inv.date_fin).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: '#f0fdf4', color: '#16a34a' }}>✅ Clôturé</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default Inventaire