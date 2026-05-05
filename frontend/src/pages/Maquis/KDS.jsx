import { useState, useEffect, useCallback, useRef } from 'react'
import { useSocket } from '../../context/SocketContext'
import api from '../../utils/api'

// Durée en minutes avant alerte visuelle
const SEUIL_ORANGE = 5
const SEUIL_ROUGE  = 10

const minutesEcoulees = (dateStr) => {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

const couleurUrgence = (minutes) => {
  if (minutes >= SEUIL_ROUGE)  return { bg: '#fef2f2', border: '#fca5a5', titre: '#dc2626' }
  if (minutes >= SEUIL_ORANGE) return { bg: '#fff7ed', border: '#fdba74', titre: '#ea580c' }
  return { bg: '#f0fdf4', border: '#86efac', titre: '#16a34a' }
}

const KDS = () => {
  const { socket } = useSocket()

  const [stations, setStations]           = useState([])
  const [stationActive, setStationActive] = useState(null) // null = toutes
  const [commandes, setCommandes]         = useState([])
  const [chargement, setChargement]       = useState(true)
  const [ticker, setTicker]               = useState(0)   // force re-render chaque minute
  const [pleinEcran, setPleinEcran]       = useState(false)
  const [enAction, setEnAction]           = useState({})  // { ligneId: true } pour désactiver le bouton
  const [tempsInput, setTempsInput]       = useState({})  // { commandeId: '15' }
  const containerRef = useRef(null)

  // ── Tick chaque minute pour mettre à jour les chronomètres ──
  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  // ── Chargement ───────────────────────────────────────────────
  const chargerStations = useCallback(async () => {
    try {
      const res = await api.get('/api/commandes/stations')
      setStations(res.data.data)
    } catch {}
  }, [])

  const chargerCommandes = useCallback(async () => {
    try {
      const url = stationActive
        ? `/api/commandes/kds?station_id=${stationActive}`
        : '/api/commandes/kds'
      const res = await api.get(url)
      setCommandes(res.data.data)
    } catch {}
    finally { setChargement(false) }
  }, [stationActive])

  useEffect(() => { chargerStations() }, [])
  useEffect(() => { setChargement(true); chargerCommandes() }, [stationActive])

  // ── Socket.io ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const onNouvelle = () => chargerCommandes()
    const onMiseAJour = (data) => {
      setCommandes(prev => {
        // Si la commande est encaissée ou annulée, on la retire
        if (['encaissee', 'annulee'].includes(data.statut)) {
          return prev.filter(c => c.id !== data.id)
        }
        // Sinon on met à jour les lignes filtrées par station
        const lignesFiltrees = data.lignes?.filter(l =>
          ['en_attente', 'en_preparation'].includes(l.statut) &&
          (!stationActive || l.station_id === stationActive)
        ) || []
        if (lignesFiltrees.length === 0) return prev.filter(c => c.id !== data.id)
        return prev.map(c => c.id === data.id ? { ...data, lignes: lignesFiltrees } : c)
      })
    }
    const onEncaissee = ({ commande_id }) => {
      setCommandes(prev => prev.filter(c => c.id !== commande_id))
    }

    socket.on('commande:nouvelle',    onNouvelle)
    socket.on('commande:mise_a_jour', onMiseAJour)
    socket.on('kds:mise_a_jour',      onMiseAJour)
    socket.on('commande:encaissee',   onEncaissee)

    return () => {
      socket.off('commande:nouvelle')
      socket.off('commande:mise_a_jour')
      socket.off('kds:mise_a_jour')
      socket.off('commande:encaissee')
    }
  }, [socket, stationActive, chargerCommandes])

  // ── Plein écran ──────────────────────────────────────────────
  const togglePleinEcran = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setPleinEcran(true)
    } else {
      document.exitFullscreen()
      setPleinEcran(false)
    }
  }
  useEffect(() => {
    const handler = () => setPleinEcran(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ── Actions sur les lignes ────────────────────────────────────
  const changerStatutLigne = async (ligneId, statut) => {
    setEnAction(prev => ({ ...prev, [ligneId]: true }))
    try {
      await api.put(`/api/commandes/lignes/${ligneId}/statut`, { statut })
      // La mise à jour arrive via socket, pas besoin de recharger
    } catch {
      chargerCommandes()
    } finally {
      setEnAction(prev => ({ ...prev, [ligneId]: false }))
    }
  }

  const toutMarquerPret = async (commande) => {
    const lignesEnAttente = commande.lignes.filter(l => ['en_attente', 'en_preparation'].includes(l.statut))
    for (const ligne of lignesEnAttente) {
      await changerStatutLigne(ligne.id, 'prete')
    }
  }

  const definirTemps = async (commandeId, minutes) => {
    try {
      await api.put(`/api/commandes/${commandeId}/temps`, { minutes })
    } catch {}
  }

  // ════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════
  return (
    <div ref={containerRef} style={{
      minHeight: pleinEcran ? '100vh' : 'auto',
      backgroundColor: '#111827',
      padding: 16,
      boxSizing: 'border-box'
    }}>

      {/* ── En-tête KDS ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.5px' }}>
            🍳 KDS — Écran cuisine
          </h1>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {commandes.length} commande{commandes.length > 1 ? 's' : ''} en cours
          </p>
        </div>

        {/* Filtre station */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setStationActive(null)}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              backgroundColor: stationActive === null ? 'white' : '#374151',
              color: stationActive === null ? '#111827' : '#9ca3af' }}>
            Toutes
          </button>
          {stations.map(s => (
            <button key={s.id} onClick={() => setStationActive(s.id)}
              style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${stationActive === s.id ? s.couleur : 'transparent'}`, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                backgroundColor: stationActive === s.id ? s.couleur : '#374151',
                color: 'white' }}>
              {s.nom}
            </button>
          ))}

          <button onClick={togglePleinEcran}
            style={{ padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, backgroundColor: '#374151', color: '#9ca3af' }}
            title="Plein écran">
            {pleinEcran ? '⊠' : '⛶'}
          </button>
        </div>
      </div>

      {/* ── Contenu ── */}
      {chargement ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{ width: 48, height: 48, border: '4px solid #374151', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : commandes.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
          <p style={{ fontSize: 64, margin: 0 }}>✅</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', margin: 0 }}>Tout est à jour !</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Aucune commande en attente</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignItems: 'start' }}>
          {commandes.map(commande => {
            const minutes = minutesEcoulees(commande.created_at)
            const urg     = couleurUrgence(minutes)
            const lignesEnAttente    = commande.lignes.filter(l => l.statut === 'en_attente')
            const lignesEnPrep       = commande.lignes.filter(l => l.statut === 'en_preparation')

            return (
              <div key={commande.id} style={{
                backgroundColor: urg.bg,
                border: `2px solid ${urg.border}`,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                {/* En-tête de la carte */}
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${urg.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: urg.titre, fontFamily: 'Georgia, serif' }}>
                        {commande.table ? `Table ${commande.table.numero}` : `#${commande.numero}`}
                      </p>
                      {commande.table?.nom && (
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{commande.table.nom}</p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: urg.titre }}>
                        {minutes < 60 ? `${minutes}mn` : `${Math.floor(minutes / 60)}h${minutes % 60}`}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Cmd #{commande.numero}</p>
                    </div>
                  </div>
                  {/* Temps de préparation estimé */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>⏱️ Prêt dans :</span>
                    {commande.temps_preparation && !tempsInput[commande.id] ? (
                      <button onClick={() => setTempsInput(p => ({ ...p, [commande.id]: String(commande.temps_preparation) }))}
                        style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>
                        ~{commande.temps_preparation} min ✏️
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          type="number" min="1" max="120"
                          placeholder="min"
                          value={tempsInput[commande.id] || ''}
                          onChange={e => setTempsInput(p => ({ ...p, [commande.id]: e.target.value }))}
                          style={{ width: 52, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, textAlign: 'center' }}
                        />
                        <button onClick={async () => {
                          const val = tempsInput[commande.id]
                          if (val && parseInt(val) > 0) {
                            await definirTemps(commande.id, val)
                            setTempsInput(p => { const n = { ...p }; delete n[commande.id]; return n })
                          }
                        }} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', backgroundColor: '#16a34a', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                          ✓
                        </button>
                        {tempsInput[commande.id] && (
                          <button onClick={() => setTempsInput(p => { const n = { ...p }; delete n[commande.id]; return n })}
                            style={{ padding: '3px 6px', borderRadius: 6, border: 'none', backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Liste des articles */}
                <div style={{ padding: '12px 16px' }}>
                  {/* Articles en attente */}
                  {lignesEnAttente.map(ligne => (
                    <div key={ligne.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9ca3af', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                          {parseFloat(ligne.quantite) > 1 && (
                            <span style={{ fontSize: 18, fontWeight: 800, color: urg.titre, marginRight: 6 }}>
                              {parseFloat(ligne.quantite)}×
                            </span>
                          )}
                          {ligne.produit?.nom}
                        </p>
                        {ligne.note && (
                          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#ea580c', fontStyle: 'italic', fontWeight: 600 }}>
                            ⚠️ {ligne.note}
                          </p>
                        )}
                        {ligne.station && (
                          <span style={{ display: 'inline-block', marginTop: 3, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: 'white', backgroundColor: ligne.station.couleur }}>
                            {ligne.station.nom}
                          </span>
                        )}
                      </div>
                      <button onClick={() => changerStatutLigne(ligne.id, 'en_preparation')}
                        disabled={enAction[ligne.id]}
                        style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, backgroundColor: '#fbbf24', color: '#111827', whiteSpace: 'nowrap', opacity: enAction[ligne.id] ? 0.5 : 1 }}>
                        🔥 Démarrer
                      </button>
                    </div>
                  ))}

                  {/* Articles en préparation */}
                  {lignesEnPrep.map(ligne => (
                    <div key={ligne.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f97316', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                          {parseFloat(ligne.quantite) > 1 && (
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#f97316', marginRight: 6 }}>
                              {parseFloat(ligne.quantite)}×
                            </span>
                          )}
                          {ligne.produit?.nom}
                        </p>
                        {ligne.note && (
                          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#ea580c', fontStyle: 'italic', fontWeight: 600 }}>
                            ⚠️ {ligne.note}
                          </p>
                        )}
                      </div>
                      <button onClick={() => changerStatutLigne(ligne.id, 'prete')}
                        disabled={enAction[ligne.id]}
                        style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, backgroundColor: '#16a34a', color: 'white', whiteSpace: 'nowrap', opacity: enAction[ligne.id] ? 0.5 : 1 }}>
                        ✅ Prêt
                      </button>
                    </div>
                  ))}
                </div>

                {/* Bouton global "Tout prêt" */}
                {commande.lignes.length > 1 && (
                  <div style={{ padding: '10px 16px', borderTop: `1px solid ${urg.border}` }}>
                    <button onClick={() => toutMarquerPret(commande)}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, backgroundColor: '#16a34a', color: 'white' }}>
                      ✅ Tout marquer prêt
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default KDS
