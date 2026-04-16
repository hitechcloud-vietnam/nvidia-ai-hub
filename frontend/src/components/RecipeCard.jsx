import { useState } from 'react'
import { useStore } from '../store'
import { useThemedLogo } from '../hooks/useThemedLogo'
import { getRecipeOpenLabel, getRecipeSurfaceLabel, getRecipeUrl, isNotebookRecipe } from '../utils/recipePresentation'
import { getRecipeHardwareFit } from '../utils/hardwareFit'

export default function RecipeCard({ recipe }) {
  const selectRecipe = useStore((s) => s.selectRecipe)
  const installing = useStore((s) => s.installing)
  const updating = useStore((s) => s.updating)
  const installRecipe = useStore((s) => s.installRecipe)
  const metrics = useStore((s) => s.metrics)
  const [logoFailed, setLogoFailed] = useState(false)

  const logoUrl = useThemedLogo(recipe.logo)
  const isBuilding = installing === recipe.slug
  const isUpdating = updating === recipe.slug
  const isBusy = isBuilding || isUpdating
  const isNotebook = isNotebookRecipe(recipe)
  const hardwareFit = getRecipeHardwareFit(recipe, metrics)

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
      className="relative overflow-hidden bg-surface rounded-2xl p-4 card-hover cursor-pointer group"
    >
      {/* Running indicator - top border */}
      {recipe.running && (
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${
          recipe.ready
            ? 'bg-primary'
            : 'bg-warning animate-pulse'
        }`} />
      )}

      <div className="flex items-start gap-3.5">
        {/* Icon */}
        {logoUrl && !logoFailed ? (
          <img
            src={logoUrl}
            alt={recipe.name}
            className="w-14 h-14 rounded-xl object-contain bg-surface-high p-2 shrink-0 transition-transform group-hover:scale-105"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-surface-high flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-105">
            {recipe.icon || '◻'}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-text leading-tight truncate m-0 font-display">
            {recipe.name}
          </h3>
          <p className="text-[11px] text-text-dim mt-0.5 m-0">{recipe.author}</p>
          <p className="text-xs text-text-muted mt-1.5 m-0 line-clamp-1">{recipe.description}</p>

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-[10px] font-label px-2 py-0.5 rounded-full ${
              isNotebook ? 'text-primary bg-primary/10' : 'text-text-dim bg-surface-high'
            }`}>
              {getRecipeSurfaceLabel(recipe)}
            </span>
            <HardwareFitPill fit={hardwareFit} />
            {recipeCategories.slice(0, 2).map((cat) => (
              <span key={cat} className="text-[10px] font-label text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                {cat}
              </span>
            ))}
            {!recipe.docker?.gpu && (
              <span className="text-[10px] font-label text-text-dim bg-surface-high px-2 py-0.5 rounded-full">CPU</span>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 flex flex-col items-end gap-1.5 mt-1">
          {isBuilding && (
            <span className="text-primary text-xs font-medium font-label animate-pulse">
              <span className="inline-block animate-spin">⟳</span> Building
            </span>
          )}
          {isUpdating && (
            <span className="text-primary text-xs font-medium font-label animate-pulse">
              <span className="inline-block animate-spin">⟳</span> Updating
            </span>
          )}
          {!isBusy && recipe.running && recipe.ready && (
            <a
              href={getRecipeUrl(recipe)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-secondary px-3.5 py-1.5 text-[11px] font-semibold no-underline"
            >
              {getRecipeOpenLabel(recipe)}
            </a>
          )}
          {!isBusy && recipe.starting && (
            <span className="text-warning text-[11px] font-medium font-label animate-pulse">Starting...</span>
          )}
          {!isBusy && !recipe.running && !recipe.installed && (
            <button onClick={handleInstall} className="btn-primary px-3.5 py-1.5 text-[11px] font-semibold">
              Install
            </button>
          )}
          {!isBusy && !recipe.running && !recipe.starting && recipe.installed && (
            <span className="text-text-dim text-[11px] font-label bg-surface-high px-2.5 py-1 rounded-lg">Stopped</span>
          )}
        </div>
      </div>
    </div>
  )
}

function HardwareFitPill({ fit }) {
  const toneMap = {
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    error: 'text-error bg-error-surface',
    dim: 'text-text-dim bg-surface-high',
  }

  return (
    <span className={`text-[10px] font-label px-2 py-0.5 rounded-full ${toneMap[fit.tone] || toneMap.dim}`} title={fit.headline}>
      Host {fit.label}
    </span>
  )
}
