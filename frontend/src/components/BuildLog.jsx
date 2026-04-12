import { useEffect, useRef } from 'react'
import { useStore } from '../store'

export default function BuildLog() {
  const installing = useStore((s) => s.installing)
  const buildLogs = useStore((s) => s.buildLogs)
  const scrollRef = useRef(null)

  const lines = installing ? (buildLogs[installing] || []) : []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines.length])

  if (!installing) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 h-56 bg-[#0c0c10] border-t border-spark/30 font-mono text-[11px] p-4 overflow-auto z-50" ref={scrollRef}>
      <div className="flex justify-between mb-2">
        <span className="text-spark font-bold text-xs">BUILD LOG — {installing}</span>
        <span className="text-text-dim">⟳ Building...</span>
      </div>
      {lines.map((l, i) => (
        <div
          key={i}
          className={`leading-7 ${
            l.includes('successfully') || l.includes('✅') ? 'text-spark' :
            l.includes('error') || l.includes('failed') ? 'text-red-400' :
            'text-text-muted'
          }`}
        >
          {l}
        </div>
      ))}
      <div className="text-spark animate-pulse">▋</div>
    </div>
  )
}
