import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

export default function BackupRestore() {
  const { t } = useTranslation()
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
        <h2 className="text-2xl font-bold tracking-tight font-display m-0">{t('backup.title')}</h2>
        <p className="text-sm text-text-dim m-0 mt-1 font-label">
          {t('backup.subtitle')}
        </p>
      </div>

      <div className="bg-surface rounded-2xl p-5 card-hover mb-8">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold font-display text-text m-0">{t('backup.sectionTitle')}</h3>
            <p className="text-[11px] text-text-dim font-label m-0 mt-0.5">{t('backup.sectionBody')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveBackupTab('backup')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${activeBackupTab === 'backup' ? 'bg-primary text-primary-on' : 'border border-outline-dim bg-surface-high/50 text-text hover:bg-surface-high'}`}
            >
              {t('backup.backup')}
            </button>
            <button
              type="button"
              onClick={() => setActiveBackupTab('restore')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${activeBackupTab === 'restore' ? 'bg-primary text-primary-on' : 'border border-outline-dim bg-surface-high/50 text-text hover:bg-surface-high'}`}
            >
              {t('backup.restore')}
            </button>
          </div>
        </div>

        {activeBackupTab === 'backup' ? (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.exportBackup')}</div>
                  <div className="mt-1 text-sm text-text-dim">{t('backup.exportBody')}</div>
                </div>
                <button type="button" onClick={handleExportBackup} disabled={backupAction === 'export'} className="rounded-xl border border-outline-dim bg-surface-high/70 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50">
                  {backupAction === 'export' ? t('backup.exporting') : t('backup.exportBackup')}
                </button>
              </div>

              <textarea
                value={backupText}
                onChange={(event) => setBackupText(event.target.value)}
                className="mt-4 min-h-[360px] w-full rounded-2xl border border-outline-dim bg-surface-high/30 px-4 py-3 text-sm text-text outline-none focus:border-primary resize-y font-mono"
                placeholder={t('backup.backupPlaceholder')}
              />

              {backupExportMeta?.filename ? (
                <div className="mt-2 text-xs text-text-dim">
                  {t('backup.latestExport', { filename: backupExportMeta.filename })}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <MetricCard label={t('backup.manifestRecipes')} value={String((backupPreview?.installable_recipes || []).length)} hint="" />
              <MetricCard label={t('backup.missingOllamaModels')} value={String(backupPreview?.model_diff?.ollama_missing_count || 0)} hint="" />
              <MetricCard label={t('backup.missingSnapshots')} value={String(backupPreview?.model_diff?.huggingface_missing_count || 0)} hint="" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="mb-3 rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.restoreManifest')}</div>
                  <div className="mt-1 text-sm text-text-dim">{t('backup.restoreBody')}</div>
                </div>
                <textarea
                  value={backupText}
                  onChange={(event) => setBackupText(event.target.value)}
                  className="min-h-[320px] w-full rounded-2xl border border-outline-dim bg-surface-high/30 px-4 py-3 text-sm text-text outline-none focus:border-primary resize-y font-mono"
                  placeholder={t('backup.restorePlaceholder')}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={handlePreviewRestore} disabled={!backupText || backupAction === 'preview'} className="rounded-xl border border-outline-dim bg-surface-high/70 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50">
                    {backupAction === 'preview' ? t('backup.previewing') : t('backup.previewRestore')}
                  </button>
                  <button type="button" onClick={handleApplyRestore} disabled={!backupText || backupAction === 'restore'} className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary cursor-pointer hover:bg-primary/15 disabled:opacity-50">
                    {backupAction === 'restore' ? t('backup.stagingRestore') : t('backup.stageRestore')}
                  </button>
                  <button type="button" onClick={handleStartRestore} disabled={!backupText || backupAction === 'restore-start'} className="rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-success cursor-pointer hover:bg-success/15 disabled:opacity-50">
                    {backupAction === 'restore-start' ? t('backup.startingJob') : t('backup.runRestoreJob')}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <MetricCard label={t('backup.recipesInManifest')} value={String((backupPreview?.installable_recipes || []).length)} hint={t('backup.recipesInManifestHint')} />
                <MetricCard label={t('backup.missingRecipes')} value={String((backupPreview?.missing_recipes || []).length)} hint={t('backup.missingRecipesHint')} />
                <MetricCard label={t('backup.missingOllamaModels')} value={String(backupPreview?.model_diff?.ollama_missing_count || 0)} hint={t('backup.missingOllamaModelsHint')} />
                <MetricCard label={t('backup.missingSnapshots')} value={String(backupPreview?.model_diff?.huggingface_missing_count || 0)} hint={t('backup.missingSnapshotsHint')} />
              </div>
            </div>

            {backupPreview ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.installableRecipes')}</div>
                  <ul className="m-0 mt-3 pl-5 text-sm text-text-dim space-y-1.5">
                    {(backupPreview.installable_recipes || []).map((item) => (
                      <li key={item.slug}>{item.name || item.slug} <span className="text-text-dim/70">({item.slug})</span></li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.warnings')}</div>
                  <ul className="m-0 mt-3 pl-5 text-sm text-text-dim space-y-1.5">
                    {(backupPreview.warnings || []).length > 0
                      ? backupPreview.warnings.map((item) => <li key={item}>{item}</li>)
                      : <li>{t('backup.noBlockingWarnings')}</li>}
                  </ul>
                </div>
              </div>
            ) : null}

            {backupRestoreJob ? (
              <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-high/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.restoreJob')}</div>
                    <div className="mt-1 text-sm font-semibold text-text">{backupRestoreJob.job_id}</div>
                  </div>
                  <div className="text-sm text-text-dim">
                    {t('system.status')}: <span className="font-semibold text-text">{backupRestoreJob.status}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-text-dim font-label uppercase tracking-[0.16em]">
                    <span>{t('backup.overallProgress')}</span>
                    <span>{backupRestoreJob.progress_completed || 0}/{backupRestoreJob.progress_total || 0}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-high/60">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, backupRestoreJob.progress_percent || 0))}%` }} />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <MetricCard label={t('backup.recipesTotal')} value={String(backupRestoreJob.recipes_total || 0)} hint={t('backup.recipesTotalHint')} />
                  <MetricCard label={t('backup.completed')} value={String(backupRestoreJob.recipes_completed || 0)} hint={t('backup.completedHint')} />
                  <MetricCard label={t('backup.failed')} value={String((backupRestoreJob.recipes_failed || []).length)} hint={t('backup.failedHint')} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <MetricCard label={t('backup.ollamaPulls')} value={String(backupRestoreJob.ollama_total || 0)} hint={t('backup.ollamaPullsHint')} />
                  <MetricCard label={t('backup.ollamaDone')} value={String(backupRestoreJob.ollama_completed || 0)} hint={t('backup.ollamaDoneHint')} />
                  <MetricCard label={t('backup.ollamaFailed')} value={String((backupRestoreJob.ollama_failed || []).length)} hint={t('backup.ollamaFailedHint')} />
                </div>
                {(backupRestoreJob.staged?.model_restore?.ollama_missing_models || []).length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.ollamaReplay')}</div>
                    <div className="mt-2 text-sm text-text-dim">
                      {t('backup.plannedModelPulls')}: {(backupRestoreJob.staged?.model_restore?.ollama_missing_models || []).join(', ')}
                    </div>
                    {(backupRestoreJob.ollama_restored_models || []).length > 0 ? (
                      <div className="mt-2 text-sm text-text-dim">
                        {t('backup.restoredModels')}: {(backupRestoreJob.ollama_restored_models || []).join(', ')}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {(backupRestoreJob.recipes_skipped || []).length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.skippedItems')}</div>
                    <ul className="m-0 mt-3 pl-5 text-sm text-text-dim space-y-1.5">
                      {backupRestoreJob.recipes_skipped.map((item, index) => (
                        <li key={`${index}-${item.slug || item.name || 'skip'}`}>
                          {item.slug || item.name || t('backup.unknown')}{item.reason ? `: ${item.reason}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(backupRestoreJob.recipe_steps || []).length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.recipeStepHistory')}</div>
                    <div className="mt-3 space-y-2">
                      {backupRestoreJob.recipe_steps.map((item) => (
                        <div key={item.key || item.slug} className="rounded-xl border border-outline-dim bg-surface-high/20 px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-text">{item.slug}</div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-text-dim font-label">{item.status}</div>
                          </div>
                          <div className="mt-1 text-xs text-text-dim">{t('backup.phase')}: {item.phase || t('backup.notAvailable')}</div>
                          {item.details ? <div className="mt-1 text-xs text-text-dim">{item.details}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {(backupRestoreJob.ollama_steps || []).length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.ollamaStepHistory')}</div>
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
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.recentLogs')}</div>
                    <div className="mt-3 max-h-64 overflow-auto rounded-xl bg-surface-high/40 p-3 text-xs text-text-dim font-mono space-y-1">
                      {(backupRestoreJob.logs || []).length > 0
                        ? backupRestoreJob.logs.slice(-80).map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
                        : <div>{t('backup.noLogsYet')}</div>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-outline-dim bg-surface p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-dim font-label">{t('backup.failures')}</div>
                    <ul className="m-0 mt-3 pl-5 text-sm text-text-dim space-y-1.5">
                      {(backupRestoreJob.recipes_failed || []).length > 0
                        ? backupRestoreJob.recipes_failed.map((item) => <li key={`${item.slug}-${item.error}`}>{item.slug}: {item.error}</li>)
                        : <li>{t('backup.noRestoreFailures')}</li>}
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
