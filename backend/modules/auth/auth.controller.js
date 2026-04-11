// ============================================================
// AUTH CONTROLLER - Reçoit les requêtes HTTP et répond
// Il appelle le service et formate la réponse JSON
// Ne contient pas de logique métier - juste la communication
// ============================================================

const authService = require('./auth.service')

// POST /api/auth/login
// Body : { email, mot_de_passe, type } — type = 'maquis' | 'restaurant'
const login = async (req, res) => {
  try {
    const { email, mot_de_passe, type } = req.body

    // Vérifie que les champs sont présents
    if (!email || !mot_de_passe) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      })
    }

    // Vérifie que le type est valide
    if (type && !['maquis', 'restaurant'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type invalide — maquis ou restaurant uniquement'
      })
    }

    // Appelle le service avec le type (défaut : maquis)
    const resultat = await authService.login(
      req.prisma,
      email,
      mot_de_passe,
      type || 'maquis'
    )

    // Stocke le refresh token dans un cookie sécurisé
    res.cookie('refreshToken', resultat.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        accessToken:  resultat.accessToken,
        utilisateur:  resultat.utilisateur
      }
    })
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message
    })
  }
}

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token manquant'
      })
    }

    const resultat = await authService.refreshToken(req.prisma, token)

    return res.status(200).json({
      success: true,
      data: resultat
    })
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message
    })
  }
}

// POST /api/auth/logout
const logout = async (req, res) => {
  res.clearCookie('refreshToken')
  return res.status(200).json({
    success: true,
    message: 'Déconnexion réussie'
  })
}

module.exports = { login, refresh, logout }