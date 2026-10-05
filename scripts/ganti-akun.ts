import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve))
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Ganti Username & Password Admin  ')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Tampilkan user yang ada
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  })

  console.log('\nUser yang terdaftar:')
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.name} (${u.email}) — ${u.role}`)
  })

  const emailInput = await question('\nMasukkan email user yang mau diubah: ')
  const user = await prisma.user.findUnique({ where: { email: emailInput.trim() } })

  if (!user) {
    console.log('❌ User tidak ditemukan!')
    rl.close()
    return
  }

  console.log(`\nEdit user: ${user.name} (${user.email})`)
  console.log('Kosongkan jika tidak mau mengubah.\n')

  const newName = await question(`Nama baru (sekarang: ${user.name}): `)
  const newEmail = await question(`Email baru (sekarang: ${user.email}): `)
  const newPassword = await question('Password baru (kosongkan jika tidak diubah): ')

  const updateData: Record<string, string> = {}

  if (newName.trim()) updateData.name = newName.trim()
  if (newEmail.trim()) updateData.email = newEmail.trim()
  if (newPassword.trim()) {
    updateData.password = await bcrypt.hash(newPassword.trim(), 12)
  }

  if (Object.keys(updateData).length === 0) {
    console.log('\n⚠️  Tidak ada perubahan.')
    rl.close()
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  })

  console.log('\n✅ Berhasil diupdate!')
  if (newName.trim()) console.log(`   Nama    : ${newName.trim()}`)
  if (newEmail.trim()) console.log(`   Email   : ${newEmail.trim()}`)
  if (newPassword.trim()) console.log(`   Password: (sudah diubah)`)
  console.log('\nSilakan login ulang dengan data baru.')

  rl.close()
}

main()
  .catch((e) => { console.error(e); rl.close() })
  .finally(() => prisma.$disconnect())
