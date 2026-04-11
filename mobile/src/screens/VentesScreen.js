// ============================================================
// VENTES SCREEN - Liste des ventes du jour
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator
} from 'react-native'
import api from '../utils/api'

export default function VentesScreen() {
  const [ventes, setVentes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [rafraichissement, setRafraichissement] = useState(false)

  const chargerVentes = async () => {
    try {
      const response = await api.get('/api/ventes')
      setVentes(response.data.data)
    } catch (error) {
      console.error('Erreur ventes:', error)
    } finally {
      setChargement(false)
      setRafraichissement(false)
    }
  }

  useEffect(() => {
    chargerVentes()
    const interval = setInterval(chargerVentes, 30000)
    return () => clearInterval(interval)
  }, [])

  const onRefresh = useCallback(() => {
    setRafraichissement(true)
    chargerVentes()
  }, [])

  const totalJour = ventes.reduce((t, v) => t + parseFloat(v.total_net), 0)

  const iconeMode = (mode) => {
    const icones = {
      especes: '💵', wave: '🌊', orange_money: '🟠',
      mtn_money: '🟡', credit: '📝', autre: '💳'
    }
    return icones[mode] || '💳'
  }

  if (chargement) {
    return (
      <View style={styles.centrer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={rafraichissement} onRefresh={onRefresh} colors={['#FF6B35']} />
      }
    >
      {/* Header total */}
      <View style={styles.header}>
        <Text style={styles.headerTitre}>Ventes du jour</Text>
        <Text style={styles.headerTotal}>{totalJour.toLocaleString()} XOF</Text>
        <Text style={styles.headerSous}>{ventes.length} vente(s)</Text>
      </View>

      <View style={styles.content}>
        {ventes.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videEmoji}>🧾</Text>
            <Text style={styles.videTexte}>Aucune vente aujourd'hui</Text>
          </View>
        ) : (
          ventes.map(vente => (
            <View key={vente.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.venteId}>Vente #{vente.id}</Text>
                  <Text style={styles.venteCaissier}>
                    Par {vente.caissier?.nom}
                  </Text>
                </View>
                <View style={styles.droite}>
                  <Text style={styles.venteTotal}>
                    {parseFloat(vente.total_net).toLocaleString()} XOF
                  </Text>
                  <Text style={styles.venteMode}>
                    {iconeMode(vente.mode_paiement)} {vente.mode_paiement.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              {/* Lignes de produits */}
              <View style={styles.lignes}>
                {vente.lignes?.map(ligne => (
                  <View key={ligne.id} style={styles.ligne}>
                    <Text style={styles.ligneNom}>
                      {ligne.produit?.nom}
                    </Text>
                    <Text style={styles.ligneDetail}>
                      {ligne.quantite} × {parseFloat(ligne.prix_unitaire).toLocaleString()} XOF
                    </Text>
                    <Text style={styles.ligneTotal}>
                      {parseFloat(ligne.total_ligne).toLocaleString()} XOF
                    </Text>
                  </View>
                ))}
              </View>

              {/* Heure */}
              <Text style={styles.venteHeure}>
                🕐 {new Date(vente.date_vente).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centrer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#FF6B35',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center'
  },
  headerTitre: { color: 'white', fontSize: 16, fontWeight: '500', marginBottom: 8 },
  headerTotal: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  headerSous: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  content: { padding: 16 },
  vide: { alignItems: 'center', paddingVertical: 60 },
  videEmoji: { fontSize: 48, marginBottom: 12 },
  videTexte: { color: '#9ca3af', fontSize: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  venteId: { fontSize: 15, fontWeight: '600', color: '#111827' },
  venteCaissier: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  droite: { alignItems: 'flex-end' },
  venteTotal: { fontSize: 16, fontWeight: '700', color: '#FF6B35' },
  venteMode: { fontSize: 12, color: '#9ca3af', marginTop: 2, textTransform: 'capitalize' },
  lignes: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  ligneNom: { flex: 1, fontSize: 13, color: '#374151' },
  ligneDetail: { fontSize: 12, color: '#9ca3af', marginHorizontal: 8 },
  ligneTotal: { fontSize: 13, fontWeight: '500', color: '#111827' },
  venteHeure: { fontSize: 12, color: '#9ca3af', marginTop: 10 }
})