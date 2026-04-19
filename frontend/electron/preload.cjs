const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopRuntime', {
  isDesktop: true,
  apiBaseUrl: 'http://127.0.0.1:39000',
  wsBaseUrl: 'ws://127.0.0.1:39000',
  launchRemoteSession: (payload) => ipcRenderer.invoke('remote:launch', payload),
  saveRdpFile: (payload) => ipcRenderer.invoke('remote:save-rdp-file', payload),
  openExternalUrl: (url) => ipcRenderer.invoke('remote:open-external', url),
})
