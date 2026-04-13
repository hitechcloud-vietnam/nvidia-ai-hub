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
  return isNotebookRecipe(recipe) ? 'Notebook' : 'Web App'
}

export function getRecipeOpenLabel(recipe) {
  return isNotebookRecipe(recipe) ? 'Open Notebook' : 'Open'
}

export function getRecipeOpenLabelWithArrow(recipe) {
  return isNotebookRecipe(recipe) ? 'Open Notebook ↗' : 'Open ↗'
}

export function getRecipeLaunchLabel(recipe) {
  return isNotebookRecipe(recipe) ? 'Launch Notebook' : 'Launch'
}

export function getRecipeFeaturedLabel(recipe) {
  if (recipe?.running || recipe?.starting) {
    return isNotebookRecipe(recipe) ? 'Notebook Active' : 'Now Running'
  }

  return isNotebookRecipe(recipe) ? 'Featured Notebook' : 'Featured'
}
