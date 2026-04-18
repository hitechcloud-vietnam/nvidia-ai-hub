import { create } from 'zustand'
import i18n, { persistLanguage } from './i18n'

const tStore = (key, options) => i18n.t(`store.${key}`, options)

const getInitialTheme = () => {
  const saved = localStorage.getItem('nvidia-ai-hub-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return 'dark'
}

const FEATURE_FLAGS_STORAGE_KEY = 'nvidia-ai-hub-feature-flags'
const LANGUAGE_STORAGE_KEY = 'nvidia-ai-hub-language'

const getInitialLanguage = () => {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return saved || i18n.resolvedLanguage || i18n.language || 'en'
}

const getInitialFeatureFlags = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY) || '{}')
    return {
      modelManager: saved?.modelManager === true,
    }
  } catch {
    return { modelManager: false }
  }
}

const persistFeatureFlags = (flags) => {
  localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(flags))
}

const mergeRecipeCommunity = (state, slug, community) => {
  const recipes = state.recipes.map((recipe) => (
    recipe.slug === slug ? { ...recipe, community } : recipe
  ))
  const currentDetail = state.recipeDetails[slug]

  return {
    recipes,
    recipeDetails: currentDetail
      ? { ...state.recipeDetails, [slug]: { ...currentDetail, community } }
      : state.recipeDetails,
  }
}

