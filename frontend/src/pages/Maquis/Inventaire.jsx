// ============================================================
// PAGE INVENTAIRE - Comptage physique des stocks
// ============================================================

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../utils/api'

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const Inventaire = () => {
  const { utilisateur } = useAuth()
  const { showToast: afficherMessage } = useToast()
  const [inventaires, setInventaires] = useState([])
  const [inventaireActif, setInventaireActif] = useState(null)
  const [onglet, setOnglet] = useState('actif')
  const [chargement, setChargement] = useState(true)
  const [chargementAction, setChargementAction] = useState(false)
  const [rechercheInv, setRechercheInv] = useState('')
  const [filtreCatInv, setFiltreCatInv] = useState('')
  const [filtreEcartInv, setFiltreEcartInv] = useState('')
  const [modalPDF, setModalPDF] = useState(null)
  const [participants, setParticipants] = useState([])
  const [newParticipant, setNewParticipant] = useState('')
  const [detailModal, setDetailModal] = useState(null)
  const [chargementDetail, setChargementDetail] = useState(false)
  const [modalDemarrer, setModalDemarrer] = useState(false)
  const [partsDemarrer, setPartsDemarrer] = useState([])
  const [newPartDemarrer, setNewPartDemarrer] = useState('')
  const [participantsActifs, setParticipantsActifs] = useState([])
  const [filtreHistMois, setFiltreHistMois] = useState('')
  const [filtreHistDebut, setFiltreHistDebut] = useState('')
  // Saisie variantes : { [produit_id]: { base: "2", variantes: { "Demi bouteille": "2" } } }
  const [variantesLocales, setVariantesLocales] = useState({})
  const [filtreHistFin, setFiltreHistFin] = useState('')

  useEffect(() => { chargerDonnees() }, [])

  // Initialiser les saisies locales depuis les données chargées
  useEffect(() => {
    if (!inventaireActif) return
    const init = {}
    inventaireActif.lignes.forEach(l => {
      const vc = l.variantes_comptees
      if (vc && typeof vc === 'object' && vc.variantes) {
        // Données de variantes déjà saisies
        const varMap = {}
        ;(vc.variantes || []).forEach(v => { varMap[v.nom] = String(v.quantite) })
        init[l.produit_id] = { base: String(vc.base || 0), variantes: varMap }
      } else {
        // Pas encore de saisie variante — initialiser vide
        const varMap = {}
        ;(l.produit?.variantes || []).forEach(v => { varMap[v.nom] = '' })
        init[l.produit_id] = {
          base: parseFloat(l.qte_reelle) > 0 ? String(parseFloat(l.qte_reelle)) : '',
          variantes: varMap
        }
      }
    })
    setVariantesLocales(init)
  }, [inventaireActif?.id])

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
      afficherMessage('erreur', 'Erreur chargement données')
    } finally {
      setChargement(false)
    }
  }

  const ouvrirModalDemarrer = () => {
    setPartsDemarrer([utilisateur?.nom || ''])
    setNewPartDemarrer('')
    setModalDemarrer(true)
  }

  const demarrerInventaire = async () => {
    setModalDemarrer(false)
    setParticipantsActifs([...partsDemarrer])
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

  // ── Calcul total depuis les saisies locales d'un produit ──
  const calcTotal = (produit_id, variantes_produit, local) => {
    const loc = local || variantesLocales[produit_id] || {}
    const base = parseFloat(loc.base || 0)
    const totalVar = (variantes_produit || []).reduce((s, v) => {
      return s + parseFloat(loc.variantes?.[v.nom] || 0) * parseFloat(v.coefficient)
    }, 0)
    return parseFloat((base + totalVar).toFixed(3))
  }

  // ── Sauvegarder une ligne (appelé au blur de n'importe quel input) ──
  const mettreAJourLigne = async (produit_id, variantes_produit) => {
    const loc    = variantesLocales[produit_id] || {}
    const qte_base = parseFloat(loc.base || 0)
    const total    = calcTotal(produit_id, variantes_produit, loc)

    const variantes_comptees = (variantes_produit || [])
      .map(v => ({
        nom:         v.nom,
        coefficient: parseFloat(v.coefficient),
        quantite:    parseFloat(loc.variantes?.[v.nom] || 0)
      }))
      .filter(v => v.quantite > 0)

    try {
      await api.put(`/api/inventaire/${inventaireActif.id}/ligne`, {
        produit_id,
        qte_base,
        variantes_comptees
      })
      setInventaireActif(prev => ({
        ...prev,
        lignes: prev.lignes.map(l =>
          l.produit_id === produit_id
            ? {
                ...l,
                qte_reelle: total,
                ecart: total - parseFloat(l.qte_theorique),
                variantes_comptees: variantes_comptees.length > 0
                  ? { base: qte_base, variantes: variantes_comptees }
                  : null
              }
            : l
        )
      }))
    } catch {
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
    const motif = window.prompt('Motif d\'annulation (optionnel) — laissez vide si aucun :')
    if (motif === null) return // l'utilisateur a cliqué Annuler
    setChargementAction(true)
    try {
      await api.delete(`/api/inventaire/${inventaireActif.id}`, { data: { motif: motif.trim() || null } })
      afficherMessage('succes', 'Inventaire annulé.')
      chargerDonnees()
    } catch (error) {
      afficherMessage('erreur', error.response?.data?.message || 'Erreur lors de l\'annulation')
    } finally {
      setChargementAction(false)
    }
  }

  const ouvrirDetails = async (inv) => {
    setChargementDetail(true)
    try {
      const r = await api.get(`/api/inventaire/${inv.id}`)
      setDetailModal(r.data.data)
    } catch {
      afficherMessage('erreur', 'Impossible de charger les détails')
    } finally {
      setChargementDetail(false)
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
      const ecart = parseFloat(l.qte_reelle) - parseFloat(l.qte_theorique)
      const couleurEcart = ecart > 0 ? '#16a34a' : ecart < 0 ? '#dc2626' : '#374151'
      const bgRow = i % 2 === 0 ? '#ffffff' : '#f8fafc'
      const vc = l.variantes_comptees
      // Détail variantes si présent
      let detailVariantes = ''
      if (vc && vc.variantes && vc.variantes.length > 0) {
        const details = []
        if (vc.base > 0) details.push(`${vc.base} entière${vc.base > 1 ? 's' : ''}`)
        vc.variantes.forEach(v => {
          if (v.quantite > 0) details.push(`${v.quantite} ${v.nom} (×${v.coefficient})`)
        })
        detailVariantes = `<span style="font-size:10px;color:#7c3aed;display:block;margin-top:2px">${details.join(' + ')}</span>`
      }
      return `<tr style="background:${bgRow}">
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9">${l.produit?.nom || ''}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${l.produit?.categorie || '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right">${parseFloat(l.qte_theorique)} ${l.produit?.unite || ''}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right">${parseFloat(l.qte_reelle)} ${l.produit?.unite || ''}${detailVariantes}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:${couleurEcart}">${ecart > 0 ? '+' : ''}${ecart} ${l.produit?.unite || ''}</td>
      </tr>`
    }).join('')

    const avecEcart = (inv.lignes || []).filter(l => parseFloat(l.qte_reelle) !== parseFloat(l.qte_theorique)).length
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
              <button onClick={ouvrirModalDemarrer} disabled={chargementAction}
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
                          const ecart         = parseFloat(ligne.ecart)
                          const variantes     = ligne.produit?.variantes || []
                          const aVariantes    = variantes.length > 0
                          const loc           = variantesLocales[ligne.produit_id] || {}
                          const totalLive     = calcTotal(ligne.produit_id, variantes)

                          return (
                            <tr key={ligne.id} style={{ borderBottom: '1px solid #f9fafb', verticalAlign: 'top' }}>
                              {/* Produit */}
                              <td style={{ padding: '12px 10px', fontSize: '14px', fontWeight: '500' }}>
                                {ligne.produit.nom}
                                <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontWeight: '400' }}>{ligne.produit.unite}</span>
                                {aVariantes && (
                                  <span style={{ display: 'inline-block', marginTop: '3px', fontSize: '11px', color: '#6366f1', fontWeight: '600', backgroundColor: '#ede9fe', padding: '1px 7px', borderRadius: '10px' }}>
                                    {variantes.length} variante{variantes.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </td>

                              {/* Qté théorique */}
                              <td style={{ padding: '12px 10px', fontSize: '14px', color: '#6b7280' }}>
                                {parseFloat(ligne.qte_theorique)} {ligne.produit.unite}
                              </td>

                              {/* Saisie qté réelle — simple OU multi-variantes */}
                              <td style={{ padding: '8px 10px' }}>
                                {aVariantes ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

                                    {/* Bouteilles entières (entier obligatoire) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <input
                                        type="number" min="0" step="1"
                                        value={loc.base ?? ''}
                                        placeholder="0"
                                        onKeyDown={e => { if (['.', ','].includes(e.key)) e.preventDefault() }}
                                        onChange={e => {
                                          const val = e.target.value.replace(/[^0-9]/g, '')
                                          setVariantesLocales(prev => ({
                                            ...prev,
                                            [ligne.produit_id]: { ...prev[ligne.produit_id], base: val }
                                          }))
                                        }}
                                        onBlur={() => mettreAJourLigne(ligne.produit_id, variantes)}
                                        style={{ width: '64px', padding: '6px 8px', border: '1.5px solid #e5e7eb', borderRadius: '7px', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}
                                      />
                                      <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>
                                        {ligne.produit.unite} entière{parseFloat(loc.base || 0) > 1 ? 's' : ''}
                                      </span>
                                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        = {parseFloat(loc.base || 0)} {ligne.produit.unite}
                                      </span>
                                    </div>

                                    {/* Chaque variante — entier + calcul affiché */}
                                    {variantes.map(v => {
                                      const qtyV    = parseInt(loc.variantes?.[v.nom] || 0, 10)
                                      const coeff   = parseFloat(v.coefficient)
                                      const partiel = parseFloat((qtyV * coeff).toFixed(3))
                                      return (
                                        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <input
                                            type="number" min="0" step="1"
                                            value={loc.variantes?.[v.nom] ?? ''}
                                            placeholder="0"
                                            onKeyDown={e => { if (['.', ','].includes(e.key)) e.preventDefault() }}
                                            onChange={e => {
                                              const val = e.target.value.replace(/[^0-9]/g, '')
                                              setVariantesLocales(prev => ({
                                                ...prev,
                                                [ligne.produit_id]: {
                                                  ...prev[ligne.produit_id],
                                                  variantes: { ...prev[ligne.produit_id]?.variantes, [v.nom]: val }
                                                }
                                              }))
                                            }}
                                            onBlur={() => mettreAJourLigne(ligne.produit_id, variantes)}
                                            style={{ width: '64px', padding: '6px 8px', border: '1.5px solid #ddd6fe', borderRadius: '7px', fontSize: '14px', fontWeight: '600', textAlign: 'center', color: '#7c3aed' }}
                                          />
                                          <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>{v.nom}</span>
                                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                            {qtyV} × {coeff} = <strong style={{ color: '#374151' }}>{partiel} {ligne.produit.unite}</strong>
                                          </span>
                                        </div>
                                      )
                                    })}

                                    {/* Total final */}
                                    <div style={{ marginTop: '2px', paddingTop: '6px', borderTop: '2px dashed #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>TOTAL</span>
                                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>
                                        {totalLive} {ligne.produit.unite}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <input
                                    type="number" min="0" step="0.001"
                                    value={loc.base ?? (parseFloat(ligne.qte_reelle) || '')}
                                    placeholder="Saisir..."
                                    onChange={e => setVariantesLocales(prev => ({
                                      ...prev,
                                      [ligne.produit_id]: { ...prev[ligne.produit_id], base: e.target.value }
                                    }))}
                                    onBlur={() => mettreAJourLigne(ligne.produit_id, [])}
                                    style={{ width: '90%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                                  />
                                )}
                              </td>

                              {/* Écart */}
                              <td style={{ padding: '12px 10px', fontSize: '14px', fontWeight: '600', color: ecart > 0 ? '#16a34a' : ecart < 0 ? '#dc2626' : '#9ca3af' }}>
                                {ecart > 0 ? `+${ecart}` : ecart === 0 ? '0' : ecart} {ligne.produit.unite}
                              </td>

                              {/* Statut */}
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
                <button onClick={cloturerInventaire} disabled={chargementAction}
                  style={{ flex: 2, padding: '14px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                  {chargementAction ? 'Clôture en cours...' : '🔒 Clôturer et ajuster les stocks'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {onglet === 'historique' && (() => {
        const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
        const tousHistoriques = inventaires.filter(i => i.statut !== 'en_cours')

        // Mois uniques disponibles dans l'historique
        const moisDispo = [...new Set(tousHistoriques.map(i => {
          const d = new Date(i.date_debut)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        }))].sort().reverse()

        // Appliquer les filtres
        const historique = tousHistoriques.filter(inv => {
          const d = new Date(inv.date_debut)
          if (filtreHistMois) {
            const [y, m] = filtreHistMois.split('-')
            if (d.getFullYear() !== parseInt(y) || d.getMonth() + 1 !== parseInt(m)) return false
          }
          if (filtreHistDebut) {
            if (d < new Date(filtreHistDebut)) return false
          }
          if (filtreHistFin) {
            const fin = new Date(filtreHistFin); fin.setHours(23, 59, 59)
            if (d > fin) return false
          }
          return true
        })

        return (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                Historique des inventaires
              </h2>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>{historique.length} / {tousHistoriques.length}</span>
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Mois :</span>
                <select value={filtreHistMois} onChange={e => { setFiltreHistMois(e.target.value); setFiltreHistDebut(''); setFiltreHistFin('') }}
                  style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', background: 'white', cursor: 'pointer' }}>
                  <option value=''>Tous</option>
                  {moisDispo.map(ym => {
                    const [y, m] = ym.split('-')
                    return <option key={ym} value={ym}>{MOIS_FR[parseInt(m) - 1]} {y}</option>
                  })}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Du :</span>
                <input type='date' value={filtreHistDebut}
                  onChange={e => { setFiltreHistDebut(e.target.value); setFiltreHistMois('') }}
                  style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', background: 'white' }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Au :</span>
                <input type='date' value={filtreHistFin}
                  onChange={e => { setFiltreHistFin(e.target.value); setFiltreHistMois('') }}
                  style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', background: 'white' }} />
              </div>
              {(filtreHistMois || filtreHistDebut || filtreHistFin) && (
                <button onClick={() => { setFiltreHistMois(''); setFiltreHistDebut(''); setFiltreHistFin('') }}
                  style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  ✕ Réinitialiser
                </button>
              )}
            </div>

            {historique.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Aucun inventaire pour cette période</p>
            ) : historique.map(inv => (
              <div key={inv.id} style={{ border: `1px solid ${inv.statut === 'annule' ? '#fecaca' : '#e5e7eb'}`, borderRadius: '10px', padding: '16px', marginBottom: '12px', backgroundColor: inv.statut === 'annule' ? '#fff8f8' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '15px' }}>Inventaire N° INV-{String(inv.id).padStart(4, '0')}</p>
                      {inv.statut === 'cloture' ? (
                        <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f0fdf4', color: '#16a34a' }}>✅ Clôturé</span>
                      ) : (
                        <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef2f2', color: '#dc2626' }}>❌ Annulé</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      Démarré le {new Date(inv.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {inv.statut === 'cloture' && inv.date_fin && ` · Clôturé le ${new Date(inv.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                      {inv.statut === 'annule' && inv.date_annulation && ` · Annulé le ${new Date(inv.date_annulation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                    </p>
                    {inv.statut === 'annule' && (
                      <div style={{ marginTop: '8px' }}>
                        {inv.annuleur_nom && (
                          <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#374151' }}>
                            <span style={{ fontWeight: '600' }}>Annulé par :</span> {inv.annuleur_nom}
                          </p>
                        )}
                        {inv.motif_annulation && (
                          <p style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>
                            <span style={{ fontWeight: '600' }}>Motif :</span> {inv.motif_annulation}
                          </p>
                        )}
                        {!inv.motif_annulation && (
                          <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>Aucun motif renseigné</p>
                        )}
                      </div>
                    )}
                  </div>
                  {inv.statut === 'cloture' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button onClick={() => ouvrirDetails(inv)} disabled={chargementDetail}
                        style={{ padding: '7px 14px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        {chargementDetail ? '...' : '🔍 Détails'}
                      </button>
                      <button onClick={() => ouvrirModalPDF(inv)}
                        style={{ padding: '7px 14px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        📄 PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      })()}
      {/* Modal démarrage inventaire — saisie des participants */}
      {modalDemarrer && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>🚀 Démarrer l'inventaire</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>Ajoutez les participants — ils apparaîtront dans le rapport PDF</p>
              </div>
              <button onClick={() => setModalDemarrer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Participants</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  value={newPartDemarrer}
                  onChange={e => setNewPartDemarrer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newPartDemarrer.trim()) {
                      setPartsDemarrer(prev => [...prev, newPartDemarrer.trim()])
                      setNewPartDemarrer('')
                    }
                  }}
                  placeholder="Nom du participant..."
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
                <button
                  onClick={() => { if (newPartDemarrer.trim()) { setPartsDemarrer(prev => [...prev, newPartDemarrer.trim()]); setNewPartDemarrer('') } }}
                  style={{ padding: '9px 16px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  + Ajouter
                </button>
              </div>
              {partsDemarrer.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>Aucun participant — le rapport PDF n'aura pas de zones de signature</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {partsDemarrer.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '14px', color: '#374151', fontWeight: i === 0 ? '600' : '400' }}>
                        {p} {i === 0 && <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600' }}>· initiateur</span>}
                      </span>
                      <button onClick={() => setPartsDemarrer(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalDemarrer(false)}
                style={{ flex: 1, padding: '12px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={demarrerInventaire} disabled={chargementAction}
                style={{ flex: 2, padding: '12px', backgroundColor: 'var(--couleur-principale)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                {chargementAction ? 'Démarrage...' : '🚀 Démarrer l\'inventaire'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails inventaire clôturé */}
      {detailModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>Inventaire N° INV-{String(detailModal.id).padStart(4, '0')}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
                  Démarré par {detailModal.createur_nom || '—'} · Clôturé le {fmtDate(detailModal.date_fin)}
                </p>
              </div>
              <button onClick={() => setDetailModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px 28px', flex: 1 }}>
              {(() => {
                const avecEcart = (detailModal.lignes || []).filter(l => parseFloat(l.qte_reelle) !== parseFloat(l.qte_theorique)).length
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      {[
                        { label: 'Produits comptés', val: (detailModal.lignes || []).length, color: '#374151' },
                        { label: 'Écarts détectés', val: avecEcart, color: avecEcart > 0 ? '#dc2626' : '#16a34a' },
                        { label: 'Sans écart', val: (detailModal.lignes || []).length - avecEcart, color: '#16a34a' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: s.color }}>{s.val}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '9px 10px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Produit</th>
                          <th style={{ padding: '9px 10px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Catégorie</th>
                          <th style={{ padding: '9px 10px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Qté théorique</th>
                          <th style={{ padding: '9px 10px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Qté réelle</th>
                          <th style={{ padding: '9px 10px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Écart</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailModal.lignes || []).map((l, i) => {
                          const ecart = parseFloat(l.qte_reelle) - parseFloat(l.qte_theorique)
                          return (
                            <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={{ padding: '9px 10px', fontSize: '13px', fontWeight: '500' }}>{l.produit?.nom}</td>
                              <td style={{ padding: '9px 10px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>{l.produit?.categorie || '—'}</td>
                              <td style={{ padding: '9px 10px', fontSize: '13px', color: '#6b7280', textAlign: 'right' }}>{parseFloat(l.qte_theorique)} {l.produit?.unite}</td>
                              <td style={{ padding: '9px 10px', fontSize: '13px', textAlign: 'right' }}>{parseFloat(l.qte_reelle)} {l.produit?.unite}</td>
                              <td style={{ padding: '9px 10px', fontSize: '13px', fontWeight: '700', textAlign: 'right', color: ecart > 0 ? '#16a34a' : ecart < 0 ? '#dc2626' : '#9ca3af' }}>
                                {ecart > 0 ? `+${ecart}` : ecart}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </>
                )
              })()}
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '16px 28px', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => setDetailModal(null)}
                style={{ flex: 1, padding: '11px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Fermer
              </button>
              <button onClick={() => { setDetailModal(null); ouvrirModalPDF(detailModal) }}
                style={{ flex: 1, padding: '11px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                📄 Générer PDF
              </button>
            </div>
          </div>
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