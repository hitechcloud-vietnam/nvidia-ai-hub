const runtimeConfig = window.desktopRuntime ?? {}

const apiBaseUrl = runtimeConfig.apiBaseUrl ?? ''
const wsBaseUrl = runtimeConfig.wsBaseUrl ?? ''

function isRelativeApiPath(input) {
  return typeof input === 'string' && (input.startsWith('/api/') || input.startsWith('/ws/'))
}

function resolveHttpUrl(input) {
  if (!apiBaseUrl || typeof input !== 'string' || !input.startsWith('/api/')) {
    return input
  }
  return `${apiBaseUrl}${input}`
}

function resolveWebSocketUrl(input) {
  if (!wsBaseUrl || typeof input !== 'string' || !input.includes('/ws/')) {
    return input
  }

  if (input.startsWith('/ws/')) {
    return `${wsBaseUrl}${input}`
  }

  try {
    const parsed = new URL(input)
    if (parsed.pathname.startsWith('/ws/')) {
      return `${wsBaseUrl}${parsed.pathname}${parsed.search}`
    }
  } catch {
    return input
  }

  return input
}

if (runtimeConfig.isDesktop) {
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    if (input instanceof Request) {
      const url = resolveHttpUrl(input.url)
      if (url === input.url) {
        return originalFetch(input, init)
      }
      return originalFetch(new Request(url, input), init)
    }

    return originalFetch(resolveHttpUrl(input), init)
  }

  const NativeWebSocket = window.WebSocket
  window.WebSocket = class DesktopWebSocket extends NativeWebSocket {
    constructor(url, protocols) {
      super(resolveWebSocketUrl(url), protocols)
    }
  }
}

export { apiBaseUrl, isRelativeApiPath, resolveHttpUrl, resolveWebSocketUrl }