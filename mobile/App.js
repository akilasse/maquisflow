// ============================================================
// APP.JS - Point d'entrée de l'app mobile Flowix
// Navigation par onglets en bas pour le patron
// ============================================================

import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import VentesScreen from './src/screens/VentesScreen'
import AlertesScreen from './src/screens/AlertesScreen'
import TabletteScreen from './src/screens/TabletteScreen'

const Tab = createBottomTabNavigator()

const Navigation = () => {
  const { utilisateur, chargement } = useAuth()
  const insets = useSafeAreaInsets()

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

  // Hauteur de la tab bar adaptée selon l'appareil
  const tabBarHeight = Platform.OS === 'android'
    ? 65 + Math.max(insets.bottom, 10)
    : 60 + insets.bottom

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#FF6B35',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 10,
            height: tabBarHeight,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 2,
          }
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>📊</Text>
            )
          }}
        />
        <Tab.Screen
          name="Ventes"
          component={VentesScreen}
          options={{
            tabBarLabel: 'Ventes',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>🧾</Text>
            )
          }}
        />
        <Tab.Screen
          name="Alertes"
          component={AlertesScreen}
          options={{
            tabBarLabel: 'Alertes',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>⚠️</Text>
            )
          }}
        />
        {utilisateur?.maquis?.module_commandes_actif && (
          <Tab.Screen
            name="Commandes"
            component={TabletteScreen}
            options={{
              tabBarLabel: 'Commandes',
              tabBarIcon: ({ color }) => (
                <Text style={{ fontSize: 22, color }}>🪑</Text>
              )
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