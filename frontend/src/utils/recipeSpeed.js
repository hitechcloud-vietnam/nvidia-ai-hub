export function formatTokensPerSecond(value) {
  const speed = Number(value)
  if (!Number.isFinite(speed) || speed <= 0) return ''
  return `${speed.toFixed(1)} tok/s`
}
