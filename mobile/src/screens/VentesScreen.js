// ============================================================
// VENTES SCREEN - Ventes + commandes tablette
// Actions selon rôle (gérant/patron) et statut
// Parité avec la page web Ventes & Factures
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Modal,
  RefreshControl, ActivityIndicator, TouchableOpacity,
  TextInput, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const fmtNum  = (n) => Number(n || 0).toLocaleString('fr-FR')
const fmtDate = (d) => {
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
    ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const STATUTS = {
  encaissee:       { label: 'Encaissée',  bg: '#d1fae5', color: '#065f46' },
  en_attente:      { label: 'En attente', bg: '#fef3c7', color: '#92400e' },
  credit_en_cours: { label: 'Crédit',     bg: '#ede9fe', color: '#5b21b6' },
  annulee:         { label: 'Annulée',    bg: '#fee2e2', color: '#991b1b' },
}

const MODES_LABELS = {
  especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money',
  mtn_money: 'MTN MoMo', credit: 'Crédit', autre: 'Autre'
}

export default function VentesScreen() {
  const { utilisateur }  = useAuth()
  const estAdmin         = ['gerant', 'patron'].includes(utilisateur?.role)
  const couleur          = utilisateur?.maquis?.couleur_primaire || '#FF6B35'

  const [ventes,       setVentes]       = useState([])
  const [chargement,   setChargement]   = useState(true)
  const [rafraichis,   setRafraichis]   = useState(false)
  const [onglet,       setOnglet]       = useState('aujourd_hui')
  const [dateDebut,    setDateDebut]    = useState('')
  const [dateFin,      setDateFin]      = useState('')
  const [ouvert,       setOuvert]       = useState(null)
  const [enCours,      setEnCours]      = useState(false)

  // Modals
  const [modaleReduc,  setModaleReduc]  = useState(null)  // réduction
  const [modaleAnnul,  setModaleAnnul]  = useState(null)  // annulation
  const [montantReduc, setMontantReduc] = useState('')
  const [motifReduc,   setMotifReduc]   = useState('')
  const [motifAnnul,   setMotifAnnul]   = useState('')

  // ── Chargement ──────────────────────────────────────────────
  const charger = useCallback(async (ongletActif, debut, fin) => {
    try {
      const auj = new Date().toISOString().split('T')[0]
      let params = ''

      if (ongletActif === 'aujourd_hui') {
        params = `?date_debut=${auj}&date_fin=${auj}`
      } else if (ongletActif === 'semaine') {
        const lun = new Date()
        lun.setDate(lun.getDate() - ((lun.getDay() + 6) % 7))
        params = `?date_debut=${lun.toISOString().split('T')[0]}&date_fin=${auj}`
      } else if (ongletActif === 'ce_mois') {
        const dm = new Date(); dm.setDate(1)
        params = `?date_debut=${dm.toISOString().split('T')[0]}&date_fin=${auj}`
      } else if (ongletActif === 'periode' && debut && fin) {
        params = `?date_debut=${debut}&date_fin=${fin}`
      } else {
        setVentes([]); setChargement(false); setRafraichis(false); return
      }

      const promises = [
        api.get(`/api/ventes${params}`)
          .then(r => (r.data.data || []).map(v => ({ ...v, _type: 'vente' })))
      ]

      // Commandes tablette en attente (toujours chargées pour gérant/patron)
      if (estAdmin) {
        promises.push(
          api.get('/api/commandes?statut=en_attente')
            .then(r => (r.data.data || []).map(c => ({
              ...c, _type: 'commande',
              date_vente: c.created_at,
              total_net: (c.lignes || []).reduce(
                (s, l) => s + parseFloat(l.prix_unitaire) * parseFloat(l.quantite), 0
              ),
              statut: 'en_attente',
            })))
            .catch(() => [])
        )
      }

      const results = await Promise.all(promises)
      setVentes(results.flat().sort((a, b) => new Date(b.date_vente) - new Date(a.date_vente)))
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les ventes')
    } finally {
      setChargement(false); setRafraichis(false)
    }
  }, [estAdmin])

  useEffect(() => {
    setChargement(true)
    charger(onglet, dateDebut, dateFin)
    const interval = setInterval(() => charger(onglet, dateDebut, dateFin), 30000)
    return () => clearInterval(interval)
  }, [onglet, charger])

  const onRefresh = () => { setRafraichis(true); charger(onglet, dateDebut, dateFin) }

  // ── Actions ─────────────────────────────────────────────────

  const reimprimer = async (v) => {
    try {
      await api.post(`/api/commandes/${v.id}/reimprimer`)
      Alert.alert('✅', 'Bon envoyé à l\'imprimante')
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Impossible de réimprimer')
    }
  }

  const confirmerReduction = async () => {
    if (!montantReduc || !motifReduc.trim()) {
      Alert.alert('Champs requis', 'Saisissez le montant et le motif'); return
    }
    setEnCours(true)
    try {
      const url = modaleReduc._type === 'commande'
        ? `/api/commandes/${modaleReduc.id}/reduction`
        : `/api/ventes/${modaleReduc.id}/reduction`
      await api.put(url, { montant: parseFloat(montantReduc), motif: motifReduc })
      setModaleReduc(null); charger(onglet, dateDebut, dateFin)
    } catch (e) { Alert.alert('Erreur', e.response?.data?.message || 'Erreur') }
    finally { setEnCours(false) }
  }

  const confirmerAnnulation = async () => {
    if (!motifAnnul.trim()) {
      Alert.alert('Motif requis', 'Saisissez un motif d\'annulation'); return
    }
    setEnCours(true)
    try {
      const url = modaleAnnul._type === 'commande'
        ? `/api/commandes/${modaleAnnul.id}/annuler`
        : `/api/ventes/${modaleAnnul.id}/annuler`
      await api.put(url, { motif: motifAnnul })
      setModaleAnnul(null); charger(onglet, dateDebut, dateFin)
    } catch (e) { Alert.alert('Erreur', e.response?.data?.message || 'Erreur') }
    finally { setEnCours(false) }
  }

  const offrir = async (v) => {
    Alert.alert(
      '🎁 Offrir ?',
      'La totalité du montant sera remisé.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: async () => {
          try {
            const isCmd = v._type === 'commande'
            const tot = isCmd
              ? (v.lignes || []).reduce((s, l) => s + parseFloat(l.prix_unitaire) * parseFloat(l.quantite), 0)
              : parseFloat(v.total_net)
            const url = isCmd
              ? `/api/commandes/${v.id}/reduction`
              : `/api/ventes/${v.id}/reduction`
            await api.put(url, { montant: tot, motif: 'Offert' })
            charger(onglet, dateDebut, dateFin)
          } catch (e) { Alert.alert('Erreur', e.response?.data?.message || 'Erreur') }
        }}
      ]
    )
  }

  // ── Résumé ──────────────────────────────────────────────────
  const ventesSeules = ventes.filter(v => v._type !== 'commande')
  const totalNet     = ventesSeules.filter(v => v.statut !== 'annulee').reduce((s, v) => s + parseFloat(v.total_net || 0), 0)
  const nbActives    = ventesSeules.filter(v => v.statut !== 'annulee').length
  const nbCommandes  = ventes.filter(v => v._type === 'commande').length

  if (chargement) return (
    <View style={s.centrer}><ActivityIndicator size="large" color={couleur} /></View>
  )

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: couleur }]}>
        <Text style={s.headerLabel}>Ventes & Factures</Text>
        <Text style={s.headerTotal}>{fmtNum(totalNet)} XOF</Text>
        <Text style={s.headerSous}>
          {nbActives} vente{nbActives > 1 ? 's' : ''}
          {nbCommandes > 0 ? ` · ${nbCommandes} commande${nbCommandes > 1 ? 's' : ''} en attente` : ''}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={rafraichis} onRefresh={onRefresh} colors={[couleur]} />}
      >
        {/* Onglets */}
        <View style={s.onglets}>
          {[
            { key: 'aujourd_hui', label: "Aujourd'hui" },
            { key: 'semaine',     label: 'Semaine' },
            { key: 'ce_mois',     label: 'Mois' },
            { key: 'periode',     label: '📅 Dates' },
          ].map(o => (
            <TouchableOpacity key={o.key} onPress={() => setOnglet(o.key)}
              style={[s.ongletBtn, onglet === o.key && { backgroundColor: couleur }]}>
              <Text style={[s.ongletTxt, onglet === o.key && { color: 'white' }]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Saisie dates */}
        {onglet === 'periode' && (
          <View style={s.periodeForm}>
            <TextInput style={s.dateInput} placeholder="Début AAAA-MM-JJ"
              value={dateDebut} onChangeText={setDateDebut} placeholderTextColor="#9ca3af" />
            <TextInput style={s.dateInput} placeholder="Fin AAAA-MM-JJ"
              value={dateFin} onChangeText={setDateFin} placeholderTextColor="#9ca3af" />
            <TouchableOpacity style={[s.btnRechercher, { backgroundColor: couleur }]}
              onPress={() => { if (dateDebut && dateFin) { setChargement(true); charger('periode', dateDebut, dateFin) } }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>🔍 Rechercher</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Liste */}
        <View style={s.liste}>
          {ventes.length === 0 ? (
            <View style={s.vide}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🧾</Text>
              <Text style={{ color: '#9ca3af', fontSize: 15, textAlign: 'center' }}>
                {onglet === 'periode' && (!dateDebut || !dateFin)
                  ? 'Saisissez une plage de dates'
                  : 'Aucune vente sur cette période'}
              </Text>
            </View>
          ) : ventes.map(v => {
            const isCmd   = v._type === 'commande'
            const key     = isCmd ? `cmd_${v.id}` : String(v.id)
            const ouv     = ouvert === key
            const annulee = v.statut === 'annulee'
            const badge   = STATUTS[v.statut] || { label: v.statut, bg: '#f3f4f6', color: '#374151' }

            const brut   = isCmd
              ? (v.lignes || []).reduce((s, l) => s + parseFloat(l.prix_unitaire) * parseFloat(l.quantite), 0)
              : parseFloat(v.total_net || 0)
            const remise = parseFloat(v.remise_montant || v.reduction_montant || 0)
            const total  = Math.max(0, brut - remise)
            const tAgo   = v.created_at
              ? Math.floor((Date.now() - new Date(v.created_at)) / 60000)
              : 0

            const borderColor = isCmd ? '#fb923c'
              : annulee             ? '#fecaca'
              : v.statut === 'encaissee'       ? '#86efac'
              : v.statut === 'credit_en_cours' ? '#c4b5fd'
              : '#fde68a'

            return (
              <View key={key} style={[s.card, annulee && s.cardAnnulee, { borderLeftColor: borderColor }]}>

                {/* Ligne principale cliquable */}
                <TouchableOpacity style={s.cardHeader} onPress={() => setOuvert(ouv ? null : key)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <Text style={s.cardTitre}>
                        {isCmd
                          ? (v.table ? `Table ${v.table.numero} · #${v.numero_journee || v.numero}` : `Cmd #${v.numero_journee || v.numero}`)
                          : fmtDate(v.date_vente)}
                      </Text>
                      <View style={[s.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[s.badgeTxt, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                      {isCmd && (
                        <View style={[s.badge, { backgroundColor: '#fff7ed' }]}>
                          <Text style={[s.badgeTxt, { color: '#ea580c' }]}>Tablette</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.cardSub} numberOfLines={1}>
                      {isCmd
                        ? `${v.serveur?.nom ? v.serveur.nom + ' · ' : ''}${tAgo} min · ${(v.lignes || []).length} article(s)`
                        : `${v.caissier?.nom ? 'Caissier: ' + v.caissier.nom : ''} · ${MODES_LABELS[v.mode_paiement] || v.mode_paiement}`}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={[s.cardMontant, annulee && s.montantBarré]}>
                      {fmtNum(total)} XOF
                    </Text>
                    {remise > 0 && (
                      <Text style={{ fontSize: 11, color: '#9333ea' }}>- {fmtNum(remise)} remise</Text>
                    )}
                    <Text style={[s.chevron, { transform: [{ rotate: ouv ? '90deg' : '0deg' }] }]}>›</Text>
                  </View>
                </TouchableOpacity>

                {/* Détail déroulant */}
                {ouv && (
                  <View style={s.detail}>

                    {/* Articles */}
                    {(v.lignes || []).map((l, i) => (
                      <View key={i} style={s.ligne}>
                        <Text style={s.ligneNom} numberOfLines={2}>
                          {l.produit?.nom || `Produit #${l.produit_id}`}
                          {l.variante_nom ? ` (${l.variante_nom})` : ''}
                        </Text>
                        <Text style={s.ligneSub}>{parseFloat(l.quantite)}× {fmtNum(l.prix_unitaire)}</Text>
                        <Text style={s.ligneTotal}>
                          {fmtNum(parseFloat(l.prix_unitaire) * parseFloat(l.quantite))} XOF
                        </Text>
                      </View>
                    ))}

                    {/* Total */}
                    <View style={[s.ligne, s.totalLigne]}>
                      <Text style={s.totalLabel}>Total</Text>
                      <Text style={[s.ligneTotal, { fontSize: 15, color: couleur }]}>{fmtNum(total)} XOF</Text>
                    </View>

                    {/* Notes */}
                    {(v.remise_motif || v.reduction_motif) && (
                      <View style={[s.noteBox, { backgroundColor: '#fdf4ff' }]}>
                        <Text style={{ fontSize: 12, color: '#7e22ce' }}>
                          Réduction : {fmtNum(remise)} XOF — {v.remise_motif || v.reduction_motif}
                        </Text>
                      </View>
                    )}
                    {v.annulation_motif && (
                      <View style={[s.noteBox, { backgroundColor: '#fef2f2' }]}>
                        <Text style={{ fontSize: 12, color: '#991b1b' }}>
                          Annulation : {v.annulation_motif}
                        </Text>
                      </View>
                    )}
                    {v.note && (
                      <View style={[s.noteBox, { backgroundColor: '#f9fafb' }]}>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>Note : {v.note}</Text>
                      </View>
                    )}

                    {/* ── ACTIONS (gérant / patron uniquement) ── */}
                    {!annulee && estAdmin && (
                      <View style={s.actions}>

                        {/* 🖨 Réimprimer — commandes tablette uniquement */}
                        {isCmd && (
                          <TouchableOpacity
                            style={[s.btnAction, { backgroundColor: '#f0f9ff' }]}
                            onPress={() => reimprimer(v)}>
                            <Text style={[s.btnActionTxt, { color: '#0369a1' }]}>🖨 Réimprimer bon</Text>
                          </TouchableOpacity>
                        )}

                        {/* % Réduction — encaissée / en_attente / crédit */}
                        {['encaissee', 'en_attente', 'credit_en_cours'].includes(v.statut) && (
                          <TouchableOpacity
                            style={[s.btnAction, { backgroundColor: '#fdf4ff' }]}
                            onPress={() => { setModaleReduc(v); setMontantReduc(''); setMotifReduc('') }}>
                            <Text style={[s.btnActionTxt, { color: '#7e22ce' }]}>% Réduction</Text>
                          </TouchableOpacity>
                        )}

                        {/* 🎁 Offert — en_attente uniquement */}
                        {v.statut === 'en_attente' && (
                          <TouchableOpacity
                            style={[s.btnAction, { backgroundColor: '#f0fdf4' }]}
                            onPress={() => offrir(v)}>
                            <Text style={[s.btnActionTxt, { color: '#15803d' }]}>🎁 Offert</Text>
                          </TouchableOpacity>
                        )}

                        {/* ✕ Annuler */}
                        <TouchableOpacity
                          style={[s.btnAction, { backgroundColor: '#fef2f2' }]}
                          onPress={() => { setModaleAnnul(v); setMotifAnnul('') }}>
                          <Text style={[s.btnActionTxt, { color: '#991b1b' }]}>✕ Annuler</Text>
                        </TouchableOpacity>

                      </View>
                    )}
                  </View>
                )}
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* ── MODAL RÉDUCTION ────────────────────────────────── */}
      <Modal visible={!!modaleReduc} transparent animationType="slide" onRequestClose={() => setModaleReduc(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitre}>
              % Réduction —{' '}
              {modaleReduc?._type === 'commande'
                ? `Cmd #${modaleReduc?.numero || modaleReduc?.id}`
                : `Vente #${modaleReduc?.id}`}
            </Text>
            <View style={[s.noteBox, { backgroundColor: '#f9fafb', marginBottom: 14 }]}>
              <Text style={{ fontSize: 14, color: '#374151' }}>
                Total : <Text style={{ fontWeight: '700', color: couleur }}>
                  {fmtNum(
                    modaleReduc?._type === 'commande'
                      ? (modaleReduc?.lignes || []).reduce((s, l) => s + parseFloat(l.prix_unitaire) * parseFloat(l.quantite), 0)
                      : modaleReduc?.total_net
                  )} XOF
                </Text>
              </Text>
            </View>

            <Text style={s.inputLabel}>Montant de la réduction (XOF)</Text>
            <TextInput
              style={s.inputModal} keyboardType="numeric" placeholder="Ex: 500"
              value={montantReduc} onChangeText={setMontantReduc} placeholderTextColor="#9ca3af" />

            <Text style={s.inputLabel}>Motif</Text>
            <TextInput
              style={[s.inputModal, { marginBottom: 20 }]} placeholder="Ex: Fidélité client"
              value={motifReduc} onChangeText={setMotifReduc} placeholderTextColor="#9ca3af" />

            <TouchableOpacity
              style={[s.btnConfirmer, { backgroundColor: couleur }]}
              onPress={confirmerReduction} disabled={enCours}>
              {enCours
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={s.btnConfirmerTxt}>✓ Appliquer la réduction</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModaleReduc(null)} style={{ alignItems: 'center', padding: 14 }}>
              <Text style={{ color: '#9ca3af', fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL ANNULATION ───────────────────────────────── */}
      <Modal visible={!!modaleAnnul} transparent animationType="slide" onRequestClose={() => setModaleAnnul(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitre}>
              ✕ Annuler —{' '}
              {modaleAnnul?._type === 'commande'
                ? `Cmd #${modaleAnnul?.numero || modaleAnnul?.id}`
                : `Vente #${modaleAnnul?.id}`}
            </Text>
            <Text style={s.inputLabel}>Motif d'annulation</Text>
            <TextInput
              style={[s.inputModal, { marginBottom: 20 }]}
              placeholder="Ex: Erreur de commande"
              value={motifAnnul} onChangeText={setMotifAnnul} placeholderTextColor="#9ca3af" />

            <TouchableOpacity
              style={[s.btnConfirmer, { backgroundColor: '#dc2626' }]}
              onPress={confirmerAnnulation} disabled={enCours}>
              {enCours
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={s.btnConfirmerTxt}>✕ Confirmer l'annulation</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModaleAnnul(null)} style={{ alignItems: 'center', padding: 14 }}>
              <Text style={{ color: '#9ca3af', fontWeight: '600' }}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centrer:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header:      { padding: 20, paddingBottom: 16, alignItems: 'center' },
  headerLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  headerTotal: { color: 'white', fontSize: 32, fontWeight: '800' },
  headerSous:  { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },

  // Onglets
  onglets:   { flexDirection: 'row', backgroundColor: 'white', margin: 12, borderRadius: 12, padding: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06 },
  ongletBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  ongletTxt: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },

  // Période
  periodeForm:   { paddingHorizontal: 12, marginBottom: 8 },
  dateInput:     { backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', marginBottom: 8 },
  btnRechercher: { borderRadius: 10, padding: 14, alignItems: 'center' },

  // Liste
  liste: { padding: 12, paddingBottom: 80 },
  vide:  { alignItems: 'center', paddingVertical: 60 },

  // Carte
  card:         { backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', borderLeftWidth: 4, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  cardAnnulee:  { opacity: 0.65 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  cardTitre:    { fontSize: 14, fontWeight: '700', color: '#111827', flexShrink: 1 },
  cardSub:      { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  cardMontant:  { fontSize: 15, fontWeight: '800', color: '#111827' },
  montantBarré: { color: '#9ca3af', textDecorationLine: 'line-through' },
  chevron:      { fontSize: 20, color: '#d1d5db', marginTop: 4 },

  // Badge statut
  badge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  // Détail déroulant
  detail:     { borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 14, backgroundColor: '#fafafa' },
  ligne:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 4 },
  ligneNom:   { flex: 1, fontSize: 13, fontWeight: '500', color: '#374151' },
  ligneSub:   { fontSize: 12, color: '#9ca3af', minWidth: 70, textAlign: 'right' },
  ligneTotal: { fontSize: 13, fontWeight: '700', color: '#111827', minWidth: 80, textAlign: 'right' },
  totalLigne: { borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 4, paddingTop: 10 },
  totalLabel: { flex: 1, fontWeight: '700', color: '#374151', fontSize: 13 },
  noteBox:    { borderRadius: 8, padding: 10, marginTop: 8 },

  // Boutons actions
  actions:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  btnAction:    { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnActionTxt: { fontSize: 13, fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitre:   { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  inputLabel:   { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputModal:   { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827', marginBottom: 12 },
  btnConfirmer: { padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnConfirmerTxt: { color: 'white', fontSize: 15, fontWeight: '700' },
})
