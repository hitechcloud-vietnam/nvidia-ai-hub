import i18n from '../i18n'

export function isNotebookRecipe(recipe) {
  if (!recipe) return false

  const tags = Array.isArray(recipe.tags) ? recipe.tags : []
  const uiPath = recipe.ui?.path || ''

  return tags.includes('notebook') || uiPath.includes('/tree/notebooks')
}

export function getRecipeUrl(recipe) {
  if (!recipe) return ''

  const scheme = recipe.ui?.scheme || 'http'
  const port = recipe.ui?.port ?? 8080
  const path = recipe.ui?.path ?? '/'

  return `${scheme}://${location.hostname}:${port}${path}`
}

export function getRecipeSurfaceLabel(recipe) {
  return isNotebookRecipe(recipe) ? i18n.t('recipe.notebook') : i18n.t('recipe.webApp')
}

export function getRecipeOpenLabel(recipe) {
  return isNotebookRecipe(recipe) ? i18n.t('recipe.openNotebook') : i18n.t('recipe.open')
}

export function getRecipeOpenLabelWithArrow(recipe) {
  return `${getRecipeOpenLabel(recipe)} ↗`
}

export function getRecipeLaunchLabel(recipe) {
  return isNotebookRecipe(recipe) ? i18n.t('recipe.launchNotebook') : i18n.t('recipe.launch')
}

export function getRecipeFeaturedLabel(recipe) {
  if (recipe?.running || recipe?.starting) {
    return isNotebookRecipe(recipe) ? i18n.t('recipe.notebookActive') : i18n.t('recipe.nowRunning')
  }

  return isNotebookRecipe(recipe) ? i18n.t('recipe.featuredNotebook') : i18n.t('recipe.featured')
}
