import { useStore } from '../store'

export default function SystemBar() {
  const metrics = useStore((s) => s.metrics)

  const ramUsed = metrics?.ram_used_gb ?? 0
  const ramTotal = metrics?.ram_total_gb ?? 128
  const ramPct = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0

  return (
    <div className="flex items-center gap-3 text-xs text-text-dim">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-text-muted hidden xl:inline">{metrics?.gpu_name || 'GB10'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="hidden lg:inline">RAM</span>
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
        <span className="hidden lg:inline">GPU</span>
        <span className="text-primary font-medium">{metrics?.gpu_utilization ?? 0}%</span>
      </div>
      {metrics?.gpu_temperature > 0 && (
        <div className="hidden xl:flex items-center gap-1">
          <span className={metrics.gpu_temperature > 80 ? 'text-error' : 'text-primary'}>
            {metrics.gpu_temperature}°C
          </span>
        </div>
      )}
    </div>
  )
}
