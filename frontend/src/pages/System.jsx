import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'

const SystemGpuChartsSection = lazy(() => import('../components/system/SystemCharts'))
const PerformanceHistoryChart = lazy(() => import('../components/system/SystemCharts').then((module) => ({ default: module.PerformanceHistoryChart })))

function CircularGauge({ value, max, label, sublabel, unit, color = 'var(--tertiary)', size = 140 }) {
  const radius = (size - 20) / 2
  const stroke = 6
  const circ = 2 * Math.PI * radius
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const offset = circ - (pct / 100) * circ
  const displayVal = typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value

  return (
    <div className="bg-surface rounded-2xl p-6 card-hover flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--outline-dim)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="gauge-ring"
        />
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" dominantBaseline="middle"
          fill="var(--text)" fontSize="26" fontFamily="Sora" fontWeight="700">
          {displayVal}
        </text>
        <text x={size / 2} y={size / 2 + 16} textAnchor="middle" dominantBaseline="middle"
          fill="var(--text-dim)" fontSize="11" fontFamily="Space Grotesk">
          {unit}
        </text>
      </svg>
      <div className="mt-3 text-center">
        <div className="text-sm font-semibold font-display text-text">{label}</div>
        {sublabel && <div className="text-[11px] text-text-dim font-label mt-0.5">{sublabel}</div>}
      </div>
    </div>
  )
}

