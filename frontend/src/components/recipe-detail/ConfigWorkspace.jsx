import { useEffect, useMemo, useState } from 'react'
import { isNotebookRecipe } from '../../utils/recipePresentation'
import { useStore } from '../../store'

export default function RecipeConfigTab({ recipe }) {
  const isNotebook = isNotebookRecipe(recipe)
  const tabs = useMemo(() => [
    { id: 'compose', label: 'Compose' },
    ...(recipe.runtime_env_path ? [{ id: 'env', label: 'Environment' }] : []),
  ], [recipe.runtime_env_path])
  const [activeConfigTab, setActiveConfigTab] = useState(tabs[0]?.id || 'compose')

  return (
    <div className="h-full min-h-0 flex flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
      <div className="shrink-0 px-6 py-5 border-b border-outline-dim bg-surface-low/40">
        <div className="max-w-4xl">
          <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Configuration Workspace</div>
          <p className="text-sm text-text-dim leading-6 m-0 mt-2">
            {isNotebook
              ? 'This notebook blueprint separates container settings from runtime environment values so reviewers can check launch wiring without losing the main workflow overview.'
              : 'OpenClaw, NemoClaw, MiniCPM-o, Live VLM WebUI, and the Multi-Agent Chatbot expose advanced runtime files. Their compose and environment editors are separated here to keep the main overview cleaner.'}
          </p>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-surface-high/70 p-1.5 border border-outline-dim mt-4">
            {tabs.map((tab) => {
              const active = tab.id === activeConfigTab
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveConfigTab(tab.id)}
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
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeConfigTab === 'compose' ? (
          <ComposeEditor slug={recipe.slug} />
        ) : (
          <EnvEditor slug={recipe.slug} runtimeEnvPath={recipe.runtime_env_path} standalone />
        )}
      </div>
    </div>
  )
}

export function InlineConfigWorkspace({ recipe }) {
  return (
    <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] min-h-0 h-full overflow-hidden">
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <ComposeEditor slug={recipe.slug} />
        </div>
        {recipe.runtime_env_path && (
          <EnvEditor slug={recipe.slug} runtimeEnvPath={recipe.runtime_env_path} />
        )}
      </div>
    </div>
  )
}