export const useStore = create((set, get) => ({
  recipes: [],
  recipesLoadedAt: 0,
  recipeDetails: {},
  recipeDetailStatus: {},
  modelManagerLoadedAt: 0,
  modelManagerAvailable: false,
  registryStatus: null,
  syncingRegistry: false,
  metrics: null,
  systemTopology: null,
  deploymentPlans: {},
  recipeMetrics: {},
  metricHistory: [],
  buildLogs: {},
  buildProgress: {},
  installing: null,
  updating: null,
  restarting: null,
  removing: null,
  purging: null,
  _inFlight: {},  // slug -> { starting, running, ready, installed } overrides during transitions
  _ws: null,
  _recipesPromise: null,
  _recipeDetailPromises: {},
  selectedRecipe: null,
  containerLogs: {},
  modelOverview: null,
  modelRuntime: null,
  modelCatalog: { models: [] },
  installedModels: { models: [] },
  modelDownloads: { downloads: [] },
  modelSources: { sources: [] },
  backupPreview: null,
  backupAction: '',
  backupRestoreJob: null,
  hfIntakeQueue: { items: [] },
  hfInventory: { snapshots: [] },
  modelsLoading: false,
  modelsError: null,
  modelSectionErrors: {},
  modelAction: '',
  _logWs: {},
  theme: getInitialTheme(),
  language: getInitialLanguage(),
  featureFlags: getInitialFeatureFlags(),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('nvidia-ai-hub-theme', next)
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
  },

  setLanguage: async (language) => {
    await i18n.changeLanguage(language)
    persistLanguage(language)
    set({ language })
  },

  setFeatureFlag: (key, enabled) => {
    const nextFlags = { ...get().featureFlags, [key]: Boolean(enabled) }
    persistFeatureFlags(nextFlags)
    set({ featureFlags: nextFlags })
  },

  fetchModelManagerAvailability: async () => {
    try {
      const [installedResult, hfResult] = await Promise.allSettled([
        fetch('/api/models/installed').then(async (res) => {
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
          return data
        }),
        fetch('/api/models/huggingface').then(async (res) => {
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
          return data
        }),
      ])

      const installedCount = installedResult.status === 'fulfilled' && Array.isArray(installedResult.value?.models)
        ? installedResult.value.models.length
        : 0
      const snapshotCount = hfResult.status === 'fulfilled'
        ? Number(hfResult.value?.summary?.snapshot_count ?? hfResult.value?.snapshots?.length ?? 0)
        : 0

      const available = installedCount > 0 || snapshotCount > 0
      set({ modelManagerAvailable: available })
      return available
    } catch (e) {
      console.error('Failed to determine model manager availability:', e)
      set({ modelManagerAvailable: false })
      return false
    }
  },

  toggleFeatureFlag: (key) => {
    const nextFlags = { ...get().featureFlags, [key]: !get().featureFlags?.[key] }
    persistFeatureFlags(nextFlags)
    set({ featureFlags: nextFlags })
  },

  setRecipes: (recipes) => set({ recipes, recipesLoadedAt: Date.now() }),
  setRecipeDetail: (slug, recipe) => set((state) => ({
    recipeDetails: { ...state.recipeDetails, [slug]: recipe },
    recipeDetailStatus: {
      ...state.recipeDetailStatus,
      [slug]: { loading: false, error: null, loadedAt: Date.now() },
    },
  })),
  setRegistryStatus: (registryStatus) => set({ registryStatus }),
  setMetrics: (metrics) => set((state) => {
    const gpuSeries = (Array.isArray(metrics?.gpus) ? metrics.gpus : []).reduce((acc, gpu) => {
      acc[`gpu_${gpu.index}`] = gpu.utilization ?? 0
      acc[`gpu_temp_${gpu.index}`] = gpu.temperature ?? 0
      acc[`gpu_mem_${gpu.index}`] = gpu.memory_total_mb > 0 ? Math.min(100, ((gpu.memory_used_mb || 0) / gpu.memory_total_mb) * 100) : 0
      return acc
    }, {})

    const nextPoint = {
      time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
      cpu: metrics?.cpu_percent ?? 0,
      gpu: metrics?.gpu_utilization ?? 0,
      temp: metrics?.gpu_temperature || metrics?.cpu_temperature || 0,
      ...gpuSeries,
    }

    return {
      metrics,
      metricHistory: [...state.metricHistory, nextPoint].slice(-60),
    }
  }),
  setRecipeMetrics: (recipeMetrics) => set({ recipeMetrics: recipeMetrics || {} }),
  setSystemTopology: (systemTopology) => set({ systemTopology }),

  selectRecipe: (slug) => {
    set({ selectedRecipe: slug })
    get().fetchRecipeDetail(slug)
  },

  clearRecipe: () => {
    set({ selectedRecipe: null })
  },

  connectLogs: (slug, options = {}) => {
    const { reset = false } = options
    const existing = get()._logWs[slug]
    if (existing && existing.readyState <= 1) return

    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${location.host}/ws/logs/${slug}`)
    set({
      _logWs: { ...get()._logWs, [slug]: ws },
      containerLogs: reset
        ? { ...get().containerLogs, [slug]: [] }
        : get().containerLogs,
    })

    ws.onmessage = (e) => {
      if (e.data === '[nvidia-ai-hub:ready]') {
        // Backend marked it ready; refetch so recipe.ready updates everywhere
        get().fetchRecipes({ force: true })
        get().fetchRecipeDetail(slug, { force: true })
        return
      }
      set((s) => {
        const prev = s.containerLogs[slug] || []
        const line = e.data
        // Detect progress lines (e.g. "50% Completed | 2/4", "Downloading: 45%")
        const isProgress = /\d+%/.test(line) && (/\|/.test(line) || /it\/s/.test(line) || /Completed/.test(line) || /Downloading/.test(line))
        if (isProgress) {
          // Find last progress line with same prefix (text before the percentage)
          const prefix = line.match(/^(.*?)\d+%/)?.[1] || ''
          const idx = prev.findLastIndex((l) => l.startsWith(prefix) && /\d+%/.test(l))
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = line
            return { containerLogs: { ...s.containerLogs, [slug]: updated } }
          }
        }
        return { containerLogs: { ...s.containerLogs, [slug]: [...prev, line] } }
      })
    }

    ws.onerror = () => {
      console.warn(tStore('logs.containerSocketError'))
    }

    ws.onclose = () => {
      set((state) => {
        const next = { ...state._logWs }
        delete next[slug]
        return { _logWs: next }
      })
    }
  },

  disconnectLogs: (slug) => {
    if (!slug) {
      Object.values(get()._logWs).forEach((ws) => {
        if (ws && ws.readyState <= 1) ws.close()
      })
      set({ _logWs: {} })
      return
    }

    const ws = get()._logWs[slug]
    if (ws && ws.readyState <= 1) {
      ws.close()
    }
    set((state) => {
      const next = { ...state._logWs }
      delete next[slug]
      return { _logWs: next }
    })
  },

  addBuildLine: (slug, line) => set((s) => {
    const prev = s.buildLogs[slug] || []
    const nextProgress = inferBuildProgress([...(prev || []), line])
    // Match Docker layer progress: " <hash> Downloading/Extracting/Waiting/Pull complete"
    const layerMatch = line.match(/^\s*([0-9a-f]{12})\s+(Downloading|Extracting|Verifying|Waiting|Pull complete|Already exists|Download complete|Pulling fs layer)/)
    if (layerMatch) {
      const layerId = layerMatch[1]
      // Find and replace the last line with the same layer ID
      const idx = prev.findLastIndex((l) => l.includes(layerId))
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = line
        return {
          buildLogs: { ...s.buildLogs, [slug]: updated },
          buildProgress: { ...s.buildProgress, [slug]: inferBuildProgress(updated) },
        }
      }
    }
    return {
      buildLogs: { ...s.buildLogs, [slug]: [...prev, line] },
      buildProgress: { ...s.buildProgress, [slug]: nextProgress },
    }
  }),

  fetchRecipes: async (options = {}) => {
    const { force = false } = options
    const now = Date.now()
    if (get()._recipesPromise) return get()._recipesPromise
    if (!force && get().recipes.length > 0 && now - get().recipesLoadedAt < 4000) return get().recipes

    const request = (async () => {
      try {
        const res = await fetch('/api/recipes')
        if (!res.ok) return get().recipes
        const fresh = await res.json()
        const inFlight = get()._inFlight
        // Overlay in-flight state so polling can't flash wrong states
        const merged = fresh.map(r => inFlight[r.slug] ? { ...r, ...inFlight[r.slug] } : r)
        set({ recipes: merged, recipesLoadedAt: Date.now() })
        return merged
      } catch (e) {
        console.error('Failed to fetch recipes:', e)
        return get().recipes
      } finally {
        set({ _recipesPromise: null })
      }
    })()

    set({ _recipesPromise: request })
    return request
  },

  fetchRegistryStatus: async () => {
    try {
      const res = await fetch('/api/recipes/registry/status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ registryStatus: data })
      return data
    } catch (e) {
      console.error('Failed to fetch registry status:', e)
      return get().registryStatus
    }
  },

  fetchModelManager: async (options = {}) => {
    const { silent = false } = options
    if (!silent) {
      set({ modelsLoading: true, modelsError: null })
    }
    try {
      const currentState = get()
      const requestDefinitions = [
        { key: 'modelOverview', label: tStore('requestLabels.overview'), url: '/api/models/overview', fallback: currentState.modelOverview, required: true },
        { key: 'modelRuntime', label: tStore('requestLabels.runtime'), url: '/api/models/runtime', fallback: currentState.modelRuntime || { reachable: false } },
        { key: 'installedModels', label: tStore('requestLabels.installedModels'), url: '/api/models/installed', fallback: currentState.installedModels || { models: [] } },
        { key: 'modelCatalog', label: tStore('requestLabels.catalog'), url: '/api/models/catalog', fallback: currentState.modelCatalog || { models: [] } },
        { key: 'modelDownloads', label: tStore('requestLabels.downloads'), url: '/api/models/downloads', fallback: currentState.modelDownloads || { downloads: [] } },
        { key: 'modelSources', label: tStore('requestLabels.sources'), url: '/api/models/sources', fallback: currentState.modelSources || { sources: [] } },
        { key: 'hfIntakeQueue', label: tStore('requestLabels.hfIntake'), url: '/api/models/intake', fallback: currentState.hfIntakeQueue || { items: [] } },
        { key: 'hfInventory', label: tStore('requestLabels.hfInventory'), url: '/api/models/huggingface', fallback: currentState.hfInventory || { snapshots: [] } },
      ]

      const parseResponse = async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.detail || `HTTP ${res.status}`)
        }
        return data
      }

      const settled = await Promise.allSettled(
        requestDefinitions.map(async (request) => {
          const res = await fetch(request.url)
          const data = await parseResponse(res)
          return { ...request, data }
        }),
      )

      const nextState = {}
      const modelSectionErrors = {}

      settled.forEach((result, index) => {
        const request = requestDefinitions[index]
        if (result.status === 'fulfilled') {
          nextState[request.key] = result.value.data
          return
        }

        const message = result.reason?.message || tStore('errors.requestFailed')
        modelSectionErrors[request.key] = message

        if (request.required && !request.fallback) {
          throw new Error(message)
        }

        nextState[request.key] = request.fallback
      })

      const modelOverview = nextState.modelOverview
      const runtimeUnavailable = Boolean(modelSectionErrors.modelRuntime)
      const degradedRuntimeAreas = ['modelRuntime', 'installedModels', 'modelCatalog', 'modelDownloads']
        .filter((key) => modelSectionErrors[key])
        .map((key) => requestDefinitions.find((item) => item.key === key)?.label)
        .filter(Boolean)

      let modelsError = null
      if (runtimeUnavailable && modelOverview?.installed) {
        modelsError = tStore('errors.runtimeUnreachable')
      } else if (degradedRuntimeAreas.length > 0) {
        modelsError = tStore('errors.degradedSections', { sections: degradedRuntimeAreas.join(', ') })
      }

      set({
        ...nextState,
        modelsError,
        modelSectionErrors,
        modelManagerAvailable: (Array.isArray(nextState.installedModels?.models) && nextState.installedModels.models.length > 0)
          || Number(nextState.hfInventory?.summary?.snapshot_count ?? nextState.hfInventory?.snapshots?.length ?? 0) > 0,
        modelManagerLoadedAt: Date.now(),
      })
      return nextState
    } catch (e) {
      console.error('Failed to fetch model manager data:', e)
      set({ modelsError: e.message || tStore('errors.loadModelManager') })
      return null
    } finally {
      if (!silent) {
        set({ modelsLoading: false })
      }
    }
  },

  pullModel: async (name) => {
    set({ modelAction: `pull:${name}`, modelsError: null })
    try {
      const res = await fetch('/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      set({ modelManagerAvailable: true })
      await get().fetchModelManager({ silent: true })
      return data
    } catch (e) {
      console.error('Failed to pull model:', e)
      set({ modelsError: e.message || tStore('errors.pullModel') })
      return null
    } finally {
      set({ modelAction: '' })
    }
  },

  deleteModel: async (name) => {
    set({ modelAction: `delete:${name}`, modelsError: null })
    try {
      const res = await fetch('/api/models/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      await get().fetchModelManager({ silent: true })
      return data
    } catch (e) {
      console.error('Failed to delete model:', e)
      set({ modelsError: e.message || tStore('errors.deleteModel') })
      return null
    } finally {
      set({ modelAction: '' })
    }
  },

  queueHfModel: async ({ repository, revision = 'main', targetDir = 'huggingface', notes = '' }) => {
    const label = `hf:${repository}`
    set({ modelAction: label, modelsError: null })
    try {
      const res = await fetch('/api/models/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository, revision, target_dir: targetDir, notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      await get().fetchModelManager({ silent: true })
      return data
    } catch (e) {
      console.error('Failed to queue Hugging Face model intake:', e)
      set({ modelsError: e.message || tStore('errors.queueHfModel') })
      return null
    } finally {
      set({ modelAction: '' })
    }
  },

  cancelHfQueueItem: async (id) => {
    if (!id) return null
    set({ modelAction: `hf-cancel:${id}`, modelsError: null })
    try {
      const res = await fetch(`/api/models/intake/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      await get().fetchModelManager({ silent: true })
      return data
    } catch (e) {
      console.error('Failed to cancel Hugging Face queue item:', e)
      set({ modelsError: e.message || tStore('errors.cancelHfQueueItem') })
      return null
    } finally {
      set({ modelAction: '' })
    }
  },

  retryHfQueueItem: async (id) => {
    if (!id) return null
    set({ modelAction: `hf-retry:${id}`, modelsError: null })
    try {
      const res = await fetch(`/api/models/intake/${encodeURIComponent(id)}/retry`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      await get().fetchModelManager({ silent: true })
      return data
    } catch (e) {
      console.error('Failed to retry Hugging Face queue item:', e)
      set({ modelsError: e.message || tStore('errors.retryHfQueueItem') })
      return null
    } finally {
      set({ modelAction: '' })
    }
  },

  deleteHfSnapshot: async (id) => {
    if (!id) return null
    set({ modelAction: `hf-delete:${id}`, modelsError: null })
    try {
      const res = await fetch(`/api/models/huggingface/${encodeURIComponent(id)}/delete`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      await get().fetchModelManager({ silent: true })
      return data
    } catch (e) {
      console.error('Failed to delete Hugging Face snapshot:', e)
      set({ modelsError: e.message || tStore('errors.deleteHfSnapshot') })
      return null
    } finally {
      set({ modelAction: '' })
    }
  },

  syncRegistry: async () => {
    set({ syncingRegistry: true })
    try {
      const res = await fetch('/api/recipes/registry/sync', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ registryStatus: data })
      await get().fetchRecipes({ force: true })
      const selectedRecipe = get().selectedRecipe
      if (selectedRecipe) {
        await get().fetchRecipeDetail(selectedRecipe, { force: true })
      }
      return data
    } catch (e) {
      console.error('Failed to sync registry:', e)
      return { synced: false, sync_error: e.message || tStore('errors.registrySyncFailed') }
    } finally {
      set({ syncingRegistry: false })
    }
  },

  fetchSystemTopology: async (options = {}) => {
    const { force = false } = options
    if (!force && get().systemTopology) return get().systemTopology
    try {
      const res = await fetch('/api/system/topology')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ systemTopology: data })
      return data
    } catch (e) {
      console.error('Failed to fetch system topology:', e)
      return get().systemTopology
    }
  },

  exportSystemBackup: async () => {
    set({ backupAction: 'export' })
    try {
      const res = await fetch('/api/system/backup/export', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to export system backup:', e)
      throw e
    } finally {
      set({ backupAction: '' })
    }
  },

  previewSystemBackupRestore: async (snapshot) => {
    set({ backupAction: 'preview' })
    try {
      const res = await fetch('/api/system/backup/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      set({ backupPreview: data })
      return data
    } catch (e) {
      console.error('Failed to preview backup restore:', e)
      throw e
    } finally {
      set({ backupAction: '' })
    }
  },

  restoreSystemBackup: async (snapshot) => {
    set({ backupAction: 'restore' })
    try {
      const res = await fetch('/api/system/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      set({ backupPreview: data })
      await get().fetchRecipes({ force: true })
      await get().fetchModelManager({ silent: true })
      return data
    } catch (e) {
      console.error('Failed to restore backup:', e)
      throw e
    } finally {
      set({ backupAction: '' })
    }
  },

  startSystemBackupRestore: async (snapshot) => {
    set({ backupAction: 'restore-start' })
    try {
      const res = await fetch('/api/system/backup/restore/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      set({ backupRestoreJob: data, backupPreview: data.staged || get().backupPreview })
      return data
    } catch (e) {
      console.error('Failed to start restore job:', e)
      throw e
    } finally {
      set({ backupAction: '' })
    }
  },

  fetchBackupRestoreJob: async (jobId) => {
    if (!jobId) return null
    try {
      const res = await fetch(`/api/system/backup/restore/${encodeURIComponent(jobId)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      set({ backupRestoreJob: data })
      return data
    } catch (e) {
      console.error('Failed to fetch restore job:', e)
      return get().backupRestoreJob
    }
  },

  fetchRecipeDeploymentPlan: async (slug, options = {}) => {
    if (!slug) return null
    const { force = false } = options
    const cached = get().deploymentPlans[slug]
    if (!force && cached) return cached
    try {
      const res = await fetch(`/api/system/deployment-plan/${slug}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set((state) => ({ deploymentPlans: { ...state.deploymentPlans, [slug]: data } }))
      return data
    } catch (e) {
      console.error(`Failed to fetch deployment plan for ${slug}:`, e)
      return get().deploymentPlans[slug] || null
    }
  },

  saveRecipeDeploymentSelection: async (slug, selection) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/deployment-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selection),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      await get().fetchRecipeDeploymentPlan(slug, { force: true })
      return data
    } catch (e) {
      console.error('Failed to save deployment selection:', e)
      throw e
    }
  },

  fetchRecipeDetail: async (slug, options = {}) => {
    if (!slug) return null

    const { force = false } = options
    const status = get().recipeDetailStatus[slug]
    const cached = get().recipeDetails[slug]
    const pending = get()._recipeDetailPromises[slug]
    const now = Date.now()

    if (!force && pending) return pending
    if (!force && cached && status?.loadedAt && now - status.loadedAt < 30000) return cached

    set((state) => ({
      recipeDetailStatus: {
        ...state.recipeDetailStatus,
        [slug]: { loading: true, error: null, loadedAt: status?.loadedAt || 0 },
      },
    }))

    const request = (async () => {
      try {
        const [detailRes, exportsRes] = await Promise.all([
          fetch(`/api/recipes/${slug}`),
          fetch(`/api/recipes/${slug}/exports?host=${encodeURIComponent(location.hostname || 'localhost')}`),
        ])
        if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status}`)
        const detail = await detailRes.json()
        const platformExports = exportsRes.ok ? await exportsRes.json().catch(() => null) : null
        if (platformExports) {
          detail.platform_exports = platformExports
        }
        set((state) => ({
          recipeDetails: { ...state.recipeDetails, [slug]: detail },
          recipeDetailStatus: {
            ...state.recipeDetailStatus,
            [slug]: { loading: false, error: null, loadedAt: Date.now() },
          },
        }))
        return detail
      } catch (e) {
        console.error(`Failed to fetch recipe detail for ${slug}:`, e)
        set((state) => ({
          recipeDetailStatus: {
            ...state.recipeDetailStatus,
            [slug]: { loading: false, error: e.message || tStore('errors.loadRecipe'), loadedAt: status?.loadedAt || 0 },
          },
        }))
        return get().recipeDetails[slug] || null
      } finally {
        set((state) => ({
          _recipeDetailPromises: { ...state._recipeDetailPromises, [slug]: null },
        }))
      }
    })()

    set((state) => ({
      _recipeDetailPromises: { ...state._recipeDetailPromises, [slug]: request },
    }))

    return request
  },

  verifyRecipeCommunity: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/community/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment: 1 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      set((state) => mergeRecipeCommunity(state, slug, data))
      return data
    } catch (e) {
      console.error('Failed to verify recipe:', e)
      throw e
    }
  },

  rateRecipeCommunity: async (slug, score) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/community/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      set((state) => mergeRecipeCommunity(state, slug, data))
      return data
    } catch (e) {
      console.error('Failed to rate recipe:', e)
      throw e
    }
  },

  addRecipeCommunityTip: async (slug, payload) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/community/tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      set((state) => mergeRecipeCommunity(state, slug, data))
      return data
    } catch (e) {
      console.error('Failed to add recipe tip:', e)
      throw e
    }
  },

  exportRecipeCommunity: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/community/export`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to export recipe community:', e)
      throw e
    }
  },

  getRecipeForkStatus: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/fork`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to load recipe fork status:', e)
      throw e
    }
  },

  saveRecipeFork: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/fork`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to save recipe fork:', e)
      throw e
    }
  },

  activateRecipeFork: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/fork/activate`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to activate recipe fork:', e)
      throw e
    }
  },

  deactivateRecipeFork: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/fork/deactivate`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to deactivate recipe fork:', e)
      throw e
    }
  },

  deleteRecipeFork: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/fork`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to delete recipe fork:', e)
      throw e
    }
  },

  exportRecipeForkBundle: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/fork/export`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to export recipe fork bundle:', e)
      throw e
    }
  },

  getRecipeForkDiffSummary: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/fork/diff`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to load recipe fork diff summary:', e)
      throw e
    }
  },

  getRecipeForkFullDiff: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/fork/diff/full`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to load recipe fork full diff:', e)
      throw e
    }
  },

  getRecipeForkManifestMarkdown: async (slug) => {
    try {
      const res = await fetch(`/api/recipes/${slug}/fork/manifest-markdown`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
      return data
    } catch (e) {
      console.error('Failed to load recipe fork manifest markdown:', e)
      throw e
    }
  },

  getRecipeForkManifestMarkdownDownloadUrl: (slug) => `/api/recipes/${slug}/fork/manifest-markdown/download`,

  getRecipeForkDownloadUrl: (slug) => `/api/recipes/${slug}/fork/download`,

  installRecipe: async (slug, selection = null) => {
    set({
      installing: slug,
      buildLogs: { ...get().buildLogs, [slug]: [] },
      buildProgress: { ...get().buildProgress, [slug]: inferBuildProgress([]) },
    })

    try {
      const res = await fetch(`/api/recipes/${slug}/install`, {
        method: 'POST',
        headers: selection ? { 'Content-Type': 'application/json' } : undefined,
        body: selection ? JSON.stringify(selection) : undefined,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.error('Install POST failed:', e)
      get().addBuildLine(slug, `[error] ${e.message || tStore('errors.installRequestFailed')}`)
      set({ installing: null })
      return
    }

    // Connect WebSocket for live log streaming
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${location.host}/ws/build/${slug}`)
    set({ _ws: ws })

    ws.onmessage = (e) => {
      if (e.data === '[done]') {
        set({
          installing: null,
          _ws: null,
          buildProgress: {
            ...get().buildProgress,
            [slug]: { percent: 100, phase: tStore('build.completedPhase'), detail: tStore('build.buildFinishedSuccessfully') },
          },
        })
        get().fetchRecipes({ force: true })
        get().fetchRecipeDetail(slug, { force: true })
        return
      }
      get().addBuildLine(slug, e.data)
    }

    ws.onerror = () => {
      console.warn(tStore('logs.buildSocketFallback'))
      get()._pollBuildStatus(slug)
    }

    ws.onclose = () => {
      if (get().installing === slug) {
        get()._pollBuildStatus(slug)
      }
    }
  },

  updateRecipe: async (slug) => {
    set({
      updating: slug,
      buildLogs: { ...get().buildLogs, [slug]: [] },
      buildProgress: { ...get().buildProgress, [slug]: inferBuildProgress([]) },
    })

    try {
      const res = await fetch(`/api/recipes/${slug}/update`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.error('Update POST failed:', e)
      get().addBuildLine(slug, `[error] ${e.message || tStore('errors.updateRequestFailed')}`)
      set({ updating: null })
      return
    }

    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${location.host}/ws/build/${slug}`)
    set({ _ws: ws })

    ws.onmessage = (e) => {
      if (e.data === '[done]') {
        set({
          updating: null,
          _ws: null,
          buildProgress: {
            ...get().buildProgress,
            [slug]: { percent: 100, phase: tStore('build.completedPhase'), detail: tStore('build.updateFinishedSuccessfully') },
          },
        })
        get().fetchRecipes({ force: true })
        get().fetchRecipeDetail(slug, { force: true })
        return
      }
      get().addBuildLine(slug, e.data)
    }

    ws.onerror = () => {
      console.warn(tStore('logs.updateSocketFallback'))
      get()._pollBuildStatus(slug, 'updating')
    }

    ws.onclose = () => {
      if (get().updating === slug) {
        get()._pollBuildStatus(slug, 'updating')
      }
    }
  },

  _pollBuildStatus: async (slug, stateKey = 'installing') => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/recipes/${slug}/build-status`)
        if (!res.ok) return
        const data = await res.json()
        set((s) => ({
          buildLogs: { ...s.buildLogs, [slug]: data.lines },
          buildProgress: { ...s.buildProgress, [slug]: inferBuildProgress(data.lines || []) },
        }))
        if (data.status === 'done') {
          set((s) => ({
            [stateKey]: null,
            buildProgress: {
              ...s.buildProgress,
              [slug]: { percent: 100, phase: tStore('build.completedPhase'), detail: tStore('build.operationFinishedSuccessfully') },
            },
          }))
          get().fetchRecipes({ force: true })
          get().fetchRecipeDetail(slug, { force: true })
        } else {
          setTimeout(poll, 1000)
        }
      } catch {
        set({ [stateKey]: null })
      }
    }
    poll()
  },

  launchRecipe: async (slug, selection = null) => {
    const override = { starting: true, running: false, ready: false }
    set({
      _inFlight: { ...get()._inFlight, [slug]: override },
      recipes: get().recipes.map(r => r.slug === slug ? { ...r, ...override } : r),
    })
    try {
      await fetch(`/api/recipes/${slug}/launch`, {
        method: 'POST',
        headers: selection ? { 'Content-Type': 'application/json' } : undefined,
        body: selection ? JSON.stringify(selection) : undefined,
      })
    } catch (e) {
      console.error('Launch failed:', e)
    } finally {
      set({ _inFlight: { ...get()._inFlight, [slug]: undefined } })
      await get().fetchRecipes({ force: true })
      await get().fetchRecipeDetail(slug, { force: true })
    }
  },

  stopRecipe: async (slug) => {
    const override = { running: false, ready: false, starting: false }
    set({
      _inFlight: { ...get()._inFlight, [slug]: override },
      recipes: get().recipes.map(r => r.slug === slug ? { ...r, ...override } : r),
    })
    try {
      await fetch(`/api/recipes/${slug}/stop`, { method: 'POST' })
    } catch (e) {
      console.error('Stop failed:', e)
    } finally {
      set({ _inFlight: { ...get()._inFlight, [slug]: undefined } })
      await get().fetchRecipes({ force: true })
      await get().fetchRecipeDetail(slug, { force: true })
    }
  },

  restartRecipe: async (slug) => {
    const override = { running: true, ready: false, starting: true }
    set({
      restarting: slug,
      _inFlight: { ...get()._inFlight, [slug]: override },
      recipes: get().recipes.map(r => r.slug === slug ? { ...r, ...override } : r),
    })
    try {
      const res = await fetch(`/api/recipes/${slug}/restart`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.error('Restart failed:', e)
    } finally {
      set({ restarting: null, _inFlight: { ...get()._inFlight, [slug]: undefined } })
      await get().fetchRecipes({ force: true })
      await get().fetchRecipeDetail(slug, { force: true })
    }
  },

  removeRecipe: async (slug, options = {}) => {
    const { deleteData = true } = options
    const override = { installed: false, running: false, ready: false, starting: false }
    set({
      removing: slug,
      _inFlight: { ...get()._inFlight, [slug]: override },
      recipes: get().recipes.map(r => r.slug === slug ? { ...r, ...override } : r),
    })
    try {
      const res = await fetch(`/api/recipes/${slug}?delete_data=${deleteData ? 'true' : 'false'}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.error('Remove failed:', e)
    } finally {
      set({ removing: null, _inFlight: { ...get()._inFlight, [slug]: undefined } })
      await get().fetchRecipes({ force: true })
      set((state) => {
        const nextDetails = { ...state.recipeDetails }
        delete nextDetails[slug]
        const nextStatus = { ...state.recipeDetailStatus }
        delete nextStatus[slug]
        return {
          recipeDetails: nextDetails,
          recipeDetailStatus: nextStatus,
        }
      })
    }
  },

  purgeRecipe: async (slug) => {
    set({ purging: slug })
    try {
      const res = await fetch(`/api/recipes/${slug}/purge`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.error('Purge failed:', e)
    } finally {
      set({ purging: null })
      await get().fetchRecipes({ force: true })
      await get().fetchRecipeDetail(slug, { force: true })
    }
  },
}))

