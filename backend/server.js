// ============================================================
// MAQUISFLOW - Point d'entrée du serveur
// Lance Express, connecte Prisma, initialise Socket.io
// et charge toutes les routes de l'application
// ============================================================

const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const http = require('http')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')

// Charge les variables du fichier .env
dotenv.config()

// Initialise Express
const app = express()

// Initialise Prisma (connexion à la base de données)
const prisma = new PrismaClient()

// Crée le serveur HTTP (nécessaire pour Socket.io)
const server = http.createServer(app)

// Initialise Socket.io avec autorisation CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// ============================================================
// MIDDLEWARES GLOBAUX
// S'exécutent sur chaque requête avant d'atteindre les routes
// ============================================================

// Autorise les requêtes cross-origin depuis le frontend React
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true
}))

// Permet de lire le JSON dans le body des requêtes
app.use(express.json())

// Permet de lire les formulaires encodés
app.use(express.urlencoded({ extended: true }))

// ============================================================
// INJECTION : rend prisma et io accessibles dans toutes les routes
// ============================================================
app.use((req, res, next) => {
  req.prisma = prisma
  req.io = io
  next()
})

// ============================================================
// ROUTES
// Chaque module a ses propres routes
// ============================================================
app.use('/api/auth', require('./modules/auth/auth.routes'))
app.use('/api/ventes', require('./modules/ventes/ventes.routes'))
app.use('/api/stock', require('./modules/stock/stock.routes'))
app.use('/api/inventaire', require('./modules/inventaire/inventaire.routes'))
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'))
app.use('/api/parametrage', require('./modules/parametrage/parametrage.routes'))
app.use('/api/admin', require('./modules/admin/admin.routes'))

// ============================================================
// ROUTE DE TEST
// Vérifie que le serveur tourne correctement
// ============================================================
app.get('/', (req, res) => {
  res.json({
    message: 'MaquisFlow API en marche',
    version: '1.0.0',
    status: 'OK'
  })
})

// ============================================================
// SOCKET.IO - Gestion des connexions temps réel
// Chaque maquis a sa propre "room" pour recevoir ses updates
// ============================================================
io.on('connection', (socket) => {
  console.log('Client connecté :', socket.id)

  // Le client rejoint la room de son maquis
  socket.on('join:maquis', (maquis_id) => {
    socket.join(`maquis_${maquis_id}`)
    console.log(`Socket ${socket.id} a rejoint maquis_${maquis_id}`)
  })

  socket.on('disconnect', () => {
    console.log('Client déconnecté :', socket.id)
  })
})

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================
const PORT = process.env.PORT || 3000

server.listen(PORT, async () => {
  console.log(`MaquisFlow API démarré sur le port ${PORT}`)
  console.log(`URL : http://localhost:${PORT}`)

  // Teste la connexion à la base de données au démarrage
  try {
    await prisma.$connect()
    console.log('Base de données connectée avec succès')
  } catch (error) {
    console.error('Erreur connexion base de données :', error)
  }
})

// ============================================================
// GESTION PROPRE DE L'ARRÊT DU SERVEUR
// Ferme la connexion Prisma quand on arrête avec Ctrl+C
// ============================================================
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  console.log('Serveur arrêté proprement')
  process.exit(0)
})
