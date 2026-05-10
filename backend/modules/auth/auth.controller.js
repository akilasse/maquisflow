const authService = require('./auth.service')

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, identifiant, mot_de_passe } = req.body
    const id = identifiant || email
    if (!id || !mot_de_passe) {
      return res.status(400).json({ success: false, message: 'Email/login et mot de passe requis' })
    }
    const resultat = await authService.login(req.prisma, id, mot_de_passe)

    res.cookie('refreshToken', resultat.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    if (resultat.selection_requise) {
      return res.status(200).json({
        success: true,
        selection_requise: true,
        data: { refreshToken: resultat.refreshToken, utilisateur: resultat.utilisateur, etablissements: resultat.etablissements }
      })
    }

    return res.status(200).json({
      success: true,
      selection_requise: false,
      message: 'Connexion réussie',
      data: { accessToken: resultat.accessToken, refreshToken: resultat.refreshToken, utilisateur: resultat.utilisateur }
    })
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message })
  }
}

// POST /api/auth/selectionner
const selectionnerEtablissement = async (req, res) => {
  try {
    const { utilisateur_id, maquis_id } = req.body
    if (!utilisateur_id || !maquis_id) {
      return res.status(400).json({ success: false, message: 'utilisateur_id et maquis_id requis' })
    }
    const resultat = await authService.selectionnerEtablissement(req.prisma, utilisateur_id, maquis_id)
    res.cookie('refreshToken', resultat.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    return res.status(200).json({
      success: true,
      message: 'Établissement sélectionné',
      data: { accessToken: resultat.accessToken, refreshToken: resultat.refreshToken, utilisateur: resultat.utilisateur }
    })
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message })
  }
}

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token manquant' })
    const resultat = await authService.refreshToken(req.prisma, token)
    return res.status(200).json({ success: true, data: resultat })
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message })
  }
}

// POST /api/auth/logout
const logout = async (req, res) => {
  res.clearCookie('refreshToken')
  return res.status(200).json({ success: true, message: 'Déconnexion réussie' })
}

module.exports = { login, selectionnerEtablissement, refresh, logout }