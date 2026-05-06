const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const main = async () => {
  console.log('🌱 Initialisation MaquisFlow...')

  const hash = await bcrypt.hash('nimdA123', 10)
  await prisma.superAdmin.upsert({
    where:  { email: 'admin@maquisflow.com' },
    update: {},
    create: { nom: 'Super Admin', email: 'admin@maquisflow.com', mot_de_passe: hash, actif: true }
  })

  console.log('✅ Super Admin créé : admin@maquisflow.com / nimdA123')
  console.log('🎉 Base prête — connecte-toi sur /admin/login pour créer ton établissement.')
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
