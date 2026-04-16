import { useStore } from '../store'

export function useThemedLogo(logoPath) {
  const theme = useStore((s) => s.theme)
  if (!logoPath) return ''
  if (!/\.png$/i.test(logoPath)) return logoPath
  if (/(?:-light|-dark|-color)\.png$/i.test(logoPath)) return logoPath
  // /logos/nvidia.png -> /logos/nvidia-dark.png or /logos/nvidia-light.png
  return logoPath.replace(/\.png$/i, `-${theme}.png`)
}
