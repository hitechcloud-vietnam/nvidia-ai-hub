function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function deepMerge(base, overrides) {
  if (!isPlainObject(base) || !isPlainObject(overrides)) return overrides

  const result = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      result[key] = deepMerge(base[key], value)
    } else {
      result[key] = value
    }
  }
  return result
}

export default function createLocale(baseLocale, overrides) {
  return deepMerge(baseLocale, overrides)
}
