import { useState } from 'react'
import { useStore } from '../store'
import { useThemedLogo } from '../hooks/useThemedLogo'

export default function Running() {
  const recipes = useStore((s) => s.recipes)
  const selectRecipe = useStore((s) => s.selectRecipe)
  const launchRecipe = useStore((s) => s.launchRecipe)
  const stopRecipe = useStore((s) => s.stopRecipe)
  const metrics = useStore((s) => s.metrics)

  const running = recipes.filter((r) => r.running || r.starting)
  const installed = recipes.filter((r) => r.installed && !r.running && !r.starting)

  return (
    <div className="px-6 py-6 pb-12">
      {/* Running Section */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold tracking-tight font-display m-0">Running</h2>
        {running.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium font-label text-success bg-success/10 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {running.length} app{running.length > 1 ? 's' : ''} active
          </span>
        )}
      </div>

      {running.length === 0 ? (
        <div className="text-center py-16 text-text-dim animate-fadeIn">
          <div className="text-4xl mb-3">💤</div>
          <div className="text-base font-semibold font-display">No apps running</div>
          <div className="text-sm mt-1">Install and launch apps from the Store</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-10 animate-fadeIn">
          {running.map((r) => (
            <RunningCard key={r.slug} recipe={r} onSelect={selectRecipe} onStop={stopRecipe} />
          ))}
        </div>
      )}

      {/* Installed (Stopped) Section */}
      {installed.length > 0 && (
        <div className="animate-fadeIn">
          <div className="flex items-center gap-3 mb-4 mt-6">
            <h2 className="text-xl font-bold tracking-tight font-display m-0">Installed</h2>
            <span className="text-xs font-label text-text-dim">{installed.length} stopped</span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {installed.map((r) => (
              <StoppedCard key={r.slug} recipe={r} onSelect={selectRecipe} onLaunch={launchRecipe} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RunningCard({ recipe, onSelect, onStop }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const [stopping, setStopping] = useState(false)
  const logoUrl = useThemedLogo(recipe.logo)
  const isReady = recipe.ready
  const borderColor = isReady ? 'border-l-primary' : 'border-l-warning'
  const glowStyle = isReady ? { boxShadow: 'var(--glow-running)' } : { boxShadow: 'var(--glow-starting)' }

  const handleStop = async (e) => {
    e.stopPropagation()
    setStopping(true)
    await onStop(recipe.slug)
    setStopping(false)
  }

  return (
    <div
      onClick={() => onSelect(recipe.slug)}
      className={`bg-surface rounded-2xl p-5 cursor-pointer border-l-4 ${borderColor} card-hover`}
      style={glowStyle}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        {logoUrl && !logoFailed ? (
          <img src={logoUrl} alt={recipe.name} className="w-14 h-14 rounded-xl object-contain bg-surface-high p-2 shrink-0" onError={() => setLogoFailed(true)} />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-surface-high flex items-center justify-center text-2xl shrink-0">{recipe.icon || '◻'}</div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-text font-display m-0 truncate">{recipe.name}</h3>
          <p className="text-xs text-text-dim m-0 mt-0.5">{recipe.author}</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            {isReady ? (
              <span className="flex items-center gap-1.5 text-xs font-medium font-label text-success bg-success/10 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Running
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium font-label text-warning bg-warning/10 px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                Starting
              </span>
            )}
          </div>

          {/* Port */}
          {recipe.ui?.port && (
            <span className="text-[11px] font-label text-text-dim bg-surface-high px-2 py-0.5 rounded-md">
              :{recipe.ui.port}
            </span>
          )}

          {/* GPU / RAM bars */}
          <div className="hidden lg:flex items-center gap-3">
            <MiniBar label="GPU" value={recipe.gpu_pct || 0} color="var(--tertiary)" />
            <MiniBar label="RAM" value={recipe.ram_gb ? `${recipe.ram_gb}G` : '—'} color="var(--tertiary)" />
          </div>

          {/* Actions */}
          {isReady && (
            <a
              href={`http://${location.hostname}:${recipe.ui?.port ?? 8080}${recipe.ui?.path ?? '/'}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-secondary px-4 py-1.5 text-xs font-semibold no-underline"
            >
              Open
            </a>
          )}
          <button
            disabled={stopping}
            onClick={handleStop}
            className="px-3 py-1.5 bg-surface-high text-text-muted border border-outline-dim rounded-xl text-xs font-medium cursor-pointer hover:bg-surface-highest hover:text-text transition-all disabled:opacity-50"
          >
            {stopping ? '...' : 'Stop'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StoppedCard({ recipe, onSelect, onLaunch }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const [launching, setLaunching] = useState(false)
  const logoUrl = useThemedLogo(recipe.logo)

  const handleLaunch = async (e) => {
    e.stopPropagation()
    if (recipe.requires_hf_token) {
      const res = await fetch('/api/system/hf-token')
      const { has_token } = await res.json()
      if (!has_token) {
        onSelect(recipe.slug)
        return
      }
    }
    setLaunching(true)
    await onLaunch(recipe.slug)
    setLaunching(false)
  }

  return (
    <div
      onClick={() => onSelect(recipe.slug)}
      className="bg-surface rounded-2xl p-4 cursor-pointer card-hover"
    >
      <div className="flex items-center gap-3">
        {logoUrl && !logoFailed ? (
          <img src={logoUrl} alt={recipe.name} className="w-11 h-11 rounded-xl object-contain bg-surface-high p-1.5 shrink-0" onError={() => setLogoFailed(true)} />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-surface-high flex items-center justify-center text-xl shrink-0">{recipe.icon || '◻'}</div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-text font-display m-0 truncate">{recipe.name}</h3>
          <span className="text-[11px] text-text-dim font-label">Stopped</span>
        </div>

        <button
          disabled={launching}
          onClick={handleLaunch}
          className="btn-primary px-4 py-1.5 text-xs font-semibold shrink-0"
        >
          {launching ? '...' : 'Launch'}
        </button>
      </div>
    </div>
  )
}

function MiniBar({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-text-dim font-label">{label}</div>
      <div className="text-xs font-semibold text-tertiary font-label">{typeof value === 'number' ? `${value}%` : value}</div>
    </div>
  )
}
