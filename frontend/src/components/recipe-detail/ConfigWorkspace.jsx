import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isNotebookRecipe } from '../../utils/recipePresentation'
import { useStore } from '../../store'

function DiffLine({ line }) {
  let className = 'text-gray-300'
  if (line.startsWith('+++') || line.startsWith('---')) {
    className = 'text-sky-300 bg-sky-500/10'
  } else if (line.startsWith('@@')) {
    className = 'text-amber-300 bg-amber-500/10'
  } else if (line.startsWith('+')) {
    className = 'text-emerald-300 bg-emerald-500/10'
  } else if (line.startsWith('-')) {
    className = 'text-rose-300 bg-rose-500/10'
  }

  return <div className={`px-4 ${className}`}>{line || ' '}</div>
}

function getDiffToneClass(tone = 'context') {
  return {
    header: 'text-sky-300 bg-sky-500/10',
    hunk: 'text-amber-300 bg-amber-500/10',
    add: 'text-emerald-300 bg-emerald-500/10',
    remove: 'text-rose-300 bg-rose-500/10',
    context: 'text-gray-300',
    empty: 'text-gray-500 bg-white/0',
  }[tone] || 'text-gray-300'
}

function DiffUnifiedRow({ row }) {
  const toneClass = getDiffToneClass(row.tone)

  return (
    <div className={`grid grid-cols-[64px_64px_minmax(0,1fr)] text-[12px] leading-6 font-mono ${toneClass}`}>
      <div className="px-3 text-right text-text-dim border-r border-outline-dim/60 select-none">{row.leftLineNumber ?? ''}</div>
      <div className="px-3 text-right text-text-dim border-r border-outline-dim/60 select-none">{row.rightLineNumber ?? ''}</div>
      <div className="px-4 break-words whitespace-pre-wrap">{row.line || ' '}</div>
    </div>
  )
}

function DiffSideCell({ line, tone = 'context', lineNumber = null, align = 'right' }) {
  const toneClass = getDiffToneClass(tone)

  return (
    <div className={`grid grid-cols-[64px_minmax(0,1fr)] ${toneClass}`}>
      <div className={`px-3 py-0.5 text-text-dim border-r border-outline-dim/60 select-none ${align === 'right' ? 'text-right' : 'text-left'}`}>
        {lineNumber ?? ''}
      </div>
      <div className="px-4 py-0.5 min-h-[28px] break-words whitespace-pre-wrap">{line || ' '}</div>
    </div>
  )
}

function DiffCollapsedContext({ hiddenCount, onExpand, compact = false }) {
  const { t } = useTranslation()
  const toneClass = {
    context: 'text-gray-300 bg-surface-low/40',
  }.context

  return (
    <button
      onClick={onExpand}
      className={`w-full ${compact ? 'grid grid-cols-[64px_minmax(0,1fr)]' : 'grid grid-cols-[64px_64px_minmax(0,1fr)]'} text-left text-[12px] leading-6 font-mono border-y border-outline-dim/40 transition-all hover:border-primary/50 ${toneClass}`}
    >
      <div className="px-3 border-r border-outline-dim/60" />
      {!compact && <div className="px-3 border-r border-outline-dim/60" />}
      <div className="px-4 py-1 text-text-dim">{t('configWorkspace.showUnchangedLines', { count: hiddenCount })}</div>
    </button>
  )
}

function parseUnifiedDiffRows(diffText) {
  const rows = []
  const lines = (diffText || '').split('\n')
  let leftLineNumber = null
  let rightLineNumber = null

  for (const line of lines) {
    if (line.startsWith('---') || line.startsWith('+++')) {
      rows.push({
        kind: 'meta',
        line,
        tone: 'header',
        left: line,
        right: line,
        leftTone: 'header',
        rightTone: 'header',
        leftLineNumber: null,
        rightLineNumber: null,
      })
      continue
    }
    if (line.startsWith('@@')) {
      const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
      if (match) {
        leftLineNumber = Number(match[1])
        rightLineNumber = Number(match[3])
      }
      rows.push({
        kind: 'hunk',
        line,
        tone: 'hunk',
        left: line,
        right: line,
        leftTone: 'hunk',
        rightTone: 'hunk',
        leftLineNumber: null,
        rightLineNumber: null,
      })
      continue
    }
    if (line.startsWith('-')) {
      rows.push({
        kind: 'remove',
        line,
        tone: 'remove',
        left: line,
        right: '',
        leftTone: 'remove',
        rightTone: 'empty',
        leftLineNumber,
        rightLineNumber: null,
      })
      leftLineNumber = leftLineNumber == null ? null : leftLineNumber + 1
      continue
    }
    if (line.startsWith('+')) {
      rows.push({
        kind: 'add',
        line,
        tone: 'add',
        left: '',
        right: line,
        leftTone: 'empty',
        rightTone: 'add',
        leftLineNumber: null,
        rightLineNumber,
      })
      rightLineNumber = rightLineNumber == null ? null : rightLineNumber + 1
      continue
    }
    rows.push({
      kind: 'context',
      line,
      tone: 'context',
      left: line,
      right: line,
      leftTone: 'context',
      rightTone: 'context',
      leftLineNumber,
      rightLineNumber,
    })
    leftLineNumber = leftLineNumber == null ? null : leftLineNumber + 1
    rightLineNumber = rightLineNumber == null ? null : rightLineNumber + 1
  }

  return rows
}

