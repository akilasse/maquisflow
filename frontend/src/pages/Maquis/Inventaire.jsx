// ============================================================
// PAGE INVENTAIRE - Comptage physique des stocks
// ============================================================

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const Inventaire = () => {
  const { utilisateur } = useAuth()
  const [inventaires, setInventaires] = useState([])
  const [inventaireActif, setInventaireActif] = useState(null)
  const [onglet, setOnglet] = useState('actif')
  const [chargement, setChargement] = useState(true)
  const [chargementAction, setChargementAction] = useState(false)
  const [message, setMessage] = useState(null)
  const [rechercheInv, setRechercheInv] = useState('')
  const [filtreCatInv, setFiltreCatInv] = useState('')
  const [filtreEcartInv, setFiltreEcartInv] = useState('')
  const [modalPDF, setModalPDF] = useState(null)
  const [participants, setParticipants] = useState([])
  const [newParticipant, setNewParticipant] = useState('')

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

  const annulerInventaire = async () => {
    if (!window.confirm('Annuler l\'inventaire en cours ? Toutes les saisies seront perdues.')) return
    setChargementAction(true)
    try {
      await api.delete(`/api/inventaire/${inventaireActif.id}`)
      afficherMessage('succes', 'Inventaire annulé.')
      chargerDonnees()
    } catch (error) {
      afficherMessage('erreur', error.response?.data?.message || 'Erreur lors de l\'annulation')
    } finally {
      setChargementAction(false)
    }
  }

  const ouvrirModalPDF = async (inv) => {
    if (!inv.createur_nom) {
      try {
        const r = await api.get(`/api/inventaire/${inv.id}`)
        inv = r.data.data
      } catch {}
    }
    setModalPDF(inv)
    setParticipants([utilisateur?.nom || ''])
    setNewParticipant('')
  }

  const genererPDF = (inv, parts) => {
    const lignesTableau = (inv.lignes || []).map((l, i) => {
      const ecart = parseFloat(l.ecart)
      const couleurEcart = ecart > 0 ? '#16a34a' : ecart < 0 ? '#dc2626' : '#374151'
      const bgRow = i % 2 === 0 ? '#ffffff' : '#f8fafc'
      return `<tr style="background:${bgRow}">
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9">${l.produit?.nom || ''}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${l.produit?.categorie || '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right">${parseFloat(l.qte_theorique)} ${l.produit?.unite || ''}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right">${parseFloat(l.qte_reelle)} ${l.produit?.unite || ''}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:${couleurEcart}">${ecart > 0 ? '+' : ''}${ecart} ${l.produit?.unite || ''}</td>
      </tr>`
    }).join('')

    const avecEcart = (inv.lignes || []).filter(l => parseFloat(l.ecart) !== 0).length
    const signaturesHTML = parts.filter(p => p.trim()).map(p => `
      <div style="flex:1;min-width:180px;border:1.5px solid #e2e8f0;border-radius:8px;padding:16px">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#374151">${p}</p>
        <p style="margin:0 0 16px;font-size:11px;color:#9ca3af">Date : _______________</p>
        <div style="height:64px;border:1px dashed #cbd5e1;border-radius:4px"></div>
        <p style="margin:4px 0 0;font-size:10px;color:#9ca3af;text-align:center">Signature</p>
      </div>`).join('')

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Inventaire #INV-${String(inv.id).padStart(4,'0')}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Helvetica Neue',Arial,sans-serif; font-size:13px; color:#1e293b; background:white; padding:32px; }
  @media print { body { padding:16px; } }
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #6366f1">
  <div>
    <div style="font-size:28px;font-weight:900;color:#6366f1;letter-spacing:-1px">FLOWIX</div>
    <div style="font-size:12px;color:#64748b;margin-top:2px">Rapport d'inventaire physique</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:20px;font-weight:800;color:#0f172a">INVENTAIRE</div>
    <div style="font-size:13px;color:#6366f1;font-weight:700">N° INV-${String(inv.id).padStart(4,'0')}</div>
    <div style="font-size:12px;color:#64748b;margin-top:2px">Statut : <strong>${inv.statut === 'cloture' ? 'Clôturé' : 'En cours'}</strong></div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px">
  <div style="background:#f8fafc;border-left:4px solid #6366f1;border-radius:6px;padding:14px 18px">
    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Démarré par</div>
    <div style="font-size:16px;font-weight:800;color:#0f172a">${inv.createur_nom || utilisateur?.nom || '—'}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px">Le ${fmtDate(inv.date_debut)}</div>
  </div>
  <div style="background:#f8fafc;border-left:4px solid #6366f1;border-radius:6px;padding:14px 18px">
    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Résumé</div>
    <div style="font-size:14px;color:#0f172a">${(inv.lignes||[]).length} produits comptés</div>
    <div style="font-size:12px;color:${avecEcart > 0 ? '#dc2626' : '#16a34a'};margin-top:4px;font-weight:600">${avecEcart} écart(s) détecté(s)</div>
    ${inv.date_fin ? `<div style="font-size:12px;color:#64748b;margin-top:4px">Clôturé le ${fmtDate(inv.date_fin)}</div>` : ''}
  </div>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:28px">
  <thead>
    <tr style="background:#6366f1">
      <th style="padding:9px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:white">Produit</th>
      <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:white">Catégorie</th>
      <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:white">Qté théorique</th>
      <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:white">Qté réelle</th>
      <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:white">Écart</th>
    </tr>
  </thead>
  <tbody>${lignesTableau}</tbody>
</table>

${parts.filter(p => p.trim()).length > 0 ? `
<div style="margin-top:32px">
  <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">Signatures des participants</div>
  <div style="display:flex;gap:16px;flex-wrap:wrap">${signaturesHTML}</div>
</div>` : ''}

<div style="margin-top:36px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px">
  Flowix — Logiciel de gestion commerciale · maquisflow.com
</div>

<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body></html>`

    const w = window.open('', '_blank', 'width=1000,height=800')
    if (!w) { afficherMessage('erreur', 'Popup bloquée — autoriser les popups pour ce site'); return }
    w.document.write(html)
    w.document.close()
    setModalPDF(null)
  }

  const styleOnglet = (actif) => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontWeight: '500', fontSize: '14px',
    backgroundColor: actif ? 'var(--couleur-principale)' : '#f3f4f6',
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
                style={{ padding: '12px 32px', backgroundColor: 'var(--couleur-principale)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
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

              {(() => {
                const cats = [...new Set(inventaireActif.lignes.filter(l => l.produit?.categorie).map(l => l.produit.categorie))].sort()
                const lignesFiltrees = inventaireActif.lignes.filter(l => {
                  const ecart = parseFloat(l.ecart)
                  const nonSaisi = ecart === 0 && parseFloat(l.qte_reelle) === 0
                  if (rechercheInv && !l.produit.nom.toLowerCase().includes(rechercheInv.toLowerCase())) return false
                  if (filtreCatInv && l.produit?.categorie !== filtreCatInv) return false
                  if (filtreEcartInv === 'non_saisi' && !nonSaisi) return false
                  if (filtreEcartInv === 'ok' && (nonSaisi || ecart !== 0)) return false
                  if (filtreEcartInv === 'surplus' && ecart <= 0) return false
                  if (filtreEcartInv === 'manque' && ecart >= 0) return false
                  return true
                })
                return (
                  <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Saisie des quantités réelles</h2>
                      <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
                        Démarré le {new Date(inventaireActif.date_debut).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {/* Barre recherche + filtres */}
                    <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        placeholder="🔍 Rechercher un produit..."
                        value={rechercheInv}
                        onChange={e => setRechercheInv(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0 }}>Catégorie :</span>
                        {['', ...cats].map(c => (
                          <button key={c} onClick={() => setFiltreCatInv(c)}
                            style={{ padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                              backgroundColor: filtreCatInv === c ? 'var(--couleur-principale)' : '#f3f4f6',
                              color: filtreCatInv === c ? 'white' : '#374151' }}>
                            {c || 'Tout'}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0 }}>Écart :</span>
                        {[['', 'Tous'], ['non_saisi', 'Non saisi'], ['ok', '✅ OK'], ['surplus', '📈 Surplus'], ['manque', '📉 Manque']].map(([val, label]) => (
                          <button key={val} onClick={() => setFiltreEcartInv(val)}
                            style={{ padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                              backgroundColor: filtreEcartInv === val ? 'var(--couleur-principale)' : '#f3f4f6',
                              color: filtreEcartInv === val ? 'white' : '#374151' }}>
                            {label}
                          </button>
                        ))}
                        {(rechercheInv || filtreCatInv || filtreEcartInv) && (
                          <button onClick={() => { setRechercheInv(''); setFiltreCatInv(''); setFiltreEcartInv('') }}
                            style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                            ✕ Réinitialiser
                          </button>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>{lignesFiltrees.length} / {inventaireActif.lignes.length} produits</span>
                      </div>
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
                        {lignesFiltrees.map(ligne => {
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
                        {lignesFiltrees.length === 0 && (
                          <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontSize: '14px' }}>Aucun produit trouvé</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              })()}

              {/* Boutons action */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={annulerInventaire} disabled={chargementAction}
                  style={{ flex: 1, padding: '14px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                  {chargementAction ? '...' : '❌ Annuler l\'inventaire'}
                </button>
                <button onClick={() => ouvrirModalPDF(inventaireActif)}
                  style={{ flex: 1, padding: '14px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                  📄 Générer PDF
                </button>
                <button onClick={cloturerInventaire} disabled={chargementAction}
                  style={{ flex: 2, padding: '14px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                  {chargementAction ? 'Clôture en cours...' : '🔒 Clôturer et ajuster les stocks'}
                </button>
              </div>
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => ouvrirModalPDF(inv)}
                      style={{ padding: '6px 14px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      📄 PDF
                    </button>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: '#f0fdf4', color: '#16a34a' }}>✅ Clôturé</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* Modal PDF — participants */}
      {modalPDF && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>📄 Rapport PDF</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>Inventaire N° INV-{String(modalPDF.id).padStart(4, '0')}</p>
              </div>
              <button onClick={() => setModalPDF(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Participants (zones de signature)</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  value={newParticipant}
                  onChange={e => setNewParticipant(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newParticipant.trim()) {
                      setParticipants(prev => [...prev, newParticipant.trim()])
                      setNewParticipant('')
                    }
                  }}
                  placeholder="Nom du participant..."
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
                <button
                  onClick={() => {
                    if (newParticipant.trim()) {
                      setParticipants(prev => [...prev, newParticipant.trim()])
                      setNewParticipant('')
                    }
                  }}
                  style={{ padding: '9px 16px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  + Ajouter
                </button>
              </div>
              {participants.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>Aucun participant — le PDF n'aura pas de zones de signature</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {participants.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '14px', color: '#374151', fontWeight: i === 0 ? '600' : '400' }}>
                        {p} {i === 0 && <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600' }}>· initiateur</span>}
                      </span>
                      <button onClick={() => setParticipants(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalPDF(null)}
                style={{ flex: 1, padding: '12px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => genererPDF(modalPDF, participants)}
                style={{ flex: 2, padding: '12px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                📄 Générer et imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventaire