import { config } from './db.ts'
import { resetAll } from './store.ts'
import { seedDemo } from './seed.ts'

const command = process.argv[2]

if (command === 'seed') {
  if (seedDemo()) {
    console.log('✓ Demo club loaded.')
  } else {
    console.log('• Database already has members — nothing to seed.')
    console.log('  Run `npm run reset` first if you want to start over.')
  }
} else if (command === 'reset') {
  resetAll()
  console.log('✓ Wiped every member, book, review and vote.')
  console.log(`  Database: ${config.dbPath}`)
} else {
  console.log('Usage: tsx server/cli.ts <seed|reset>')
  process.exit(1)
}
