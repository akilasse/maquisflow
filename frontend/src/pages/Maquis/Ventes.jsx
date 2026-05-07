import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

const fmtNum = (n) => Number(n || 0).toLocaleString('fr-FR')
const fmtDate = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const STATUTS = [
  { key: '',              label: 'Toutes',         bg: '#f3f4f6', color: '#374151' },
  { key: 'en_attente',    label: 'En attente',     bg: '#fef3c7', color: '#92400e' },
  { key: 'encaissee',     label: 'Encaissée',      bg: '#d1fae5', color: '#065f46' },
  { key: 'credit_en_cours', label: 'Crédit',       bg: '#ede9fe', color: '#5b21b6' },
  { key: 'annulee',       label: 'Annulée',        bg: '#fee2e2', color: '#991b1b' },
]

const MODES = {
  especes:      '💵 Espèces',
  wave:         '🐧 Wave',
  orange_money: '📱 Orange Money',
  mtn_money:    '📱 MTN MoMo',
  credit:       '📋 Crédit',
  autre:        '💳 Autre',
}

const badge = (statut) => {
  const s = STATUTS.find(x => x.key === statut) || { label: statut, bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  )
}

const Modal = ({ titre, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{titre}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
      </div>
      {children}
    </div>
  </div>
)

export default function Ventes() {
  const { utilisateur } = useAuth()
  const estAdmin = ['gerant', 'patron'].includes(utilisateur?.role)

  const [ventes, setVentes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10))
  const [dateFin, setDateFin] = useState(new Date().toISOString().slice(0, 10))
  const [venteSelectionnee, setVenteSelectionnee] = useState(null)
  const [message, setMessage] = useState(null)

  // Modales
  const [modaleReduction, setModaleReduction] = useState(null)
  const [modaleAnnuler, setModaleAnnuler] = useState(null)
  const [montantReduction, setMontantReduction] = useState('')
  const [motifReduction, setMotifReduction] = useState('')
  const [motifAnnulation, setMotifAnnulation] = useState('')
  const [enCours, setEnCours] = useState(false)

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const params = new URLSearchParams({ date_debut: dateDebut, date_fin: dateFin })
      if (filtreStatut) params.set('statut', filtreStatut)
      const r = await api.get(`/api/ventes?${params}`)
      setVentes(r.data.data || [])
    } catch {
      afficherMsg('erreur', 'Erreur chargement des ventes')
    } finally {
      setChargement(false)
    }
  }, [dateDebut, dateFin, filtreStatut])

  useEffect(() => { charger() }, [charger])

  const afficherMsg = (type, texte) => {
    setMessage({ type, texte })
    setTimeout(() => setMessage(null), 4000)
  }

  const retourAttente = async (vente) => {
    if (!confirm(`Remettre la vente #${vente.id} en attente ?`)) return
    try {
      await api.put(`/api/ventes/${vente.id}/retour-attente`)
      afficherMsg('succes', 'Vente remise en attente')
      charger()
    } catch (e) {
      afficherMsg('erreur', e.response?.data?.message || 'Erreur')
    }
  }

  const confirmerReduction = async () => {
    if (!montantReduction || !motifReduction.trim()) {
      afficherMsg('erreur', 'Montant et motif obligatoires')
      return
    }
    setEnCours(true)
    try {
      await api.put(`/api/ventes/${modaleReduction.id}/reduction`, { montant: montantReduction, motif: motifReduction })
      afficherMsg('succes', 'Réduction appliquée')
      setModaleReduction(null)
      setMontantReduction('')
      setMotifReduction('')
      charger()
    } catch (e) {
      afficherMsg('erreur', e.response?.data?.message || 'Erreur')
    } finally {
      setEnCours(false)
    }
  }

  const confirmerAnnulation = async () => {
    if (!motifAnnulation.trim()) {
      afficherMsg('erreur', 'Le motif est obligatoire')
      return
    }
    setEnCours(true)
    try {
      await api.put(`/api/ventes/${modaleAnnuler.id}/annuler`, { motif: motifAnnulation })
      afficherMsg('succes', 'Vente annulée et stock rétabli')
      setModaleAnnuler(null)
      setMotifAnnulation('')
      charger()
    } catch (e) {
      afficherMsg('erreur', e.response?.data?.message || 'Erreur')
    } finally {
      setEnCours(false)
    }
  }

  const totalFiltre = ventes.filter(v => v.statut !== 'annulee').reduce((s, v) => s + parseFloat(v.total_net || 0), 0)

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      {message && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: message.type === 'succes' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'succes' ? '#065f46' : '#991b1b',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
        }}>
          {message.texte}
        </div>
      )}

      <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, color: '#111827' }}>Ventes / Factures</h2>

      {/* Filtres */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Du</label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Au</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUTS.map(s => (
            <button key={s.key} onClick={() => setFiltreStatut(s.key)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: filtreStatut === s.key ? '#FF6B35' : s.bg,
                color: filtreStatut === s.key ? '#fff' : s.color
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Résumé */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#6b7280', fontSize: 14 }}>{ventes.length} vente{ventes.length > 1 ? 's' : ''}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{fmtNum(totalFiltre)} FCFA</span>
      </div>

      {/* Liste */}
      {chargement ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Chargement...</div>
      ) : ventes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', background: '#fff', borderRadius: 12 }}>Aucune vente sur cette période</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ventes.map(v => (
            <div key={v.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              {/* En-tête vente */}
              <div
                onClick={() => setVenteSelectionnee(venteSelectionnee?.id === v.id ? null : v)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>#{v.id}</span>
                    {v.numero_facture && <span style={{ fontSize: 12, color: '#6b7280' }}>FAC-{v.numero_facture}</span>}
                    {badge(v.statut)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                    {fmtDate(v.date_vente)} · {v.caissier?.nom}
                    {v.serveur_nom && <span> · Serveur: {v.serveur_nom}</span>}
                    · {MODES[v.mode_paiement] || v.mode_paiement}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: v.statut === 'annulee' ? '#9ca3af' : '#111827' }}>
                    {fmtNum(v.total_net)} FCFA
                  </div>
                  {v.reduction_montant && (
                    <div style={{ fontSize: 11, color: '#9333ea' }}>- {fmtNum(v.reduction_montant)} réduit</div>
                  )}
                </div>
              </div>

              {/* Détails lignes */}
              {venteSelectionnee?.id === v.id && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px', background: '#fafafa' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: '#6b7280' }}>
                        <th style={{ textAlign: 'left', fontWeight: 600, paddingBottom: 6 }}>Produit</th>
                        <th style={{ textAlign: 'right', fontWeight: 600, paddingBottom: 6 }}>Qté</th>
                        <th style={{ textAlign: 'right', fontWeight: 600, paddingBottom: 6 }}>P.U.</th>
                        <th style={{ textAlign: 'right', fontWeight: 600, paddingBottom: 6 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.lignes?.map(l => (
                        <tr key={l.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '4px 0' }}>{l.produit?.nom}</td>
                          <td style={{ textAlign: 'right', padding: '4px 0' }}>{parseFloat(l.quantite)}</td>
                          <td style={{ textAlign: 'right', padding: '4px 0' }}>{fmtNum(l.prix_unitaire)}</td>
                          <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: 600 }}>{fmtNum(l.total_ligne)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {v.reduction_motif && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#9333ea' }}>
                      Réduction : {fmtNum(v.reduction_montant)} FCFA — {v.reduction_motif}
                    </div>
                  )}
                  {v.annulation_motif && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#991b1b' }}>
                      Annulation : {v.annulation_motif}
                    </div>
                  )}

                  {/* Actions gérant/patron */}
                  {estAdmin && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {v.statut === 'encaissee' && (
                        <>
                          <button onClick={() => retourAttente(v)}
                            style={{ background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            ↩ Remettre en attente
                          </button>
                          <button onClick={() => { setModaleReduction(v); setMontantReduction(''); setMotifReduction('') }}
                            style={{ background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            % Appliquer réduction
                          </button>
                        </>
                      )}
                      {!['annulee'].includes(v.statut) && (
                        <button onClick={() => { setModaleAnnuler(v); setMotifAnnulation('') }}
                          style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          ✕ Annuler
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modale réduction */}
      {modaleReduction && (
        <Modal titre={`Réduction — Vente #${modaleReduction.id}`} onClose={() => setModaleReduction(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, fontSize: 14 }}>
              Total actuel : <strong>{fmtNum(modaleReduction.total_net)} FCFA</strong>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Montant de la réduction (FCFA)</label>
              <input type="number" value={montantReduction} onChange={e => setMontantReduction(e.target.value)} placeholder="Ex: 500"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Motif</label>
              <input type="text" value={motifReduction} onChange={e => setMotifReduction(e.target.value)} placeholder="Fidélité client, erreur de prix..."
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <button onClick={confirmerReduction} disabled={enCours}
              style={{ background: '#9333ea', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: enCours ? 0.7 : 1 }}>
              {enCours ? 'Enregistrement...' : 'Confirmer la réduction'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modale annulation */}
      {modaleAnnuler && (
        <Modal titre={`Annuler la vente #${modaleAnnuler.id}`} onClose={() => setModaleAnnuler(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fee2e2', borderRadius: 8, padding: 12, fontSize: 14, color: '#991b1b' }}>
              ⚠️ Le stock sera rétabli automatiquement.
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Motif d'annulation (obligatoire)</label>
              <textarea value={motifAnnulation} onChange={e => setMotifAnnulation(e.target.value)} rows={3}
                placeholder="Erreur de saisie, produit non disponible..."
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <button onClick={confirmerAnnulation} disabled={enCours}
              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: enCours ? 0.7 : 1 }}>
              {enCours ? 'Annulation...' : 'Confirmer l\'annulation'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
