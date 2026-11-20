import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Group, Modal, Stack } from '@mantine/core'
import type {
  ArchiveContextDto,
  ApplicationErrorDto,
} from '../../../../shared/contracts/application'
import type { PortDto } from '../../../../shared/contracts/ports'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type {
  TariffDto,
  TariffSummaryDto,
  TariffPreviewDto,
} from '../../../../shared/contracts/tariffs'
import type { MomentInputDto, MomentResolutionDto } from '../../../../shared/contracts/values'
import type { useArchives } from '../../api/use-archives'
import { useApplicationRequest } from '../../api/use-application-request'
import { PageControls } from '../PageControls'
import { StateMessage } from '../StateMessage'
import { PortConfirmation } from '../ports/PortConfirmation'
import { PortPicker } from './PortPicker'
import {
  ConfigurationDetails,
  ConfigurationFields,
  copyDraft,
  emptyConfigurations,
  readConfigurations,
  type ConfigurationDraft,
} from './ConfigurationFields'
import { TariffMomentFields, emptyMoment } from './TariffMomentFields'
import { CopyTariffFields } from './CopyTariffFields'
import { BaseCalculator } from './BaseCalculator'
import { TariffMaintenanceEditor } from './TariffMaintenanceEditor'

type Draft = {
  context: ArchiveContextDto
  portId: string
  moment: MomentInputDto
  configurations: ConfigurationDraft[]
}
const phaseLabels = { HISTORICAL: 'Storica', CURRENT: 'Corrente', FUTURE: 'Futura' }
export function Tariffs({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const context = archives.state.context!
  const [portId, setPortId] = useState<string | null>(null)
  const [port, setPort] = useState<PortDto | null>(null)
  const [page, setPage] = useState(1),
    [reload, setReload] = useState(0)
  const [list, setList] = useState<PageDto<TariffSummaryDto> | null>(null)
  const [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<TariffDto | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [preview, setPreview] = useState<TariffPreviewDto | null>(null)
  const [maintenance, setMaintenance] = useState<{
    tariff: TariffDto
    mode: 'UPDATE' | 'DELETE'
    context: ArchiveContextDto
    opened: boolean
    uncertain: boolean
    trigger: HTMLElement | null
  } | null>(null)
  const [calculatorPort, setCalculatorPort] = useState<string | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [error, setError] = useState<string | null>(null),
    [dialogError, setDialogError] = useState<string | null>(null)
  const [issues, setIssues] = useState<ApplicationErrorDto['fields']>([])
  const [notice, setNotice] = useState<string | null>(null)
  const trigger = useRef<HTMLElement | null>(null),
    newButton = useRef<HTMLButtonElement>(null)
  const resumeMaintenanceButton = useRef<HTMLButtonElement>(null)
  const portRequest = useApplicationRequest(context, setError)
  const { request: readPort } = portRequest
  const listRequest = useApplicationRequest(context, setError),
    detailRequest = useApplicationRequest(context, setError)
  const momentRequest = useApplicationRequest(context, setDialogError),
    commandRequest = useApplicationRequest(context, setDialogError),
    effectsRequest = useApplicationRequest(context, setDialogError),
    copyRequest = useApplicationRequest(context, setDialogError)
  useEffect(() => {
    if (!portId) return
    void readPort(() =>
      window.ports.get({ context: { sessionId: context.sessionId }, query: { id: portId } }),
    ).then((r) => {
      if (r?.ok) setPort(r.value)
    })
  }, [readPort, portId, context.sessionId, context.revision])
  const { request: readList } = listRequest,
    { request: readDetail } = detailRequest
  const busy =
    archives.busy || archives.commandBusy || commandRequest.loading || copyRequest.loading
  const dialogOpen = !!draft || !!calculatorPort
  const anyDialogOpen = dialogOpen || !!maintenance?.opened
  useEffect(() => {
    onDialogChange(anyDialogOpen)
    return () => onDialogChange(false)
  }, [anyDialogOpen, onDialogChange])
  useEffect(() => {
    if (!portId) return
    void readList(() =>
      window.tariffs.list({
        context: { sessionId: context.sessionId },
        query: { portId, page, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok) {
        setList(r.value)
        const last = Math.max(1, Math.ceil(r.value.total / 25))
        if (page > last) setPage(last)
      }
    })
  }, [readList, portId, page, context.sessionId, context.revision, reload])
  useEffect(() => {
    if (!selected) return
    void readDetail(() =>
      window.tariffs.get({ context: { sessionId: context.sessionId }, query: { id: selected } }),
    ).then((r) => {
      if (r?.ok) setDetail(r.value)
    })
  }, [readDetail, selected, context.sessionId, context.revision, reload])
  useEffect(() => {
    const now = Date.now()
    const next = [...(list?.items ?? []), ...(detail ? [detail] : [])]
      .flatMap((t) => [t.effectiveFrom, t.effectiveTo])
      .filter((x): x is string => !!x && Date.parse(x) > now)
      .sort()[0]
    if (!next) return
    const timer = window.setTimeout(
      () => setReload((n) => n + 1),
      Math.min(2147483647, Math.max(1, Date.parse(next) - now + 10)),
    )
    return () => window.clearTimeout(timer)
  }, [list, detail])
  const rememberTrigger = () => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }
  const restoreFocus = () => {
    ;(trigger.current?.isConnected ? trigger.current : newButton.current)?.focus()
  }
  const close = () => {
    if (busy) return
    commandRequest.invalidate()
    effectsRequest.invalidate()
    momentRequest.invalidate()
    copyRequest.invalidate()
    setDraft(null)
    setPreview(null)
    setCalculatorPort(null)
    setResolution(null)
    setDialogError(null)
    setIssues([])
    setCopyOpen(false)
  }
  const create = async (copy = false) => {
    if (!portId) return
    rememberTrigger()
    setDialogError(null)
    setIssues([])
    setResolution(null)
    setPreview(null)
    setCopyOpen(false)
    const next = {
      context: { ...context },
      portId,
      moment: emptyMoment(),
      configurations: emptyConfigurations(),
    }
    setDraft(next)
    if (copy && detail) {
      const r = await copyRequest.request(() =>
        window.tariffs.copyConfigurations({
          context: { sessionId: context.sessionId },
          query: { id: detail.id },
        }),
      )
      if (r?.ok) setDraft({ ...next, configurations: copyDraft(r.value) })
    }
  }
  const submit = async () => {
    if (!draft) return
    setDialogError(null)
    setIssues([])
    let configurations
    try {
      configurations = readConfigurations(draft.configurations)
    } catch (e) {
      setDialogError((e as Error).message)
      return
    }
    const r = await commandRequest.request(() =>
      archives.execute(() =>
        window.tariffs.previewCreate({
          context: draft.context,
          payload: { portId: draft.portId, moment: draft.moment, configurations },
        }),
      ),
    )
    if (r?.ok) setPreview(r.value)
    else if (r && !r.ok) setIssues(r.error.fields)
  }
  const confirm = async () => {
    if (!preview) return
    setDialogError(null)
    const r = await commandRequest.request(() =>
      archives.execute(() =>
        window.tariffs.confirmCreate({
          context: preview.context,
          payload: { previewId: preview.previewId },
        }),
      ),
    )
    if (r?.ok) {
      detailRequest.invalidate()
      setSelected(r.value.id)
      setDetail(r.value)
      setDraft(null)
      setPreview(null)
      setResolution(null)
      setNotice('Tariffa completa creata.')
      setReload((n) => n + 1)
    }
  }
  const resolve = async () => {
    if (!draft) return
    setDialogError(null)
    const r = await momentRequest.request(() =>
      window.tariffs.resolveMoment({
        context: { sessionId: draft.context.sessionId },
        query: { portId: draft.portId, moment: draft.moment },
      }),
    )
    if (r?.ok) setResolution(r.value)
  }
  const effectsPage = async (page: number) => {
    if (!preview) return
    const r = await effectsRequest.request(() =>
      window.tariffs.previewEffects({
        context: { sessionId: preview.context.sessionId },
        query: { previewId: preview.previewId, page, pageSize: 50 },
      }),
    )
    if (r?.ok) setPreview(r.value)
  }
  return (
    <>
      {error && (
        <StateMessage title="Tariffe non disponibili" kind="error">
          {error}
          <Button
            variant="subtle"
            onClick={() => {
              setError(null)
              setReload((n) => n + 1)
            }}
          >
            Ricarica
          </Button>
        </StateMessage>
      )}
      {notice && (
        <StateMessage title="Operazione completata" kind="success">
          {notice}
        </StateMessage>
      )}
      {maintenance && !maintenance.opened && (
        <StateMessage title="Bozza tariffa conservata" kind="warning">
          {maintenance.uncertain
            ? 'Verifica l’esito prima di ripetere una scrittura.'
            : 'Riprendi la correzione o eliminazione della tariffa.'}
          <Group>
            <Button
              disabled={busy || dialogOpen}
              onClick={() => setMaintenance({ ...maintenance, opened: true })}
              ref={resumeMaintenanceButton}
            >
              Riprendi bozza
            </Button>
            <Button
              variant="default"
              disabled={busy || maintenance.uncertain}
              onClick={() => setMaintenance(null)}
            >
              Scarta bozza
            </Button>
          </Group>
        </StateMessage>
      )}
      <div className="ports-workspace">
        <section className="archive-panel port-list" aria-label="Elenco tariffe">
          <Group className="port-list-heading" justify="space-between">
            <h2>Tariffe</h2>
            <Button
              size="compact-sm"
              ref={newButton}
              disabled={busy || !portId || !!maintenance}
              onClick={() => void create()}
            >
              Nuova tariffa
            </Button>
          </Group>
          <PortPicker
            context={context}
            value={portId}
            disabled={busy}
            onChange={(id) => {
              listRequest.invalidate()
              detailRequest.invalidate()
              portRequest.invalidate()
              setPort(null)
              setPortId(id)
              setPage(1)
              setList(null)
              setSelected(null)
              setDetail(null)
              setError(null)
              setNotice(null)
            }}
          />
          {listRequest.loading && <p role="status">Caricamento tariffe…</p>}
          {list && (
            <p className="list-summary">
              {list.total} tariffe · pagina {list.page}
            </p>
          )}
          <div className="port-list-results">
            {!portId && <p>Scegli un porto per consultare la sequenza tariffaria.</p>}
            {list?.total === 0 && <p>Nessuna tariffa presente. Crea la prima tariffa completa.</p>}
            {list?.items.map((t) => (
              <button
                className="port-list-item"
                key={t.id}
                aria-pressed={selected === t.id}
                onClick={() => {
                  if (selected === t.id) return
                  detailRequest.invalidate()
                  setDetail(null)
                  setSelected(t.id)
                }}
              >
                <strong>
                  {t.effectiveMoment!.localDateTime.replace('T', ' ')} ({t.effectiveMoment!.offset})
                </strong>
                <span>
                  {phaseLabels[t.phase]}
                  {selected === t.id ? ' · Selezionata' : ''}
                </span>
              </button>
            ))}
          </div>
          {list && (
            <PageControls
              page={list}
              disabled={listRequest.loading}
              onPage={(p) => {
                listRequest.invalidate()
                setPage(p)
              }}
            />
          )}
        </section>
        <section
          className="archive-panel catalog-inspector"
          aria-label="Dettaglio tariffa"
          tabIndex={0}
        >
          <Group justify="space-between">
            <h2>Tariffa e calcolo base</h2>
            <Button
              variant="light"
              disabled={busy || !portId || !!maintenance}
              onClick={() => {
                rememberTrigger()
                setCalculatorPort(portId)
              }}
            >
              Apri calcolatore
            </Button>
          </Group>
          {detailRequest.loading && <p role="status">Caricamento dettaglio…</p>}
          {detail ? (
            <>
              <Badge>{phaseLabels[detail.phase]}</Badge>
              <p className="tariff-long-value">
                Decorrenza: {detail.effectiveMoment!.localDateTime.replace('T', ' ')} ·{' '}
                {detail.effectiveMoment!.zoneId} · {detail.effectiveMoment!.offset}
                <br />
                Inizio incluso: {detail.effectiveFrom}
                <br />
                Fine esclusa: {detail.effectiveTo ?? 'Senza limite finale'}
              </p>
              <Group>
                <Button
                  variant="default"
                  disabled={busy || !!maintenance}
                  onClick={() => void create(true)}
                >
                  Copia tariffa
                </Button>
                {(['UPDATE', 'DELETE'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant="light"
                    color={mode === 'DELETE' ? 'red' : undefined}
                    disabled={busy || !!maintenance}
                    onClick={() => {
                      rememberTrigger()
                      setMaintenance({
                        tariff: detail,
                        mode,
                        context: { ...context },
                        opened: true,
                        uncertain: false,
                        trigger: trigger.current,
                      })
                    }}
                  >
                    {mode === 'UPDATE' ? 'Correggi tariffa' : 'Elimina tariffa'}
                  </Button>
                ))}
              </Group>
              <ConfigurationDetails configurations={detail.configurations} />
            </>
          ) : (
            <StateMessage title="Seleziona una tariffa">
              Consulta le tre configurazioni e i relativi intervalli. Prima della prima decorrenza
              non esiste una tariffa applicabile.
            </StateMessage>
          )}
        </section>
      </div>
      {maintenance && (
        <TariffMaintenanceEditor
          tariff={maintenance.tariff}
          mode={maintenance.mode}
          opened={maintenance.opened}
          originalContext={maintenance.context}
          archives={archives}
          trigger={maintenance.trigger}
          resumeTrigger={resumeMaintenanceButton}
          onClose={() => setMaintenance((old) => (old ? { ...old, opened: false } : null))}
          onUncertainChange={(uncertain) =>
            setMaintenance((old) =>
              old && old.uncertain !== uncertain ? { ...old, uncertain } : old,
            )
          }
          onApplied={(tariff) => {
            detailRequest.invalidate()
            setSelected(tariff?.id ?? null)
            setDetail(tariff)
            setMaintenance(null)
            setNotice(
              tariff
                ? 'Tariffa corretta e calcoli aggiornati.'
                : 'Tariffa eliminata e calcoli aggiornati.',
            )
            setReload((n) => n + 1)
          }}
        />
      )}
      <Modal
        opened={dialogOpen}
        onClose={close}
        title={
          calculatorPort
            ? 'Calcolatore base'
            : preview
              ? 'Anteprima nuova tariffa'
              : 'Nuova tariffa completa'
        }
        centered
        size="xl"
        returnFocus={false}
        onExitTransitionEnd={restoreFocus}
        closeOnClickOutside={false}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        {calculatorPort ? (
          <>
            <p>Porto: {port?.version.name}</p>
            <BaseCalculator context={context} portId={calculatorPort} />
          </>
        ) : (
          draft && (
            <Stack>
              {dialogError && (
                <StateMessage title="Operazione non completata" kind="error">
                  {dialogError}
                </StateMessage>
              )}
              {issues.length > 0 && (
                <div role="alert">
                  {issues.map((issue, i) => (
                    <p key={i}>
                      {issue.path.join(' · ')}: {issue.message}
                    </p>
                  ))}
                </div>
              )}
              {preview ? (
                <>
                  <PortConfirmation
                    preview={preview}
                    disabled={busy || effectsRequest.loading}
                    revision={context.revision}
                    onConfirm={() => void confirm()}
                    onCancel={() => {
                      effectsRequest.invalidate()
                      setPreview(null)
                      setDialogError(null)
                    }}
                    onPage={(p) => void effectsPage(p)}
                  />
                  <details>
                    <summary>Configurazioni da creare</summary>
                    <ConfigurationDetails configurations={preview.tariff.configurations} />
                  </details>
                </>
              ) : (
                <>
                  <p>
                    Porto: <strong>{port?.version.name}</strong>. La decorrenza usa il suo fuso. La
                    tariffa richiede tutte e tre le configurazioni.
                  </p>
                  <TariffMomentFields
                    moment={draft.moment}
                    resolution={resolution}
                    disabled={busy}
                    onResolve={() => void resolve()}
                    onChange={(m) => {
                      momentRequest.invalidate()
                      setResolution(null)
                      setDraft({ ...draft, moment: m })
                    }}
                  />
                  <Button variant="subtle" disabled={busy} onClick={() => setCopyOpen(!copyOpen)}>
                    {copyOpen ? 'Chiudi sorgente copia' : 'Copia configurazioni da una tariffa'}
                  </Button>
                  {copyOpen && (
                    <CopyTariffFields
                      context={context}
                      portId={draft.portId}
                      disabled={busy}
                      report={setDialogError}
                      onCopy={(c) => {
                        setDraft({ ...draft, configurations: copyDraft(c) })
                        setCopyOpen(false)
                      }}
                    />
                  )}
                  <ConfigurationFields
                    value={draft.configurations}
                    disabled={busy}
                    onChange={(c) => setDraft({ ...draft, configurations: c })}
                  />
                  {draft.context.revision !== context.revision && (
                    <StateMessage title="Bozza obsoleta" kind="warning">
                      I dati sono cambiati. Ricarica esplicitamente il contesto prima di continuare.
                    </StateMessage>
                  )}
                  <Group className="form-actions">
                    <Button disabled={busy} onClick={() => void submit()}>
                      Mostra anteprima
                    </Button>
                    <Button variant="default" disabled={busy} onClick={close}>
                      Annulla
                    </Button>
                    <Button
                      variant="subtle"
                      disabled={busy}
                      onClick={() => {
                        commandRequest.invalidate()
                        momentRequest.invalidate()
                        setDraft({ ...draft, context: { ...context } })
                        setResolution(null)
                        setDialogError(null)
                        setIssues([])
                      }}
                    >
                      Ricarica bozza
                    </Button>
                  </Group>
                </>
              )}
            </Stack>
          )
        )}
      </Modal>
    </>
  )
}
