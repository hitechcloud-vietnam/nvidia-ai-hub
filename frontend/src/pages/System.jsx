import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
  const recipes = useStore((s) => s.recipes)
  const theme = useStore((s) => s.theme)
  const [history, setHistory] = useState([])

  const runningApps = recipes.filter((r) => r.running || r.starting)

  useEffect(() => {
    if (!metrics) return
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
          gpu: metrics.gpu_utilization,
          temp: metrics.gpu_temperature,
        },
      ]
      return next.slice(-60)
    })
  }, [metrics])

  if (!metrics) {
    return (
      <div className="p-6 text-center text-text-dim py-20 animate-fadeIn">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-base font-semibold font-display">Waiting for metrics...</div>
      </div>
    )
  }

  const ramPct = metrics.ram_total_gb > 0 ? (metrics.ram_used_gb / metrics.ram_total_gb) * 100 : 0
  const gridColor = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'
  const axisColor = theme === 'light' ? '#8a8a9a' : '#6E6C7A'
  const tooltipBg = theme === 'light' ? '#ffffff' : '#161625'
  const tooltipBorder = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  const tempColor = metrics.gpu_temperature > 80 ? 'var(--error)' : '#FBBF24'

  return (
    <div className="px-6 py-6 pb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight font-display m-0">System Monitor</h2>
        <p className="text-sm text-text-dim m-0 mt-1 font-label">
          {metrics.gpu_name || 'NVIDIA DGX Spark'} — {metrics.ram_total_gb} GB Unified Memory
        </p>
      </div>

      {/* Circular Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CircularGauge
          value={metrics.gpu_utilization} max={100}
          label="GPU" sublabel={metrics.gpu_name || 'Blackwell'}
          unit="%" color="var(--tertiary)"
        />
        <CircularGauge
          value={metrics.ram_used_gb} max={metrics.ram_total_gb}
          label="RAM" sublabel={`of ${metrics.ram_total_gb} GB`}
          unit="GB" color="var(--tertiary)"
        />
        <CircularGauge
          value={metrics.disk_free_gb} max={metrics.disk_total_gb}
          label="Disk Free" sublabel={`of ${metrics.disk_total_gb} GB`}
          unit="GB" color="var(--primary)"
        />
        <CircularGauge
          value={metrics.gpu_temperature} max={100}
          label="Temperature" sublabel={metrics.gpu_temperature > 80 ? 'Warning' : 'Normal'}
          unit="°C" color={tempColor}
        />
      </div>

      {/* Performance Chart */}
      {history.length > 2 && (
        <div className="bg-surface rounded-2xl p-5 card-hover mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold font-display text-text m-0">Performance History</h3>
              <p className="text-[11px] text-text-dim font-label m-0 mt-0.5">Last 60 seconds</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-label text-tertiary">
                <span className="w-3 h-0.5 bg-tertiary rounded" /> GPU %
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-label text-warning">
                <span className="w-3 h-0.5 bg-warning rounded" /> Temp °C
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="time" stroke={axisColor} tick={{ fontSize: 9, fontFamily: 'Space Grotesk' }} />
              <YAxis stroke={axisColor} tick={{ fontSize: 9, fontFamily: 'Space Grotesk' }} />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 12,
                  fontFamily: 'Space Grotesk',
                  fontSize: 12,
                }}
                labelStyle={{ color: axisColor }}
              />
              <Line type="monotone" dataKey="gpu" stroke="var(--tertiary)" strokeWidth={2} dot={false} name="GPU %" />
              <Line type="monotone" dataKey="temp" stroke="#FBBF24" strokeWidth={2} dot={false} name="Temp °C" />
            </LineChart>
          </ResponsiveContainer>
        </div>
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
