// ============================================================
// PARAMETRAGE CONTROLLER - Reçoit les requêtes HTTP
// ============================================================

const service = require('./parametrage.service')
const path    = require('path')

// ====== PRODUITS ======
const getProduits = async (req, res) => {
  try {
    const data = await service.getProduits(req.prisma, req.utilisateur.maquis_id)
    res.json({ success: true, data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const creerProduit = async (req, res) => {
  try {
    const data = await service.creerProduit(req.prisma, req.utilisateur.maquis_id, req.body)
    res.status(201).json({ success: true, message: 'Produit créé', data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const modifierProduit = async (req, res) => {
  try {
    const data = await service.modifierProduit(req.prisma, parseInt(req.params.id), req.utilisateur.maquis_id, req.body)
    res.json({ success: true, message: 'Produit modifié', data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const uploadPhotoProduit = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu' })
    const photo_url = `/uploads/produits/${req.file.filename}`
    const data = await service.modifierProduit(req.prisma, parseInt(req.params.id), req.utilisateur.maquis_id, { photo_url })
    res.json({ success: true, message: 'Photo uploadée', data, photo_url })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// ====== FOURNISSEURS ======
const getFournisseurs = async (req, res) => {
  try {
    const data = await service.getFournisseurs(req.prisma, req.utilisateur.maquis_id)
    res.json({ success: true, data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const creerFournisseur = async (req, res) => {
  try {
    const data = await service.creerFournisseur(req.prisma, req.utilisateur.maquis_id, req.body)
    res.status(201).json({ success: true, message: 'Fournisseur créé', data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const modifierFournisseur = async (req, res) => {
  try {
    const data = await service.modifierFournisseur(req.prisma, parseInt(req.params.id), req.utilisateur.maquis_id, req.body)
    res.json({ success: true, message: 'Fournisseur modifié', data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// ====== UTILISATEURS ======
const getUtilisateurs = async (req, res) => {
  try {
    const data = await service.getUtilisateurs(req.prisma, req.utilisateur.maquis_id)
    res.json({ success: true, data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const creerUtilisateur = async (req, res) => {
  try {
    const data = await service.creerUtilisateur(req.prisma, req.utilisateur.maquis_id, req.body)
    res.status(201).json({ success: true, message: 'Utilisateur créé', data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const modifierUtilisateur = async (req, res) => {
  try {
    const data = await service.modifierUtilisateur(req.prisma, parseInt(req.params.id), req.utilisateur.maquis_id, req.body)
    res.json({ success: true, message: 'Utilisateur modifié', data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const uploadPhotoUtilisateur = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu' })
    const photo_url = `/uploads/utilisateurs/${req.file.filename}`
    const data = await service.modifierUtilisateur(req.prisma, parseInt(req.params.id), req.utilisateur.maquis_id, { photo_url })
    res.json({ success: true, message: 'Photo uploadée', data, photo_url })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

// ====== MAQUIS ======
const getMaquis = async (req, res) => {
  try {
    const data = await service.getMaquis(req.prisma, req.utilisateur.maquis_id)
    res.json({ success: true, data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const modifierMaquis = async (req, res) => {
  try {
    const data = await service.modifierMaquis(req.prisma, req.utilisateur.maquis_id, req.body)
    res.json({ success: true, message: 'Paramètres mis à jour', data })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const uploadLogoMaquis = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu' })
    const logo_url = `/uploads/logos/${req.file.filename}`
    const data = await service.modifierMaquis(req.prisma, req.utilisateur.maquis_id, { logo_url })
    res.json({ success: true, message: 'Logo uploadé', data, logo_url })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

module.exports = {
  getProduits, creerProduit, modifierProduit, uploadPhotoProduit,
  getFournisseurs, creerFournisseur, modifierFournisseur,
  getUtilisateurs, creerUtilisateur, modifierUtilisateur, uploadPhotoUtilisateur,
  getMaquis, modifierMaquis, uploadLogoMaquis
}