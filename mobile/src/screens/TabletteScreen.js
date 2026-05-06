// ============================================================
// TABLETTE SCREEN — Prise de commande mobile (serveur)
// Sélection table → panier avec station par item → envoyer
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Modal, ActivityIndicator, Alert, FlatList
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function TabletteScreen() {
  const { utilisateur } = useAuth()

  const [tables,    setTables]    = useState([])
  const [produits,  setProduits]  = useState([])
  const [stations,  setStations]  = useState([])
  const [caisses,   setCaisses]   = useState([])
  const [panier,    setPanier]    = useState([])
  const [tableActive, setTableActive] = useState(null)
  const [commandeEnCours, setCommandeEnCours] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi,     setEnvoi]     = useState(false)
  const [vue,       setVue]       = useState('tables') // 'tables' | 'commande'
  const [showCaisseModal, setShowCaisseModal] = useState(false)
  const [pendingDirect,   setPendingDirect]   = useState(false)

  const couleur = utilisateur?.maquis?.couleur_primaire || '#FF6B35'

  // ── Chargement initial ─────────────────────────
  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const [rTables, rProduits, rStations] = await Promise.all([
        api.get('/api/commandes/tables'),
        api.get('/api/stock/produits'),
        api.get('/api/commandes/stations')
      ])
      setTables(rTables.data.data || [])
      setProduits((rProduits.data.data || []).filter(p => parseFloat(p.stock_actuel) > 0))
      const toutesStations = rStations.data.data || []
      setStations(toutesStations.filter(s => s.type === 'preparation' || !s.type))
      setCaisses(toutesStations.filter(s => s.type === 'caisse'))
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les données')
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
    // Chercher commande ouverte existante pour cette table
    try {
      const r = await api.get(`/api/commandes?table_id=${table.id}&statut=ouverte`)
      const cmds = r.data.data || []
      if (cmds.length > 0) {
        const cmd = cmds[0]
        setCommandeEnCours(cmd)
        setPanier((cmd.lignes || []).map(l => ({
          produit_id:  l.produit_id,
          nom:         l.produit?.nom || '',
          quantite:    l.quantite,
          prix:        l.prix_unitaire,
          station_id:  l.station_id || null
        })))
      }
    } catch (e) {}
    setVue('commande')
  }

  // ── Panier ─────────────────────────────────────
  const ajouterProduit = (produit) => {
    setPanier(prev => {
      const existe = prev.find(p => p.produit_id === produit.id && !p.station_id)
      if (existe) {
        return prev.map(p =>
          p.produit_id === produit.id && !p.station_id
            ? { ...p, quantite: p.quantite + 1 }
            : p
        )
      }
      return [...prev, {
        produit_id: produit.id,
        nom:        produit.nom,
        quantite:   1,
        prix:       parseFloat(produit.prix_vente),
        station_id: null,
        _key:       Date.now()
      }]
    })
  }

  const modifierQuantite = (key, delta) => {
    setPanier(prev => {
      return prev
        .map(p => p._key === key ? { ...p, quantite: p.quantite + delta } : p)
        .filter(p => p.quantite > 0)
    })
  }

  const modifierStation = (key, stationId) => {
    setPanier(prev =>
      prev.map(p => p._key === key ? { ...p, station_id: stationId ? parseInt(stationId) : null } : p)
    )
  }

  const getTotal = () => panier.reduce((s, p) => s + p.prix * p.quantite, 0)

  // ── Envoi commande ─────────────────────────────
  const envoyerCommande = async (direct = true, caisse_id = null) => {
    if (!panier.length) { Alert.alert('Panier vide', 'Ajoutez des articles'); return }

    // Si direct + plusieurs caisses + pas de caisse choisie → afficher le picker
    if (direct && caisses.length > 1 && caisse_id === null) {
      setPendingDirect(true)
      setShowCaisseModal(true)
      return
    }

    // Si une seule caisse → auto-sélectionner
    const caisseFinale = caisse_id || (direct && caisses.length === 1 ? caisses[0].id : null)

    setEnvoi(true)
    try {
      const lignes = panier.map(p => ({
        produit_id: p.produit_id,
        quantite:   p.quantite,
        station_id: p.station_id || null
      }))

      if (commandeEnCours) {
        await api.post(`/api/commandes/${commandeEnCours.id}/lignes`, { lignes, direct, caisse_id: caisseFinale })
      } else {
        await api.post('/api/commandes', { table_id: tableActive.id, lignes, direct, caisse_id: caisseFinale })
      }

      const msg = direct ? 'Commande envoyée en caisse !' : 'Commande envoyée en cuisine !'
      Alert.alert('✅ Envoyé !', msg, [
        { text: 'OK', onPress: () => { setVue('tables'); charger() } }
      ])
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || "Impossible d'envoyer")
    } finally {
      setEnvoi(false)
      setShowCaisseModal(false)
      setPendingDirect(false)
    }
  }

  // ── Render tables ──────────────────────────────
  const renderTables = () => {
    if (chargement) {
      return (
        <View style={styles.centrer}>
          <ActivityIndicator size="large" color={couleur} />
        </View>
      )
    }

    return (
      <ScrollView contentContainerStyle={styles.tablesGrid}>
        {tables.map(table => {
          const occupee = table.statut === 'occupee' || table._commande_active
          return (
            <TouchableOpacity
              key={table.id}
              style={[styles.tableCard, occupee && { borderColor: couleur, borderWidth: 2 }]}
              onPress={() => selectionnerTable(table)}
            >
              <Text style={styles.tableNum}>{table.numero}</Text>
              <Text style={styles.tablePlaces}>👥 {table.capacite || '?'} places</Text>
              {occupee && <View style={[styles.tableDot, { backgroundColor: couleur }]} />}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  // ── Render commande ────────────────────────────
  const produitsFiltres = produits.filter(p =>
    p.nom.toLowerCase().includes(recherche.toLowerCase())
  )

  const renderCommande = () => (
    <View style={styles.commandeContainer}>
      {/* En-tête table */}
      <View style={[styles.commandeHeader, { backgroundColor: couleur }]}>
        <TouchableOpacity onPress={() => setVue('tables')}>
          <Text style={styles.btnRetour}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.commandeTitle}>Table {tableActive?.numero}</Text>
        <Text style={styles.commandeTotal}>{getTotal().toLocaleString('fr-FR')} XOF</Text>
      </View>

      <View style={styles.commandeBody}>
        {/* Liste produits */}
        <View style={styles.colProduits}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un article..."
            value={recherche}
            onChangeText={setRecherche}
            placeholderTextColor="#9ca3af"
          />
          <FlatList
            data={produitsFiltres}
            keyExtractor={p => String(p.id)}
            renderItem={({ item: p }) => (
              <TouchableOpacity style={styles.produitItem} onPress={() => ajouterProduit(p)}>
                <Text style={styles.produitNom}>{p.nom}</Text>
                <Text style={[styles.produitPrix, { color: couleur }]}>
                  {parseFloat(p.prix_vente).toLocaleString('fr-FR')} XOF
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Panier */}
        <View style={styles.colPanier}>
          <Text style={styles.panierTitle}>Panier ({panier.length})</Text>
          {panier.length === 0 ? (
            <Text style={styles.panierVide}>Appuyez sur un article pour l'ajouter</Text>
          ) : (
            <ScrollView style={styles.panierScroll}>
              {panier.map(item => (
                <View key={item._key || item.produit_id} style={styles.panierItem}>
                  <Text style={styles.panierItemNom}>{item.nom}</Text>
                  <View style={styles.panierItemControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => modifierQuantite(item._key, -1)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{item.quantite}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => modifierQuantite(item._key, 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                    <Text style={[styles.itemTotal, { color: couleur }]}>
                      {(item.prix * item.quantite).toLocaleString('fr-FR')} XOF
                    </Text>
                  </View>
                  {/* Sélecteur station */}
                  {stations.length > 0 && (
                    <View style={styles.stationRow}>
                      <Text style={styles.stationLabel}>📍</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                          style={[
                            styles.stationChip,
                            !item.station_id && { backgroundColor: couleur, borderColor: couleur }
                          ]}
                          onPress={() => modifierStation(item._key, null)}
                        >
                          <Text style={[styles.stationChipText, !item.station_id && { color: 'white' }]}>
                            Toutes
                          </Text>
                        </TouchableOpacity>
                        {stations.map(s => (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              styles.stationChip,
                              item.station_id === s.id && {
                                backgroundColor: s.couleur || couleur,
                                borderColor: s.couleur || couleur
                              }
                            ]}
                            onPress={() => modifierStation(item._key, s.id)}
                          >
                            <Text style={[
                              styles.stationChipText,
                              item.station_id === s.id && { color: 'white' }
                            ]}>
                              {s.nom}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Boutons d'envoi */}
          {(() => {
            const moduleKds = utilisateur?.maquis?.module_kds_actif
            const disabled  = envoi || !panier.length
            return (
              <View style={styles.btnsEnvoi}>
                {/* Bouton principal : Direct en caisse */}
                <TouchableOpacity
                  style={[styles.btnEnvoyer, styles.btnDirect, { flex: moduleKds ? 1 : undefined, minWidth: moduleKds ? undefined : '100%' }, disabled && styles.btnDisabled]}
                  onPress={() => envoyerCommande(true)}
                  disabled={disabled}
                >
                  {envoi ? <ActivityIndicator color="white" /> : <Text style={styles.btnEnvoyerText}>💳 Envoyer en caisse</Text>}
                </TouchableOpacity>
                {/* Bouton optionnel : Cuisine (si KDS actif) */}
                {moduleKds && (
                  <TouchableOpacity
                    style={[styles.btnEnvoyer, { backgroundColor: couleur, flex: 1 }, disabled && styles.btnDisabled]}
                    onPress={() => envoyerCommande(false)}
                    disabled={disabled}
                  >
                    <Text style={styles.btnEnvoyerText}>🍳 Cuisine</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })()}

          {/* Modal sélection caisse */}
          <Modal visible={showCaisseModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCaisse}>
                <Text style={styles.modalCaisseTitle}>Choisir la caisse</Text>
                {caisses.map(c => (
                  <TouchableOpacity key={c.id}
                    style={[styles.caisseOption, { borderColor: c.couleur || '#16a34a' }]}
                    onPress={() => envoyerCommande(true, c.id)}
                  >
                    <View style={[styles.caisseDot, { backgroundColor: c.couleur || '#16a34a' }]} />
                    <Text style={styles.caisseOptionText}>{c.nom}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setShowCaisseModal(false)} style={styles.btnAnnuler}>
                  <Text style={styles.btnAnnulerText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </View>
  )

  // ── Layout principal ───────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: couleur }]}>
        <Text style={styles.headerTitle}>
          {vue === 'tables' ? '🪑 Commandes' : `Table ${tableActive?.numero || ''}`}
        </Text>
        {vue === 'tables' && (
          <TouchableOpacity onPress={charger}>
            <Text style={styles.btnActualiser}>🔄</Text>
          </TouchableOpacity>
        )}
      </View>

      {vue === 'tables' ? renderTables() : renderCommande()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f3f4f6' },
  centrer:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle:    { color: 'white', fontSize: 18, fontWeight: '700' },
  btnActualiser:  { fontSize: 22 },

  // Tables
  tablesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10,
  },
  tableCard: {
    width: '30%', backgroundColor: 'white', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tableNum:    { fontSize: 22, fontWeight: '800', color: '#111827' },
  tablePlaces: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  tableDot:    { width: 8, height: 8, borderRadius: 4, marginTop: 6 },

  // Commande
  commandeContainer: { flex: 1 },
  commandeHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, paddingHorizontal: 16,
  },
  btnRetour:      { color: 'white', fontSize: 14, fontWeight: '600' },
  commandeTitle:  { color: 'white', fontSize: 16, fontWeight: '700' },
  commandeTotal:  { color: 'white', fontSize: 14, fontWeight: '700' },
  commandeBody:   { flex: 1, flexDirection: 'row' },

  colProduits: {
    flex: 1, backgroundColor: 'white', borderRightWidth: 1, borderColor: '#e5e7eb',
    padding: 10,
  },
  searchInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    padding: 10, fontSize: 14, marginBottom: 10, color: '#111827',
  },
  produitItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  produitNom:  { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  produitPrix: { fontSize: 13, fontWeight: '700' },

  colPanier: {
    flex: 1.1, backgroundColor: 'white', padding: 10, paddingBottom: 6,
    display: 'flex', flexDirection: 'column',
  },
  panierTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 10 },
  panierVide:  { color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 30 },
  panierScroll:{ flex: 1 },
  panierItem: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6',
  },
  panierItemNom: { fontWeight: '600', fontSize: 14, color: '#111827', marginBottom: 8 },
  panierItemControls: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '600', color: '#374151' },
  qtyVal:     { fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  itemTotal:  { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },

  stationRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  stationLabel:{ fontSize: 14, color: '#9ca3af' },
  stationChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb', marginRight: 6,
    backgroundColor: 'white',
  },
  stationChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  btnsEnvoi:   { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnEnvoyer:  { padding: 15, borderRadius: 12, alignItems: 'center' },
  btnDirect:   { backgroundColor: '#16a34a' },
  btnEnvoyerText: { color: 'white', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCaisse: {
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  modalCaisseTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  caisseOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 12, borderWidth: 1.5, marginBottom: 10,
    backgroundColor: 'white',
  },
  caisseDot:       { width: 14, height: 14, borderRadius: 7 },
  caisseOptionText:{ fontSize: 15, fontWeight: '600', color: '#111827' },
  btnAnnuler:      { marginTop: 8, alignItems: 'center', padding: 14 },
  btnAnnulerText:  { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
})
