const { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { spawn, spawnSync } = require('node:child_process')

const isDev = !app.isPackaged
const backendPort = process.env.NVIDIA_AI_HUB_DESKTOP_PORT || '39000'
const backendHost = '127.0.0.1'
const backendBaseUrl = `http://${backendHost}:${backendPort}`
process.env.NVIDIA_AI_HUB_DESKTOP_PORT = backendPort

let mainWindow = null
let backendProcess = null

function sanitizeRemotePayload(payload) {
  const protocol = String(payload?.protocol || '').toLowerCase()
  const host = String(payload?.host || '').trim()
  const port = Number(payload?.port || 0)
  const username = String(payload?.username || '').trim()
  const openUrl = typeof payload?.openUrl === 'string' ? payload.openUrl.trim() : ''
  const nativeScheme = typeof payload?.nativeScheme === 'string' ? payload.nativeScheme.trim() : ''
  const rdpFile = typeof payload?.rdpFile === 'string' ? payload.rdpFile : ''
  const target = typeof payload?.target === 'string' ? payload.target.trim() : ''

  if (!['ssh', 'sftp', 'rdp', 'vnc', 'http', 'https'].includes(protocol)) {
    throw new Error(`Unsupported protocol: ${protocol || 'unknown'}`)
  }
  if ((protocol === 'ssh' || protocol === 'sftp' || protocol === 'rdp' || protocol === 'vnc') && !host) {
    throw new Error('Remote host is required.')
  }

  return {
    protocol,
    host,
    port: Number.isFinite(port) && port > 0 ? port : null,
    username,
    openUrl,
    nativeScheme,
    rdpFile,
    target,
  }
}

function spawnDetached(command, args) {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    shell: false,
  })
  child.unref()
}

function launchViaOsAssociation(url) {
  if (!url) {
    throw new Error('No URL or native scheme was provided.')
  }
  if (process.platform === 'win32') {
    spawnDetached('cmd', ['/c', 'start', '', url])
    return
  }
  if (process.platform === 'darwin') {
    spawnDetached('open', [url])
    return
  }
  spawnDetached('xdg-open', [url])
}

function commandExists(command) {
  const probe = process.platform === 'win32'
    ? spawnSync('where', [command], { stdio: 'ignore', shell: false })
    : spawnSync('which', [command], { stdio: 'ignore', shell: false })
  return probe.status === 0
}

function quoteAppleScriptString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function launchNativeTerminalCommand(command, args) {
  if (process.platform === 'win32') {
    if (commandExists('wt')) {
      spawnDetached('wt', ['new-tab', command, ...args])
      return { status: 'launched', method: 'windows-terminal', target: [command, ...args].join(' ') }
    }

    spawnDetached('cmd', ['/k', command, ...args])
    return { status: 'launched', method: 'cmd', target: [command, ...args].join(' ') }
  }

  if (process.platform === 'darwin') {
    const terminalCommand = [command, ...args]
      .map((value) => {
        const text = String(value)
        return /[^A-Za-z0-9_\-./:@]/.test(text) ? `'${text.replace(/'/g, `'\\''`)}'` : text
      })
      .join(' ')

    const appleScript = [
      'tell application "Terminal"',
      'activate',
      `do script "${quoteAppleScriptString(terminalCommand)}"`,
      'end tell',
    ]

    spawnDetached('osascript', appleScript.flatMap((line) => ['-e', line]))
    return { status: 'launched', method: 'terminal-app', target: terminalCommand }
  }

  if (commandExists('x-terminal-emulator')) {
    spawnDetached('x-terminal-emulator', ['-e', command, ...args])
    return { status: 'launched', method: 'x-terminal-emulator', target: [command, ...args].join(' ') }
  }

  if (commandExists('gnome-terminal')) {
    spawnDetached('gnome-terminal', ['--', command, ...args])
    return { status: 'launched', method: 'gnome-terminal', target: [command, ...args].join(' ') }
  }

  throw new Error('No supported native terminal application was found for launching SSH/SFTP.')
}

function launchRemoteSession(payload) {
  const sanitized = sanitizeRemotePayload(payload)

  if (sanitized.protocol === 'ssh') {
    const args = []
    if (sanitized.port) args.push('-p', String(sanitized.port))
    args.push(`${sanitized.username ? `${sanitized.username}@` : ''}${sanitized.host}`)
    return launchNativeTerminalCommand('ssh', args)
  }

  if (sanitized.protocol === 'sftp') {
    const args = []
    if (sanitized.port) args.push('-P', String(sanitized.port))
    args.push(`${sanitized.username ? `${sanitized.username}@` : ''}${sanitized.host}`)
    return launchNativeTerminalCommand('sftp', args)
  }

  if (sanitized.protocol === 'http' || sanitized.protocol === 'https') {
    if (sanitized.openUrl) {
      shell.openExternal(sanitized.openUrl)
      return { status: 'launched', method: 'shell.openExternal', target: sanitized.openUrl }
    }
  }

  if (sanitized.protocol === 'rdp' && process.platform === 'win32') {
    const target = sanitized.target || `${sanitized.host}:${sanitized.port || 3389}`
    spawnDetached('mstsc', [`/v:${target}`])
    return { status: 'launched', method: 'mstsc', target }
  }

  if (sanitized.protocol === 'ssh' || sanitized.protocol === 'sftp' || sanitized.protocol === 'vnc' || sanitized.protocol === 'rdp') {
    const candidate = sanitized.nativeScheme || sanitized.openUrl
    if (candidate) {
      launchViaOsAssociation(candidate)
      return { status: 'launched', method: 'os-association', target: candidate }
    }
  }

  throw new Error(`No native launch strategy is available for protocol ${sanitized.protocol}.`)
}

async function saveRdpFile(payload) {
  const sanitized = sanitizeRemotePayload(payload)
  if (!sanitized.rdpFile) {
    throw new Error('No RDP file content provided.')
  }

  const defaultName = `${(sanitized.host || 'remote-session').replace(/[^a-z0-9.-]+/gi, '-')}.rdp`
  const defaultPath = path.join(os.homedir(), 'Downloads', defaultName)
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save RDP file',
    defaultPath,
    filters: [{ name: 'Remote Desktop', extensions: ['rdp'] }],
  })

  if (result.canceled || !result.filePath) {
    return { status: 'cancelled' }
  }

  fs.writeFileSync(result.filePath, sanitized.rdpFile, 'utf8')
  return { status: 'saved', path: result.filePath }
}

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

ipcMain.handle('remote:launch', async (_event, payload) => launchRemoteSession(payload))
ipcMain.handle('remote:save-rdp-file', async (_event, payload) => saveRdpFile(payload))
ipcMain.handle('remote:open-external', async (_event, url) => {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('A valid URL is required.')
  }
  await shell.openExternal(url)
  return { status: 'opened', url }
})

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
