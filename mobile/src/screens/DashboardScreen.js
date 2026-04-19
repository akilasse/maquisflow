import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, ActivityIndicator
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const DEVISE = 'FCFA'
const fmtNum = (n) => Number(n || 0).toLocaleString('fr-FR')

const MODES_PAIEMENT = [
  { key: 'especes',      label: 'Espèces',     icone: '💵', color: '#16a34a', bgCard: '#f0fdf4', bgIcone: '#bbf7d0' },
  { key: 'wave',         label: 'Wave',         icone: '🐧', color: '#1d4ed8', bgCard: '#eff6ff', bgIcone: '#bfdbfe' },
  { key: 'orange_money', label: 'Orange Money', icone: '📱', color: '#ea580c', bgCard: '#fff7ed', bgIcone: '#fed7aa' },
  { key: 'mtn_money',    label: 'MTN MoMo',     icone: '📱', color: '#854d0e', bgCard: '#fefce8', bgIcone: '#FFCC00' },
  { key: 'credit',       label: 'Crédit',       icone: '📋', color: '#9333ea', bgCard: '#fdf4ff', bgIcone: '#e9d5ff' },
  { key: 'autre',        label: 'Autre',        icone: '💳', color: '#64748b', bgCard: '#f8fafc', bgIcone: '#e2e8f0' },
]

const CartePeriode = ({ titre, ventes, benefice, nb, isPatron, bgColor, titreColor, venteColor, beneficeColor, sousColor }) => (
  <View style={[styles.cartePeriode, { backgroundColor: bgColor }]}>
    <Text style={[styles.cartePeriodeTitre, { color: titreColor }]}>{titre}</Text>
    <View style={styles.carteRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.carteLabel, { color: sousColor }]}>Ventes</Text>
        <Text style={[styles.carteValeur, { color: venteColor }]}>{fmtNum(ventes)}</Text>
        <Text style={[styles.carteSous, { color: sousColor }]}>{DEVISE} · {nb} transaction{nb > 1 ? 's' : ''}</Text>
      </View>
      {isPatron && (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.carteLabel, { color: sousColor }]}>Bénéfice</Text>
          <Text style={[styles.carteBenefice, { color: beneficeColor }]}>{fmtNum(benefice)}</Text>
          <Text style={[styles.carteSous, { color: sousColor }]}>{DEVISE}</Text>
        </View>
      )}
    </View>
  </View>
)

// Carte paiement — même largeur que CartePeriode
const CartePaiement = ({ label, icone, color, bgCard, bgIcone, total, nombre }) => (
  <View style={[styles.cartePaiement, { backgroundColor: bgCard }]}>
    <View style={styles.cartePaiementHeader}>
      <View style={[styles.iconeWrapper, { backgroundColor: bgIcone }]}>
        <Text style={styles.iconeTexte}>{icone}</Text>
      </View>
      <Text style={[styles.cartePaiementLabel, { color }]}>{label}</Text>
    </View>
    <Text style={[styles.cartePaiementMontant, { color: total > 0 ? '#111827' : '#d1d5db' }]}>
      {fmtNum(total)}
    </Text>
    <Text style={styles.cartePaiementDevise}>{DEVISE}</Text>
    <Text style={[styles.cartePaiementNb, { color: nombre > 0 ? color : '#9ca3af' }]}>
      {nombre > 0 ? `${nombre} vente${nombre > 1 ? 's' : ''}` : 'Aucun paiement'}
    </Text>
  </View>
)

