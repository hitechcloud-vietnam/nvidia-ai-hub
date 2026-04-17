import { Suspense, lazy, useEffect, useState } from 'react'
import { useStore } from './store'
import { useMetrics } from './hooks/useMetrics'
import { useRecipeMetrics } from './hooks/useRecipeMetrics'
import ThemeToggle from './components/ThemeToggle'
import Catalog from './pages/Catalog'

const Running = lazy(() => import('./pages/Running'))
const Models = lazy(() => import('./pages/Models'))
const System = lazy(() => import('./pages/System'))
const Updates = lazy(() => import('./pages/Updates'))
const RecipeDetail = lazy(() => import('./pages/RecipeDetail'))

const NAV_ITEMS = [
  { id: 'catalog', label: 'Store', icon: StorefrontIcon },
  { id: 'models', label: 'Models', icon: ModelsIcon },
  { id: 'running', label: 'Running', icon: PlayIcon },
  { id: 'system', label: 'System', icon: GaugeIcon },
  { id: 'updates', label: 'Updates', icon: RefreshIcon },
  { id: 'about', label: 'About', icon: InfoIcon },
]

export default function App() {
  const [tab, setTab] = useState('catalog')
  const [searchInput, setSearchInput] = useState('')
  const recipes = useStore((s) => s.recipes)
  const fetchRecipes = useStore((s) => s.fetchRecipes)
  const fetchRegistryStatus = useStore((s) => s.fetchRegistryStatus)
  const selectedRecipe = useStore((s) => s.selectedRecipe)
  const clearRecipe = useStore((s) => s.clearRecipe)
  const theme = useStore((s) => s.theme)
  const metrics = useStore((s) => s.metrics)
  const registryStatus = useStore((s) => s.registryStatus)
  const [search, setSearch] = useState('')

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
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRecipes()
        fetchRegistryStatus()
      }
    }, 10000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRecipes()
        fetchRegistryStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchRecipes, fetchRegistryStatus])

  const runningCount = recipes.filter((r) => r.running || r.starting).length
  const updatesCount = recipes.filter((r) => r.registry_changed).length || registryStatus?.changed_recipe_slugs?.length || 0

  return (
    <div className="bg-bg text-text flex h-screen overflow-hidden transition-colors duration-300">
      {/* ─── Sidebar ─── */}
      <aside className="w-[72px] shrink-0 bg-sidebar-bg flex flex-col items-center py-4 border-r border-outline-dim">
        {/* Logo */}
        <button
          onClick={() => { clearRecipe(); setTab('catalog') }}
          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#152608] to-[#0A1404] flex items-center justify-center border-none cursor-pointer shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow mb-6 p-1.5"
          title="NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC"
        >
          <img src="/brand/spark-ai-hub-mark.svg" alt="NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC" className="w-full h-full" />
        </button>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = tab === item.id && !selectedRecipe
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
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-on text-[10px] font-bold font-label rounded-full flex items-center justify-center px-1">
                    {runningCount}
                  </span>
                )}
                {item.id === 'updates' && updatesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-warning text-warning-on text-[10px] font-bold font-label rounded-full flex items-center justify-center px-1">
                    {updatesCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: System gauges + Theme toggle */}
        <div className="flex flex-col items-center gap-3 mt-auto">
          {metrics && (
            <div className="flex flex-col items-center gap-1.5">
              <MiniGauge value={Math.round(metrics.cpu_percent ?? 0)} label="CPU" color="var(--tertiary)" />
              <MiniGauge value={metrics.ram_total_gb > 0 ? Math.round((metrics.ram_used_gb / metrics.ram_total_gb) * 100) : 0} label="RAM" color="var(--tertiary)" />
            </div>
          )}
          <ThemeToggle />
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="shrink-0 flex items-center justify-between px-6 py-3 bg-surface-low/60 backdrop-blur-md border-b border-outline-dim">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight font-display">NVIDIA AI Hub</span>
            <span className="text-[10px] text-text-dim font-medium font-label bg-surface-high px-2 py-0.5 rounded-md">v1.1</span>
          </div>

          {!selectedRecipe && (
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search apps..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-72 py-2 pl-10 pr-4 bg-surface-high rounded-xl text-text text-sm outline-none border border-outline-dim focus:border-primary/40 focus:ring-2 focus:ring-primary/10 placeholder:text-text-dim transition-all"
              />
            </div>
          )}

          {selectedRecipe && (
            <div className="text-sm text-text-dim font-label">
              {metrics?.gpu_name || metrics?.hostname || 'System'}
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
                {tab === 'catalog' && <Catalog search={search} />}
                {tab === 'models' && <Models />}
                {tab === 'updates' && <Updates />}
                {tab === 'running' && <Running />}
                {tab === 'system' && <System />}
                {tab === 'about' && <About />}
              </div>
            )}
          </Suspense>
        </main>
      </div>
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
  const registryStatus = useStore((s) => s.registryStatus)
  const syncingRegistry = useStore((s) => s.syncingRegistry)
  const syncRegistry = useStore((s) => s.syncRegistry)

  const handleSync = async () => {
    await syncRegistry()
  }

  return (
    <div className="px-6 py-6 pb-12 max-w-2xl mx-auto animate-fadeIn">
      <div className="flex items-center gap-4 mb-8">
        <img src="/brand/spark-ai-hub-mark.svg" alt="NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC" className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#152608] to-[#0A1404] p-2.5" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display m-0">NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC</h1>
          <p className="text-sm text-text-dim m-0 mt-1">One-click AI app launcher for NVIDIA NVIDIA GPUs</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-surface rounded-2xl p-5">
          <h3 className="font-semibold text-sm font-display m-0 mb-3">About</h3>
          <p className="text-sm text-text-muted m-0 leading-relaxed">
            NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC lets you install, run, and manage GPU-accelerated AI applications on your NVIDIA NVIDIA GPUs — all from a single web interface. No terminal required.
          </p>
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-semibold text-sm font-display m-0">Registry</h3>
            <button
              onClick={handleSync}
              disabled={syncingRegistry || registryStatus?.can_sync === false}
              className="px-4 py-2 bg-surface-high text-text border border-outline-dim rounded-xl text-xs font-semibold cursor-pointer hover:bg-surface-highest transition-all disabled:opacity-50"
            >
              {syncingRegistry ? 'Syncing...' : 'Sync recipes'}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Branch" value={registryStatus?.branch || '—'} />
            <InfoTile label="Recipes" value={typeof registryStatus?.recipe_count === 'number' ? String(registryStatus.recipe_count) : '—'} />
            <InfoTile label="Commit" value={registryStatus?.head || '—'} />
            <InfoTile label="Workspace" value={registryStatus?.dirty ? 'Local changes present' : 'Clean'} />
            <InfoTile label="Upstream changes" value={typeof registryStatus?.behind === 'number' ? String(registryStatus.behind) : '0'} />
            <InfoTile label="Changed recipes" value={Array.isArray(registryStatus?.changed_recipe_slugs) ? String(registryStatus.changed_recipe_slugs.length) : '0'} />
          </div>

          {(registryStatus?.head_subject || registryStatus?.last_updated) && (
            <div className="mt-4 text-sm text-text-muted leading-relaxed">
              {registryStatus?.head_subject ? <div><strong className="text-text">Latest:</strong> {registryStatus.head_subject}</div> : null}
              {registryStatus?.last_updated ? <div><strong className="text-text">Updated:</strong> {formatRegistryDate(registryStatus.last_updated)}</div> : null}
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
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label mb-2">Affected recipes</div>
              <div className="flex flex-wrap gap-2">
                {registryStatus.changed_recipe_slugs.slice(0, 16).map((slug) => (
                  <span key={slug} className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-label text-warning">
                    {slug}
                  </span>
                ))}
                {registryStatus.changed_recipe_slugs.length > 16 && (
                  <span className="rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-label text-text-dim">
                    +{registryStatus.changed_recipe_slugs.length - 16} more
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <h3 className="font-semibold text-sm font-display m-0 mb-3">Links</h3>
          <div className="flex flex-col gap-2.5">
            <a
              href="https://github.com/hitechcloud-vietnam/nvidia-ai-hub"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-sm text-text hover:text-primary transition-colors no-underline"
            >
              <GitHubIcon className="w-5 h-5 text-text-dim" />
              <span>GitHub Repository</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 text-text-dim ml-auto" />
            </a>
            <a
              href="https://github.com/hitechcloud-vietnam/nvidia-ai-hub/issues"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-sm text-text hover:text-primary transition-colors no-underline"
            >
              <BugIcon className="w-5 h-5 text-text-dim" />
              <span>Report an Issue</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 text-text-dim ml-auto" />
            </a>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5">
          <h3 className="font-semibold text-sm font-display m-0 mb-3">Made by</h3>
          <a
            href="https://github.com/hitechcloud-vietnam/nvidia-ai-hub"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-text-muted hover:text-primary transition-colors no-underline"
          >
            HiTechCloud by Pho Tue Software Solutions JSC
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

/* ─── Mini Gauge for sidebar ─── */
function MiniGauge({ value, label, color }) {
  const radius = 14
  const stroke = 3
  const circ = 2 * Math.PI * radius
  const offset = circ - (value / 100) * circ

  return (
    <div className="flex flex-col items-center" title={`${label}: ${value}%`}>
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
          {value}%
        </text>
      </svg>
      <span className="text-[9px] text-text-dim font-label mt-0.5">{label}</span>
    </div>
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

function GaugeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
      <path d="M12 6v6l4 2" />
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
