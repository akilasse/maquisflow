// ============================================================
// LOGIN SCREEN - Écran de connexion mobile
// Choix de l'espace (Maquis ou Restaurant) avant connexion
// ============================================================

import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { useAuth } from '../context/AuthContext'

const ESPACES = [
  { type: 'maquis',      label: 'Maquis',      icone: '🍺', bg: '#FF6B35', bgInactif: '#fff7ed', texteInactif: '#FF6B35' },
  { type: 'restaurant',  label: 'Restaurant',   icone: '🍽️', bg: '#1D4ED8', bgInactif: '#eff6ff', texteInactif: '#1D4ED8' },
]

export default function LoginScreen() {
  const [type, setType]           = useState('maquis')
  const [email, setEmail]         = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [chargement, setChargement] = useState(false)
  const { login } = useAuth()

  const espaceActif = ESPACES.find(e => e.type === type)

  const handleLogin = async () => {
    if (!email || !motDePasse) {
      Alert.alert('Erreur', 'Email et mot de passe requis')
      return
    }
    setChargement(true)
    try {
      await login(email, motDePasse, type)
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur de connexion')
    } finally {
      setChargement(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>

        {/* Logo */}
        <View style={[styles.logo, { backgroundColor: espaceActif.bg }]}>
          <Text style={styles.logoIcone}>{espaceActif.icone}</Text>
        </View>
        <Text style={styles.titre}>MaquisFlow</Text>
        <Text style={styles.sousTitre}>Gestion commerciale</Text>

        {/* Choix de l'espace */}
        <Text style={styles.choixLabel}>Choisissez votre espace</Text>
        <View style={styles.choixRow}>
          {ESPACES.map(espace => {
            const actif = type === espace.type
            return (
              <TouchableOpacity
                key={espace.type}
                onPress={() => setType(espace.type)}
                style={[
                  styles.choixBtn,
                  {
                    backgroundColor: actif ? espace.bg : espace.bgInactif,
                    borderColor:     actif ? espace.bg : '#e5e7eb',
                    borderWidth:     actif ? 2 : 1,
                  }
                ]}
              >
                <Text style={styles.choixIcone}>{espace.icone}</Text>
                <Text style={[styles.choixTexte, { color: actif ? 'white' : espace.texteInactif }]}>
                  {espace.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Formulaire */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
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
          style={[styles.bouton, { backgroundColor: espaceActif.bg }]}
          onPress={handleLogin}
          disabled={chargement}
        >
          {chargement
            ? <ActivityIndicator color="white" />
            : <Text style={styles.boutonTexte}>Se connecter — {espaceActif.label}</Text>
          }
        </TouchableOpacity>

        <Text style={styles.footer}>MaquisFlow v1.0</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  logo: {
    width: 72, height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  logoIcone:  { fontSize: 32 },
  titre:      { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  sousTitre:  { fontSize: 13, color: '#9ca3af', marginBottom: 20 },

  choixLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 },
  choixRow:   { flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%' },
  choixBtn: {
    flex: 1, borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 6
  },
  choixIcone: { fontSize: 24 },
  choixTexte: { fontSize: 14, fontWeight: '700' },

  input: {
    width: '100%', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, padding: 14, fontSize: 15,
    color: '#111827', marginBottom: 12
  },
  bouton: {
    width: '100%', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 4
  },
  boutonTexte: { color: 'white', fontSize: 16, fontWeight: '600' },
  footer:      { fontSize: 12, color: '#9ca3af', marginTop: 16 }
})