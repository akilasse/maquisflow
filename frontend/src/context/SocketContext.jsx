// ============================================================
// SOCKET CONTEXT - Gestion globale du temps réel
// Connecte l'app au serveur Socket.io
// Accessible dans toute l'application via useSocket()
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
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
      console.log('Socket connecté au maquis:', utilisateur.maquis.id)
    })

    nouveauSocket.on('disconnect', () => {
      setConnecte(false)
      console.log('Socket déconnecté')
    })

    setSocket(nouveauSocket)

    // Nettoie la connexion quand l'utilisateur se déconnecte
    return () => {
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