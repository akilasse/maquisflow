import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, FlatList, StyleSheet,
  RefreshControl, TouchableOpacity, ActivityIndicator,
  TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const DEVISE = 'FCFA'
const fmtNum = (n) => Number(n || 0).toLocaleString('fr-FR')
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const MODES_PAIEMENT = [
  { key: 'especes',      label: 'Espèces',     icone: '💵', color: '#16a34a', bgCard: '#f0fdf4', bgIcone: '#bbf7d0' },
  { key: 'wave',         label: 'Wave',         icone: '🐧', color: '#1d4ed8', bgCard: '#eff6ff', bgIcone: '#bfdbfe' },
  { key: 'orange_money', label: 'Orange Money', icone: '📱', color: '#ea580c', bgCard: '#fff7ed', bgIcone: '#fed7aa' },
  { key: 'mtn_money',    label: 'MTN MoMo',     icone: '📱', color: '#854d0e', bgCard: '#fefce8', bgIcone: '#FFCC00' },
  { key: 'credit',       label: 'Crédit',       icone: '📋', color: '#9333ea', bgCard: '#fdf4ff', bgIcone: '#e9d5ff' },
  { key: 'autre',        label: 'Autre',        icone: '💳', color: '#64748b', bgCard: '#f8fafc', bgIcone: '#e2e8f0' },
]

const PERIODES = [
  { key: 'jour',    label: "Aujourd'hui" },
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois',    label: 'Mois' },
]

const STATUTS = [
  { key: '',                label: 'Tous',     color: '#6b7280', bg: '#f3f4f6' },
  { key: 'encaissee',       label: 'Encaissée', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'en_attente',      label: 'Attente',  color: '#d97706', bg: '#fffbeb' },
  { key: 'credit_en_cours', label: 'Crédit',   color: '#9333ea', bg: '#fdf4ff' },
  { key: 'annulee',         label: 'Annulée',  color: '#dc2626', bg: '#fef2f2' },
]

const STATUT_STYLES = {
  encaissee:       { color: '#16a34a', bg: '#f0fdf4', label: 'Encaissée' },
  en_attente:      { color: '#d97706', bg: '#fffbeb', label: 'En attente' },
  credit_en_cours: { color: '#9333ea', bg: '#fdf4ff', label: 'Crédit' },
  annulee:         { color: '#dc2626', bg: '#fef2f2', label: 'Annulée' },
  validee:         { color: '#16a34a', bg: '#f0fdf4', label: 'Validée' },
}

const MODE_LABEL = {
  especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money',
  mtn_money: 'MTN MoMo', credit: 'Crédit', autre: 'Autre'
}

// ─── Sous-composants Dashboard ─────────────────────────────────────────────
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

