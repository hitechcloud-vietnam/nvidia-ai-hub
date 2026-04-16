import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { useThemedLogo } from '../hooks/useThemedLogo'
import {
  getRecipeLaunchLabel,
  getRecipeOpenLabelWithArrow,
  getRecipeSurfaceLabel,
  getRecipeUrl,
  isNotebookRecipe,
} from '../utils/recipePresentation'
import { getRecipeHardwareFit } from '../utils/hardwareFit'

const RecipeConfigTab = lazy(() => import('../components/recipe-detail/ConfigWorkspace'))
const InlineConfigWorkspace = lazy(() => import('../components/recipe-detail/ConfigWorkspace').then((module) => ({ default: module.InlineConfigWorkspace })))

function hasDedicatedConfigTab(recipe) {
  return Boolean(recipe?.runtime_env_path)
}

function getDetailTabs(recipe) {
  const tabs = [{ id: 'details', label: 'Overview' }]

  if (hasDedicatedConfigTab(recipe)) {
    tabs.push({ id: 'config', label: 'Configuration' })
  }

  tabs.push({ id: 'logs', label: 'Logs' })
  return tabs
}

export default function RecipeDetail() {
  const selectedRecipe = useStore((s) => s.selectedRecipe)
  const recipes = useStore((s) => s.recipes)
  const recipeDetails = useStore((s) => s.recipeDetails)
  const recipeDetailStatus = useStore((s) => s.recipeDetailStatus)
  const metrics = useStore((s) => s.metrics)
  const clearRecipe = useStore((s) => s.clearRecipe)
  const installing = useStore((s) => s.installing)
  const updating = useStore((s) => s.updating)
  const restarting = useStore((s) => s.restarting)
  const removing = useStore((s) => s.removing)
  const installRecipe = useStore((s) => s.installRecipe)
  const updateRecipe = useStore((s) => s.updateRecipe)
  const launchRecipe = useStore((s) => s.launchRecipe)
  const stopRecipe = useStore((s) => s.stopRecipe)
  const restartRecipe = useStore((s) => s.restartRecipe)
  const removeRecipe = useStore((s) => s.removeRecipe)
  const purging = useStore((s) => s.purging)
  const purgeRecipe = useStore((s) => s.purgeRecipe)
  const buildLogs = useStore((s) => s.buildLogs)
  const containerLogs = useStore((s) => s.containerLogs)
  const connectLogs = useStore((s) => s.connectLogs)
  const disconnectLogs = useStore((s) => s.disconnectLogs)
  const fetchRecipeDetail = useStore((s) => s.fetchRecipeDetail)

  const recipeSummary = recipes.find((r) => r.slug === selectedRecipe)
  const recipe = recipeDetails[selectedRecipe] || recipeSummary
  const hardwareFit = getRecipeHardwareFit(recipe, metrics)
  const detailStatus = selectedRecipe ? recipeDetailStatus[selectedRecipe] : null
  const logoUrl = useThemedLogo(recipe?.logo)
  const scrollRef = useRef(null)
  const previousRecipeRef = useRef(null)
  const previousPreferLogsRef = useRef(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [restartingNow, setRestartingNow] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [showHfModal, setShowHfModal] = useState(false)
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [hfToken, setHfToken] = useState('')
  const [hfSaving, setHfSaving] = useState(false)
  const [hfError, setHfError] = useState('')

  useEffect(() => {
    if (selectedRecipe) {
      fetchRecipeDetail(selectedRecipe)
    }
  }, [selectedRecipe, fetchRecipeDetail])

  const isBuilding = installing === recipe?.slug
  const isUpdating = updating === recipe?.slug
  const isRestarting = restarting === recipe?.slug || restartingNow
  const isBusy = isBuilding || isUpdating || isRestarting

  useEffect(() => {
    if (recipe?.running || recipe?.starting) {
      connectLogs(recipe.slug)
    } else {
      disconnectLogs()
    }
    return () => disconnectLogs()
  }, [recipe?.running, recipe?.starting, recipe?.slug, connectLogs, disconnectLogs])

  useEffect(() => {
    if (!recipe) return

    const preferLogs = isBuilding || recipe.starting
    const recipeChanged = previousRecipeRef.current !== recipe.slug

    if (recipeChanged) {
      setActiveTab(preferLogs ? 'logs' : 'details')
      previousRecipeRef.current = recipe.slug
      previousPreferLogsRef.current = preferLogs
      return
    }

    if (preferLogs && !previousPreferLogsRef.current) {
      setActiveTab('logs')
    }

    previousPreferLogsRef.current = preferLogs
  }, [recipe, isBuilding])

  useEffect(() => {
    if (selectedRecipe && !recipeDetails[selectedRecipe] && detailStatus?.error) {
      fetchRecipeDetail(selectedRecipe, { force: true })
    }
  }, [selectedRecipe, recipeDetails, detailStatus?.error, fetchRecipeDetail])

  if (!recipe) {
    return (
      <div className="p-8 animate-fadeIn">
        <button onClick={clearRecipe} className="text-primary bg-transparent border-none cursor-pointer text-sm font-semibold font-display">
          ← Back
        </button>
        <p className="text-text-muted mt-4">Recipe not found.</p>
      </div>
    )
  }

  if (!recipeDetails[selectedRecipe] && detailStatus?.loading) {
    return (
      <div className="p-8 animate-fadeIn">
        <button onClick={clearRecipe} className="text-primary bg-transparent border-none cursor-pointer text-sm font-semibold font-display">
          ← Back
        </button>
        <div className="mt-6 rounded-3xl border border-outline-dim bg-surface p-6">
          <div className="animate-pulse">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-surface-high" />
              <div className="flex-1 space-y-3">
                <div className="h-7 w-56 rounded-xl bg-surface-high" />
                <div className="h-4 w-40 rounded-xl bg-surface-high" />
                <div className="h-4 w-72 rounded-xl bg-surface-high" />
              </div>
            </div>
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full rounded-xl bg-surface-high" />
              <div className="h-4 w-[92%] rounded-xl bg-surface-high" />
              <div className="h-4 w-[84%] rounded-xl bg-surface-high" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isRemoving = removing === recipe.slug
  const isReady = recipe.ready
  const isNotebook = isNotebookRecipe(recipe)
  const cLogs = containerLogs[recipe.slug] || []
  const logLines = isBusy ? (buildLogs[recipe.slug] || []) : cLogs

  const handleRemove = () => {
    setShowUninstallModal(true)
  }

  const handleRemoveConfirm = async (deleteData) => {
    setShowUninstallModal(false)
    await removeRecipe(recipe.slug, { deleteData })
  }

  const handleLaunch = async () => {
    if (recipe.requires_hf_token) {
      const res = await fetch('/api/system/hf-token')
      const { has_token } = await res.json()
      if (!has_token) {
        setShowHfModal(true)
        return
      }
    }
    setLaunching(true)
    await launchRecipe(recipe.slug)
    setLaunching(false)
  }

  const handleHfSubmit = async () => {
    if (!hfToken.trim()) return
    setHfSaving(true)
    setHfError('')
    try {
      const res = await fetch('/api/system/hf-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: hfToken.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save token')
      setShowHfModal(false)
      setHfToken('')
      setLaunching(true)
      await launchRecipe(recipe.slug)
      setLaunching(false)
    } catch {
      setHfError('Failed to save token. Please try again.')
    } finally {
      setHfSaving(false)
    }
  }

  const handleStop = async () => {
    setStopping(true)
    await stopRecipe(recipe.slug)
    setStopping(false)
  }

  const handleRestart = async () => {
    setRestartingNow(true)
    await restartRecipe(recipe.slug)
    setRestartingNow(false)
  }

  const recipeCategories = Array.isArray(recipe.categories) && recipe.categories.length > 0
    ? recipe.categories
    : [recipe.category]
  const detailTabs = getDetailTabs(recipe)
  const showDedicatedConfigTab = hasDedicatedConfigTab(recipe)

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      <div className="shrink-0 px-6 py-5 bg-surface-low/60 backdrop-blur-md border-b border-outline-dim">
        <button
          onClick={clearRecipe}
          className="flex items-center gap-1.5 text-text-muted hover:text-primary bg-transparent border-none cursor-pointer text-sm p-0 mb-4 transition-colors font-medium font-display"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-5">
          {logoUrl && !logoFailed ? (
            <img src={logoUrl} alt={recipe.name} className="w-20 h-20 rounded-2xl object-contain bg-surface-high p-2.5 shadow-lg shrink-0" onError={() => setLogoFailed(true)} />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-surface-high flex items-center justify-center text-4xl shrink-0">{recipe.icon || '◻'}</div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-text tracking-tight m-0 font-display">{recipe.name}</h1>
            <p className="text-sm text-text-dim mt-0.5 m-0">{recipe.author}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[10px] font-label px-2 py-0.5 rounded-full ${
                isNotebook ? 'text-primary bg-primary/10' : 'text-text-dim bg-surface-high'
              }`}>
                {getRecipeSurfaceLabel(recipe)}
              </span>
              {recipeCategories.map((cat) => (
                <span key={cat} className="text-[10px] font-label text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">{cat}</span>
              ))}
              {isBuilding && <StatusPill color="primary" pulse>Building...</StatusPill>}
              {isUpdating && <StatusPill color="primary" pulse>Updating...</StatusPill>}
              {isRestarting && <StatusPill color="warning" pulse>Restarting...</StatusPill>}
              {!isBusy && recipe.running && isReady && <StatusPill color="success">Running</StatusPill>}
              {!isBusy && recipe.starting && <StatusPill color="warning" pulse>Starting...</StatusPill>}
              {!isBusy && !recipe.running && !recipe.starting && recipe.installed && <StatusPill color="dim">Stopped</StatusPill>}
              <StatusPill color={hardwareFit.tone}>{`Host ${hardwareFit.label}`}</StatusPill>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <SpecBadge label="Memory" value={`${recipe.requirements?.min_memory_gb ?? 8}–${recipe.requirements?.recommended_memory_gb ?? recipe.requirements?.min_memory_gb ?? 8} GB`} />
            <SpecBadge label="Disk" value={`${recipe.requirements?.disk_gb ?? 10} GB`} />
            <SpecBadge label="Build" value={`~${recipe.docker?.build_time_minutes ?? 5} min`} />
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {!recipe.installed && !isBusy && !isRemoving && (
              <button onClick={() => installRecipe(recipe.slug)} className="btn-primary px-6 py-2.5 text-sm font-bold">
                Install
              </button>
            )}
            {isBuilding && (
              <div className="px-5 py-2.5 bg-primary/10 rounded-xl text-sm text-primary font-semibold font-label">
                <span className="inline-block animate-spin mr-1">⟳</span>Building
              </div>
            )}
            {isUpdating && (
              <div className="px-5 py-2.5 bg-primary/10 rounded-xl text-sm text-primary font-semibold font-label">
                <span className="inline-block animate-spin mr-1">⟳</span>Updating
              </div>
            )}
            {isRestarting && (
              <div className="px-5 py-2.5 bg-warning/10 rounded-xl text-sm text-warning font-semibold font-label">
                <span className="inline-block animate-spin mr-1">⟳</span>Restarting
              </div>
            )}
            {isRemoving && (
              <div className="px-5 py-2.5 bg-error-surface rounded-xl text-sm text-error font-semibold font-label">
                <span className="inline-block animate-spin mr-1">⟳</span>Uninstalling
              </div>
            )}
            {recipe.installed && !recipe.running && !recipe.starting && !isBusy && !isRemoving && (
              <>
                <button disabled={launching || isRemoving} onClick={handleLaunch} className="btn-primary px-6 py-2.5 text-sm font-bold">
                  {launching ? '...' : `▶ ${getRecipeLaunchLabel(recipe)}`}
                </button>
                <button disabled={launching || isRemoving} onClick={() => updateRecipe(recipe.slug)} className="px-4 py-2.5 bg-surface-high text-text-muted border-none rounded-xl text-sm font-semibold cursor-pointer transition-all hover:text-primary hover:bg-surface-highest disabled:opacity-50">
                  ↻ Update
                </button>
                <button disabled={isRemoving} onClick={handleRemove} className="px-4 py-2.5 bg-error-surface text-error border-none rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-50">
                  {isRemoving ? '...' : 'Uninstall'}
                </button>
              </>
            )}
            {(recipe.running || recipe.starting) && (
              <>
                {isReady && (
                  <a href={getRecipeUrl(recipe)} target="_blank" rel="noreferrer"
                    className="btn-primary px-6 py-2.5 text-sm font-bold no-underline inline-block">
                    {getRecipeOpenLabelWithArrow(recipe)}
                  </a>
                )}
                <button disabled={stopping} onClick={handleStop} className="px-4 py-2.5 bg-surface-high text-text-muted border-none rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50">
                  {stopping ? '...' : '■ Stop'}
                </button>
                <button disabled={isRestarting || stopping} onClick={handleRestart} className="px-4 py-2.5 bg-surface-high text-text-muted border-none rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50">
                  {isRestarting ? '...' : '↻ Restart'}
                </button>
                <button disabled={isRemoving} onClick={handleRemove} className="px-4 py-2.5 bg-error-surface text-error border-none rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50">
                  Uninstall
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 py-3 border-b border-outline-dim bg-surface-low/40">
        <div className="inline-flex items-center gap-2 rounded-2xl bg-surface-high/70 p-1.5 border border-outline-dim">
          {detailTabs.map((tab) => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-primary text-primary-on shadow-lg shadow-primary/20'
                    : 'bg-transparent text-text-dim hover:bg-surface-highest hover:text-text'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'details' ? (
          showDedicatedConfigTab ? (
            <div className="h-full min-h-0 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]">
              <AboutTab recipe={recipe} hardwareFit={hardwareFit} purging={purging} purgeRecipe={purgeRecipe} isBuilding={isBusy} />
            </div>
          ) : (
            <div className="h-full min-h-0 grid xl:grid-cols-[minmax(0,50rem)_minmax(24rem,1fr)]">
              <div className="overflow-y-auto border-b border-outline-dim xl:border-b-0 xl:border-r bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]">
                <AboutTab recipe={recipe} hardwareFit={hardwareFit} purging={purging} purgeRecipe={purgeRecipe} isBuilding={isBusy} />
              </div>

              <Suspense fallback={<ConfigWorkspaceSkeleton inline />}>
                <InlineConfigWorkspace recipe={recipe} />
              </Suspense>
            </div>
          )
        ) : activeTab === 'config' ? (
          <Suspense fallback={<ConfigWorkspaceSkeleton />}>
            <RecipeConfigTab key={recipe.slug} recipe={recipe} />
          </Suspense>
        ) : (
          <div className="h-full min-h-0">
            <TerminalPanel
              lines={logLines}
              isBuilding={isBusy}
              isUpdating={isUpdating}
              isRunning={recipe.running || recipe.starting}
              isReady={isReady}
              hasLogs={cLogs.length > 0}
              scrollRef={scrollRef}
              wide
            />
          </div>
        )}
      </div>

      {showHfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-high rounded-2xl p-6 w-full max-w-md shadow-2xl border border-outline-dim">
            <h3 className="text-lg font-bold text-text font-display m-0">HuggingFace Token Required</h3>
            <p className="text-sm text-text-dim mt-2 mb-4 leading-relaxed">
              This model uses gated assets on HuggingFace. Paste your access token below to continue.
              You can create one at{' '}
              <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                huggingface.co/settings/tokens
              </a>.
            </p>
            <input
              type="password"
              placeholder="hf_..."
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleHfSubmit()}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-low text-text border border-outline-dim text-sm font-mono focus:outline-none focus:border-primary"
              autoFocus
            />
            {hfError && <p className="text-xs text-error mt-2 m-0">{hfError}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowHfModal(false); setHfToken(''); setHfError('') }}
                className="px-4 py-2 bg-transparent text-text-muted border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleHfSubmit}
                disabled={!hfToken.trim() || hfSaving}
                className="px-5 py-2 bg-primary text-white border-none rounded-xl text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                {hfSaving ? 'Saving...' : 'Save & Launch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUninstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-high rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-outline-dim">
            <h3 className="text-lg font-bold text-text font-display m-0">Uninstall {recipe.name}</h3>
            <p className="text-sm text-text-dim mt-2 mb-5 leading-relaxed">
              Choose whether to keep the mounted config and data files, or remove everything created for this recipe.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => handleRemoveConfirm(false)}
                disabled={isRemoving}
                className="text-left rounded-2xl border border-outline-dim bg-surface-low px-4 py-4 cursor-pointer hover:border-primary transition-colors disabled:opacity-50"
              >
                <div className="text-sm font-semibold text-text">Uninstall giữ data</div>
                <div className="text-xs text-text-dim mt-1 leading-5">
                  Remove containers, images, and volumes only. Keep local bind-mounted data and config files.
                </div>
              </button>

              <button
                onClick={() => handleRemoveConfirm(true)}
                disabled={isRemoving}
                className="text-left rounded-2xl border border-error/40 bg-error-surface px-4 py-4 cursor-pointer hover:border-error transition-colors disabled:opacity-50"
              >
                <div className="text-sm font-semibold text-error">Uninstall xóa sạch data</div>
                <div className="text-xs text-text-dim mt-1 leading-5">
                  Remove containers, images, volumes, and local bind-mounted data/config created under this recipe.
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowUninstallModal(false)}
                disabled={isRemoving}
                className="px-4 py-2 bg-transparent text-text-muted border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer hover:text-text transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusPill({ color, pulse, children }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error-surface text-error',
    dim: 'bg-surface-highest text-text-dim',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium font-label px-2.5 py-1 rounded-full ${colorMap[color]} ${pulse ? 'animate-pulse' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        color === 'primary' ? 'bg-primary' : color === 'success' ? 'bg-success' : color === 'warning' ? 'bg-warning' : color === 'error' ? 'bg-error' : 'bg-text-dim'
      }`} />
      {children}
    </span>
  )
}

function SpecBadge({ label, value }) {
  return (
    <div className="border border-outline-dim rounded-xl px-3.5 py-2.5 bg-surface-high/65 min-w-[112px]">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="mt-1 text-[12px] font-semibold text-text font-display">{value}</div>
    </div>
  )
}

function RelatedRecipeCard({ recipe, onSelect }) {
  const logoUrl = useThemedLogo(recipe.logo)
  const [logoFailed, setLogoFailed] = useState(false)

  return (
    <div className="rounded-2xl border border-outline-dim bg-surface-high/50 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        {logoUrl && !logoFailed ? (
          <img
            src={logoUrl}
            alt={recipe.name}
            className="w-12 h-12 rounded-xl object-contain bg-surface-highest p-2 shrink-0"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-surface-highest flex items-center justify-center text-lg shrink-0">
            {recipe.icon || '◻'}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text">{recipe.name}</div>
          <div className="text-sm text-text-dim mt-1">{recipe.description}</div>
        </div>
      </div>
      <button
        onClick={() => onSelect(recipe.slug)}
        className="px-4 py-2.5 bg-surface-highest text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer hover:border-primary hover:text-primary transition-all shrink-0"
      >
        View
      </button>
    </div>
  )
}

function AboutTab({ recipe, hardwareFit, purging, purgeRecipe, isBuilding }) {
  const recipes = useStore((s) => s.recipes)
  const selectRecipe = useStore((s) => s.selectRecipe)
  const officialUrl = recipe.website || ''
  const sourceUrl = recipe.upstream || recipe.fork || ''
  const isNotebook = isNotebookRecipe(recipe)
  const relatedRecipes = (recipe.depends_on || [])
    .map((slug) => recipes.find((item) => item.slug === slug))
    .filter(Boolean)

  return (
    <div className="w-full px-6 py-6">
      <div className="max-w-[44rem]">
        <div className="space-y-7">
          <p className="text-[15px] text-text-muted leading-7 m-0">{recipe.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            {officialUrl && (
              <a href={officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary no-underline hover:text-primary/80 transition-colors font-medium">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Website
              </a>
            )}
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-text-dim no-underline hover:text-text transition-colors font-medium">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                Source
              </a>
            )}
          </div>

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((t) => (
                <span key={t} className="bg-surface-high/70 text-text-dim px-2.5 py-1 rounded-full text-[11px] font-label">{t}</span>
              ))}
            </div>
          )}

          <HostFitPanel fit={hardwareFit} />

          {relatedRecipes.length > 0 && (
            <div className="space-y-4 pt-5 border-t border-outline-dim">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Suggested Add-On</div>
                <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                  For quick local testing, install a shared Ollama runtime and connect this app to its default endpoint.
                </p>
              </div>
              <div className="space-y-3">
                {relatedRecipes.map((item) => (
                  <RelatedRecipeCard key={item.slug} recipe={item} onSelect={selectRecipe} />
                ))}
              </div>
            </div>
          )}

          {recipe.runtime_env_path && (
            <div className="space-y-4 pt-5 border-t border-outline-dim">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Advanced Configuration</div>
                <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                  {isNotebook
                    ? 'This notebook blueprint creates a local runtime env file on first install. Review it before launch if you need to supply NVIDIA API credentials or VIAVI endpoint details.'
                    : 'This app creates a local runtime config file on first install. Most users should leave it alone. If you know what you are doing, you can edit it manually and relaunch the app.'}
                </p>
              </div>
              <Field label="Runtime env file" value={recipe.runtime_env_path} />
            </div>
          )}

          {recipe.commands?.length > 0 && (
            <div className="space-y-4 pt-5 border-t border-outline-dim">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Execution Commands</div>
                <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                  Use these commands from the repository root if you want to install or operate this recipe manually outside the UI.
                </p>
              </div>
              <div className="space-y-3">
                {recipe.commands.map((item) => (
                  <CommandBlock key={`${recipe.slug}-${item.label}`} item={item} />
                ))}
              </div>
            </div>
          )}

          {recipe.integration && (
            <div className="space-y-4 pt-5 border-t border-outline-dim">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">API Integration</div>
                {recipe.tags?.includes('vllm') && (
                  <div className="text-[10px] text-text-muted mt-1">All vLLM models are served on port 9001</div>
                )}
              </div>
              <div className="space-y-2.5">
                <Field label="API URL" value={recipe.integration.api_url.replace('<SPARK_IP>', location.hostname)} />
                <Field label="Model ID" value={recipe.integration.model_id} />
                <Field label="API Key" value={recipe.integration.api_key} />
                {recipe.integration.max_context && <Field label="Max Context" value={recipe.integration.max_context} />}
                {recipe.integration.max_output_tokens && <Field label="Max Output" value={recipe.integration.max_output_tokens} />}
                {recipe.integration.curl_example && (
                  <div className="pt-2">
                    <span className="text-[10px] text-text-dim font-label block mb-1">curl example</span>
                    <pre className="bg-surface rounded-xl p-3 text-[11px] text-text-muted font-mono overflow-x-auto whitespace-pre-wrap break-all m-0 leading-relaxed border border-outline-dim">
                      {recipe.integration.curl_example.replace(/<SPARK_IP>/g, location.hostname)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!recipe.installed && !isBuilding && recipe.has_leftovers && (
          <div className="mt-12 pt-6 border-t border-outline-dim space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Cleanup</div>
              <p className="text-sm text-text-dim leading-6 m-0 mt-2">Remove leftover images or volumes from a previous uninstall. This is destructive and should only be used when you want to free all remaining app data.</p>
            </div>
            <button
              disabled={purging === recipe.slug}
              onClick={() => { if (window.confirm(`Wipe all data for ${recipe.name}?`)) purgeRecipe(recipe.slug) }}
              className="px-4 py-2.5 bg-warning/10 text-warning border border-warning/20 rounded-xl text-sm font-semibold cursor-pointer hover:bg-warning/15 transition-all disabled:opacity-50"
            >
              {purging === recipe.slug ? 'Wiping cached data...' : 'Wipe cached data'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function HostFitPanel({ fit }) {
  const panelClass = fit.tone === 'success'
    ? 'border-success/20 bg-success/5'
    : fit.tone === 'warning'
      ? 'border-warning/20 bg-warning/5'
      : fit.tone === 'error'
        ? 'border-error/20 bg-error-surface/60'
        : 'border-outline-dim bg-surface-high/30'

  return (
    <div className="space-y-4 pt-5 border-t border-outline-dim">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Host Fit Check</div>
        <p className="text-sm text-text-dim leading-6 m-0 mt-2">
          {fit.headline}
        </p>
      </div>

      <div className={`rounded-2xl border p-4 ${panelClass}`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusPill color={fit.tone}>{`Host ${fit.label}`}</StatusPill>
        </div>
        <div className="space-y-2.5">
          {fit.checks.map((check) => (
            <div key={check.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface/40 px-3 py-2.5">
              <div>
                <div className="text-sm font-semibold text-text font-display">{check.label}</div>
                <div className="text-xs text-text-dim leading-5 mt-1">{check.message}</div>
              </div>
              <StatusPill color={check.status === 'critical' ? 'error' : check.status === 'warning' ? 'warning' : check.status === 'good' ? 'success' : 'dim'}>
                {check.status === 'critical' ? 'Action needed' : check.status === 'warning' ? 'Review' : check.status === 'good' ? 'OK' : 'Unknown'}
              </StatusPill>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CommandBlock({ item }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    const text = String(item.command)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) })
        .catch(() => fallbackCopy(text, setCopied))
    } else {
      fallbackCopy(text, setCopied)
    }
  }

  return (
    <div className="rounded-2xl border border-outline-dim bg-surface-high/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text font-display">{item.label}</div>
          {item.description && <p className="text-sm text-text-dim leading-6 m-0 mt-1">{item.description}</p>}
        </div>
        <button onClick={copy} className="shrink-0 p-1.5 bg-surface border-none rounded-lg cursor-pointer text-text-dim hover:text-primary transition-colors" title="Copy command">
          {copied ? (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          )}
        </button>
      </div>
      <pre className="bg-surface rounded-xl p-3 text-[11px] text-text-muted font-mono overflow-x-auto whitespace-pre-wrap break-all m-0 leading-relaxed border border-outline-dim">{item.command}</pre>
    </div>
  )
}

function Field({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const text = String(value)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) })
        .catch(() => fallbackCopy(text, setCopied))
    } else {
      fallbackCopy(text, setCopied)
    }
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="text-[10px] text-text-dim font-label block">{label}</span>
        <code className="text-xs text-text-muted font-mono break-all">{String(value)}</code>
      </div>
      <button onClick={copy} className="shrink-0 p-1.5 bg-surface border-none rounded-lg cursor-pointer text-text-dim hover:text-primary transition-colors" title="Copy">
        {copied ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </button>
    </div>
  )
}

function fallbackCopy(text, setCopied) {
  const ta = document.createElement('textarea')
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
  document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
  setCopied(true); setTimeout(() => setCopied(false), 1200)
}

function ConfigWorkspaceSkeleton({ inline = false }) {
  return (
    <div className={`h-full min-h-0 ${inline ? '' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]'}`}>
      <div className="h-full min-h-0 flex flex-col animate-pulse">
        <div className="shrink-0 px-5 py-4 border-b border-outline-dim bg-surface-low/50">
          <div className="h-4 w-40 rounded bg-surface-high" />
          <div className="h-3 w-80 rounded bg-surface-high mt-2" />
        </div>
        <div className="flex-1 p-5">
          <div className="h-full rounded-2xl bg-[#08080F] border border-outline-dim" />
        </div>
      </div>
    </div>
  )
}

function TerminalPanel({ lines, isBuilding, isUpdating, isRunning, isReady, hasLogs, scrollRef, wide = false }) {
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines.length, autoScroll, scrollRef])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40)
  }

  const showEmpty = !isBuilding && !isRunning && !hasLogs

  return (
    <div className={`h-full flex flex-col bg-[#08080F] ${wide ? 'w-full' : ''}`}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0C0C14] shrink-0 border-b border-[#1a1a2a]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]/70" />
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            {isUpdating ? 'update' : isBuilding ? 'build' : 'container'} - logs
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isBuilding && <span className="text-[10px] text-primary animate-pulse font-mono">{isUpdating ? '● updating' : '● building'}</span>}
          {!isBuilding && isRunning && isReady && <span className="text-[10px] text-emerald-400 font-mono">● running</span>}
          {!isBuilding && isRunning && !isReady && <span className="text-[10px] text-amber-400 animate-pulse font-mono">● starting</span>}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-5 selection:bg-primary/30"
      >
        {showEmpty && (
          <div className="text-gray-600 italic">No logs. Launch the app to see output here.</div>
        )}
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.includes('[error]') || l.includes('Error') || l.includes('FATAL') || l.includes('Traceback')
                ? 'text-red-400 whitespace-pre-wrap [tab-size:2]'
                : l.includes('successfully') || l.includes('Started') || l.includes('Running on')
                ? 'text-emerald-400 whitespace-pre-wrap [tab-size:2]'
                : 'text-gray-400 whitespace-pre-wrap [tab-size:2]'
            }
          >
            {l}
          </div>
        ))}
        {(isBuilding || (isRunning && !isReady)) && lines.length > 0 && (
          <span className="text-primary animate-pulse">▋</span>
        )}
      </div>
    </div>
  )
}
