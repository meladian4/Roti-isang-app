import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const email = args[0] || 'admin@rotisang.com'
  const newPassword = args[1]

  if (!newPassword) {
    console.log('❌ Cara Penggunaan:')
    console.log('   npx tsx scripts/ubah-password.ts <email> <password_baru>')
    console.log('\nContoh:')
    console.log('   npx tsx scripts/ubah-password.ts admin@rotisang.com Rahasia123!')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (!user) {
    console.log(`❌ User dengan email "${email}" tidak ditemukan!`)
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(newPassword.trim(), 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ PASSWORD BERHASIL DIUBAH!')
  console.log(`   User Email : ${user.email}`)
  console.log(`   Nama User  : ${user.name}`)
  console.log(`   Status     : Password baru berhasil disimpan!`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
