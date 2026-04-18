const { app, BrowserWindow, nativeImage, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')

const isDev = !app.isPackaged
const backendPort = process.env.NVIDIA_AI_HUB_DESKTOP_PORT || '39000'
const backendHost = '127.0.0.1'
const backendBaseUrl = `http://${backendHost}:${backendPort}`
process.env.NVIDIA_AI_HUB_DESKTOP_PORT = backendPort

let mainWindow = null
let backendProcess = null

function getAppIconPath() {
  const generatedIconPath = path.resolve(__dirname, '..', 'build-assets', 'icon.png')
  if (fs.existsSync(generatedIconPath)) {
    return generatedIconPath
  }

  return path.resolve(__dirname, '..', 'public', 'brand', 'spark-ai-hub-mark.svg')
}

function getWindowIcon() {
  const iconPath = getAppIconPath()
  return fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined
}

function getResourceRoot() {
  if (isDev) {
    return path.resolve(__dirname, '..', '..')
  }
  return process.resourcesPath
}

function getBackendRoot() {
  if (isDev) {
    return path.resolve(__dirname, '..', '..')
  }
  return path.join(getResourceRoot(), 'backend')
}

function getPythonCommand() {
  if (isDev) {
    return process.env.NVIDIA_AI_HUB_DESKTOP_PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
  }

  return process.platform === 'win32'
    ? path.join(getBackendRoot(), 'python', 'Scripts', 'python.exe')
    : path.join(getBackendRoot(), 'python', 'bin', 'python3')
}

function getFrontendIndexPath() {
  if (isDev) {
    return path.resolve(__dirname, '..', 'dist', 'index.html')
  }
  return path.join(getResourceRoot(), 'app-bundle', 'frontend', 'dist', 'index.html')
}

function getRegistryPath() {
  if (isDev) {
    return path.resolve(__dirname, '..', '..', 'registry', 'recipes')
  }
  return path.join(getResourceRoot(), 'app-bundle', 'registry', 'recipes')
}

function getDesktopDataDir() {
  const dataDir = path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  return dataDir
}

function startBackend() {
  const backendRoot = getBackendRoot()
  const pythonExecutable = getPythonCommand()

  const env = {
    ...process.env,
    NVIDIA_AI_HUB_HOST: backendHost,
    NVIDIA_AI_HUB_PORT: backendPort,
    NVIDIA_AI_HUB_BASE_DIR: getResourceRoot(),
    NVIDIA_AI_HUB_DATA_DIR: getDesktopDataDir(),
    NVIDIA_AI_HUB_REGISTRY_PATH: getRegistryPath(),
    NVIDIA_AI_HUB_FRONTEND_DIST_PATH: path.dirname(getFrontendIndexPath()),
    PYTHONUNBUFFERED: '1',
  }

  backendProcess = spawn(
    pythonExecutable,
    ['-m', 'uvicorn', 'daemon.main:app', '--host', backendHost, '--port', backendPort],
    {
      cwd: backendRoot,
      env,
      stdio: 'pipe',
      shell: false,
    },
  )

  backendProcess.on('error', (error) => {
    console.error('Failed to start desktop backend:', error)
  })

  backendProcess.stdout.on('data', (chunk) => {
    process.stdout.write(`[desktop-backend] ${chunk}`)
  })

  backendProcess.stderr.on('data', (chunk) => {
    process.stderr.write(`[desktop-backend] ${chunk}`)
  })

  backendProcess.on('exit', (code) => {
    backendProcess = null
    if (!app.isQuitting) {
      console.error(`Desktop backend exited with code ${code ?? 'unknown'}`)
    }
  })
}

async function waitForBackend(timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${backendBaseUrl}/api/recipes`)
      if (response.ok) {
        return
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Timed out waiting for desktop backend to start.')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    backgroundColor: '#020817',
    title: 'NVIDIA AI Hub',
    icon: getWindowIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.loadFile(getFrontendIndexPath())
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.photue.nvidia-ai-hub')
  }

  startBackend()
  await waitForBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}).catch((error) => {
  console.error(error)
  app.quit()
})

app.on('before-quit', () => {
  app.isQuitting = true
  if (backendProcess) {
    backendProcess.kill()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
