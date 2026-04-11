// ============================================================
// DASHBOARD SCREEN - Écran principal du patron
// Ventes + Bénéfice par période + Wallets colorés comme la caisse
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, ActivityIndicator
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const DEVISE = 'FCFA'
const fmtNum = (n) => Number(n || 0).toLocaleString('fr-FR')

const MODES_LABELS = {
  especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money',
  mtn_money: 'MTN MoMo', credit: 'Crédit', autre: 'Autre',
}

// Identique aux boutons de la caisse
const WALLETS_CONFIG = [
  { key: 'wave',         label: 'Wave',        icone: '🐧', bg: '#1D4ED8', color: 'white',   overlayBg: 'rgba(255,255,255,0.2)' },
  { key: 'orange_money', label: 'Orange Money', icone: '📱', bg: '#FF6B00', color: 'white',   overlayBg: 'rgba(255,255,255,0.2)' },
  { key: 'mtn_money',    label: 'MTN Money',    icone: '📱', bg: '#FFCC00', color: '#111827', overlayBg: 'rgba(0,0,0,0.08)'      },
]

// ─── Carte période ────────────────────────────────────────────
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

// ─── Composant principal ──────────────────────────────────────
export default function DashboardScreen() {
  const { utilisateur, logout } = useAuth()
  const [data, setData]                   = useState(null)
  const [chargement, setChargement]       = useState(true)
  const [rafraichissement, setRafraichissement] = useState(false)
  const [graphique, setGraphique]         = useState('semaine')

  const chargerDashboard = useCallback(async (periode) => {
    try {
      const response = await api.get(`/api/dashboard?graphique=${periode}`)
      setData(response.data.data)
    } catch (error) {
      console.error('Erreur dashboard:', error)
    } finally {
      setChargement(false)
      setRafraichissement(false)
    }
  }, [])

  useEffect(() => {
    chargerDashboard(graphique)
    const interval = setInterval(() => chargerDashboard(graphique), 30000)
    return () => clearInterval(interval)
  }, [graphique])

  const onRefresh = useCallback(() => {
    setRafraichissement(true)
    chargerDashboard(graphique)
  }, [graphique])

  const isPatron = utilisateur?.role === 'patron'
  const r = data?.resume || {}

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
      {/* Header */}
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

        {/* Date */}
        <Text style={styles.date}>
          {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </Text>

        {/* 3 Cartes période */}
        <CartePeriode titre="AUJOURD'HUI"   ventes={r.vente_jour}    benefice={r.benefice_jour}    nb={r.nb_jour}    isPatron={isPatron} bgColor="#FFF7ED" titreColor="#c2410c" venteColor="#7c2d12" beneficeColor="#16a34a" sousColor="#f97316" />
        <CartePeriode titre="CETTE SEMAINE" ventes={r.vente_semaine} benefice={r.benefice_semaine} nb={r.nb_semaine} isPatron={isPatron} bgColor="#F0FDF4" titreColor="#15803d" venteColor="#14532d" beneficeColor="#15803d" sousColor="#22c55e" />
        <CartePeriode titre="CE MOIS"       ventes={r.vente_mois}    benefice={r.benefice_mois}    nb={r.nb_mois}    isPatron={isPatron} bgColor="#EFF6FF" titreColor="#1d4ed8" venteColor="#1e3a8a" beneficeColor="#1d4ed8" sousColor="#3b82f6" />

        {/* ── Wallets — style identique aux boutons de la caisse ── */}
        <Text style={styles.sectionTitreGris}>SOLDE DES WALLETS</Text>
        <View style={styles.walletsRow}>
          {WALLETS_CONFIG.map(({ key, label, icone, bg, color }) => {
            const solde = data?.wallets?.[key] ?? 0
            return (
              <View key={key} style={[styles.walletCard, { backgroundColor: bg }]}>
                {/* Icône + label */}
                <View style={styles.walletHeader}>
                  <Text style={styles.walletIcone}>{icone}</Text>
                  <Text style={[styles.walletNom, { color }]}>{label}</Text>
                </View>
                {/* Montant */}
                <Text style={[styles.walletValeur, { color }]}>{fmtNum(solde)}</Text>
                <Text style={[styles.walletDevise, { color }]}>{DEVISE}</Text>
                {/* Statut */}
                <Text style={[styles.walletSous, { color, opacity: 0.8 }]}>
                  {solde === 0 ? 'Aucun paiement reçu' : 'Solde du jour'}
                </Text>
              </View>
            )
          })}
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
                  {isPatron && produit.marge > 0 && (
                    <Text style={styles.produitMarge}>+{fmtNum(produit.marge)}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Répartition paiements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Répartition des paiements</Text>
          {!data?.repartition_paiement?.length ? (
            <Text style={styles.vide}>Aucune vente aujourd'hui</Text>
          ) : (
            data.repartition_paiement.map(item => (
              <View key={item.mode} style={styles.paiementLigne}>
                <View>
                  <Text style={styles.paiementMode}>{MODES_LABELS[item.mode] || item.mode}</Text>
                  <Text style={styles.paiementNb}>{item.nombre} vente{item.nombre > 1 ? 's' : ''}</Text>
                </View>
                <Text style={styles.paiementMontant}>{fmtNum(item.total)} {DEVISE}</Text>
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
              <View key={p.id} style={styles.paiementLigne}>
                <Text style={styles.paiementMode}>{p.nom}</Text>
                <Text style={[styles.paiementMontant, { color: '#dc2626' }]}>
                  {fmtNum(p.stock_actuel)} {p.unite}
                </Text>
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

  header:       { backgroundColor: '#FF6B35', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitre:  { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSous:   { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  logoutBtn:    { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  logoutTexte:  { color: 'white', fontSize: 13, fontWeight: '500' },

  content: { padding: 16 },
  date:    { fontSize: 13, color: '#9ca3af', marginBottom: 16, textTransform: 'capitalize' },

  // Cartes période
  cartePeriode:      { borderRadius: 14, padding: 20, marginBottom: 12 },
  cartePeriodeTitre: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  carteRow:          { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  carteLabel:        { fontSize: 11, marginBottom: 4 },
  carteValeur:       { fontSize: 40, fontWeight: '700', lineHeight: 44 },
  carteBenefice:     { fontSize: 28, fontWeight: '700', lineHeight: 32 },
  carteSous:         { fontSize: 12, marginTop: 4 },

  // Wallets — style caisse
  sectionTitreGris: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  walletsRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  walletCard:   { flex: 1, borderRadius: 14, padding: 14 },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  walletIcone:  { fontSize: 18 },
  walletNom:    { fontSize: 11, fontWeight: '700' },
  walletValeur: { fontSize: 24, fontWeight: '700', lineHeight: 28, marginBottom: 2 },
  walletDevise: { fontSize: 12, marginBottom: 6 },
  walletSous:   { fontSize: 11, fontWeight: '500' },

  // Sections
  section:      { backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitre: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  vide:         { color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingVertical: 8 },

  // Paiements
  paiementLigne:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  paiementMode:    { fontSize: 14, color: '#374151', fontWeight: '500' },
  paiementNb:      { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  paiementMontant: { fontSize: 14, fontWeight: '700', color: '#111827' },

  // Top produits
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