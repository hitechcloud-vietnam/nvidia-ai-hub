import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..', '..')
const repoRoot = path.resolve(frontendRoot, '..')
const outputRoot = path.resolve(frontendRoot, 'electron', 'backend-dist')
const pythonRoot = path.join(outputRoot, 'python')
const pythonCommand = process.env.NVIDIA_AI_HUB_DESKTOP_PYTHON || (process.platform === 'win32' ? 'python' : 'python3')

function runChecked(command, args, options) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  })

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

rmSync(outputRoot, { recursive: true, force: true })
mkdirSync(outputRoot, { recursive: true })

for (const entry of ['daemon', 'requirements.txt']) {
  const source = path.join(repoRoot, entry)
  const target = path.join(outputRoot, entry)
  if (existsSync(source)) {
    if (entry === 'requirements.txt') {
      copyFileSync(source, target)
    } else {
      cpSync(source, target, { recursive: true })
    }
  }
}

runChecked(pythonCommand, ['-m', 'venv', pythonRoot], { cwd: repoRoot })

const pythonExecutable = process.platform === 'win32'
  ? path.join(pythonRoot, 'Scripts', 'python.exe')
  : path.join(pythonRoot, 'bin', 'python3')

runChecked(pythonExecutable, ['-m', 'pip', 'install', '--upgrade', 'pip'], { cwd: outputRoot })
runChecked(pythonExecutable, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: outputRoot })