export function ComposeEditor({ slug }) {
  const getRecipeForkStatus = useStore((s) => s.getRecipeForkStatus)
  const saveRecipeFork = useStore((s) => s.saveRecipeFork)
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [defaultContent, setDefaultContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [forkSaving, setForkSaving] = useState(false)
  const [forkInfo, setForkInfo] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      setSaved(false)
      try {
        const res = await fetch(`/api/recipes/${slug}/compose`)
        if (!res.ok) throw new Error('load failed')
        const data = await res.json()
        if (cancelled) return
        setContent(data.content)
        setOriginal(data.content)
        setDefaultContent(data.default_content || data.content)
      } catch {
        if (!cancelled) setError('Failed to load docker-compose.yml')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [slug])

  useEffect(() => {
    let cancelled = false

    const loadFork = async () => {
      try {
        const status = await getRecipeForkStatus(slug)
        if (!cancelled) setForkInfo(status)
      } catch {
        if (!cancelled) setForkInfo(null)
      }
    }

    loadFork()
    return () => { cancelled = true }
  }, [getRecipeForkStatus, slug])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/recipes/${slug}/compose`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('save failed')
      setOriginal(content)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save docker-compose.yml')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async () => {
    if (!window.confirm('Reset docker-compose.yml to the default recipe version?')) return
    setResetting(true)
    setError('')
    try {
      const res = await fetch(`/api/recipes/${slug}/compose/reset`, { method: 'POST' })
      if (!res.ok) throw new Error('reset failed')
      const data = await res.json()
      setContent(data.content)
      setOriginal(data.content)
      setDefaultContent(data.content)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to reset docker-compose.yml')
    } finally {
      setResetting(false)
    }
  }

  const saveAsFork = async () => {
    setForkSaving(true)
    setError('')
    try {
      const result = await saveRecipeFork(slug)
      setForkInfo({
        slug,
        exists: true,
        fork_dir: result.fork_dir,
        files: result.files,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save recipe fork')
    } finally {
      setForkSaving(false)
    }
  }

  const dirty = content !== original
  const canReset = original !== defaultContent || content !== defaultContent

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 px-5 py-4 border-b border-outline-dim bg-surface-low/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-text font-display m-0">Compose Configuration</h2>
            <p className="text-sm text-text-dim mt-1 mb-0 leading-relaxed">Edit the live `docker-compose.yml` for this recipe. Save keeps your custom version; restore brings back the default file from the registry.</p>
            {forkInfo?.exists && forkInfo?.fork_dir && (
              <p className="text-xs text-text-dim mt-2 mb-0 font-mono break-all">Fork workspace: {forkInfo.fork_dir}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={forkSaving || loading}
              onClick={saveAsFork}
              className="px-4 py-2 bg-surface text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-default"
            >
              {forkSaving ? 'Saving Fork...' : 'Save as My Fork'}
            </button>
            <button
              disabled={!canReset || resetting || loading}
              onClick={resetToDefault}
              className="px-4 py-2 bg-warning/10 text-warning border-none rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-warning/15 disabled:opacity-40 disabled:cursor-default"
            >
              {resetting ? 'Restoring...' : 'Restore Default'}
            </button>
            <button
              disabled={!dirty || saving || loading}
              onClick={save}
              className="px-4 py-2 bg-primary text-white border-none rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-default"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-5 flex flex-col">
        {loading ? (
          <div className="h-full rounded-2xl bg-[#08080F] border border-outline-dim flex items-center justify-center text-sm text-text-dim">
            Loading docker-compose.yml...
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="flex-1 min-h-0 w-full bg-[#08080F] text-gray-300 font-mono text-[12px] leading-6 p-4 rounded-2xl border border-outline-dim resize-none focus:outline-none focus:border-primary/50"
          />
        )}

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs min-h-[20px]">
          {saved && <span className="text-success font-label">Saved. Relaunch or reinstall to apply.</span>}
          {dirty && !saved && <span className="text-warning font-label">Unsaved changes</span>}
          {!dirty && canReset && !saved && <span className="text-text-dim font-label">Using a customized compose file.</span>}
          {error && <span className="text-error font-label">{error}</span>}
        </div>
      </div>
    </div>
  )
}

function parseEnvItems(content) {
  const items = []
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  let pendingComments = []
  let spacerBefore = false
  let nextId = 1

  for (const line of lines) {
    if (!line.trim()) {
      if (items.length > 0 || pendingComments.length > 0) spacerBefore = true
      continue
    }

    if (line.trimStart().startsWith('#')) {
      pendingComments.push(line.replace(/^\s*#\s?/, ''))
      continue
    }

    const exportPrefix = line.startsWith('export ')
    const body = exportPrefix ? line.slice(7) : line
    const eqIndex = body.indexOf('=')

    if (eqIndex >= 0) {
      items.push({
        id: nextId++,
        type: 'entry',
        key: body.slice(0, eqIndex).trim(),
        value: body.slice(eqIndex + 1),
        comments: pendingComments,
        spacerBefore,
        exportPrefix,
      })
    } else {
      items.push({
        id: nextId++,
        type: 'raw',
        raw: line,
        comments: pendingComments,
        spacerBefore,
      })
    }

    pendingComments = []
    spacerBefore = false
  }

  if (pendingComments.length > 0) {
    items.push({
      id: nextId++,
      type: 'raw',
      raw: '',
      comments: pendingComments,
      spacerBefore,
    })
  }

  return items
}

function serializeEnvItems(items) {
  const lines = []

  items.forEach((item) => {
    if (item.spacerBefore && lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('')
    }

    if (item.comments?.length) {
      item.comments.forEach((comment) => {
        lines.push(comment ? `# ${comment}` : '#')
      })
    }

    if (item.type === 'entry') {
      const prefix = item.exportPrefix ? 'export ' : ''
      lines.push(`${prefix}${item.key}=${item.value}`)
    } else if (item.raw) {
      lines.push(item.raw)
    }
  })

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`
}

const ENV_GROUP_META = {
  gateway: {
    label: 'Gateway',
    description: 'Network binding, gateway behavior, and control plane settings.',
  },
  model: {
    label: 'Model',
    description: 'Model selection, provider configuration, and inference endpoints.',
  },
  auth: {
    label: 'Auth',
    description: 'Tokens, API keys, passwords, and authentication-related settings.',
  },
  ui: {
    label: 'UI',
    description: 'Dashboard URLs, ports, and user-facing interface settings.',
  },
  messaging: {
    label: 'Messaging',
    description: 'Discord and messaging channel integration settings.',
  },
  runtime: {
    label: 'Runtime',
    description: 'Bootstrap and execution flags that affect local runtime behavior.',
  },
  other: {
    label: 'Other',
    description: 'Additional values that do not match a predefined group.',
  },
}

const ENV_GROUP_ORDER = ['gateway', 'model', 'auth', 'ui', 'messaging', 'runtime', 'other']

function getEnvGroup(key = '') {
  const upperKey = key.toUpperCase()

  if (
    upperKey.startsWith('OPENCLAW_GATEWAY_') ||
    upperKey.includes('GATEWAY')
  ) return 'gateway'

  if (
    upperKey.includes('TOKEN') ||
    upperKey.includes('API_KEY') ||
    upperKey.includes('PASSWORD') ||
    upperKey.includes('SECRET') ||
    upperKey.includes('AUTH') ||
    upperKey.includes('CREDENTIAL')
  ) return 'auth'

  if (
    upperKey.includes('CHAT_UI') ||
    upperKey.endsWith('_UI') ||
    upperKey.includes('_URL') ||
    upperKey.includes('_PORT') ||
    upperKey.includes('_HOST')
  ) return 'ui'

  if (
    upperKey.includes('MESSAGING') ||
    upperKey.includes('DISCORD') ||
    upperKey.includes('GUILD')
  ) return 'messaging'

  if (
    upperKey.includes('MODEL') ||
    upperKey.includes('PROVIDER') ||
    upperKey.includes('INFERENCE') ||
    upperKey.includes('CONTEXT') ||
    upperKey.includes('OUTPUT')
  ) return 'model'

  if (
    upperKey.includes('BUILD') ||
    upperKey.includes('RUNTIME') ||
    upperKey.includes('DEVICE') ||
    upperKey.includes('ENABLE') ||
    upperKey.includes('DISABLE') ||
    upperKey.includes('SKIP')
  ) return 'runtime'

  return 'other'
}

function groupEnvItems(items) {
  const grouped = new Map()
  ENV_GROUP_ORDER.forEach((group) => grouped.set(group, []))

  items.forEach((item) => {
    const group = item.type === 'entry' ? getEnvGroup(item.key) : 'other'
    grouped.get(group)?.push(item)
  })

  return ENV_GROUP_ORDER
    .map((group) => ({
      id: group,
      ...ENV_GROUP_META[group],
      items: grouped.get(group) || [],
    }))
    .filter((group) => group.items.length > 0)
}

export function EnvEditor({ slug, runtimeEnvPath, standalone = false }) {
  const [items, setItems] = useState([])
  const [originalContent, setOriginalContent] = useState('')
  const [defaultContent, setDefaultContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [envPath, setEnvPath] = useState(runtimeEnvPath || '')

  const serializedContent = serializeEnvItems(items)
  const dirty = serializedContent !== originalContent
  const canReset = originalContent !== defaultContent || serializedContent !== defaultContent
  const groupedItems = groupEnvItems(items)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      setSaved(false)
      try {
        const res = await fetch(`/api/recipes/${slug}/env`)
        if (!res.ok) throw new Error('load failed')
        const data = await res.json()
        if (cancelled) return
        setItems(parseEnvItems(data.content))
        setOriginalContent(data.content)
        setDefaultContent(data.default_content || data.content)
        setEnvPath(data.path || runtimeEnvPath || '')
      } catch {
        if (!cancelled) setError('Failed to load runtime env file')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [slug, runtimeEnvPath])

  const save = async () => {
    if (items.some((item) => item.type === 'entry' && !item.key.trim())) {
      setError('Variable name cannot be empty')
      return
    }

    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/recipes/${slug}/env`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: serializedContent }),
      })
      if (!res.ok) throw new Error('save failed')
      setOriginalContent(serializedContent)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save runtime env file')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async () => {
    if (!window.confirm('Reset runtime env to the default recipe version?')) return
    setResetting(true)
    setError('')
    try {
      const res = await fetch(`/api/recipes/${slug}/env/reset`, { method: 'POST' })
      if (!res.ok) throw new Error('reset failed')
      const data = await res.json()
      setItems(parseEnvItems(data.content))
      setOriginalContent(data.content)
      setDefaultContent(data.content)
      setEnvPath(data.path || runtimeEnvPath || '')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to reset runtime env file')
    } finally {
      setResetting(false)
    }
  }

  const updateEntry = (id, field, value) => {
    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, [field]: value } : item
    )))
  }

  const removeEntry = (id) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  const addEntry = () => {
    setItems((current) => ([
      ...current,
      {
        id: Date.now(),
        type: 'entry',
        key: '',
        value: '',
        comments: [],
        spacerBefore: current.length > 0,
        exportPrefix: false,
      },
    ]))
  }

  return (
    <div className={standalone ? 'h-full min-h-0 flex flex-col overflow-hidden bg-surface-low/30' : 'min-h-0 flex flex-col border-t border-outline-dim bg-surface-low/30'}>
      <div className="px-5 py-4 border-b border-outline-dim bg-surface-low/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-text font-display m-0">Runtime Environment</h2>
            <p className="text-sm text-text-dim mt-1 mb-0 leading-relaxed">
              Edit the live `.env` as structured key-value fields. Save applies your runtime configuration; restore reloads the recipe default template.
            </p>
            {envPath && <p className="text-xs text-text-dim mt-2 mb-0 font-mono break-all">{envPath}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={loading}
              onClick={addEntry}
              className="px-4 py-2 bg-surface text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-default"
            >
              Add Variable
            </button>
            <button
              disabled={!canReset || resetting || loading}
              onClick={resetToDefault}
              className="px-4 py-2 bg-warning/10 text-warning border-none rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-warning/15 disabled:opacity-40 disabled:cursor-default"
            >
              {resetting ? 'Restoring...' : 'Restore Default'}
            </button>
            <button
              disabled={!dirty || saving || loading}
              onClick={save}
              className="px-4 py-2 bg-primary text-white border-none rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-default"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col">
        {loading ? (
          <div className="h-56 rounded-2xl bg-[#08080F] border border-outline-dim flex items-center justify-center text-sm text-text-dim">
            Loading runtime env...
          </div>
        ) : (
          <div className="space-y-5">
            {groupedItems.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="px-1">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{group.label}</div>
                  <p className="text-sm text-text-dim leading-6 m-0 mt-1">{group.description}</p>
                </div>

                {group.items.map((item) => (
                  item.type === 'entry' ? (
                    <div key={item.id} className="rounded-2xl border border-outline-dim bg-[#08080F] p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">Environment Variable</div>
                          {item.comments?.length > 0 && (
                            <p className="text-sm text-text-dim leading-6 m-0 mt-2">{item.comments.join(' ')}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeEntry(item.id)}
                          className="px-3 py-1.5 bg-error-surface text-error border-none rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)]">
                        <label className="space-y-1.5">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label block">Key</span>
                          <input
                            value={item.key}
                            onChange={(e) => updateEntry(item.id, 'key', e.target.value)}
                            spellCheck={false}
                            className="w-full bg-surface-high text-text font-mono text-[12px] leading-6 px-3 py-2.5 rounded-xl border border-outline-dim focus:outline-none focus:border-primary/50"
                            placeholder="ENV_KEY"
                          />
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label block">Value</span>
                          <input
                            value={item.value}
                            onChange={(e) => updateEntry(item.id, 'value', e.target.value)}
                            spellCheck={false}
                            className="w-full bg-surface-high text-text font-mono text-[12px] leading-6 px-3 py-2.5 rounded-xl border border-outline-dim focus:outline-none focus:border-primary/50"
                            placeholder="value"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="rounded-2xl border border-outline-dim bg-[#08080F] p-4">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">Preserved Raw Block</div>
                      {item.comments?.length > 0 && (
                        <p className="text-sm text-text-dim leading-6 m-0 mt-2">{item.comments.join(' ')}</p>
                      )}
                      {item.raw && <pre className="mt-3 text-[11px] text-text-muted font-mono whitespace-pre-wrap m-0">{item.raw}</pre>}
                    </div>
                  )
                ))}
              </div>
            ))}
            {items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-outline-dim bg-[#08080F] p-6 text-sm text-text-dim text-center">
                No variables yet. Add a variable to create the runtime env file content.
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs min-h-[20px]">
          {saved && <span className="text-success font-label">Saved. Relaunch or reinstall to apply.</span>}
          {dirty && !saved && <span className="text-warning font-label">Unsaved changes</span>}
          {!dirty && canReset && !saved && <span className="text-text-dim font-label">Using a customized runtime env file.</span>}
          {error && <span className="text-error font-label">{error}</span>}
        </div>
      </div>
    </div>
  )
}
