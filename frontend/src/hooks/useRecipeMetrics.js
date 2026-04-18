import { useEffect } from 'react'
import { resolveWebSocketUrl } from '../desktopRuntime'
import { useStore } from '../store'

export function useRecipeMetrics() {
  const setRecipeMetrics = useStore((s) => s.setRecipeMetrics)

  useEffect(() => {
    let ws
    let reconnectTimer
    function connect() {
      ws = new WebSocket(resolveWebSocketUrl('/ws/recipe-metrics'))
      ws.onmessage = (e) => {
        try {
          setRecipeMetrics(JSON.parse(e.data))
        } catch (error) {
          console.warn('Failed to parse recipe metrics payload', error)
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
  }, [setRecipeMetrics])
}
