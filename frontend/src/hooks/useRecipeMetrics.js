import { useEffect } from 'react'
import { useStore } from '../store'

export function useRecipeMetrics() {
  const setRecipeMetrics = useStore((s) => s.setRecipeMetrics)

  useEffect(() => {
    let ws
    function connect() {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${proto}//${location.host}/ws/recipe-metrics`)
      ws.onmessage = (e) => {
        try {
          setRecipeMetrics(JSON.parse(e.data))
        } catch (error) {
          console.warn('Failed to parse recipe metrics payload', error)
        }
      }
      ws.onclose = () => setTimeout(connect, 3000)
      ws.onerror = () => ws.close()
    }
    connect()
    return () => ws?.close()
  }, [setRecipeMetrics])
}
