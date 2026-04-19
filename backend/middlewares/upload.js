// ============================================================
// UPLOAD MIDDLEWARE - Gestion des fichiers uploadés
// Multer pour images : produits, utilisateurs, logos
// ============================================================

const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

// Crée les dossiers si nécessaire
const creerDossier = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dossier = 'uploads/'
    if (req.uploadType === 'produit')     dossier = 'uploads/produits/'
    if (req.uploadType === 'utilisateur') dossier = 'uploads/utilisateurs/'
    if (req.uploadType === 'logo')        dossier = 'uploads/logos/'
    creerDossier(dossier)
    cb(null, dossier)
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase()
    const nom      = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, nom)
  }
})

// Filtre : images uniquement
const fileFilter = (req, file, cb) => {
  const typesAutorises = /jpeg|jpg|png|gif|webp/
  const ext  = typesAutorises.test(path.extname(file.originalname).toLowerCase())
  const mime = typesAutorises.test(file.mimetype)
  if (ext && mime) {
    cb(null, true)
  } else {
    cb(new Error('Format non supporté. Utilisez JPG, PNG, GIF ou WEBP'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
})

// Middlewares par type
const uploadProduit = (req, res, next) => {
  req.uploadType = 'produit'
  upload.single('photo')(req, res, next)
}

const uploadUtilisateur = (req, res, next) => {
  req.uploadType = 'utilisateur'
  upload.single('photo')(req, res, next)
}

const uploadLogo = (req, res, next) => {
  req.uploadType = 'logo'
  upload.single('logo')(req, res, next)
}

module.exports = { uploadProduit, uploadUtilisateur, uploadLogo }