const adminService = require('./admin.service')

const login = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body
    if (!email || !mot_de_passe) return res.status(400).json({ success: false, message: 'Email et mot de passe requis' })
    const resultat = await adminService.login(req.prisma, email, mot_de_passe)
    return res.status(200).json({ success: true, data: resultat })
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message })
  }
}

const getDashboard = async (req, res) => {
  try {
    const data = await adminService.getDashboard(req.prisma)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const getMaquis = async (req, res) => {
  try {
    const data = await adminService.getMaquis(req.prisma)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const creerMaquis = async (req, res) => {
  try {
    const data = await adminService.creerMaquis(req.prisma, req.body)
    return res.status(201).json({ success: true, data })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const modifierMaquis = async (req, res) => {
  try {
    const data = await adminService.modifierMaquis(req.prisma, parseInt(req.params.id), req.body)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const uploadLogoMaquis = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu' })
    const logo_url = `/uploads/logos/${req.file.filename}`
    const data = await adminService.modifierMaquis(req.prisma, parseInt(req.params.id), { logo_url })
    return res.status(200).json({ success: true, message: 'Logo uploadé', data, logo_url })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const modifierAbonnement = async (req, res) => {
  try {
    const data = await adminService.modifierAbonnement(req.prisma, parseInt(req.params.id), req.body)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const creerUtilisateur = async (req, res) => {
  try {
    const data = await adminService.creerUtilisateur(req.prisma, req.body)
    return res.status(201).json({ success: true, data })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const toggleUtilisateur = async (req, res) => {
  try {
    const { utilisateur_id, maquis_id, actif } = req.body
    const data = await adminService.toggleUtilisateur(req.prisma, utilisateur_id, maquis_id, actif)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

module.exports = {
  login, getDashboard, getMaquis,
  creerMaquis, modifierMaquis, uploadLogoMaquis,
  modifierAbonnement, creerUtilisateur, toggleUtilisateur
}