function inferBuildProgress(lines) {
  const normalized = Array.isArray(lines) ? lines : []
  if (normalized.length === 0) {
    return { percent: 6, phase: tStore('build.queuedPhase'), detail: tStore('build.waitingForLogs') }
  }

  const latest = normalized[normalized.length - 1] || ''
  const joined = normalized.join('\n').toLowerCase()

  const explicitPercent = extractExplicitPercent(latest) ?? extractExplicitPercent(joined)

  if (joined.includes('[error]') || joined.includes('traceback') || joined.includes('failed')) {
    return { percent: explicitPercent ?? 100, phase: tStore('build.failedPhase'), detail: latest }
  }

  if (joined.includes('exporting') || joined.includes('naming to') || joined.includes('writing image') || joined.includes('successfully built')) {
    return { percent: Math.max(explicitPercent ?? 92, 92), phase: tStore('build.finalizingPhase'), detail: latest }
  }

  if (joined.includes('pip install') || joined.includes('collecting ') || joined.includes('installing collected packages') || joined.includes('npm install')) {
    return { percent: explicitPercent ?? 62, phase: tStore('build.installingDependenciesPhase'), detail: latest }
  }

  if (joined.includes('extracting') || joined.includes('pull complete') || joined.includes('downloading') || joined.includes('pulling fs layer')) {
    return { percent: explicitPercent ?? 36, phase: tStore('build.pullingBaseLayersPhase'), detail: latest }
  }

  if (joined.includes('step ') || joined.includes('building') || joined.includes('load build definition') || joined.includes('load metadata')) {
    return { percent: explicitPercent ?? 18, phase: tStore('build.preparingBuildPhase'), detail: latest }
  }

  if (joined.includes('done')) {
    return { percent: 100, phase: tStore('build.completedPhase'), detail: latest }
  }

  return { percent: explicitPercent ?? 24, phase: tStore('build.processingLogsPhase'), detail: latest }
}

function extractExplicitPercent(text) {
  if (typeof text !== 'string') return null
  const match = text.match(/(\d{1,3})%/)
  if (!match) return null
  const value = Number(match[1])
  if (Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, value))
}
