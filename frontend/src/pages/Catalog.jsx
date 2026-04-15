import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import RecipeCard from '../components/RecipeCard'
import { getRecipeFeaturedLabel, getRecipeOpenLabelWithArrow, getRecipeSurfaceLabel, getRecipeUrl, isNotebookRecipe } from '../utils/recipePresentation'

const BANNERS = {
  'minicpm-o':            { img: '/banners/wide/minicpm-voice-orbit.svg', layout: 'wide' },
  'voicebox':             { img: '/banners/wide/voice-lab-wave.svg', layout: 'wide' },
  'chatterbox-turbo':     { img: '/banners/wide/voice-lab-wave.svg', layout: 'wide' },
  'live-vlm-webui':       { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
  'openclaw':             { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
  'nemoclaw':             { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
  'multi-agent-chatbot':  { img: '/banners/wide/agent-vision-mesh.svg', layout: 'wide' },
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
  { id: 'all', label: 'All' },
  { id: 'dgx-spark', label: 'DGX Spark' },
  { id: 'llm', label: 'LLMs' },
  { id: 'vllm', label: 'vLLMs' },
  { id: 'image-gen', label: 'Image Gen' },
  { id: 'video-gen', label: 'Video Gen' },
  { id: '3d-gen', label: '3D Gen' },
  { id: 'multi-modal', label: 'Multi-Modal' },
  { id: 'reasoning', label: 'Reasoning' },
  { id: 'code-gen', label: 'Code Gen' },
  { id: 'speech', label: 'Speech' },
  { id: 'rag', label: 'RAG' },
  { id: 'nemoclaw', label: 'NemoClaw' },
]

const CATALOG_SECTIONS = [
  {
    id: 'multi-modal',
    label: 'Multi-Modal',
    subtitle: 'Voice, vision, webcam, speech, and agent experiences curated first on the catalog.',
    icon: 'multimodal',
    match: (_recipe, categories) => categories.includes('multi-modal'),
  },
  {
    id: 'vllm',
    label: 'vLLMs',
    subtitle: 'OpenAI-compatible DGX Spark model endpoints served through vLLM on port 9001.',
    icon: 'models',
    match: (_recipe, categories) => categories.includes('vllm'),
  },
  {
    id: 'spark-ai-hub',
    label: 'Spark-Optimized',
    subtitle: 'Built & tested for DGX Spark',
    icon: 'spark',
    match: (recipe) => (recipe.source || 'community') === 'spark-ai-hub',
  },
  {
    id: 'official',
    label: 'Official Apps',
    subtitle: 'Published by original developers',
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
    (recipe.source || 'community') === 'spark-ai-hub' ||
    recipe.slug.includes('spark') ||
    tags.includes('dgx-spark') ||
    description.includes('dgx spark')

  return isDgxSparkRecipe ? [...new Set([...derivedCategories, 'dgx-spark'])] : [...new Set(derivedCategories)]
}

export default function Catalog({ search = '' }) {
  const recipes = useStore((s) => s.recipes)
  const selectRecipe = useStore((s) => s.selectRecipe)
  const installRecipe = useStore((s) => s.installRecipe)
  const [category, setCategory] = useState('all')
  const [activeBannerSlug, setActiveBannerSlug] = useState(null)

  const filtered = recipes.filter((r) => {
    const recipeCategories = getRecipeCategories(r)
    if (category !== 'all' && !recipeCategories.includes(category)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.name.toLowerCase().includes(q) && !r.tags.some((t) => t.includes(q))) return false
    }
    return true
  })

  const orderedRecipes = useMemo(() => sortRecipesForCatalog(filtered), [filtered])

  const grouped = useMemo(() => {
    const assigned = new Set()

    return CATALOG_SECTIONS.map((section) => {
      const sectionRecipes = orderedRecipes.filter((recipe) => {
        if (assigned.has(recipe.slug)) return false
        return section.match(recipe, getRecipeCategories(recipe))
      })

      sectionRecipes.forEach((recipe) => assigned.add(recipe.slug))

      return {
        ...section,
        recipes: sectionRecipes,
      }
    }).filter((section) => section.recipes.length > 0)
  }, [orderedRecipes])

  const recipesWithBanners = useMemo(
    () => orderedRecipes.filter((r) => getBanner(r.slug)),
    [orderedRecipes],
  )

  useEffect(() => {
    if (search || category !== 'all' || recipesWithBanners.length <= 1) return undefined

    const interval = window.setInterval(() => {
      setActiveBannerSlug((current) => {
        const currentIndex = recipesWithBanners.findIndex((recipe) => recipe.slug === current)
        const nextIndex = currentIndex >= 0
          ? (currentIndex + 1) % recipesWithBanners.length
          : 0
        return recipesWithBanners[nextIndex].slug
      })
    }, 5000)

    return () => window.clearInterval(interval)
  }, [category, recipesWithBanners, search])

  const featuredSlug = recipesWithBanners.some((recipe) => recipe.slug === activeBannerSlug)
    ? activeBannerSlug
    : recipesWithBanners[0]?.slug ?? null
  const featured = recipesWithBanners.find((recipe) => recipe.slug === featuredSlug) || recipesWithBanners[0] || null
  const bannerConf = featured ? getBanner(featured.slug) : null
  const featuredIsNotebook = isNotebookRecipe(featured)

  return (
    <div className="pb-12">
      {/* ─── Hero Banner ─── */}
      {featured && bannerConf && !search && category === 'all' && (
        <div
          className="mx-6 mt-6 rounded-2xl overflow-hidden cursor-pointer relative group h-[280px]"
          onClick={() => selectRecipe(featured.slug)}
        >
          <img
            src={bannerConf.img}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0" style={{ background: 'var(--hero-overlay-left)' }} />
          <div className="absolute inset-0" style={{ background: 'var(--hero-overlay-bottom)' }} />

          <div className="relative h-full flex items-center gap-6 px-10">
            {featured.logo ? (
              <img
                src={featured.logo}
                alt={featured.name}
                className="w-20 h-20 rounded-2xl object-contain bg-surface/70 backdrop-blur-md p-3 shadow-2xl shrink-0 border border-glass-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-surface/70 backdrop-blur-md flex items-center justify-center text-4xl shrink-0 border border-glass-border">
                {featured.icon || '◻'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <span className="inline-block text-[10px] font-bold font-label text-primary-on bg-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                {getRecipeFeaturedLabel(featured)}
              </span>
              <span className={`inline-block text-[10px] font-bold font-label px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 ml-2 ${
                featuredIsNotebook ? 'text-primary bg-primary/12 border border-primary/20' : 'text-text-dim bg-surface/45 border border-glass-border'
              }`}>
                {getRecipeSurfaceLabel(featured)}
              </span>
              <h1 className="text-3xl font-bold text-text tracking-tight font-display m-0 drop-shadow-md">
                {featured.name}
              </h1>
              <p className="text-text-muted text-sm leading-relaxed max-w-md line-clamp-2 m-0 mt-1 drop-shadow-sm">
                {featured.description}
              </p>
              <div className="mt-4 flex items-center gap-3">
                {featured.running && featured.ready ? (
                  <a
                    href={getRecipeUrl(featured)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="btn-primary px-6 py-2 text-sm font-bold no-underline inline-block"
                  >
                      {getRecipeOpenLabelWithArrow(featured)}
                  </a>
                ) : !featured.installed ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); installRecipe(featured.slug) }}
                    className="btn-primary px-6 py-2 text-sm font-bold"
                  >
                    Install
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); selectRecipe(featured.slug) }}
                    className="btn-primary px-6 py-2 text-sm font-bold"
                  >
                    View Details
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); selectRecipe(featured.slug) }}
                  className="px-5 py-2 bg-surface/40 backdrop-blur text-text text-sm font-medium border border-glass-border rounded-xl cursor-pointer hover:bg-surface/60 transition-all"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Category Filters ─── */}
      <div className="px-6 pt-6 pb-2 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 border ${
              category === c.id
                ? 'bg-primary text-primary-on border-primary shadow-md shadow-primary/15'
                : 'bg-transparent text-text-muted border-outline hover:text-text hover:border-text-dim'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ─── App Sections ─── */}
      <div className="px-6 pt-4 space-y-10">
        {grouped.map((section) => (
          <div key={section.id} className="animate-fadeIn">
            <div className="mb-4 flex items-center gap-2">
              <SectionIcon kind={section.icon} />
              <div>
                <h2 className="text-lg font-bold text-text tracking-tight font-display m-0">
                  {section.label}
                </h2>
                <p className="text-xs text-text-dim mt-0.5 m-0">{section.subtitle}</p>
              </div>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
              {section.recipes.map((r) => (
                <RecipeCard key={r.slug} recipe={r} />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="text-center py-20 text-text-dim animate-fadeIn">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-base font-semibold font-display">No apps found</div>
            <div className="text-sm mt-1">Try a different search or category</div>
          </div>
        )}
      </div>
    </div>
  )
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
