// ============================================================
// SEED - Crée les données initiales MaquisFlow
// Lance avec : node prisma/seed.js
// ============================================================

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const main = async () => {
  console.log('🌱 Démarrage du seed MaquisFlow...')

  // ── 1. Maquis ──
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
  console.log(`✅ Maquis : ${maquis.nom}`)

  // ── 2. Restaurant ──
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
  console.log(`✅ Restaurant : ${restaurant.nom}`)

  // ── 3. Abonnements ──
  const dateEcheance = new Date()
  dateEcheance.setMonth(dateEcheance.getMonth() + 1)

  await prisma.abonnement.upsert({
    where: { maquis_id: maquis.id },
    update: {},
    create: {
      maquis_id:     maquis.id,
      statut:        'essai',
      montant:       35000,
      date_echeance: dateEcheance,
      note:          "Période d'essai 30 jours"
    }
  })

  await prisma.abonnement.upsert({
    where: { maquis_id: restaurant.id },
    update: {},
    create: {
      maquis_id:     restaurant.id,
      statut:        'essai',
      montant:       35000,
      date_echeance: dateEcheance,
      note:          "Période d'essai 30 jours"
    }
  })
  console.log('✅ Abonnements créés')

  // ── 4. Super Admin ──
  const adminHash = await bcrypt.hash('nimdA123', 10)
  await prisma.superAdmin.upsert({
    where: { email: 'admin@maquisflow.com' },
    update: {},
    create: {
      nom:          'Tia Kan-nan',
      email:        'admin@maquisflow.com',
      mot_de_passe: adminHash,
      actif:        true
    }
  })
  console.log('✅ Super Admin : admin@maquisflow.com')

  // ── 5. Patron ──
  const patronHash = await bcrypt.hash('TIA123', 10)
  const patron = await prisma.utilisateur.upsert({
    where: { email: 'kannan.tia@maquisflow.com' },
    update: {},
    create: {
      nom:          'Tia Kan-nan',
      email:        'kannan.tia@maquisflow.com',
      mot_de_passe: patronHash,
      actif:        true
    }
  })

  await prisma.utilisateurMaquis.upsert({
    where: { utilisateur_id_maquis_id: { utilisateur_id: patron.id, maquis_id: maquis.id } },
    update: {},
    create: { utilisateur_id: patron.id, maquis_id: maquis.id, role: 'patron', actif: true }
  })

  await prisma.utilisateurMaquis.upsert({
    where: { utilisateur_id_maquis_id: { utilisateur_id: patron.id, maquis_id: restaurant.id } },
    update: {},
    create: { utilisateur_id: patron.id, maquis_id: restaurant.id, role: 'patron', actif: true }
  })
  console.log(`✅ Patron : ${patron.email}`)

  // ── 6. Produits Maquis ──
  const produitsMaquis = [
    { nom: 'Bière Castel 65cl', categorie: 'Boissons', prix_vente: 500,  prix_achat: 350, stock_actuel: 100, stock_min: 10, unite: 'bouteille' },
    { nom: 'Eau minérale 1.5L', categorie: 'Boissons', prix_vente: 300,  prix_achat: 150, stock_actuel: 50,  stock_min: 5,  unite: 'bouteille' },
    { nom: 'Coca-Cola 33cl',    categorie: 'Boissons', prix_vente: 400,  prix_achat: 250, stock_actuel: 80,  stock_min: 10, unite: 'bouteille' },
    { nom: 'Beaufort',          categorie: 'Boissons', prix_vente: 700,  prix_achat: 500, stock_actuel: 60,  stock_min: 10, unite: 'Bouteille' },
    { nom: 'Riz sauce graine',  categorie: 'Plats',    prix_vente: 1500, prix_achat: 800, stock_actuel: 30,  stock_min: 5,  unite: 'portion'   },
  ]

  for (const p of produitsMaquis) {
    await prisma.produit.create({
      data: { maquis_id: maquis.id, ...p, actif: true }
    }).catch(() => {})
  }
  console.log('✅ Produits Maquis créés')

  console.log('\n🎉 Seed terminé !')
  console.log('─────────────────────────────────────────')
  console.log('👑 Super Admin   : admin@maquisflow.com / nimdA123')
  console.log('🍺 Patron Maquis : kannan.tia@maquisflow.com / TIA123')
  console.log('─────────────────────────────────────────')
}

main()
  .catch(e => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })