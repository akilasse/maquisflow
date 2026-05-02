import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import api from '../../utils/api'

const DEVISE = 'FCFA'
const fmtNum = (n) => Number(n || 0).toLocaleString('fr-FR')
const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const labelGraph = (periode, mode) => {
  if (mode === 'mois') {
    const [, m] = String(periode).split('-')
    return MOIS_COURTS[parseInt(m, 10) - 1]
  }
  const d = new Date(periode)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
}

const MODES_PAIEMENT = [
  { key: 'especes',      label: 'Espèces',     icone: '💵', color: '#16a34a', bgCard: '#f0fdf4', bgIcone: '#16a34a', border: '#bbf7d0' },
  { key: 'wave',         label: 'Wave',         icone: '🐧', color: '#1d4ed8', bgCard: '#eff6ff', bgIcone: '#1d4ed8', border: '#bfdbfe' },
  { key: 'orange_money', label: 'Orange Money', icone: '📱', color: '#ea580c', bgCard: '#fff7ed', bgIcone: '#ea580c', border: '#fed7aa' },
  { key: 'mtn_money',    label: 'MTN MoMo',     icone: '📱', color: '#854d0e', bgCard: '#fefce8', bgIcone: '#FFCC00', border: '#fef08a' },
  { key: 'credit',       label: 'Crédit',       icone: '📋', color: '#9333ea', bgCard: '#fdf4ff', bgIcone: '#9333ea', border: '#e9d5ff' },
  { key: 'autre',        label: 'Autre',        icone: '💳', color: '#64748b', bgCard: '#f8fafc', bgIcone: '#64748b', border: '#e2e8f0' },
]

const Graphique = ({ donnees }) => {
  if (!donnees?.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#9ca3af', fontSize:14 }}>
      Aucune vente sur cette période
    </div>
  )
  const maxCA = Math.max(...donnees.map(d => Number(d.ca)), 1)
  const nTicks = 5
  const ticks = Array.from({ length: nTicks }, (_, i) => Math.round(maxCA * i / (nTicks - 1)))
  return (
    <div style={{ display:'flex', gap:8, height:200, marginTop:16 }}>
      <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', alignItems:'flex-end', paddingBottom:22, flexShrink:0, minWidth:32 }}>
        {[...ticks].reverse().map((t, i) => (
          <span key={i} style={{ fontSize:11, color:'#9ca3af' }}>{t >= 1000 ? `${Math.round(t/1000)}k` : t}</span>
        ))}
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <div style={{ flex:1, position:'relative' }}>
          {ticks.map((_, i) => <div key={i} style={{ position:'absolute', width:'100%', borderTop:'1px solid #f3f4f6', bottom:`${(i/(nTicks-1))*100}%` }} />)}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'flex-end', gap:4, padding:'0 2px' }}>
            {donnees.map((d, i) => {
              const pct = Math.max((Number(d.ca)/maxCA)*100, 1)
              return (
                <div key={i} title={`${fmtNum(d.ca)} ${DEVISE}`}
                  style={{ flex:1, height:`${pct}%`, background:'#bfdbfe', borderRadius:'4px 4px 0 0', cursor:'default', transition:'background 0.15s', minWidth:0 }}
                  onMouseEnter={e => e.currentTarget.style.background='#3b82f6'}
                  onMouseLeave={e => e.currentTarget.style.background='#bfdbfe'}
                />
              )
            })}
          </div>
        </div>
        <div style={{ display:'flex', gap:4, padding:'4px 2px 0', height:22 }}>
          {donnees.map((d, i) => (
            <div key={i} style={{ flex:1, textAlign:'center', minWidth:0 }}>
              <span style={{ fontSize:10, color:'#9ca3af', whiteSpace:'nowrap' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const CartePeriode = ({ titre, ventes, benefice, nb, isPatron, bg, labelCol, valCol, benCol, sousCol }) => (
  <div style={{ background: bg, borderRadius: 16, padding: '20px 24px', flex: '1 1 220px', minWidth: 0 }}>
    <p style={{ fontSize:11, fontWeight:700, color:labelCol, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 12px' }}>{titre}</p>
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
      <div>
        <p style={{ fontSize:11, color:sousCol, margin:'0 0 2px' }}>Ventes</p>
        <p style={{ fontSize:48, fontWeight:700, color:valCol, fontFamily:'Georgia, serif', lineHeight:1, margin:0 }}>{fmtNum(ventes)}</p>
        <p style={{ fontSize:12, color:sousCol, margin:'4px 0 0' }}>{DEVISE} · {nb} transaction{nb > 1 ? 's' : ''}</p>
      </div>
      {isPatron && (
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:11, color:sousCol, margin:'0 0 2px' }}>Bénéfice</p>
          <p style={{ fontSize:32, fontWeight:700, color:benCol, fontFamily:'Georgia, serif', lineHeight:1, margin:0 }}>{fmtNum(benefice)}</p>
          <p style={{ fontSize:12, color:sousCol, margin:'4px 0 0' }}>{DEVISE}</p>
        </div>
      )}
    </div>
  </div>
)

const Dashboard = () => {
  const { utilisateur } = useAuth()
  const { socket } = useSocket()
  const [data, setData]             = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur]         = useState('')
  const [graphique, setGraphique]   = useState('semaine')

  const chargerDashboard = useCallback(async (periode) => {
    try {
      const res = await api.get(`/api/dashboard?graphique=${periode}`)
      setData(res.data.data)
      setErreur('')
    } catch { setErreur('Erreur lors du chargement des données') }
    finally { setChargement(false) }
  }, [])

  useEffect(() => { setChargement(true); chargerDashboard(graphique) }, [graphique])
  useEffect(() => {
    if (!socket) return
    socket.on('dashboard:update', () => chargerDashboard(graphique))
    return () => socket.off('dashboard:update')
  }, [socket, graphique])

  const isPatron = utilisateur?.role === 'patron'
  const r = data?.resume || {}
  const donneesGraph = (data?.ventes_graphique || []).map(v => ({ ...v, label: labelGraph(String(v.periode), graphique) }))

  // TOUJOURS afficher tous les modes même à 0
  const paiementsParMode = MODES_PAIEMENT.map(mode => {
    const rep    = data?.repartition_paiement?.find(r => r.mode === mode.key)
    const wallet = data?.wallets?.[mode.key] ?? 0
    const total  = rep ? Number(rep.total) : wallet
    const nombre = rep ? rep.nombre : 0
    return { ...mode, total, nombre }
  })

  // 2 lignes de 3
  const ligne1 = paiementsParMode.slice(0, 3)
  const ligne2 = paiementsParMode.slice(3, 6)

  if (chargement) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:256 }}>
      <div style={{ width:48, height:48, border:'4px solid #f3f4f6', borderTop:'4px solid var(--couleur-principale)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (erreur) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:256 }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:'#ef4444', marginBottom:16 }}>{erreur}</p>
        <button onClick={() => chargerDashboard(graphique)} style={{ background:'#f97316', color:'#fff', padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer' }}>Réessayer</button>
      </div>
    </div>
  )

  const panel = { background:'#fff', border:'1px solid #f3f4f6', borderRadius:16, padding:'20px 24px' }
  const titrePanel = { fontSize:18, fontWeight:700, color:'#1f2937', fontFamily:'Georgia, serif', margin:'0 0 4px' }

  const LignePaiements = ({ modes }) => (
    <div style={{ display:'flex', gap:12, marginBottom:10 }}>
      {modes.map(({ key, label, icone, color, bgCard, bgIcone, border, total, nombre }) => (
        <div key={key} style={{ background: bgCard, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', flex: '1 1 0', minWidth: 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, backgroundColor: bgIcone, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, boxShadow:`0 2px 8px ${bgIcone}66` }}>
              {icone}
            </div>
            <span style={{ fontSize:13, fontWeight:700, color }}>{label}</span>
          </div>
          <p style={{ fontSize:30, fontWeight:700, color: total > 0 ? '#111827' : '#d1d5db', fontFamily:'Georgia, serif', lineHeight:1, margin:'0 0 6px' }}>
            {fmtNum(total)}
            <span style={{ fontSize:13, fontWeight:500, marginLeft:6, color:'#9ca3af' }}>{DEVISE}</span>
          </p>
          <p style={{ fontSize:12, color: nombre > 0 ? color : '#9ca3af', margin:0, fontWeight:600 }}>
            {nombre > 0 ? `${nombre} vente${nombre > 1 ? 's' : ''}` : 'Aucun paiement'}
          </p>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, paddingBottom:40 }}>

      <div>
        <h1 style={{ fontSize:28, fontWeight:700, color:'#111827', fontFamily:'Georgia, serif', letterSpacing:'-0.5px', margin:0 }}>Dashboard</h1>
        <p style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>
          {data?.maquis?.nom} — {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>

      {/* 3 Cartes chiffres d'affaires */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        <CartePeriode titre="Aujourd'hui"   ventes={r.vente_jour}    benefice={r.benefice_jour}    nb={r.nb_jour}    isPatron={isPatron} bg="#FFF7ED" labelCol="#c2410c" valCol="#7c2d12" benCol="#16a34a" sousCol="#f97316" />
        <CartePeriode titre="Cette semaine" ventes={r.vente_semaine} benefice={r.benefice_semaine} nb={r.nb_semaine} isPatron={isPatron} bg="#F0FDF4" labelCol="#15803d" valCol="#14532d" benCol="#15803d" sousCol="#22c55e" />
        <CartePeriode titre="Ce mois"       ventes={r.vente_mois}    benefice={r.benefice_mois}    nb={r.nb_mois}    isPatron={isPatron} bg="#EFF6FF" labelCol="#1d4ed8" valCol="#1e3a8a" benCol="#1d4ed8" sousCol="#3b82f6" />
      </div>

      {/* Paiements du jour — 2 lignes de 3 */}
      <div>
        <p style={{ fontSize:12, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 10px' }}>Paiements du jour</p>
        <LignePaiements modes={ligne1} />
        <LignePaiements modes={ligne2} />
      </div>

      {/* Graphique + Top produits */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        <div style={{ ...panel, flex:'3 1 320px', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <h2 style={titrePanel}>Évolution des ventes</h2>
              <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>Chiffre d'affaires en {DEVISE}</p>
            </div>
            <div style={{ display:'flex', gap:4, background:'#f3f4f6', borderRadius:12, padding:4, flexShrink:0 }}>
              {['semaine','mois'].map(p => (
                <button key={p} onClick={() => setGraphique(p)} style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', background: graphique===p ? '#fff' : 'transparent', color: graphique===p ? '#1f2937' : '#9ca3af', boxShadow: graphique===p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                  {p === 'semaine' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>
          </div>
          <Graphique donnees={donneesGraph} />
        </div>

        <div style={{ ...panel, flex:'2 1 220px', minWidth:0 }}>
          <h2 style={titrePanel}>Top produits</h2>
          <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 16px' }}>Par chiffre d'affaires</p>
          {!data?.top_produits?.length ? (
            <p style={{ color:'#9ca3af', fontSize:14 }}>Aucune vente aujourd'hui</p>
          ) : (
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {data.top_produits.map((p, i) => {
                const max = Number(data.top_produits[0]?.ca_produit) || 1
                const pct = Math.round((Number(p.ca_produit)/max)*100)
                const BARS = ['#3b82f6','#60a5fa','#22c55e','#f97316','#a855f7']
                return (
                  <li key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom: i<data.top_produits.length-1 ? '1px solid #f9fafb' : 'none' }}>
                    <span style={{ width:18, fontSize:13, fontWeight:700, color:'#9ca3af', textAlign:'center', flexShrink:0 }}>{i+1}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:600, color:'#1f2937', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nom}</p>
                      <div style={{ height:4, background:'#f3f4f6', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:4, width:`${pct}%`, background:BARS[i]||'#3b82f6', borderRadius:2 }} />
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'#1f2937', margin:0 }}>{fmtNum(p.ca_produit)}</p>
                      {isPatron && p.marge > 0 && <p style={{ fontSize:12, color:'#16a34a', margin:0 }}>+{fmtNum(p.marge)}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Stocks critiques */}
      {data?.stocks_critiques?.length > 0 && (
        <div style={{ background:'#FEF2F2', border:'1px solid #fecaca', borderRadius:16, padding:'20px 24px' }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#991b1b', fontFamily:'Georgia, serif', margin:'0 0 12px' }}>
            Stocks critiques
            <span style={{ fontSize:12, background:'#fee2e2', color:'#b91c1c', padding:'2px 10px', borderRadius:20, marginLeft:10, fontWeight:600 }}>{data.stocks_critiques.length}</span>
          </h2>
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8 }}>
            {data.stocks_critiques.map(p => (
              <li key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, color:'#374151', fontWeight:500 }}>{p.nom}</span>
                <span style={{ fontSize:14, fontWeight:700, color:'#dc2626' }}>{fmtNum(p.stock_actuel)} {p.unite} restant(s)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  )
}

export default Dashboard