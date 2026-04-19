// ============================================================
// Flowix - Point d'entrée du serveur
// ============================================================

const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const http = require('http')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')

dotenv.config()

const app    = express()
const prisma = new PrismaClient()
const server = http.createServer(app)

const originesAutorisees = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'https://maquisflow.com',
  'https://www.maquisflow.com'
]

const io = new Server(server, {
  cors: { origin: originesAutorisees, methods: ['GET', 'POST'], credentials: true }
})

// ============================================================
// MIDDLEWARES GLOBAUX
// ============================================================
app.use(cors({ origin: originesAutorisees, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Sert les fichiers uploadés (images produits, logos, photos)
app.use('/uploads', express.static('uploads'))

// ============================================================
// INJECTION prisma et io
// ============================================================
app.use((req, res, next) => {
  req.prisma = prisma
  req.io = io
  next()
})

// ============================================================
// ROUTES
// ============================================================
app.use('/api/auth',        require('./modules/auth/auth.routes'))
app.use('/api/ventes',      require('./modules/ventes/ventes.routes'))
app.use('/api/stock',       require('./modules/stock/stock.routes'))
app.use('/api/inventaire',  require('./modules/inventaire/inventaire.routes'))
app.use('/api/dashboard',   require('./modules/dashboard/dashboard.routes'))
app.use('/api/parametrage', require('./modules/parametrage/parametrage.routes'))
app.use('/api/admin',       require('./modules/admin/admin.routes'))

app.get('/', (req, res) => {
  res.json({ message: 'Flowix API en marche', version: '2.0.0', status: 'OK' })
})

// ============================================================
// SOCKET.IO
// ============================================================
io.on('connection', (socket) => {
  console.log('Client connecté :', socket.id)
  socket.on('join:maquis', (maquis_id) => {
    socket.join(`maquis_${maquis_id}`)
    console.log(`Socket ${socket.id} a rejoint maquis_${maquis_id}`)
  })
  socket.on('disconnect', () => {
    console.log('Client déconnecté :', socket.id)
  })
})

// ============================================================
// DÉMARRAGE
// ============================================================
const PORT = process.env.PORT || 3000

server.listen(PORT, async () => {
  console.log(`Flowix API démarré sur le port ${PORT}`)
  console.log(`URL : http://localhost:${PORT}`)
  try {
    await prisma.$connect()
    console.log('Base de données connectée avec succès')
  } catch (error) {
    console.error('Erreur connexion base de données :', error)
  }
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  console.log('Serveur arrêté proprement')
  process.exit(0)
})