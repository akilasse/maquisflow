import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Modal, ActivityIndicator, Alert, FlatList
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const STATUTS_BADGE = {
  ouverte:    { bg: '#fef3c7', txt: '#92400e', label: 'Ouverte' },
  en_attente: { bg: '#fff7ed', txt: '#c2410c', label: 'En attente' },
  en_cours:   { bg: '#dbeafe', txt: '#1e40af', label: 'En cours' },
  prete:      { bg: '#d1fae5', txt: '#065f46', label: 'Prête' },
  servie:     { bg: '#e0e7ff', txt: '#3730a3', label: 'Servie' },
  encaissee:  { bg: '#f0fdf4', txt: '#166534', label: 'Encaissée' },
  annulee:    { bg: '#fee2e2', txt: '#991b1b', label: 'Annulée' },
}

export default function TabletteScreen({ onRetour }) {
  const { utilisateur } = useAuth()
  const couleur = utilisateur?.maquis?.couleur_primaire || '#FF6B35'

  const [tables,           setTables]           = useState([])
  const [produits,         setProduits]         = useState([])
  const [stations,         setStations]         = useState([])
  const [caisses,          setCaisses]          = useState([])
  const [panier,           setPanier]           = useState([])
  const [tableActive,      setTableActive]      = useState(null)
  const [commandeEnCours,  setCommandeEnCours]  = useState(null)
  const [recherche,        setRecherche]        = useState('')
  const [chargement,       setChargement]       = useState(true)
  const [envoi,            setEnvoi]            = useState(false)
  const [vue,              setVue]              = useState('tables') // 'tables' | 'commande' | 'historique'
  const [showCaisseModal,  setShowCaisseModal]  = useState(false)

  // Historique
  const [historique,         setHistorique]         = useState([])
  const [chargementHisto,    setChargementHisto]    = useState(false)
  const [filtreStatutHisto,  setFiltreStatutHisto]  = useState('')
  const [filtrePeriodeHisto, setFiltrePeriodeHisto] = useState('aujourd_hui')

  // ── Chargement ─────────────────────────────────
  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const [rT, rP, rS] = await Promise.all([
        api.get('/api/commandes/tables'),
        api.get('/api/stock/produits'),
        api.get('/api/commandes/stations'),
      ])
      setTables(rT.data.data || [])
      setProduits((rP.data.data || []).filter(p => parseFloat(p.stock_actuel) > 0))
      const st = rS.data.data || []
      setStations(st.filter(s => s.type === 'preparation' || !s.type))
      setCaisses(st.filter(s => s.type === 'caisse'))
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || e.message)
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => { charger() }, [charger])

  // ── Sélection table ────────────────────────────
  const selectionnerTable = async (table) => {
    setTableActive(table)
    setPanier([])
    setCommandeEnCours(null)
    try {
      const r = await api.get(`/api/commandes?table_id=${table.id}&statut=ouverte`)
      const cmd = (r.data.data || [])[0]
      if (cmd) {
        setCommandeEnCours(cmd)
        setPanier((cmd.lignes || []).map(l => ({
          produit_id: l.produit_id, nom: l.produit?.nom || '',
          quantite: l.quantite, prix: l.prix_unitaire,
          station_id: l.station_id || null, _key: l.id
        })))
      }
    } catch {}
    setVue('commande')
  }

  const selectionnerSansTable = () => {
    setTableActive(null); setPanier([]); setCommandeEnCours(null); setVue('commande')
  }

  // ── Panier ─────────────────────────────────────
  const ajouterProduit = (p) => {
    setPanier(prev => {
      const existe = prev.find(x => x.produit_id === p.id && !x.station_id)
      if (existe) return prev.map(x => x.produit_id === p.id && !x.station_id ? { ...x, quantite: x.quantite + 1 } : x)
      return [...prev, { produit_id: p.id, nom: p.nom, quantite: 1, prix: parseFloat(p.prix_vente), station_id: null, _key: Date.now() }]
    })
  }

  const modifierQty = (key, delta) =>
    setPanier(prev => prev.map(p => p._key === key ? { ...p, quantite: p.quantite + delta } : p).filter(p => p.quantite > 0))

  const modifierStation = (key, stationId) =>
    setPanier(prev => prev.map(p => p._key === key ? { ...p, station_id: stationId ? parseInt(stationId) : null } : p))

  const getTotal = () => panier.reduce((s, p) => s + p.prix * p.quantite, 0)

  // ── Envoi ──────────────────────────────────────
  const envoyerCommande = async (direct = true, caisse_id = null) => {
    if (!panier.length) { Alert.alert('Panier vide', 'Ajoutez des articles'); return }
    if (direct && caisses.length > 1 && caisse_id === null) { setShowCaisseModal(true); return }
    const caisseFinale = caisse_id || (direct && caisses.length === 1 ? caisses[0].id : null)
    setEnvoi(true)
    try {
      const lignes = panier.map(p => ({ produit_id: p.produit_id, quantite: p.quantite, station_id: p.station_id || null }))
      if (commandeEnCours) {
        await api.post(`/api/commandes/${commandeEnCours.id}/lignes`, { lignes, direct, caisse_id: caisseFinale })
      } else {
        await api.post('/api/commandes', {
          table_id: tableActive?.id || null,
          type_commande: tableActive ? 'sur_place' : 'comptoir',
          lignes, direct, caisse_id: caisseFinale
        })
      }
      Alert.alert('✅ Envoyé !', direct ? 'Commande envoyée en caisse !' : 'Commande envoyée en cuisine !', [
        { text: 'OK', onPress: () => { setVue('tables'); charger() } }
      ])
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || "Impossible d'envoyer")
    } finally {
      setEnvoi(false); setShowCaisseModal(false)
    }
  }

  // ── Historique ─────────────────────────────────
  const chargerHistorique = async (periode = filtrePeriodeHisto, statut = filtreStatutHisto) => {
    setChargementHisto(true)
    try {
      const auj = new Date(), fmt = d => d.toISOString().slice(0, 10)
      let debut = fmt(auj)
      if (periode === 'semaine') { const l = new Date(auj); l.setDate(auj.getDate() - auj.getDay() + 1); debut = fmt(l) }
      else if (periode === 'mois') debut = fmt(new Date(auj.getFullYear(), auj.getMonth(), 1))
      const p = new URLSearchParams({ serveur_id: utilisateur.id, historique: 'true', date_debut: debut, date_fin: fmt(auj) })
      if (statut) p.set('statut', statut)
      const r = await api.get(`/api/commandes?${p}`)
      setHistorique(r.data.data || [])
    } catch { Alert.alert('Erreur', "Impossible de charger l'historique") }
    finally { setChargementHisto(false) }
  }

  // ── RENDER TABLES ──────────────────────────────
  const renderTables = () => {
    if (chargement) return <View style={s.centrer}><ActivityIndicator size="large" color={couleur} /></View>

    return (
      <ScrollView contentContainerStyle={s.tablesScroll}>
        {/* Sans table */}
        <TouchableOpacity style={[s.btnSansTable, { borderColor: couleur }]} onPress={selectionnerSansTable}>
          <Text style={{ fontSize: 28 }}>🛒</Text>
          <View style={{ marginLeft: 12 }}>
            <Text style={[s.btnSansTableTitre, { color: couleur }]}>Sans table</Text>
            <Text style={s.btnSansTableSous}>Commande directe · comptoir</Text>
          </View>
          <Text style={[s.chevron, { color: couleur }]}>›</Text>
        </TouchableOpacity>

        {/* Grille tables */}
        {tables.length > 0 && (
          <>
            <Text style={s.sectionTitre}>Tables</Text>
            <View style={s.tablesGrid}>
              {tables.map(table => {
                const occupee = table.statut === 'occupee'
                return (
                  <TouchableOpacity key={table.id}
                    style={[s.tableCard, occupee && { borderColor: couleur, borderWidth: 2, backgroundColor: '#fff7ed' }]}
                    onPress={() => selectionnerTable(table)}>
                    <View style={[s.tableBadge, { backgroundColor: occupee ? couleur : '#f3f4f6' }]}>
                      <Text style={[s.tableBadgeNum, { color: occupee ? 'white' : '#374151' }]}>{table.numero}</Text>
                    </View>
                    {table.nom && <Text style={s.tableNom} numberOfLines={1}>{table.nom}</Text>}
                    <Text style={s.tablePlaces}>{table.capacite ? `👥 ${table.capacite}` : ''}</Text>
                    {occupee && <Text style={[s.tableStatut, { color: couleur }]}>● Occupée</Text>}
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        {tables.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 14, color: '#9ca3af' }}>Aucune table — utilisez "Sans table"</Text>
          </View>
        )}
      </ScrollView>
    )
  }

  // ── RENDER COMMANDE ────────────────────────────
  const produitsFiltres = produits.filter(p => p.nom.toLowerCase().includes(recherche.toLowerCase()))
  const moduleKds = utilisateur?.maquis?.module_kds_actif
  const disabled = envoi || !panier.length

  const renderCommande = () => (
    <View style={s.commandeWrap}>
      <View style={s.commandeBody}>
        {/* Colonne produits */}
        <View style={s.colProduits}>
          <TextInput style={s.searchInput} placeholder="Rechercher…" value={recherche}
            onChangeText={setRecherche} placeholderTextColor="#9ca3af" />
          <FlatList data={produitsFiltres} keyExtractor={p => String(p.id)}
            renderItem={({ item: p }) => (
              <TouchableOpacity style={s.produitItem} onPress={() => ajouterProduit(p)}>
                <Text style={s.produitNom} numberOfLines={2}>{p.nom}</Text>
                <Text style={[s.produitPrix, { color: couleur }]}>{parseFloat(p.prix_vente).toLocaleString('fr-FR')}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Colonne panier */}
        <View style={s.colPanier}>
          <View style={s.panierHeader}>
            <Text style={s.panierTitre}>Panier · {panier.length} article{panier.length > 1 ? 's' : ''}</Text>
            <Text style={[s.panierTotal, { color: couleur }]}>{getTotal().toLocaleString('fr-FR')} XOF</Text>
          </View>

          {panier.length === 0 ? (
            <View style={s.centrer}><Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Appuyez sur un article{'\n'}pour l'ajouter</Text></View>
          ) : (
            <ScrollView style={{ flex: 1 }}>
              {panier.map(item => (
                <View key={item._key || item.produit_id} style={s.panierItem}>
                  <View style={s.panierItemTop}>
                    <Text style={s.panierItemNom} numberOfLines={1}>{item.nom}</Text>
                    <Text style={[s.panierItemSub, { color: couleur }]}>{(item.prix * item.quantite).toLocaleString('fr-FR')} XOF</Text>
                  </View>
                  <View style={s.qtyRow}>
                    <TouchableOpacity style={s.qtyBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => modifierQty(item._key, -1)}>
                      <Text style={s.qtyBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyVal}>{item.quantite}</Text>
                    <TouchableOpacity style={s.qtyBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => modifierQty(item._key, 1)}>
                      <Text style={s.qtyBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {stations.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {[{ id: null, nom: 'Toutes', couleur: null }, ...stations].map(st => (
                        <TouchableOpacity key={st.id ?? 'all'}
                          style={[s.stationChip, (item.station_id === st.id) && { backgroundColor: st.couleur || couleur, borderColor: st.couleur || couleur }]}
                          onPress={() => modifierStation(item._key, st.id)}>
                          <Text style={[s.stationChipTxt, (item.station_id === st.id) && { color: 'white' }]}>{st.nom}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Boutons envoi */}
          <View style={s.btnsEnvoi}>
            <TouchableOpacity style={[s.btnEnvoi, s.btnCaisse, disabled && s.btnDisabled]}
              onPress={() => envoyerCommande(true)} disabled={disabled}>
              {envoi ? <ActivityIndicator color="white" size="small" />
                : <Text style={s.btnEnvoiTxt}>💳 Envoyer en caisse</Text>}
            </TouchableOpacity>
            {moduleKds && (
              <TouchableOpacity style={[s.btnEnvoi, { backgroundColor: couleur }, disabled && s.btnDisabled]}
                onPress={() => envoyerCommande(false)} disabled={disabled}>
                <Text style={s.btnEnvoiTxt}>🍳 Cuisine</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Modal caisses */}
      <Modal visible={showCaisseModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitre}>Choisir la caisse</Text>
            {caisses.map(c => (
              <TouchableOpacity key={c.id} style={[s.caisseOption, { borderColor: c.couleur || '#16a34a' }]}
                onPress={() => envoyerCommande(true, c.id)}>
                <View style={[s.caisseDot, { backgroundColor: c.couleur || '#16a34a' }]} />
                <Text style={s.caisseNom}>{c.nom}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowCaisseModal(false)} style={{ alignItems: 'center', padding: 14 }}>
              <Text style={{ color: '#9ca3af', fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )

  // ── RENDER HISTORIQUE ──────────────────────────
  const PERIODES = [{ key: 'aujourd_hui', label: "Aujourd'hui" }, { key: 'semaine', label: 'Semaine' }, { key: 'mois', label: 'Mois' }]
  const STATUTS  = [{ key: '', label: 'Tous' }, { key: 'ouverte', label: 'Ouverte' }, { key: 'en_cours', label: 'En cours' },
    { key: 'prete', label: 'Prête' }, { key: 'servie', label: 'Servie' }, { key: 'encaissee', label: 'Encaissée' }, { key: 'annulee', label: 'Annulée' }]

  const renderHistorique = () => (
    <View style={{ flex: 1 }}>
      <View style={s.histoFiltres}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 8 }}>
          {PERIODES.map(p => (
            <TouchableOpacity key={p.key} onPress={() => { setFiltrePeriodeHisto(p.key); chargerHistorique(p.key, filtreStatutHisto) }}
              style={[s.chip, filtrePeriodeHisto === p.key && { backgroundColor: couleur }]}>
              <Text style={[s.chipTxt, filtrePeriodeHisto === p.key && { color: 'white' }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingBottom: 8 }}>
          {STATUTS.map(st => (
            <TouchableOpacity key={st.key} onPress={() => { setFiltreStatutHisto(st.key); chargerHistorique(filtrePeriodeHisto, st.key) }}
              style={[s.chip, { backgroundColor: filtreStatutHisto === st.key ? '#374151' : '#f3f4f6' }]}>
              <Text style={[s.chipTxt, filtreStatutHisto === st.key && { color: 'white' }]}>{st.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {chargementHisto ? <View style={s.centrer}><ActivityIndicator size="large" color={couleur} /></View>
        : historique.length === 0 ? (
          <View style={s.centrer}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
            <Text style={{ color: '#9ca3af' }}>Aucune commande sur cette période</Text>
          </View>
        ) : (
          <FlatList data={historique} keyExtractor={c => String(c.id)}
            contentContainerStyle={{ padding: 12, gap: 10 }}
            renderItem={({ item: c }) => {
              const total = (c.lignes || []).reduce((s, l) => s + parseFloat(l.prix_unitaire) * parseFloat(l.quantite), 0)
              const badge = STATUTS_BADGE[c.statut] || { bg: '#f3f4f6', txt: '#374151', label: c.statut }
              return (
                <View style={s.histoCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.histoNum}>#{c.numero} {c.table ? `· Table ${c.table.numero}` : '· Sans table'}</Text>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: badge.bg }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: badge.txt }}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={s.histoDate}>{new Date(c.created_at).toLocaleString('fr-FR')}</Text>
                  {(c.lignes || []).map(l => (
                    <Text key={l.id} style={s.histoLigne}>{parseFloat(l.quantite)}× {l.produit?.nom}</Text>
                  ))}
                  <Text style={[s.histoTotal, { color: couleur }]}>{total.toLocaleString('fr-FR')} XOF</Text>
                  {c.annulation_motif && <Text style={s.histoAnnul}>Motif : {c.annulation_motif}</Text>}
                </View>
              )
            }}
          />
        )}
    </View>
  )

  // ── LAYOUT ─────────────────────────────────────
  const titreHeader = vue === 'historique' ? '📋 Historique' : vue === 'commande' ? (tableActive ? `Table ${tableActive.numero}` : '🛒 Sans table') : '🪑 Tables'

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header unique */}
      <View style={[s.header, { backgroundColor: couleur }]}>
        <TouchableOpacity style={s.headerBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} onPress={vue !== 'tables' ? () => setVue('tables') : onRetour}>
          <Text style={s.headerBtnTxt}>{vue !== 'tables' ? '← Retour' : utilisateur?.role === 'serveur' ? '🚪 Sortir' : '← Menu'}</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.headerTitre}>{titreHeader}</Text>
          {vue === 'commande' && panier.length > 0 && (
            <Text style={s.headerSous}>{getTotal().toLocaleString('fr-FR')} XOF · {panier.length} article{panier.length > 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity style={s.headerBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} onPress={vue === 'historique' ? () => chargerHistorique() : vue === 'tables' ? charger : undefined}>
          <Text style={s.headerBtnTxt}>{vue !== 'commande' ? '🔄' : ''}</Text>
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      {vue === 'tables' ? renderTables() : vue === 'historique' ? renderHistorique() : renderCommande()}

      {/* Bottom nav */}
      {vue === 'tables' && (
        <View style={s.bottomNav}>
          <TouchableOpacity style={[s.bottomBtn, { borderTopWidth: 2, borderTopColor: couleur }]}>
            <Text style={s.bottomIcon}>🪑</Text>
            <Text style={[s.bottomLabel, { color: couleur }]}>Tables</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bottomBtn} onPress={() => { setVue('historique'); chargerHistorique() }}>
            <Text style={s.bottomIcon}>📋</Text>
            <Text style={s.bottomLabel}>Historique</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centrer:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  // Header
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitre:  { color: 'white', fontSize: 17, fontWeight: '700' },
  headerSous:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 },
  headerBtn:    { minWidth: 64, alignItems: 'flex-start' },
  headerBtnTxt: { color: 'white', fontSize: 13, fontWeight: '600' },

  // Tables
  tablesScroll:    { padding: 14, paddingBottom: 80 },
  btnSansTable:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, padding: 16, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 20, elevation: 1 },
  btnSansTableTitre: { fontSize: 16, fontWeight: '800' },
  btnSansTableSous:  { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  chevron:         { fontSize: 26, fontWeight: '300', marginLeft: 'auto' },
  sectionTitre:    { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tablesGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tableCard:       { width: '30%', backgroundColor: 'white', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', elevation: 1 },
  tableBadge:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tableBadgeNum:   { fontSize: 18, fontWeight: '800' },
  tableNom:        { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  tablePlaces:     { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  tableStatut:     { fontSize: 10, fontWeight: '700', marginTop: 4 },

  // Commande
  commandeWrap: { flex: 1 },
  commandeBody: { flex: 1, flexDirection: 'row' },
  colProduits:  { flex: 1, backgroundColor: 'white', borderRightWidth: 1, borderColor: '#f3f4f6', padding: 10 },
  searchInput:  { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 14, marginBottom: 10, color: '#111827' },
  produitItem:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#f3f4f6', backgroundColor: '#fafafa' },
  produitNom:   { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, marginRight: 6 },
  produitPrix:  { fontSize: 12, fontWeight: '700' },

  colPanier:    { flex: 1.1, backgroundColor: 'white', padding: 10, flexDirection: 'column' },
  panierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  panierTitre:  { fontSize: 13, fontWeight: '700', color: '#374151' },
  panierTotal:  { fontSize: 14, fontWeight: '800' },
  panierItem:   { backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, marginBottom: 8 },
  panierItemTop:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  panierItemNom:{ fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, marginRight: 4 },
  panierItemSub:{ fontSize: 12, fontWeight: '700' },
  qtyRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn:       { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt:    { fontSize: 18, fontWeight: '600', color: '#374151', lineHeight: 22 },
  qtyVal:       { fontSize: 15, fontWeight: '700', minWidth: 22, textAlign: 'center' },
  stationChip:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 6, backgroundColor: 'white' },
  stationChipTxt: { fontSize: 11, fontWeight: '600', color: '#374151' },

  btnsEnvoi:  { flexDirection: 'row', gap: 6, marginTop: 8 },
  btnEnvoi:   { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCaisse:  { backgroundColor: '#16a34a' },
  btnEnvoiTxt:{ color: 'white', fontSize: 13, fontWeight: '700' },
  btnDisabled:{ opacity: 0.45 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitre:   { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  caisseOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1.5, marginBottom: 10 },
  caisseDot:    { width: 14, height: 14, borderRadius: 7 },
  caisseNom:    { fontSize: 15, fontWeight: '600', color: '#111827' },

  // Historique
  histoFiltres: { backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  chip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e5e7eb' },
  chipTxt:      { fontSize: 13, fontWeight: '600', color: '#374151' },
  histoCard:    { backgroundColor: 'white', borderRadius: 12, padding: 14, elevation: 1 },
  histoNum:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  histoDate:    { fontSize: 12, color: '#9ca3af', marginTop: 2, marginBottom: 6 },
  histoLigne:   { fontSize: 13, color: '#374151', marginBottom: 2 },
  histoTotal:   { fontSize: 15, fontWeight: '800', marginTop: 8, textAlign: 'right' },
  histoAnnul:   { fontSize: 12, color: '#991b1b', marginTop: 4, fontStyle: 'italic' },

  // Bottom nav
  bottomNav:   { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderColor: '#e5e7eb', paddingBottom: 4 },
  bottomBtn:   { flex: 1, alignItems: 'center', paddingVertical: 8 },
  bottomIcon:  { fontSize: 22 },
  bottomLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', marginTop: 1 },
})
