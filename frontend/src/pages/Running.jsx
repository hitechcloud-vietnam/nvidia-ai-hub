import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useThemedLogo } from '../hooks/useThemedLogo'
import { getRecipeLaunchLabel, getRecipeOpenLabel, getRecipeSurfaceLabel, getRecipeUrl } from '../utils/recipePresentation'

export default function Running() {
  const { t } = useTranslation()
  const recipes = useStore((s) => s.recipes)
  const recipeMetrics = useStore((s) => s.recipeMetrics)
  const selectRecipe = useStore((s) => s.selectRecipe)
  const launchRecipe = useStore((s) => s.launchRecipe)
  const stopRecipe = useStore((s) => s.stopRecipe)
  const restartRecipe = useStore((s) => s.restartRecipe)
  const removeRecipe = useStore((s) => s.removeRecipe)
  const restarting = useStore((s) => s.restarting)
  const removing = useStore((s) => s.removing)

  const running = recipes.filter((r) => r.running || r.starting)
  const installed = recipes.filter((r) => r.installed && !r.running && !r.starting)
  const installedWithUpdates = installed.filter((r) => r.registry_changed)

  return (
    <div className="px-6 py-6 pb-12">
      {/* Running Section */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold tracking-tight font-display m-0">{t('running.title')}</h2>
        {running.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium font-label text-success bg-success/10 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {t('running.activeApps', { count: running.length })}
          </span>
        )}
      </div>

      {running.length === 0 ? (
        <div className="text-center py-16 text-text-dim animate-fadeIn">
          <div className="text-4xl mb-3">💤</div>
          <div className="text-base font-semibold font-display">{t('running.noAppsTitle')}</div>
          <div className="text-sm mt-1">{t('running.noAppsBody')}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-10 animate-fadeIn">
          {running.map((r) => (
            <RunningCard
              key={r.slug}
              recipe={r}
              metrics={recipeMetrics?.[r.slug]}
              onSelect={selectRecipe}
              onStop={stopRecipe}
              onRestart={restartRecipe}
              onRemove={removeRecipe}
              restarting={restarting === r.slug}
              removing={removing === r.slug}
            />
          ))}
        </div>
      )}

      {/* Installed (Stopped) Section */}
      {installed.length > 0 && (
        <div className="animate-fadeIn">
          <div className="flex items-center gap-3 mb-4 mt-6">
            <h2 className="text-xl font-bold tracking-tight font-display m-0">{t('running.installedTitle')}</h2>
            <span className="text-xs font-label text-text-dim">{t('running.stoppedCount', { count: installed.length })}</span>
            {installedWithUpdates.length > 0 && (
              <span className="text-xs font-medium font-label text-warning bg-warning/10 px-2.5 py-1 rounded-full">
                {t('running.updatesAvailable', { count: installedWithUpdates.length })}
              </span>
            )}
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {installed.map((r) => (
              <StoppedCard
                key={r.slug}
                recipe={r}
                metrics={recipeMetrics?.[r.slug]}
                onSelect={selectRecipe}
                onLaunch={launchRecipe}
                onRemove={removeRecipe}
                removing={removing === r.slug}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RunningCard({ recipe, metrics, onSelect, onStop, onRestart, onRemove, restarting, removing }) {
  const { t } = useTranslation()
  const [logoFailed, setLogoFailed] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [removingData, setRemovingData] = useState(false)
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

  const handleRestart = async (e) => {
    e.stopPropagation()
    await onRestart(recipe.slug)
  }

  const handleRemove = async (e) => {
    e.stopPropagation()
    const confirmed = window.confirm(t('running.confirmRemove', { name: recipe.name }))
    if (!confirmed) return
    setRemovingData(true)
    await onRemove(recipe.slug, { deleteData: true })
    setRemovingData(false)
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
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {recipe.ui?.port && (
              <span className="text-[11px] font-label text-text-dim bg-surface-high px-2 py-0.5 rounded-md">
                {getRecipeSurfaceLabel(recipe)} · :{recipe.ui.port}
              </span>
            )}
            {metrics?.container_count > 0 && (
              <span className="text-[11px] font-label text-text-dim bg-surface-high px-2 py-0.5 rounded-md">
                {t('running.containers', { count: metrics.container_count })}
              </span>
            )}
            {metrics?.updated_at ? (
              <span className="text-[11px] font-label text-text-dim bg-surface-high px-2 py-0.5 rounded-md">
                {t('running.liveTelemetry')}
              </span>
            ) : null}
            {recipe.registry_changed && (
              <span className="text-[11px] font-label text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                {t('running.updateAvailable')}{recipe.registry_update_count ? ` · ${recipe.registry_update_count}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            {isReady ? (
              <span className="flex items-center gap-1.5 text-xs font-medium font-label text-success bg-success/10 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {t('running.runningStatus')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium font-label text-warning bg-warning/10 px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                {restarting ? t('running.restarting') : t('running.starting')}
              </span>
            )}
          </div>

          {/* Actions */}
          {isReady && (
            <a
              href={getRecipeUrl(recipe)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-secondary px-4 py-1.5 text-xs font-semibold no-underline"
            >
              {getRecipeOpenLabel(recipe)}
            </a>
          )}
          <button
            disabled={stopping || restarting || removing || removingData}
            onClick={handleRestart}
            className="px-3 py-1.5 bg-surface-high text-text-muted border border-outline-dim rounded-xl text-xs font-medium cursor-pointer hover:bg-surface-highest hover:text-text transition-all disabled:opacity-50"
          >
            {restarting ? t('running.processing') : t('running.restart')}
          </button>
          <button
            disabled={stopping || restarting || removing || removingData}
            onClick={handleStop}
            className="px-3 py-1.5 bg-surface-high text-text-muted border border-outline-dim rounded-xl text-xs font-medium cursor-pointer hover:bg-surface-highest hover:text-text transition-all disabled:opacity-50"
          >
            {stopping ? t('running.processing') : t('running.stop')}
          </button>
          <button
            disabled={stopping || restarting || removing || removingData}
            onClick={handleRemove}
            className="px-3 py-1.5 bg-surface-high text-text-muted border border-outline-dim rounded-xl text-xs font-medium cursor-pointer hover:bg-error/10 hover:text-error transition-all disabled:opacity-50"
          >
            {removing || removingData ? t('running.processing') : t('running.remove')}
          </button>
        </div>
      </div>

      <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <MetricChip label={t('running.cpu')} value={formatPercent(metrics?.cpu_percent)} />
        <MetricChip label={t('running.ram')} value={formatMemory(metrics?.memory_used_mb)} />
        <MetricChip label={t('running.gpu')} value={formatPercent(metrics?.gpu_utilization)} />
        <MetricChip label={t('running.vram')} value={formatMemory(metrics?.gpu_memory_used_mb)} />
      </div>
    </div>
  )
}

function StoppedCard({ recipe, metrics, onSelect, onLaunch, onRemove, removing }) {
  const { t } = useTranslation()
  const [logoFailed, setLogoFailed] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [removingData, setRemovingData] = useState(false)
  const logoUrl = useThemedLogo(recipe.logo)

  const handleLaunch = async (e) => {
    e.stopPropagation()
    setLaunching(true)
    await onLaunch(recipe.slug)
    setLaunching(false)
  }

  const handleRemove = async (e) => {
    e.stopPropagation()
    const confirmed = window.confirm(t('running.confirmRemove', { name: recipe.name }))
    if (!confirmed) return
    setRemovingData(true)
    await onRemove(recipe.slug, { deleteData: true })
    setRemovingData(false)
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
          <span className="text-[11px] text-text-dim font-label">{t('running.stopped')}</span>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {recipe.ui?.port && (
              <span className="text-[11px] font-label text-text-dim bg-surface-high px-2 py-0.5 rounded-md">
                {getRecipeSurfaceLabel(recipe)} · :{recipe.ui.port}
              </span>
            )}
            {metrics?.memory_used_mb > 0 && (
              <span className="text-[11px] font-label text-text-dim bg-surface-high px-2 py-0.5 rounded-md">
                {t('running.lastRam', { value: formatMemory(metrics.memory_used_mb) })}
              </span>
            )}
            {recipe.registry_changed && (
              <span className="text-[11px] font-label text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                {t('running.updateAvailable')}{recipe.registry_update_count ? ` · ${recipe.registry_update_count}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled={launching || removing || removingData}
            onClick={handleLaunch}
            className="btn-primary px-4 py-1.5 text-xs font-semibold shrink-0"
          >
            {launching ? t('running.processing') : getRecipeLaunchLabel(recipe)}
          </button>
          <button
            disabled={launching || removing || removingData}
            onClick={handleRemove}
            className="px-3 py-1.5 bg-surface-high text-text-muted border border-outline-dim rounded-xl text-xs font-medium cursor-pointer hover:bg-error/10 hover:text-error transition-all disabled:opacity-50"
          >
            {removing || removingData ? t('running.processing') : t('running.remove')}
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricChip({ label, value }) {
  return (
    <div className="bg-surface-high rounded-xl px-3 py-2 border border-outline-dim/70">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="text-sm font-semibold text-text mt-1">{value}</div>
    </div>
  )
}

function formatPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${Math.round(value)}%`
}

function formatMemory(valueMb) {
  if (typeof valueMb !== 'number' || Number.isNaN(valueMb) || valueMb <= 0) return '—'
  if (valueMb >= 1024) return `${(valueMb / 1024).toFixed(1)} GB`
  return `${Math.round(valueMb)} MB`
}

