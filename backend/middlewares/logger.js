// ============================================================
// MIDDLEWARE LOGGER - Trace toutes les actions importantes
// S'exécute après chaque mutation (vente, stock, inventaire)
// Écrit une ligne dans la table LogAction
// ============================================================

const logger = (type_action, getDescription) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = async (data) => {
      if (data.success && req.utilisateur) {
        try {
          await req.prisma.logAction.create({
            data: {
              maquis_id: req.utilisateur.maquis_id,
              utilisateur_id: req.utilisateur.id,
              type_action,
              description: getDescription ? getDescription(req, data) : null,
              ip_client: req.ip || req.connection.remoteAddress
            }
          })
        } catch (error) {
          console.error('Erreur logger :', error.message)
        }
      }

      return originalJson(data)
    }

    next()
  }
}

module.exports = logger