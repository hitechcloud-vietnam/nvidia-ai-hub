import { useStore } from '../store'
import { resolveStaticAssetUrl } from '../desktopRuntime'

export function useThemedLogo(logoPath) {
  const theme = useStore((s) => s.theme)
  if (!logoPath) return ''
  if (!/\.png$/i.test(logoPath)) return resolveStaticAssetUrl(logoPath)
  if (/(?:-light|-dark|-color)\.png$/i.test(logoPath)) return resolveStaticAssetUrl(logoPath)
  // /logos/nvidia.png -> /logos/nvidia-dark.png or /logos/nvidia-light.png
  return resolveStaticAssetUrl(logoPath.replace(/\.png$/i, `-${theme}.png`))
}
