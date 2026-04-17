import { useEffect, useRef } from 'react'
import { useStore } from '../store'

export default function BuildLog() {
  const installing = useStore((s) => s.installing)
  const updating = useStore((s) => s.updating)
  const buildLogs = useStore((s) => s.buildLogs)
  const buildProgress = useStore((s) => s.buildProgress)
  const scrollRef = useRef(null)

  const activeSlug = installing || updating
  const mode = updating ? 'Update' : 'Build'
  const lines = activeSlug ? (buildLogs[activeSlug] || []) : []
  const progress = activeSlug ? buildProgress[activeSlug] : null

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines.length])

  if (!activeSlug) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 h-56 bg-[#0c0c10] border-t border-spark/30 font-mono text-[11px] p-4 overflow-auto z-50" ref={scrollRef}>
      <div className="flex justify-between mb-2">
        <span className="text-spark font-bold text-xs">{mode.toUpperCase()} LOG — {activeSlug}</span>
        <span className="text-text-dim">⟳ {mode}ing...</span>
      </div>
      {progress && (
        <div className="mb-3 rounded-xl border border-spark/20 bg-white/5 p-3">
          <div className="flex justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-text-dim">
            <span>{progress.phase}</span>
            <span>{Math.round(progress.percent || 0)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progress.phase === 'Failed' ? 'bg-red-400' : 'bg-spark'}`}
              style={{ width: `${Math.max(4, Math.min(100, progress.percent || 0))}%` }}
            />
          </div>
          {progress.detail && <div className="mt-2 text-[10px] text-text-dim truncate">{progress.detail}</div>}
        </div>
      )}
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
