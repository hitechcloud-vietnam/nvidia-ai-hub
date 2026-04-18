import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
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
  const tabs = [{ id: 'details', labelKey: 'recipe.overview' }]

  tabs.push({ id: 'community', labelKey: 'recipe.community' })

  if (hasDedicatedConfigTab(recipe)) {
    tabs.push({ id: 'config', labelKey: 'recipe.configuration' })
  }

  tabs.push({ id: 'logs', labelKey: 'recipe.logs' })
  tabs.push({ id: 'shell', labelKey: 'recipe.terminal' })
  return tabs
}

export default function RecipeDetail() {
  const { t } = useTranslation()
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
  const buildProgress = useStore((s) => s.buildProgress)
  const containerLogs = useStore((s) => s.containerLogs)
  const recipeMetrics = useStore((s) => s.recipeMetrics)
  const systemTopology = useStore((s) => s.systemTopology)
  const deploymentPlans = useStore((s) => s.deploymentPlans)
  const connectLogs = useStore((s) => s.connectLogs)
  const disconnectLogs = useStore((s) => s.disconnectLogs)
  const fetchRecipeDetail = useStore((s) => s.fetchRecipeDetail)
  const fetchSystemTopology = useStore((s) => s.fetchSystemTopology)
  const fetchRecipeDeploymentPlan = useStore((s) => s.fetchRecipeDeploymentPlan)
  const saveRecipeDeploymentSelection = useStore((s) => s.saveRecipeDeploymentSelection)
  const verifyRecipeCommunity = useStore((s) => s.verifyRecipeCommunity)
  const rateRecipeCommunity = useStore((s) => s.rateRecipeCommunity)
  const addRecipeCommunityTip = useStore((s) => s.addRecipeCommunityTip)
  const exportRecipeCommunity = useStore((s) => s.exportRecipeCommunity)

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
  const [deploymentSelection, setDeploymentSelection] = useState(null)
  const [deploymentSaving, setDeploymentSaving] = useState(false)
  const [execCommand, setExecCommand] = useState('')
  const [execHistory, setExecHistory] = useState([])
  const [execRunning, setExecRunning] = useState(false)

  useEffect(() => {
    if (selectedRecipe) {
      fetchRecipeDetail(selectedRecipe)
      fetchSystemTopology()
      fetchRecipeDeploymentPlan(selectedRecipe)
    }
  }, [selectedRecipe, fetchRecipeDetail, fetchRecipeDeploymentPlan, fetchSystemTopology])

  const deploymentPlan = selectedRecipe ? deploymentPlans[selectedRecipe] : null
  const recommendedDeployment = useMemo(
    () => deploymentPlan?.recommendations?.find((item) => item.recommended) || deploymentPlan?.recommendations?.[0] || null,
    [deploymentPlan],
  )

  useEffect(() => {
    if (deploymentPlan?.selected) {
      setDeploymentSelection(deploymentPlan.selected)
      return
    }
    if (recommendedDeployment) {
      setDeploymentSelection({
        profile: recommendedDeployment.profile,
        strategy: recommendedDeployment.strategy,
        target_gpu_indices: recommendedDeployment.target_gpu_indices || [],
        target_hosts: recommendedDeployment.target_hosts || [],
        shared_storage_path: '',
        notes: '',
      })
    }
  }, [deploymentPlan, recommendedDeployment])

  const isBuilding = installing === recipe?.slug
  const isUpdating = updating === recipe?.slug
  const isRestarting = restarting === recipe?.slug || restartingNow
  const isBusy = isBuilding || isUpdating || isRestarting

  useEffect(() => {
    if (recipe?.running || recipe?.starting) {
      connectLogs(recipe.slug)
    } else {
      disconnectLogs(recipe?.slug)
    }
    return () => disconnectLogs(recipe?.slug)
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

  useEffect(() => {
    setExecCommand('')
    setExecHistory([])
    setExecRunning(false)
  }, [recipe?.slug])

  if (!recipe) {
    return (
      <div className="p-8 animate-fadeIn">
        <button onClick={clearRecipe} className="text-primary bg-transparent border-none cursor-pointer text-sm font-semibold font-display">
          ← {t('common.back')}
        </button>
        <p className="text-text-muted mt-4">{t('recipe.notFound')}</p>
      </div>
    )
  }

  if (!recipeDetails[selectedRecipe] && detailStatus?.loading) {
    return (
      <div className="p-8 animate-fadeIn">
        <button onClick={clearRecipe} className="text-primary bg-transparent border-none cursor-pointer text-sm font-semibold font-display">
          ← {t('common.back')}
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
  const progressState = buildProgress[recipe.slug] || null
  const runtimeMetrics = recipeMetrics[recipe.slug] || null
  const showAppMonitor = Boolean(isBusy || recipe.running || recipe.starting)
  const registryChanged = Boolean(recipe.registry_changed)

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
    await launchRecipe(recipe.slug, deploymentSelection)
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
      if (!res.ok) throw new Error(t('recipe.hfSaveFailed'))
      setShowHfModal(false)
      setHfToken('')
      setLaunching(true)
      await launchRecipe(recipe.slug, deploymentSelection)
      setLaunching(false)
    } catch {
      setHfError(t('recipe.hfSaveFailed'))
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

  const handleExec = async (event) => {
    event?.preventDefault()
    const command = execCommand.trim()
    if (!command || execRunning || !recipe?.running) return

    setExecRunning(true)
    setExecHistory((prev) => [...prev, `$ ${command}`])

    try {
      const res = await fetch(`/api/recipes/${recipe.slug}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = payload?.detail || `HTTP ${res.status}`
        setExecHistory((prev) => [...prev, `[error] ${message}`])
      } else {
        setExecHistory((prev) => [
          ...prev,
          ...(Array.isArray(payload.lines) && payload.lines.length > 0 ? payload.lines : [t('recipe.commandCompleted')]),
          `[exit ${payload.exit_code ?? 0}]`,
        ])
      }
    } catch (error) {
      setExecHistory((prev) => [...prev, `[error] ${error?.message || t('recipe.commandFailed')}`])
    } finally {
      setExecCommand('')
      setExecRunning(false)
    }
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
          {t('common.back')}
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
              {isBuilding && <StatusPill color="primary" pulse>{t('recipe.building')}</StatusPill>}
              {isUpdating && <StatusPill color="primary" pulse>{t('recipe.updating')}</StatusPill>}
              {isRestarting && <StatusPill color="warning" pulse>{t('running.restarting')}</StatusPill>}
              {!isBusy && recipe.running && isReady && <StatusPill color="success">{t('running.runningStatus')}</StatusPill>}
              {!isBusy && recipe.starting && <StatusPill color="warning" pulse>{t('running.starting')}</StatusPill>}
              {!isBusy && !recipe.running && !recipe.starting && recipe.installed && <StatusPill color="dim">{t('running.stopped')}</StatusPill>}
              <StatusPill color={hardwareFit.tone}>{t('common.hostLabel', { label: hardwareFit.label })}</StatusPill>
              {deploymentSelection?.profile && <StatusPill color="primary">{deploymentSelection.profile}</StatusPill>}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <SpecBadge label={t('recipe.memory')} value={`${recipe.requirements?.min_memory_gb ?? 8}–${recipe.requirements?.recommended_memory_gb ?? recipe.requirements?.min_memory_gb ?? 8} GB`} />
            <SpecBadge label={t('recipe.disk')} value={`${recipe.requirements?.disk_gb ?? 10} GB`} />
            <SpecBadge label={t('recipe.build')} value={`~${recipe.docker?.build_time_minutes ?? 5} min`} />
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {!recipe.installed && !isBusy && !isRemoving && (
              <button onClick={() => installRecipe(recipe.slug, deploymentSelection)} className="btn-primary px-6 py-2.5 text-sm font-bold">
                {t('catalog.install')}
              </button>
            )}
            {isBuilding && (
              <div className="px-5 py-2.5 bg-primary/10 rounded-xl text-sm text-primary font-semibold font-label">
                <span className="inline-block animate-spin mr-1">⟳</span>{t('recipe.building')}
              </div>
            )}
            {isUpdating && (
              <div className="px-5 py-2.5 bg-primary/10 rounded-xl text-sm text-primary font-semibold font-label">
                <span className="inline-block animate-spin mr-1">⟳</span>{t('recipe.updating')}
              </div>
            )}
            {isRestarting && (
              <div className="px-5 py-2.5 bg-warning/10 rounded-xl text-sm text-warning font-semibold font-label">
                <span className="inline-block animate-spin mr-1">⟳</span>{t('running.restarting')}
              </div>
            )}
            {isRemoving && (
              <div className="px-5 py-2.5 bg-error-surface rounded-xl text-sm text-error font-semibold font-label">
                <span className="inline-block animate-spin mr-1">⟳</span>{t('recipe.uninstalling')}
              </div>
            )}
            {recipe.installed && !recipe.running && !recipe.starting && !isBusy && !isRemoving && (
              <>
                <button disabled={launching || isRemoving} onClick={handleLaunch} className="btn-primary px-6 py-2.5 text-sm font-bold">
                  {launching ? '...' : `▶ ${getRecipeLaunchLabel(recipe)}`}
                </button>
                <button disabled={launching || isRemoving} onClick={() => updateRecipe(recipe.slug)} className="px-4 py-2.5 bg-surface-high text-text-muted border-none rounded-xl text-sm font-semibold cursor-pointer transition-all hover:text-primary hover:bg-surface-highest disabled:opacity-50">
                  ↻ {t('recipe.update')}
                </button>
                {registryChanged && (
                  <span className="px-3 py-2 bg-warning/10 text-warning rounded-xl text-xs font-semibold font-label">
                    {t('recipe.registryChanged')}{recipe.registry_update_count ? ` · ${recipe.registry_update_count}` : ''}
                  </span>
                )}
                <button disabled={isRemoving} onClick={handleRemove} className="px-4 py-2.5 bg-error-surface text-error border-none rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-50">
                  {isRemoving ? '...' : t('recipe.uninstall')}
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
                  {stopping ? '...' : `■ ${t('running.stop')}`}
                </button>
                <button disabled={isRestarting || stopping} onClick={handleRestart} className="px-4 py-2.5 bg-surface-high text-text-muted border-none rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50">
                  {isRestarting ? '...' : `↻ ${t('running.restart')}`}
                </button>
                <button disabled={isRemoving} onClick={handleRemove} className="px-4 py-2.5 bg-error-surface text-error border-none rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50">
                  {t('recipe.uninstall')}
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
                {t(tab.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'details' ? (
          showDedicatedConfigTab ? (
            <div className="h-full min-h-0 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]">
              <AboutTab
                recipe={recipe}
                hardwareFit={hardwareFit}
                purging={purging}
                purgeRecipe={purgeRecipe}
                isBuilding={isBusy}
                deploymentPlan={deploymentPlan}
                deploymentSelection={deploymentSelection}
                setDeploymentSelection={setDeploymentSelection}
                deploymentSaving={deploymentSaving}
                saveDeploymentSelection={async () => {
                  if (!recipe?.slug || !deploymentSelection) return
                  setDeploymentSaving(true)
                  try {
                    await saveRecipeDeploymentSelection(recipe.slug, deploymentSelection)
                  } finally {
                    setDeploymentSaving(false)
                  }
                }}
                systemTopology={systemTopology}
              />
            </div>
          ) : (
            <div className="h-full min-h-0 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]">
              <div>
                <AboutTab
                  recipe={recipe}
                  hardwareFit={hardwareFit}
                  purging={purging}
                  purgeRecipe={purgeRecipe}
                  isBuilding={isBusy}
                  deploymentPlan={deploymentPlan}
                  deploymentSelection={deploymentSelection}
                  setDeploymentSelection={setDeploymentSelection}
                  deploymentSaving={deploymentSaving}
                  saveDeploymentSelection={async () => {
                    if (!recipe?.slug || !deploymentSelection) return
                    setDeploymentSaving(true)
                    try {
                      await saveRecipeDeploymentSelection(recipe.slug, deploymentSelection)
                    } finally {
                      setDeploymentSaving(false)
                    }
                  }}
                  systemTopology={systemTopology}
                />
              </div>

              <div className="border-t border-outline-dim">
                <Suspense fallback={<ConfigWorkspaceSkeleton inline />}>
                  <InlineConfigWorkspace recipe={recipe} />
                </Suspense>
              </div>
            </div>
          )
        ) : activeTab === 'community' ? (
          <div className="h-full min-h-0 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]">
            <RecipeCommunityTab
              recipe={recipe}
              onVerify={verifyRecipeCommunity}
              onRate={rateRecipeCommunity}
              onAddTip={addRecipeCommunityTip}
              onExport={exportRecipeCommunity}
            />
          </div>
        ) : activeTab === 'config' ? (
          <Suspense fallback={<ConfigWorkspaceSkeleton />}>
            <RecipeConfigTab key={recipe.slug} recipe={recipe} />
          </Suspense>
        ) : activeTab === 'logs' ? (
          <div className="h-full min-h-0 grid xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="min-h-0 border-b border-outline-dim xl:border-b-0 xl:border-r">
              <div className="h-full min-h-0">
                <TerminalPanel
                  lines={logLines}
                  isBuilding={isBusy}
                  isUpdating={isUpdating}
                  isRunning={recipe.running || recipe.starting}
                  isReady={isReady}
                  hasLogs={cLogs.length > 0}
                  progressState={progressState}
                  scrollRef={scrollRef}
                  wide
                />
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto bg-surface-low/30">
              {showAppMonitor ? (
                <RecipeMonitorPanel recipe={recipe} metrics={runtimeMetrics} />
              ) : (
                <div className="px-5 py-5 text-sm text-text-dim">{t('recipe.liveResourceTelemetry')}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-0">
            <CommandTerminalPanel
              recipe={recipe}
              lines={execHistory}
              command={execCommand}
              setCommand={setExecCommand}
              onSubmit={handleExec}
              running={execRunning}
            />
          </div>
        )}
      </div>

      {showHfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-high rounded-2xl p-6 w-full max-w-md shadow-2xl border border-outline-dim">
            <h3 className="text-lg font-bold text-text font-display m-0">{t('recipe.hfTokenRequired')}</h3>
            <p className="text-sm text-text-dim mt-2 mb-4 leading-relaxed">
              {t('recipe.hfTokenBody')}{' '}
              <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                huggingface.co/settings/tokens
              </a>.
            </p>
            <input
              type="password"
              placeholder={t('models.hf.tokenPlaceholder')}
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleHfSubmit}
                disabled={!hfToken.trim() || hfSaving}
                className="px-5 py-2 bg-primary text-white border-none rounded-xl text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                {hfSaving ? t('recipe.saving') : t('recipe.saveAndLaunch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUninstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-high rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-outline-dim">
            <h3 className="text-lg font-bold text-text font-display m-0">{t('recipe.uninstallTitle', { name: recipe.name })}</h3>
            <p className="text-sm text-text-dim mt-2 mb-5 leading-relaxed">
              {t('recipe.uninstallBody')}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => handleRemoveConfirm(false)}
                disabled={isRemoving}
                className="text-left rounded-2xl border border-outline-dim bg-surface-low px-4 py-4 cursor-pointer hover:border-primary transition-colors disabled:opacity-50"
              >
                <div className="text-sm font-semibold text-text">{t('recipe.uninstallKeepData')}</div>
                <div className="text-xs text-text-dim mt-1 leading-5">
                  {t('recipe.uninstallKeepDataBody')}
                </div>
              </button>

              <button
                onClick={() => handleRemoveConfirm(true)}
                disabled={isRemoving}
                className="text-left rounded-2xl border border-error/40 bg-error-surface px-4 py-4 cursor-pointer hover:border-error transition-colors disabled:opacity-50"
              >
                <div className="text-sm font-semibold text-error">{t('recipe.uninstallDeleteData')}</div>
                <div className="text-xs text-text-dim mt-1 leading-5">
                  {t('recipe.uninstallDeleteDataBody')}
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowUninstallModal(false)}
                disabled={isRemoving}
                className="px-4 py-2 bg-transparent text-text-muted border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer hover:text-text transition-colors disabled:opacity-40"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RecipeCommunityTab({ recipe, onVerify, onRate, onAddTip, onExport }) {
  const { t } = useTranslation()
  const community = recipe.community || {}
  const tips = Array.isArray(community.tips) ? community.tips : []
  const [submittingVerify, setSubmittingVerify] = useState(false)
  const [submittingRating, setSubmittingRating] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [tipAuthor, setTipAuthor] = useState('')
  const [tipContent, setTipContent] = useState('')
  const [tipSaving, setTipSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const handleVerify = async () => {
    setSubmittingVerify(true)
    setError('')
    setFeedback('')
    try {
      await onVerify(recipe.slug)
      setFeedback(t('recipe.feedbackVerificationRecorded'))
    } catch (e) {
      setError(e?.message || t('recipe.feedbackFailedVerification'))
    } finally {
      setSubmittingVerify(false)
    }
  }

  const handleRate = async (score) => {
    setSubmittingRating(score)
    setError('')
    setFeedback('')
    try {
      await onRate(recipe.slug, score)
      setFeedback(t('recipe.feedbackSavedRating', { score }))
    } catch (e) {
      setError(e?.message || t('recipe.feedbackFailedRating'))
    } finally {
      setSubmittingRating(0)
    }
  }

  const handleTipSubmit = async (event) => {
    event.preventDefault()
    const content = tipContent.trim()
    if (content.length < 4) {
      setError(t('recipe.feedbackTipTooShort'))
      return
    }

    setTipSaving(true)
    setError('')
    setFeedback('')
    try {
      await onAddTip(recipe.slug, {
        author: tipAuthor.trim() || t('recipe.communityAnonymous'),
        content,
      })
      setTipContent('')
      setTipAuthor('')
      setFeedback(t('recipe.feedbackTipSubmitted'))
    } catch (e) {
      setError(e?.message || t('recipe.feedbackFailedTip'))
    } finally {
      setTipSaving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setError('')
    setFeedback('')
    try {
      const result = await onExport(recipe.slug)
      setFeedback(t('recipe.feedbackExportedYaml', { path: result.path }))
    } catch (e) {
      setError(e?.message || t('recipe.feedbackFailedExport'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="w-full px-6 py-6">
      <div className="max-w-[56rem] space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <CommunityMetricCard label={t('recipe.communityAverageRating')} value={community.rating_count ? `${community.rating_average.toFixed(1)} / 5` : t('recipe.communityUnrated')} hint={t('recipe.communityRatings', { count: community.rating_count || 0 })} />
          <CommunityMetricCard label={t('recipe.communityVerifiedSystems')} value={String(community.verified_count || 0)} hint={t('recipe.communityVerifiedHint')} />
          <CommunityMetricCard label={t('recipe.communitySharedTips')} value={String(community.tips_count || 0)} hint={t('recipe.communitySharedTipsHint')} />
          <CommunityMetricCard label={t('recipe.communitySubmitRecipe')} value={t('recipe.communityOpenPrFlow')} hint={t('recipe.communityOpenPrHint')} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-outline-dim bg-surface p-5 space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.communityVerification')}</div>
              <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                {t('recipe.communityVerificationBody')}
              </p>
            </div>
            <button
              onClick={handleVerify}
              disabled={submittingVerify}
              className="w-full px-4 py-3 bg-primary text-primary-on border-none rounded-2xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              {submittingVerify ? t('recipe.communityRecordingVerification') : t('recipe.communityVerifiedOnMySystem')}
            </button>

            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.communityRating')}</div>
              <p className="text-sm text-text-dim leading-6 m-0 mt-2">{t('recipe.communityRatingBody')}</p>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((score) => {
                  const filled = score <= Math.round(community.rating_average || 0)
                  return (
                    <button
                      key={score}
                      onClick={() => handleRate(score)}
                      disabled={submittingRating > 0}
                      className={`h-10 w-10 rounded-xl border text-lg transition-all ${
                        filled
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-outline-dim bg-surface-high text-text-dim hover:text-text'
                      } disabled:opacity-50`}
                      title={t('recipe.communityRateOutOfFive', { score })}
                    >
                      ★
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-outline-dim bg-surface-low/60 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.communitySubmitRecipe')}</div>
              <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                {t('recipe.communityContributionBody')}
              </p>
              <a
                href={community.submit_recipe_url || 'https://github.com/hitechcloud-vietnam/nvidia-ai-hub/compare/main...main?expand=1'}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-primary no-underline font-semibold hover:text-primary/80"
              >
                {t('recipe.communityOpenContributionDraft')}
              </a>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-surface-high text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {exporting ? t('recipe.communityExporting') : t('recipe.communityExportYaml')}
              </button>
            </div>

            {(feedback || error) && (
              <div className="text-sm">
                {feedback && <div className="text-success">{feedback}</div>}
                {error && <div className="text-error">{error}</div>}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-outline-dim bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.communityCommentsTips')}</div>
                  <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                    {t('recipe.communityCommentsTipsBody')}
                  </p>
                </div>
              </div>

              <form onSubmit={handleTipSubmit} className="mt-4 space-y-3">
                <input
                  type="text"
                  value={tipAuthor}
                  onChange={(e) => setTipAuthor(e.target.value)}
                  maxLength={80}
                  placeholder={t('recipe.communityNamePlaceholder')}
                  className="w-full px-4 py-3 bg-surface-high rounded-2xl text-text text-sm outline-none border border-outline-dim focus:border-primary/40"
                />
                <textarea
                  value={tipContent}
                  onChange={(e) => setTipContent(e.target.value)}
                  rows={5}
                  maxLength={1200}
                  placeholder={t('recipe.communityTipPlaceholder')}
                  className="w-full px-4 py-3 bg-surface-high rounded-2xl text-text text-sm outline-none border border-outline-dim focus:border-primary/40 resize-y"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-text-dim">{tipContent.trim().length}/1200</div>
                  <button
                    type="submit"
                    disabled={tipSaving || tipContent.trim().length < 4}
                    className="px-4 py-2.5 bg-primary text-primary-on border-none rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {tipSaving ? t('recipe.communitySubmitting') : t('recipe.communityShareTip')}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-3">
              {tips.length > 0 ? tips.map((tip) => (
                <div key={tip.id} className="rounded-3xl border border-outline-dim bg-surface p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-text font-display">{tip.author || t('recipe.communityAnonymous')}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{formatCommunityTimestamp(tip.created_at)}</div>
                  </div>
                  <p className="text-sm text-text-dim leading-6 m-0 mt-3 whitespace-pre-wrap">{tip.content}</p>
                </div>
              )) : (
                <div className="rounded-3xl border border-dashed border-outline-dim bg-surface p-6 text-sm text-text-dim">
                  {t('recipe.communityNoTips')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommunityMetricCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-outline-dim bg-surface p-5">
      <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="mt-3 text-2xl font-bold text-text font-display">{value}</div>
      <div className="mt-2 text-sm text-text-dim leading-6">{hint}</div>
    </div>
  )
}

function formatCommunityTimestamp(value) {
  if (!value) return i18n.t('common.recent')
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
  const { t } = useTranslation()
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
        {t('common.view')}
      </button>
    </div>
  )
}

function AboutTab({ recipe, hardwareFit, purging, purgeRecipe, isBuilding, deploymentPlan, deploymentSelection, setDeploymentSelection, deploymentSaving, saveDeploymentSelection, systemTopology }) {
  const { t } = useTranslation()
  const recipes = useStore((s) => s.recipes)
  const selectRecipe = useStore((s) => s.selectRecipe)
  const officialUrl = recipe.website || ''
  const sourceUrl = recipe.upstream || recipe.fork || ''
  const isNotebook = isNotebookRecipe(recipe)
  const registryChanged = Boolean(recipe.registry_changed)
  const recentCommits = Array.isArray(recipe.registry_updates) ? recipe.registry_updates : []
  const relatedRecipes = (recipe.depends_on || [])
    .map((slug) => recipes.find((item) => item.slug === slug))
    .filter(Boolean)
  const platformExports = recipe.platform_exports || buildPlatformExports(recipe)
  const exportCards = Array.isArray(platformExports?.artifacts) && platformExports.artifacts.length > 0
    ? platformExports.artifacts.map((item, index) => ({
        key: `${recipe.slug}-export-${index}`,
        label: item.label,
        description: item.description,
        value: item.value,
        filename: item.filename,
        mimeType: item.mime_type,
      }))
    : [
        {
          key: 'metadata',
          label: t('recipe.portableMetadata'),
          description: t('recipe.portableMetadataBody'),
          value: platformExports.metadata,
          filename: `${recipe.slug}-metadata.json`,
          mimeType: 'application/json;charset=utf-8',
          visible: true,
        },
        {
          key: 'deploymentProfiles',
          label: t('recipe.deploymentProfiles'),
          description: t('recipe.deploymentProfilesBody'),
          value: platformExports.deploymentProfiles,
          filename: `${recipe.slug}-deployment-profiles.json`,
          mimeType: 'application/json;charset=utf-8',
          visible: true,
        },
        {
          key: 'syncScript',
          label: t('recipe.syncCustomScript'),
          description: t('recipe.syncCustomScriptBody'),
          value: platformExports.syncScript,
          filename: `${recipe.slug}-nvidia-sync.sh`,
          mimeType: 'text/x-shellscript;charset=utf-8',
          visible: platformExports.showSyncScript,
        },
        {
          key: 'sshCommand',
          label: t('recipe.sshRemoteLaunch'),
          description: t('recipe.sshRemoteLaunchBody'),
          value: platformExports.sshCommand,
          filename: `${recipe.slug}-ssh-launch.sh`,
          mimeType: 'text/x-shellscript;charset=utf-8',
          visible: platformExports.showSshCommand,
        },
        {
          key: 'endpointSummary',
          label: t('recipe.launchEndpoint'),
          description: t('recipe.launchEndpointBody'),
          value: platformExports.endpointSummary,
          filename: `${recipe.slug}-endpoint.txt`,
          mimeType: 'text/plain;charset=utf-8',
          visible: platformExports.showEndpointSummary,
        },
      ].filter((item) => item.visible)

  return (
    <div className="w-full px-4 py-5 sm:px-6 sm:py-6 xl:px-8">
      <div className="w-full max-w-none">
        <div className="space-y-6">
          <OverviewSection>
            <div className="space-y-5">
              <p className="text-[15px] text-text-muted leading-7 m-0">{recipe.description}</p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                {officialUrl && (
                  <a href={officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary no-underline hover:text-primary/80 transition-colors font-medium">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    {t('recipe.website')}
                  </a>
                )}
                {sourceUrl && (
                  <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-text-dim no-underline hover:text-text transition-colors font-medium">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                    {t('recipe.source')}
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
            </div>
          </OverviewSection>

          <HostFitPanel fit={hardwareFit} />

          <DeploymentPlannerPanel
            plan={deploymentPlan}
            selection={deploymentSelection}
            onChange={setDeploymentSelection}
            onSave={saveDeploymentSelection}
            saving={deploymentSaving}
            systemTopology={systemTopology}
          />

          {relatedRecipes.length > 0 && (
            <OverviewSection>
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.suggestedAddOn')}</div>
                <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                  {t('recipe.suggestedAddOnBody')}
                </p>
              </div>
              <div className="space-y-3">
                {relatedRecipes.map((item) => (
                  <RelatedRecipeCard key={item.slug} recipe={item} onSelect={selectRecipe} />
                ))}
              </div>
            </OverviewSection>
          )}

          {recipe.runtime_env_path && (
            <OverviewSection>
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.advancedConfiguration')}</div>
                <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                  {isNotebook
                    ? t('recipe.advancedConfigNotebook')
                    : t('recipe.advancedConfigApp')}
                </p>
              </div>
              <Field label={t('recipe.runtimeEnvFile')} value={recipe.runtime_env_path} />
            </OverviewSection>
          )}

          {recipe.commands?.length > 0 && (
            <OverviewSection>
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.executionCommands')}</div>
                <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                  {t('recipe.executionCommandsBody')}
                </p>
              </div>
              <div className="space-y-3">
                {recipe.commands.map((item) => (
                  <CommandBlock key={`${recipe.slug}-${item.label}`} item={item} />
                ))}
              </div>
            </OverviewSection>
          )}

          {recipe.integration && (
            <OverviewSection>
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.apiIntegration')}</div>
                {recipe.tags?.includes('vllm') && (
                  <div className="text-[10px] text-text-muted mt-1">{t('recipe.vllmPortHint')}</div>
                )}
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                <Field label={t('recipe.apiUrl')} value={recipe.integration.api_url.replace('<NVIDIA_AI_HUB_IP>', location.hostname)} />
                <Field label={t('recipe.modelId')} value={recipe.integration.model_id} />
                <Field label={t('recipe.apiKey')} value={recipe.integration.api_key} />
                {recipe.integration.max_context && <Field label={t('recipe.maxContext')} value={recipe.integration.max_context} />}
                {recipe.integration.max_output_tokens && <Field label={t('recipe.maxOutput')} value={recipe.integration.max_output_tokens} />}
                {recipe.integration.curl_example && (
                  <div className="pt-2 xl:col-span-2">
                    <span className="text-[10px] text-text-dim font-label block mb-1">{t('recipe.curlExample')}</span>
                    <pre className="bg-surface rounded-xl p-3 text-[11px] text-text-muted font-mono overflow-x-auto whitespace-pre-wrap break-all m-0 leading-relaxed border border-outline-dim">
                      {recipe.integration.curl_example.replace(/<NVIDIA_AI_HUB_IP>/g, location.hostname)}
                    </pre>
                  </div>
                )}
              </div>
            </OverviewSection>
          )}

          <OverviewSection>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.platformIntegrationExport')}</div>
              <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                {t('recipe.platformIntegrationExportBody')}
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {exportCards.map((item) => (
                <ExportBlock key={item.key} label={item.label} description={item.description} value={item.value} filename={item.filename} mimeType={item.mimeType} />
              ))}
            </div>
          </OverviewSection>

          {registryChanged && recentCommits.length > 0 && (
            <OverviewSection>
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.registryUpdatesAvailable')}</div>
                <p className="text-sm text-text-dim leading-6 m-0 mt-2">
                  {t('recipe.registryUpdatesBody')}
                </p>
              </div>
              <div className="space-y-3">
                {recentCommits.map((commit) => (
                  <div key={`${commit.sha}-${commit.date}`} className="rounded-2xl border border-outline-dim bg-surface-high/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-text font-display">{commit.subject}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{commit.sha}</div>
                    </div>
                    <div className="text-xs text-text-dim mt-2">{commit.date}</div>
                  </div>
                ))}
              </div>
            </OverviewSection>
          )}
        </div>

        {!recipe.installed && !isBuilding && recipe.has_leftovers && (
          <div className="mt-6">
            <OverviewSection>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.cleanup')}</div>
              <p className="text-sm text-text-dim leading-6 m-0 mt-2">{t('recipe.cleanupBody')}</p>
            </div>
            <button
              disabled={purging === recipe.slug}
              onClick={() => { if (window.confirm(t('recipe.wipeConfirm', { name: recipe.name }))) purgeRecipe(recipe.slug) }}
              className="px-4 py-2.5 bg-warning/10 text-warning border border-warning/20 rounded-xl text-sm font-semibold cursor-pointer hover:bg-warning/15 transition-all disabled:opacity-50"
            >
              {purging === recipe.slug ? t('recipe.wipingCachedData') : t('recipe.wipeCachedData')}
            </button>
            </OverviewSection>
          </div>
        )}
      </div>
    </div>
  )
}

function OverviewSection({ children, className = '' }) {
  return (
    <section className={`w-full rounded-3xl border border-outline-dim bg-surface/70 p-5 sm:p-6 ${className}`.trim()}>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function DeploymentPlannerPanel({ plan, selection, onChange, onSave, saving, systemTopology }) {
  const { t } = useTranslation()
  if (!plan) return null

  const recommendations = Array.isArray(plan.recommendations) ? plan.recommendations : []
  const activeProfile = recommendations.find((item) => item.profile === selection?.profile) || recommendations[0] || null

  return (
    <div className="space-y-4 pt-5 border-t border-outline-dim">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.deploymentPlanner')}</div>
        <p className="text-sm text-text-dim leading-6 m-0 mt-2">
          {t('recipe.deploymentPlannerBody')}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {recommendations.map((item) => {
          const active = selection?.profile === item.profile
          return (
            <button
              key={item.profile}
              type="button"
              onClick={() => onChange({
                profile: item.profile,
                strategy: item.strategy,
                target_gpu_indices: item.target_gpu_indices || [],
                target_hosts: selection?.target_hosts || item.target_hosts || [],
                shared_storage_path: selection?.shared_storage_path || plan.selected?.shared_storage_path || '',
                notes: selection?.notes || '',
              })}
              className={`text-left rounded-2xl border p-4 transition-all ${
                active
                  ? 'border-primary bg-primary/8 shadow-lg shadow-primary/10'
                  : 'border-outline-dim bg-surface-high/40 hover:border-primary/30'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-text font-display">{item.label}</div>
                {item.recommended ? <span className="text-[10px] uppercase tracking-[0.16em] text-primary font-label">{t('recipe.recommended')}</span> : null}
              </div>
              <p className="m-0 mt-2 text-sm text-text-dim leading-6">{item.rationale}</p>
              <div className="mt-3 text-[11px] text-text-dim font-label">
                {item.supported ? t('recipe.gpuTarget', { count: item.gpu_count || 0 }) : t('recipe.notSupportedOnHost')}
              </div>
            </button>
          )
        })}
      </div>

      {activeProfile && (
        <div className="rounded-2xl border border-outline-dim bg-surface-high/30 p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('recipe.launchStrategy')} value={activeProfile.strategy || selection?.strategy || 'local-ui'} />
            <Field label={t('recipe.targetGpus')} value={(selection?.target_gpu_indices || []).length ? selection.target_gpu_indices.join(', ') : t('recipe.automatic')} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-text">
              <span className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.targetHosts')}</span>
              <input
                value={(selection?.target_hosts || []).join(', ')}
                onChange={(event) => onChange({ ...selection, target_hosts: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                className="rounded-xl border border-outline-dim bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
                placeholder={t('recipe.targetHostsPlaceholder')}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-text">
              <span className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.sharedStoragePath')}</span>
              <input
                value={selection?.shared_storage_path || ''}
                onChange={(event) => onChange({ ...selection, shared_storage_path: event.target.value })}
                className="rounded-xl border border-outline-dim bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
                placeholder={t('recipe.sharedStoragePlaceholder')}
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm text-text">
            <span className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.plannerNotes')}</span>
            <textarea
              value={selection?.notes || ''}
              onChange={(event) => onChange({ ...selection, notes: event.target.value })}
              className="min-h-[88px] rounded-2xl border border-outline-dim bg-surface px-3 py-3 text-sm text-text outline-none focus:border-primary resize-y"
              placeholder={t('recipe.plannerNotesPlaceholder')}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-surface px-4 py-3 border border-outline-dim">
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.hostReadiness')}</div>
              <div className="mt-2 text-sm text-text-dim leading-6">
                {t('recipe.hostReadinessBody', { gpuCount: plan.available_gpu_count, networkStatus: plan.network_ready ? t('recipe.configured') : t('recipe.notConfigured'), storageStatus: plan.shared_storage_ready ? t('recipe.configured') : t('recipe.notConfigured') })}
              </div>
            </div>
            <div className="rounded-2xl bg-surface px-4 py-3 border border-outline-dim">
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.topology')}</div>
              <div className="mt-2 text-sm text-text-dim leading-6">
                {plan.topology?.detected
                  ? t('recipe.topologyDetected', { count: plan.topology.nvlink_pairs || 0, suffix: plan.topology.peer_to_peer_capable ? t('recipe.topologyP2pSuffix') : t('recipe.topologyNoP2pSuffix') })
                  : (systemTopology?.notes?.[0] || plan.topology?.notes?.[0] || t('recipe.topologyUnavailable'))}
              </div>
            </div>
          </div>

          {Array.isArray(activeProfile.caveats) && activeProfile.caveats.length > 0 && (
            <div className="rounded-2xl border border-warning/20 bg-warning/8 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-warning font-label">{t('recipe.reviewerNotes')}</div>
              <ul className="m-0 mt-2 pl-5 text-sm text-text-dim space-y-1.5">
                {activeProfile.caveats.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          {Array.isArray(plan.warnings) && plan.warnings.length > 0 && (
            <div className="rounded-2xl border border-error/20 bg-error/8 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-error font-label">{t('recipe.operationalWarnings')}</div>
              <ul className="m-0 mt-2 pl-5 text-sm text-text-dim space-y-1.5">
                {plan.warnings.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onSave} type="button" className="px-4 py-2.5 rounded-xl bg-surface text-text border border-outline-dim text-sm font-semibold hover:border-primary/40" disabled={saving || !selection}>
              {saving ? t('recipe.savingProfile') : t('recipe.saveDeploymentProfile')}
            </button>
            <span className="text-xs text-text-dim">
              {t('recipe.saveDeploymentProfileBody')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function ExportBlock({ label, description, value, filename, mimeType }) {
  const { t } = useTranslation()
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

  const download = () => {
    const blob = new Blob([String(value)], { type: mimeType || 'text/plain;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename || 'export.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <div className="rounded-2xl border border-outline-dim bg-surface-high/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text font-display">{label}</div>
          <p className="m-0 mt-1 text-sm text-text-dim leading-6">{description}</p>
          {filename && <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{filename}</div>}
        </div>
        <div className="flex items-center gap-2">
          {filename && (
            <button onClick={download} className="shrink-0 p-1.5 bg-surface border-none rounded-lg cursor-pointer text-text-dim hover:text-primary transition-colors" title={t('recipe.downloadExport')}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          )}
          <button onClick={copy} className="shrink-0 p-1.5 bg-surface border-none rounded-lg cursor-pointer text-text-dim hover:text-primary transition-colors" title={t('recipe.copyExport')}>
            {copied ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            )}
          </button>
        </div>
      </div>
      <pre className="bg-surface rounded-xl p-3 text-[11px] text-text-muted font-mono overflow-x-auto whitespace-pre-wrap break-all m-0 leading-relaxed border border-outline-dim">{value}</pre>
    </div>
  )
}

function buildPlatformExports(recipe) {
  const host = location.hostname
  const apiUrl = recipe.integration?.api_url?.replace(/<NVIDIA_AI_HUB_IP>/g, host) || ''
  const launchUrl = getRecipeUrl(recipe)
  const runtimeEnvPath = recipe.runtime_env_path || '<recipe>/.env'
  const installCommand = recipe.commands?.[0]?.command || `./run.sh ${recipe.slug}`
  const launchPort = recipe.ui?.port ?? 8080
  const surfaceType = recipe.ui?.type || 'web'
  const isNotebook = isNotebookRecipe(recipe)
  const surfaceLabel = getRecipeSurfaceLabel(recipe)
  const openLabel = getRecipeOpenLabelWithArrow(recipe)
  const hasApiIntegration = Boolean(apiUrl || recipe.integration?.model_id || surfaceType === 'api-only')
  const showEndpointSummary = true
  const showSyncScript = surfaceType !== 'cli'
  const showSshCommand = true
  const memoryMin = recipe.requirements?.min_memory_gb ?? 8
  const memoryRecommended = recipe.requirements?.recommended_memory_gb ?? memoryMin

  const deploymentProfiles = [
    {
      profile: 'workstation',
      host: 'Single-user NVIDIA workstation',
      launch_mode: 'local-ui',
      recommended_memory_gb: memoryRecommended,
      network: `Direct browser access on :${launchPort}`,
    },
    {
      profile: 'lab',
      host: 'Shared lab or classroom node',
      launch_mode: 'shared-ui',
      recommended_memory_gb: memoryRecommended,
      network: 'Reverse proxy or controlled LAN exposure recommended',
    },
    {
      profile: 'server',
      host: 'Headless remote NVIDIA server',
      launch_mode: 'ssh-bootstrap',
      recommended_memory_gb: memoryRecommended,
      network: 'Use SSH bootstrap plus endpoint export for consumers',
    },
    {
      profile: 'dgx',
      host: 'DGX or multi-user GPU platform',
      launch_mode: 'managed-service',
      recommended_memory_gb: Math.max(memoryRecommended, memoryMin),
      network: 'Integrate with scheduler, reverse proxy, or fleet tooling',
    },
  ]

  const metadata = JSON.stringify({
    app: recipe.name,
    slug: recipe.slug,
    version: recipe.version,
    surface: {
      type: surfaceType,
      url: launchUrl,
      port: launchPort,
      path: recipe.ui?.path || '/',
      scheme: recipe.ui?.scheme || 'http',
    },
    integration: recipe.integration ? {
      api_url: apiUrl,
      model_id: recipe.integration.model_id || '',
      api_key: recipe.integration.api_key || '',
    } : null,
    runtime_env_path: runtimeEnvPath,
    source: recipe.source,
  }, null, 2)

  const syncScriptSteps = isNotebook
    ? [
        `export NVIDIA_AI_HUB_NOTEBOOK_URL="${launchUrl}"`,
        `export NVIDIA_AI_HUB_NOTEBOOK_PORT="${launchPort}"`,
        `echo "Notebook surface ready for ${recipe.name}"`,
      ]
    : surfaceType === 'api-only'
      ? [
          apiUrl ? `export NVIDIA_AI_HUB_API_URL="${apiUrl}"` : `export NVIDIA_AI_HUB_API_URL="http://${host}:${launchPort}"`,
          recipe.integration?.model_id ? `export NVIDIA_AI_HUB_MODEL_ID="${recipe.integration.model_id}"` : null,
          `echo "API endpoint prepared for ${recipe.name}"`,
        ]
      : [
          `export NVIDIA_AI_HUB_URL="${launchUrl}"`,
          `export NVIDIA_AI_HUB_PORT="${launchPort}"`,
          `echo "Web surface ready for ${recipe.name}"`,
        ]

  const syncScript = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    `export NVIDIA_AI_HUB_RECIPE="${recipe.slug}"`,
    `export NVIDIA_AI_HUB_RUNTIME_ENV="${runtimeEnvPath}"`,
    ...syncScriptSteps,
    `echo "Launching ${recipe.name} via NVIDIA AI Hub exports"`,
    installCommand,
  ].filter(Boolean).join('\n')

  const remoteBootstrap = [
    'cd ~/nvidia-ai-hub',
    `export NVIDIA_AI_HUB_RECIPE=${recipe.slug}`,
    `export NVIDIA_AI_HUB_RUNTIME_ENV=${runtimeEnvPath.replace(/'/g, "'\\''")}`,
    isNotebook
      ? `echo "Notebook endpoint will be exposed at ${launchUrl.replace(/'/g, "'\\''")}"`
      : surfaceType === 'api-only'
        ? `echo "API endpoint will be exposed at ${(apiUrl || `http://${host}:${launchPort}`).replace(/'/g, "'\\''")}"`
        : `echo "Web endpoint will be exposed at ${launchUrl.replace(/'/g, "'\\''")}"`,
    installCommand.replace(/'/g, "'\\''"),
  ]

  const sshCommand = [
    'ssh <nvidia-host>',
    `'${remoteBootstrap.join(' && ')}'`,
  ].join(' ')

  const endpointSummary = [
    `Surface label: ${surfaceLabel}`,
    `Open action: ${openLabel}`,
    `Surface type: ${surfaceType}`,
    `Launch URL: ${launchUrl}`,
    hasApiIntegration ? `API URL: ${apiUrl || `http://${host}:${launchPort}`}` : null,
    `Port: ${launchPort}`,
    `Path: ${recipe.ui?.path || '/'}`,
    `Scheme: ${recipe.ui?.scheme || 'http'}`,
    `Runtime env: ${runtimeEnvPath}`,
  ].filter(Boolean).join('\n')

  return {
    metadata,
    deploymentProfiles: JSON.stringify(deploymentProfiles, null, 2),
    syncScript,
    sshCommand,
    endpointSummary,
    showEndpointSummary,
    showSyncScript,
    showSshCommand,
  }
}

function HostFitPanel({ fit }) {
  const { t } = useTranslation()
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
        <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.hostFitCheck')}</div>
        <p className="text-sm text-text-dim leading-6 m-0 mt-2">
          {fit.headline}
        </p>
      </div>

      <div className={`rounded-2xl border p-4 ${panelClass}`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusPill color={fit.tone}>{t('common.hostLabel', { label: fit.label })}</StatusPill>
        </div>
        <div className="space-y-2.5">
          {fit.checks.map((check) => (
            <div key={check.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface/40 px-3 py-2.5">
              <div>
                <div className="text-sm font-semibold text-text font-display">{check.label}</div>
                <div className="text-xs text-text-dim leading-5 mt-1">{check.message}</div>
              </div>
              <StatusPill color={check.status === 'critical' ? 'error' : check.status === 'warning' ? 'warning' : check.status === 'good' ? 'success' : 'dim'}>
                {check.status === 'critical' ? t('recipe.actionNeeded') : check.status === 'warning' ? t('recipe.review') : check.status === 'good' ? t('recipe.ok') : t('recipe.unknown')}
              </StatusPill>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CommandBlock({ item }) {
  const { t } = useTranslation()
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
        <button onClick={copy} className="shrink-0 p-1.5 bg-surface border-none rounded-lg cursor-pointer text-text-dim hover:text-primary transition-colors" title={t('recipe.copyCommand')}>
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
  const { t } = useTranslation()
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
      <button onClick={copy} className="shrink-0 p-1.5 bg-surface border-none rounded-lg cursor-pointer text-text-dim hover:text-primary transition-colors" title={t('recipe.copy')}>
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

function TerminalPanel({ lines, isBuilding, isUpdating, isRunning, isReady, hasLogs, progressState, scrollRef, wide = false }) {
  const { t } = useTranslation()
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
            {t('recipe.terminalLogMode', { mode: isUpdating ? t('recipe.terminalModeUpdate') : isBuilding ? t('recipe.terminalModeBuild') : t('recipe.terminalModeContainer') })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isBuilding && <span className="text-[10px] text-primary animate-pulse font-mono">{isUpdating ? t('recipe.terminalUpdating') : t('recipe.terminalBuilding')}</span>}
          {!isBuilding && isRunning && isReady && <span className="text-[10px] text-emerald-400 font-mono">{t('recipe.terminalRunning')}</span>}
          {!isBuilding && isRunning && !isReady && <span className="text-[10px] text-amber-400 animate-pulse font-mono">{t('recipe.terminalStarting')}</span>}
        </div>
      </div>

      {isBuilding && progressState && (
        <div className="shrink-0 border-b border-[#1a1a2a] bg-[#0B0B12] px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.16em] text-gray-400">
            <span>{progressState.phase}</span>
            <span>{Math.round(progressState.percent || 0)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressState.phase === 'Failed' ? 'bg-red-400' : 'bg-primary'}`}
              style={{ width: `${Math.max(4, Math.min(100, progressState.percent || 0))}%` }}
            />
          </div>
          {progressState.detail && (
            <div className="mt-2 text-[10px] text-gray-500 font-mono truncate">{progressState.detail}</div>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-5 selection:bg-primary/30"
      >
        {showEmpty && (
          <div className="text-gray-600 italic">{t('recipe.noLogs')}</div>
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

function RecipeMonitorPanel({ recipe, metrics }) {
  const { t } = useTranslation()
  const rows = [
    {
      label: t('recipe.cpu'),
      value: `${Math.round(metrics?.cpu_percent ?? 0)}%`,
      hint: metrics?.running ? `${metrics.container_count || 0} container${(metrics?.container_count || 0) > 1 ? 's' : ''}` : t('recipe.waitingForLiveTelemetry'),
    },
    {
      label: t('recipe.ram'),
      value: metrics?.memory_used_mb ? `${formatMb(metrics.memory_used_mb)} / ${formatMb(metrics.memory_limit_mb)}` : '—',
      hint: metrics?.memory_percent ? `${metrics.memory_percent}% used` : t('recipe.noMemoryDataYet'),
    },
    {
      label: t('recipe.gpu'),
      value: `${metrics?.gpu_utilization ?? 0}%`,
      hint: metrics?.gpu_name || t('recipe.noGpuTelemetry'),
    },
    {
      label: t('recipe.gpuRam'),
      value: metrics?.gpu_memory_total_mb ? `${metrics.gpu_memory_used_mb || 0} / ${metrics.gpu_memory_total_mb} MB` : '—',
      hint: metrics?.telemetry_source || t('recipe.sharedHostTelemetry'),
    },
    {
      label: t('recipe.temperatureLabel'),
      value: metrics?.temperature ? `${Number(metrics.temperature).toFixed(1)} °C` : '—',
      hint: metrics?.temperature_source || t('recipe.noSensorData'),
    },
  ]

  return (
    <div className="px-5 py-5 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('recipe.appMonitor')}</div>
        <h3 className="text-base font-semibold text-text font-display mt-2 mb-1">{recipe.name}</h3>
        <p className="text-sm text-text-dim leading-6 m-0">
          {t('recipe.appMonitorBody')}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-dim bg-surface-high/50">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-outline-dim first:border-t-0">
                <td className="px-4 py-3 align-top text-text-dim font-label uppercase text-[11px] tracking-[0.14em] w-[6.5rem]">{row.label}</td>
                <td className="px-4 py-3 align-top">
                  <div className="text-text font-semibold font-display">{row.value}</div>
                  <div className="text-xs text-text-dim mt-1 leading-5">{row.hint}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CommandTerminalPanel({ recipe, lines, command, setCommand, onSubmit, running }) {
  const { t } = useTranslation()
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines.length])

  const disabled = !recipe?.running || running

  return (
    <div className="h-full flex flex-col bg-[#06060D]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a2a] bg-[#0B0B12]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]/70" />
          </div>
          <span className="text-[10px] text-gray-500 font-mono">{t('recipe.interactiveContainerShell')}</span>
        </div>
        <div className="text-[10px] font-mono text-text-dim">
          {recipe?.running ? (running ? t('recipe.executing') : t('recipe.ready')) : t('recipe.containerOffline')}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-5">
        {lines.length === 0 ? (
          <div className="text-gray-600 italic">{t('recipe.typeShellCommand')}</div>
        ) : (
          lines.map((line, index) => (
            <div
              key={index}
              className={
                line.startsWith('$ ')
                  ? 'text-primary whitespace-pre-wrap [tab-size:2]'
                  : line.includes('[error]')
                  ? 'text-red-400 whitespace-pre-wrap [tab-size:2]'
                  : line.startsWith('[exit ')
                  ? 'text-amber-300 whitespace-pre-wrap [tab-size:2]'
                  : 'text-gray-300 whitespace-pre-wrap [tab-size:2]'
              }
            >
              {line}
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-[#1a1a2a] p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={recipe?.running ? t('recipe.shellPlaceholder') : t('recipe.shellDisabledPlaceholder')}
            disabled={disabled}
            className="flex-1 rounded-xl border border-outline-dim bg-[#0B0B12] px-3 py-2 text-sm font-mono text-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !command.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-on disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? t('recipe.runningWithDots') : t('recipe.run')}
          </button>
        </div>
      </form>
    </div>
  )
}

function formatMb(value) {
  const numeric = Number(value || 0)
  if (!numeric) return '0 MB'
  if (numeric >= 1024) return `${(numeric / 1024).toFixed(1)} GB`
  return `${numeric.toFixed(0)} MB`
}
