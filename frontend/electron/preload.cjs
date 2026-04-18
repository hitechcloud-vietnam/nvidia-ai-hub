const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('desktopRuntime', {
  isDesktop: true,
  apiBaseUrl: 'http://127.0.0.1:39000',
  wsBaseUrl: 'ws://127.0.0.1:39000',
})
