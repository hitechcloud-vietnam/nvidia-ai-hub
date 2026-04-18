import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import RecipeCard from '../components/RecipeCard'
import { getRecipeFeaturedLabel, getRecipeOpenLabelWithArrow, getRecipeSurfaceLabel, getRecipeUrl, isNotebookRecipe } from '../utils/recipePresentation'
import { getRecipeHardwareFit } from '../utils/hardwareFit'

const BANNER_ROTATION_INTERVAL_MS = 3000
const BANNER_STORAGE_KEY = 'nvidia-ai-hub-active-banner-slug'
const BANNER_PREVIOUS_STORAGE_KEY = 'nvidia-ai-hub-previous-banner-slug'

const BANNERS = {
  'minicpm-o':            { img: '/banners/wide/minicpm-voice-orbit.svg', layout: 'wide' },
  'voicebox':             { img: '/banners/wide/voice-lab-wave.svg', layout: 'wide' },
  'chatterbox-turbo':     { img: '/banners/wide/voice-lab-wave.svg', layout: 'wide' },
  'live-vlm-webui':       { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
  'openclaw':             { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
  'nemoclaw':             { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
  'multi-agent-chatbot':  { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
  'imagebind':            { img: '/banners/wide/multi-modal-spectrum.svg', layout: 'wide' },
  'segment-anything':     { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
  'grounded-sam':         { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
  'ocr-captioning':       { img: '/banners/wide/florence-frame-atlas.svg', layout: 'wide' },
  'vllm-minicpm-':        { img: '/banners/wide/minicpm-voice-orbit.svg', layout: 'wide' },
  'vllm-qwen35-08b':      { img: '/banners/wide/qwen-beach.png', layout: 'wide' },
  'vllm-qwen35-2b':       { img: '/banners/wide/qwen-beach.png', layout: 'wide' },
  'vllm-qwen35-4b':       { img: '/banners/wide/qwen-basketball.png', layout: 'wide' },
  'vllm-qwen35-9b':       { img: '/banners/wide/qwen-driving.png', layout: 'wide' },
  'vllm-qwen3.5-27b':     { img: '/banners/wide/qwen-driving.png', layout: 'wide' },
  'vllm-qwen35-27b-int4': { img: '/banners/wide/qwen-driving.png', layout: 'wide' },
  'vllm-qwen35-35b-a3b':  { img: '/banners/wide/qwen-coder.png', layout: 'wide' },
  'vllm-qwen35-122b-a10b':{ img: '/banners/wide/qwen-coder.png', layout: 'wide' },
  'vllm-qwen25-vl-':      { img: '/banners/wide/qwen-driving.png', layout: 'wide' },
  'vllm-internvl25-':     { img: '/banners/wide/internvl-canvas-array.svg', layout: 'wide' },
  'vllm-florence2-':      { img: '/banners/wide/florence-frame-atlas.svg', layout: 'wide' },
  'kosmos-':              { img: '/banners/wide/florence-frame-atlas.svg', layout: 'wide' },
  'vllm-gemma4-e2b':      { img: '/banners/wide/gemma-small.webp', layout: 'wide' },
  'vllm-gemma4-e4b':      { img: '/banners/wide/gemma-small.webp', layout: 'wide' },
  'vllm-gemma4-e4b-fp8':  { img: '/banners/wide/gemma-small.webp', layout: 'wide' },
  'vllm-gemma4-26b-a4b':  { img: '/banners/wide/gemma-large.webp', layout: 'wide' },
  'vllm-gemma4-26b-a4b-fp8': { img: '/banners/wide/gemma-large.webp', layout: 'wide' },
  'vllm-gemma4-31b':      { img: '/banners/wide/gemma-large.webp', layout: 'wide' },
  'vllm-gemma4-31b-fp8':  { img: '/banners/wide/gemma-large.webp', layout: 'wide' },
  'vllm-phi4-':           { img: '/banners/wide/phi-prism-arc.svg', layout: 'wide' },
  'vllm-phi35-':          { img: '/banners/wide/phi-prism-arc.svg', layout: 'wide' },
  'vllm-gpt-oss-':        { img: '/banners/wide/gptoss-forge-grid.svg', layout: 'wide' },
  'vllm-seed-oss-':       { img: '/banners/wide/seed-crystal-mesh.svg', layout: 'wide' },
  'vllm-nemotron':        { img: '/banners/wide/nemotron-nebula-core.svg', layout: 'wide' },
  'vllm-llama':           { img: '/banners/wide/llama-aurora-lattice.svg', layout: 'wide' },
  'vllm-deepseek-':       { img: '/banners/wide/deepseek-orbit-matrix.svg', layout: 'wide' },
  'vllm-aya-':            { img: '/banners/wide/cohere-lingua-orbit.svg', layout: 'wide' },
  'vllm-command-':        { img: '/banners/wide/cohere-lingua-orbit.svg', layout: 'wide' },
  'vllm-glm45':           { img: '/banners/wide/glm-signal-weave.svg', layout: 'wide' },
  'vllm-granite31-':      { img: '/banners/wide/granite-foundry-stack.svg', layout: 'wide' },
  'vllm-mistral':         { img: '/banners/wide/mistral-monsoon-flow.svg', layout: 'wide' },
  'vllm-ministral':       { img: '/banners/wide/mistral-monsoon-flow.svg', layout: 'wide' },
  'vllm-mixtral':         { img: '/banners/wide/mistral-monsoon-flow.svg', layout: 'wide' },
  'vllm-pixtral-':        { img: '/banners/wide/mistral-monsoon-flow.svg', layout: 'wide' },
  'vllm-molmo-':          { img: '/banners/wide/molmo-focus-stack.svg', layout: 'wide' },
  'vllm-smollm3':         { img: '/banners/wide/smollm-pocket-pulse.svg', layout: 'wide' },
  'ollama-openwebui':      { img: '/banners/wide/ollama-openwebui.png', layout: 'wide' },
  'comfyui':               { img: '/banners/wide/comfyui-spark.jpg', layout: 'wide' },
  'facefusion':            { img: '/banners/wide/facefusion-spark.png', layout: 'wide' },
  'hunyuan3d':             { img: '/banners/wide/hunyuan3d-spark.png', layout: 'wide' },
  'trellis2':              { img: '/banners/wide/trellis2-spark.png', layout: 'wide' },
  'anythingllm':           { img: '/banners/wide/anythingllm.png', layout: 'wide' },
  'flowise':               { img: '/banners/wide/flowise.png', layout: 'wide' },
  'langflow':              { img: '/banners/wide/langflow.png', layout: 'wide' },
  'localai':               { img: '/banners/wide/localai.png', layout: 'wide' }

}

function getBanner(slug) {
  if (BANNERS[slug]) return BANNERS[slug]
  for (const [prefix, conf] of Object.entries(BANNERS)) {
    if (slug.startsWith(prefix)) return conf
  }
  return null
}

const CATEGORIES = [
  { id: 'all', labelKey: 'catalog.categoryLabels.all', icon: 'grid' },
  { id: 'dgx-spark', labelKey: 'catalog.categoryLabels.dgxSpark', icon: 'spark' },
  { id: 'llm', labelKey: 'catalog.categoryLabels.llm', icon: 'brain' },
  { id: 'vllm', labelKey: 'catalog.categoryLabels.vllm', icon: 'server' },
  { id: 'image-gen', labelKey: 'catalog.categoryLabels.imageGen', icon: 'image' },
  { id: 'video-gen', labelKey: 'catalog.categoryLabels.videoGen', icon: 'video' },
  { id: '3d-gen', labelKey: 'catalog.categoryLabels.threeDGen', icon: 'cube' },
  { id: 'multi-modal', labelKey: 'catalog.categoryLabels.multiModal', icon: 'multimodal' },
  { id: 'vision-language', labelKey: 'catalog.categoryLabels.visionLanguage', icon: 'eye' },
  { id: 'image-understanding', labelKey: 'catalog.categoryLabels.imageUnderstanding', icon: 'scan' },
  { id: 'reasoning', labelKey: 'catalog.categoryLabels.reasoning', icon: 'reasoning' },
  { id: 'code-gen', labelKey: 'catalog.categoryLabels.codeGen', icon: 'code' },
  { id: 'speech', labelKey: 'catalog.categoryLabels.speech', icon: 'mic' },
  { id: 'rag', labelKey: 'catalog.categoryLabels.rag', icon: 'database' },
  { id: 'nemoclaw', labelKey: 'catalog.categoryLabels.nemoclaw', icon: 'shield' },
]

const CATALOG_SECTIONS = [
  {
    id: 'multi-modal',
    labelKey: 'catalog.sectionLabels.multiModal',
    subtitleKey: 'catalog.sectionSubtitles.multiModal',
    icon: 'multimodal',
    match: (_recipe, categories) => categories.includes('multi-modal'),
  },
  {
    id: 'vllm',
    labelKey: 'catalog.sectionLabels.vllm',
    subtitleKey: 'catalog.sectionSubtitles.vllm',
    icon: 'models',
    match: (_recipe, categories) => categories.includes('vllm'),
  },
  {
    id: 'nvidia-ai-hub',
    labelKey: 'catalog.sectionLabels.sparkOptimized',
    subtitleKey: 'catalog.sectionSubtitles.sparkOptimized',
    icon: 'spark',
    match: (recipe) => (recipe.source || 'community') === 'nvidia-ai-hub',
  },
  {
    id: 'official',
    labelKey: 'catalog.sectionLabels.officialApps',
    subtitleKey: 'catalog.sectionSubtitles.officialApps',
    icon: 'official',
    match: () => true,
  },
]

const CATALOG_PRIORITY = {
  openclaw: 50,
  nemoclaw: 49,
}

function sortRecipesForCatalog(recipes) {
  return [...recipes].sort((a, b) => {
    const updateDiff = Number(Boolean(b.registry_changed)) - Number(Boolean(a.registry_changed))
    if (updateDiff !== 0) return updateDiff
    const priorityDiff = (CATALOG_PRIORITY[b.slug] || 0) - (CATALOG_PRIORITY[a.slug] || 0)
    if (priorityDiff !== 0) return priorityDiff
    return a.name.localeCompare(b.name)
  })
}

function getRecipeCategories(recipe) {
  const baseCategories = Array.isArray(recipe.categories) && recipe.categories.length > 0
    ? recipe.categories
    : [recipe.category]

  const tags = Array.isArray(recipe.tags) ? recipe.tags : []
  const description = (recipe.description || '').toLowerCase()
  const derivedCategories = [...baseCategories]

  if (recipe.slug.startsWith('vllm-') || tags.includes('vllm')) {
    derivedCategories.push('vllm')
  }

  if (
    baseCategories.includes('multi-modal') ||
    tags.includes('multi-modal') ||
    tags.includes('multimodal') ||
    tags.includes('vision') ||
    tags.includes('vision-language') ||
    tags.includes('audio') ||
    tags.includes('speech') ||
    description.includes('multimodal') ||
    description.includes('multi-modal') ||
    description.includes('text+image') ||
    description.includes('image, audio') ||
    description.includes('voice input')
  ) {
    derivedCategories.push('multi-modal')
  }

  if (
    baseCategories.includes('vision-language') ||
    tags.includes('vision-language') ||
    tags.includes('vlm')
  ) {
    derivedCategories.push('vision-language')
  }

  if (
    baseCategories.includes('image-understanding') ||
    tags.includes('image-understanding') ||
    tags.includes('ocr') ||
    tags.includes('document-ai') ||
    tags.includes('grounding') ||
    tags.includes('captioning')
  ) {
    derivedCategories.push('image-understanding')
  }

  if (tags.includes('reasoning')) {
    derivedCategories.push('reasoning')
  }

  if (tags.includes('coding') || tags.includes('code') || tags.includes('codegen')) {
    derivedCategories.push('code-gen')
  }

  if (
    tags.includes('speech') ||
    tags.includes('audio') ||
    tags.includes('tts') ||
    tags.includes('voice-cloning') ||
    description.includes('speech') ||
    description.includes('text-to-speech') ||
    description.includes('voice cloning')
  ) {
    derivedCategories.push('speech')
  }

  if (tags.includes('rag') || description.includes('retrieval')) {
    derivedCategories.push('rag')
  }

  const isDgxSparkRecipe =
    (recipe.source || 'community') === 'nvidia-ai-hub' ||
    recipe.slug.includes('spark') ||
    tags.includes('dgx-spark') ||
    description.includes('dgx spark')

  return isDgxSparkRecipe ? [...new Set([...derivedCategories, 'dgx-spark'])] : [...new Set(derivedCategories)]
}

export default function Catalog({ search = '' }) {
  const { t } = useTranslation()
  const recipes = useStore((s) => s.recipes)
  const selectRecipe = useStore((s) => s.selectRecipe)
  const installRecipe = useStore((s) => s.installRecipe)
  const metrics = useStore((s) => s.metrics)
  const [category, setCategory] = useState('all')
  const [activeBannerSlug, setActiveBannerSlug] = useState(null)
  const [itemsPerPage, setItemsPerPage] = useState(24)
  const [pageSelections, setPageSelections] = useState({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const searchMatchedRecipes = useMemo(() => recipes.filter((r) => {
    if (search) {
      const q = search.toLowerCase()
      const recipeTags = Array.isArray(r.tags) ? r.tags : []
      if (!r.name.toLowerCase().includes(q) && !recipeTags.some((t) => t.includes(q))) return false
    }
    return true
  }), [recipes, search])

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map((item) => [item.id, 0]))
    counts.all = searchMatchedRecipes.length

    searchMatchedRecipes.forEach((recipe) => {
      const recipeCategories = getRecipeCategories(recipe)
      recipeCategories.forEach((recipeCategory) => {
        if (recipeCategory in counts) {
          counts[recipeCategory] += 1
        }
      })
    })

    return counts
  }, [searchMatchedRecipes])

  const filtered = useMemo(() => searchMatchedRecipes.filter((r) => {
    const recipeCategories = getRecipeCategories(r)
    if (category !== 'all' && !recipeCategories.includes(category)) return false
    return true
  }), [category, searchMatchedRecipes])

  const orderedRecipes = useMemo(() => sortRecipesForCatalog(filtered), [filtered])

  const totalPages = Math.max(1, Math.ceil(orderedRecipes.length / itemsPerPage))

  const paginationScope = `${category}::${search}::${itemsPerPage}`
  const currentPage = Math.min(pageSelections[paginationScope] ?? 1, totalPages)

  const updateCurrentPage = (nextPage) => {
    setPageSelections((previous) => ({
      ...previous,
      [paginationScope]: Math.max(1, Math.min(totalPages, nextPage)),
    }))
  }

  const paginatedRecipes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return orderedRecipes.slice(startIndex, startIndex + itemsPerPage)
  }, [currentPage, itemsPerPage, orderedRecipes])

  const recipesWithUpdates = useMemo(
    () => orderedRecipes.filter((recipe) => recipe.registry_changed),
    [orderedRecipes],
  )

  const grouped = useMemo(() => {
    const assigned = new Set()

    return CATALOG_SECTIONS.map((section) => {
      const sectionRecipes = paginatedRecipes.filter((recipe) => {
        if (assigned.has(recipe.slug)) return false
        return section.match(recipe, getRecipeCategories(recipe))
      })

      sectionRecipes.forEach((recipe) => assigned.add(recipe.slug))

      return {
        ...section,
        recipes: sectionRecipes,
      }
    }).filter((section) => section.recipes.length > 0)
  }, [paginatedRecipes])

  const recipesWithBanners = useMemo(
    () => orderedRecipes.filter((r) => getBanner(r.slug)),
    [orderedRecipes],
  )

  const initialBannerSlug = useMemo(() => {
    if (search || category !== 'all' || recipesWithBanners.length === 0) return null

    const availableSlugs = recipesWithBanners.map((recipe) => recipe.slug)
    const previousSlug = localStorage.getItem(BANNER_STORAGE_KEY)
    const previousSessionSlug = localStorage.getItem(BANNER_PREVIOUS_STORAGE_KEY)

    if (availableSlugs.length <= 1) return availableSlugs[0] || null

    const candidates = availableSlugs.filter((slug) => slug !== previousSlug && slug !== previousSessionSlug)
    if (candidates.length > 0) {
      return candidates[0]
    }

    const fallbackCandidates = availableSlugs.filter((slug) => slug !== previousSlug)
    return fallbackCandidates[0] || availableSlugs[0] || null
  }, [category, recipesWithBanners, search])

  const featuredSlug = recipesWithBanners.some((recipe) => recipe.slug === activeBannerSlug)
    ? activeBannerSlug
    : initialBannerSlug

  useEffect(() => {
    if (search || category !== 'all' || recipesWithBanners.length <= 1) return undefined

    const interval = window.setInterval(() => {
      setActiveBannerSlug((current) => {
        const effectiveCurrent = recipesWithBanners.some((recipe) => recipe.slug === current)
          ? current
          : featuredSlug
        const currentIndex = recipesWithBanners.findIndex((recipe) => recipe.slug === effectiveCurrent)
        const nextIndex = currentIndex >= 0
          ? (currentIndex + 1) % recipesWithBanners.length
          : 0
        const nextSlug = recipesWithBanners[nextIndex].slug
        localStorage.setItem(BANNER_PREVIOUS_STORAGE_KEY, effectiveCurrent || '')
        localStorage.setItem(BANNER_STORAGE_KEY, nextSlug)
        return nextSlug
      })
    }, BANNER_ROTATION_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [category, featuredSlug, recipesWithBanners, search])

  useEffect(() => {
    if (!featuredSlug) return

    const previousSlug = localStorage.getItem(BANNER_STORAGE_KEY)
    if (previousSlug !== featuredSlug) {
      localStorage.setItem(BANNER_PREVIOUS_STORAGE_KEY, previousSlug || '')
      localStorage.setItem(BANNER_STORAGE_KEY, featuredSlug)
    }
  }, [featuredSlug])

  const featured = recipesWithBanners.find((recipe) => recipe.slug === featuredSlug) || recipesWithBanners[0] || null
  const bannerConf = featured ? getBanner(featured.slug) : null
  const featuredIsNotebook = isNotebookRecipe(featured)
  const featuredHardwareFit = featured ? getRecipeHardwareFit(featured, metrics) : null
  const showHero = Boolean(featured && bannerConf && !search && category === 'all')
  const activeCategoryMeta = CATEGORIES.find((item) => item.id === category) || CATEGORIES[0]
  const activeCategoryLabel = t(activeCategoryMeta.labelKey)
  const startItem = orderedRecipes.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = orderedRecipes.length === 0 ? 0 : Math.min(currentPage * itemsPerPage, orderedRecipes.length)

  const handleCategorySelect = (nextCategory) => {
    setCategory(nextCategory)
    setMobileMenuOpen(false)
  }

  const handleResetCategory = () => {
    setCategory('all')
    setMobileMenuOpen(false)
  }

  return (
    <div className="pb-12">
      {/* ─── Hero Banner ─── */}
      {showHero && (
        <div
          className="group relative mx-6 mt-6 h-[248px] cursor-pointer overflow-hidden rounded-xl border border-outline-dim shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
          onClick={() => selectRecipe(featured.slug)}
        >
          <img
            src={bannerConf.img}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0" style={{ background: 'var(--hero-overlay-left)' }} />
          <div className="absolute inset-0" style={{ background: 'var(--hero-overlay-bottom)' }} />

          <div className="relative flex h-full items-center gap-5 px-8">
            {featured.logo ? (
              <img
                src={featured.logo}
                alt={featured.name}
                className="h-16 w-16 shrink-0 rounded-xl border border-glass-border bg-surface/70 object-contain p-2.5 shadow-2xl backdrop-blur-md"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-surface/70 text-3xl backdrop-blur-md">
                {featured.icon || '◻'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <span className="mb-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-on font-label">
                {getRecipeFeaturedLabel(featured)}
              </span>
              <span className={`mb-2 ml-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] font-label ${
                featuredIsNotebook ? 'text-primary bg-primary/12 border border-primary/20' : 'text-text-dim bg-surface/45 border border-glass-border'
              }`}>
                {getRecipeSurfaceLabel(featured)}
              </span>
              {featuredHardwareFit && (
                <span className={`mb-2 ml-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] font-label ${getHardwareFitBannerClass(featuredHardwareFit)}`}>
                  {t('catalog.hostLabel', { label: featuredHardwareFit.label })}
                </span>
              )}
              <h1 className="m-0 text-[28px] font-bold tracking-tight text-text drop-shadow-md font-display">
                {featured.name}
              </h1>
              <p className="m-0 mt-1 max-w-md line-clamp-2 text-sm leading-6 text-text-muted drop-shadow-sm">
                {featured.description}
              </p>
              {featuredHardwareFit?.headline && (
                <p className="m-0 mt-1.5 max-w-lg text-xs leading-5 text-text-muted drop-shadow-sm">
                  {featuredHardwareFit.headline}
                </p>
              )}
              <div className="mt-3.5 flex items-center gap-2.5">
                {featured.running && featured.ready ? (
                  <a
                    href={getRecipeUrl(featured)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="btn-primary inline-block rounded-lg px-5 py-2 text-sm font-bold no-underline"
                  >
                      {getRecipeOpenLabelWithArrow(featured)}
                  </a>
                ) : !featured.installed ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); installRecipe(featured.slug) }}
                    className="btn-primary rounded-lg px-5 py-2 text-sm font-bold"
                  >
                    {t('catalog.install')}
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); selectRecipe(featured.slug) }}
                    className="btn-primary rounded-lg px-5 py-2 text-sm font-bold"
                  >
                    {t('catalog.viewDetails')}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); selectRecipe(featured.slug) }}
                  className="cursor-pointer rounded-lg border border-glass-border bg-surface/40 px-4 py-2 text-sm font-medium text-text backdrop-blur transition-all hover:bg-surface/60"
                >
                  {t('catalog.learnMore')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pt-6">
        <div className="mb-3 flex items-center justify-between gap-2.5 xl:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-outline-dim bg-surface/80 px-3.5 py-2.5 text-sm font-semibold text-text shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm"
          >
            <CategoryIcon kind={activeCategoryMeta.icon} active />
            {t('catalog.categories')}
          </button>
          <div className="rounded-xl border border-outline-dim bg-surface/80 px-3.5 py-2.5 text-sm text-text-dim shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm">
            {activeCategoryLabel} · {orderedRecipes.length}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 xl:hidden">
            <button
              type="button"
              aria-label={t('catalog.close')}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            />
            <div className="absolute inset-y-0 left-0 w-[86vw] max-w-[340px] overflow-y-auto border-r border-outline-dim bg-bg/95 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('catalog.categories')}</div>
                  <h2 className="mt-1.5 mb-0.5 text-base font-bold text-text font-display">{t('catalog.browseApps')}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-outline-dim bg-surface-high/60 px-3 py-1.5 text-sm font-semibold text-text"
                >
                  {t('catalog.close')}
                </button>
              </div>

              <div className="space-y-1.5">
                {CATEGORIES.map((c) => {
                  const active = category === c.id
                  return (
                    <button
                      key={`mobile-${c.id}`}
                      type="button"
                      onClick={() => handleCategorySelect(c.id)}
                      className={`group flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                        active
                          ? 'border-primary bg-primary/10 text-text shadow-[0_8px_20px_rgba(118,226,42,0.12)]'
                          : 'border-outline-dim bg-surface-high/40 text-text-muted hover:border-outline hover:bg-surface-high/75 hover:text-text'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-outline-dim bg-surface-high/70 text-text-dim group-hover:text-text-muted'}`}>
                          <CategoryIcon kind={c.icon} active={active} />
                        </span>
                        <span>
                          <span className="block text-[13px] font-semibold font-display leading-5">{t(c.labelKey)}</span>
                          <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-text-dim font-label">{t('catalog.appsCount', { count: categoryCounts[c.id] || 0 })}</span>
                        </span>
                      </span>
                      <span className="rounded-full border border-outline-dim bg-surface-high/70 px-2 py-0.5 text-[10px] font-label text-text-dim">
                        {categoryCounts[c.id] || 0}
                      </span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleResetCategory}
                className="mt-4 w-full rounded-xl border border-outline-dim bg-surface-high/60 px-3 py-2.5 text-sm font-semibold text-text transition-all hover:border-outline hover:bg-surface-high"
              >
                {t('catalog.resetToAll')}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="hidden space-y-4 xl:sticky xl:top-6 xl:block xl:self-start">
            <div className="rounded-2xl border border-outline-dim bg-surface/80 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('catalog.categories')}</div>
                  <h2 className="mt-1.5 mb-0.5 text-base font-bold text-text font-display">{t('catalog.exploreApps')}</h2>
                  <p className="m-0 text-xs leading-5 text-text-dim">{t('catalog.quickCategoryFilter')}</p>
                </div>
                <div className="rounded-xl border border-outline-dim bg-surface-high/70 px-2.5 py-1.5 text-right">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('catalog.showing')}</div>
                  <div className="text-sm font-bold text-text font-display">{filtered.length}</div>
                </div>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:mx-0 xl:block xl:space-y-1.5 xl:overflow-visible xl:px-0 xl:pb-0">
                {CATEGORIES.map((c) => {
                  const active = category === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleCategorySelect(c.id)}
                      className={`group shrink-0 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 xl:flex xl:w-full xl:items-center xl:justify-between ${
                        active
                          ? 'border-primary bg-primary/10 text-text shadow-[0_8px_20px_rgba(118,226,42,0.12)]'
                          : 'border-outline-dim bg-surface-high/40 text-text-muted hover:border-outline hover:bg-surface-high/75 hover:text-text'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-outline-dim bg-surface-high/70 text-text-dim group-hover:text-text-muted'}`}>
                          <CategoryIcon kind={c.icon} active={active} />
                        </span>
                        <span>
                          <span className="block text-[13px] font-semibold font-display leading-5">{t(c.labelKey)}</span>
                          <span className={`mt-0.5 hidden text-[10px] uppercase tracking-[0.14em] font-label xl:block ${active ? 'text-primary' : 'text-text-dim group-hover:text-text-muted'}`}>
                            {t('catalog.appsCount', { count: categoryCounts[c.id] || 0 })}
                          </span>
                        </span>
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-label ${active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-outline-dim bg-surface-high/70 text-text-dim'}`}>
                        {categoryCounts[c.id] || 0}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            {(category !== 'all' || search) && (
              <div className="rounded-2xl border border-outline-dim bg-surface/70 px-4 py-3.5 backdrop-blur-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{t('catalog.currentCategory')}</div>
                    <h3 className="m-0 mt-1.5 text-xl font-bold tracking-tight text-text font-display">{activeCategoryLabel}</h3>
                    <p className="m-0 mt-1 text-xs text-text-dim leading-5">
                      {search
                        ? t('catalog.filteredBy', { search, category: activeCategoryLabel.toLowerCase() })
                        : t('catalog.showingCurated', { category: activeCategoryLabel.toLowerCase() })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-label text-text-dim">
                    <span className="rounded-full border border-outline-dim bg-surface-high/60 px-3 py-1.5">{t('catalog.appsCount', { count: filtered.length })}</span>
                    <span className="rounded-full border border-outline-dim bg-surface-high/60 px-3 py-1.5">{startItem}-{endItem}</span>
                    {recipesWithUpdates.length > 0 && <span className="rounded-full border border-warning/20 bg-warning/10 px-3 py-1.5 text-warning">{t('running.updatesAvailable', { count: recipesWithUpdates.length })}</span>}
                    {search && <span className="rounded-full border border-outline-dim bg-surface-high/60 px-3 py-1.5">{t('catalog.searchActive')}</span>}
                  </div>
                </div>
              </div>
            )}

            {category === 'all' && !search && recipesWithUpdates.length > 0 && (
              <div className="rounded-2xl border border-warning/20 bg-warning/5 px-4 py-4 backdrop-blur-sm animate-fadeIn">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-warning font-label">{t('catalog.updates')}</div>
                    <h3 className="m-0 mt-1 text-lg font-bold tracking-tight text-text font-display">{t('catalog.recipeUpdatesAvailable')}</h3>
                    <p className="m-0 mt-1 text-sm text-text-dim leading-6">
                      {t('catalog.recipeUpdatesBody', { count: recipesWithUpdates.length })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recipesWithUpdates.slice(0, 8).map((recipe) => (
                      <button
                        key={recipe.slug}
                        type="button"
                        onClick={() => selectRecipe(recipe.slug)}
                        className="rounded-full border border-warning/20 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning cursor-pointer hover:bg-warning/15"
                      >
                        {recipe.name}
                        {recipe.registry_update_count ? ` · ${recipe.registry_update_count}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-8">
              {category === 'all' ? (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3 animate-fadeIn">
                  {paginatedRecipes.map((recipe) => (
                    <RecipeCard key={recipe.slug} recipe={recipe} />
                  ))}
                </div>
              ) : (
                grouped.map((section) => (
                  <div key={section.id} className="animate-fadeIn">
                    <div className="mb-3 flex items-center gap-2">
                      <SectionIcon kind={section.icon} />
                      <div>
                        <h2 className="text-base font-bold text-text tracking-tight font-display m-0">
                          {t(section.labelKey)}
                        </h2>
                        <p className="text-[11px] text-text-dim mt-0.5 m-0 leading-4">{t(section.subtitleKey)}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {section.recipes.map((recipe) => (
                        <RecipeCard key={recipe.slug} recipe={recipe} />
                      ))}
                    </div>
                  </div>
                ))
              )}
              {((category === 'all' && paginatedRecipes.length === 0) || (category !== 'all' && grouped.length === 0)) && (
                <div className="text-center py-20 text-text-dim animate-fadeIn">
                  <div className="text-4xl mb-3">🔍</div>
                  <div className="text-base font-semibold font-display">{t('catalog.noAppsFound')}</div>
                  <div className="text-sm mt-1">{t('catalog.tryDifferent')}</div>
                </div>
              )}
            </div>

            {orderedRecipes.length > 0 && (
              <div className="flex flex-col gap-4 rounded-2xl border border-outline-dim bg-surface/70 px-4 py-3.5 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-text-dim">
                  <span className="font-label">{t('catalog.itemsPerPage')}</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="rounded-lg border border-outline-dim bg-surface-high/70 px-3 py-1.5 text-sm text-text outline-none"
                  >
                    {[12, 24, 48, 96].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => updateCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-outline-dim bg-surface-high/60 px-3 py-1.5 text-sm font-semibold text-text transition-all hover:border-outline hover:bg-surface-high disabled:opacity-50"
                  >
                    {t('catalog.prev')}
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => updateCurrentPage(page)}
                      className={`min-w-9 rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-all ${
                        currentPage === page
                          ? 'border-primary bg-primary/12 text-primary'
                          : 'border-outline-dim bg-surface-high/60 text-text hover:border-outline hover:bg-surface-high'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-outline-dim bg-surface-high/60 px-3 py-1.5 text-sm font-semibold text-text transition-all hover:border-outline hover:bg-surface-high disabled:opacity-50"
                  >
                    {t('catalog.next')}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-outline-dim bg-surface-high/60 px-3 py-1.5 text-sm font-semibold text-text transition-all hover:border-outline hover:bg-surface-high disabled:opacity-50"
                  >
                    {t('catalog.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryIcon({ kind, active = false }) {
  const shared = {
    className: `h-5 w-5 ${active ? 'text-primary' : 'text-current'}`,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  if (kind === 'grid') {
    return (
      <svg {...shared}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    )
  }

  if (kind === 'brain' || kind === 'reasoning') {
    return (
      <svg {...shared}>
        <path d="M9.5 7.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 2.5 2.5c0 .9-.47 1.7-1.18 2.15A2.5 2.5 0 0 1 14 16.5h-4A2.5 2.5 0 0 1 8.13 12.15 2.5 2.5 0 0 1 9.5 7.5Z" />
        <path d="M12 7v10" />
        <path d="M9.5 10.5h1.5" />
        <path d="M13 13.5h1.5" />
      </svg>
    )
  }

  if (kind === 'server' || kind === 'database') {
    return (
      <svg {...shared}>
        <rect x="4" y="4" width="16" height="6" rx="2" />
        <rect x="4" y="14" width="16" height="6" rx="2" />
        <path d="M8 7h.01" />
        <path d="M8 17h.01" />
        <path d="M14 7h2" />
        <path d="M14 17h2" />
      </svg>
    )
  }

  if (kind === 'image') {
    return (
      <svg {...shared}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m21 15-4.5-4.5L8 19" />
      </svg>
    )
  }

  if (kind === 'video') {
    return (
      <svg {...shared}>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3" />
      </svg>
    )
  }

  if (kind === 'cube') {
    return (
      <svg {...shared}>
        <path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z" />
        <path d="m12 12 7-4" />
        <path d="m12 12-7-4" />
        <path d="M12 12v9" />
      </svg>
    )
  }

  if (kind === 'eye' || kind === 'scan') {
    return (
      <svg {...shared}>
        <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    )
  }

  if (kind === 'code') {
    return (
      <svg {...shared}>
        <path d="m8 16-4-4 4-4" />
        <path d="m16 8 4 4-4 4" />
        <path d="m14 5-4 14" />
      </svg>
    )
  }

  if (kind === 'mic') {
    return (
      <svg {...shared}>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
        <path d="M8.5 21h7" />
      </svg>
    )
  }

  if (kind === 'shield') {
    return (
      <svg {...shared}>
        <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z" />
        <path d="m9.5 12 1.8 1.8L15 10.1" />
      </svg>
    )
  }

  if (kind === 'spark') {
    return (
      <svg {...shared}>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </svg>
    )
  }

  if (kind === 'multimodal') {
    return (
      <svg {...shared}>
        <circle cx="7" cy="12" r="2.5" />
        <circle cx="17" cy="7" r="2.5" />
        <circle cx="17" cy="17" r="2.5" />
        <path d="M9.2 11 14.8 8.1" />
        <path d="M9.2 13 14.8 15.9" />
      </svg>
    )
  }

  return (
    <svg {...shared}>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <path d="M7 7h.01" />
      <path d="M7 17h.01" />
      <path d="M17 7h-4" />
      <path d="M17 17h-4" />
    </svg>
  )
}

function getHardwareFitBannerClass(fit) {
  if (fit.tone === 'success') return 'text-success bg-success/15 border border-success/20'
  if (fit.tone === 'warning') return 'text-warning bg-warning/15 border border-warning/20'
  if (fit.tone === 'error') return 'text-error bg-error-surface border border-error/20'
  return 'text-text-dim bg-surface/45 border border-glass-border'
}

function SectionIcon({ kind }) {
  const shared = {
    className: 'w-5 h-5 text-text-muted',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  if (kind === 'spark') {
    return (
      <svg {...shared}>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </svg>
    )
  }

  if (kind === 'official') {
    return (
      <svg {...shared}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.5 2.5L15.5 10" />
      </svg>
    )
  }

  if (kind === 'multimodal') {
    return (
      <svg {...shared}>
        <circle cx="7" cy="12" r="2.5" />
        <circle cx="17" cy="7" r="2.5" />
        <circle cx="17" cy="17" r="2.5" />
        <path d="M9.2 11 14.8 8.1" />
        <path d="M9.2 13 14.8 15.9" />
      </svg>
    )
  }

  return (
    <svg {...shared}>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <path d="M7 7h.01" />
      <path d="M7 17h.01" />
      <path d="M17 7h-4" />
      <path d="M17 17h-4" />
    </svg>
  )
}
