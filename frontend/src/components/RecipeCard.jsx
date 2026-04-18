import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useThemedLogo } from '../hooks/useThemedLogo'
import { getRecipeOpenLabel, getRecipeSurfaceLabel, getRecipeUrl, isNotebookRecipe } from '../utils/recipePresentation'
import { getRecipeHardwareFit } from '../utils/hardwareFit'

export default function RecipeCard({ recipe }) {
  const { t } = useTranslation()
  const selectRecipe = useStore((s) => s.selectRecipe)
  const installing = useStore((s) => s.installing)
  const updating = useStore((s) => s.updating)
  const installRecipe = useStore((s) => s.installRecipe)
  const updateRecipe = useStore((s) => s.updateRecipe)
  const metrics = useStore((s) => s.metrics)
  const [logoFailed, setLogoFailed] = useState(false)

  const logoUrl = useThemedLogo(recipe.logo)
  const isBuilding = installing === recipe.slug
  const isUpdating = updating === recipe.slug
  const isBusy = isBuilding || isUpdating
  const isNotebook = isNotebookRecipe(recipe)
  const hardwareFit = getRecipeHardwareFit(recipe, metrics)
  const registryChanged = Boolean(recipe.registry_changed)
  const updateCount = Number(recipe.registry_update_count || 0)
  const community = recipe.community || {}
  const hasCommunitySignal = (community.verified_count || 0) > 0 || (community.rating_count || 0) > 0

  const handleInstall = (e) => {
    e.stopPropagation()
    installRecipe(recipe.slug)
  }

  const recipeCategories = Array.isArray(recipe.categories) && recipe.categories.length > 0
    ? recipe.categories
    : [recipe.category]

  return (
    <div
      onClick={() => selectRecipe(recipe.slug)}
      className="relative overflow-hidden rounded-xl border border-outline-dim bg-surface/90 p-3.5 card-hover cursor-pointer group shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      {/* Running indicator - top border */}
      {recipe.running && (
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${
          recipe.ready
            ? 'bg-primary'
            : 'bg-warning animate-pulse'
        }`} />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        {logoUrl && !logoFailed ? (
          <img
            src={logoUrl}
            alt={recipe.name}
            className="h-12 w-12 rounded-lg object-contain border border-outline-dim bg-surface-high p-1.5 shrink-0 transition-transform group-hover:scale-105"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-outline-dim bg-surface-high text-xl shrink-0 transition-transform group-hover:scale-105">
            {recipe.icon || '◻'}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="m-0 truncate font-display text-[13px] font-semibold leading-5 text-text">
            {recipe.name}
          </h3>
          <p className="m-0 mt-0.5 text-[10px] uppercase tracking-[0.14em] text-text-dim font-label">{recipe.author}</p>
          <p className="m-0 mt-1 text-[11px] leading-4 text-text-muted line-clamp-2">{recipe.description}</p>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-label ${
              isNotebook ? 'text-primary bg-primary/10' : 'text-text-dim bg-surface-high'
            }`}>
              {getRecipeSurfaceLabel(recipe)}
            </span>
            <HardwareFitPill fit={hardwareFit} />
            {recipeCategories.slice(0, 2).map((cat) => (
              <span key={cat} className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-label text-secondary">
                {cat}
              </span>
            ))}
            {!recipe.docker?.gpu && (
              <span className="rounded-full bg-surface-high px-2 py-0.5 text-[10px] font-label text-text-dim">{t('recipeCard.cpu')}</span>
            )}
            {registryChanged && recipe.installed && !recipe.running && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-label text-warning">
                {t('recipeCard.registryChanged')}{updateCount > 0 ? ` · ${updateCount}` : ''}
              </span>
            )}
            {hasCommunitySignal && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-label text-primary">
                {(community.verified_count || 0) > 0
                  ? t('recipeCard.verifiedCount', { count: community.verified_count })
                  : t('recipeCard.communityRating', { rating: Number(community.rating_average || 0).toFixed(1) })}
              </span>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="mt-0.5 flex shrink-0 flex-col items-end gap-1.5">
          {isBuilding && (
            <span className="text-primary text-xs font-medium font-label animate-pulse">
              <span className="inline-block animate-spin">⟳</span> {t('recipeCard.building')}
            </span>
          )}
          {isUpdating && (
            <span className="text-primary text-xs font-medium font-label animate-pulse">
              <span className="inline-block animate-spin">⟳</span> {t('recipeCard.updating')}
            </span>
          )}
          {!isBusy && recipe.running && recipe.ready && (
            <a
              href={getRecipeUrl(recipe)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-secondary rounded-lg px-3 py-1.5 text-[11px] font-semibold no-underline"
            >
              {getRecipeOpenLabel(recipe)}
            </a>
          )}
          {!isBusy && recipe.starting && (
            <span className="text-warning text-[11px] font-medium font-label animate-pulse">{t('recipeCard.starting')}</span>
          )}
          {!isBusy && !recipe.running && !recipe.installed && (
            <button onClick={handleInstall} className="btn-primary rounded-lg px-3 py-1.5 text-[11px] font-semibold">
              {t('recipeCard.install')}
            </button>
          )}
          {!isBusy && !recipe.running && !recipe.starting && recipe.installed && (
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-lg bg-surface-high px-2.5 py-1 text-[10px] font-label text-text-dim">{t('recipeCard.stopped')}</span>
              {registryChanged && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateRecipe(recipe.slug)
                  }}
                  className="rounded-lg bg-warning/10 px-2.5 py-1 text-[10px] font-semibold text-warning border-none cursor-pointer hover:bg-warning/15"
                >
                  {t('recipeCard.updateAvailable')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HardwareFitPill({ fit }) {
  const { t } = useTranslation()
  const toneMap = {
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    error: 'text-error bg-error-surface',
    dim: 'text-text-dim bg-surface-high',
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-label ${toneMap[fit.tone] || toneMap.dim}`} title={fit.headline}>
      {t('common.hostLabel', { label: fit.label })}
    </span>
  )
}
