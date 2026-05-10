// ============================================================
// LOGIN SCREEN - Écran de connexion mobile Flowix
// Interface universelle avec sélection établissement
// ============================================================

import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen() {
  const [email, setEmail]             = useState('')
  const [motDePasse, setMotDePasse]   = useState('')
  const [chargement, setChargement]   = useState(false)
  const { login, selectionRequise, etablissements, selectionnerEtablissement, utilisateurTemp, logout } = useAuth()

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
      Alert.alert('Erreur', error.response?.data?.message || 'Email ou mot de passe incorrect')
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

        <Text style={styles.footer}>Flowix — Gestion commerciale</Text>
      </View>
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

  footer: { fontSize: 12, color: '#9ca3af', marginTop: 16 }
})