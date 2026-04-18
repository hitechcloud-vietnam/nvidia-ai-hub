import { useEffect, useState } from 'react'
import { useStore } from '../store'

export default function BackupRestore() {
  const backupPreview = useStore((s) => s.backupPreview)
  const backupAction = useStore((s) => s.backupAction)
  const exportSystemBackup = useStore((s) => s.exportSystemBackup)
  const previewSystemBackupRestore = useStore((s) => s.previewSystemBackupRestore)
  const restoreSystemBackup = useStore((s) => s.restoreSystemBackup)
  const backupRestoreJob = useStore((s) => s.backupRestoreJob)
  const startSystemBackupRestore = useStore((s) => s.startSystemBackupRestore)
  const fetchBackupRestoreJob = useStore((s) => s.fetchBackupRestoreJob)

  const [activeBackupTab, setActiveBackupTab] = useState('backup')
  const [backupText, setBackupText] = useState('')
  const [backupExportMeta, setBackupExportMeta] = useState(null)

  useEffect(() => {
    if (!backupRestoreJob?.job_id) return undefined
    if (!['queued', 'running'].includes(backupRestoreJob.status)) return undefined
    const interval = window.setInterval(() => {
      fetchBackupRestoreJob(backupRestoreJob.job_id)
    }, 1500)
    return () => window.clearInterval(interval)
  }, [backupRestoreJob?.job_id, backupRestoreJob?.status, fetchBackupRestoreJob])

  const handleExportBackup = async () => {
    const result = await exportSystemBackup()
    const pretty = JSON.stringify(result.snapshot || {}, null, 2)
    setBackupText(pretty)
    setBackupExportMeta(result)
  }

  const handlePreviewRestore = async () => {
    const parsed = JSON.parse(backupText)
    await previewSystemBackupRestore(parsed)
  }

  const handleApplyRestore = async () => {
    const parsed = JSON.parse(backupText)
    await restoreSystemBackup(parsed)
  }

  const handleStartRestore = async () => {
    const parsed = JSON.parse(backupText)
    await startSystemBackupRestore(parsed)
  }

  return (
    <div className="px-6 py-6 pb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight font-display m-0">Backup & Restore</h2>
        <p className="text-sm text-text-dim m-0 mt-1 font-label">
          Export manifest backup and run restore workflows on a separate supported NVIDIA host.
        </p>
      </div>

      <div className="bg-surface rounded-2xl p-5 card-hover mb-8">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold font-display text-text m-0">Backup & Restore</h3>
            <p className="text-[11px] text-text-dim font-label m-0 mt-0.5">Tách riêng luồng export backup và restore để vận hành dễ hơn trên host mới.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveBackupTab('backup')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${activeBackupTab === 'backup' ? 'bg-primary text-primary-on' : 'border border-outline-dim bg-surface-high/50 text-text hover:bg-surface-high'}`}
            >
              Backup
            </button>
            <button
              type="button"
              onClick={() => setActiveBackupTab('restore')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${activeBackupTab === 'restore' ? 'bg-primary text-primary-on' : 'border border-outline-dim bg-surface-high/50 text-text hover:bg-surface-high'}`}
            >
              Restore
            </button>
          </div>
        </div>

        {activeBackupTab === 'backup' ? (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Export backup</div>
                  <div className="mt-1 text-sm text-text-dim">Xuất danh sách app đã cài và model inventory thành manifest JSON.</div>
                </div>
                <button type="button" onClick={handleExportBackup} disabled={backupAction === 'export'} className="rounded-xl border border-outline-dim bg-surface-high/70 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50">
                  {backupAction === 'export' ? 'Exporting...' : 'Export backup'}
                </button>
              </div>

              <textarea
                value={backupText}
                onChange={(event) => setBackupText(event.target.value)}
                className="mt-4 min-h-[360px] w-full rounded-2xl border border-outline-dim bg-surface-high/30 px-4 py-3 text-sm text-text outline-none focus:border-primary resize-y font-mono"
                placeholder="Backup JSON sẽ hiện ở đây sau khi export để bạn tải xuống, lưu trữ, hoặc chuyển sang máy khác."
              />

              {backupExportMeta?.filename ? (
                <div className="mt-2 text-xs text-text-dim">
                  Latest export saved to `data/backups/{backupExportMeta.filename}`.
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <MetricCard label="Manifest recipes" value={String((backupPreview?.installable_recipes || []).length)} hint="Số recipe trong manifest hiện tại nếu dùng cho restore" />
              <MetricCard label="Missing Ollama models" value={String(backupPreview?.model_diff?.ollama_missing_count || 0)} hint="Hiển thị khi manifest đã được preview trước đó" />
              <MetricCard label="Missing HF snapshots" value={String(backupPreview?.model_diff?.huggingface_missing_count || 0)} hint="Các snapshot cần nạp lại ở host đích" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="mb-3 rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Restore manifest</div>
                  <div className="mt-1 text-sm text-text-dim">Dán backup JSON để preview phạm vi restore, stage restore, hoặc chạy restore job.</div>
                </div>
                <textarea
                  value={backupText}
                  onChange={(event) => setBackupText(event.target.value)}
                  className="min-h-[320px] w-full rounded-2xl border border-outline-dim bg-surface-high/30 px-4 py-3 text-sm text-text outline-none focus:border-primary resize-y font-mono"
                  placeholder="Paste previously exported JSON snapshot here to preview and run restore."
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={handlePreviewRestore} disabled={!backupText || backupAction === 'preview'} className="rounded-xl border border-outline-dim bg-surface-high/70 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50">
                    {backupAction === 'preview' ? 'Previewing...' : 'Preview restore'}
                  </button>
                  <button type="button" onClick={handleApplyRestore} disabled={!backupText || backupAction === 'restore'} className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary cursor-pointer hover:bg-primary/15 disabled:opacity-50">
                    {backupAction === 'restore' ? 'Staging restore...' : 'Stage restore'}
                  </button>
                  <button type="button" onClick={handleStartRestore} disabled={!backupText || backupAction === 'restore-start'} className="rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-success cursor-pointer hover:bg-success/15 disabled:opacity-50">
                    {backupAction === 'restore-start' ? 'Starting job...' : 'Run restore job'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <MetricCard label="Recipes in manifest" value={String((backupPreview?.installable_recipes || []).length)} hint="Recipes present in the current registry and ready for staging" />
                <MetricCard label="Missing recipes" value={String((backupPreview?.missing_recipes || []).length)} hint="Backup entries not found in the current registry" />
                <MetricCard label="Missing Ollama models" value={String(backupPreview?.model_diff?.ollama_missing_count || 0)} hint="Saved to an Ollama restore plan for operator review" />
                <MetricCard label="Missing HF snapshots" value={String(backupPreview?.model_diff?.huggingface_missing_count || 0)} hint="Queued into the local Hugging Face intake workflow" />
              </div>
            </div>

            {backupPreview ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Installable recipes</div>
                  <ul className="m-0 mt-3 pl-5 text-sm text-text-dim space-y-1.5">
                    {(backupPreview.installable_recipes || []).map((item) => (
                      <li key={item.slug}>{item.name || item.slug} <span className="text-text-dim/70">({item.slug})</span></li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Warnings</div>
                  <ul className="m-0 mt-3 pl-5 text-sm text-text-dim space-y-1.5">
                    {(backupPreview.warnings || []).length > 0
                      ? backupPreview.warnings.map((item) => <li key={item}>{item}</li>)
                      : <li>No blocking warnings detected.</li>}
                  </ul>
                </div>
              </div>
            ) : null}

            {backupRestoreJob ? (
              <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Restore job</div>
                    <div className="mt-1 text-sm font-semibold text-text">{backupRestoreJob.job_id}</div>
                  </div>
                  <div className="text-sm text-text-dim">
                    Status: <span className="font-semibold text-text">{backupRestoreJob.status}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-text-dim font-label uppercase tracking-[0.16em]">
                    <span>Overall progress</span>
                    <span>{backupRestoreJob.progress_completed || 0}/{backupRestoreJob.progress_total || 0}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-high/60">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, backupRestoreJob.progress_percent || 0))}%` }} />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <MetricCard label="Recipes total" value={String(backupRestoreJob.recipes_total || 0)} hint="Planned installs from the backup manifest" />
                  <MetricCard label="Completed" value={String(backupRestoreJob.recipes_completed || 0)} hint="Recipes restored successfully so far" />
                  <MetricCard label="Failed" value={String((backupRestoreJob.recipes_failed || []).length)} hint="Recipes that need manual attention" />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <MetricCard label="Ollama pulls" value={String(backupRestoreJob.ollama_total || 0)} hint="Planned shared-runtime model replay steps" />
                  <MetricCard label="Ollama done" value={String(backupRestoreJob.ollama_completed || 0)} hint="Models restored through the Ollama management API" />
                  <MetricCard label="Ollama failed" value={String((backupRestoreJob.ollama_failed || []).length)} hint="Model replays that need manual retry" />
                </div>
                {(backupRestoreJob.staged?.model_restore?.ollama_missing_models || []).length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Ollama replay</div>
                    <div className="mt-2 text-sm text-text-dim">
                      Planned model pulls: {(backupRestoreJob.staged?.model_restore?.ollama_missing_models || []).join(', ')}
                    </div>
                    {(backupRestoreJob.ollama_restored_models || []).length > 0 ? (
                      <div className="mt-2 text-sm text-text-dim">
                        Restored models: {(backupRestoreJob.ollama_restored_models || []).join(', ')}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {(backupRestoreJob.recipes_skipped || []).length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Skipped items</div>
                    <ul className="m-0 mt-3 pl-5 text-sm text-text-dim space-y-1.5">
                      {backupRestoreJob.recipes_skipped.map((item, index) => (
                        <li key={`${index}-${item.slug || item.name || 'skip'}`}>
                          {item.slug || item.name || 'Unknown'}{item.reason ? `: ${item.reason}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(backupRestoreJob.recipe_steps || []).length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Recipe step history</div>
                    <div className="mt-3 space-y-2">
                      {backupRestoreJob.recipe_steps.map((item) => (
                        <div key={item.key || item.slug} className="rounded-xl border border-outline-dim bg-surface-high/20 px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-text">{item.slug}</div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-text-dim font-label">{item.status}</div>
                          </div>
                          <div className="mt-1 text-xs text-text-dim">Phase: {item.phase || 'n/a'}</div>
                          {item.details ? <div className="mt-1 text-xs text-text-dim">{item.details}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {(backupRestoreJob.ollama_steps || []).length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Ollama step history</div>
                    <div className="mt-3 space-y-2">
                      {backupRestoreJob.ollama_steps.map((item) => (
                        <div key={item.key || item.name} className="rounded-xl border border-outline-dim bg-surface-high/20 px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-text">{item.name}</div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-text-dim font-label">{item.status}</div>
                          </div>
                          {item.details ? <div className="mt-1 text-xs text-text-dim">{item.details}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Recent logs</div>
                    <div className="mt-3 max-h-64 overflow-auto rounded-xl bg-surface-high/40 p-3 text-xs text-text-dim font-mono space-y-1">
                      {(backupRestoreJob.logs || []).length > 0
                        ? backupRestoreJob.logs.slice(-80).map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
                        : <div>No logs yet.</div>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">Failures</div>
                    <ul className="m-0 mt-3 pl-5 text-sm text-text-dim space-y-1.5">
                      {(backupRestoreJob.recipes_failed || []).length > 0
                        ? backupRestoreJob.recipes_failed.map((item) => <li key={`${item.slug}-${item.error}`}>{item.slug}: {item.error}</li>)
                        : <li>No restore failures reported.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="bg-surface rounded-2xl p-5 card-hover">
      <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="mt-2 text-xl font-bold text-text font-display">{value}</div>
      {hint ? <div className="mt-1 text-xs text-text-dim leading-5">{hint}</div> : null}
    </div>
  )
}
