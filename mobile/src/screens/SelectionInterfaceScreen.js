// ============================================================
// SELECTION INTERFACE — Choix de l'interface après login
// Affiché pour les rôles qui ont accès à plusieurs parties
// ============================================================

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'

export default function SelectionInterfaceScreen({ onChoix }) {
  const { utilisateur, logout } = useAuth()

  const couleur = utilisateur?.maquis?.couleur_primaire || '#FF6B35'
  const moduleCommandes = utilisateur?.maquis?.module_commandes_actif

  const options = []

  if (['patron', 'gerant'].includes(utilisateur?.role)) {
    options.push({ id: 'dashboard', icone: '📊', titre: 'Tableau de bord', desc: 'Stats, ventes, alertes' })
  }
  if (moduleCommandes) {
    options.push({ id: 'commandes', icone: '🪑', titre: 'Prise de commande', desc: 'Tablette serveur — prendre des commandes' })
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: couleur }]}>
          <Text style={styles.welcome}>Bonjour, {utilisateur?.nom?.split(' ')[0]} 👋</Text>
          <Text style={styles.maquis}>{utilisateur?.maquis?.nom}</Text>
          <Text style={styles.role}>{utilisateur?.role}</Text>
        </View>

        <Text style={styles.question}>Que voulez-vous faire ?</Text>

        <View style={styles.options}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionCard, { borderColor: couleur }]}
              onPress={() => onChoix(opt.id)}
            >
              <Text style={styles.optionIcone}>{opt.icone}</Text>
              <View>
                <Text style={styles.optionTitre}>{opt.titre}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={logout} style={styles.btnLogout}>
          <Text style={styles.btnLogoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content:   { flex: 1 },
  header: {
    padding: 28, paddingBottom: 24,
    alignItems: 'center',
  },
  welcome:  { color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  maquis:   { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600' },
  role: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4,
    textTransform: 'capitalize',
  },
  question: {
    fontSize: 18, fontWeight: '700', color: '#374151',
    textAlign: 'center', marginVertical: 28,
  },
  options: { paddingHorizontal: 20, gap: 14 },
  optionCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  optionIcone: { fontSize: 36 },
  optionTitre: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 3 },
  optionDesc:  { fontSize: 13, color: '#9ca3af' },
  btnLogout: {
    marginTop: 'auto', marginBottom: 20, alignItems: 'center', padding: 16,
  },
  btnLogoutText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
})
