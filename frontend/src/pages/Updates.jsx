import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useThemedLogo } from '../hooks/useThemedLogo'
import { getRecipeLaunchLabel, getRecipeOpenLabel, getRecipeSurfaceLabel, getRecipeUrl } from '../utils/recipePresentation'

export default function Updates() {
  const { t } = useTranslation()
  const recipes = useStore((s) => s.recipes)
  const selectRecipe = useStore((s) => s.selectRecipe)
  const updateRecipe = useStore((s) => s.updateRecipe)
  const launchRecipe = useStore((s) => s.launchRecipe)
  const updating = useStore((s) => s.updating)
  const registryStatus = useStore((s) => s.registryStatus)

  const [launchingSlug, setLaunchingSlug] = useState(null)

  const recipesWithUpdates = useMemo(
    () => [...recipes]
      .filter((recipe) => recipe.registry_changed)
      .sort((a, b) => {
        const installedDiff = Number(Boolean(b.installed)) - Number(Boolean(a.installed))
        if (installedDiff !== 0) return installedDiff
        const countDiff = Number(b.registry_update_count || 0) - Number(a.registry_update_count || 0)
        if (countDiff !== 0) return countDiff
        return a.name.localeCompare(b.name)
      }),
    [recipes],
  )

  const handleLaunch = async (slug) => {
    setLaunchingSlug(slug)
    await launchRecipe(slug)
    setLaunchingSlug(null)
  }

  return (
    <div className="px-6 py-6 pb-12 animate-fadeIn">
      <div className="rounded-3xl border border-warning/20 bg-warning/5 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-warning font-label">{t('updates.eyebrow')}</div>
            <h1 className="m-0 mt-2 text-2xl font-bold tracking-tight text-text font-display">{t('updates.title')}</h1>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-text-dim">
              {t('updates.subtitle')}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label={t('updates.changedRecipes')} value={String(recipesWithUpdates.length)} />
            <InfoTile label={t('updates.upstreamCommits')} value={String(registryStatus?.behind ?? 0)} />
          </div>
        </div>
      </div>

      {recipesWithUpdates.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-outline-dim bg-surface p-10 text-center text-text-dim">
          <div className="text-4xl">✅</div>
          <div className="mt-3 text-lg font-semibold text-text font-display">{t('updates.upToDateTitle')}</div>
          <div className="mt-1 text-sm">{t('updates.upToDateBody')}</div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {recipesWithUpdates.map((recipe) => (
            <UpdateCard
              key={recipe.slug}
              recipe={recipe}
              onSelect={selectRecipe}
              onUpdate={updateRecipe}
              onLaunch={handleLaunch}
              updating={updating === recipe.slug}
              launching={launchingSlug === recipe.slug}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UpdateCard({ recipe, onSelect, onUpdate, onLaunch, updating, launching }) {
  const { t } = useTranslation()
  const [logoFailed, setLogoFailed] = useState(false)
  const logoUrl = useThemedLogo(recipe.logo)
  const recentUpdates = Array.isArray(recipe.registry_updates) ? recipe.registry_updates.slice(0, 3) : []

  return (
    <div
      onClick={() => onSelect(recipe.slug)}
      className="rounded-3xl border border-outline-dim bg-surface p-5 cursor-pointer transition-all hover:border-warning/30 hover:shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
    >
      <div className="flex items-start gap-4">
        {logoUrl && !logoFailed ? (
          <img src={logoUrl} alt={recipe.name} className="h-14 w-14 rounded-2xl bg-surface-high object-contain p-2 shrink-0" onError={() => setLogoFailed(true)} />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-high text-2xl">{recipe.icon || '◻'}</div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 truncate text-lg font-bold tracking-tight text-text font-display">{recipe.name}</h2>
            {recipe.installed ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-label text-primary">{t('updates.installed')}</span>
            ) : (
              <span className="rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-label text-text-dim">{t('updates.catalogOnly')}</span>
            )}
            <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-label text-warning">
              {t('updates.changes', { count: recipe.registry_update_count || recentUpdates.length || 1 })}
            </span>
          </div>
          <p className="m-0 mt-1 text-sm text-text-dim leading-6 line-clamp-2">{recipe.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-label text-text-dim">
              {getRecipeSurfaceLabel(recipe)}
            </span>
            {recipe.ui?.port && (
              <span className="rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-label text-text-dim">
                Port {recipe.ui.port}
              </span>
            )}
            {recipe.running && recipe.ready && (
              <a
                href={getRecipeUrl(recipe)}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-label text-success no-underline"
              >
                {getRecipeOpenLabel(recipe)}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-high/40 p-4">
        <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('updates.recentChangelog')}</div>
        {recentUpdates.length === 0 ? (
          <div className="mt-2 text-sm text-text-dim">{t('updates.noSummary')}</div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {recentUpdates.map((entry) => (
              <div key={`${recipe.slug}-${entry.sha}`} className="rounded-2xl bg-surface px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 text-[11px] text-text-dim font-label">
                  <span>{entry.sha?.slice(0, 7) || t('updates.commit')}</span>
                  <span>{entry.date || t('updates.unknownDate')}</span>
                </div>
                <div className="mt-1 text-sm font-medium text-text">{entry.subject || t('updates.recipeUpdate')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSelect(recipe.slug)
          }}
          className="rounded-xl border border-outline-dim bg-surface-high/60 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high"
        >
          {t('updates.viewDetails')}
        </button>
        {recipe.installed && (
          <button
            type="button"
            disabled={updating}
            onClick={(event) => {
              event.stopPropagation()
              onUpdate(recipe.slug)
            }}
            className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {updating ? t('updates.updating') : t('updates.updateNow')}
          </button>
        )}
        {recipe.installed && !recipe.running && !recipe.starting && (
          <button
            type="button"
            disabled={launching || updating}
            onClick={(event) => {
              event.stopPropagation()
              onLaunch(recipe.slug)
            }}
            className="rounded-xl border border-outline-dim bg-surface-high/60 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50"
          >
            {launching ? t('updates.launching') : getRecipeLaunchLabel(recipe)}
          </button>
        )}
      </div>
    </div>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-outline-dim bg-surface/70 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="mt-1 text-lg font-bold text-text font-display">{value}</div>
    </div>
  )
}