export default function System() {
  const metrics = useStore((s) => s.metrics)
  const history = useStore((s) => s.metricHistory)
  const recipes = useStore((s) => s.recipes)
  const theme = useStore((s) => s.theme)
  const gpuList = useMemo(() => (Array.isArray(metrics?.gpus) ? metrics.gpus : []), [metrics])
  const [chartsVisible, setChartsVisible] = useState(false)

  const runningApps = recipes.filter((r) => r.running || r.starting)

  useEffect(() => {
    const timer = window.setTimeout(() => setChartsVisible(true), 150)
    return () => window.clearTimeout(timer)
  }, [])

  if (!metrics) {
    return (
      <div className="p-6 text-center text-text-dim py-20 animate-fadeIn">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-base font-semibold font-display">Waiting for metrics...</div>
      </div>
    )
  }

  const gridColor = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'
  const axisColor = theme === 'light' ? '#8a8a9a' : '#6E6C7A'
  const tooltipBg = theme === 'light' ? '#ffffff' : '#161625'
  const tooltipBorder = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  const systemTemp = metrics.gpu_temperature || metrics.cpu_temperature || 0
  const tempColor = systemTemp > 80 ? 'var(--error)' : '#FBBF24'
  const uptimeHours = metrics.uptime_seconds > 0 ? (metrics.uptime_seconds / 3600).toFixed(1) : '0.0'
  const hasTemperature = systemTemp > 0
  const temperatureHint = [metrics.gpu_temperature_source, metrics.cpu_temperature_source].filter(Boolean).join(' • ')
  const gpuPalette = ['#7C3AED', '#22C55E', '#F97316', '#06B6D4', '#EF4444', '#EAB308']

  return (
    <div className="px-6 py-6 pb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight font-display m-0">System Monitor</h2>
        <p className="text-sm text-text-dim m-0 mt-1 font-label">
          {metrics.platform || 'System'} — {metrics.hostname || 'localhost'}
        </p>
      </div>

      {/* Circular Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CircularGauge
          value={metrics.cpu_percent} max={100}
          label="CPU" sublabel={`${metrics.cpu_cores_logical || 0} threads`}
          unit="%" color="var(--primary)"
        />
        <CircularGauge
          value={metrics.gpu_utilization} max={100}
          label="GPU" sublabel={metrics.gpu_count > 0 ? `${metrics.gpu_count} device${metrics.gpu_count > 1 ? 's' : ''}` : 'No GPU telemetry'}
          unit="%" color="var(--tertiary)"
        />
        <CircularGauge
          value={metrics.ram_used_gb} max={metrics.ram_total_gb}
          label="RAM" sublabel={`of ${metrics.ram_total_gb} GB`}
          unit="GB" color="var(--tertiary)"
        />
        <CircularGauge
          value={systemTemp} max={100}
          label="Temperature" sublabel={hasTemperature ? (systemTemp > 80 ? 'Warning' : 'Normal') : 'Waiting for sensor'}
          unit="°C" color={tempColor}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard label="GPU memory" value={`${metrics.gpu_memory_used_mb || 0} / ${metrics.gpu_memory_total_mb || 0} MB`} hint={metrics.gpu_name ? (metrics.gpu_temperature_source || 'GPU telemetry available') : 'Unavailable on this host'} badge={metrics.gpu_temperature_source || ''} />
        <MetricCard label="Disk" value={`${metrics.disk_used_gb} / ${metrics.disk_total_gb} GB`} hint={`${metrics.disk_free_gb} GB free · ${metrics.disk_percent}% used`} />
        <MetricCard label="CPU frequency" value={metrics.cpu_frequency_mhz > 0 ? `${(metrics.cpu_frequency_mhz / 1000).toFixed(2)} GHz` : 'Unavailable'} hint={`${metrics.cpu_cores_physical || metrics.cpu_cores_logical || 0} physical cores`} />
        <MetricCard label="Uptime" value={`${uptimeHours} h`} hint={temperatureHint || `RAM ${metrics.ram_percent}% used`} badge={temperatureHint.split(' • ')[0] || ''} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <MetricCard label="CPU temperature" value={metrics.cpu_temperature > 0 ? `${metrics.cpu_temperature.toFixed(1)} °C` : 'Unavailable'} hint={metrics.cpu_temperature_source || 'No CPU sensor found'} badge={metrics.cpu_temperature_source || ''} />
        <MetricCard label="GPU temperature" value={metrics.gpu_temperature > 0 ? `${metrics.gpu_temperature.toFixed(1)} °C` : 'Unavailable'} hint={metrics.gpu_temperature_source || 'nvidia-smi not available'} badge={metrics.gpu_temperature_source || ''} />
        <MetricCard label="GPU devices" value={`${metrics.gpu_count || gpuList.length}`} hint={metrics.gpu_name || 'No discrete GPU detected'} />
      </div>

      {gpuList.length > 0 && chartsVisible && (
        <>
          <Suspense fallback={<ChartsSkeleton count={3} />}>
            <SystemGpuChartsSection
              history={history}
              gpuList={gpuList}
              gpuPalette={gpuPalette}
              gridColor={gridColor}
              axisColor={axisColor}
              tooltipBg={tooltipBg}
              tooltipBorder={tooltipBorder}
            />
          </Suspense>

          <div className="bg-surface rounded-2xl p-5 card-hover mb-8">
            <div className="mb-4">
              <h3 className="text-sm font-semibold font-display text-text m-0">GPU Devices</h3>
              <p className="text-[11px] text-text-dim font-label m-0 mt-0.5">Per-GPU telemetry with Linux and Windows host enrichment</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-text-dim font-label border-b border-outline-dim">
                    <th className="text-left pb-2 font-medium">GPU</th>
                    <th className="text-right pb-2 font-medium">Util</th>
                    <th className="text-right pb-2 font-medium">Memory</th>
                    <th className="text-right pb-2 font-medium">Temp</th>
                    <th className="text-right pb-2 font-medium">Power</th>
                  </tr>
                </thead>
                <tbody>
                  {gpuList.map((gpu) => (
                    <tr key={`${gpu.index}-${gpu.uuid || gpu.name}`} className="border-b border-outline-dim last:border-0">
                      <td className="py-2.5">
                        <div className="font-medium text-text">{gpu.name || `GPU ${gpu.index}`}</div>
                        <div className="text-[11px] text-text-dim font-label flex flex-wrap items-center gap-1.5">
                          {gpu.vendor || 'Unknown vendor'}
                          {gpu.driver_version ? ` • Driver ${gpu.driver_version}` : ''}
                          {gpu.utilization_source ? <SourceBadge label={gpu.utilization_source} /> : null}
                          {gpu.temperature_source ? <SourceBadge label={gpu.temperature_source} /> : null}
                        </div>
                      </td>
                      <td className="text-right text-text-dim font-label">{gpu.utilization || 0}%</td>
                      <td className="text-right text-text-dim font-label">{gpu.memory_used_mb || 0} / {gpu.memory_total_mb || 0} MB</td>
                      <td className="text-right text-text-dim font-label">{gpu.temperature > 0 ? `${gpu.temperature.toFixed(1)} °C` : '—'}</td>
                      <td className="text-right text-text-dim font-label">{gpu.power_draw_watts > 0 ? `${gpu.power_draw_watts.toFixed(1)} / ${gpu.power_limit_watts.toFixed(1)} W` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Performance Chart */}
      {history.length > 2 && chartsVisible && (
        <Suspense fallback={<ChartsSkeleton count={1} />}>
          <PerformanceHistoryChart
            history={history}
            gridColor={gridColor}
            axisColor={axisColor}
            tooltipBg={tooltipBg}
            tooltipBorder={tooltipBorder}
          />
        </Suspense>
      )}

      {/* Running Processes */}
      {runningApps.length > 0 && (
        <div className="bg-surface rounded-2xl p-5 card-hover">
          <h3 className="text-sm font-semibold font-display text-text m-0 mb-4">Active Processes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-text-dim font-label border-b border-outline-dim">
                  <th className="text-left pb-2 font-medium">App</th>
                  <th className="text-right pb-2 font-medium">Port</th>
                  <th className="text-right pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {runningApps.map((r) => (
                  <tr key={r.slug} className="border-b border-outline-dim last:border-0">
                    <td className="py-2.5 flex items-center gap-2">
                      {r.logo ? (
                        <img src={r.logo} alt="" className="w-6 h-6 rounded-md object-contain bg-surface-high p-0.5" />
                      ) : (
                        <span className="text-sm">{r.icon || '◻'}</span>
                      )}
                      <span className="font-medium text-text">{r.name}</span>
                    </td>
                    <td className="text-right text-text-dim font-label">{r.ui?.port || '—'}</td>
                    <td className="text-right">
                      {r.ready ? (
                        <span className="text-success text-xs font-label">Running</span>
                      ) : (
                        <span className="text-warning text-xs font-label animate-pulse">Starting</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, hint, badge }) {
  return (
    <div className="bg-surface rounded-2xl p-5 card-hover">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
        {badge ? <SourceBadge label={badge} /> : null}
      </div>
      <div className="mt-2 text-xl font-bold text-text font-display">{value}</div>
      {hint && <div className="mt-1 text-xs text-text-dim leading-5">{hint}</div>}
    </div>
  )
}

function ChartsSkeleton({ count }) {
  return (
    <div className={`grid gap-6 mb-8 ${count > 1 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-surface rounded-2xl p-5 card-hover animate-pulse">
          <div className="h-4 w-40 rounded bg-surface-high" />
          <div className="h-3 w-56 rounded bg-surface-high mt-2" />
          <div className="h-56 rounded-2xl bg-surface-high mt-4" />
        </div>
      ))}
    </div>
  )
}

function SourceBadge({ label }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium font-label text-primary">
      {label}
    </span>
  )
}
