// ============================================================
// ALERTES SCREEN - Stocks critiques et notifications
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator
} from 'react-native'
import api from '../utils/api'

export default function AlertesScreen() {
  const [produits, setProduits] = useState([])
  const [chargement, setChargement] = useState(true)
  const [rafraichissement, setRafraichissement] = useState(false)

  const chargerProduits = async () => {
    try {
      const response = await api.get('/api/stock/produits')
      setProduits(response.data.data)
    } catch (error) {
      console.error('Erreur alertes:', error)
    } finally {
      setChargement(false)
      setRafraichissement(false)
    }
  }

  useEffect(() => {
    chargerProduits()
    const interval = setInterval(chargerProduits, 30000)
    return () => clearInterval(interval)
  }, [])

  const onRefresh = useCallback(() => {
    setRafraichissement(true)
    chargerProduits()
  }, [])

  const produitsCritiques = produits.filter(
    p => parseFloat(p.stock_actuel) <= parseFloat(p.stock_min)
  )
  const produitsNormaux = produits.filter(
    p => parseFloat(p.stock_actuel) > parseFloat(p.stock_min)
  )

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitre}>Alertes Stock</Text>
        <View style={styles.headerStats}>
          <View style={styles.stat}>
            <Text style={styles.statNombre}>{produitsCritiques.length}</Text>
            <Text style={styles.statLabel}>Critiques</Text>
          </View>
          <View style={styles.statSeparateur} />
          <View style={styles.stat}>
            <Text style={[styles.statNombre, { color: '#86efac' }]}>{produitsNormaux.length}</Text>
            <Text style={styles.statLabel}>Normaux</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>

        {/* Stocks critiques */}
        {produitsCritiques.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>⚠️ Stocks critiques ({produitsCritiques.length})</Text>
            {produitsCritiques.map(p => {
              const pourcentage = parseFloat(p.stock_min) > 0
                ? Math.min((parseFloat(p.stock_actuel) / parseFloat(p.stock_min)) * 100, 100)
                : 0
              return (
                <View key={p.id} style={styles.produitCritique}>
                  <View style={styles.produitHeader}>
                    <Text style={styles.produitNom}>{p.nom}</Text>
                    <Text style={styles.produitCategorie}>{p.categorie || 'Sans catégorie'}</Text>
                  </View>
                  <View style={styles.produitStats}>
                    <View>
                      <Text style={styles.stockLabel}>Stock actuel</Text>
                      <Text style={styles.stockCritique}>
                        {p.stock_actuel} {p.unite}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.stockLabel}>Seuil minimum</Text>
                      <Text style={styles.stockMin}>
                        {p.stock_min} {p.unite}
                      </Text>
                    </View>
                  </View>
                  {/* Barre de progression */}
                  <View style={styles.barreContainer}>
                    <View style={[styles.barre, { width: `${pourcentage}%`, backgroundColor: '#dc2626' }]} />
                  </View>
                  <Text style={styles.barreTexte}>
                    {pourcentage.toFixed(0)}% du seuil minimum
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {produitsCritiques.length === 0 && (
          <View style={styles.ok}>
            <Text style={styles.okEmoji}>✅</Text>
            <Text style={styles.okTitre}>Tous les stocks sont OK !</Text>
            <Text style={styles.okSous}>Aucun produit sous le seuil minimum</Text>
          </View>
        )}

        {/* Stocks normaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>✅ Stocks normaux ({produitsNormaux.length})</Text>
          {produitsNormaux.map(p => (
            <View key={p.id} style={styles.produitNormal}>
              <View>
                <Text style={styles.produitNom}>{p.nom}</Text>
                <Text style={styles.produitCategorie}>{p.categorie || 'Sans catégorie'}</Text>
              </View>
              <Text style={styles.stockNormal}>
                {p.stock_actuel} {p.unite}
              </Text>
            </View>
          ))}
        </View>

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
  headerTitre: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  headerStats: { flexDirection: 'row', alignItems: 'center' },
  stat: { alignItems: 'center', paddingHorizontal: 24 },
  statNombre: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  statSeparateur: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  content: { padding: 16 },
  section: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12
  },
  sectionTitre: {
    fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12
  },
  produitCritique: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#fef2f2'
  },
  produitHeader: { marginBottom: 10 },
  produitNom: { fontSize: 15, fontWeight: '600', color: '#111827' },
  produitCategorie: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  produitStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  stockLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  stockCritique: { fontSize: 18, fontWeight: '700', color: '#dc2626' },
  stockMin: { fontSize: 14, fontWeight: '500', color: '#374151' },
  barreContainer: {
    height: 6, backgroundColor: '#fee2e2',
    borderRadius: 3, marginBottom: 4, overflow: 'hidden'
  },
  barre: { height: '100%', borderRadius: 3 },
  barreTexte: { fontSize: 11, color: '#9ca3af' },
  produitNormal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  stockNormal: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  ok: { alignItems: 'center', paddingVertical: 40 },
  okEmoji: { fontSize: 48, marginBottom: 12 },
  okTitre: { fontSize: 18, fontWeight: '600', color: '#16a34a', marginBottom: 4 },
  okSous: { fontSize: 14, color: '#9ca3af' }
})