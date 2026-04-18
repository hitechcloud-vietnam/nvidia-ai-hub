import { useStore } from '../store'
import { useTranslation } from 'react-i18next'

export default function SystemBar() {
  const { t } = useTranslation()
  const metrics = useStore((s) => s.metrics)

  const ramUsed = metrics?.ram_used_gb ?? 0
  const ramTotal = metrics?.ram_total_gb ?? 128
  const ramPct = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0
  const cpuPct = Math.round(metrics?.cpu_percent ?? 0)
  const systemLabel = metrics?.gpu_name || metrics?.hostname || t('topbar.systemFallback')
  const tempValue = metrics?.gpu_temperature || metrics?.cpu_temperature || 0
  const tempSource = metrics?.gpu_temperature_source || metrics?.cpu_temperature_source || ''

  return (
    <div className="flex items-center gap-3 text-xs text-text-dim">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-text-muted hidden xl:inline">{systemLabel}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="hidden lg:inline">{t('recipe.cpu')}</span>
        <span className="text-primary font-medium">{cpuPct}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="hidden lg:inline">{t('recipe.ram')}</span>
        <div className="w-16 h-1.5 bg-outline-dim rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${ramPct}%`,
              background: ramPct > 80 ? 'var(--error)' : 'var(--primary)',
            }}
          />
        </div>
        <span className="hidden lg:inline">{ramUsed}/{ramTotal}GB</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="hidden lg:inline">{t('recipe.gpu')}</span>
        <span className="text-primary font-medium">{metrics?.gpu_utilization ?? 0}%</span>
      </div>
      <div className="hidden xl:flex items-center gap-1" title={tempSource || t('system.temperatureSourceUnavailable')}>
        <span className={tempValue > 80 ? 'text-error' : 'text-primary'}>
          {tempValue > 0 ? `${Math.round(tempValue)}°C` : t('system.tempNotAvailable')}
        </span>
      </div>
    </div>
  )
}
