// ============================================================
// SOCKET CONTEXT - Gestion globale du temps réel
// Connecte l'app au serveur Socket.io
// Accessible dans toute l'application via useSocket()
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { utilisateur } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connecte, setConnecte] = useState(false)

  useEffect(() => {
    if (!utilisateur) return

    // Crée la connexion Socket.io
    const nouveauSocket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: {
        token: localStorage.getItem('accessToken')
      }
    })

    // Rejoint la room du maquis pour recevoir les updates
    nouveauSocket.on('connect', () => {
      setConnecte(true)
      nouveauSocket.emit('join:maquis', utilisateur.maquis.id)
    })

    // Met à jour le token avant chaque reconnexion
    nouveauSocket.io.on('reconnect_attempt', () => {
      nouveauSocket.auth.token = localStorage.getItem('accessToken')
    })

    nouveauSocket.on('disconnect', () => {
      setConnecte(false)
    })

    setSocket(nouveauSocket)

    // Rafraîchit le token et reconnecte le socket quand l'onglet redevient visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          {}, { withCredentials: true }
        )
        const token = res.data.data.accessToken
        localStorage.setItem('accessToken', token)
        nouveauSocket.auth.token = token
      } catch {}
      if (!nouveauSocket.connected) {
        nouveauSocket.connect()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Nettoie la connexion quand l'utilisateur se déconnecte
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      nouveauSocket.disconnect()
    }
  }, [utilisateur])

  return (
    <SocketContext.Provider value={{ socket, connecte }}>
      {children}
    </SocketContext.Provider>
  )
}

// Hook personnalisé pour utiliser le contexte Socket
export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket doit être utilisé dans SocketProvider')
  }
  return context
}