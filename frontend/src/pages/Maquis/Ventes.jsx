import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import api from '../../utils/api'

const fmtNum  = (n) => Number(n || 0).toLocaleString('fr-FR')
const fmtDate = (d) => new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
const fmt     = (d) => d.toISOString().slice(0, 10)

const STATUTS = [
  { key: '',                label: 'Toutes',      bg: '#f3f4f6', color: '#374151' },
  { key: 'encaissee',       label: 'Encaissée',   bg: '#d1fae5', color: '#065f46' },
  { key: 'en_attente',      label: 'En attente',  bg: '#fef3c7', color: '#92400e' },
  { key: 'credit_en_cours', label: 'Crédit',      bg: '#ede9fe', color: '#5b21b6' },
  { key: 'annulee',         label: 'Annulée',     bg: '#fee2e2', color: '#991b1b' },
]

const MODES = {
  especes:      { label: 'Espèces',     icone: '💵', color: '#16a34a' },
  wave:         { label: 'Wave',        icone: '🐧', color: '#1d4ed8' },
  orange_money: { label: 'Orange Money',icone: '📱', color: '#ea580c' },
  mtn_money:    { label: 'MTN MoMo',   icone: '📱', color: '#854d0e' },
  credit:       { label: 'Crédit',      icone: '📋', color: '#9333ea' },
  autre:        { label: 'Autre',       icone: '💳', color: '#64748b' },
}

const PERIODES = [
  { key: 'aujourd_hui', label: "Aujourd'hui" },
  { key: 'semaine',     label: 'Cette semaine' },
  { key: 'mois',        label: 'Ce mois' },
  { key: 'custom',      label: '📅 Dates' },
]

