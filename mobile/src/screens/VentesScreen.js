// ============================================================
// VENTES SCREEN - Liste des ventes avec onglets
// Aujourd'hui / Ce mois / Période personnalisée
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, TextInput
} from 'react-native'
import api from '../utils/api'

const fmtNum = (n) => Number(n || 0).toLocaleString('fr-FR')

const MODES_LABELS = {
  especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money',
  mtn_money: 'MTN MoMo', credit: 'Crédit', autre: 'Autre'
}

const iconeMode = (mode) => {
  const icones = { especes: '💵', wave: '🐧', orange_money: '📱', mtn_money: '📱', credit: '📋', autre: '💳' }
  return icones[mode] || '💳'
}

export default function VentesScreen() {
  const [ventes, setVentes]                     = useState([])
  const [chargement, setChargement]             = useState(true)
  const [rafraichissement, setRafraichissement] = useState(false)
  const [onglet, setOnglet]                     = useState('aujourd_hui')
  const [dateDebut, setDateDebut]               = useState('')
  const [dateFin, setDateFin]                   = useState('')
  const [venteOuverte, setVenteOuverte]         = useState(null)

  const chargerVentes = useCallback(async (ongletActif, debut, fin) => {
    try {
      const aujourd_hui = new Date().toISOString().split('T')[0]
      let params = ''

      if (ongletActif === 'aujourd_hui') {
        params = `?date_debut=${aujourd_hui}&date_fin=${aujourd_hui}`
      } else if (ongletActif === 'ce_mois') {
        const debut_mois = new Date()
        debut_mois.setDate(1)
        params = `?date_debut=${debut_mois.toISOString().split('T')[0]}&date_fin=${aujourd_hui}`
      } else if (ongletActif === 'periode' && debut && fin) {
        params = `?date_debut=${debut}&date_fin=${fin}`
      } else {
        setVentes([])
        setChargement(false)
        setRafraichissement(false)
        return
      }

      const response = await api.get(`/api/ventes${params}`)
      setVentes(response.data.data || [])
    } catch (error) {
      console.error('Erreur ventes:', error)
      setVentes([])
    } finally {
      setChargement(false)
      setRafraichissement(false)
    }
  }, [])

  useEffect(() => {
    setChargement(true)
    chargerVentes(onglet, dateDebut, dateFin)
    const interval = setInterval(() => chargerVentes(onglet, dateDebut, dateFin), 30000)
    return () => clearInterval(interval)
  }, [onglet])

  const onRefresh = useCallback(() => {
    setRafraichissement(true)
    chargerVentes(onglet, dateDebut, dateFin)
  }, [onglet, dateDebut, dateFin])

  const rechercherPeriode = () => {
    if (dateDebut && dateFin) {
      setChargement(true)
      chargerVentes('periode', dateDebut, dateFin)
    }
  }

  const totalVentes = ventes.filter(v => v.statut !== 'annulee').reduce((t, v) => t + parseFloat(v.total_net), 0)

  const titreHeader = () => {
    if (onglet === 'aujourd_hui') return "Ventes d'aujourd'hui"
    if (onglet === 'ce_mois') return 'Ventes du mois'
    if (dateDebut && dateFin) return `${dateDebut} → ${dateFin}`
    return 'Ventes par période'
  }

  if (chargement) return (
    <View style={styles.centrer}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  )

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={onRefresh} colors={['#FF6B35']} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitre}>{titreHeader()}</Text>
        <Text style={styles.headerTotal}>{fmtNum(totalVentes)} XOF</Text>
        <Text style={styles.headerSous}>{ventes.filter(v => v.statut !== 'annulee').length} vente(s)</Text>
      </View>

      <View style={styles.content}>

        {/* Onglets */}
        <View style={styles.onglets}>
          {[
            { key: 'aujourd_hui', label: "Aujourd'hui" },
            { key: 'ce_mois',     label: 'Ce mois' },
            { key: 'periode',     label: 'Période' },
          ].map(o => (
            <TouchableOpacity key={o.key} onPress={() => setOnglet(o.key)}
              style={[styles.ongletBtn, onglet === o.key && styles.ongletActif]}>
              <Text style={[styles.ongletTexte, onglet === o.key && styles.ongletTexteActif]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Saisie dates si période */}
        {onglet === 'periode' && (
          <View style={styles.periodeForm}>
            <TextInput
              style={styles.dateInput}
              placeholder="Date début (AAAA-MM-JJ)"
              value={dateDebut}
              onChangeText={setDateDebut}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={styles.dateInput}
              placeholder="Date fin (AAAA-MM-JJ)"
              value={dateFin}
              onChangeText={setDateFin}
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity style={styles.rechercherBtn} onPress={rechercherPeriode}>
              <Text style={styles.rechercherTexte}>🔍 Rechercher</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Liste ventes */}
        {ventes.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videEmoji}>🧾</Text>
            <Text style={styles.videTexte}>
              {onglet === 'periode' && (!dateDebut || !dateFin)
                ? 'Saisissez une plage de dates'
                : 'Aucune vente sur cette période'}
            </Text>
          </View>
        ) : (
          ventes.map(vente => (
            <TouchableOpacity
              key={vente.id}
              style={[styles.card, vente.statut === 'annulee' && styles.cardAnnulee]}
              onPress={() => setVenteOuverte(venteOuverte === vente.id ? null : vente.id)}
            >
              {/* En-tête vente */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.venteId}>Vente #{vente.id}</Text>
                    {vente.statut === 'annulee' && (
                      <View style={styles.badgeAnnulee}>
                        <Text style={styles.badgeAnnuleeTexte}>Annulée</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.venteCaissier}>Par {vente.caissier?.nom}</Text>
                  <Text style={styles.venteHeure}>
                    🕐 {new Date(vente.date_vente).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {new Date(vente.date_vente).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.venteTotal, vente.statut === 'annulee' && { color: '#9ca3af', textDecorationLine: 'line-through' }]}>
                    {fmtNum(vente.total_net)} XOF
                  </Text>
                  <Text style={styles.venteMode}>
                    {iconeMode(vente.mode_paiement)} {MODES_LABELS[vente.mode_paiement] || vente.mode_paiement}
                  </Text>
                  <Text style={styles.voirDetail}>{venteOuverte === vente.id ? '▲ Masquer' : '▼ Détails'}</Text>
                </View>
              </View>

              {/* Détails produits — visible si ouvert */}
              {venteOuverte === vente.id && (
                <View style={styles.lignes}>
                  {vente.lignes?.map(ligne => (
                    <View key={ligne.id} style={styles.ligne}>
                      <Text style={styles.ligneNom}>{ligne.produit?.nom}</Text>
                      <Text style={styles.ligneDetail}>{ligne.quantite} × {fmtNum(ligne.prix_unitaire)} XOF</Text>
                      <Text style={styles.ligneTotal}>{fmtNum(ligne.total_ligne)} XOF</Text>
                    </View>
                  ))}
                  {vente.remise_globale > 0 && (
                    <View style={[styles.ligne, { marginTop: 6 }]}>
                      <Text style={[styles.ligneNom, { color: '#16a34a' }]}>Remise</Text>
                      <Text style={[styles.ligneTotal, { color: '#16a34a' }]}>-{vente.remise_globale}%</Text>
                    </View>
                  )}
                  {vente.note ? (
                    <Text style={styles.venteNote}>📝 {vente.note}</Text>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centrer:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:       { backgroundColor: '#FF6B35', padding: 20, paddingTop: 50, alignItems: 'center' },
  headerTitre:  { color: 'white', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  headerTotal:  { color: 'white', fontSize: 36, fontWeight: 'bold' },
  headerSous:   { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },

  content: { padding: 16 },

  // Onglets
  onglets:          { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 4, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2 },
  ongletBtn:        { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  ongletActif:      { backgroundColor: '#FF6B35' },
  ongletTexte:      { fontSize: 13, fontWeight: '500', color: '#9ca3af' },
  ongletTexteActif: { color: 'white', fontWeight: '700' },

  // Période
  periodeForm:     { marginBottom: 16 },
  dateInput:       { backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', marginBottom: 8 },
  rechercherBtn:   { backgroundColor: '#FF6B35', borderRadius: 10, padding: 14, alignItems: 'center' },
  rechercherTexte: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Vide
  vide:      { alignItems: 'center', paddingVertical: 60 },
  videEmoji: { fontSize: 48, marginBottom: 12 },
  videTexte: { color: '#9ca3af', fontSize: 16 },

  // Carte vente
  card: {
    backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  cardAnnulee:  { opacity: 0.6, borderWidth: 1, borderColor: '#fecaca' },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between' },
  venteId:      { fontSize: 15, fontWeight: '600', color: '#111827' },
  venteCaissier:{ fontSize: 12, color: '#9ca3af', marginTop: 2 },
  venteHeure:   { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  venteTotal:   { fontSize: 16, fontWeight: '700', color: '#FF6B35' },
  venteMode:    { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  voirDetail:   { fontSize: 11, color: '#FF6B35', marginTop: 6, fontWeight: '600' },
  venteNote:    { fontSize: 12, color: '#9ca3af', marginTop: 8, fontStyle: 'italic' },

  badgeAnnulee:      { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeAnnuleeTexte: { fontSize: 11, color: '#dc2626', fontWeight: '600' },

  // Lignes détail
  lignes:      { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginTop: 12 },
  ligne:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  ligneNom:    { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500' },
  ligneDetail: { fontSize: 12, color: '#9ca3af', marginHorizontal: 8 },
  ligneTotal:  { fontSize: 13, fontWeight: '600', color: '#111827' },
})