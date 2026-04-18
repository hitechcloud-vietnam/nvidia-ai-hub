import { mkdirSync } from 'node:fs'
import { copyFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import icongen from 'icon-gen'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..', '..')
const sourceSvg = path.join(frontendRoot, 'public', 'brand', 'spark-ai-hub-mark.svg')
const outputRoot = path.join(frontendRoot, 'build-assets')
const linuxIconsDir = path.join(outputRoot, 'icons')

mkdirSync(outputRoot, { recursive: true })
mkdirSync(linuxIconsDir, { recursive: true })

await rm(linuxIconsDir, { recursive: true, force: true })
mkdirSync(linuxIconsDir, { recursive: true })

await icongen(sourceSvg, outputRoot, {
  report: true,
  ico: {
    name: 'icon',
  },
  icns: {
    name: 'icon',
  },
  favicon: {
    name: 'icon',
    sizes: [16, 24, 32, 48, 64, 128, 256, 512],
  },
})

const generatedFiles = await readdir(outputRoot)
const pngIconFiles = generatedFiles.filter((fileName) => /^icon\d+\.png$/u.test(fileName))
const sortedPngIconFiles = [...pngIconFiles].sort((left, right) => {
  const leftSize = Number.parseInt(left.match(/^icon(\d+)\.png$/u)?.[1] ?? '0', 10)
  const rightSize = Number.parseInt(right.match(/^icon(\d+)\.png$/u)?.[1] ?? '0', 10)
  return leftSize - rightSize
})

for (const fileName of sortedPngIconFiles) {
  const size = fileName.match(/^icon(\d+)\.png$/u)?.[1]
  if (!size) {
    continue
  }

  const sourceFile = path.join(outputRoot, fileName)
  const targetFile = path.join(linuxIconsDir, `${size}x${size}.png`)
  await copyFile(sourceFile, targetFile)
}

const largestPngIcon = sortedPngIconFiles.at(-1)

if (!largestPngIcon) {
  throw new Error('No generated PNG icons were found after icon generation.')
}

await copyFile(path.join(outputRoot, largestPngIcon), path.join(outputRoot, 'icon.png'))
