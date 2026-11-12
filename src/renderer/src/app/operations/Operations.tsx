import { useEffect, useRef, useState } from 'react'
import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type {
  OperationPreviewDto,
  VesselOperationDto,
  VoyageDto,
  CreateOperationDto,
  ExecutionStatus,
  OperationMomentInput,
  OperationMomentDto,
} from '../../../../shared/contracts/operations'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { useArchives } from '../../api/use-archives'
import { useApplicationRequest } from '../../api/use-application-request'
import { moneyInput } from '../../api/numeric-input'
import { PageControls } from '../PageControls'
import { StateMessage } from '../StateMessage'
import { PortConfirmation } from '../ports/PortConfirmation'
import { PortPicker } from '../tariffs/PortPicker'
import { TariffMomentFields, emptyMoment } from '../tariffs/TariffMomentFields'
import { VesselPicker } from './VesselPicker'
import { BerthPicker } from './BerthPicker'
import { OperationDetail, executionLabels } from './OperationDetail'

type Draft = { context: ArchiveContextDto; values: CreateOperationDto; override: string }
export function Operations({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const context = archives.state.context!
  const [vesselId, setVesselId] = useState<string | null>(null),
    [page, setPage] = useState(1),
    [stayPage, setStayPage] = useState(1)
  const [list, setList] = useState<PageDto<VesselOperationDto> | null>(null),
    [stays, setStays] = useState<PageDto<VoyageDto> | null>(null)
  const [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<VesselOperationDto | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null),
    [open, setOpen] = useState(false),
    [preview, setPreview] = useState<OperationPreviewDto | null>(null)
  const [resolution, setResolution] = useState<OperationMomentDto | null>(null),
    [error, setError] = useState<string | null>(null),
    [dialogError, setDialogError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null)
  const [view, setView] = useState('operations'),
    [reload, setReload] = useState(0)
  const trigger = useRef<HTMLElement | null>(null)
  const listRequest = useApplicationRequest(context, setError),
    stayRequest = useApplicationRequest(context, setError),
    detailRequest = useApplicationRequest(context, setError),
    momentRequest = useApplicationRequest(context, setDialogError),
    commandRequest = useApplicationRequest(context, setDialogError),
    effectsRequest = useApplicationRequest(context, setDialogError)
  const { request: readList } = listRequest,
    { request: readStays } = stayRequest,
    { request: readDetail } = detailRequest
  const busy = archives.busy || archives.commandBusy || commandRequest.loading
  useEffect(() => {
    onDialogChange(open)
    return () => onDialogChange(false)
  }, [open, onDialogChange])
  useEffect(() => {
    if (!vesselId) return
    void readList(() =>
      window.operations.list({
        context: { sessionId: context.sessionId },
        query: { vesselId, page, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok) setList(r.value)
    })
  }, [readList, context.sessionId, context.revision, vesselId, page, reload])
  useEffect(() => {
    if (!vesselId) return
    void readStays(() =>
      window.operations.stays({
        context: { sessionId: context.sessionId },
        query: { vesselId, page: stayPage, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok) setStays(r.value)
    })
  }, [readStays, context.sessionId, context.revision, vesselId, stayPage, reload])
  useEffect(() => {
    if (!selected) return
    void readDetail(() =>
      window.operations.get({ context: { sessionId: context.sessionId }, query: { id: selected } }),
    ).then((r) => {
      if (r?.ok) setDetail(r.value)
    })
  }, [readDetail, context.sessionId, context.revision, selected, reload])
  const invalidateEditor = () => {
    momentRequest.invalidate()
    commandRequest.invalidate()
    effectsRequest.invalidate()
    setResolution(null)
    setPreview(null)
    setDialogError(null)
  }
  const change = (values: CreateOperationDto) => {
    invalidateEditor()
    if (draft) setDraft({ ...draft, values })
  }
  const close = () => {
    if (busy) return
    invalidateEditor()
    setOpen(false)
  }
  const start = (type: 'ENTRY' | 'EXIT') => {
    if (!vesselId) return
    trigger.current = document.activeElement as HTMLElement
    invalidateEditor()
    setDraft({
      context,
      override: '',
      values: {
        vesselId,
        operationType: type,
        moment: emptyMoment(),
        executionStatus: 'PLANNED',
        notes: null,
        manualOverrideAmount: null,
        ...(type === 'ENTRY' ? { portId: '', berthId: null } : { interpretationPortId: null }),
      } as CreateOperationDto,
    })
    setOpen(true)
  }
  const target = (): OperationMomentInput => {
    const v = draft!.values
    return v.operationType === 'ENTRY'
      ? {
          operationType: v.operationType,
          vesselId: v.vesselId,
          moment: v.moment,
          portId: v.portId,
          berthId: v.berthId,
        }
      : {
          operationType: v.operationType,
          vesselId: v.vesselId,
          moment: v.moment,
          interpretationPortId: v.interpretationPortId,
        }
  }
  const resolve = async () => {
    const r = await momentRequest.request(() =>
      window.operations.resolveMoment({
        context: { sessionId: context.sessionId },
        query: target(),
      }),
    )
    if (r?.ok) setResolution(r.value)
  }
  const previewCreate = async () => {
    if (!draft) return
    setDialogError(null)
    let override: string | null = null
    override = draft.override.trim() ? moneyInput(draft.override) : null
    if (draft.override.trim() && override === null) {
      setDialogError('Inserisci un importo non negativo con al massimo due decimali.')
      return
    }
    const r = await commandRequest.request(() =>
      archives.execute(() =>
        window.operations.previewCreate({
          context: draft.context,
          payload: { ...draft.values, manualOverrideAmount: override },
        }),
      ),
    )
    if (r?.ok) setPreview(r.value)
  }
  const confirm = async () => {
    if (!preview) return
    const r = await commandRequest.request(() =>
      archives.execute(() =>
        window.operations.confirmCreate({
          context: preview.context,
          payload: { previewId: preview.previewId },
        }),
      ),
    )
    if (r?.ok) {
      setOpen(false)
      setDraft(null)
      setPreview(null)
      setSelected(r.value.id)
      setDetail(r.value)
      setNotice('Operazione registrata.')
      setReload((n) => n + 1)
    }
  }
  const effects = async (page: number) => {
    if (!preview) return
    const r = await effectsRequest.request(() =>
      window.operations.previewEffects({
        context: { sessionId: context.sessionId },
        query: { previewId: preview.previewId, page, pageSize: 50 },
      }),
    )
    if (r?.ok) setPreview(r.value)
  }
  const selectedVessel = (id: string | null) => {
    listRequest.invalidate()
    stayRequest.invalidate()
    detailRequest.invalidate()
    invalidateEditor()
    setVesselId(id)
    setList(null)
    setStays(null)
    setSelected(null)
    setDetail(null)
    setDraft(null)
    setPage(1)
    setStayPage(1)
  }
  return (
    <section className="master-data-page operations-page" aria-label="Operazioni nave">
      <Group justify="space-between">
        <h2>Cronologia nave</h2>
        <Group>
          <Button disabled={!vesselId || busy} onClick={() => start('ENTRY')}>
            Nuova entrata
          </Button>
          <Button disabled={!vesselId || busy} variant="light" onClick={() => start('EXIT')}>
            Nuova uscita
          </Button>
          {draft && !open && (
            <Button
              variant="default"
              onClick={() => {
                trigger.current = document.activeElement as HTMLElement
                setOpen(true)
              }}
            >
              Riprendi bozza
            </Button>
          )}
        </Group>
      </Group>
      <VesselPicker context={context} value={vesselId} onChange={selectedVessel} disabled={busy} />
      {error && (
        <StateMessage kind="error" title="Consultazione non disponibile">
          {error}
        </StateMessage>
      )}
      {notice && <StateMessage kind="success" title={notice} />}
      <Group>
        <Button
          variant={view === 'operations' ? 'filled' : 'default'}
          onClick={() => setView('operations')}
        >
          Operazioni
        </Button>
        <Button variant={view === 'stays' ? 'filled' : 'default'} onClick={() => setView('stays')}>
          Permanenze
        </Button>
        <Button variant="subtle" disabled={busy} onClick={() => setReload((n) => n + 1)}>
          Ricarica consultazione
        </Button>
      </Group>
      <p className="operations-future">
        Spostamenti interno/tra porti, assegnazioni dei soggetti, consuntivazione e correzioni
        strutturali: non ancora disponibili.
      </p>
      {!vesselId ? (
        <StateMessage title="Scegli una nave">
          Consulta la cronologia e registra un’entrata o un’uscita.
        </StateMessage>
      ) : view === 'operations' ? (
        <div className="operations-workspace">
          <div className="operations-list">
            <h3>Operazioni registrate</h3>
            {listRequest.loading ? (
              <p role="status">Caricamento operazioni…</p>
            ) : list?.total === 0 ? (
              <p>Nessuna operazione registrata.</p>
            ) : null}
            <div className="operations-rows">
              {list?.items.map((o) => (
                <button
                  key={o.id}
                  className="master-list-entry"
                  aria-pressed={selected === o.id}
                  onClick={() => {
                    if (selected === o.id) return
                    detailRequest.invalidate()
                    setDetail(null)
                    setSelected(o.id)
                  }}
                >
                  <strong>
                    {o.operationType === 'ENTRY' ? 'Entrata' : 'Uscita'} ·{' '}
                    {executionLabels[o.executionStatus]}
                  </strong>
                  <span>
                    {o.endpoint.moment.localDateTime} · {o.endpoint.portName}
                  </span>
                </button>
              ))}
            </div>
            {list && (
              <PageControls
                page={list}
                disabled={listRequest.loading || busy}
                onPage={(n) => {
                  listRequest.invalidate()
                  setPage(n)
                }}
              />
            )}
          </div>
          <div className="operations-detail">
            {detailRequest.loading ? (
              <p role="status">Caricamento dettaglio…</p>
            ) : detail ? (
              <OperationDetail operation={detail} />
            ) : (
              <p>Seleziona un’operazione per consultare dati e calcolo.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="operations-stays" aria-label="Permanenze derivate">
          {stayRequest.loading ? (
            <p role="status">Caricamento permanenze…</p>
          ) : stays?.total === 0 ? (
            <p>Nessuna permanenza. Le operazioni mancate non producono struttura.</p>
          ) : null}
          {stays?.items.map((v) => (
            <article key={v.id} className="operation-voyage">
              <h3>Viaggio · {v.endedAt ? 'Chiuso' : 'Aperto'}</h3>
              <p>
                Inizio UTC {v.startedAt} · Fine UTC {v.endedAt ?? 'Aperta'}
              </p>
              <details>
                <summary>Identità del viaggio</summary>
                <p>
                  {v.id} · versione nave {v.vesselVersionId}
                </p>
              </details>
              <Group>
                <Button
                  variant="subtle"
                  onClick={() => {
                    detailRequest.invalidate()
                    setSelected(v.openingOperationId)
                    setDetail(null)
                    setView('operations')
                  }}
                >
                  Consulta entrata
                </Button>
                {v.closingOperationId && (
                  <Button
                    variant="subtle"
                    onClick={() => {
                      detailRequest.invalidate()
                      setSelected(v.closingOperationId)
                      setDetail(null)
                      setView('operations')
                    }}
                  >
                    Consulta uscita
                  </Button>
                )}
              </Group>
              {v.visits.map((p) => (
                <section key={p.id}>
                  <h4>Visita · {p.portName}</h4>
                  <p>
                    {p.id} · {p.startedAt} → {p.endedAt ?? 'Aperta'}
                  </p>
                  {p.stays.map((b) => (
                    <div key={b.id}>
                      <strong>Ormeggio · {b.berthName ?? 'Banchina non specificata'}</strong>
                      <p>
                        {b.id} · {b.startedAt} → {b.endedAt ?? 'Aperto'}
                      </p>
                      <p>
                        Apertura: {b.openingOperationId}
                        <br />
                        Chiusura: {b.closingOperationId ?? '—'}
                      </p>
                    </div>
                  ))}
                </section>
              ))}
            </article>
          ))}
          {stays && (
            <PageControls
              page={stays}
              disabled={stayRequest.loading || busy}
              onPage={(n) => {
                stayRequest.invalidate()
                setStayPage(n)
              }}
            />
          )}
        </div>
      )}
      <Modal
        opened={open}
        onClose={close}
        title={
          preview
            ? 'Anteprima registrazione'
            : draft?.values.operationType === 'ENTRY'
              ? 'Nuova entrata'
              : 'Nuova uscita'
        }
        size="xl"
        closeOnEscape={!busy}
        closeOnClickOutside={false}
        withCloseButton={!busy}
        onExitTransitionEnd={() => trigger.current?.isConnected && trigger.current.focus()}
      >
        {dialogError && (
          <StateMessage kind="error" title="Registrazione non disponibile">
            {dialogError}
          </StateMessage>
        )}
        {draft && context.revision !== draft.context.revision && (
          <StateMessage kind="warning" title="Bozza obsoleta">
            I dati sono cambiati. Ricarica esplicitamente la bozza per proseguire.
          </StateMessage>
        )}
        {preview ? (
          <>
            <OperationDetail operation={preview.operationValues} />
            <PortConfirmation
              preview={preview}
              revision={context.revision}
              disabled={busy || effectsRequest.loading}
              onConfirm={() => void confirm()}
              onCancel={() => {
                effectsRequest.invalidate()
                setPreview(null)
              }}
              onPage={(p) => void effects(p)}
            />
          </>
        ) : (
          draft && (
            <Stack>
              <Select
                label="Stato"
                value={draft.values.executionStatus}
                data={Object.entries(executionLabels).map(([value, label]) => ({ value, label }))}
                disabled={busy}
                allowDeselect={false}
                onChange={(v) => change({ ...draft.values, executionStatus: v as ExecutionStatus })}
              />
              {draft.values.operationType === 'ENTRY' ? (
                <>
                  <PortPicker
                    context={context}
                    label="Porto di arrivo"
                    value={draft.values.portId || null}
                    disabled={busy}
                    onChange={(id) =>
                      change({
                        ...draft.values,
                        operationType: 'ENTRY',
                        portId: id ?? '',
                        berthId: null,
                      })
                    }
                  />
                  {draft.values.portId && (
                    <BerthPicker
                      key={draft.values.portId}
                      context={context}
                      portId={draft.values.portId}
                      value={draft.values.berthId}
                      onChange={(id) =>
                        change({
                          ...draft.values,
                          operationType: 'ENTRY',
                          portId: draft.values.operationType === 'ENTRY' ? draft.values.portId : '',
                          berthId: id,
                        })
                      }
                      disabled={busy}
                    />
                  )}
                </>
              ) : (
                <>
                  <p>
                    Porto, banchina e fuso sono determinati dalla cronologia al momento indicato. Le
                    origini già referenziate restano valide anche se disattivate.
                  </p>
                  <details>
                    <summary>Disambiguazione del porto (solo se richiesta)</summary>
                    <PortPicker
                      context={context}
                      label="Porto di interpretazione"
                      value={draft.values.interpretationPortId}
                      onChange={(id) =>
                        change({ ...draft.values, operationType: 'EXIT', interpretationPortId: id })
                      }
                      disabled={busy}
                    />
                  </details>
                </>
              )}
              <TariffMomentFields
                economic
                moment={draft.values.moment}
                onChange={(m) => change({ ...draft.values, moment: m })}
                resolution={resolution?.resolution ?? null}
                onResolve={() => void resolve()}
                disabled={busy || momentRequest.loading}
              />
              <TextInput
                label="Sostituzione manuale della base (EUR, facoltativa)"
                description="Anche zero. Il calcolo tariffario resta conservato."
                value={draft.override}
                disabled={busy}
                onChange={(e) => {
                  invalidateEditor()
                  setDraft({ ...draft, override: e.currentTarget.value })
                }}
              />
              <Textarea
                label="Note"
                value={draft.values.notes ?? ''}
                maxLength={10000}
                disabled={busy}
                onChange={(e) => change({ ...draft.values, notes: e.currentTarget.value || null })}
              />
              <Group>
                <Button variant="default" onClick={close} disabled={busy}>
                  Chiudi
                </Button>
                <Button
                  variant="default"
                  disabled={busy}
                  onClick={() => {
                    invalidateEditor()
                    setDraft({ ...draft, context })
                  }}
                >
                  Ricarica bozza
                </Button>
                <Button
                  disabled={
                    busy ||
                    !draft.values.moment.localDateTime ||
                    (draft.values.operationType === 'ENTRY' && !draft.values.portId)
                  }
                  loading={commandRequest.loading}
                  onClick={() => void previewCreate()}
                >
                  Verifica e mostra anteprima
                </Button>
              </Group>
            </Stack>
          )
        )}
      </Modal>
    </section>
  )
}