function buildDiffRenderItems(diffText, fileKey) {
  const rows = parseUnifiedDiffRows(diffText)
  const items = []
  let contextRun = []
  let contextIndex = 0

  const flushContextRun = () => {
    if (!contextRun.length) return
    if (contextRun.length <= 6) {
      contextRun.forEach((row) => items.push({ type: 'row', row }))
    } else {
      contextIndex += 1
      items.push({ type: 'row', row: contextRun[0] })
      items.push({ type: 'row', row: contextRun[1] })
      items.push({
        type: 'collapsed-context',
        key: `${fileKey}-context-${contextIndex}`,
        hiddenRows: contextRun.slice(2, -2),
      })
      items.push({ type: 'row', row: contextRun[contextRun.length - 2] })
      items.push({ type: 'row', row: contextRun[contextRun.length - 1] })
    }
    contextRun = []
  }

  rows.forEach((row) => {
    if (row.kind === 'context') {
      contextRun.push(row)
      return
    }
    flushContextRun()
    items.push({ type: 'row', row })
  })
  flushContextRun()

  return items
}

export default function RecipeConfigTab({ recipe }) {
  const { t } = useTranslation()
  const isNotebook = isNotebookRecipe(recipe)
  const tabs = useMemo(() => [
    { id: 'compose', label: t('configWorkspace.tabs.compose') },
    ...(recipe.runtime_env_path ? [{ id: 'env', label: t('configWorkspace.tabs.environment') }] : []),
  ], [recipe.runtime_env_path, t])
  const [activeConfigTab, setActiveConfigTab] = useState(tabs[0]?.id || 'compose')

  return (
    <div className="h-full min-h-0 flex flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
      <div className="shrink-0 px-6 py-5 border-b border-outline-dim bg-surface-low/40">
        <div className="max-w-4xl">
          <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('configWorkspace.title')}</div>
          <p className="text-sm text-text-dim leading-6 m-0 mt-2">
            {isNotebook
              ? t('configWorkspace.notebookDescription')
              : t('configWorkspace.appDescription')}
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
  const { t } = useTranslation()
  const getRecipeForkStatus = useStore((s) => s.getRecipeForkStatus)
  const saveRecipeFork = useStore((s) => s.saveRecipeFork)
  const activateRecipeFork = useStore((s) => s.activateRecipeFork)
  const deactivateRecipeFork = useStore((s) => s.deactivateRecipeFork)
  const deleteRecipeFork = useStore((s) => s.deleteRecipeFork)
  const exportRecipeForkBundle = useStore((s) => s.exportRecipeForkBundle)
  const getRecipeForkDiffSummary = useStore((s) => s.getRecipeForkDiffSummary)
  const getRecipeForkFullDiff = useStore((s) => s.getRecipeForkFullDiff)
  const getRecipeForkManifestMarkdown = useStore((s) => s.getRecipeForkManifestMarkdown)
  const getRecipeForkManifestMarkdownDownloadUrl = useStore((s) => s.getRecipeForkManifestMarkdownDownloadUrl)
  const getRecipeForkDownloadUrl = useStore((s) => s.getRecipeForkDownloadUrl)
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [defaultContent, setDefaultContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [forkSaving, setForkSaving] = useState(false)
  const [forkToggling, setForkToggling] = useState(false)
  const [forkDeleting, setForkDeleting] = useState(false)
  const [bundleExporting, setBundleExporting] = useState(false)
  const [forkInfo, setForkInfo] = useState(null)
  const [bundleInfo, setBundleInfo] = useState(null)
  const [diffInfo, setDiffInfo] = useState(null)
  const [fullDiffInfo, setFullDiffInfo] = useState(null)
  const [manifestMarkdown, setManifestMarkdown] = useState('')
  const [showFullDiff, setShowFullDiff] = useState(false)
  const [diffMode, setDiffMode] = useState('unified')
  const [collapsedDiffFiles, setCollapsedDiffFiles] = useState({})
  const [expandedDiffContexts, setExpandedDiffContexts] = useState({})
  const [copyingMarkdown, setCopyingMarkdown] = useState(false)
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
        if (!cancelled) setError(t('configWorkspace.errors.loadCompose'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [slug, t])

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

  useEffect(() => {
    let cancelled = false

    const loadDiff = async () => {
      try {
        const diff = await getRecipeForkDiffSummary(slug)
        if (!cancelled) setDiffInfo(diff)
      } catch {
        if (!cancelled) setDiffInfo(null)
      }
    }

    loadDiff()
    return () => { cancelled = true }
  }, [getRecipeForkDiffSummary, slug, forkInfo?.exists, forkInfo?.active])

  useEffect(() => {
    let cancelled = false
    if (!forkInfo?.exists || !showFullDiff) {
      setFullDiffInfo(null)
      return () => { cancelled = true }
    }

    const loadFullDiff = async () => {
      try {
        const diff = await getRecipeForkFullDiff(slug)
        if (!cancelled) setFullDiffInfo(diff)
      } catch {
        if (!cancelled) setFullDiffInfo(null)
      }
    }

    loadFullDiff()
    return () => { cancelled = true }
  }, [forkInfo?.exists, getRecipeForkFullDiff, showFullDiff, slug])

  useEffect(() => {
    let cancelled = false
    if (!forkInfo?.exists) {
      setManifestMarkdown('')
      return () => { cancelled = true }
    }

    const loadMarkdown = async () => {
      try {
        const result = await getRecipeForkManifestMarkdown(slug)
        if (!cancelled) setManifestMarkdown(result.markdown || '')
      } catch {
        if (!cancelled) setManifestMarkdown('')
      }
    }

    loadMarkdown()
    return () => { cancelled = true }
  }, [forkInfo?.exists, getRecipeForkManifestMarkdown, slug, diffInfo?.summary?.changed_files])

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
      setError(t('configWorkspace.errors.saveCompose'))
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async () => {
    if (!window.confirm(t('configWorkspace.confirmResetCompose'))) return
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
      setError(t('configWorkspace.errors.resetCompose'))
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
        active: result.active,
        fork_dir: result.fork_dir,
        files: result.files,
      })
      setDiffInfo(await getRecipeForkDiffSummary(slug))
      if (showFullDiff) setFullDiffInfo(await getRecipeForkFullDiff(slug))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError(t('configWorkspace.errors.saveFork'))
    } finally {
      setForkSaving(false)
    }
  }

  const dirty = content !== original
  const canReset = original !== defaultContent || content !== defaultContent
  const forkActive = Boolean(forkInfo?.exists && forkInfo?.active)

  const toggleDiffFile = (fileKey) => {
    setCollapsedDiffFiles((current) => ({
      ...current,
      [fileKey]: !current[fileKey],
    }))
  }

  const expandDiffContext = (contextKey) => {
    setExpandedDiffContexts((current) => ({
      ...current,
      [contextKey]: true,
    }))
  }

  const handleForkToggle = async () => {
    if (!forkInfo?.exists) return
    setForkToggling(true)
    setError('')
    try {
      const result = forkActive
        ? await deactivateRecipeFork(slug)
        : await activateRecipeFork(slug)
      setForkInfo(result)
      setDiffInfo(await getRecipeForkDiffSummary(slug))
      if (showFullDiff) setFullDiffInfo(await getRecipeForkFullDiff(slug))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError(forkActive ? t('configWorkspace.errors.deactivateFork') : t('configWorkspace.errors.activateFork'))
    } finally {
      setForkToggling(false)
    }
  }

  const handleForkDelete = async () => {
    if (!forkInfo?.exists) return
    if (!window.confirm(t('configWorkspace.confirmDeleteFork'))) return
    setForkDeleting(true)
    setError('')
    try {
      const result = await deleteRecipeFork(slug)
      setForkInfo(result)
      const res = await fetch(`/api/recipes/${slug}/compose`)
      if (!res.ok) throw new Error('reload failed')
      const data = await res.json()
      setContent(data.content)
      setOriginal(data.content)
      setDefaultContent(data.default_content || data.content)
      setDiffInfo(null)
      setFullDiffInfo(null)
      setManifestMarkdown('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError(t('configWorkspace.errors.deleteFork'))
    } finally {
      setForkDeleting(false)
    }
  }

  const handleBundleExport = async () => {
    if (!forkInfo?.exists) return
    setBundleExporting(true)
    setError('')
    try {
      const result = await exportRecipeForkBundle(slug)
      setBundleInfo(result)
      setDiffInfo(result.manifest?.diff_summary || diffInfo)
      if (showFullDiff) setFullDiffInfo(await getRecipeForkFullDiff(slug))
      const markdown = await getRecipeForkManifestMarkdown(slug)
      setManifestMarkdown(markdown.markdown || '')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError(t('configWorkspace.errors.exportForkBundle'))
    } finally {
      setBundleExporting(false)
    }
  }

  const handleCopyMarkdown = async () => {
    if (!manifestMarkdown) return
    setCopyingMarkdown(true)
    setError('')
    try {
      await navigator.clipboard.writeText(manifestMarkdown)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError(t('configWorkspace.errors.copySummary'))
    } finally {
      setCopyingMarkdown(false)
    }
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 px-5 py-4 border-b border-outline-dim bg-surface-low/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-text font-display m-0">{t('configWorkspace.compose.title')}</h2>
            <p className="text-sm text-text-dim mt-1 mb-0 leading-relaxed">{t('configWorkspace.compose.description')}</p>
            {forkInfo?.exists && forkInfo?.fork_dir && (
              <p className="text-xs text-text-dim mt-2 mb-0 font-mono break-all">{t('configWorkspace.compose.forkWorkspace', { path: forkInfo.fork_dir })}</p>
            )}
            {forkActive && (
              <p className="text-xs text-primary mt-2 mb-0 font-label">{t('configWorkspace.compose.activeForkMode')}</p>
            )}
            {forkInfo?.exists && !forkActive && (
              <p className="text-xs text-text-dim mt-2 mb-0 font-label">{t('configWorkspace.compose.localForkInactive')}</p>
            )}
            {bundleInfo?.bundle_path && (
              <p className="text-xs text-text-dim mt-2 mb-0 font-mono break-all">{t('configWorkspace.compose.latestForkBundle', { path: bundleInfo.bundle_path })}</p>
            )}
            {bundleInfo?.manifest_path && (
              <p className="text-xs text-text-dim mt-1 mb-0 font-mono break-all">{t('configWorkspace.compose.bundleManifest', { path: bundleInfo.manifest_path })}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={forkSaving || loading}
              onClick={saveAsFork}
              className="px-4 py-2 bg-surface text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-default"
            >
              {forkSaving ? t('configWorkspace.actions.savingFork') : t('configWorkspace.actions.saveAsMyFork')}
            </button>
            <button
              disabled={!forkInfo?.exists || forkToggling || loading}
              onClick={handleForkToggle}
              className="px-4 py-2 bg-surface text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-default"
            >
              {forkToggling
                ? (forkActive ? t('configWorkspace.actions.disablingFork') : t('configWorkspace.actions.enablingFork'))
                : (forkActive ? t('configWorkspace.actions.useRegistryVersion') : t('configWorkspace.actions.useMyFork'))}
            </button>
            <button
              disabled={!forkInfo?.exists || forkDeleting || loading}
              onClick={handleForkDelete}
              className="px-4 py-2 bg-error/10 text-error border-none rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-error/15 disabled:opacity-40 disabled:cursor-default"
            >
              {forkDeleting ? t('configWorkspace.actions.deletingFork') : t('configWorkspace.actions.deleteFork')}
            </button>
            <button
              disabled={!forkInfo?.exists || bundleExporting || loading}
              onClick={handleBundleExport}
              className="px-4 py-2 bg-surface text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-default"
            >
              {bundleExporting ? t('configWorkspace.actions.exportingBundle') : t('configWorkspace.actions.exportForkBundle')}
            </button>
            <a
              href={forkInfo?.exists ? getRecipeForkDownloadUrl(slug) : undefined}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${forkInfo?.exists && !loading ? 'bg-surface text-text border border-outline-dim hover:border-primary hover:text-primary' : 'bg-surface text-text-dim border border-outline-dim opacity-40 pointer-events-none'}`}
            >
              {t('configWorkspace.actions.downloadBundle')}
            </a>
            <button
              disabled={!forkInfo?.exists || loading}
              onClick={() => setShowFullDiff((value) => !value)}
              className="px-4 py-2 bg-surface text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-default"
            >
              {showFullDiff ? t('configWorkspace.actions.hideFullDiff') : t('configWorkspace.actions.viewFullDiff')}
            </button>
            <button
              disabled={!manifestMarkdown || copyingMarkdown || loading}
              onClick={handleCopyMarkdown}
              className="px-4 py-2 bg-surface text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-default"
            >
              {copyingMarkdown ? t('configWorkspace.actions.copying') : t('configWorkspace.actions.copyPrSummary')}
            </button>
            <a
              href={forkInfo?.exists ? getRecipeForkManifestMarkdownDownloadUrl(slug) : undefined}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${forkInfo?.exists && !loading ? 'bg-surface text-text border border-outline-dim hover:border-primary hover:text-primary' : 'bg-surface text-text-dim border border-outline-dim opacity-40 pointer-events-none'}`}
            >
              {t('configWorkspace.actions.downloadMarkdownSummary')}
            </a>
            <button
              disabled={!canReset || resetting || loading}
              onClick={resetToDefault}
              className="px-4 py-2 bg-warning/10 text-warning border-none rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-warning/15 disabled:opacity-40 disabled:cursor-default"
            >
              {resetting ? t('configWorkspace.actions.restoring') : t('configWorkspace.actions.restoreDefault')}
            </button>
            <button
              disabled={!dirty || saving || loading}
              onClick={save}
              className="px-4 py-2 bg-primary text-white border-none rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-default"
            >
              {saving ? t('common.loading') : t('configWorkspace.actions.saveChanges')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-5 flex flex-col">
        {loading ? (
          <div className="h-full rounded-2xl bg-[#08080F] border border-outline-dim flex items-center justify-center text-sm text-text-dim">
            {t('configWorkspace.compose.loading')}
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
          {saved && <span className="text-success font-label">{t('configWorkspace.status.saved')}</span>}
          {dirty && !saved && <span className="text-warning font-label">{t('configWorkspace.status.unsavedChanges')}</span>}
          {!dirty && canReset && !saved && <span className="text-text-dim font-label">{t('configWorkspace.compose.customizedFile')}</span>}
          {forkActive && !dirty && !saved && <span className="text-primary font-label">{t('configWorkspace.status.forkOverlayActive')}</span>}
          {forkInfo?.exists && !forkActive && !dirty && !saved && <span className="text-text-dim font-label">{t('configWorkspace.status.forkSavedInactive')}</span>}
          {bundleInfo?.bundle_path && !saved && <span className="text-text-dim font-label">{t('configWorkspace.status.bundleReady')}</span>}
          {error && <span className="text-error font-label">{error}</span>}
        </div>

        {diffInfo?.summary && (
          <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-low/50 p-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('configWorkspace.diff.summaryTitle')}</div>
                <p className="text-sm text-text-dim mt-2 mb-0">
                  {t('configWorkspace.diff.summaryBody', { changed: diffInfo.summary.changed_files, total: diffInfo.summary.total_files })}
                </p>
              </div>
              <div className="text-xs text-text-dim font-label">
                {diffInfo.summary.active ? t('configWorkspace.diff.overlayActive') : t('configWorkspace.diff.overlayInactive')}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {diffInfo.files?.map((file) => (
                <div key={file.key} className="rounded-xl border border-outline-dim bg-[#08080F] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-text">{file.name}</div>
                    <span className={`text-[10px] uppercase tracking-[0.14em] font-label ${file.status === 'unchanged' ? 'text-success' : file.status === 'changed' ? 'text-warning' : 'text-text-dim'}`}>
                      {file.status}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-text-dim">
                    <div>{t('configWorkspace.diff.addedLines', { count: file.added_lines })}</div>
                    <div>{t('configWorkspace.diff.removedLines', { count: file.removed_lines })}</div>
                    <div>{t('configWorkspace.diff.changedLinePairs', { count: file.changed_lines })}</div>
                    <div>{file.registry_exists ? t('configWorkspace.diff.registryPresent') : t('configWorkspace.diff.noRegistryBaseline')}</div>
                    <div>{file.fork_exists ? t('configWorkspace.diff.forkPresent') : t('configWorkspace.diff.missingInFork')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showFullDiff && forkInfo?.exists && (
          <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-low/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('configWorkspace.diff.fullTitle')}</div>
                <p className="text-sm text-text-dim mt-2 mb-0">{t('configWorkspace.diff.fullDescription')}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-surface-high/70 p-1.5 border border-outline-dim">
                <button
                  onClick={() => setDiffMode('unified')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${diffMode === 'unified' ? 'bg-primary text-primary-on shadow-lg shadow-primary/20' : 'bg-transparent text-text-dim hover:bg-surface-highest hover:text-text'}`}
                >
                  {t('configWorkspace.diff.unified')}
                </button>
                <button
                  onClick={() => setDiffMode('side-by-side')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${diffMode === 'side-by-side' ? 'bg-primary text-primary-on shadow-lg shadow-primary/20' : 'bg-transparent text-text-dim hover:bg-surface-highest hover:text-text'}`}
                >
                  {t('configWorkspace.diff.sideBySide')}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {fullDiffInfo?.files?.map((file) => (
                <div key={file.key} className="rounded-xl border border-outline-dim bg-[#08080F] overflow-hidden">
                  <div className="px-4 py-3 border-b border-outline-dim flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleDiffFile(file.key)}
                        className="w-8 h-8 rounded-lg border border-outline-dim bg-surface text-text cursor-pointer hover:border-primary hover:text-primary transition-all"
                        aria-label={collapsedDiffFiles[file.key] ? t('configWorkspace.diff.expandFile', { name: file.name }) : t('configWorkspace.diff.collapseFile', { name: file.name })}
                      >
                        {collapsedDiffFiles[file.key] ? '+' : '−'}
                      </button>
                      <div className="text-sm font-semibold text-text">{file.name}</div>
                    </div>
                    <div className="text-xs text-text-dim font-label">{file.has_changes ? t('configWorkspace.diff.changed') : t('configWorkspace.diff.noChanges')}</div>
                  </div>
                  {!collapsedDiffFiles[file.key] && (
                    diffMode === 'unified' ? (
                      <div className="m-0 py-3 overflow-x-auto">
                        <div className="min-w-[920px] border-y border-outline-dim/60">
                          <div className="grid grid-cols-[64px_64px_minmax(0,1fr)] text-[11px] uppercase tracking-[0.14em] text-text-dim font-label border-b border-outline-dim bg-surface-low/60">
                            <div className="px-3 py-2 text-right border-r border-outline-dim/60">{t('configWorkspace.diff.old')}</div>
                            <div className="px-3 py-2 text-right border-r border-outline-dim/60">{t('configWorkspace.diff.new')}</div>
                            <div className="px-4 py-2">{t('configWorkspace.diff.patch')}</div>
                          </div>
                          {file.diff
                            ? buildDiffRenderItems(file.diff, file.key).map((item, index) => {
                                if (item.type === 'collapsed-context') {
                                  if (expandedDiffContexts[item.key]) {
                                    return item.hiddenRows.map((row, hiddenIndex) => (
                                      <DiffUnifiedRow key={`${item.key}-expanded-${hiddenIndex}`} row={row} />
                                    ))
                                  }
                                  return (
                                    <DiffCollapsedContext
                                      key={item.key}
                                      hiddenCount={item.hiddenRows.length}
                                      onExpand={() => expandDiffContext(item.key)}
                                    />
                                  )
                                }

                                return <DiffUnifiedRow key={`${file.key}-${index}`} row={item.row} />
                              })
                            : <div className="px-4 py-3 text-gray-400 text-[12px] leading-6 font-mono">{t('configWorkspace.diff.noTextualDiff')}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-[900px] grid grid-cols-2 border-t border-outline-dim text-[12px] leading-6 font-mono">
                          <div className="border-r border-outline-dim">
                            <div className="grid grid-cols-[64px_minmax(0,1fr)] text-[11px] uppercase tracking-[0.14em] text-text-dim font-label border-b border-outline-dim bg-surface-low/60">
                              <div className="px-3 py-2 text-right border-r border-outline-dim/60">{t('configWorkspace.diff.old')}</div>
                              <div className="px-4 py-2">{t('configWorkspace.diff.registry')}</div>
                            </div>
                          </div>
                          <div>
                            <div className="grid grid-cols-[64px_minmax(0,1fr)] text-[11px] uppercase tracking-[0.14em] text-text-dim font-label border-b border-outline-dim bg-surface-low/60">
                              <div className="px-3 py-2 text-right border-r border-outline-dim/60">{t('configWorkspace.diff.new')}</div>
                              <div className="px-4 py-2">{t('configWorkspace.diff.fork')}</div>
                            </div>
                          </div>
                          {file.diff
                            ? buildDiffRenderItems(file.diff, file.key).map((item, index) => {
                                if (item.type === 'collapsed-context') {
                                  if (expandedDiffContexts[item.key]) {
                                    return item.hiddenRows.map((row, hiddenIndex) => ([
                                      <div key={`${item.key}-left-expanded-${hiddenIndex}`} className="border-r border-outline-dim"><DiffSideCell line={row.left} tone={row.leftTone} lineNumber={row.leftLineNumber} /></div>,
                                      <div key={`${item.key}-right-expanded-${hiddenIndex}`}><DiffSideCell line={row.right} tone={row.rightTone} lineNumber={row.rightLineNumber} /></div>,
                                    ]))
                                  }

                                  return [
                                    <div key={`${item.key}-left`} className="border-r border-outline-dim">
                                      <DiffCollapsedContext hiddenCount={item.hiddenRows.length} onExpand={() => expandDiffContext(item.key)} compact />
                                    </div>,
                                    <div key={`${item.key}-right`}>
                                      <DiffCollapsedContext hiddenCount={item.hiddenRows.length} onExpand={() => expandDiffContext(item.key)} compact />
                                    </div>,
                                  ]
                                }

                                return [
                                  <div key={`${file.key}-left-${index}`} className="border-r border-outline-dim"><DiffSideCell line={item.row.left} tone={item.row.leftTone} lineNumber={item.row.leftLineNumber} /></div>,
                                  <div key={`${file.key}-right-${index}`}><DiffSideCell line={item.row.right} tone={item.row.rightTone} lineNumber={item.row.rightLineNumber} /></div>,
                                ]
                              })
                            : [
                                <div key={`${file.key}-left-empty`} className="border-r border-outline-dim"><DiffSideCell line={t('configWorkspace.diff.noTextualDiff')} tone="empty" /></div>,
                                <div key={`${file.key}-right-empty`}><DiffSideCell line={t('configWorkspace.diff.noTextualDiff')} tone="empty" /></div>,
                              ]}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ))}
              {!fullDiffInfo && (
                <div className="rounded-xl border border-outline-dim bg-[#08080F] p-4 text-sm text-text-dim">
                  {t('configWorkspace.diff.loadingFullDiff')}
                </div>
              )}
            </div>
          </div>
        )}

        {manifestMarkdown && (
          <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-low/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('configWorkspace.prSummary.title')}</div>
                <p className="text-sm text-text-dim mt-2 mb-0">{t('configWorkspace.prSummary.description')}</p>
              </div>
            </div>
            <pre className="mt-4 m-0 p-4 overflow-x-auto text-[12px] leading-6 text-gray-300 font-mono whitespace-pre-wrap break-words rounded-xl border border-outline-dim bg-[#08080F]">{manifestMarkdown}</pre>
          </div>
        )}
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
    labelKey: 'configWorkspace.envGroups.gateway.label',
    descriptionKey: 'configWorkspace.envGroups.gateway.description',
  },
  model: {
    labelKey: 'configWorkspace.envGroups.model.label',
    descriptionKey: 'configWorkspace.envGroups.model.description',
  },
  auth: {
    labelKey: 'configWorkspace.envGroups.auth.label',
    descriptionKey: 'configWorkspace.envGroups.auth.description',
  },
  ui: {
    labelKey: 'configWorkspace.envGroups.ui.label',
    descriptionKey: 'configWorkspace.envGroups.ui.description',
  },
  messaging: {
    labelKey: 'configWorkspace.envGroups.messaging.label',
    descriptionKey: 'configWorkspace.envGroups.messaging.description',
  },
  runtime: {
    labelKey: 'configWorkspace.envGroups.runtime.label',
    descriptionKey: 'configWorkspace.envGroups.runtime.description',
  },
  other: {
    labelKey: 'configWorkspace.envGroups.other.label',
    descriptionKey: 'configWorkspace.envGroups.other.description',
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
  const { t } = useTranslation()
  const getRecipeForkStatus = useStore((s) => s.getRecipeForkStatus)
  const [items, setItems] = useState([])
  const [originalContent, setOriginalContent] = useState('')
  const [defaultContent, setDefaultContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [envPath, setEnvPath] = useState(runtimeEnvPath || '')
  const [forkInfo, setForkInfo] = useState(null)

  const serializedContent = serializeEnvItems(items)
  const dirty = serializedContent !== originalContent
  const canReset = originalContent !== defaultContent || serializedContent !== defaultContent
  const groupedItems = groupEnvItems(items)
  const forkActive = Boolean(forkInfo?.exists && forkInfo?.active)

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
        if (!cancelled) setError(t('configWorkspace.errors.loadEnv'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [slug, runtimeEnvPath, t])

  const save = async () => {
    if (items.some((item) => item.type === 'entry' && !item.key.trim())) {
      setError(t('configWorkspace.errors.emptyVariableName'))
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
      setError(t('configWorkspace.errors.saveEnv'))
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async () => {
    if (!window.confirm(t('configWorkspace.confirmResetEnv'))) return
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
      setError(t('configWorkspace.errors.resetEnv'))
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
            <h2 className="text-sm font-bold text-text font-display m-0">{t('configWorkspace.env.title')}</h2>
            <p className="text-sm text-text-dim mt-1 mb-0 leading-relaxed">
              {t('configWorkspace.env.description')}
            </p>
            {envPath && <p className="text-xs text-text-dim mt-2 mb-0 font-mono break-all">{envPath}</p>}
            {forkActive && forkInfo?.fork_dir && (
              <p className="text-xs text-primary mt-2 mb-0 font-label">{t('configWorkspace.env.activeForkPath', { path: forkInfo.fork_dir })}</p>
            )}
            {forkInfo?.exists && !forkActive && forkInfo?.fork_dir && (
              <p className="text-xs text-text-dim mt-2 mb-0 font-label">{t('configWorkspace.env.inactiveForkPath', { path: forkInfo.fork_dir })}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={loading}
              onClick={addEntry}
              className="px-4 py-2 bg-surface text-text border border-outline-dim rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-default"
            >
              {t('configWorkspace.actions.addVariable')}
            </button>
            <button
              disabled={!canReset || resetting || loading}
              onClick={resetToDefault}
              className="px-4 py-2 bg-warning/10 text-warning border-none rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-warning/15 disabled:opacity-40 disabled:cursor-default"
            >
              {resetting ? t('configWorkspace.actions.restoring') : t('configWorkspace.actions.restoreDefault')}
            </button>
            <button
              disabled={!dirty || saving || loading}
              onClick={save}
              className="px-4 py-2 bg-primary text-white border-none rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-default"
            >
              {saving ? t('common.loading') : t('configWorkspace.actions.saveChanges')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col">
        {loading ? (
          <div className="h-56 rounded-2xl bg-[#08080F] border border-outline-dim flex items-center justify-center text-sm text-text-dim">
            {t('configWorkspace.env.loading')}
          </div>
        ) : (
          <div className="space-y-5">
            {groupedItems.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="px-1">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t(group.labelKey)}</div>
                  <p className="text-sm text-text-dim leading-6 m-0 mt-1">{t(group.descriptionKey)}</p>
                </div>

                {group.items.map((item) => (
                  item.type === 'entry' ? (
                    <div key={item.id} className="rounded-2xl border border-outline-dim bg-[#08080F] p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('configWorkspace.env.environmentVariable')}</div>
                          {item.comments?.length > 0 && (
                            <p className="text-sm text-text-dim leading-6 m-0 mt-2">{item.comments.join(' ')}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeEntry(item.id)}
                          className="px-3 py-1.5 bg-error-surface text-error border-none rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          {t('running.remove')}
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)]">
                        <label className="space-y-1.5">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label block">{t('configWorkspace.env.key')}</span>
                          <input
                            value={item.key}
                            onChange={(e) => updateEntry(item.id, 'key', e.target.value)}
                            spellCheck={false}
                            className="w-full bg-surface-high text-text font-mono text-[12px] leading-6 px-3 py-2.5 rounded-xl border border-outline-dim focus:outline-none focus:border-primary/50"
                            placeholder={t('configWorkspace.env.keyPlaceholder')}
                          />
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label block">{t('configWorkspace.env.value')}</span>
                          <input
                            value={item.value}
                            onChange={(e) => updateEntry(item.id, 'value', e.target.value)}
                            spellCheck={false}
                            className="w-full bg-surface-high text-text font-mono text-[12px] leading-6 px-3 py-2.5 rounded-xl border border-outline-dim focus:outline-none focus:border-primary/50"
                            placeholder={t('configWorkspace.env.valuePlaceholder')}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="rounded-2xl border border-outline-dim bg-[#08080F] p-4">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('configWorkspace.env.preservedRawBlock')}</div>
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
                {t('configWorkspace.env.noVariables')}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs min-h-[20px]">
          {saved && <span className="text-success font-label">{t('configWorkspace.status.saved')}</span>}
          {dirty && !saved && <span className="text-warning font-label">{t('configWorkspace.status.unsavedChanges')}</span>}
          {!dirty && canReset && !saved && <span className="text-text-dim font-label">{t('configWorkspace.env.customizedFile')}</span>}
          {forkActive && !dirty && !saved && <span className="text-primary font-label">{t('configWorkspace.status.forkOverlayActive')}</span>}
          {error && <span className="text-error font-label">{error}</span>}
        </div>
      </div>
    </div>
  )
}
