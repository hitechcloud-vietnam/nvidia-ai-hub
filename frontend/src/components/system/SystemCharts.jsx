import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function SystemGpuChartsSection({ history, gpuList, gpuPalette, gridColor, axisColor, tooltipBg, tooltipBorder }) {
  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <MetricHistoryChart
          title="Per-GPU Utilization"
          subtitle="Individual GPU activity over the last 60 seconds"
          history={history}
          lines={gpuList.map((gpu, index) => ({
            key: `gpu_${gpu.index}`,
            name: gpu.name || `GPU ${gpu.index}`,
            color: gpuPalette[index % gpuPalette.length],
          }))}
          gridColor={gridColor}
          axisColor={axisColor}
          tooltipBg={tooltipBg}
          tooltipBorder={tooltipBorder}
          domain={[0, 100]}
        />

        <MetricHistoryChart
          title="Per-GPU Temperature"
          subtitle="Thermal trend for each GPU sensor source"
          history={history}
          lines={gpuList.map((gpu, index) => ({
            key: `gpu_temp_${gpu.index}`,
            name: `${gpu.name || `GPU ${gpu.index}`} Temp`,
            color: gpuPalette[index % gpuPalette.length],
          }))}
          gridColor={gridColor}
          axisColor={axisColor}
          tooltipBg={tooltipBg}
          tooltipBorder={tooltipBorder}
          domain={[0, 110]}
        />
      </div>

      <MetricHistoryChart
        title="Per-GPU Memory Usage"
        subtitle="VRAM usage percentage over the last 60 seconds"
        history={history}
        lines={gpuList.map((gpu, index) => ({
          key: `gpu_mem_${gpu.index}`,
          name: `${gpu.name || `GPU ${gpu.index}`} Memory %`,
          color: gpuPalette[index % gpuPalette.length],
        }))}
        gridColor={gridColor}
        axisColor={axisColor}
        tooltipBg={tooltipBg}
        tooltipBorder={tooltipBorder}
        domain={[0, 100]}
      />
    </>
  )
}

export function MetricHistoryChart({ title, subtitle, history, lines, gridColor, axisColor, tooltipBg, tooltipBorder, domain }) {
  return (
    <div className="bg-surface rounded-2xl p-5 card-hover mb-8">
      <div className="mb-4">
        <h3 className="text-sm font-semibold font-display text-text m-0">{title}</h3>
        <p className="text-[11px] text-text-dim font-label m-0 mt-0.5">{subtitle}</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="time" stroke={axisColor} tick={{ fontSize: 9, fontFamily: 'Space Grotesk' }} />
          <YAxis stroke={axisColor} tick={{ fontSize: 9, fontFamily: 'Space Grotesk' }} domain={domain} />
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
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              name={line.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PerformanceHistoryChart({ history, gridColor, axisColor, tooltipBg, tooltipBorder }) {
  return (
    <div className="bg-surface rounded-2xl p-5 card-hover mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold font-display text-text m-0">Performance History</h3>
          <p className="text-[11px] text-text-dim font-label m-0 mt-0.5">Last 60 seconds</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-label text-primary">
            <span className="w-3 h-0.5 bg-primary rounded" /> CPU %
          </span>
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
          <Line type="monotone" dataKey="cpu" stroke="var(--primary)" strokeWidth={2} dot={false} name="CPU %" />
          <Line type="monotone" dataKey="gpu" stroke="var(--tertiary)" strokeWidth={2} dot={false} name="GPU %" />
          <Line type="monotone" dataKey="temp" stroke="#FBBF24" strokeWidth={2} dot={false} name="Temp °C" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
