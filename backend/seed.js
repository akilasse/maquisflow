const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const main = async () => {
  console.log('🌱 Initialisation MaquisFlow...')

  const hash = await bcrypt.hash('nimdA123', 10)
  await prisma.superAdmin.upsert({
    where:  { email: 'akilassetia21@gmail.com' },
    update: {},
    create: { nom: 'Super Admin', email: 'akilassetia21@gmail.com', mot_de_passe: hash, actif: true }
  })

  console.log('✅ Super Admin créé : akilassetia21@gmail.com / nimdA123')
  console.log('🎉 Base prête — connecte-toi sur /admin/login pour créer ton établissement.')
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
