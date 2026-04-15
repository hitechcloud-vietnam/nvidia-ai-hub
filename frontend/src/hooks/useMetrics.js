import { useEffect } from 'react'
import { useStore } from '../store'

export function useMetrics() {
  const setMetrics = useStore((s) => s.setMetrics)

  useEffect(() => {
    let ws
    function connect() {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${proto}//${location.host}/ws/metrics`)
      ws.onmessage = (e) => {
        try {
          setMetrics(JSON.parse(e.data))
        } catch (error) {
          console.warn('Failed to parse metrics payload', error)
        }
      }
      ws.onclose = () => setTimeout(connect, 3000)
      ws.onerror = () => ws.close()
    }
    connect()
    return () => ws?.close()
  }, [setMetrics])
}