const Badge = ({ statut }) => {
  const s = STATUTS.find(x => x.key === statut) || { label: statut, bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

const Modal = ({ titre, onClose, children }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
    <div style={{ background:'#fff', borderRadius:14, padding:24, width:420, maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#111827' }}>{titre}</h3>
        <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9ca3af', lineHeight:1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
)

export default function Ventes() {
  const { utilisateur } = useAuth()
  const { socket }      = useSocket()
  const estAdmin = ['gerant', 'patron'].includes(utilisateur?.role)

  const [ventes,         setVentes]         = useState([])
  const [chargement,     setChargement]     = useState(true)
  const [filtreStatut,   setFiltreStatut]   = useState('')
  const [dateDebut,      setDateDebut]      = useState(fmt(new Date()))
  const [dateFin,        setDateFin]        = useState(fmt(new Date()))
  const [rechercheNum,   setRechercheNum]   = useState('')
  const [rechercheServ,  setRechercheServ]  = useState('')
  const [periode,        setPeriode]        = useState('aujourd_hui')
  const [ouverte,        setOuverte]        = useState(null)
  const [message,        setMessage]        = useState(null)

  const [modaleReduc,    setModaleReduc]    = useState(null)
  const [modaleAnnul,    setModaleAnnul]    = useState(null)
  const [montantReduc,   setMontantReduc]   = useState('')
  const [motifReduc,     setMotifReduc]     = useState('')
  const [motifAnnul,     setMotifAnnul]     = useState('')
  const [enCours,        setEnCours]        = useState(false)

  const appliquerPeriode = (p) => {
    const auj = new Date()
    setPeriode(p)
    if (p === 'aujourd_hui') { setDateDebut(fmt(auj)); setDateFin(fmt(auj)) }
    else if (p === 'semaine') {
      const lun = new Date(auj); lun.setDate(auj.getDate() - ((auj.getDay() + 6) % 7))
      setDateDebut(fmt(lun)); setDateFin(fmt(auj))
    } else if (p === 'mois') {
      setDateDebut(fmt(new Date(auj.getFullYear(), auj.getMonth(), 1))); setDateFin(fmt(auj))
    }
  }

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const p = new URLSearchParams({ date_debut: dateDebut, date_fin: dateFin })
      if (filtreStatut)       p.set('statut',          filtreStatut)
      if (rechercheServ.trim()) p.set('serveur',        rechercheServ.trim())
      if (rechercheNum.trim())  p.set('numero_facture', rechercheNum.trim())
      const r = await api.get(`/api/ventes?${p}`)
      setVentes(r.data.data || [])
    } catch { msg('erreur', 'Erreur chargement') }
    finally  { setChargement(false) }
  }, [dateDebut, dateFin, filtreStatut, rechercheServ, rechercheNum])

  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    if (!socket) return
    const refresh = () => charger()
    socket.on('dashboard:update', refresh)
    socket.on('commande:encaissee', refresh)
    return () => { socket.off('dashboard:update', refresh); socket.off('commande:encaissee', refresh) }
  }, [socket, charger])

  const msg = (type, texte) => {
    setMessage({ type, texte })
    setTimeout(() => setMessage(null), 4000)
  }

  const retourAttente = async (v) => {
    if (!confirm(`Remettre la vente #${v.id} en attente ?`)) return
    try { await api.put(`/api/ventes/${v.id}/retour-attente`); msg('succes', 'Remise en attente'); charger() }
    catch (e) { msg('erreur', e.response?.data?.message || 'Erreur') }
  }

  const confirmerReduction = async () => {
    if (!montantReduc || !motifReduc.trim()) return msg('erreur', 'Montant et motif requis')
    setEnCours(true)
    try {
      await api.put(`/api/ventes/${modaleReduc.id}/reduction`, { montant: montantReduc, motif: motifReduc })
      msg('succes', 'Réduction appliquée'); setModaleReduc(null); charger()
    } catch (e) { msg('erreur', e.response?.data?.message || 'Erreur') }
    finally { setEnCours(false) }
  }

  const confirmerAnnulation = async () => {
    if (!motifAnnul.trim()) return msg('erreur', 'Motif obligatoire')
    setEnCours(true)
    try {
      await api.put(`/api/ventes/${modaleAnnul.id}/annuler`, { motif: motifAnnul })
      msg('succes', 'Vente annulée'); setModaleAnnul(null); charger()
    } catch (e) { msg('erreur', e.response?.data?.message || 'Erreur') }
    finally { setEnCours(false) }
  }

  const totalNet    = ventes.filter(v => v.statut !== 'annulee').reduce((s, v) => s + parseFloat(v.total_net || 0), 0)
  const nbActives   = ventes.filter(v => v.statut !== 'annulee').length
  const couleur     = utilisateur?.maquis?.couleur_primaire || '#FF6B35'

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto', minHeight: '100vh', background: '#f8fafc' }}>

      {/* Toast */}
      {message && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'12px 20px', borderRadius:10, fontWeight:600, fontSize:14,
          background: message.type === 'succes' ? '#d1fae5' : '#fee2e2',
          color:      message.type === 'succes' ? '#065f46' : '#991b1b',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          {message.texte}
        </div>
      )}

      {/* Titre */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Ventes & Factures</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Historique et gestion des encaissements</p>
      </div>

      {/* Filtres */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>

        {/* Périodes rapides */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {PERIODES.map(p => (
            <button key={p.key} onClick={() => appliquerPeriode(p.key)} style={{
              padding: '8px 18px', borderRadius: 22, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: periode === p.key ? couleur : '#f3f4f6',
              color:      periode === p.key ? '#fff'  : '#374151',
              transition: 'all 0.15s'
            }}>{p.label}</button>
          ))}
        </div>

        {/* Ligne date + recherches */}
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Du</div>
            <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPeriode('custom') }}
              style={{ border:'1.5px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:14, color:'#111827' }} />
          </div>
          <div>
            <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Au</div>
            <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPeriode('custom') }}
              style={{ border:'1.5px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:14, color:'#111827' }} />
          </div>
          <div style={{ flex:1, minWidth:120 }}>
            <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>N° vente</div>
            <input placeholder="Ex: 42" value={rechercheNum} onChange={e => setRechercheNum(e.target.value)}
              style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:14, boxSizing:'border-box' }} />
          </div>
          <div style={{ flex:2, minWidth:160 }}>
            <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Serveur</div>
            <input placeholder="Nom du serveur" value={rechercheServ} onChange={e => setRechercheServ(e.target.value)}
              style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:14, boxSizing:'border-box' }} />
          </div>
        </div>

        {/* Statuts */}
        <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
          {STATUTS.map(s => (
            <button key={s.key} onClick={() => setFiltreStatut(s.key)} style={{
              padding:'6px 14px', borderRadius:20, border: filtreStatut === s.key ? 'none' : `1.5px solid ${s.bg === '#f3f4f6' ? '#e5e7eb' : s.bg}`,
              cursor:'pointer', fontSize:12, fontWeight:700,
              background: filtreStatut === s.key ? couleur : s.bg,
              color:      filtreStatut === s.key ? '#fff'  : s.color,
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Résumé */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:14, color:'#6b7280' }}>
          {chargement ? '...' : <><strong style={{ color:'#111827' }}>{nbActives}</strong> vente{nbActives > 1 ? 's' : ''} · {ventes.length - nbActives > 0 ? `${ventes.length - nbActives} annulée(s)` : 'aucune annulation'}</>}
        </div>
        <div style={{ fontSize:20, fontWeight:800, color: couleur }}>
          {fmtNum(totalNet)} <span style={{ fontSize:14, fontWeight:600, color:'#9ca3af' }}>FCFA</span>
        </div>
      </div>

      {/* Liste */}
      {chargement ? (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af', fontSize:15 }}>Chargement...</div>
      ) : ventes.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:14, padding:60, textAlign:'center', boxShadow:'0 1px 6px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
          <div style={{ fontSize:16, fontWeight:600, color:'#374151', marginBottom:6 }}>Aucune vente sur cette période</div>
          <div style={{ fontSize:13, color:'#9ca3af' }}>Essayez une autre période ou vérifiez les filtres</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ventes.map(v => {
            const mode    = MODES[v.mode_paiement] || { label: v.mode_paiement, icone:'💳', color:'#6b7280' }
            const ouv     = ouverte === v.id
            const annulee = v.statut === 'annulee'
            return (
              <div key={v.id} style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 6px rgba(0,0,0,0.07)', overflow:'hidden', borderLeft: `4px solid ${annulee ? '#fecaca' : v.statut === 'encaissee' ? '#86efac' : v.statut === 'credit_en_cours' ? '#c4b5fd' : '#fde68a'}` }}>

                {/* Ligne principale */}
                <div onClick={() => setOuverte(ouv ? null : v.id)}
                  style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', cursor:'pointer', userSelect:'none' }}>

                  {/* Numéro */}
                  <div style={{ width:36, height:36, borderRadius:10, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:12, fontWeight:800, color:'#374151' }}>#{v.id}</span>
                  </div>

                  {/* Infos */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:14, fontWeight:700, color:'#111827' }}>{fmtDate(v.date_vente)}</span>
                      <Badge statut={v.statut} />
                      <span style={{ fontSize:12, color: mode.color, fontWeight:600 }}>{mode.icone} {mode.label}</span>
                    </div>
                    <div style={{ fontSize:12, color:'#9ca3af', marginTop:3 }}>
                      {v.caissier?.nom && <span>Caissier: {v.caissier.nom}</span>}
                      {v.serveur_nom   && <span> · Serveur: {v.serveur_nom}</span>}
                      {v.lignes?.length > 0 && <span> · {v.lignes.length} article{v.lignes.length > 1 ? 's' : ''}</span>}
                    </div>
                  </div>

                  {/* Montant */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:16, fontWeight:800, color: annulee ? '#9ca3af' : '#111827', textDecoration: annulee ? 'line-through' : 'none' }}>
                      {fmtNum(v.total_net)} FCFA
                    </div>
                    {v.reduction_montant > 0 && (
                      <div style={{ fontSize:11, color:'#9333ea', marginTop:2 }}>- {fmtNum(v.reduction_montant)} réduit</div>
                    )}
                  </div>

                  {/* Chevron */}
                  <span style={{ color:'#d1d5db', fontSize:18, transition:'transform 0.2s', transform: ouv ? 'rotate(90deg)' : 'none' }}>›</span>
                </div>

                {/* Détail déroulant */}
                {ouv && (
                  <div style={{ borderTop:'1px solid #f3f4f6', padding:'16px 18px', background:'#fafafa' }}>

                    {/* Table articles */}
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:12 }}>
                      <thead>
                        <tr style={{ borderBottom:'2px solid #f3f4f6' }}>
                          <th style={{ textAlign:'left', color:'#6b7280', fontWeight:600, padding:'0 0 8px' }}>Produit</th>
                          <th style={{ textAlign:'right', color:'#6b7280', fontWeight:600, padding:'0 0 8px' }}>Qté</th>
                          <th style={{ textAlign:'right', color:'#6b7280', fontWeight:600, padding:'0 0 8px' }}>P.U.</th>
                          <th style={{ textAlign:'right', color:'#6b7280', fontWeight:600, padding:'0 0 8px' }}>Sous-total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.lignes?.map(l => (
                          <tr key={l.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                            <td style={{ padding:'7px 0', fontWeight:500 }}>{l.produit?.nom}</td>
                            <td style={{ textAlign:'right', padding:'7px 0', color:'#6b7280' }}>{parseFloat(l.quantite)}</td>
                            <td style={{ textAlign:'right', padding:'7px 0', color:'#6b7280' }}>{fmtNum(l.prix_unitaire)}</td>
                            <td style={{ textAlign:'right', padding:'7px 0', fontWeight:700 }}>{fmtNum(l.total_ligne)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} style={{ textAlign:'right', paddingTop:10, fontWeight:700, color:'#374151' }}>Total</td>
                          <td style={{ textAlign:'right', paddingTop:10, fontWeight:800, fontSize:15, color: couleur }}>{fmtNum(v.total_net)} FCFA</td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Notes */}
                    {v.reduction_motif && (
                      <div style={{ background:'#fdf4ff', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#7e22ce', marginBottom:8 }}>
                        Réduction : <strong>{fmtNum(v.reduction_montant)} FCFA</strong> — {v.reduction_motif}
                      </div>
                    )}
                    {v.annulation_motif && (
                      <div style={{ background:'#fef2f2', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#991b1b', marginBottom:8 }}>
                        Annulation : {v.annulation_motif}
                      </div>
                    )}
                    {v.note && (
                      <div style={{ background:'#f9fafb', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#6b7280', marginBottom:8 }}>
                        Note : {v.note}
                      </div>
                    )}

                    {/* Actions admin */}
                    {estAdmin && !annulee && (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                        {/* Remettre en attente — seulement si encaissée */}
                        {v.statut === 'encaissee' && (
                          <button onClick={() => retourAttente(v)} style={{ background:'#fef9c3', color:'#713f12', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            ↩ Remettre en attente
                          </button>
                        )}
                        {/* Réduction — encaissée ou en attente */}
                        {['encaissee', 'en_attente', 'credit_en_cours'].includes(v.statut) && (
                          <button onClick={() => { setModaleReduc(v); setMontantReduc(''); setMotifReduc('') }} style={{ background:'#fdf4ff', color:'#7e22ce', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            % Réduction
                          </button>
                        )}
                        {/* Annuler */}
                        <button onClick={() => { setModaleAnnul(v); setMotifAnnul('') }} style={{ background:'#fef2f2', color:'#991b1b', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          ✕ Annuler la vente
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modale réduction */}
      {modaleReduc && (
        <Modal titre={`Réduction — Vente #${modaleReduc.id}`} onClose={() => setModaleReduc(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#f9fafb', borderRadius:8, padding:'10px 14px', fontSize:14 }}>
              Total actuel : <strong style={{ color:couleur }}>{fmtNum(modaleReduc.total_net)} FCFA</strong>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Montant de la réduction (FCFA)</label>
              <input type="number" value={montantReduc} onChange={e => setMontantReduc(e.target.value)} placeholder="Ex: 500"
                style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'9px 12px', fontSize:14, boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Motif</label>
              <input type="text" value={motifReduc} onChange={e => setMotifReduc(e.target.value)} placeholder="Fidélité client, erreur de prix..."
                style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'9px 12px', fontSize:14, boxSizing:'border-box' }} />
            </div>
            <button onClick={confirmerReduction} disabled={enCours}
              style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:8, padding:'11px 20px', fontWeight:700, fontSize:15, cursor:'pointer', opacity: enCours ? .7 : 1 }}>
              {enCours ? 'Enregistrement...' : 'Confirmer la réduction'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modale annulation */}
      {modaleAnnul && (
        <Modal titre={`Annuler la vente #${modaleAnnul.id}`} onClose={() => setModaleAnnul(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#fef2f2', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#991b1b', fontWeight:600 }}>
              ⚠️ Cette action est irréversible. Le stock sera rétabli automatiquement.
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Motif d'annulation (obligatoire)</label>
              <textarea value={motifAnnul} onChange={e => setMotifAnnul(e.target.value)} rows={3}
                placeholder="Erreur de saisie, client a changé d'avis..."
                style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'9px 12px', fontSize:14, boxSizing:'border-box', resize:'vertical' }} />
            </div>
            <button onClick={confirmerAnnulation} disabled={enCours}
              style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'11px 20px', fontWeight:700, fontSize:15, cursor:'pointer', opacity: enCours ? .7 : 1 }}>
              {enCours ? 'Annulation...' : 'Confirmer l\'annulation'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
