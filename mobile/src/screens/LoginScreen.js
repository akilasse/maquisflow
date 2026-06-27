// ============================================================
// LOGIN SCREEN - Écran de connexion mobile Flowix
// Interface universelle avec sélection établissement
// ============================================================

import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView, Modal
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function LoginScreen() {
  const [email, setEmail]             = useState('')
  const [motDePasse, setMotDePasse]   = useState('')
  const [chargement, setChargement]   = useState(false)
  const { login, selectionRequise, etablissements, selectionnerEtablissement, utilisateurTemp, logout } = useAuth()

  // Mot de passe oublié
  const [voirOubli, setVoirOubli]     = useState(false)
  const [emailOubli, setEmailOubli]   = useState('')
  const [oubliLoad, setOubliLoad]     = useState(false)
  const [oubliOk, setOubliOk]         = useState(false)

  const handleForgot = async () => {
    if (!emailOubli) return Alert.alert('', 'Veuillez entrer votre email')
    setOubliLoad(true)
    try {
      await api.post('/api/auth/forgot-password', { email: emailOubli })
      setOubliOk(true)
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue. Réessayez.')
    } finally {
      setOubliLoad(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !motDePasse) {
      Alert.alert('Erreur', 'Email/login et mot de passe requis')
      return
    }
    setChargement(true)
    try {
      const resultat = await login(email, motDePasse)
      // Si selection_requise, le contexte affichera l'écran de sélection
    } catch (error) {
      if (!error.response) {
        Alert.alert('Hors ligne', 'Serveur inaccessible — vérifiez votre connexion internet')
      } else {
        Alert.alert('Erreur', error.response.data?.message || 'Email ou mot de passe incorrect')
      }
    } finally {
      setChargement(false)
    }
  }

  const handleSelection = async (maquis_id) => {
    setChargement(true)
    try {
      await selectionnerEtablissement(maquis_id)
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur de sélection')
    } finally {
      setChargement(false)
    }
  }

  // Écran sélection établissement
  if (selectionRequise && etablissements.length > 0) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>

            <View style={styles.logo}>
              <Text style={styles.logoIcone}>⚡</Text>
            </View>
            <Text style={styles.titre}>Choisir un établissement</Text>
            <Text style={styles.sousTitre}>Bonjour {utilisateurTemp?.nom}</Text>

            <View style={styles.etablissementsList}>
              {etablissements.map(etab => (
                <TouchableOpacity
                  key={etab.maquis_id}
                  onPress={() => handleSelection(etab.maquis_id)}
                  disabled={chargement}
                  style={[styles.etablissementBtn, { borderColor: etab.couleur_primaire || '#FF6B35' }]}
                >
                  <View style={[styles.etablissementIcone, { backgroundColor: etab.couleur_primaire || '#FF6B35' }]}>
                    <Text style={styles.etablissementInitiale}>
                      {etab.nom?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.etablissementInfo}>
                    <Text style={styles.etablissementNom}>{etab.nom}</Text>
                    <Text style={styles.etablissementType}>
                      {etab.activite || etab.type} · <Text style={{ color: etab.couleur_primaire || '#FF6B35', textTransform: 'capitalize' }}>{etab.role}</Text>
                    </Text>
                  </View>
                  <Text style={[styles.etablissementArrow, { color: etab.couleur_primaire || '#FF6B35' }]}>→</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.retourBtn} onPress={logout}>
              <Text style={styles.retourTexte}>← Changer de compte</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>Flowix — Gestion commerciale</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // Écran login
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>

        <View style={styles.logo}>
          <Text style={styles.logoIcone}>⚡</Text>
        </View>
        <Text style={styles.titre}>Flowix</Text>
        <Text style={styles.sousTitre}>Gestion commerciale intelligente</Text>

        <TextInput
          style={styles.input}
          placeholder="Email ou login"
          value={email}
          onChangeText={setEmail}
          keyboardType="default"
          autoCapitalize="none"
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={motDePasse}
          onChangeText={setMotDePasse}
          secureTextEntry
          placeholderTextColor="#9ca3af"
        />

        <TouchableOpacity
          style={styles.bouton}
          onPress={handleLogin}
          disabled={chargement}
        >
          {chargement
            ? <ActivityIndicator color="white" />
            : <Text style={styles.boutonTexte}>Se connecter</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setVoirOubli(true); setOubliOk(false); setEmailOubli('') }} style={{ marginTop: 14 }}>
          <Text style={{ color: '#FF6B35', fontSize: 13, fontWeight: '600' }}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Flowix — Gestion commerciale</Text>
      </View>

      {/* Modal mot de passe oublié */}
      <Modal visible={voirOubli} transparent animationType="fade" onRequestClose={() => setVoirOubli(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitre}>🔑 Mot de passe oublié</Text>
            {oubliOk ? (
              <Text style={styles.modalSucces}>
                ✅ Si cet email est connu, un lien de réinitialisation vous a été envoyé. Vérifiez votre boîte mail.
              </Text>
            ) : (
              <>
                <Text style={styles.modalDesc}>
                  Entrez l'email utilisé lors de la création de votre compte pour recevoir un lien de réinitialisation.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="votre@email.com"
                  value={emailOubli}
                  onChangeText={setEmailOubli}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity style={styles.bouton} onPress={handleForgot} disabled={oubliLoad}>
                  {oubliLoad
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.boutonTexte}>Envoyer le lien</Text>
                  }
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.retourBtn} onPress={() => setVoirOubli(false)}>
              <Text style={styles.retourTexte}>← Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    padding: 20
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6
  },
  logo: {
    width: 80, height: 80,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  logoIcone:  { fontSize: 36 },
  titre:      { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sousTitre:  { fontSize: 14, color: '#9ca3af', marginBottom: 24 },

  input: {
    width: '100%', borderWidth: 2, borderColor: '#f3f4f6',
    borderRadius: 12, padding: 14, fontSize: 15,
    color: '#111827', marginBottom: 12, backgroundColor: '#f9fafb'
  },
  bouton: {
    width: '100%', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 4,
    backgroundColor: '#FF6B35'
  },
  boutonTexte: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Sélection établissement
  etablissementsList: { width: '100%', gap: 12, marginBottom: 20 },
  etablissementBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14, borderWidth: 2,
    backgroundColor: 'white'
  },
  etablissementIcone: {
    width: 48, height: 48, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center'
  },
  etablissementInitiale: { fontSize: 22, color: 'white', fontWeight: '700' },
  etablissementInfo:     { flex: 1 },
  etablissementNom:      { fontSize: 16, fontWeight: '700', color: '#111827' },
  etablissementType:     { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  etablissementArrow:    { fontSize: 20 },

  retourBtn: {
    width: '100%', padding: 14, borderRadius: 12,
    borderWidth: 2, borderColor: '#f3f4f6',
    alignItems: 'center', marginBottom: 8
  },
  retourTexte: { fontSize: 14, fontWeight: '600', color: '#6b7280' },

  footer: { fontSize: 12, color: '#9ca3af', marginTop: 16 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 380,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10
  },
  modalTitre:  { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10 },
  modalDesc:   { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
  modalSucces: { fontSize: 13, color: '#15803d', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, marginBottom: 16, lineHeight: 20 }
})