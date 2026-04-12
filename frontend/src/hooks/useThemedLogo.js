import { useStore } from '../store'

export function useThemedLogo(logoPath) {
  const theme = useStore((s) => s.theme)
  if (!logoPath) return ''
  // /logos/nvidia.png -> /logos/nvidia-dark.png or /logos/nvidia-light.png
  const themed = logoPath.replace(/\.png$/, `-${theme}.png`)
  return themed
}
