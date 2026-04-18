import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

export default function Models() {
  const { t } = useTranslation()
  const recipes = useStore((s) => s.recipes)
  const modelOverview = useStore((s) => s.modelOverview)
  const modelRuntime = useStore((s) => s.modelRuntime)
  const modelCatalog = useStore((s) => s.modelCatalog)
  const installedModels = useStore((s) => s.installedModels)
  const modelDownloads = useStore((s) => s.modelDownloads)
  const modelSources = useStore((s) => s.modelSources)
  const hfIntakeQueue = useStore((s) => s.hfIntakeQueue)
  const hfInventory = useStore((s) => s.hfInventory)
  const modelsLoading = useStore((s) => s.modelsLoading)
  const modelsError = useStore((s) => s.modelsError)
  const modelSectionErrors = useStore((s) => s.modelSectionErrors)
  const modelAction = useStore((s) => s.modelAction)
  const featureFlags = useStore((s) => s.featureFlags)
  const modelManagerAvailable = useStore((s) => s.modelManagerAvailable)
  const fetchModelManager = useStore((s) => s.fetchModelManager)
  const pullModel = useStore((s) => s.pullModel)
  const deleteModel = useStore((s) => s.deleteModel)
  const queueHfModel = useStore((s) => s.queueHfModel)
  const cancelHfQueueItem = useStore((s) => s.cancelHfQueueItem)
  const retryHfQueueItem = useStore((s) => s.retryHfQueueItem)
  const deleteHfSnapshot = useStore((s) => s.deleteHfSnapshot)
  const launchRecipe = useStore((s) => s.launchRecipe)
  const selectRecipe = useStore((s) => s.selectRecipe)

  const [query, setQuery] = useState('')
  const [consumerFilter, setConsumerFilter] = useState('all')
  const [hfRepository, setHfRepository] = useState('')
  const [hfRevision, setHfRevision] = useState('main')
  const [hfToken, setHfToken] = useState('')
  const [hfTokenSaving, setHfTokenSaving] = useState(false)
  const [hfTokenMessage, setHfTokenMessage] = useState('')
  const [activeTab, setActiveTab] = useState('runtime')

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
  const sourcesList = useMemo(
    () => (Array.isArray(modelSources?.sources) ? modelSources.sources : []),
    [modelSources],
  )
  const hfQueueList = useMemo(
    () => (Array.isArray(hfIntakeQueue?.items) ? hfIntakeQueue.items : []),
    [hfIntakeQueue],
  )
  const hfSnapshots = useMemo(
    () => (Array.isArray(hfInventory?.snapshots) ? hfInventory.snapshots : []),
    [hfInventory],
  )
  const dependentRecipes = useMemo(
    () => (Array.isArray(modelOverview?.dependent_recipes) ? modelOverview.dependent_recipes : []),
    [modelOverview],
  )
  const recommendedModels = useMemo(
    () => (Array.isArray(modelOverview?.recommended_models) ? modelOverview.recommended_models : []),
    [modelOverview],
  )
  const ollamaRecipeState = useMemo(
    () => recipes.find((recipe) => recipe.slug === modelOverview?.recipe_slug) || null,
    [recipes, modelOverview],
  )
  const installedModelNames = useMemo(
    () => new Set(installedList.map((model) => String(model.name || '').toLowerCase()).filter(Boolean)),
    [installedList],
  )

  const consumerOptions = useMemo(() => ([
    { value: 'all', label: t('models.allRecipes') },
    ...dependentRecipes.map((recipe) => ({ value: recipe.slug, label: recipe.name })),
  ]), [dependentRecipes, t])

  const activeConsumer = useMemo(
    () => dependentRecipes.find((recipe) => recipe.slug === consumerFilter) || null,
    [consumerFilter, dependentRecipes],
  )

  const visibleRecommendedModels = useMemo(() => {
    if (consumerFilter === 'all') return recommendedModels
    return recommendedModels.filter((item) => item.recipes?.some((recipe) => recipe.slug === consumerFilter))
  }, [consumerFilter, recommendedModels])

  const recipeCoverage = useMemo(() => dependentRecipes.map((recipe) => {
    const actionable = String(recipe.actionable_model || '').trim()
    const installed = actionable ? installedModelNames.has(actionable.toLowerCase()) : false
    return {
      ...recipe,
      actionable,
      installed,
      status: actionable ? (installed ? 'ready' : 'missing-model') : 'manual',
    }
  }), [dependentRecipes, installedModelNames])

  const coverageSummary = useMemo(() => ({
    ready: recipeCoverage.filter((recipe) => recipe.status === 'ready').length,
    missing: recipeCoverage.filter((recipe) => recipe.status === 'missing-model').length,
    manual: recipeCoverage.filter((recipe) => recipe.status === 'manual').length,
  }), [recipeCoverage])

  const hfSummary = useMemo(
    () => modelOverview?.hf_summary || hfInventory?.summary || { snapshot_count: hfSnapshots.length, downloaded_bytes: 0 },
    [modelOverview, hfInventory, hfSnapshots.length],
  )

  const backendCoverageSummary = useMemo(
    () => modelOverview?.coverage_summary || {},
    [modelOverview],
  )

  const hfCoveredRecipes = useMemo(
    () => recipeCoverage.filter((recipe) => recipe.hf_covered),
    [recipeCoverage],
  )

  const hfReadySuggestedModels = useMemo(
    () => visibleRecommendedModels.filter((item) => item.available_via_hf),
    [visibleRecommendedModels],
  )

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    let next = catalogList

    if (consumerFilter !== 'all') {
      const suggestedNames = new Set(
        visibleRecommendedModels.map((item) => String(item.name || '').toLowerCase()).filter(Boolean),
      )
      if (suggestedNames.size > 0) {
        next = next.filter((entry) => suggestedNames.has(String(entry.name || '').toLowerCase()))
      }
    }

    if (!normalized) return next
    return next.filter((entry) => {
      const haystack = [entry.name, entry.title, entry.summary, ...(entry.capabilities || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [catalogList, consumerFilter, query, visibleRecommendedModels])

  const tabs = useMemo(() => ([
    {
      id: 'runtime',
      label: t('models.runtime'),
      description: t('models.runtimeDesc'),
      count: modelOverview?.ready ? t('models.states.ready') : getRuntimeStateLabel(modelOverview, t),
      error: modelSectionErrors?.modelRuntime,
    },
    {
      id: 'library',
      label: t('models.library'),
      description: t('models.libraryDesc'),
      count: t('models.counts.installed', { count: installedList.length }),
      error: modelSectionErrors?.installedModels || modelSectionErrors?.modelCatalog || modelSectionErrors?.modelDownloads,
    },
    {
      id: 'huggingface',
      label: t('models.huggingface'),
      description: t('models.hfDesc'),
      count: t('models.counts.snapshots', { count: hfSnapshots.length }),
      error: modelSectionErrors?.hfIntakeQueue || modelSectionErrors?.hfInventory || modelSectionErrors?.modelSources,
    },
    {
      id: 'recipes',
      label: t('models.recipeMapping'),
      description: t('models.recipeDesc'),
      count: t('models.counts.recipes', { count: dependentRecipes.length }),
      error: null,
    },
  ]), [dependentRecipes.length, hfSnapshots.length, installedList.length, modelOverview, modelSectionErrors, t])

  const handlePull = async (name) => {
    const value = String(name || '').trim()
    if (!value) return
    await pullModel(value)
  }

  const handleDelete = async (name) => {
    const value = String(name || '').trim()
    if (!value) return
    if (!window.confirm(t('models.confirmDeleteModel', { name: value }))) return
    await deleteModel(value)
  }

  const handleStartRuntime = async () => {
    if (!modelOverview?.recipe_slug) return
    await launchRecipe(modelOverview.recipe_slug)
    await fetchModelManager()
  }

  const handleQueueHf = async () => {
    const repository = String(hfRepository || '').trim()
    if (!repository) return
    const queued = await queueHfModel({ repository, revision: hfRevision })
    if (queued) {
      setHfRepository('')
      setHfRevision('main')
    }
  }

  const handleDeleteHfSnapshot = async (item) => {
    if (!item?.id) return
    if (!window.confirm(t('models.confirmDeleteSnapshot', { name: item.repository || item.id }))) return
    await deleteHfSnapshot(item.id)
  }

  const handleSaveHfToken = async () => {
    const token = String(hfToken || '').trim()
    if (!token) return
    setHfTokenSaving(true)
    setHfTokenMessage('')
    try {
      const res = await fetch('/api/system/hf-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) throw new Error(t('models.errors.saveToken'))
      setHfToken('')
      setHfTokenMessage(t('models.hf.tokenSaved'))
      await fetchModelManager({ silent: true })
    } catch (error) {
      setHfTokenMessage(error?.message || t('models.errors.saveToken'))
    } finally {
      setHfTokenSaving(false)
    }
  }

  if (featureFlags?.modelManager !== true) {
    return null
  }

  return (
    <div className="px-6 py-6 pb-12 animate-fadeIn">
      <div className="rounded-3xl border border-outline-dim bg-surface p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-label">{t('models.eyebrow')}</div>
            <h1 className="m-0 mt-2 text-2xl font-bold tracking-tight text-text font-display">{t('models.title')}</h1>
            <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-text-dim">
              {t('models.subtitle')}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile label={t('models.installed')} value={String(installedList.length)} />
            <InfoTile label={t('models.catalog')} value={String(catalogList.length)} />
            <InfoTile label={t('models.activeDownloads')} value={String(downloadsList.filter((item) => item.status === 'running').length)} />
            <InfoTile label={t('models.hfSnapshots')} value={String(hfSummary.snapshot_count || 0)} />
          </div>
        </div>

        {modelsError ? (
          <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
            {modelsError}
          </div>
        ) : null}

        {!modelManagerAvailable ? (
          <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
            {t('models.warningNoModels')}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl border p-4 text-left cursor-pointer transition ${activeTab === tab.id ? 'border-primary/40 bg-primary/10' : 'border-outline-dim bg-surface-high/30 hover:border-primary/20'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text">{tab.label}</div>
                  <div className="mt-1 text-xs leading-5 text-text-dim">{tab.description}</div>
                </div>
                {tab.error ? <span className="rounded-full bg-warning/10 px-2 py-1 text-[10px] font-label text-warning">{t('models.issue')}</span> : null}
              </div>
              <div className="mt-3 text-xs font-label uppercase tracking-[0.12em] text-text-dim">{tab.count}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {activeTab === 'runtime' ? (
          <div className="rounded-3xl border border-outline-dim bg-surface p-5">
            {modelSectionErrors?.modelRuntime ? <SectionNotice message={t('models.runtimeApiError', { message: modelSectionErrors.modelRuntime })} /> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('models.runtime')}</div>
                <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">{t('models.runtimeTitle')}</h2>
              </div>
              <button
                type="button"
                onClick={() => fetchModelManager()}
                disabled={modelsLoading}
                className="rounded-xl border border-outline-dim bg-surface-high/70 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50"
              >
                {modelsLoading ? t('models.refreshing') : t('models.refresh')}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-high/30 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('models.hf.inventory')}</div>
                  <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">{t('models.hf.downloadedSnapshots')}</h2>
                  <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-text-dim">
                    {t('models.hf.inventoryDescription')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <InfoTile label={t('models.hf.snapshots')} value={String(hfSnapshots.length)} />
                  <InfoTile label={t('models.hf.token')} value={modelOverview?.hugging_face?.token_configured ? t('models.states.configured') : t('models.states.missing')} />
                  <InfoTile label={t('models.hf.downloaded')} value={formatBytes(hfSummary.downloaded_bytes, t)} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-4">
                <StatusTile label={t('models.states.queued')} value={String(hfSummary.queued || 0)} />
                <StatusTile label={t('models.states.running')} value={String(hfSummary.running || 0)} tone={(hfSummary.running || 0) > 0 ? 'warning' : 'neutral'} />
                <StatusTile label={t('models.states.completed')} value={String(hfSummary.completed || 0)} tone={(hfSummary.completed || 0) > 0 ? 'success' : 'neutral'} />
                <StatusTile label={t('models.states.failed')} value={String(hfSummary.failed || 0)} tone={(hfSummary.failed || 0) > 0 ? 'warning' : 'neutral'} />
              </div>

              <div className="mt-4 space-y-3">
                {hfSnapshots.length === 0 ? (
                  <EmptyState title={t('models.hf.emptySnapshotsTitle')} body={t('models.hf.emptySnapshotsBody')} />
                ) : hfSnapshots.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-outline-dim bg-surface px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text break-all">{item.repository}</div>
                        <div className="mt-1 text-xs text-text-dim font-label">{t('models.hf.revisionLine', { revision: item.revision || 'main', target: item.target_dir || 'huggingface' })}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-label ${getJobTone(item.status)}`}>{item.status || t('models.states.available')}</span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <PathCard label={t('models.path')} value={item.path || '—'} />
                      <PathCard label={t('models.size')} value={formatBytes(item.size_bytes, t)} />
                    </div>
                    {item.queue_id ? (
                      <div className="mt-3 text-[11px] text-text-dim font-label">{t('models.hf.linkedQueueItem', { id: item.queue_id })}</div>
                    ) : null}
                    <div className="mt-3 text-[11px] text-text-dim font-label">
                      {item.updated_at ? t('models.hf.updatedAt', { value: formatDate(item.updated_at) }) : t('models.hf.updateTimeUnavailable')}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteHfSnapshot(item)}
                        disabled={modelAction === `hf-delete:${item.id}` || item.status === 'running'}
                        className="rounded-xl border border-error/20 bg-error/10 px-3 py-1.5 text-xs font-semibold text-error cursor-pointer hover:bg-error/15 disabled:opacity-50"
                      >
                        {modelAction === `hf-delete:${item.id}` ? t('models.deleting') : t('models.hf.deleteSnapshot')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <StatusTile label={t('models.recipe')} value={modelOverview?.recipe_name || t('models.runtimeDefaultName')} tone={modelOverview?.installed ? 'success' : 'neutral'} />
              <StatusTile label={t('models.runtimeState')} value={getRuntimeStateLabel(modelOverview)} tone={modelOverview?.ready ? 'success' : modelOverview?.starting ? 'warning' : 'neutral'} />
              <StatusTile label={t('models.starterModel')} value={modelRuntime?.starter_display_name || modelRuntime?.starter_model || '—'} tone={modelRuntime?.starter_ready ? 'success' : 'warning'} />
            </div>

            {!modelOverview?.installed || !modelOverview?.ready ? (
              <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4">
                <div className="text-sm font-semibold text-text">{t('models.runtimeAttentionRequired')}</div>
                <div className="mt-1 text-sm leading-6 text-text-dim">
                  {!modelOverview?.installed
                    ? t('models.runtimeInstallBody')
                    : modelOverview?.starting
                      ? t('models.runtimeStartingBody')
                      : t('models.runtimeNotReadyBody')}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectRecipe(modelOverview?.recipe_slug || 'ollama-runtime')}
                    className="rounded-xl border border-outline-dim bg-surface-high/70 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high"
                  >
                    {t('models.openRecipe')}
                  </button>
                  {modelOverview?.installed && !ollamaRecipeState?.running && !modelOverview?.starting ? (
                    <button
                      type="button"
                      onClick={handleStartRuntime}
                      className="btn-primary px-4 py-2 text-sm font-semibold"
                    >
                      {t('models.startRuntime')}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <PathCard label={t('models.runtimeCards.sharedApi')} value={modelOverview?.shared_endpoint || modelOverview?.runtime_api_url || '—'} />
              <PathCard label={t('models.runtimeCards.storagePath')} value={modelOverview?.model_storage_path || '—'} />
              <PathCard label={t('models.runtimeCards.runtimeUi')} value={modelOverview?.ui_url || '—'} />
              <PathCard label={t('models.runtimeCards.environment')} value={modelOverview?.env_path || '—'} />
            </div>

            {Array.isArray(modelOverview?.notes) && modelOverview.notes.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-text-dim">
                <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-label">{t('models.whyThisMatters')}</div>
                <ul className="m-0 mt-3 list-disc space-y-2 pl-5">
                  {modelOverview.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </div>
            ) : null}

            {dependentRecipes.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-high/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('models.connectedRecipes')}</div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-label uppercase tracking-[0.12em]">
                    <span className="rounded-full bg-success/10 px-2.5 py-1 text-success">{t('models.coverage.ready', { count: coverageSummary.ready })}</span>
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">{t('models.coverage.missingModel', { count: coverageSummary.missing })}</span>
                    <span className="rounded-full bg-surface px-2.5 py-1 text-text-dim">{t('models.coverage.manualSetup', { count: coverageSummary.manual })}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{t('models.coverage.hfCovered', { count: backendCoverageSummary.hf_ready || hfCoveredRecipes.length })}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recipeCoverage.map((recipe) => (
                    <button
                      key={recipe.slug}
                      type="button"
                      onClick={() => selectRecipe(recipe.slug)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-label cursor-pointer hover:border-primary/30 hover:text-primary ${recipe.status === 'ready' ? 'border-success/20 bg-success/10 text-success' : recipe.status === 'missing-model' ? 'border-warning/20 bg-warning/10 text-warning' : 'border-outline-dim bg-surface text-text'}`}
                    >
                      {recipe.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'huggingface' ? (
          <div className="rounded-3xl border border-outline-dim bg-surface p-5">
            {(modelSectionErrors?.hfInventory || modelSectionErrors?.hfIntakeQueue || modelSectionErrors?.modelSources)
              ? <SectionNotice message={t('models.hf.partialDataUnavailable', { inventory: modelSectionErrors?.hfInventory || 'ok', intake: modelSectionErrors?.hfIntakeQueue || 'ok', sources: modelSectionErrors?.modelSources || 'ok' })} />
              : null}
            {!modelOverview?.hugging_face?.token_configured ? (
              <div className="mb-4 rounded-2xl border border-warning/20 bg-warning/10 p-4">
                <div className="text-sm font-semibold text-text">{t('models.hf.tokenMissingTitle')}</div>
                <div className="mt-1 text-sm leading-6 text-text-dim">
                  {t('models.hf.tokenMissingBodyBefore')} <code className="rounded bg-surface px-1.5 py-0.5 text-xs">~/.cache/huggingface/token</code> {t('models.hf.tokenMissingBodyAfter')}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    type="password"
                    value={hfToken}
                    onChange={(event) => setHfToken(event.target.value)}
                    placeholder={t('models.hf.tokenPlaceholder')}
                    className="w-full rounded-xl border border-outline-dim bg-surface px-4 py-2 text-sm text-text outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    onClick={handleSaveHfToken}
                    disabled={!hfToken.trim() || hfTokenSaving}
                    className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {hfTokenSaving ? t('models.saving') : t('models.hf.saveToken')}
                  </button>
                </div>
                <div className="mt-2 text-xs text-text-dim">
                  {t('models.hf.createTokenAt')} <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-primary hover:underline">huggingface.co/settings/tokens</a>
                </div>
                {hfTokenMessage ? <div className="mt-2 text-xs text-warning">{hfTokenMessage}</div> : null}
              </div>
            ) : (
              <div className="mb-4 rounded-2xl border border-success/20 bg-success/10 p-4 text-sm text-success">
                {t('models.hf.tokenConfigured')}
              </div>
            )}
            <div className="mt-0 rounded-2xl border border-outline-dim bg-surface-high/30 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('models.hf.inventory')}</div>
                  <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">{t('models.hf.downloadedSnapshots')}</h2>
                  <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-text-dim">
                    {t('models.hf.inventoryDescription')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <InfoTile label={t('models.hf.snapshots')} value={String(hfSnapshots.length)} />
                  <InfoTile label={t('models.hf.token')} value={modelOverview?.hugging_face?.token_configured ? t('models.states.configured') : t('models.states.missing')} />
                  <InfoTile label={t('models.hf.downloaded')} value={formatBytes(hfSummary.downloaded_bytes, t)} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-4">
                <StatusTile label={t('models.states.queued')} value={String(hfSummary.queued || 0)} />
                <StatusTile label={t('models.states.running')} value={String(hfSummary.running || 0)} tone={(hfSummary.running || 0) > 0 ? 'warning' : 'neutral'} />
                <StatusTile label={t('models.states.completed')} value={String(hfSummary.completed || 0)} tone={(hfSummary.completed || 0) > 0 ? 'success' : 'neutral'} />
                <StatusTile label={t('models.states.failed')} value={String(hfSummary.failed || 0)} tone={(hfSummary.failed || 0) > 0 ? 'warning' : 'neutral'} />
              </div>

              <div className="mt-4 space-y-3">
                {hfSnapshots.length === 0 ? (
                  <EmptyState title={t('models.hf.emptySnapshotsTitle')} body={t('models.hf.emptySnapshotsBody')} />
                ) : hfSnapshots.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-outline-dim bg-surface px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text break-all">{item.repository}</div>
                        <div className="mt-1 text-xs text-text-dim font-label">{t('models.hf.revisionLine', { revision: item.revision || 'main', target: item.target_dir || 'huggingface' })}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-label ${getJobTone(item.status)}`}>{item.status || t('models.states.available')}</span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <PathCard label={t('models.path')} value={item.path || '—'} />
                      <PathCard label={t('models.size')} value={formatBytes(item.size_bytes, t)} />
                    </div>
                    {item.queue_id ? (
                      <div className="mt-3 text-[11px] text-text-dim font-label">{t('models.hf.linkedQueueItem', { id: item.queue_id })}</div>
                    ) : null}
                    <div className="mt-3 text-[11px] text-text-dim font-label">
                      {item.updated_at ? t('models.hf.updatedAt', { value: formatDate(item.updated_at) }) : t('models.hf.updateTimeUnavailable')}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteHfSnapshot(item)}
                        disabled={modelAction === `hf-delete:${item.id}` || item.status === 'running'}
                        className="rounded-xl border border-error/20 bg-error/10 px-3 py-1.5 text-xs font-semibold text-error cursor-pointer hover:bg-error/15 disabled:opacity-50"
                      >
                        {modelAction === `hf-delete:${item.id}` ? t('models.deleting') : t('models.hf.deleteSnapshot')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-outline-dim bg-surface-high/30 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('models.hf.sourceRoadmap')}</div>
                  <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">{t('models.hf.intakeChannels')}</h2>
                  <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-text-dim">
                    {t('models.hf.intakeChannelsBody')}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {sourcesList.length === 0 ? (
                  <EmptyState title={t('models.hf.noSourceStatusTitle')} body={t('models.hf.noSourceStatusBody')} />
                ) : sourcesList.map((source) => (
                  <div key={source.id} className="rounded-2xl border border-outline-dim bg-surface px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-text">{source.label}</div>
                        <div className="mt-1 text-xs text-text-dim">
                          {source.queued_items ? t('models.hf.sourceQueued', { count: source.queued_items }) : t('models.hf.noQueuedItems')}
                          {typeof source.running_items === 'number' ? ` · ${t('models.hf.sourceRunning', { count: source.running_items })}` : ''}
                          {typeof source.completed_items === 'number' ? ` · ${t('models.hf.sourceCompleted', { count: source.completed_items })}` : ''}
                          {typeof source.failed_items === 'number' && source.failed_items > 0 ? ` · ${t('models.hf.sourceFailed', { count: source.failed_items })}` : ''}
                          {typeof source.snapshot_count === 'number' ? ` · ${t('models.hf.sourceSnapshots', { count: source.snapshot_count })}` : ''}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-label ${source.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {source.status}
                      </span>
                    </div>
                    {(typeof source.downloaded_bytes === 'number' && source.downloaded_bytes > 0) || typeof source.deleted_items === 'number' ? (
                      <div className="mt-3 text-[11px] text-text-dim font-label">
                        {typeof source.downloaded_bytes === 'number' ? t('models.hf.downloadedAmount', { value: formatBytes(source.downloaded_bytes, t) }) : ''}
                        {typeof source.deleted_items === 'number' ? ` · ${t('models.hf.deletedItems', { count: source.deleted_items })}` : ''}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4">
                <div className="text-sm font-semibold text-text">{t('models.hf.queueIntakeTitle')}</div>
                <div className="mt-1 text-sm leading-6 text-text-dim">
                  {t('models.hf.queueIntakeBody')}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]">
                  <input
                    type="text"
                    value={hfRepository}
                    onChange={(event) => setHfRepository(event.target.value)}
                    placeholder={t('models.hf.repositoryPlaceholder')}
                    className="w-full rounded-xl border border-outline-dim bg-surface px-4 py-2 text-sm text-text outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                  <input
                    type="text"
                    value={hfRevision}
                    onChange={(event) => setHfRevision(event.target.value)}
                    placeholder={t('models.hf.revisionPlaceholder')}
                    className="w-full rounded-xl border border-outline-dim bg-surface px-4 py-2 text-sm text-text outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    onClick={handleQueueHf}
                    disabled={!hfRepository.trim() || modelAction.startsWith('hf:')}
                    className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {modelAction.startsWith('hf:') ? t('models.hf.queueing') : t('models.hf.queueIntake')}
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {hfQueueList.length === 0 ? (
                    <EmptyState title={t('models.hf.noIntakeRequestsTitle')} body={t('models.hf.noIntakeRequestsBody')} />
                  ) : hfQueueList.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-outline-dim bg-surface px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-text break-all">{item.repository}</div>
                          <div className="mt-1 text-xs text-text-dim font-label">{t('models.hf.queueRevisionLine', { revision: item.revision || 'main', message: item.message || t('models.states.queued') })}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-label ${getJobTone(item.status)}`}>{item.status || t('models.states.queued')}</span>
                      </div>
                      {typeof item.progress === 'number' ? <ProgressBar value={Number(item.progress) || 0} label={`${Math.round(Number(item.progress) || 0)}%`} progressLabel={t('models.progress')} /> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.target_path ? <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-label text-text-dim break-all">{item.target_path}</span> : null}
                        {item.status === 'queued' ? (
                          <button
                            type="button"
                            onClick={() => cancelHfQueueItem(item.id)}
                            disabled={modelAction === `hf-cancel:${item.id}`}
                            className="rounded-xl border border-error/20 bg-error/10 px-3 py-1.5 text-xs font-semibold text-error cursor-pointer hover:bg-error/15 disabled:opacity-50"
                          >
                            {modelAction === `hf-cancel:${item.id}` ? t('models.hf.cancelling') : t('common.cancel')}
                          </button>
                        ) : null}
                        {item.status === 'failed' || item.status === 'cancelled' ? (
                          <button
                            type="button"
                            onClick={() => retryHfQueueItem(item.id)}
                            disabled={modelAction === `hf-retry:${item.id}`}
                            className="rounded-xl border border-outline-dim bg-surface-high/70 px-3 py-1.5 text-xs font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50"
                          >
                            {modelAction === `hf-retry:${item.id}` ? t('models.retrying') : t('models.retry')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : null}

        {activeTab === 'recipes' ? (
          <div className="rounded-3xl border border-outline-dim bg-surface p-5">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-label">{t('models.recipeGuidance')}</div>
                  <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">{t('models.recipeSuggestionsTitle')}</h2>
                  <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-text-dim">
                    {t('models.recipeSuggestionsBody')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {consumerOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConsumerFilter(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-label cursor-pointer ${consumerFilter === option.value ? 'border-primary/40 bg-primary/10 text-primary' : 'border-outline-dim bg-surface text-text-dim hover:border-primary/20 hover:text-text'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeConsumer ? (
                <div className="mt-4 rounded-2xl border border-outline-dim bg-surface px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{activeConsumer.name}</div>
                      <div className="mt-1 text-xs text-text-dim font-label uppercase tracking-[0.12em]">{activeConsumer.category || t('models.recipe')}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectRecipe(activeConsumer.slug)}
                      className="rounded-xl border border-outline-dim bg-surface-high/70 px-3 py-2 text-xs font-semibold text-text cursor-pointer hover:bg-surface-high"
                    >
                      {t('models.openRecipe')}
                    </button>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-text-dim">
                    {activeConsumer.actionable_model
                      ? <>{t('models.suggestedSharedModel')} <span className="font-semibold text-text">{activeConsumer.actionable_model}</span></>
                      : activeConsumer.model_id || t('models.manualModelSelection')}
                  </div>
                  {activeConsumer.hf_snapshots?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeConsumer.hf_snapshots.map((snapshot) => (
                        <span key={`${activeConsumer.slug}-${snapshot.id}`} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-label text-primary">
                          HF: {snapshot.repository}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <InfoTile label={t('models.summary.recipesReadyNow')} value={String(coverageSummary.ready)} />
                <InfoTile label={t('models.summary.needSharedModel')} value={String(coverageSummary.missing)} />
                <InfoTile label={t('models.summary.manualInAppSetup')} value={String(coverageSummary.manual)} />
                <InfoTile label={t('models.summary.hfReadySuggestions')} value={String(hfReadySuggestedModels.length)} />
              </div>

              {hfCoveredRecipes.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-label">{t('models.recipeMapping')}</div>
                  <h3 className="m-0 mt-2 text-base font-bold tracking-tight text-text font-display">{t('models.hfCoveredRecipesTitle')}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hfCoveredRecipes.map((recipe) => (
                      <button
                        key={`hf-covered-${recipe.slug}`}
                        type="button"
                        onClick={() => selectRecipe(recipe.slug)}
                        className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-label text-primary cursor-pointer hover:border-primary/40"
                      >
                        {recipe.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {visibleRecommendedModels.length === 0 ? (
                  <EmptyState title={t('models.noDirectSuggestionsTitle')} body={t('models.noDirectSuggestionsBody')} />
                ) : visibleRecommendedModels.map((item) => {
                  const busy = modelAction === `pull:${item.name}`
                  const installed = installedList.some((model) => model.name === item.name)
                  return (
                    <div key={item.name} className="rounded-2xl border border-outline-dim bg-surface px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text break-all">{item.name}</div>
                          <div className="mt-1 text-xs text-text-dim">{item.reason}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-label ${installed ? 'bg-success/10 text-success' : item.available_via_hf ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
                          {installed ? t('models.states.installed') : item.available_via_hf ? t('models.states.hfAvailable') : t('models.states.missing')}
                        </span>
                      </div>
                      {item.available_via_hf && item.hf_repositories?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.hf_repositories.map((repo) => (
                            <span key={`${item.name}-${repo}`} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-label text-primary">
                              {repo}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {item.recipes?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.recipes.map((recipe) => (
                            <button
                              key={`${item.name}-${recipe.slug}`}
                              type="button"
                              onClick={() => selectRecipe(recipe.slug)}
                              className="rounded-full border border-outline-dim bg-surface-high/60 px-2.5 py-1 text-[10px] font-label text-text-dim cursor-pointer hover:border-primary/20 hover:text-primary"
                            >
                              {recipe.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          disabled={installed || busy || !modelOverview?.ready}
                          onClick={() => handlePull(item.name)}
                          className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        >
                          {busy ? t('models.pulling') : installed ? t('models.alreadyInstalled') : t('models.pullSuggestedModel')}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        ) : null}

        {activeTab === 'library' ? (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              {(modelSectionErrors?.modelCatalog || modelSectionErrors?.modelDownloads || modelSectionErrors?.installedModels)
                ? <SectionNotice message={t('models.libraryPartialDataUnavailable', { catalog: modelSectionErrors?.modelCatalog || 'ok', installed: modelSectionErrors?.installedModels || 'ok', downloads: modelSectionErrors?.modelDownloads || 'ok' })} />
                : null}
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('models.manualPull')}</div>
                  <div className="mt-1 text-sm leading-6 text-text-dim">{t('models.manualPullBody')}</div>
                </div>
                <div className="flex w-full max-w-xl gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('models.manualPullPlaceholder')}
                    className="w-full rounded-xl border border-outline-dim bg-surface-high px-4 py-2 text-sm text-text outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    onClick={() => handlePull(query)}
                    disabled={!query.trim() || modelAction === `pull:${query}` || !modelOverview?.ready}
                    className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {t('models.pull')}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('models.catalog')}</div>
                  <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">{t('models.browseAndDownload')}</h2>
                </div>
                <div className="text-sm text-text-dim leading-6">
                  {consumerFilter === 'all'
                    ? t('models.catalogSearchBody')
                    : t('models.catalogNarrowed', { name: activeConsumer?.name || t('models.selectedRecipe') })}
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {filteredCatalog.length === 0 ? (
                  <EmptyState title={t('models.noCatalogResultsTitle')} body={consumerFilter === 'all' ? t('models.noCatalogResultsAll') : t('models.noCatalogResultsFiltered')} />
                ) : filteredCatalog.map((entry) => {
                  const busy = entry.downloading || modelAction === `pull:${entry.name}`
                  return (
                    <div key={entry.name} className="rounded-2xl border border-outline-dim bg-surface-high/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-text">{entry.title || entry.name}</div>
                          <div className="mt-1 text-xs text-text-dim font-label break-all">{entry.name}</div>
                        </div>
                        <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-label text-text-dim">{entry.size || t('models.model')}</span>
                      </div>
                      <p className="m-0 mt-3 text-sm leading-6 text-text-dim">{entry.summary || t('models.sharedRuntimeModelEntry')}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(entry.capabilities || []).map((tag) => (
                          <span key={`${entry.name}-${tag}`} className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-label text-text-dim">{tag}</span>
                        ))}
                        {entry.installed ? <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-label text-success">{t('models.states.installed')}</span> : null}
                        {entry.downloading ? <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-label text-warning">{t('models.downloading')}</span> : null}
                      </div>
                      {(entry.downloading || Number(entry.download_progress) > 0) ? (
                        <ProgressBar value={Number(entry.download_progress) || 0} label={`${Math.round(Number(entry.download_progress) || 0)}%`} progressLabel={t('models.progress')} />
                      ) : null}
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          disabled={entry.installed || busy || !modelOverview?.ready}
                          onClick={() => handlePull(entry.name)}
                          className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        >
                          {busy ? t('models.pulling') : entry.installed ? t('models.alreadyInstalled') : t('models.pullModel')}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-outline-dim bg-surface p-5">
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('models.installedModels')}</div>
                <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">{t('models.sharedInventory')}</h2>
                <div className="mt-4 space-y-3">
                  {installedList.length === 0 ? (
                    <EmptyState title={t('models.noModelsInstalledTitle')} body={t('models.noModelsInstalledBody')} />
                  ) : installedList.map((model) => {
                    const deleting = model.deleting || modelAction === `delete:${model.name}`
                    return (
                      <div key={model.name} className="rounded-2xl border border-outline-dim bg-surface-high/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-text break-all">{model.name}</div>
                            <div className="mt-1 text-xs text-text-dim font-label">
                              {[model.family, model.parameter_size, model.quantization_level].filter(Boolean).join(' · ') || t('models.installedModel')}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={deleting || model.downloading}
                            onClick={() => handleDelete(model.name)}
                            className="rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-xs font-semibold text-error cursor-pointer hover:bg-error/15 disabled:opacity-50"
                          >
                            {deleting ? t('models.deleting') : t('models.delete')}
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-label text-text-dim">{formatBytes(model.size, t)}</span>
                          {model.loaded ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-label text-primary">{t('models.loaded')}</span> : null}
                          {model.downloading ? <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-label text-warning">{t('models.downloading')}</span> : null}
                        </div>
                        {model.downloading ? <ProgressBar value={Number(model.download_progress) || 0} label={`${Math.round(Number(model.download_progress) || 0)}%`} progressLabel={t('models.progress')} /> : null}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-outline-dim bg-surface p-5">
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('models.downloads')}</div>
                <h2 className="m-0 mt-2 text-lg font-bold tracking-tight text-text font-display">{t('models.recentActivity')}</h2>
                <div className="mt-4 space-y-3">
                  {downloadsList.length === 0 ? (
                    <EmptyState title={t('models.noRecentDownloadsTitle')} body={t('models.noRecentDownloadsBody')} />
                  ) : downloadsList.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-outline-dim bg-surface-high/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-text break-all">{item.name || t('models.modelJob')}</div>
                          <div className="mt-1 text-xs text-text-dim font-label">{item.message || item.status || t('models.states.pending')}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-label ${getJobTone(item.status)}`}>
                          {item.status || t('models.states.queued')}
                        </span>
                      </div>
                      <ProgressBar value={Number(item.progress) || 0} label={`${Math.round(Number(item.progress) || 0)}%`} progressLabel={t('models.progress')} />
                      <div className="mt-3 text-[11px] text-text-dim font-label">
                        {item.started_at ? t('models.startedAt', { value: formatDate(item.started_at) }) : t('models.startTimeUnavailable')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function getRuntimeStateLabel(overview, t) {
  if (!overview?.installed) return t('models.states.notInstalled')
  if (overview.ready) return t('models.states.ready')
  if (overview.starting) return t('models.states.starting')
  if (overview.running) return t('models.states.running')
  return t('models.states.installed')
}

function getJobTone(status) {
  if (status === 'completed') return 'bg-success/10 text-success'
  if (status === 'failed') return 'bg-error/10 text-error'
  if (status === 'running') return 'bg-warning/10 text-warning'
  return 'bg-surface text-text-dim'
}

function formatBytes(value, t) {
  const size = Number(value || 0)
  if (!Number.isFinite(size) || size <= 0) return t('models.unknownSize')
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

function ProgressBar({ value, label, progressLabel = 'Progress' }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[11px] text-text-dim font-label">
        <span>{progressLabel}</span>
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

function SectionNotice({ message }) {
  return (
    <div className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
      {message}
    </div>
  )
}