export default function DashboardScreen() {
  const { utilisateur, logout } = useAuth()
  const [data, setData]                         = useState(null)
  const [chargement, setChargement]             = useState(true)
  const [rafraichissement, setRafraichissement] = useState(false)

  const chargerDashboard = useCallback(async () => {
    try {
      const response = await api.get('/api/dashboard?graphique=semaine')
      setData(response.data.data)
    } catch (error) {
      console.error('Erreur dashboard:', error)
    } finally {
      setChargement(false)
      setRafraichissement(false)
    }
  }, [])

  useEffect(() => {
    chargerDashboard()
    const interval = setInterval(chargerDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  const onRefresh = useCallback(() => {
    setRafraichissement(true)
    chargerDashboard()
  }, [])

  const isPatron = utilisateur?.role === 'patron'
  const r = data?.resume || {}

  const paiementsParMode = MODES_PAIEMENT.map(mode => {
    const rep    = data?.repartition_paiement?.find(r => r.mode === mode.key)
    const wallet = data?.wallets?.[mode.key] ?? 0
    const total  = rep ? Number(rep.total) : wallet
    const nombre = rep ? rep.nombre : 0
    return { ...mode, total, nombre }
  })

  // Groupes de 3
  const ligne1 = paiementsParMode.slice(0, 3)
  const ligne2 = paiementsParMode.slice(3, 6)

  if (chargement) return (
    <View style={styles.centrer}>
      <ActivityIndicator size="large" color="#FF6B35" />
      <Text style={styles.chargementTexte}>Chargement...</Text>
    </View>
  )

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={onRefresh} colors={['#FF6B35']} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitre}>{data?.maquis?.nom}</Text>
          <Text style={styles.headerSous}>Bonjour {utilisateur?.nom} 👋</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutTexte}>Sortir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>

        <Text style={styles.date}>
          {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </Text>

        {/* 3 Cartes chiffres d'affaires */}
        <CartePeriode titre="AUJOURD'HUI"   ventes={r.vente_jour}    benefice={r.benefice_jour}    nb={r.nb_jour}    isPatron={isPatron} bgColor="#FFF7ED" titreColor="#c2410c" venteColor="#7c2d12" beneficeColor="#16a34a" sousColor="#f97316" />
        <CartePeriode titre="CETTE SEMAINE" ventes={r.vente_semaine} benefice={r.benefice_semaine} nb={r.nb_semaine} isPatron={isPatron} bgColor="#F0FDF4" titreColor="#15803d" venteColor="#14532d" beneficeColor="#15803d" sousColor="#22c55e" />
        <CartePeriode titre="CE MOIS"       ventes={r.vente_mois}    benefice={r.benefice_mois}    nb={r.nb_mois}    isPatron={isPatron} bgColor="#EFF6FF" titreColor="#1d4ed8" venteColor="#1e3a8a" beneficeColor="#1d4ed8" sousColor="#3b82f6" />

        {/* Paiements — 2 lignes de 3 */}
        <Text style={styles.sectionTitreGris}>PAIEMENTS DU JOUR</Text>
        <View style={styles.ligneCartes}>
          {ligne1.map(p => <CartePaiement key={p.key} {...p} />)}
        </View>
        <View style={styles.ligneCartes}>
          {ligne2.map(p => <CartePaiement key={p.key} {...p} />)}
        </View>

        {/* Top produits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Top produits du jour</Text>
          {!data?.top_produits?.length ? (
            <Text style={styles.vide}>Aucune vente aujourd'hui</Text>
          ) : (
            data.top_produits.map((produit, index) => (
              <View key={produit.id} style={styles.produitLigne}>
                <View style={styles.produitRang}>
                  <Text style={styles.produitRangTexte}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.produitNom}>{produit.nom}</Text>
                  <Text style={styles.produitDetail}>{fmtNum(produit.total_vendu)} {produit.unite} vendu(s)</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.produitCA}>{fmtNum(produit.ca_produit)}</Text>
                  {isPatron && produit.marge > 0 && <Text style={styles.produitMarge}>+{fmtNum(produit.marge)}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Stocks critiques */}
        {data?.stocks_critiques?.length > 0 && (
          <View style={[styles.section, styles.stockCritiqueSection]}>
            <Text style={[styles.sectionTitre, { color: '#dc2626' }]}>
              Stocks critiques ({data.stocks_critiques.length})
            </Text>
            {data.stocks_critiques.map(p => (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text style={styles.produitNom}>{p.nom}</Text>
                <Text style={[styles.produitCA, { color: '#dc2626' }]}>{fmtNum(p.stock_actuel)} {p.unite}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.refresh}>Tire vers le bas pour rafraîchir · Auto 30s</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f3f4f6' },
  centrer:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chargementTexte:  { marginTop: 12, color: '#9ca3af', fontSize: 14 },

  header:      { backgroundColor: '#FF6B35', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitre: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSous:  { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  logoutBtn:   { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  logoutTexte: { color: 'white', fontSize: 13, fontWeight: '500' },

  content: { padding: 16 },
  date:    { fontSize: 13, color: '#9ca3af', marginBottom: 16, textTransform: 'capitalize' },

  cartePeriode:      { borderRadius: 14, padding: 20, marginBottom: 10 },
  cartePeriodeTitre: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  carteRow:          { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  carteLabel:        { fontSize: 11, marginBottom: 4 },
  carteValeur:       { fontSize: 38, fontWeight: '700', lineHeight: 42 },
  carteBenefice:     { fontSize: 26, fontWeight: '700', lineHeight: 30 },
  carteSous:         { fontSize: 12, marginTop: 4 },

  sectionTitreGris: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginTop: 6, marginBottom: 10 },

  // Ligne de 3 cartes paiement
  ligneCartes: { flexDirection: 'row', gap: 8, marginBottom: 8 },

  cartePaiement: { flex: 1, borderRadius: 12, padding: 12 },
  cartePaiementHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  iconeWrapper:  { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  iconeTexte:    { fontSize: 15 },
  cartePaiementLabel:   { fontSize: 10, fontWeight: '700', flex: 1 },
  cartePaiementMontant: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  cartePaiementDevise:  { fontSize: 10, color: '#9ca3af', marginBottom: 4 },
  cartePaiementNb:      { fontSize: 10, fontWeight: '600' },

  section:      { backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitre: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  vide:         { color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingVertical: 8 },

  produitLigne:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  produitRang:      { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  produitRangTexte: { color: '#FF6B35', fontWeight: 'bold', fontSize: 13 },
  produitNom:       { fontSize: 14, fontWeight: '500', color: '#111827' },
  produitDetail:    { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  produitCA:        { fontSize: 14, fontWeight: '700', color: '#111827' },
  produitMarge:     { fontSize: 12, fontWeight: '600', color: '#16a34a', marginTop: 2 },

  stockCritiqueSection: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  refresh: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 8, marginBottom: 24 },
})