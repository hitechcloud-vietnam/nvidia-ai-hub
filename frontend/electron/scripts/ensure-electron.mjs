import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..', '..')
const electronRoot = path.join(frontendRoot, 'node_modules', 'electron')
const pathFile = path.join(electronRoot, 'path.txt')
const distDir = path.join(electronRoot, 'dist')

if (existsSync(pathFile) && existsSync(distDir)) {
  process.exit(0)
}

console.warn('Electron runtime is incomplete. Reinstalling Electron binary package...')

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const installResult = spawnSync(npmCommand, ['install', 'electron', '--save-dev'], {
  cwd: frontendRoot,
  stdio: 'inherit',
  shell: false,
  env: process.env,
})

if (installResult.error) {
  console.error(installResult.error)
  process.exit(1)
}

if (installResult.status !== 0) {
  process.exit(installResult.status ?? 1)
}

if (!existsSync(pathFile) || !existsSync(distDir)) {
  console.error('Electron binary is still missing after reinstall.')
  process.exit(1)
}
