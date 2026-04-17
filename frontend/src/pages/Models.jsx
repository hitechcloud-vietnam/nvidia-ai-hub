import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'

export default function Models() {
  const recipes = useStore((s) => s.recipes)
  const modelOverview = useStore((s) => s.modelOverview)
  const modelRuntime = useStore((s) => s.modelRuntime)
  const modelCatalog = useStore((s) => s.modelCatalog)
  const installedModels = useStore((s) => s.installedModels)
  const modelDownloads = useStore((s) => s.modelDownloads)
  const modelsLoading = useStore((s) => s.modelsLoading)
  const modelsError = useStore((s) => s.modelsError)
  const modelAction = useStore((s) => s.modelAction)
  const fetchModelManager = useStore((s) => s.fetchModelManager)
  const pullModel = useStore((s) => s.pullModel)
  const deleteModel = useStore((s) => s.deleteModel)
  const launchRecipe = useStore((s) => s.launchRecipe)
  const selectRecipe = useStore((s) => s.selectRecipe)

  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchModelManager()
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchModelManager({ silent: true })
      }
    }, 4000)

    return () => window.clearInterval(interval)
  }, [fetchModelManager])

  const installedList = useMemo(
    () => (Array.isArray(installedModels?.models) ? installedModels.models : []),
    [installedModels],
  )
  const catalogList = useMemo(
    () => (Array.isArray(modelCatalog?.models) ? modelCatalog.models : []),
    [modelCatalog],
  )
  const downloadsList = useMemo(
    () => (Array.isArray(modelDownloads?.downloads) ? modelDownloads.downloads : []),
    [modelDownloads],
  )
  const dependentRecipes = useMemo(
    () => (Array.isArray(modelOverview?.dependent_recipes) ? modelOverview.dependent_recipes : []),
    [modelOverview],
  )
  const ollamaRecipeState = useMemo(
    () => recipes.find((recipe) => recipe.slug === modelOverview?.recipe_slug) || null,
    [recipes, modelOverview],
  )

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return catalogList
    return catalogList.filter((entry) => {
      const haystack = [entry.name, entry.title, entry.summary, ...(entry.capabilities || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [catalogList, query])

  const handlePull = async (name) => {
    const value = String(name || '').trim()
    if (!value) return
    await pullModel(value)
  }

  const handleDelete = async (name) => {
    const value = String(name || '').trim()
    if (!value) return
    if (!window.confirm(`Delete ${value}?`)) return
    await deleteModel(value)
  }

  const handleStartRuntime = async () => {
    if (!modelOverview?.recipe_slug) return
    await launchRecipe(modelOverview.recipe_slug)
    await fetchModelManager()
  }

  return (
    <div className="px-6 py-6 pb-12 animate-fadeIn">
      <div className="rounded-3xl border border-outline-dim bg-surface p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-label">P2.3 · Model Manager</div>
            <h1 className="m-0 mt-2 text-2xl font-bold tracking-tight text-text font-display">Shared Model Manager</h1>
            <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-text-dim">
              Browse shared Ollama models, watch download progress, and reuse one runtime cache across connected recipes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Installed" value={String(installedList.length)} />
            <InfoTile label="Catalog" value={String(catalogList.length)} />
            <InfoTile label="Active downloads" value={String(downloadsList.filter((item) => item.status === 'running').length)} />
            <InfoTile label="Provider" value={modelOverview?.provider === 'ollama' ? 'Ollama' : '—'} />
          </div>
        </div>

        {modelsError ? (
          <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
            {modelsError}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-outline-dim bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">Runtime</div>
                <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">Shared Ollama runtime</h2>
              </div>
              <button
                type="button"
                onClick={() => fetchModelManager()}
                disabled={modelsLoading}
                className="rounded-xl border border-outline-dim bg-surface-high/70 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50"
              >
                {modelsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <StatusTile label="Recipe" value={modelOverview?.recipe_name || 'Ollama Runtime'} tone={modelOverview?.installed ? 'success' : 'neutral'} />
              <StatusTile label="State" value={getRuntimeStateLabel(modelOverview)} tone={modelOverview?.ready ? 'success' : modelOverview?.starting ? 'warning' : 'neutral'} />
              <StatusTile label="Starter model" value={modelRuntime?.starter_display_name || modelRuntime?.starter_model || '—'} tone={modelRuntime?.starter_ready ? 'success' : 'warning'} />
            </div>

            {!modelOverview?.installed || !modelOverview?.ready ? (
              <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4">
                <div className="text-sm font-semibold text-text">Runtime attention required</div>
                <div className="mt-1 text-sm leading-6 text-text-dim">
                  {!modelOverview?.installed
                    ? 'Install the shared Ollama Runtime recipe before using shared model storage and download workflows.'
                    : modelOverview?.starting
                      ? 'The shared runtime is starting. Refresh in a moment to continue managing models.'
                      : 'The shared runtime is not ready. Start the runtime to enable catalog, downloads, and installed-model inventory.'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectRecipe(modelOverview?.recipe_slug || 'ollama-runtime')}
                    className="rounded-xl border border-outline-dim bg-surface-high/70 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high"
                  >
                    Open recipe
                  </button>
                  {modelOverview?.installed && !ollamaRecipeState?.running && !modelOverview?.starting ? (
                    <button
                      type="button"
                      onClick={handleStartRuntime}
                      className="btn-primary px-4 py-2 text-sm font-semibold"
                    >
                      Start runtime
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <PathCard label="Shared API" value={modelOverview?.shared_endpoint || modelOverview?.runtime_api_url || '—'} />
              <PathCard label="Storage path" value={modelOverview?.model_storage_path || '—'} />
              <PathCard label="Runtime UI" value={modelOverview?.ui_url || '—'} />
              <PathCard label="Environment" value={modelOverview?.env_path || '—'} />
            </div>

            {Array.isArray(modelOverview?.notes) && modelOverview.notes.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-text-dim">
                <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-label">Why this matters</div>
                <ul className="m-0 mt-3 list-disc space-y-2 pl-5">
                  {modelOverview.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </div>
            ) : null}

            {dependentRecipes.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-high/30 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">Connected recipes</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {dependentRecipes.map((recipe) => (
                    <button
                      key={recipe.slug}
                      type="button"
                      onClick={() => selectRecipe(recipe.slug)}
                      className="rounded-full border border-outline-dim bg-surface px-3 py-1.5 text-[11px] font-label text-text cursor-pointer hover:border-primary/30 hover:text-primary"
                    >
                      {recipe.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-outline-dim bg-surface p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">Catalog</div>
                <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">Browse and download models</h2>
              </div>
              <div className="flex w-full max-w-xl gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by model, family, or capability..."
                  className="w-full rounded-xl border border-outline-dim bg-surface-high px-4 py-2 text-sm text-text outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={() => handlePull(query)}
                  disabled={!query.trim() || modelAction.startsWith('pull:') || !modelOverview?.ready}
                  className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Pull
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {filteredCatalog.map((entry) => {
                const busy = entry.downloading || modelAction === `pull:${entry.name}`
                return (
                  <div key={entry.name} className="rounded-2xl border border-outline-dim bg-surface-high/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text">{entry.title || entry.name}</div>
                        <div className="mt-1 text-xs text-text-dim font-label break-all">{entry.name}</div>
                      </div>
                      <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-label text-text-dim">{entry.size || 'Model'}</span>
                    </div>
                    <p className="m-0 mt-3 text-sm leading-6 text-text-dim">{entry.summary || 'Shared runtime model entry.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(entry.capabilities || []).map((tag) => (
                        <span key={`${entry.name}-${tag}`} className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-label text-text-dim">{tag}</span>
                      ))}
                      {entry.installed ? <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-label text-success">Installed</span> : null}
                      {entry.downloading ? <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-label text-warning">Downloading</span> : null}
                    </div>
                    {(entry.downloading || Number(entry.download_progress) > 0) ? (
                      <ProgressBar value={Number(entry.download_progress) || 0} label={`${Math.round(Number(entry.download_progress) || 0)}%`} />
                    ) : null}
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={entry.installed || busy || !modelOverview?.ready}
                        onClick={() => handlePull(entry.name)}
                        className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        {busy ? 'Pulling...' : entry.installed ? 'Already installed' : 'Pull model'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-outline-dim bg-surface p-5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">Installed models</div>
            <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">Shared inventory</h2>
            <div className="mt-4 space-y-3">
              {installedList.length === 0 ? (
                <EmptyState title="No models installed yet" body="Pull a model from the catalog or enter an Ollama model name manually." />
              ) : installedList.map((model) => {
                const deleting = model.deleting || modelAction === `delete:${model.name}`
                return (
                  <div key={model.name} className="rounded-2xl border border-outline-dim bg-surface-high/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text break-all">{model.name}</div>
                        <div className="mt-1 text-xs text-text-dim font-label">
                          {[model.family, model.parameter_size, model.quantization_level].filter(Boolean).join(' · ') || 'Installed model'}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={deleting || model.downloading}
                        onClick={() => handleDelete(model.name)}
                        className="rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-xs font-semibold text-error cursor-pointer hover:bg-error/15 disabled:opacity-50"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-label text-text-dim">{formatBytes(model.size)}</span>
                      {model.loaded ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-label text-primary">Loaded</span> : null}
                      {model.downloading ? <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-label text-warning">Downloading</span> : null}
                    </div>
                    {model.downloading ? <ProgressBar value={Number(model.download_progress) || 0} label={`${Math.round(Number(model.download_progress) || 0)}%`} /> : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-outline-dim bg-surface p-5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">Downloads</div>
            <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">Recent activity</h2>
            <div className="mt-4 space-y-3">
              {downloadsList.length === 0 ? (
                <EmptyState title="No recent downloads" body="Download progress and completion history will appear here." />
              ) : downloadsList.map((item) => (
                <div key={item.id} className="rounded-2xl border border-outline-dim bg-surface-high/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text break-all">{item.name || 'Model job'}</div>
                      <div className="mt-1 text-xs text-text-dim font-label">{item.message || item.status || 'Pending'}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-label ${getJobTone(item.status)}`}>
                      {item.status || 'queued'}
                    </span>
                  </div>
                  <ProgressBar value={Number(item.progress) || 0} label={`${Math.round(Number(item.progress) || 0)}%`} />
                  <div className="mt-3 text-[11px] text-text-dim font-label">
                    {item.started_at ? `Started ${formatDate(item.started_at)}` : 'Start time unavailable'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getRuntimeStateLabel(overview) {
  if (!overview?.installed) return 'Not installed'
  if (overview.ready) return 'Ready'
  if (overview.starting) return 'Starting'
  if (overview.running) return 'Running'
  return 'Installed'
}

function getJobTone(status) {
  if (status === 'completed') return 'bg-success/10 text-success'
  if (status === 'failed') return 'bg-error/10 text-error'
  if (status === 'running') return 'bg-warning/10 text-warning'
  return 'bg-surface text-text-dim'
}

function formatBytes(value) {
  const size = Number(value || 0)
  if (!Number.isFinite(size) || size <= 0) return 'Unknown size'
  const gb = size / (1024 ** 3)
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  const mb = size / (1024 ** 2)
  return `${mb.toFixed(0)} MB`
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-outline-dim bg-surface/70 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="mt-1 text-lg font-bold text-text font-display break-all">{value}</div>
    </div>
  )
}

function StatusTile({ label, value, tone = 'neutral' }) {
  const toneClass = tone === 'success'
    ? 'border-success/20 bg-success/5'
    : tone === 'warning'
      ? 'border-warning/20 bg-warning/5'
      : 'border-outline-dim bg-surface-high/40'

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="mt-1 text-sm font-semibold text-text">{value}</div>
    </div>
  )
}

function PathCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-outline-dim bg-surface-high/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="mt-2 break-all text-sm text-text">{value}</div>
    </div>
  )
}

function ProgressBar({ value, label }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[11px] text-text-dim font-label">
        <span>Progress</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-dim bg-surface-high/20 px-4 py-5 text-center">
      <div className="text-sm font-semibold text-text">{title}</div>
      <div className="mt-1 text-sm text-text-dim leading-6">{body}</div>
    </div>
  )
}