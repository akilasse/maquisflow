// ============================================================
// APP.JS - Point d'entrée de l'app mobile Flowix
// Navigation par onglets en bas pour le patron
// ============================================================

import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState } from 'react'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import VentesScreen from './src/screens/VentesScreen'
import AlertesScreen from './src/screens/AlertesScreen'
import TabletteScreen from './src/screens/TabletteScreen'
import SelectionInterfaceScreen from './src/screens/SelectionInterfaceScreen'

const Tab = createBottomTabNavigator()

const Navigation = () => {
  const { utilisateur, chargement, logout } = useAuth()
  const insets = useSafeAreaInsets()
  const [interfaceChoisie, setInterfaceChoisie] = useState(null)

  if (chargement) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  if (!utilisateur) {
    return <LoginScreen />
  }

  const role = utilisateur?.role
  const moduleCommandes = utilisateur?.maquis?.module_commandes_actif
  const couleur = utilisateur?.maquis?.couleur_primaire || '#FF6B35'
  const estServeur = role === 'serveur'

  // Serveur sans choix → direct Commandes
  // Patron/gérant avec module → écran de sélection
  const doitChoisir = !estServeur && moduleCommandes && !interfaceChoisie
  const interfaceFinale = estServeur ? 'commandes' : (interfaceChoisie || 'dashboard')

  if (doitChoisir) {
    return <SelectionInterfaceScreen onChoix={setInterfaceChoisie} />
  }

  const tabBarHeight = Platform.OS === 'android'
    ? 65 + Math.max(insets.bottom, 10)
    : 60 + insets.bottom

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: couleur,
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 10,
            height: tabBarHeight,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500', marginBottom: 2 }
        }}
      >
        {/* Interface Commandes (serveur ou patron ayant choisi commandes) */}
        {interfaceFinale === 'commandes' && moduleCommandes && (
          <Tab.Screen
            name="Commandes"
            options={{
              tabBarLabel: 'Commandes',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🪑</Text>
            }}
          >
            {(props) => (
              <TabletteScreen
                {...props}
                onRetour={estServeur ? logout : () => setInterfaceChoisie(null)}
              />
            )}
          </Tab.Screen>
        )}

        {/* Interface Dashboard (patron/gérant ayant choisi dashboard) */}
        {interfaceFinale === 'dashboard' && (
          <>
            <Tab.Screen
              name="Dashboard"
              options={{
                tabBarLabel: 'Dashboard',
                tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📊</Text>
              }}
            >
              {(props) => <DashboardScreen {...props} onRetour={() => setInterfaceChoisie(null)} />}
            </Tab.Screen>
            <Tab.Screen
              name="Ventes"
              component={VentesScreen}
              options={{
                tabBarLabel: 'Ventes',
                tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🧾</Text>
              }}
            />
            <Tab.Screen
              name="Alertes"
              component={AlertesScreen}
              options={{
                tabBarLabel: 'Alertes',
                tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚠️</Text>
              }}
            />
          </>
        )}

        {/* Fallback serveur sans module commandes */}
        {estServeur && !moduleCommandes && (
          <Tab.Screen
            name="Accueil"
            component={DashboardScreen}
            options={{
              tabBarLabel: 'Accueil',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>
            }}
          />
        )}
      </Tab.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  )
}