import { useConsultationState, useConsultationPicker } from '../../api/use-consultation-state'
import { operationCreationOutcome } from '../../api/operation-creation-outcome'
import { SingleFlight } from '../../api/single-flight'
import { useProtectedDraft } from '../DraftProtection'
import type { AssignmentTarget } from '../../../../shared/contracts/assignments'
import { AssignmentEditor } from './AssignmentEditor'
import { OperationCompletionEditor } from './OperationCompletionEditor'
import { OperationMaintenanceEditor } from './OperationMaintenanceEditor'
import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Fieldset,
  Group,
  Menu,
  Modal,
  Select,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core'
import type { ApplicationResult, ArchiveContextDto } from '../../../../shared/contracts/application'
import type {
  OperationPreviewDto,
  VesselOperationDto,
  VoyageDto,
  CreateOperationDto,
  ExecutionStatus,
  OperationMomentInput,
  OperationMomentDto,
  OperationalContextDto,
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
import { OperationDetail, executionLabels, operationLabels } from './OperationDetail'

type Draft = {
  retrospective: boolean
  context: ArchiveContextDto
  values: CreateOperationDto
  override: string
  arrivalOverride: string
}
export function Operations({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null),
    [assignmentOpen, setAssignmentOpen] = useState(false)
  const assignmentTrigger = useRef<HTMLElement | null>(null)
  const [completion, setCompletion] = useState<{
    operation: VesselOperationDto
    context: ArchiveContextDto
    trigger: HTMLElement | null
    correction: boolean
  } | null>(null)
  const [completionOpen, setCompletionOpen] = useState(false),
    [completionDone, setCompletionDone] = useState(false)
  const [maintenance, setMaintenance] = useState<{
    operation: VesselOperationDto
    context: ArchiveContextDto
    trigger: HTMLElement | null
    mode: 'DELETE' | 'NOTES'
  } | null>(null)
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [maintenanceDone, setMaintenanceDone] = useState(false)
  const [editorGeneration, setEditorGeneration] = useState(0)
  const [maintenanceUncertain, setMaintenanceUncertain] = useState(false)
  const [detailRevision, setDetailRevision] = useState<string | null>(null)
  const assign = (target: AssignmentTarget) => {
    guard.request({
      label: 'modificare le assegnazioni',
      run: () => {
        assignmentTrigger.current = document.activeElement as HTMLElement
        setAssignmentTarget(target)
        setAssignmentOpen(true)
      },
    })
  }
  const consultationPicker = useConsultationPicker('operationVessels')
  const context = archives.state.context!
  const [vesselId, setVesselId] = useConsultationState('operationOwner', 'vesselId'),
    [page, setPage, pageCurrent] = useConsultationState('operations', 'page', vesselId),
    [stayPage, setStayPage, stayPageCurrent] = useConsultationState(
      'operations',
      'stayPage',
      vesselId,
    )
  const [list, setList] = useState<PageDto<VesselOperationDto> | null>(null),
    [stays, setStays] = useState<PageDto<VoyageDto> | null>(null)
  const [selected, setSelected, selectionCurrent] = useConsultationState(
      'operations',
      'selection',
      vesselId,
    ),
    [detail, setDetail] = useState<VesselOperationDto | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null),
    [open, setOpen] = useState(false),
    [preview, setPreview] = useState<OperationPreviewDto | null>(null)
  const [pendingOperation, setPendingOperation] = useState<{
    id: string
    context: ArchiveContextDto
  } | null>(null)
  const [reloadRequired, setReloadRequired] = useState(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const [resolution, setResolution] = useState<OperationMomentDto | null>(null),
    [error, setError] = useState<string | null>(null),
    [dialogError, setDialogError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null)
  const [view, setView] = useConsultationState('operations', 'view', vesselId),
    [reload, setReload] = useState(0)
  const [contextInstant, setContextInstant] = useConsultationState(
      'operations',
      'instant',
      vesselId,
    ),
    [operationalContext, setOperationalContext] = useState<OperationalContextDto | null>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const consultationFocus = useRef<HTMLButtonElement | null>(null)
  const insertionTrigger = useRef<HTMLButtonElement | null>(null)
  const resumeDraft = useRef<HTMLButtonElement | null>(null)
  const listRequest = useApplicationRequest(context, setError),
    stayRequest = useApplicationRequest(context, setError),
    detailRequest = useApplicationRequest(context, setError),
    momentRequest = useApplicationRequest(context, setDialogError),
    commandRequest = useApplicationRequest(context, setDialogError),
    effectsRequest = useApplicationRequest(context, setDialogError),
    contextRequest = useApplicationRequest(context, setError)
  const { request: readList } = listRequest,
    { request: readStays } = stayRequest,
    { request: readDetail, invalidate: invalidateDetail } = detailRequest
  const busy =
    archives.busy || archives.commandBusy || commandRequest.loading || effectsRequest.loading
  const guard = useProtectedDraft({
    get state() {
      return flight.busy
        ? 'BUSY'
        : pendingOperation
          ? 'UNCERTAIN'
          : busy
            ? 'BUSY'
            : draft ||
                (maintenance && !maintenanceDone) ||
                (completion && !completionDone) ||
                assignmentTarget
              ? 'DRAFT'
              : 'CLEAN'
    },
    discard: () => {
      setEditorGeneration((n) => n + 1)
      invalidateEditor()
      setDraft(null)
      setOpen(false)
      setMaintenance(null)
      setMaintenanceOpen(false)
      setCompletion(null)
      setCompletionOpen(false)
      setAssignmentTarget(null)
      setAssignmentOpen(false)
      setReloadRequired(false)
    },
    recover: () => setOpen(true),
  })
  const stale =
    reloadRequired ||
    (!!draft &&
      (draft.context.revision !== context.revision ||
        draft.context.sessionId !== context.sessionId ||
        draft.context.archiveId !== context.archiveId))
  const disabled = busy || stale || !!pendingOperation
  const [flight] = useState(() => new SingleFlight())
  const checked = async <T,>(call: () => Promise<ApplicationResult<T>>) => {
    const result = await archives.execute(call)
    if (
      !result.ok &&
      ['REVISION_CONFLICT', 'ARCHIVE_SESSION_CHANGED'].includes(result.error.code)
    ) {
      if (active.current) setReloadRequired(true)
      await archives.update(() => window.archives.getState())
    }
    if (result.ok || result.error.code === 'NOT_FOUND') {
      const state = await archives.update(() => window.archives.getState())
      if (
        !state?.context ||
        !result.context ||
        state.context.sessionId !== result.context.sessionId ||
        state.context.archiveId !== result.context.archiveId ||
        state.context.revision !== result.context.revision
      )
        throw Error('Risposta superata')
    }
    return result
  }
  const applied = (operation: VesselOperationDto) => {
    setOpen(false)
    setDraft(null)
    setPreview(null)
    setPendingOperation(null)
    setReloadRequired(false)
    setSelected(operation.id)
    setDetail(operation)
    setDetailRevision(null)
    setNotice('Esito della registrazione verificato.')
    setReload((n) => n + 1)
  }
  const reloadDraft = async () => {
    if (!draft || busy) return
    invalidateEditor()
    if (pendingOperation) {
      const result = await commandRequest.request(() =>
        checked(() =>
          window.operations.get({
            context: { sessionId: pendingOperation.context.sessionId },
            query: { id: pendingOperation.id },
          }),
        ),
      )
      if (!active.current) return
      const outcome = operationCreationOutcome(pendingOperation, result)
      if (outcome === 'APPLIED' && result?.ok) applied(result.value)
      else if (outcome === 'UNCHANGED' && result?.context) {
        setPendingOperation(null)
        setReloadRequired(false)
        setDraft({ ...draft, context: result.context })
        setDialogError(null)
        setNotice('Operazione assente: puoi generare una nuova anteprima della bozza conservata.')
      } else
        setDialogError(
          'Esito ancora ignoto: conserva la bozza e ripeti la verifica dell’operazione originale.',
        )
      return
    }
    const result = await commandRequest.request(() =>
      checked(() =>
        window.operations.list({
          context: { sessionId: draft.context.sessionId },
          query: { vesselId: draft.values.vesselId, page: 1, pageSize: 1 },
        }),
      ),
    )
    if (result?.ok && active.current) {
      setDraft({ ...draft, context: result.context })
      setReloadRequired(false)
    }
  }
  useEffect(() => {
    onDialogChange(open || assignmentOpen || completionOpen || maintenanceOpen)
    return () => onDialogChange(false)
  }, [open, assignmentOpen, completionOpen, maintenanceOpen, onDialogChange])
  useEffect(() => {
    if (!vesselId) {
      setList(null)
      return
    }
    void readList(() =>
      window.operations.list({
        context: { sessionId: context.sessionId },
        query: { vesselId, page, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok && pageCurrent()) {
        setList(r.value)
        const last = Math.max(1, Math.ceil(r.value.total / 25))
        if (page > last) setPage(last)
      }
    })
    return listRequest.invalidate
  }, [
    readList,
    listRequest.invalidate,
    context.sessionId,
    context.revision,
    vesselId,
    page,
    reload,
  ])
  useEffect(() => {
    if (!vesselId) {
      setStays(null)
      return
    }
    void readStays(() =>
      window.operations.stays({
        context: { sessionId: context.sessionId },
        query: { vesselId, page: stayPage, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok && stayPageCurrent()) {
        setStays(r.value)
        const last = Math.max(1, Math.ceil(r.value.total / 25))
        if (stayPage > last) setStayPage(last)
      }
    })
    return stayRequest.invalidate
  }, [
    readStays,
    stayRequest.invalidate,
    context.sessionId,
    context.revision,
    vesselId,
    stayPage,
    reload,
  ])
  useEffect(() => {
    if (!selected) {
      setDetail(null)
      setDetailRevision(null)
      return
    }
    void readDetail(
      () =>
        window.operations.get({
          context: { sessionId: context.sessionId },
          query: { id: selected },
        }),
      { expectedAbsence: true },
    ).then((r) => {
      if (!selectionCurrent()) return
      if (r?.ok) {
        setDetail(r.value)
        setDetailRevision(r.context.revision)
      } else if (r && !r.ok && r.error.code === 'NOT_FOUND') {
        setSelected(null)
        setDetail(null)
        setDetailRevision(null)
        setError(null)
      }
    })
    return invalidateDetail
  }, [invalidateDetail, readDetail, context.sessionId, context.revision, selected, reload])
  useEffect(() => {
    contextRequest.invalidate()
    setOperationalContext(null)
  }, [context.revision, contextRequest.invalidate])
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
  const start = (type: 'ENTRY' | 'EXIT' | 'MOVEMENT', retrospective = false) => {
    guard.request({
      label: 'iniziare una nuova operazione',
      run: () => {
        if (!vesselId || busy) return
        trigger.current = retrospective
          ? insertionTrigger.current
          : (document.activeElement as HTMLElement)
        invalidateEditor()
        setReloadRequired(false)
        setDraft({
          retrospective,
          context,
          override: '',
          arrivalOverride: '',
          values: {
            vesselId,
            operationType: type,
            moment: emptyMoment(),
            executionStatus: 'PLANNED',
            notes: null,
            manualOverrideAmount: null,
            ...(type === 'ENTRY' ? { portId: '', berthId: null } : { interpretationPortId: null }),
            ...(type === 'MOVEMENT'
              ? { destinationPortId: '', destinationBerthId: null, arrivalMoment: emptyMoment() }
              : {}),
          } as CreateOperationDto,
        })
        setOpen(true)
      },
    })
  }
  const target = (): OperationMomentInput => {
    const v = draft!.values
    if (v.operationType === 'MOVEMENT')
      return {
        operationType: v.operationType,
        vesselId: v.vesselId,
        moment: v.moment,
        interpretationPortId: v.interpretationPortId,
        destinationPortId: v.destinationPortId,
        destinationBerthId: v.destinationBerthId,
        arrivalMoment: v.arrivalMoment,
      }
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
    if (!draft || disabled) return
    setDialogError(null)
    let override: string | null = null
    override = draft.override.trim() ? moneyInput(draft.override) : null
    if (draft.override.trim() && override === null) {
      setDialogError('Inserisci un importo non negativo con al massimo due decimali.')
      return
    }
    const arrivalOverride = draft.arrivalOverride.trim() ? moneyInput(draft.arrivalOverride) : null
    if (draft.arrivalOverride.trim() && arrivalOverride === null) {
      setDialogError('Inserisci un importo all’arrivo non negativo con al massimo due decimali.')
      return
    }
    const r = await commandRequest.request(() =>
      checked(() =>
        (draft.retrospective ? window.operations.previewInsert : window.operations.previewCreate)({
          context: draft.context,
          payload: {
            ...draft.values,
            manualOverrideAmount: override,
            ...(draft.values.operationType === 'MOVEMENT'
              ? { arrivalManualOverrideAmount: arrivalOverride }
              : {}),
          },
        }),
      ),
    )
    if (r?.ok) setPreview(r.value)
  }
  const confirm = () =>
    flight.run(async () => {
      if (!preview || !draft || disabled || preview.status !== 'READY') return
      const pending = { id: preview.operationValues.id, context: preview.context }
      const r = await commandRequest.request(() =>
        checked(() =>
          (draft.retrospective ? window.operations.confirmInsert : window.operations.confirmCreate)(
            {
              context: preview.context,
              payload: { previewId: preview.previewId },
            },
          ),
        ),
      )
      if (!active.current) return
      if (r?.ok) applied(r.value)
      else if (!r || (!r.ok && r.error.code === 'UNEXPECTED')) {
        setPendingOperation(pending)
        setPreview(null)
      }
    })
  const effects = async (page: number) => {
    if (!preview) return
    const r = await effectsRequest.request(() =>
      (draft?.retrospective
        ? window.operations.insertionEffects
        : window.operations.previewEffects)({
        context: { sessionId: context.sessionId },
        query: { previewId: preview.previewId, page, pageSize: 50 },
      }),
    )
    if (r?.ok) setPreview(r.value)
  }
  const selectedVessel = (id: string | null) => {
    if (id === vesselId) return
    guard.request({
      label: 'cambiare nave',
      run: () => {
        contextRequest.invalidate()
        setOperationalContext(null)
        listRequest.invalidate()
        stayRequest.invalidate()
        detailRequest.invalidate()
        invalidateEditor()
        setVesselId(id)
        setList(null)
        setStays(null)
        setDetail(null)
        setDraft(null)
      },
    })
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
          <Button disabled={!vesselId || busy} variant="light" onClick={() => start('MOVEMENT')}>
            Nuovo spostamento
          </Button>
          <Menu>
            <Menu.Target>
              <Button ref={insertionTrigger} disabled={!vesselId || busy} variant="default">
                Inserisci operazione retroattiva
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => start('ENTRY', true)}>Entrata retroattiva</Menu.Item>
              <Menu.Item onClick={() => start('EXIT', true)}>Uscita retroattiva</Menu.Item>
              <Menu.Item onClick={() => start('MOVEMENT', true)}>Spostamento retroattivo</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          {draft && !open && (
            <Button
              ref={resumeDraft}
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
      <VesselPicker
        consultation={consultationPicker}
        onMissing={() => setVesselId((current) => (current === vesselId ? null : current))}
        context={context}
        value={vesselId}
        onChange={selectedVessel}
        disabled={busy}
      />
      {error && (
        <StateMessage kind="error" title="Consultazione non disponibile">
          {error}
        </StateMessage>
      )}
      {notice && (
        <StateMessage
          kind="success"
          title={notice}
          onClose={() => {
            setNotice(null)
            consultationFocus.current?.focus()
          }}
        />
      )}
      <Group>
        <Button
          aria-pressed={view === 'operations'}
          variant={view === 'operations' ? 'filled' : 'default'}
          onClick={() => setView('operations')}
        >
          Operazioni
        </Button>
        <Button
          aria-pressed={view === 'stays'}
          variant={view === 'stays' ? 'filled' : 'default'}
          onClick={() => setView('stays')}
        >
          Permanenze
        </Button>
        <Button
          ref={consultationFocus}
          variant="subtle"
          disabled={busy}
          onClick={() => setReload((n) => n + 1)}
        >
          Ricarica consultazione
        </Button>
      </Group>
      <p className="operations-future">
        Consuntiva, correggi o elimina le operazioni dal dettaglio. Puoi aggiornare separatamente le
        sole note.
      </p>
      {assignmentTarget && !assignmentOpen && (
        <Button variant="default" onClick={() => setAssignmentOpen(true)}>
          Riprendi assegnazione
        </Button>
      )}
      {!vesselId ? (
        <StateMessage title="Scegli una nave">
          Consulta la cronologia e registra un’entrata, un’uscita o uno spostamento.
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
                    {operationLabels[o.operationType]} · {executionLabels[o.executionStatus]}
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
          <div
            className="operations-detail archive-panel"
            role="region"
            aria-label="Consultazione operazione"
            tabIndex={0}
          >
            {detailRequest.loading ? (
              <p role="status">Caricamento dettaglio…</p>
            ) : detail ? (
              <>
                <Button
                  disabled={busy}
                  onClick={() => assign({ kind: 'VESSEL_OPERATION', id: detail.id })}
                >
                  Assegna soggetti all’operazione
                </Button>
                <OperationDetail operation={detail} />
                <Group>
                  {(['NOTES', 'DELETE'] as const).map((mode) => (
                    <Button
                      key={mode}
                      color={mode === 'DELETE' ? 'red' : undefined}
                      variant="light"
                      disabled={busy || detailRevision !== context.revision}
                      onClick={() => {
                        guard.request({
                          label: 'iniziare una modifica',
                          run: () => {
                            setMaintenance({
                              operation: detail,
                              context,
                              mode,
                              trigger: document.activeElement as HTMLElement,
                            })
                            setMaintenanceDone(false)
                            setMaintenanceOpen(true)
                          },
                        })
                      }}
                    >
                      {mode === 'DELETE' ? 'Elimina operazione' : 'Modifica solo note'}
                    </Button>
                  ))}
                </Group>
                <Button
                  disabled={busy || detailRevision !== context.revision}
                  onClick={() => {
                    guard.request({
                      label: 'iniziare una modifica',
                      run: () => {
                        setCompletion({
                          operation: detail,
                          context,
                          correction: true,
                          trigger: document.activeElement as HTMLElement,
                        })
                        setCompletionDone(false)
                        setCompletionOpen(true)
                      },
                    })
                  }}
                >
                  Correggi operazione
                </Button>
                {detail.executionStatus === 'PLANNED' && (
                  <Button
                    disabled={busy || detailRevision !== context.revision}
                    onClick={() => {
                      guard.request({
                        label: 'iniziare una modifica',
                        run: () => {
                          setCompletion({
                            operation: detail,
                            correction: false,
                            context,
                            trigger: document.activeElement as HTMLElement,
                          })
                          setCompletionDone(false)
                          setCompletionOpen(true)
                        },
                      })
                    }}
                  >
                    Consuntiva operazione
                  </Button>
                )}
              </>
            ) : (
              <p>Seleziona un’operazione per consultare dati e calcolo.</p>
            )}
          </div>
        </div>
      ) : (
        <div
          className="operations-stays"
          role="region"
          aria-label="Permanenze derivate"
          tabIndex={0}
        >
          {stayRequest.loading ? (
            <p role="status">Caricamento permanenze…</p>
          ) : stays?.total === 0 ? (
            <p>Nessuna permanenza. Le operazioni mancate non producono struttura.</p>
          ) : null}
          <Fieldset legend="Contesto a un istante" p="xs">
            <Group align="end">
              <TextInput
                style={{ flex: 1, minWidth: 200 }}
                min="0001-01-01T00:00"
                max="9999-12-31T23:59"
                step={60}
                type="datetime-local"
                label="Istante UTC"
                value={contextInstant}
                onChange={(e) => {
                  contextRequest.invalidate()
                  setOperationalContext(null)
                  setContextInstant(e.currentTarget.value)
                }}
              />
              <Button
                disabled={!contextInstant || !vesselId || contextRequest.loading}
                onClick={() => {
                  void contextRequest
                    .request(() =>
                      window.operations.contextAt({
                        context: { sessionId: context.sessionId },
                        query: { vesselId: vesselId!, instant: contextInstant + ':00.000Z' },
                      }),
                    )
                    .then((r) => {
                      if (r?.ok) setOperationalContext(r.value)
                    })
                }}
              >
                Consulta contesto
              </Button>
            </Group>
            {operationalContext && (
              <div aria-label="Contesto operativo">
                <p>
                  {operationalContext.status === 'OUTSIDE'
                    ? 'Fuori da un viaggio.'
                    : operationalContext.status === 'IN_TRANSFER'
                      ? operationalContext.portCallId === null
                        ? 'In trasferimento tra porti: nessuna visita e nessun ormeggio applicabili.'
                        : 'In trasferimento: nessun ormeggio applicabile.'
                      : 'In porto.'}
                </p>
                <details>
                  <summary>Identità del contesto</summary>
                  <p>
                    Viaggio: {operationalContext.voyageId ?? '—'}
                    <br />
                    Visita: {operationalContext.portCallId ?? '—'}
                    <br />
                    Ormeggio: {operationalContext.berthStayId ?? '—'}
                    <br />
                    Banchina: {operationalContext.berthId ?? 'Non specificata'}
                  </p>
                </details>
              </div>
            )}
          </Fieldset>
          {stays?.items.map((v) => (
            <article key={v.id} className="operation-voyage">
              <Button
                disabled={busy}
                variant="light"
                onClick={() => assign({ kind: 'VOYAGE', id: v.id })}
              >
                Assegna soggetti al viaggio
              </Button>
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
                  <Button
                    disabled={busy}
                    variant="light"
                    onClick={() => assign({ kind: 'PORT_CALL', id: p.id })}
                  >
                    Assegna soggetti alla visita
                  </Button>
                  <h4>Visita · {p.portName}</h4>
                  <p>
                    {p.id} · {p.startedAt} → {p.endedAt ?? 'Aperta'}
                  </p>
                  {p.stays.map((b) => (
                    <div key={b.id}>
                      <Button
                        disabled={busy}
                        variant="light"
                        onClick={() => assign({ kind: 'BERTH_STAY', id: b.id })}
                      >
                        Assegna soggetti all’ormeggio
                      </Button>
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
      {assignmentTarget && (
        <AssignmentEditor
          key={assignmentTarget.kind + assignmentTarget.id + editorGeneration}
          archives={archives}
          target={assignmentTarget}
          onResume={() => setAssignmentOpen(true)}
          opened={assignmentOpen}
          trigger={assignmentTrigger.current}
          onClose={() => setAssignmentOpen(false)}
          onSaved={() => {
            setReload((n) => n + 1)
            setAssignmentTarget(null)
            setNotice('Assegnazioni aggiornate.')
            assignmentTrigger.current?.focus()
          }}
        />
      )}
      {maintenance && !maintenanceDone && (
        <OperationMaintenanceEditor
          key={
            maintenance.operation.id +
            maintenance.context.revision +
            maintenance.mode +
            editorGeneration
          }
          operation={maintenance.operation}
          mode={maintenance.mode}
          opened={maintenanceOpen}
          withDetailSuspended={detailRequest.suspendWhile}
          originalContext={maintenance.context}
          archives={archives}
          trigger={maintenance.trigger}
          onClose={() => setMaintenanceOpen(false)}
          onUncertainChange={setMaintenanceUncertain}
          onResume={() => setMaintenanceOpen(true)}
          onApplied={(value) => {
            detailRequest.invalidate()
            setMaintenanceDone(true)
            setMaintenanceOpen(false)
            setMaintenanceUncertain(false)
            setSelected(value?.id ?? null)
            setDetail(value)
            setDetailRevision(null)
            setReload((n) => n + 1)
            setNotice(
              value
                ? 'Note aggiornate: esito verificato.'
                : 'Operazione eliminata: assenza verificata.',
            )
          }}
        />
      )}
      {maintenance && !maintenanceOpen && !maintenanceDone && (
        <Group>
          <Button variant="light" disabled={busy} onClick={() => setMaintenanceOpen(true)}>
            {maintenance.mode === 'DELETE' ? 'Riprendi eliminazione' : 'Riprendi modifica note'}
          </Button>
          <Button
            variant="default"
            disabled={busy || maintenanceUncertain}
            onClick={() => {
              guard.request({
                label: 'scartare la bozza',
                run: () => {
                  setMaintenance(null)
                  setMaintenanceDone(true)
                },
              })
            }}
          >
            Scarta bozza della modifica
          </Button>
        </Group>
      )}
      {completion && !completionDone && (
        <OperationCompletionEditor
          key={
            completion.operation.id +
            completion.context.revision +
            completion.correction +
            editorGeneration
          }
          onResume={() => setCompletionOpen(true)}
          correction={completion.correction}
          opened={completionOpen}
          operation={completion.operation}
          originalContext={completion.context}
          archives={archives}
          trigger={completion.trigger}
          onClose={() => setCompletionOpen(false)}
          onApplied={(value) => {
            setCompletionDone(true)
            setVesselId(value.vesselId)
            setSelected(value.id)
            setDetail(value)
            setDetailRevision(null)
            setReload((n) => n + 1)
            setNotice('Esito dell’operazione verificato.')
          }}
        />
      )}
      {completion && !completionOpen && !completionDone && (
        <Group>
          <Button variant="light" disabled={busy} onClick={() => setCompletionOpen(true)}>
            {completion.correction ? 'Riprendi correzione' : 'Riprendi consuntivazione'}
          </Button>
          <Button
            variant="default"
            disabled={busy}
            onClick={() => {
              guard.request({
                label: 'scartare la bozza',
                run: () => {
                  setCompletion(null)
                  setCompletionDone(true)
                },
              })
            }}
          >
            Scarta bozza della modifica
          </Button>
        </Group>
      )}
      <Modal
        opened={open}
        onClose={close}
        title={
          preview
            ? draft?.retrospective
              ? 'Anteprima inserimento retroattivo'
              : 'Anteprima registrazione'
            : draft?.retrospective
              ? 'Inserisci operazione retroattiva'
              : draft?.values.operationType === 'ENTRY'
                ? 'Nuova entrata'
                : draft?.values.operationType === 'MOVEMENT'
                  ? 'Nuovo spostamento'
                  : 'Nuova uscita'
        }
        size="xl"
        closeOnEscape={!busy}
        closeOnClickOutside={false}
        withCloseButton={!busy}
        returnFocus={false}
        onExitTransitionEnd={() => {
          if (trigger.current?.isConnected && !trigger.current.matches(':disabled'))
            trigger.current.focus()
          else resumeDraft.current?.focus()
        }}
      >
        {dialogError && (
          <StateMessage kind="error" title="Registrazione non disponibile">
            {dialogError}
          </StateMessage>
        )}
        {draft && stale && (
          <StateMessage kind="warning" title="Bozza obsoleta">
            I dati sono cambiati. Ricarica esplicitamente la bozza per proseguire.
          </StateMessage>
        )}
        {pendingOperation && (
          <StateMessage kind="warning" title="Esito della scrittura da verificare">
            Rileggi l’operazione prima di proseguire. La bozza è conservata; non ripetere la
            conferma.
          </StateMessage>
        )}
        {preview ? (
          <>
            {draft?.retrospective && (
              <section aria-label="Prima dell’inserimento">
                <h3>Prima</h3>
                <p>
                  Operazione assente. Le permanenze e le attribuzioni attuali sono riportate negli
                  effetti.
                </p>
                <h3>Dopo l’inserimento</h3>
              </section>
            )}
            <OperationDetail operation={preview.operationValues} />
            <PortConfirmation
              cancelDisabled={busy || !!pendingOperation}
              preview={preview}
              revision={context.revision}
              disabled={disabled}
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
                data-autofocus
                value={draft.values.executionStatus}
                data={Object.entries(executionLabels).map(([value, label]) => ({ value, label }))}
                disabled={disabled}
                allowDeselect={false}
                onChange={(v) => change({ ...draft.values, executionStatus: v as ExecutionStatus })}
              />
              {draft.values.operationType === 'ENTRY' ? (
                <>
                  <PortPicker
                    context={context}
                    label="Porto di arrivo"
                    value={draft.values.portId || null}
                    disabled={disabled}
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
                      disabled={disabled}
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
                        change({
                          ...draft.values,
                          interpretationPortId: id,
                          moment: { ...draft.values.moment, selectedOffset: null },
                        } as CreateOperationDto)
                      }
                      disabled={disabled}
                    />
                  </details>
                </>
              )}
              {draft.values.operationType === 'MOVEMENT' && (
                <>
                  <PortPicker
                    context={context}
                    label="Porto di destinazione"
                    value={draft.values.destinationPortId || null}
                    disabled={disabled}
                    onChange={(id) =>
                      change({
                        ...draft.values,
                        operationType: 'MOVEMENT',
                        interpretationPortId:
                          draft.values.operationType === 'MOVEMENT'
                            ? draft.values.interpretationPortId
                            : null,
                        arrivalMoment:
                          draft.values.operationType === 'MOVEMENT'
                            ? { ...draft.values.arrivalMoment, selectedOffset: null }
                            : emptyMoment(),
                        destinationPortId: id ?? '',
                        destinationBerthId: null,
                      })
                    }
                  />
                  {draft.values.destinationPortId && (
                    <BerthPicker
                      key={draft.values.destinationPortId}
                      context={context}
                      portId={draft.values.destinationPortId}
                      value={draft.values.destinationBerthId}
                      disabled={disabled}
                      onChange={(id) => {
                        if (draft.values.operationType === 'MOVEMENT')
                          change({ ...draft.values, destinationBerthId: id })
                      }}
                    />
                  )}
                  <p>
                    Partenza e arrivo usano i fusi dei rispettivi porti. La banchina di destinazione
                    può non essere specificata.
                  </p>
                </>
              )}
              <TariffMomentFields
                economic
                label={draft.values.operationType === 'MOVEMENT' ? 'Partenza locale' : undefined}
                resolveLabel={
                  draft.values.operationType === 'MOVEMENT' ? 'Verifica estremi' : undefined
                }
                moment={draft.values.moment}
                onChange={(m) => change({ ...draft.values, moment: m })}
                resolution={resolution?.resolution ?? null}
                onResolve={() => void resolve()}
                disabled={disabled}
              />
              {draft.values.operationType === 'MOVEMENT' && (
                <TariffMomentFields
                  economic
                  label="Arrivo locale"
                  resolveLabel="Verifica arrivo"
                  moment={draft.values.arrivalMoment}
                  onChange={(m) => {
                    if (draft.values.operationType === 'MOVEMENT')
                      change({ ...draft.values, arrivalMoment: m })
                  }}
                  resolution={resolution?.arrivalResolution ?? null}
                  onResolve={() => void resolve()}
                  disabled={disabled}
                />
              )}
              <TextInput
                label="Sostituzione manuale della base (EUR, facoltativa)"
                description="Anche zero. Il calcolo tariffario resta conservato."
                value={draft.override}
                disabled={disabled}
                onChange={(e) => {
                  invalidateEditor()
                  setDraft({ ...draft, override: e.currentTarget.value })
                }}
              />
              {draft.values.operationType === 'MOVEMENT' && (
                <TextInput
                  label="Sostituzione manuale all’arrivo (EUR, facoltativa)"
                  description="Solo tra porti: ENTRY all’arrivo. Il campo precedente sostituisce EXIT alla partenza; nello stesso porto sostituisce MOVEMENT."
                  value={draft.arrivalOverride}
                  disabled={disabled}
                  onChange={(e) => {
                    invalidateEditor()
                    setDraft({ ...draft, arrivalOverride: e.currentTarget.value })
                  }}
                />
              )}
              <Textarea
                label="Note"
                value={draft.values.notes ?? ''}
                maxLength={10000}
                disabled={disabled}
                onChange={(e) => change({ ...draft.values, notes: e.currentTarget.value || null })}
              />
              <Group className="form-actions">
                <Button variant="default" onClick={close} disabled={busy}>
                  Chiudi
                </Button>
                <Button variant="default" disabled={busy} onClick={() => void reloadDraft()}>
                  {pendingOperation ? 'Verifica esito della scrittura' : 'Ricarica bozza'}
                </Button>
                <Button
                  variant="subtle"
                  disabled={busy || !!pendingOperation}
                  onClick={() => {
                    guard.request({
                      label: 'scartare la bozza',
                      run: () => {
                        invalidateEditor()
                        setDraft(null)
                        setReloadRequired(false)
                        setOpen(false)
                      },
                    })
                  }}
                >
                  Scarta bozza
                </Button>
                <Button
                  disabled={
                    disabled ||
                    !draft.values.moment.localDateTime ||
                    (draft.values.operationType === 'ENTRY' && !draft.values.portId) ||
                    (draft.values.operationType === 'MOVEMENT' &&
                      (!draft.values.destinationPortId ||
                        !draft.values.arrivalMoment.localDateTime))
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
