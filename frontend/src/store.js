import { create } from 'zustand'

const getInitialTheme = () => {
  const saved = localStorage.getItem('spark-ai-hub-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return 'dark'
}

export const useStore = create((set, get) => ({
  recipes: [],
  metrics: null,
  metricHistory: [],
  buildLogs: {},
  installing: null,
  updating: null,
  restarting: null,
  removing: null,
  purging: null,
  _inFlight: {},  // slug -> { starting, running, ready, installed } overrides during transitions
  _ws: null,
  selectedRecipe: null,
  containerLogs: {},
  _logWs: null,
  theme: getInitialTheme(),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('spark-ai-hub-theme', next)
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
  },

  setRecipes: (recipes) => set({ recipes }),
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

  selectRecipe: (slug) => {
    set({ selectedRecipe: slug })
  },

  clearRecipe: () => {
    get().disconnectLogs()
    set({ selectedRecipe: null })
  },

  connectLogs: (slug) => {
    get().disconnectLogs()
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${location.host}/ws/logs/${slug}`)
    set({
      _logWs: ws,
      containerLogs: { ...get().containerLogs, [slug]: [] },
    })

    ws.onmessage = (e) => {
      if (e.data === '[spark-ai-hub:ready]') {
        // Backend marked it ready; refetch so recipe.ready updates everywhere
        get().fetchRecipes()
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
      console.warn('Container log WebSocket error')
    }

    ws.onclose = () => {
      set({ _logWs: null })
    }
  },

  disconnectLogs: () => {
    const ws = get()._logWs
    if (ws && ws.readyState <= 1) {
      ws.close()
    }
    set({ _logWs: null })
  },

  addBuildLine: (slug, line) => set((s) => {
    const prev = s.buildLogs[slug] || []
    // Match Docker layer progress: " <hash> Downloading/Extracting/Waiting/Pull complete"
    const layerMatch = line.match(/^\s*([0-9a-f]{12})\s+(Downloading|Extracting|Verifying|Waiting|Pull complete|Already exists|Download complete|Pulling fs layer)/)
    if (layerMatch) {
      const layerId = layerMatch[1]
      // Find and replace the last line with the same layer ID
      const idx = prev.findLastIndex((l) => l.includes(layerId))
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = line
        return { buildLogs: { ...s.buildLogs, [slug]: updated } }
      }
    }
    return { buildLogs: { ...s.buildLogs, [slug]: [...prev, line] } }
  }),

  fetchRecipes: async () => {
    try {
      const res = await fetch(`/api/recipes?t=${Date.now()}`)
      if (!res.ok) return
      const fresh = await res.json()
      const inFlight = get()._inFlight
      // Overlay in-flight state so polling can't flash wrong states
      const merged = fresh.map(r => inFlight[r.slug] ? { ...r, ...inFlight[r.slug] } : r)
      set({ recipes: merged })
    } catch (e) {
      console.error('Failed to fetch recipes:', e)
    }
  },

  installRecipe: async (slug) => {
    set({ installing: slug, buildLogs: { ...get().buildLogs, [slug]: [] } })

    try {
      await fetch(`/api/recipes/${slug}/install`, { method: 'POST' })
    } catch (e) {
      console.error('Install POST failed:', e)
      set({ installing: null })
      return
    }

    // Connect WebSocket for live log streaming
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${location.host}/ws/build/${slug}`)
    set({ _ws: ws })

    ws.onmessage = (e) => {
      if (e.data === '[done]') {
        set({ installing: null, _ws: null })
        get().fetchRecipes()
        // Auto-connect container logs after install completes
        setTimeout(() => get().connectLogs(slug), 1000)
        return
      }
      get().addBuildLine(slug, e.data)
    }

    ws.onerror = () => {
      console.warn('Build WebSocket error, falling back to polling')
      get()._pollBuildStatus(slug)
    }

    ws.onclose = () => {
      if (get().installing === slug) {
        get()._pollBuildStatus(slug)
      }
    }
  },

  updateRecipe: async (slug) => {
    set({ updating: slug, buildLogs: { ...get().buildLogs, [slug]: [] } })

    try {
      await fetch(`/api/recipes/${slug}/update`, { method: 'POST' })
    } catch (e) {
      console.error('Update POST failed:', e)
      set({ updating: null })
      return
    }

    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${location.host}/ws/build/${slug}`)
    set({ _ws: ws })

    ws.onmessage = (e) => {
      if (e.data === '[done]') {
        set({ updating: null, _ws: null })
        get().fetchRecipes()
        setTimeout(() => get().connectLogs(slug), 1000)
        return
      }
      get().addBuildLine(slug, e.data)
    }

    ws.onerror = () => {
      console.warn('Update WebSocket error, falling back to polling')
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
        }))
        if (data.status === 'done') {
          set({ [stateKey]: null })
          get().fetchRecipes()
        } else {
          setTimeout(poll, 1000)
        }
      } catch {
        set({ [stateKey]: null })
      }
    }
    poll()
  },

  launchRecipe: async (slug) => {
    const override = { starting: true, running: false, ready: false }
    set({
      _inFlight: { ...get()._inFlight, [slug]: override },
      recipes: get().recipes.map(r => r.slug === slug ? { ...r, ...override } : r),
    })
    try {
      await fetch(`/api/recipes/${slug}/launch`, { method: 'POST' })
    } catch (e) {
      console.error('Launch failed:', e)
    } finally {
      set({ _inFlight: { ...get()._inFlight, [slug]: undefined } })
      await get().fetchRecipes()
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
      await get().fetchRecipes()
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
      await get().fetchRecipes()
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
      await get().fetchRecipes()
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
      await get().fetchRecipes()
    }
  },
}))