// ─── Carte Facture ──────────────────────────────────────────────────────────
const CarteFacture = ({ vente }) => {
  const [ouverte, setOuverte] = useState(false)
  const st = STATUT_STYLES[vente.statut] || { color: '#6b7280', bg: '#f3f4f6', label: vente.statut }
  const economie = vente.lignes?.reduce((s, l) => s + parseFloat(l.economie_client || 0), 0) || 0

  return (
    <TouchableOpacity style={styles.carteFacture} onPress={() => setOuverte(!ouverte)} activeOpacity={0.85}>
      <View style={styles.carteFactureHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.factureNum}>Facture #{vente.id}</Text>
          <Text style={styles.factureDate}>{fmtDate(vente.date_vente)}</Text>
          {vente.caissier?.nom && (
            <Text style={styles.factureSub}>Caissier : {vente.caissier.nom}</Text>
          )}
          {vente.serveur_nom && (
            <Text style={styles.factureSub}>Serveur : {vente.serveur_nom}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[styles.statutBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statutTexte, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={styles.factureTotal}>{fmtNum(vente.total_net)}</Text>
          <Text style={styles.factureTotalSub}>{MODE_LABEL[vente.mode_paiement] || vente.mode_paiement}</Text>
        </View>
      </View>

      {economie > 0 && (
        <View style={styles.economieBadge}>
          <Text style={styles.economieTexte}>Écart prix : -{fmtNum(economie)} FCFA</Text>
        </View>
      )}
      {vente.reduction_montant > 0 && (
        <View style={[styles.economieBadge, { backgroundColor: '#eff6ff' }]}>
          <Text style={[styles.economieTexte, { color: '#1d4ed8' }]}>Réduction : -{fmtNum(vente.reduction_montant)} FCFA</Text>
        </View>
      )}
      {vente.statut === 'annulee' && vente.annulation_motif && (
        <Text style={styles.motifTexte}>Annulation : {vente.annulation_motif}</Text>
      )}

      {ouverte && vente.lignes?.length > 0 && (
        <View style={styles.lignesContainer}>
          {vente.lignes.map(l => (
            <View key={l.id} style={styles.ligneProduit}>
              <Text style={styles.ligneProduitNom}>{l.produit?.nom}</Text>
              <Text style={styles.ligneProduitDetail}>
                {l.quantite} {l.produit?.unite} × {fmtNum(l.prix_unitaire)} = {fmtNum(l.total_ligne)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.voirDetail}>{ouverte ? '▲ Masquer' : `▼ ${vente.lignes?.length || 0} article(s)`}</Text>
    </TouchableOpacity>
  )
}

// ─── Composant principal ────────────────────────────────────────────────────
export default function DashboardScreen({ onRetour }) {
  const { utilisateur } = useAuth()

  // Onglet actif
  const [onglet, setOnglet] = useState('dashboard')

  // Dashboard
  const [data, setData]                         = useState(null)
  const [chargement, setChargement]             = useState(true)
  const [rafraichissement, setRafraichissement] = useState(false)
  const [erreur, setErreur]                     = useState(null)

  // Factures
  const [ventes, setVentes]                   = useState([])
  const [ventesCharge, setVentesCharge]        = useState(false)
  const [ventesRaf, setVentesRaf]              = useState(false)
  const [venteErreur, setVenteErreur]          = useState(null)
  const [periode, setPeriode]                  = useState('jour')
  const [statutFiltre, setStatutFiltre]        = useState('')
  const [rechercheNum, setRechercheNum]        = useState('')

  // ── Dashboard ──────────────────────────────────────────────────────────
  const chargerDashboard = useCallback(async () => {
    try {
      const response = await api.get('/api/dashboard?graphique=semaine')
      setData(response.data.data)
      setErreur(null)
    } catch {
      setErreur('Impossible de charger les données')
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

  const onRefreshDash = useCallback(() => {
    setRafraichissement(true)
    chargerDashboard()
  }, [])

  // ── Factures ───────────────────────────────────────────────────────────
  const chargerVentes = useCallback(async (isRaf = false) => {
    if (isRaf) setVentesRaf(true)
    else setVentesCharge(true)
    try {
      const now    = new Date()
      let dateDebut, dateFin

      if (periode === 'jour') {
        dateDebut = new Date(now.setHours(0,0,0,0)).toISOString()
        dateFin   = new Date(new Date().setHours(23,59,59,999)).toISOString()
      } else if (periode === 'semaine') {
        const lundi = new Date(now)
        lundi.setDate(now.getDate() - now.getDay() + 1)
        lundi.setHours(0,0,0,0)
        dateDebut = lundi.toISOString()
        dateFin   = new Date(new Date().setHours(23,59,59,999)).toISOString()
      } else {
        dateDebut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        dateFin   = new Date(new Date().setHours(23,59,59,999)).toISOString()
      }

      const params = new URLSearchParams({ date_debut: dateDebut, date_fin: dateFin })
      if (statutFiltre) params.append('statut', statutFiltre)
      if (rechercheNum.trim()) params.append('numero_facture', rechercheNum.trim())

      const res = await api.get(`/api/ventes?${params}`)
      setVentes(res.data.data || [])
      setVenteErreur(null)
    } catch {
      setVenteErreur('Impossible de charger les factures')
    } finally {
      setVentesCharge(false)
      setVentesRaf(false)
    }
  }, [periode, statutFiltre, rechercheNum])

  useEffect(() => {
    if (onglet === 'factures') chargerVentes()
  }, [onglet, periode, statutFiltre])

  const totalVentes   = ventes.reduce((s, v) => s + parseFloat(v.total_net || 0), 0)
  const isPatron      = utilisateur?.role === 'patron'
  const r             = data?.resume || {}

  const paiementsParMode = MODES_PAIEMENT.map(mode => {
    const rep    = data?.repartition_paiement?.find(r => r.mode === mode.key)
    const wallet = data?.wallets?.[mode.key] ?? 0
    const total  = rep ? Number(rep.total) : wallet
    const nombre = rep ? rep.nombre : 0
    return { ...mode, total, nombre }
  })
  const ligne1 = paiementsParMode.slice(0, 3)
  const ligne2 = paiementsParMode.slice(3, 6)

  // ── Render loading ─────────────────────────────────────────────────────
  if (chargement) return (
    <View style={styles.centrer}>
      <ActivityIndicator size="large" color="#FF6B35" />
      <Text style={styles.chargementTexte}>Chargement...</Text>
    </View>
  )

  if (erreur && !data) return (
    <View style={styles.centrer}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8 }}>{erreur}</Text>
      <TouchableOpacity onPress={chargerDashboard} style={{ backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 }}>
        <Text style={{ color: 'white', fontWeight: '700' }}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  )

  // ── Render principal ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FF6B35' }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitre}>{data?.maquis?.nom}</Text>
          <Text style={styles.headerSous}>Bonjour {utilisateur?.nom} 👋</Text>
        </View>
        <TouchableOpacity onPress={onRetour} style={styles.logoutBtn}>
          <Text style={styles.logoutTexte}>← Menu</Text>
        </TouchableOpacity>
      </View>

      {/* Onglets */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, onglet === 'dashboard' && styles.tabBtnActif]}
          onPress={() => setOnglet('dashboard')}
        >
          <Text style={[styles.tabTexte, onglet === 'dashboard' && styles.tabTexteActif]}>📊 Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, onglet === 'factures' && styles.tabBtnActif]}
          onPress={() => setOnglet('factures')}
        >
          <Text style={[styles.tabTexte, onglet === 'factures' && styles.tabTexteActif]}>📄 Factures</Text>
        </TouchableOpacity>
      </View>

      {/* Contenu Dashboard */}
      {onglet === 'dashboard' && (
        <ScrollView
          style={{ flex: 1, backgroundColor: '#f3f4f6' }}
          refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={onRefreshDash} colors={['#FF6B35']} />}
        >
          <View style={styles.content}>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </Text>

            <CartePeriode titre="AUJOURD'HUI"   ventes={r.vente_jour}    benefice={r.benefice_jour}    nb={r.nb_jour}    isPatron={isPatron} bgColor="#FFF7ED" titreColor="#c2410c" venteColor="#7c2d12" beneficeColor="#16a34a" sousColor="#f97316" />
            <CartePeriode titre="CETTE SEMAINE" ventes={r.vente_semaine} benefice={r.benefice_semaine} nb={r.nb_semaine} isPatron={isPatron} bgColor="#F0FDF4" titreColor="#15803d" venteColor="#14532d" beneficeColor="#15803d" sousColor="#22c55e" />
            <CartePeriode titre="CE MOIS"       ventes={r.vente_mois}    benefice={r.benefice_mois}    nb={r.nb_mois}    isPatron={isPatron} bgColor="#EFF6FF" titreColor="#1d4ed8" venteColor="#1e3a8a" beneficeColor="#1d4ed8" sousColor="#3b82f6" />

            <Text style={styles.sectionTitreGris}>PAIEMENTS DU JOUR</Text>
            <View style={styles.ligneCartes}>{ligne1.map(p => <CartePaiement key={p.key} {...p} />)}</View>
            <View style={styles.ligneCartes}>{ligne2.map(p => <CartePaiement key={p.key} {...p} />)}</View>

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
      )}

      {/* Contenu Factures */}
      {onglet === 'factures' && (
        <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
          {/* Filtres */}
          <View style={styles.filtresContainer}>
            {/* Période */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {PERIODES.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.chip, periode === p.key && styles.chipActif]}
                  onPress={() => setPeriode(p.key)}
                >
                  <Text style={[styles.chipTexte, periode === p.key && styles.chipTexteActif]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Statut */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipsScroll, { marginTop: 6 }]}>
              {STATUTS.map(s => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.chip, { backgroundColor: statutFiltre === s.key ? s.color : s.bg, borderColor: s.color }]}
                  onPress={() => setStatutFiltre(s.key)}
                >
                  <Text style={[styles.chipTexte, { color: statutFiltre === s.key ? 'white' : s.color }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Recherche numéro */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="🔍 N° facture..."
                keyboardType="numeric"
                value={rechercheNum}
                onChangeText={setRechercheNum}
                onSubmitEditing={() => chargerVentes()}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={() => chargerVentes()}>
                <Text style={styles.searchBtnTexte}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Résumé */}
          {!ventesCharge && (
            <View style={styles.resumeBar}>
              <Text style={styles.resumeTexte}>{ventes.length} facture{ventes.length > 1 ? 's' : ''}</Text>
              <Text style={styles.resumeTotal}>Total : {fmtNum(totalVentes)} FCFA</Text>
            </View>
          )}

          {/* Liste */}
          {ventesCharge ? (
            <View style={styles.centrer}>
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          ) : venteErreur ? (
            <View style={styles.centrer}>
              <Text style={{ color: '#dc2626', marginBottom: 12 }}>{venteErreur}</Text>
              <TouchableOpacity onPress={() => chargerVentes()} style={{ backgroundColor: '#FF6B35', padding: 12, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : ventes.length === 0 ? (
            <View style={styles.centrer}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>📄</Text>
              <Text style={{ color: '#9ca3af', fontSize: 15 }}>Aucune facture pour cette période</Text>
            </View>
          ) : (
            <FlatList
              data={ventes}
              keyExtractor={v => String(v.id)}
              renderItem={({ item }) => <CarteFacture vente={item} />}
              contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
              refreshControl={<RefreshControl refreshing={ventesRaf} onRefresh={() => chargerVentes(true)} colors={['#FF6B35']} />}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centrer:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chargementTexte: { marginTop: 12, color: '#9ca3af', fontSize: 14 },

  header:      { backgroundColor: '#FF6B35', paddingHorizontal: 20, paddingBottom: 14, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitre: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSous:  { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  logoutBtn:   { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  logoutTexte: { color: 'white', fontSize: 13, fontWeight: '500' },

  tabBar:       { flexDirection: 'row', backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingBottom: 0 },
  tabBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnActif:  { borderBottomColor: 'white' },
  tabTexte:     { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  tabTexteActif:{ color: 'white' },

  content:          { padding: 16 },
  date:             { fontSize: 13, color: '#9ca3af', marginBottom: 16, textTransform: 'capitalize' },
  sectionTitreGris: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginTop: 6, marginBottom: 10 },

  cartePeriode:      { borderRadius: 14, padding: 20, marginBottom: 10 },
  cartePeriodeTitre: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  carteRow:          { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  carteLabel:        { fontSize: 11, marginBottom: 4 },
  carteValeur:       { fontSize: 38, fontWeight: '700', lineHeight: 42 },
  carteBenefice:     { fontSize: 26, fontWeight: '700', lineHeight: 30 },
  carteSous:         { fontSize: 12, marginTop: 4 },

  ligneCartes:          { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cartePaiement:        { flex: 1, borderRadius: 12, padding: 12 },
  cartePaiementHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  iconeWrapper:         { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  iconeTexte:           { fontSize: 15 },
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
  refresh:              { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 8, marginBottom: 24 },

  // Filtres Factures
  filtresContainer: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  chipsScroll:      { flexGrow: 0 },
  chip:             { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb', marginRight: 8 },
  chipActif:        { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  chipTexte:        { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTexteActif:   { color: 'white' },

  searchRow:     { flexDirection: 'row', marginTop: 8, gap: 8 },
  searchInput:   { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#f9fafb' },
  searchBtn:     { backgroundColor: '#FF6B35', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  searchBtnTexte:{ color: 'white', fontWeight: '700', fontSize: 14 },

  resumeBar:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff7ed', borderBottomWidth: 1, borderBottomColor: '#fed7aa' },
  resumeTexte:  { fontSize: 13, color: '#c2410c', fontWeight: '600' },
  resumeTotal:  { fontSize: 13, color: '#c2410c', fontWeight: '700' },

  // Carte facture
  carteFacture:       { backgroundColor: 'white', borderRadius: 12, marginBottom: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2 },
  carteFactureHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  factureNum:         { fontSize: 15, fontWeight: '700', color: '#111827' },
  factureDate:        { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  factureSub:         { fontSize: 12, color: '#6b7280', marginTop: 2 },
  factureTotal:       { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'right' },
  factureTotalSub:    { fontSize: 11, color: '#9ca3af', textAlign: 'right' },

  statutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statutTexte: { fontSize: 11, fontWeight: '700' },

  economieBadge: { backgroundColor: '#fef2f2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  economieTexte: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  motifTexte:    { fontSize: 12, color: '#dc2626', marginTop: 6, fontStyle: 'italic' },

  lignesContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  ligneProduit:    { paddingVertical: 4 },
  ligneProduitNom: { fontSize: 13, fontWeight: '600', color: '#374151' },
  ligneProduitDetail: { fontSize: 12, color: '#9ca3af' },

  voirDetail: { fontSize: 12, color: '#FF6B35', fontWeight: '600', marginTop: 8, textAlign: 'center' },
})
