import { useEffect } from 'react'
import { resolveWebSocketUrl } from '../desktopRuntime'
import { useStore } from '../store'

export function useMetrics() {
  const setMetrics = useStore((s) => s.setMetrics)

  useEffect(() => {
    let ws
    let reconnectTimer
    function connect() {
      ws = new WebSocket(resolveWebSocketUrl('/ws/metrics'))
      ws.onmessage = (e) => {
        try {
          setMetrics(JSON.parse(e.data))
        } catch (error) {
          console.warn('Failed to parse metrics payload', error)
        }
      }
      ws.onclose = () => {
        reconnectTimer = window.setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
    }
    connect()
    return () => {
      window.clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [setMetrics])
}
