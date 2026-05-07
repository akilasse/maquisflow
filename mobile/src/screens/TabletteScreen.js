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

export default function TabletteScreen({ onRetour }) {
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
  const [vue,       setVue]       = useState('tables') // 'tables' | 'commande' | 'historique'
  const [showCaisseModal, setShowCaisseModal] = useState(false)
  const [pendingDirect,   setPendingDirect]   = useState(false)

  // Historique
  const [historique,        setHistorique]        = useState([])
  const [chargementHisto,   setChargementHisto]   = useState(false)
  const [filtreStatutHisto, setFiltreStatutHisto] = useState('')
  const [filtrePeriodeHisto, setFiltrePeriodeHisto] = useState('aujourd_hui')

  const couleur = utilisateur?.maquis?.couleur_primaire || '#FF6B35'

  // ── Chargement initial ─────────────────────────
  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const rTables  = await api.get('/api/commandes/tables').catch(e => { throw new Error('Tables: ' + (e.response?.status || e.message)) })
      const rProduits = await api.get('/api/stock/produits').catch(e => { throw new Error('Produits: ' + (e.response?.status || e.message)) })
      const rStations = await api.get('/api/commandes/stations').catch(e => { throw new Error('Stations: ' + (e.response?.status || e.message)) })
      setTables(rTables.data.data || [])
      setProduits((rProduits.data.data || []).filter(p => parseFloat(p.stock_actuel) > 0))
      const toutesStations = rStations.data.data || []
      setStations(toutesStations.filter(s => s.type === 'preparation' || !s.type))
      setCaisses(toutesStations.filter(s => s.type === 'caisse'))
    } catch (e) {
      Alert.alert('Erreur chargement', e.message)
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
          station_id:  l.station_id || null,
          _key:        l.id
        })))
      }
    } catch (e) {}
    setVue('commande')
  }

  // ── Historique commandes ──────────────────────
  const chargerHistorique = async (periode = filtrePeriodeHisto, statut = filtreStatutHisto) => {
    setChargementHisto(true)
    try {
      const auj = new Date()
      const fmt = (d) => d.toISOString().slice(0, 10)
      let dateDebut = fmt(auj)
      if (periode === 'semaine') {
        const lun = new Date(auj); lun.setDate(auj.getDate() - auj.getDay() + 1)
        dateDebut = fmt(lun)
      } else if (periode === 'mois') {
        dateDebut = fmt(new Date(auj.getFullYear(), auj.getMonth(), 1))
      }
      const params = new URLSearchParams({
        serveur_id: utilisateur.id,
        historique: 'true',
        date_debut: dateDebut,
        date_fin: fmt(auj)
      })
      if (statut) params.set('statut', statut)
      const r = await api.get(`/api/commandes?${params}`)
      setHistorique(r.data.data || [])
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger l\'historique')
    } finally {
      setChargementHisto(false)
    }
  }

  const changerPeriodeHisto = (periode) => {
    setFiltrePeriodeHisto(periode)
    chargerHistorique(periode, filtreStatutHisto)
  }

  const changerStatutHisto = (statut) => {
    setFiltreStatutHisto(statut)
    chargerHistorique(filtrePeriodeHisto, statut)
  }

  // ── Mode comptoir / sans table ─────────────────
  const selectionnerComptoir = () => {
    setTableActive(null)
    setPanier([])
    setCommandeEnCours(null)
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
        await api.post('/api/commandes', {
          table_id:      tableActive ? tableActive.id : null,
          type_commande: tableActive ? 'sur_place' : 'comptoir',
          lignes, direct, caisse_id: caisseFinale
        })
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

    if (!tables.length) {
      return (
        <View style={styles.centrer}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🪑</Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#374151', textAlign: 'center' }}>
            Aucune table configurée
          </Text>
          <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            Demandez à votre responsable de créer des tables dans le paramétrage
          </Text>
          <TouchableOpacity
            style={{ marginTop: 24, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, backgroundColor: couleur }}
            onPress={charger}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>🔄 Actualiser</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <ScrollView contentContainerStyle={styles.tablesGrid}>
        {/* Bouton comptoir / sans table */}
        <TouchableOpacity
          style={[styles.tableCard, styles.tableComptoir, { borderColor: couleur, borderWidth: 1.5 }]}
          onPress={selectionnerComptoir}
        >
          <Text style={{ fontSize: 26 }}>🛒</Text>
          <Text style={[styles.tableNum, { fontSize: 14, color: couleur }]}>Sans table</Text>
          <Text style={styles.tablePlaces}>Commande directe</Text>
        </TouchableOpacity>

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
        <Text style={styles.commandeTitle}>{tableActive ? `Table ${tableActive.numero}` : '🛒 Sans table'}</Text>
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

  // ── Render historique ──────────────────────────
  const STATUTS_HISTO = [
    { key: '', label: 'Tous' },
    { key: 'ouverte', label: '🆕 Ouverte' },
    { key: 'en_cours', label: '⏳ En cours' },
    { key: 'prete', label: '✅ Prête' },
    { key: 'servie', label: '🍽️ Servie' },
    { key: 'encaissee', label: '💵 Encaissée' },
    { key: 'annulee', label: '❌ Annulée' },
  ]
  const PERIODES_HISTO = [
    { key: 'aujourd_hui', label: "Auj." },
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois', label: 'Mois' },
  ]

  const renderHistorique = () => (
    <View style={{ flex: 1 }}>
      {/* Filtres période */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 10, maxHeight: 48 }} contentContainerStyle={{ gap: 6 }}>
        {PERIODES_HISTO.map(p => (
          <TouchableOpacity key={p.key} onPress={() => changerPeriodeHisto(p.key)}
            style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: filtrePeriodeHisto === p.key ? couleur : '#e5e7eb' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: filtrePeriodeHisto === p.key ? 'white' : '#374151' }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Filtres statut */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 10, maxHeight: 42 }} contentContainerStyle={{ gap: 6 }}>
        {STATUTS_HISTO.map(s => (
          <TouchableOpacity key={s.key} onPress={() => changerStatutHisto(s.key)}
            style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: filtreStatutHisto === s.key ? '#374151' : '#f3f4f6' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: filtreStatutHisto === s.key ? 'white' : '#6b7280' }}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {chargementHisto ? (
        <View style={styles.centrer}><ActivityIndicator size="large" color={couleur} /></View>
      ) : historique.length === 0 ? (
        <View style={styles.centrer}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
          <Text style={{ color: '#9ca3af', fontSize: 15 }}>Aucune commande sur cette période</Text>
        </View>
      ) : (
        <FlatList
          data={historique}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          renderItem={({ item: c }) => {
            const total = (c.lignes || []).reduce((s, l) => s + parseFloat(l.prix_unitaire) * parseFloat(l.quantite), 0)
            const statutColors = { ouverte: '#fef3c7', en_cours: '#dbeafe', prete: '#d1fae5', servie: '#e0e7ff', encaissee: '#f0fdf4', annulee: '#fee2e2' }
            const statutTextColors = { ouverte: '#92400e', en_cours: '#1e40af', prete: '#065f46', servie: '#3730a3', encaissee: '#166534', annulee: '#991b1b' }
            return (
              <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, elevation: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 15 }}>Commande #{c.numero}</Text>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: statutColors[c.statut] || '#f3f4f6' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: statutTextColors[c.statut] || '#374151' }}>{c.statut}</Text>
                  </View>
                </View>
                {c.table && <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Table {c.table.numero}</Text>}
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{new Date(c.created_at).toLocaleString('fr-FR')}</Text>
                {(c.lignes || []).map(l => (
                  <Text key={l.id} style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
                    {parseFloat(l.quantite)}× {l.produit?.nom} — {parseFloat(l.prix_unitaire).toLocaleString('fr-FR')} XOF
                  </Text>
                ))}
                <Text style={{ fontSize: 15, fontWeight: '700', color: couleur, marginTop: 8, textAlign: 'right' }}>
                  {total.toLocaleString('fr-FR')} XOF
                </Text>
                {c.annulation_motif && (
                  <Text style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>Annulée : {c.annulation_motif}</Text>
                )}
              </View>
            )
          }}
        />
      )}
    </View>
  )

  // ── Layout principal ───────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: couleur }]}>
        {onRetour && vue === 'tables' ? (
          <TouchableOpacity onPress={onRetour} style={styles.btnHeaderLateral}>
            <Text style={styles.btnHeaderLateralText}>
              {utilisateur?.role === 'serveur' ? '🚪 Sortir' : '← Retour'}
            </Text>
          </TouchableOpacity>
        ) : vue !== 'tables' ? (
          <TouchableOpacity onPress={() => setVue('tables')} style={styles.btnHeaderLateral}>
            <Text style={styles.btnHeaderLateralText}>← Retour</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}
        <Text style={styles.headerTitle}>
          {vue === 'tables' ? '🪑 Commandes' : vue === 'historique' ? '📋 Historique' : (tableActive ? `Table ${tableActive.numero}` : '🛒 Sans table')}
        </Text>
        {vue === 'tables' ? (
          <TouchableOpacity onPress={charger} style={styles.btnHeaderLateral}>
            <Text style={styles.btnActualiser}>🔄</Text>
          </TouchableOpacity>
        ) : vue === 'historique' ? (
          <TouchableOpacity onPress={() => chargerHistorique()} style={styles.btnHeaderLateral}>
            <Text style={styles.btnActualiser}>🔄</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      {vue === 'tables' ? renderTables() : vue === 'historique' ? renderHistorique() : renderCommande()}

      {/* Barre de navigation basse (tables uniquement) */}
      {vue === 'tables' && (
        <View style={styles.bottomNav}>
          <TouchableOpacity style={[styles.bottomNavBtn, { borderTopColor: couleur, borderTopWidth: 2 }]}>
            <Text style={styles.bottomNavIcon}>🪑</Text>
            <Text style={[styles.bottomNavLabel, { color: couleur }]}>Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomNavBtn}
            onPress={() => { setVue('historique'); chargerHistorique() }}>
            <Text style={styles.bottomNavIcon}>📋</Text>
            <Text style={styles.bottomNavLabel}>Historique</Text>
          </TouchableOpacity>
        </View>
      )}
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
  btnHeaderLateral: { minWidth: 72, alignItems: 'flex-start' },
  btnHeaderLateralText: { color: 'white', fontSize: 13, fontWeight: '600' },

  // Tables
  tablesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10,
  },
  tableCard: {
    width: '30%', backgroundColor: 'white', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tableComptoir: { borderStyle: 'dashed' },
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

  bottomNav: {
    flexDirection: 'row', backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    paddingBottom: 4,
  },
  bottomNavBtn:   { flex: 1, alignItems: 'center', paddingVertical: 8 },
  bottomNavIcon:  { fontSize: 22 },
  bottomNavLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', marginTop: 2 },

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
