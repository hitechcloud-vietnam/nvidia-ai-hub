import { Suspense, lazy, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from './store'
import { useMetrics } from './hooks/useMetrics'
import { useRecipeMetrics } from './hooks/useRecipeMetrics'
import { resolveStaticAssetUrl } from './desktopRuntime'
import ThemeToggle from './components/ThemeToggle'
import HfTokenModal from './components/HfTokenModal'
import Catalog from './pages/Catalog'
import { SUPPORTED_LANGUAGES } from './i18n'

const Running = lazy(() => import('./pages/Running'))
const Models = lazy(() => import('./pages/Models'))
const System = lazy(() => import('./pages/System'))
const BackupRestore = lazy(() => import('./pages/BackupRestore'))
const RemoteTerminal = lazy(() => import('./pages/RemoteTerminal'))
const Updates = lazy(() => import('./pages/Updates'))
const RecipeDetail = lazy(() => import('./pages/RecipeDetail'))

export default function App() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('catalog')
  const [searchInput, setSearchInput] = useState('')
  const recipes = useStore((s) => s.recipes)
  const fetchRecipes = useStore((s) => s.fetchRecipes)
  const fetchRegistryStatus = useStore((s) => s.fetchRegistryStatus)
  const selectedRecipe = useStore((s) => s.selectedRecipe)
  const clearRecipe = useStore((s) => s.clearRecipe)
  const theme = useStore((s) => s.theme)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const featureFlags = useStore((s) => s.featureFlags)
  const fetchModelManagerAvailability = useStore((s) => s.fetchModelManagerAvailability)
  const metrics = useStore((s) => s.metrics)
  const registryStatus = useStore((s) => s.registryStatus)
  const [search, setSearch] = useState('')

  const navLabels = {
    catalog: t('nav.store'),
    models: t('nav.models'),
    running: t('nav.running'),
    system: t('nav.system'),
    terminal: t('nav.terminal'),
    'backup-restore': t('nav.backupRestore'),
    updates: t('nav.updates'),
    about: t('nav.about'),
  }

  const navSourceItems = [
    { id: 'catalog', icon: StorefrontIcon },
    { id: 'models', icon: ModelsIcon },
    { id: 'running', icon: PlayIcon },
    { id: 'terminal', icon: TerminalIcon },
    { id: 'backup-restore', icon: ArchiveIcon },
    { id: 'updates', icon: RefreshIcon },
    { id: 'about', icon: InfoIcon },
  ]

  const showModelManager = featureFlags?.modelManager === true
  const navItems = navSourceItems
    .map((item) => ({ ...item, label: navLabels[item.id] }))
    .filter((item) => item.id !== 'models' || showModelManager)
  const activeTab = tab === 'models' && !showModelManager ? 'catalog' : tab

  useMetrics()
  useRecipeMetrics()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput)
    }, 160)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchRecipes()
    fetchRegistryStatus()
    fetchModelManagerAvailability()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRecipes()
        fetchRegistryStatus()
        fetchModelManagerAvailability()
      }
    }, 10000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRecipes()
        fetchRegistryStatus()
        fetchModelManagerAvailability()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchModelManagerAvailability, fetchRecipes, fetchRegistryStatus])

  const runningCount = recipes.filter((r) => r.running || r.starting).length
  const updatesCount = recipes.filter((r) => r.registry_changed).length || registryStatus?.changed_recipe_slugs?.length || 0
  const brandMarkUrl = resolveStaticAssetUrl('/brand/spark-ai-hub-mark.svg')
  const openSystemPage = () => { clearRecipe(); setTab('system') }
  const ramUsagePct = getUsagePercent(metrics?.ram_used_gb, metrics?.ram_total_gb, metrics?.ram_percent)
  const diskUsagePct = getUsagePercent(metrics?.disk_used_gb, metrics?.disk_total_gb, metrics?.disk_percent)
  const systemTemp = Number(metrics?.gpu_temperature || metrics?.cpu_temperature || 0)
  const tempGaugeValue = Number.isFinite(systemTemp) ? Math.max(0, Math.min(systemTemp, 100)) : 0
  const tempGaugeLabel = systemTemp > 0 ? `${Math.round(systemTemp)}°` : '—'
  const systemGaugeActive = activeTab === 'system' && !selectedRecipe
  const openSystemLabel = t('system.openMonitor')
  const systemGaugeItems = [
    {
      id: 'gpu',
      value: clampPercent(metrics?.gpu_utilization ?? 0),
      label: t('system.gpu'),
      color: 'var(--tertiary)',
    },
    {
      id: 'ram',
      value: ramUsagePct,
      label: t('system.ram'),
      color: 'var(--primary)',
    },
    {
      id: 'disk',
      value: diskUsagePct,
      label: t('system.diskUsage'),
      color: diskUsagePct > 85 ? 'var(--warning)' : 'var(--tertiary)',
    },
    {
      id: 'temp',
      value: tempGaugeValue,
      label: t('system.temp'),
      color: systemTemp > 80 ? 'var(--error)' : '#FBBF24',
      displayValue: tempGaugeLabel,
      titleValue: systemTemp > 0 ? `${Math.round(systemTemp)}°C` : t('system.tempNotAvailable'),
    },
  ]

  return (
    <div className="bg-bg text-text flex h-screen overflow-hidden transition-colors duration-300">
      {/* ─── Sidebar ─── */}
      <aside className="w-18 shrink-0 bg-sidebar-bg flex flex-col items-center py-4 border-r border-outline-dim">
        {/* Logo */}
        <button
          onClick={() => { clearRecipe(); setTab('catalog') }}
          className="w-11 h-11 rounded-2xl bg-linear-to-br from-[#152608] to-[#0A1404] flex items-center justify-center border-none cursor-pointer shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow mb-6 p-1.5"
          title={t('appName')}
        >
          <img src={brandMarkUrl} alt={t('appName')} className="w-full h-full" />
        </button>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id && !selectedRecipe
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => { clearRecipe(); setTab(item.id) }}
                title={item.label}
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center border-none cursor-pointer sidebar-link ${
                  isActive ? 'active' : 'bg-transparent text-text-dim hover:text-text'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.id === 'running' && runningCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-primary text-primary-on text-[10px] font-bold font-label rounded-full flex items-center justify-center px-1">
                    {runningCount}
                  </span>
                )}
                {item.id === 'updates' && updatesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-warning text-warning-on text-[10px] font-bold font-label rounded-full flex items-center justify-center px-1">
                    {updatesCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: System gauges + Theme toggle */}
        <div className="flex flex-col items-center gap-3 mt-auto">
          <div className="flex flex-col items-center gap-1">
            {systemGaugeItems.map((item) => (
              <MiniGauge
                key={item.id}
                value={item.value}
                label={item.label}
                color={item.color}
                displayValue={item.displayValue}
                titleValue={item.titleValue}
                active={systemGaugeActive}
                openLabel={openSystemLabel}
                onClick={openSystemPage}
              />
            ))}
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="shrink-0 flex items-center justify-between px-6 py-3 bg-surface-low/60 backdrop-blur-md border-b border-outline-dim">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight font-display">{t('appName')}</span>
            <span className="text-[10px] text-text-dim font-medium font-label bg-surface-high px-2 py-0.5 rounded-md">{t('topbar.version', { value: 'v4.0.0' })}</span>
          </div>

          {!selectedRecipe && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder={t('topbar.searchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-72 py-2 pl-10 pr-4 bg-surface-high rounded-xl text-text text-sm outline-none border border-outline-dim focus:border-primary/40 focus:ring-2 focus:ring-primary/10 placeholder:text-text-dim transition-all"
                />
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-outline-dim bg-surface-high px-3 py-2 text-xs text-text-dim font-label">
                <GlobeIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('topbar.language')}</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="bg-transparent text-text outline-none border-none text-sm cursor-pointer"
                  aria-label={t('topbar.language')}
                >
                  {SUPPORTED_LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code}>{item.nativeLabel}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {selectedRecipe && (
            <div className="text-sm text-text-dim font-label">
              {metrics?.gpu_name || metrics?.hostname || t('topbar.systemFallback')}
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<PageSkeleton selectedRecipe={selectedRecipe} />}>
            {selectedRecipe ? (
              <RecipeDetail />
            ) : (
              <div className="animate-fadeIn">
                {activeTab === 'catalog' && <Catalog search={search} />}
                {activeTab === 'models' && showModelManager && <Models />}
                {activeTab === 'updates' && <Updates />}
                {activeTab === 'running' && <Running />}
                {activeTab === 'system' && <System />}
                {activeTab === 'terminal' && <RemoteTerminal />}
                {activeTab === 'backup-restore' && <BackupRestore />}
                {activeTab === 'about' && <About />}
              </div>
            )}
          </Suspense>
        </main>
      </div>
      <HfTokenModal />
    </div>
  )
}

function PageSkeleton({ selectedRecipe }) {
  return (
    <div className="p-6 animate-fadeIn">
      <div className="rounded-3xl border border-outline-dim bg-surface p-6">
        <div className="animate-pulse space-y-4">
          {selectedRecipe ? (
            <>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-surface-high" />
                <div className="flex-1 space-y-3">
                  <div className="h-7 w-56 rounded-xl bg-surface-high" />
                  <div className="h-4 w-40 rounded-xl bg-surface-high" />
                </div>
              </div>
              <div className="h-28 rounded-2xl bg-surface-high" />
              <div className="h-52 rounded-2xl bg-surface-high" />
            </>
          ) : (
            <>
              <div className="h-24 rounded-2xl bg-surface-high" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-32 rounded-2xl bg-surface-high" />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── About Page ─── */
function About() {
  const { t } = useTranslation()
  const registryStatus = useStore((s) => s.registryStatus)
  const syncingRegistry = useStore((s) => s.syncingRegistry)
  const syncRegistry = useStore((s) => s.syncRegistry)
  const featureFlags = useStore((s) => s.featureFlags)
  const modelManagerAvailable = useStore((s) => s.modelManagerAvailable)
  const setFeatureFlag = useStore((s) => s.setFeatureFlag)
  const brandMarkUrl = resolveStaticAssetUrl('/brand/spark-ai-hub-mark.svg')

  const handleSync = async () => {
    await syncRegistry()
  }

  return (
    <div className="px-6 py-6 pb-12 animate-fadeIn">
      <div className="flex items-center gap-4 mb-8">
        <img src={brandMarkUrl} alt={t('appName')} className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#152608] to-[#0A1404] p-2.5" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display m-0">{t('appName')}</h1>
          <p className="text-sm text-text-dim m-0 mt-1">{t('about.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-surface rounded-2xl p-5">
          <h3 className="font-semibold text-sm font-display m-0 mb-3">{t('about.aboutHeading')}</h3>
          <p className="text-sm text-text-muted m-0 leading-relaxed">
            {t('about.aboutBody')}
          </p>
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-semibold text-sm font-display m-0">{t('about.registry')}</h3>
            <button
              onClick={handleSync}
              disabled={syncingRegistry || registryStatus?.can_sync === false}
              className="px-4 py-2 bg-surface-high text-text border border-outline-dim rounded-xl text-xs font-semibold cursor-pointer hover:bg-surface-highest transition-all disabled:opacity-50"
            >
              {syncingRegistry ? t('about.syncing') : t('about.syncRecipes')}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label={t('about.branch')} value={registryStatus?.branch || '—'} />
            <InfoTile label={t('about.recipes')} value={typeof registryStatus?.recipe_count === 'number' ? String(registryStatus.recipe_count) : '—'} />
            <InfoTile label={t('about.commit')} value={registryStatus?.head || '—'} />
            <InfoTile label={t('about.workspace')} value={registryStatus?.dirty ? t('about.localChangesPresent') : t('about.clean')} />
            <InfoTile label={t('about.upstreamChanges')} value={typeof registryStatus?.behind === 'number' ? String(registryStatus.behind) : '0'} />
            <InfoTile label={t('about.changedRecipes')} value={Array.isArray(registryStatus?.changed_recipe_slugs) ? String(registryStatus.changed_recipe_slugs.length) : '0'} />
          </div>

          {(registryStatus?.head_subject || registryStatus?.last_updated) && (
            <div className="mt-4 text-sm text-text-muted leading-relaxed">
              {registryStatus?.head_subject ? <div><strong className="text-text">{t('about.latest')}:</strong> {registryStatus.head_subject}</div> : null}
              {registryStatus?.last_updated ? <div><strong className="text-text">{t('about.updated')}:</strong> {formatRegistryDate(registryStatus.last_updated)}</div> : null}
            </div>
          )}

          {registryStatus?.sync_error ? (
            <div className="mt-4 rounded-xl bg-warning/10 text-warning px-3 py-2 text-xs font-medium">
              {registryStatus.sync_error}
            </div>
          ) : null}

          {registryStatus?.sync_output ? (
            <pre className="mt-4 mb-0 rounded-xl bg-surface-high p-3 text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">{registryStatus.sync_output}</pre>
          ) : null}

          {Array.isArray(registryStatus?.changed_recipe_slugs) && registryStatus.changed_recipe_slugs.length > 0 ? (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label mb-2">{t('about.affectedRecipes')}</div>
              <div className="flex flex-wrap gap-2">
                {registryStatus.changed_recipe_slugs.slice(0, 16).map((slug) => (
                  <span key={slug} className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-label text-warning">
                    {slug}
                  </span>
                ))}
                {registryStatus.changed_recipe_slugs.length > 16 && (
                  <span className="rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-label text-text-dim">
                    {t('about.moreCount', { count: registryStatus.changed_recipe_slugs.length - 16 })}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <h3 className="font-semibold text-sm font-display m-0 mb-3">{t('about.featureVisibility')}</h3>
          <div className="rounded-2xl border border-outline-dim bg-surface-high/40 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text">{t('about.modelManager')}</div>
                <div className="mt-1 text-sm text-text-dim leading-6">
                  {t('about.modelManagerBody')}
                </div>
                <div className="mt-2 text-xs text-text-dim font-label">
                  {t('about.availabilityLabel', { status: modelManagerAvailable ? t('about.availabilityDetected') : t('about.availabilityMissing') })}
                </div>
                {!modelManagerAvailable ? (
                  <div className="mt-2 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
                    {t('about.modelManagerWarning')}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setFeatureFlag('modelManager', !(featureFlags?.modelManager === true))}
                className={`inline-flex min-w-24 items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${featureFlags?.modelManager === true ? 'border-success/20 bg-success/10 text-success' : 'border-outline-dim bg-surface text-text-dim'}`}
              >
                {featureFlags?.modelManager === true ? t('about.enabled') : t('about.disabled')}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <h3 className="font-semibold text-sm font-display m-0 mb-3">{t('about.links')}</h3>
          <div className="flex flex-col gap-2.5">
            <a
              href="https://github.com/hitechcloud-vietnam/nvidia-ai-hub"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-sm text-text hover:text-primary transition-colors no-underline"
            >
              <GitHubIcon className="w-5 h-5 text-text-dim" />
              <span>{t('about.githubRepository')}</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 text-text-dim ml-auto" />
            </a>
            <a
              href="https://github.com/hitechcloud-vietnam/nvidia-ai-hub/issues"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-sm text-text hover:text-primary transition-colors no-underline"
            >
              <BugIcon className="w-5 h-5 text-text-dim" />
              <span>{t('about.reportIssue')}</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 text-text-dim ml-auto" />
            </a>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <h3 className="font-semibold text-sm font-display m-0 mb-3">{t('about.madeBy')}</h3>
          <a
            href="https://github.com/hitechcloud-vietnam/nvidia-ai-hub"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-text-muted hover:text-primary transition-colors no-underline"
          >
            {t('about.madeByValue')}
          </a>
        </div>
      </div>
    </div>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl bg-surface-high px-3 py-3 border border-outline-dim/70">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="text-sm font-semibold text-text mt-1 break-all">{value}</div>
    </div>
  )
}

function formatRegistryDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function clampPercent(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.min(numericValue, 100))
}

function getUsagePercent(used, total, fallback) {
  if (fallback !== null && fallback !== undefined && fallback !== '') {
    const fallbackValue = Number(fallback)
    if (Number.isFinite(fallbackValue)) return clampPercent(fallbackValue)
  }

  const usedValue = Number(used)
  const totalValue = Number(total)
  if (!Number.isFinite(usedValue) || !Number.isFinite(totalValue) || totalValue <= 0) return 0
  return clampPercent((usedValue / totalValue) * 100)
}

/* ─── Mini Gauge for sidebar ─── */
function MiniGauge({ value, label, color, displayValue, titleValue, active, openLabel, onClick }) {
  const radius = 14
  const stroke = 3
  const circ = 2 * Math.PI * radius
  const pct = clampPercent(value)
  const offset = circ - (pct / 100) * circ
  const shownValue = displayValue ?? `${Math.round(pct)}%`
  const title = `${label}: ${titleValue ?? shownValue}`
  const actionLabel = openLabel || 'Open System Monitor'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`sidebar-link flex w-14 flex-col items-center rounded-2xl border-none bg-transparent px-1 py-1 text-text-dim cursor-pointer ${active ? 'active' : ''}`}
      title={`${actionLabel} — ${title}`}
      aria-label={`${actionLabel} — ${title}`}
    >
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--outline-dim)" strokeWidth={stroke} />
        <circle
          cx="18" cy="18" r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
          className="gauge-ring"
        />
        <text x="18" y="19" textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" fontSize="8" fontFamily="Space Grotesk" fontWeight="600">
          {shownValue}
        </text>
      </svg>
      <span className="text-[9px] text-current font-label mt-0.5 leading-none text-center">{label}</span>
    </button>
  )
}

function GlobeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  )
}

/* ─── Icons ─── */
function StorefrontIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function ModelsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
      <path d="M5 11v8c0 1.66 3.13 3 7 3s7-1.34 7-3v-8" />
    </svg>
  )
}

function TerminalIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7 9l3 3-3 3" />
      <path d="M13 15h4" />
    </svg>
  )
}

function RefreshIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function ArchiveIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1.5" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  )
}

function InfoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function GitHubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function BugIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3 3 0 0 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" />
      <path d="M6 13H2M22 13h-4M6 17H3M21 17h-3" />
    </svg>
  )
}

function ExternalLinkIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}
