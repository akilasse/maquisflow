// ============================================================
// MIDDLEWARE AUTH - Protège les routes de l'application
// S'exécute avant chaque route protégée
// Vérifie le token JWT et le rôle de l'utilisateur
// ============================================================

const jwt = require('jsonwebtoken')

const verifierToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant - Veuillez vous connecter'
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.utilisateur = {
      id: decoded.id,
      role: decoded.role,
      maquis_id: decoded.maquis_id
    }

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré - Veuillez vous reconnecter'
    })
  }
}

const autoriserRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.utilisateur) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      })
    }

    if (!roles.includes(req.utilisateur.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé - Rôle requis : ${roles.join(' ou ')}`
      })
    }

    next()
  }
}

const verifierMaquis = (req, res, next) => {
  const maquis_id = parseInt(req.params.maquis_id || req.body.maquis_id)

  if (maquis_id && maquis_id !== req.utilisateur.maquis_id) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé - Vous ne pouvez accéder qu\'aux données de votre maquis'
    })
  }

  next()
}

module.exports = {
  verifierToken,
  autoriserRoles,
  verifierMaquis
}