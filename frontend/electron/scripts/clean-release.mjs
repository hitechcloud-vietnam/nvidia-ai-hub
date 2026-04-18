import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..', '..')
const releaseDir = path.join(frontendRoot, 'release')

rmSync(releaseDir, {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 500,
})
