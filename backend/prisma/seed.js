// ============================================================
// SEED - Création du compte super admin MaquisFlow
// Crée : 2 établissements + 1 utilisateur patron avec accès aux deux
// ============================================================

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seed MaquisFlow...')

  // ── 1. Créer le Maquis ──
  const maquis = await prisma.maquis.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nom:             'Maquis Le Bonheur',
      type:            'maquis',
      couleur_primaire: '#FF6B35',
      devise:          'XOF',
      fuseau_horaire:  'Africa/Abidjan',
      actif:           true
    }
  })
  console.log(`✅ Maquis créé : ${maquis.nom} (id: ${maquis.id})`)

  // ── 2. Créer le Restaurant ──
  const restaurant = await prisma.maquis.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nom:             'Restaurant Le Bonheur',
      type:            'restaurant',
      couleur_primaire: '#1D4ED8',
      devise:          'XOF',
      fuseau_horaire:  'Africa/Abidjan',
      actif:           true
    }
  })
  console.log(`✅ Restaurant créé : ${restaurant.nom} (id: ${restaurant.id})`)

  // ── 3. Créer l'utilisateur patron ──
  const motDePasseHash = await bcrypt.hash('TIA123', 10)

  const utilisateur = await prisma.utilisateur.upsert({
    where: { email: 'kannan.tia@maquisflow.com' },
    update: {},
    create: {
      nom:          'Tia Kan-nan',
      email:        'kannan.tia@maquisflow.com',
      mot_de_passe: motDePasseHash,
      actif:        true
    }
  })
  console.log(`✅ Utilisateur créé : ${utilisateur.nom} (id: ${utilisateur.id})`)

  // ── 4. Lier l'utilisateur au Maquis ──
  await prisma.utilisateurMaquis.upsert({
    where: {
      utilisateur_id_maquis_id: {
        utilisateur_id: utilisateur.id,
        maquis_id:      maquis.id
      }
    },
    update: {},
    create: {
      utilisateur_id: utilisateur.id,
      maquis_id:      maquis.id,
      role:           'patron',
      actif:          true
    }
  })
  console.log(`✅ Accès Maquis accordé à ${utilisateur.nom}`)

  // ── 5. Lier l'utilisateur au Restaurant ──
  await prisma.utilisateurMaquis.upsert({
    where: {
      utilisateur_id_maquis_id: {
        utilisateur_id: utilisateur.id,
        maquis_id:      restaurant.id
      }
    },
    update: {},
    create: {
      utilisateur_id: utilisateur.id,
      maquis_id:      restaurant.id,
      role:           'patron',
      actif:          true
    }
  })
  console.log(`✅ Accès Restaurant accordé à ${utilisateur.nom}`)

  console.log('\n🎉 Seed terminé avec succès !')
  console.log('─────────────────────────────────')
  console.log(`📧 Email    : kannan.tia@maquisflow.com`)
  console.log(`🔑 Password : TIA123`)
  console.log(`🏪 Accès    : Maquis + Restaurant`)
  console.log('─────────────────────────────────')
}

main()
  .catch(e => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })