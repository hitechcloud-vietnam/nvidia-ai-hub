import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useStore } from '../store'

const DEFAULT_FORM = {
  id: null,
  name: '',
  protocol: 'ssh',
  host: '',
  port: '22',
  username: '',
  remotePath: '',
  description: '',
  passwordHint: '',
}

const PROTOCOLS = [
  { value: 'ssh', port: '22' },
  { value: 'sftp', port: '22' },
  { value: 'rdp', port: '3389' },
  { value: 'vnc', port: '5900' },
  { value: 'http', port: '80' },
  { value: 'https', port: '443' },
]

export default function RemoteTerminal() {
  const { t } = useTranslation()
  const remoteSessions = useStore((state) => state.remoteSessions)
  const remoteTerminalTabs = useStore((state) => state.remoteTerminalTabs)
  const activeRemoteTabId = useStore((state) => state.activeRemoteTabId)
  const remoteTerminalOutput = useStore((state) => state.remoteTerminalOutput)
  const remoteTerminalStatus = useStore((state) => state.remoteTerminalStatus)
  const fetchRemoteSessions = useStore((state) => state.fetchRemoteSessions)
  const saveRemoteSession = useStore((state) => state.saveRemoteSession)
  const deleteRemoteSession = useStore((state) => state.deleteRemoteSession)
  const openRemoteTerminalTab = useStore((state) => state.openRemoteTerminalTab)
  const closeRemoteTerminalTab = useStore((state) => state.closeRemoteTerminalTab)
  const setActiveRemoteTerminalTab = useStore((state) => state.setActiveRemoteTerminalTab)
  const connectRemoteTerminal = useStore((state) => state.connectRemoteTerminal)
  const disconnectRemoteTerminal = useStore((state) => state.disconnectRemoteTerminal)
  const sendRemoteTerminalInput = useStore((state) => state.sendRemoteTerminalInput)
  const resizeRemoteTerminal = useStore((state) => state.resizeRemoteTerminal)
  const launchRemoteSessionNative = useStore((state) => state.launchRemoteSessionNative)
  const saveRemoteSessionRdp = useStore((state) => state.saveRemoteSessionRdp)

  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [launchPreview, setLaunchPreview] = useState(null)
  const [connectionSecret, setConnectionSecret] = useState('')
  const [feedback, setFeedback] = useState('')
  const terminalHostRef = useRef(null)
  const xtermRef = useRef(null)
  const fitAddonRef = useRef(null)
  const renderedOutputLengthRef = useRef(0)

  useEffect(() => {
    fetchRemoteSessions({ force: true })
  }, [fetchRemoteSessions])

  useEffect(() => {
    if (!remoteSessions.length) {
      setSelectedId(null)
      setForm(DEFAULT_FORM)
      return
    }

    const selected = remoteSessions.find((item) => item.id === selectedId)
    const next = selected || remoteSessions[0]
    setSelectedId(next.id)
    setForm(mapSessionToForm(next))
  }, [remoteSessions, selectedId])

  const selectedSession = useMemo(
    () => remoteSessions.find((session) => session.id === selectedId) || null,
    [remoteSessions, selectedId],
  )
  const activeTab = useMemo(
    () => remoteTerminalTabs.find((tab) => tab.id === activeRemoteTabId) || null,
    [remoteTerminalTabs, activeRemoteTabId],
  )
  const activeSession = useMemo(
    () => remoteSessions.find((session) => session.id === activeTab?.sessionId) || null,
    [remoteSessions, activeTab],
  )
  const activeOutput = useMemo(
    () => (activeTab ? remoteTerminalOutput[activeTab.id] || [] : []),
    [activeTab, remoteTerminalOutput],
  )
  const activeStatus = useMemo(
    () => (activeTab ? remoteTerminalStatus[activeTab.id] || {} : {}),
    [activeTab, remoteTerminalStatus],
  )

  const protocolStats = useMemo(() => {
    const counts = { ssh: 0, rdp: 0, web: 0 }
    remoteSessions.forEach((session) => {
      if (session.protocol === 'ssh' || session.protocol === 'sftp') counts.ssh += 1
      else if (session.protocol === 'rdp' || session.protocol === 'vnc') counts.rdp += 1
      else counts.web += 1
    })
    return counts
  }, [remoteSessions])

  const canSave = form.name.trim() && form.host.trim()

  useEffect(() => {
    let cancelled = false

    async function loadLaunchPreview() {
      if (!selectedSession?.id) {
        setLaunchPreview(buildFallbackPreview(form))
        return
      }

      try {
        const res = await fetch(`/api/remote-sessions/${selectedSession.id}/launch`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
        if (!cancelled) {
          setLaunchPreview({
            ...data.launch,
            session: data.session,
            title: data.session?.name || data.launch?.target,
          })
        }
      } catch {
        if (!cancelled) setLaunchPreview(buildFallbackPreview(selectedSession))
      }
    }

    loadLaunchPreview()
    return () => {
      cancelled = true
    }
  }, [selectedSession, form])

  useEffect(() => {
    if (!terminalHostRef.current || !activeTab) {
      disposeTerminal(xtermRef, fitAddonRef)
      renderedOutputLengthRef.current = 0
      return undefined
    }

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      theme: {
        background: '#09111f',
        foreground: '#d7e3ff',
        cursor: '#9fd3ff',
      },
      scrollback: 5000,
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalHostRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon
    renderedOutputLengthRef.current = 0

    if (activeOutput.length) {
      term.write(activeOutput.join(''))
      renderedOutputLengthRef.current = activeOutput.length
    }

    const dataDisposable = term.onData((data) => {
      if (activeSession?.id) sendRemoteTerminalInput(activeSession.id, data)
    })
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      if (activeSession?.id) resizeRemoteTerminal(activeSession.id, cols, rows)
    })

    const handleResize = () => {
      fitAddon.fit()
      if (activeSession?.id) resizeRemoteTerminal(activeSession.id, term.cols, term.rows)
    }

    window.addEventListener('resize', handleResize)
    window.setTimeout(handleResize, 10)

    return () => {
      window.removeEventListener('resize', handleResize)
      dataDisposable.dispose()
      resizeDisposable.dispose()
      disposeTerminal(xtermRef, fitAddonRef)
    }
  }, [activeTab, activeSession, activeOutput, resizeRemoteTerminal, sendRemoteTerminalInput])

  useEffect(() => {
    const term = xtermRef.current
    if (!term || !activeTab) return
    const alreadyRendered = renderedOutputLengthRef.current
    if (activeOutput.length > alreadyRendered) {
      term.write(activeOutput.slice(alreadyRendered).join(''))
      renderedOutputLengthRef.current = activeOutput.length
    }
  }, [activeOutput, activeTab])

  const handleChange = (key, value) => {
    if (key === 'protocol') {
      const defaultPort = defaultPortFor(value)
      setForm((current) => ({ ...current, protocol: value, port: defaultPort }))
      return
    }
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleNew = () => {
    setSelectedId(null)
    setForm(DEFAULT_FORM)
    setFeedback('')
  }

  const handleSelect = (session) => {
    setSelectedId(session.id)
    setForm(mapSessionToForm(session))
    setFeedback('')
  }

  const handleSave = async () => {
    if (!canSave) return
    setFeedback('')

    try {
      const result = await saveRemoteSession({
        id: form.id || undefined,
        name: form.name.trim(),
        protocol: form.protocol,
        host: form.host.trim(),
        port: form.port ? Number(form.port) : undefined,
        username: form.username.trim(),
        remote_path: form.remotePath.trim(),
        description: form.description.trim(),
        password_hint: form.passwordHint.trim(),
      })
      setSelectedId(result.session.id)
      setForm(mapSessionToForm(result.session))
      setLaunchPreview({ ...result.launch, session: result.session, title: result.session.name || result.launch.target })
      setFeedback(t('terminal.feedbackSaved'))
    } catch (error) {
      setFeedback(error.message || t('terminal.feedbackSaveFailed'))
    }
  }

  const handleDelete = async () => {
    if (!form.id) return
    setFeedback('')

    try {
      await deleteRemoteSession(form.id)
      setFeedback(t('terminal.feedbackDeleted'))
      setConnectionSecret('')
    } catch (error) {
      setFeedback(error.message || t('terminal.feedbackDeleteFailed'))
    }
  }

  const handleOpenEmbedded = () => {
    if (!selectedSession) return
    if (selectedSession.protocol !== 'ssh') {
      setFeedback(t('terminal.nativeOnlyBody'))
      return
    }
    openRemoteTerminalTab(selectedSession, { activate: true })
    connectRemoteTerminal(selectedSession, { password: connectionSecret, force: true })
    setFeedback(t('terminal.feedbackEmbeddedOpened'))
  }

  const handleNativeLaunch = async () => {
    if (!launchPreview) return
    setFeedback('')

    try {
      await launchRemoteSessionNative({
        protocol: selectedSession?.protocol || form.protocol,
        host: selectedSession?.host || form.host,
        port: selectedSession?.port || Number(form.port || 0),
        username: selectedSession?.username || form.username,
        ...launchPreview,
      })
      setFeedback(t('terminal.feedbackNativeOpened'))
    } catch (error) {
      setFeedback(error.message || t('terminal.feedbackNativeFailed'))
    }
  }

  const handleSaveRdp = async () => {
    if (!launchPreview?.rdpFile) return
    setFeedback('')

    try {
      await saveRemoteSessionRdp({
        protocol: selectedSession?.protocol || form.protocol,
        host: selectedSession?.host || form.host,
        rdpFile: launchPreview.rdpFile,
      })
      setFeedback(t('terminal.feedbackRdpSaved'))
    } catch (error) {
      setFeedback(error.message || t('terminal.feedbackRdpFailed'))
    }
  }

  const handleCopyCommand = async () => {
    if (!launchPreview?.command) return

    try {
      await copyText(launchPreview.command)
      setFeedback(t('terminal.copied'))
    } catch (error) {
      setFeedback(error.message || t('terminal.feedbackNativeFailed'))
    }
  }

  const handleOpenBrowserTarget = async () => {
    if (!launchPreview?.openUrl) return

    try {
      if (window.desktopRuntime?.openExternalUrl) {
        await window.desktopRuntime.openExternalUrl(launchPreview.openUrl)
        setFeedback(t('terminal.feedbackNativeOpened'))
        return
      }
      window.open(launchPreview.openUrl, '_blank', 'noopener,noreferrer')
      setFeedback(t('terminal.feedbackNativeOpened'))
    } catch (error) {
      setFeedback(error.message || t('terminal.feedbackNativeFailed'))
    }
  }

  return (
    <div className="px-6 py-6 pb-12 animate-fadeIn">
      <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-label">{t('terminal.eyebrow')}</div>
            <h1 className="m-0 mt-2 text-2xl font-bold tracking-tight text-text font-display">{t('terminal.title')}</h1>
            <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-text-dim">{t('terminal.subtitle')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile label={t('terminal.savedSessions')} value={String(remoteSessions.length)} />
            <InfoTile label={t('terminal.sshFamily')} value={String(protocolStats.ssh)} />
            <InfoTile label={t('terminal.desktopFamily')} value={String(protocolStats.rdp)} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-outline-dim bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-bold text-text font-display">{t('terminal.connectionProfiles')}</h2>
                <p className="m-0 mt-1 text-sm leading-6 text-text-dim">{t('terminal.connectionProfilesBody')}</p>
              </div>
              <button type="button" onClick={handleNew} className="rounded-xl border border-outline-dim bg-surface-high/60 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high">
                {t('terminal.newSession')}
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={t('terminal.name')}><input value={form.name} onChange={(event) => handleChange('name', event.target.value)} className={inputClassName} placeholder={t('terminal.namePlaceholder')} /></Field>
              <Field label={t('terminal.protocol')}><select value={form.protocol} onChange={(event) => handleChange('protocol', event.target.value)} className={inputClassName}>{PROTOCOLS.map((item) => <option key={item.value} value={item.value}>{t(`terminal.protocolNames.${item.value}`)}</option>)}</select></Field>
              <Field label={t('terminal.host')}><input value={form.host} onChange={(event) => handleChange('host', event.target.value)} className={inputClassName} placeholder={t('terminal.hostPlaceholder')} /></Field>
              <Field label={t('terminal.port')}><input value={form.port} onChange={(event) => handleChange('port', event.target.value)} className={inputClassName} placeholder={defaultPortFor(form.protocol)} /></Field>
              <Field label={t('terminal.username')}><input value={form.username} onChange={(event) => handleChange('username', event.target.value)} className={inputClassName} placeholder={t('terminal.usernamePlaceholder')} /></Field>
              <Field label={t('terminal.remotePath')}><input value={form.remotePath} onChange={(event) => handleChange('remotePath', event.target.value)} className={inputClassName} placeholder={t('terminal.remotePathPlaceholder')} /></Field>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label={t('terminal.passwordOptional')}><input value={form.passwordHint} onChange={(event) => handleChange('passwordHint', event.target.value)} className={inputClassName} placeholder={t('terminal.passwordPlaceholder')} /></Field>
              <Field label={t('terminal.description')}><textarea value={form.description} onChange={(event) => handleChange('description', event.target.value)} className={`${inputClassName} min-h-[92px] resize-y`} placeholder={t('terminal.descriptionPlaceholder')} /></Field>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={handleSave} disabled={!canSave} className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">{form.id ? t('terminal.updateSession') : t('terminal.saveSession')}</button>
              {form.id ? <button type="button" onClick={handleDelete} className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger cursor-pointer hover:bg-danger/15">{t('terminal.deleteSession')}</button> : null}
            </div>

            {feedback ? <div className="mt-4 rounded-2xl border border-outline-dim bg-surface-high/30 px-4 py-3 text-sm text-text-dim">{feedback}</div> : null}
          </section>

          <section className="rounded-3xl border border-outline-dim bg-surface p-5">
            <div>
              <h2 className="m-0 text-lg font-bold text-text font-display">{t('terminal.savedConnections')}</h2>
              <p className="m-0 mt-1 text-sm leading-6 text-text-dim">{t('terminal.savedConnectionsBody')}</p>
            </div>

            {remoteSessions.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-outline-dim bg-surface-high/30 px-4 py-8 text-center text-sm text-text-dim">
                {t('terminal.noSessions')}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {remoteSessions.map((session) => {
                  const isActive = session.id === selectedId
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelect(session)}
                      className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${isActive ? 'border-primary/30 bg-primary/5 shadow-[0_12px_30px_rgba(0,0,0,0.16)]' : 'border-outline-dim bg-surface-high/30 hover:border-outline-dim/80'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-text">{session.name}</div>
                          <div className="mt-1 text-xs text-text-dim">{session.username ? `${session.username}@` : ''}{session.host}</div>
                        </div>
                        <span className="rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-label text-text-dim">{t(`terminal.protocolNames.${session.protocol}`)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-outline-dim bg-surface p-5">
            <h2 className="m-0 text-lg font-bold text-text font-display">{t('terminal.livePreview')}</h2>
            <p className="m-0 mt-1 text-sm leading-6 text-text-dim">{t('terminal.livePreviewBody')}</p>

            <div className="mt-5 rounded-2xl border border-outline-dim bg-[#09111f] p-4 shadow-inner">
              <div className="flex items-center gap-2 text-[11px] font-label text-text-dim">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
                <span className="ml-2 truncate">{launchPreview?.title || t('terminal.commandPlaceholder')}</span>
              </div>
              <pre className="m-0 mt-4 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[#D7E3FF]">{launchPreview?.command || t('terminal.commandPlaceholder')}</pre>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoTile label={t('terminal.connectTarget')} value={launchPreview?.target || '-'} />
              <InfoTile label={t('terminal.launchMode')} value={String((selectedSession?.protocol || form.protocol || 'ssh')).toUpperCase()} />
            </div>

            <div className="mt-5 grid gap-4">
              <Field label={t('terminal.sshPasswordHint')}><input value={connectionSecret} type="password" onChange={(event) => setConnectionSecret(event.target.value)} className={inputClassName} placeholder={t('terminal.sshPasswordHintPlaceholder')} /></Field>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={handleOpenEmbedded} disabled={!selectedSession || selectedSession.protocol !== 'ssh'} className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">{t('terminal.openEmbeddedSsh')}</button>
              <button type="button" onClick={handleNativeLaunch} disabled={!launchPreview?.command} className="rounded-xl border border-outline-dim bg-surface-high/60 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50">{t('terminal.launchNative')}</button>
              <button type="button" onClick={handleCopyCommand} disabled={!launchPreview?.command} className="rounded-xl border border-outline-dim bg-surface-high/60 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50">{t('terminal.copyCommand')}</button>
              {launchPreview?.rdpFile ? <button type="button" onClick={handleSaveRdp} className="rounded-xl border border-outline-dim bg-surface-high/60 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high">{t('terminal.saveRdpFile')}</button> : null}
              {launchPreview?.openUrl ? <button type="button" onClick={handleOpenBrowserTarget} className="rounded-xl border border-outline-dim bg-surface-high/60 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high">{t('terminal.browserOpen')}</button> : null}
            </div>
          </section>

          <section className="rounded-3xl border border-outline-dim bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-bold text-text font-display">{t('terminal.embeddedWorkspace')}</h2>
                <p className="m-0 mt-1 text-sm leading-6 text-text-dim">{t('terminal.embeddedWorkspaceBody')}</p>
              </div>
              <div className="rounded-full bg-surface-high px-3 py-1.5 text-xs font-semibold text-text-dim">{t(`terminal.statusLabels.${normalizeStatus(activeStatus.state)}`)}</div>
            </div>

            {remoteTerminalTabs.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-outline-dim bg-surface-high/30 px-4 py-8 text-center text-sm text-text-dim">{t('terminal.noTabs')}</div>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {remoteTerminalTabs.map((tab) => {
                    const session = remoteSessions.find((item) => item.id === tab.sessionId)
                    const isActive = tab.id === activeRemoteTabId
                    return (
                      <div key={tab.id} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${isActive ? 'border-primary/30 bg-primary/5' : 'border-outline-dim bg-surface-high/30'}`}>
                        <button type="button" onClick={() => setActiveRemoteTerminalTab(tab.id)} className="text-sm font-semibold text-text cursor-pointer">{session?.name || tab.title}</button>
                        <button type="button" onClick={() => closeRemoteTerminalTab(tab.id)} className="text-xs text-text-dim cursor-pointer hover:text-text">✕</button>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-outline-dim bg-[#09111f] p-3">
                  <div ref={terminalHostRef} className="min-h-[360px] w-full overflow-hidden rounded-xl" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoTile label={t('terminal.connectTarget')} value={activeSession ? `${activeSession.username ? `${activeSession.username}@` : ''}${activeSession.host}` : '-'} />
                  <InfoTile label={t('terminal.launchMode')} value={activeSession ? String(activeSession.protocol).toUpperCase() : '-'} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => activeSession && connectRemoteTerminal(activeSession, { password: connectionSecret, force: true })} disabled={!activeSession || activeSession.protocol !== 'ssh'} className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">{t('terminal.openEmbeddedSsh')}</button>
                  <button type="button" onClick={() => activeSession && disconnectRemoteTerminal(activeSession.id)} disabled={!activeSession} className="rounded-xl border border-outline-dim bg-surface-high/60 px-4 py-2 text-sm font-semibold text-text cursor-pointer hover:bg-surface-high disabled:opacity-50">{t('terminal.disconnectSession')}</button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      {children}
    </label>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-outline-dim bg-surface/70 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-dim font-label">{label}</div>
      <div className="mt-1 text-lg font-bold text-text font-display break-all">{value}</div>
    </div>
  )
}

function mapSessionToForm(session) {
  return {
    id: session.id,
    name: session.name || '',
    protocol: session.protocol || 'ssh',
    host: session.host || '',
    port: session.port ? String(session.port) : defaultPortFor(session.protocol),
    username: session.username || '',
    remotePath: session.remote_path || '',
    description: session.description || '',
    passwordHint: session.password_hint || '',
  }
}

function buildFallbackPreview(session) {
  const protocol = session?.protocol || 'ssh'
  const host = session?.host?.trim() || 'gpu-node.local'
  const port = String(session?.port || defaultPortFor(protocol))
  const username = session?.username?.trim()
  const remotePath = session?.remotePath?.trim() || session?.remote_path?.trim() || ''
  const target = `${host}:${port}`
  const identity = username ? `${username}@${host}` : host

  if (protocol === 'ssh') {
    return {
      title: `${identity}:${port}`,
      target,
      command: remotePath ? `ssh -tt -p ${port} ${identity} "cd ${escapeShell(remotePath)} && bash"` : `ssh -tt -p ${port} ${identity}`,
    }
  }
  if (protocol === 'sftp') {
    return { title: `${identity}:${port}`, target, command: `sftp -P ${port} ${identity}` }
  }
  if (protocol === 'rdp') {
    return { title: target, target, command: `mstsc /v:${target}`, rdpFile: `full address:s:${target}` }
  }
  if (protocol === 'vnc') {
    return { title: target, target, command: `vncviewer ${target}` }
  }

  const scheme = protocol === 'https' ? 'https' : 'http'
  const path = remotePath ? (remotePath.startsWith('/') ? remotePath : `/${remotePath}`) : ''
  const openUrl = `${scheme}://${host}:${port}${path}`
  return { title: openUrl, target: openUrl, command: openUrl, openUrl }
}

function defaultPortFor(protocol) {
  return PROTOCOLS.find((item) => item.value === protocol)?.port || ''
}

function escapeShell(value) {
  return value.replace(/"/g, '\\"')
}

function normalizeStatus(status) {
  if (status === 'connected') return 'connected'
  if (status === 'connecting') return 'connecting'
  if (status === 'error') return 'error'
  if (status === 'closed' || status === 'disconnected') return 'closed'
  return 'idle'
}

function disposeTerminal(xtermRef, fitAddonRef) {
  fitAddonRef.current?.dispose?.()
  xtermRef.current?.dispose?.()
  fitAddonRef.current = null
  xtermRef.current = null
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  const successful = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!successful) {
    throw new Error('Clipboard copy is unavailable in this environment.')
  }
}

const inputClassName = 'w-full rounded-xl border border-outline-dim bg-surface-high/60 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10'
