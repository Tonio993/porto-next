import { useEffect, useRef, useState } from 'react'
import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core'
import type { ApplicationResult, ArchiveContextDto } from '../../../../shared/contracts/application'
import type {
  CreateOperationDto,
  OperationCompletionPreviewDto,
  OperationMomentDto,
  VesselOperationDto,
} from '../../../../shared/contracts/operations'
import type { useArchives } from '../../api/use-archives'
import { useApplicationRequest } from '../../api/use-application-request'
import { operationCorrectionOutcome } from '../../api/operation-correction-outcome'
import { moneyInput } from '../../api/numeric-input'
import { StateMessage } from '../StateMessage'
import { PortConfirmation } from '../ports/PortConfirmation'
import { PortPicker } from '../tariffs/PortPicker'
import { TariffMomentFields } from '../tariffs/TariffMomentFields'
import { BerthPicker } from './BerthPicker'
import { OperationDetail } from './OperationDetail'
import { VesselPicker } from './VesselPicker'

function fromOperation(op: VesselOperationDto, correction = false): CreateOperationDto {
  const moment = {
    localDateTime: op.endpoint.moment.localDateTime,
    selectedOffset: op.endpoint.moment.offset,
  }
  const base = {
    vesselId: op.vesselId,
    moment,
    executionStatus: correction ? op.executionStatus : ('PERFORMED' as const),
    notes: op.notes,
    manualOverrideAmount: op.charges.find((c) => c.economicEndpointRole !== 'ARRIVAL')!
      .manualOverrideAmount,
  }
  if (op.operationType === 'ENTRY')
    return {
      ...base,
      operationType: 'ENTRY',
      portId: op.endpoint.portId,
      berthId: op.endpoint.berthId,
    }
  if (op.operationType === 'EXIT')
    return { ...base, operationType: 'EXIT', interpretationPortId: op.endpoint.portId }
  return {
    ...base,
    operationType: 'MOVEMENT',
    interpretationPortId: op.endpoint.portId,
    destinationPortId: op.arrival!.portId,
    destinationBerthId: op.arrival!.berthId,
    arrivalMoment: {
      localDateTime: op.arrival!.moment.localDateTime,
      selectedOffset: op.arrival!.moment.offset,
    },
    arrivalManualOverrideAmount:
      op.charges.find((c) => c.economicEndpointRole === 'ARRIVAL')?.manualOverrideAmount ?? null,
  }
}
export function OperationCompletionEditor({
  operation,
  opened,
  originalContext,
  archives,
  onClose,
  onApplied,
  trigger,
  correction = false,
}: {
  operation: VesselOperationDto
  opened: boolean
  originalContext: ArchiveContextDto
  archives: ReturnType<typeof useArchives>
  onClose: () => void
  onApplied: (value: VesselOperationDto) => void
  trigger: HTMLElement | null
  correction?: boolean
}) {
  const api = correction
    ? {
        resolve: window.operations.resolveCorrectionMoment,
        preview: window.operations.previewCorrect,
        effects: window.operations.correctionEffects,
        confirm: window.operations.confirmCorrect,
      }
    : {
        resolve: window.operations.resolveCompletionMoment,
        preview: window.operations.previewComplete,
        effects: window.operations.completionEffects,
        confirm: window.operations.confirmComplete,
      }
  const expected = useRef<VesselOperationDto | null>(null)
  const context = archives.state.context!
  const [draftContext, setDraftContext] = useState(originalContext)
  const [original, setOriginal] = useState(operation)
  const [values, setValues] = useState(() => fromOperation(operation, correction))
  const [amount, setAmount] = useState(
    operation.charges.find((c) => c.economicEndpointRole !== 'ARRIVAL')!.manualOverrideAmount ?? '',
  )
  const [arrivalAmount, setArrivalAmount] = useState(
    operation.charges.find((c) => c.economicEndpointRole === 'ARRIVAL')?.manualOverrideAmount ?? '',
  )
  const [preview, setPreview] = useState<OperationCompletionPreviewDto | null>(null)
  const [resolution, setResolution] = useState<OperationMomentDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const [reloadRequired, setReloadRequired] = useState(false)
  const setOpen = (value: boolean) => {
    if (!value) onClose()
  }
  const editor = useApplicationRequest(context, setError),
    resolving = useApplicationRequest(context, setError),
    paging = useApplicationRequest(context, setError)
  const busy =
    archives.busy || archives.commandBusy || editor.loading || resolving.loading || paging.loading
  const stale = reloadRequired || context.revision !== draftContext.revision
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const invalidate = () => {
    editor.invalidate()
    resolving.invalidate()
    paging.invalidate()
    setPreview(null)
    setResolution(null)
    setError(null)
  }
  const change = (next: CreateOperationDto) => {
    invalidate()
    setValues(next)
  }
  const checked = async <T,>(call: () => Promise<ApplicationResult<T>>) => {
    const result = await archives.execute(call)
    if (
      !result.ok &&
      ['REVISION_CONFLICT', 'ARCHIVE_SESSION_CHANGED'].includes(result.error.code)
    ) {
      if (active.current) setReloadRequired(true)
      await archives.update(() => window.archives.getState())
    }
    if (result.ok) {
      const state = await archives.update(() => window.archives.getState())
      if (
        !state?.context ||
        !result.context ||
        state.context.sessionId !== result.context.sessionId ||
        state.context.revision !== result.context.revision ||
        state.context.archiveId !== result.context.archiveId
      )
        throw Error('Risposta superata')
    }
    return result
  }
  const reload = async () => {
    invalidate()
    const result = await editor.request(() =>
      checked(() =>
        window.operations.get({
          context: { sessionId: draftContext.sessionId },
          query: { id: original.id },
        }),
      ),
    )
    if (result?.ok && active.current) {
      setUncertain(false)
      setReloadRequired(false)
      if (!correction && result.value.executionStatus !== 'PLANNED') {
        onApplied(result.value)
        setOpen(false)
      } else {
        setOriginal(result.value)
        setValues(fromOperation(result.value, correction))
        setAmount(
          result.value.charges.find((c) => c.economicEndpointRole !== 'ARRIVAL')!
            .manualOverrideAmount ?? '',
        )
        setArrivalAmount(
          result.value.charges.find((c) => c.economicEndpointRole === 'ARRIVAL')
            ?.manualOverrideAmount ?? '',
        )
        setDraftContext(result.context)
      }
    }
  }
  const verifyOutcome = async () => {
    const result = await editor.request(() =>
      checked(() =>
        window.operations.get({
          context: { sessionId: draftContext.sessionId },
          query: { id: original.id },
        }),
      ),
    )
    if (!result?.ok || !active.current) return
    if (!expected.current) return
    const outcome = operationCorrectionOutcome(
      original,
      expected.current,
      result.value,
      draftContext,
      result.context,
    )
    if (outcome === 'APPLIED') {
      onApplied(result.value)
      setOpen(false)
    } else if (outcome === 'UNCHANGED') {
      setUncertain(false)
      setPreview(null)
      setError(
        'La modifica non risulta applicata. Puoi generare una nuova anteprima della bozza conservata.',
      )
    } else {
      setReloadRequired(true)
      setUncertain(false)
      setError(
        'La cronologia è cambiata. Ricarica esplicitamente la bozza dai dati attuali prima di continuare.',
      )
    }
  }
  const confirm = async () => {
    if (!preview || uncertain) return
    expected.current = preview.operationValues
    const result = await editor.request(() =>
      checked(() =>
        api.confirm({
          context: preview.context,
          payload: { previewId: preview.previewId },
        }),
      ),
    )
    if (!active.current) return
    if (result?.ok) {
      onApplied(result.value)
      setOpen(false)
    } else if (!result || (!result.ok && result.error.code === 'UNEXPECTED')) {
      setUncertain(true)
      setPreview(null)
    }
  }
  const missed = !correction && values.executionStatus === 'MISSED'
  const disabled =
    busy || stale || uncertain || (!correction && original.executionStatus !== 'PLANNED')
  const showPreview = () => {
    const base = amount.trim() ? moneyInput(amount) : null
    const arrival = arrivalAmount.trim() ? moneyInput(arrivalAmount) : null
    if ((amount.trim() && base === null) || (arrivalAmount.trim() && arrival === null)) {
      setError('Indica un importo non negativo con al massimo due decimali.')
      return
    }
    const payload = {
      id: original.id,
      values: {
        ...values,
        manualOverrideAmount: base,
        ...(values.operationType === 'MOVEMENT'
          ? {
              arrivalManualOverrideAmount:
                correction || values.destinationPortId !== original.endpoint.portId
                  ? arrival
                  : null,
            }
          : {}),
      },
    }
    void editor
      .request(() => checked(() => api.preview({ context: draftContext, payload })))
      .then((r) => {
        if (r?.ok) setPreview(r.value)
      })
  }
  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!busy) {
          invalidate()
          setOpen(false)
        }
      }}
      title={correction ? 'Correggi operazione' : 'Consuntiva operazione'}
      size="xl"
      closeOnClickOutside={false}
      closeOnEscape={!busy}
      withCloseButton={!busy}
      returnFocus={false}
      onExitTransitionEnd={() => {
        if (trigger?.isConnected) trigger.focus()
        else document.querySelector<HTMLElement>('[aria-label="Consultazione operazione"]')?.focus()
      }}
    >
      {error && (
        <StateMessage kind="error" title="Modifica non disponibile">
          {error}
        </StateMessage>
      )}
      {stale && (
        <StateMessage kind="warning" title="Bozza obsoleta">
          I dati sono cambiati. I valori inseriti sono conservati: ricarica esplicitamente la bozza.
        </StateMessage>
      )}
      {uncertain && (
        <StateMessage kind="warning" title="Esito non verificato">
          Verifica l’esito della scrittura prima di riprovare. I valori inseriti sono conservati.
        </StateMessage>
      )}
      {((stale && !uncertain) || (!correction && uncertain)) && (
        <Button disabled={busy} onClick={() => void reload()}>
          Ricarica bozza
        </Button>
      )}
      {correction && uncertain && (
        <Button disabled={busy} onClick={() => void verifyOutcome()}>
          Verifica esito della scrittura
        </Button>
      )}
      {preview ? (
        <>
          {preview.blockers.length > 0 && (
            <StateMessage kind="error" title="Modifica bloccata">
              {preview.blockers.map((blocker, index) => (
                <p key={index}>
                  {blocker.reference.label}: {blocker.reason}
                </p>
              ))}
            </StateMessage>
          )}
          <div className="service-comparison">
            <section aria-label="Prima della consuntivazione">
              <h3>Prima</h3>
              <OperationDetail operation={preview.before} />
            </section>
            <section aria-label="Dopo la consuntivazione">
              <h3>Dopo</h3>
              <OperationDetail operation={preview.operationValues} />
            </section>
          </div>
          <PortConfirmation
            cancelDisabled={busy || uncertain}
            preview={preview}
            revision={context.revision}
            disabled={busy || uncertain || stale}
            onConfirm={() => void confirm()}
            onCancel={() => {
              paging.invalidate()
              setPreview(null)
            }}
            onPage={(page) => {
              void paging
                .request(() =>
                  checked(() =>
                    api.effects({
                      context: { sessionId: preview.context.sessionId },
                      query: { previewId: preview.previewId, page, pageSize: 50 },
                    }),
                  ),
                )
                .then((r) => {
                  if (r?.ok) setPreview(r.value)
                })
            }}
          />
        </>
      ) : (
        <Stack>
          {correction && (
            <>
              <VesselPicker
                context={draftContext}
                value={values.vesselId}
                disabled={disabled}
                retainedId={original.vesselId}
                onChange={(id) =>
                  change({
                    ...values,
                    vesselId: id ?? '',
                    moment: { ...values.moment, selectedOffset: null },
                    ...(values.operationType !== 'ENTRY' ? { interpretationPortId: null } : {}),
                  })
                }
              />
              <Select
                label="Tipologia"
                value={values.operationType}
                allowDeselect={false}
                disabled={disabled}
                data={[
                  { value: 'ENTRY', label: 'Entrata' },
                  { value: 'EXIT', label: 'Uscita' },
                  { value: 'MOVEMENT', label: 'Spostamento' },
                ]}
                onChange={(type) => {
                  if (!type || type === values.operationType) return
                  const common = {
                    vesselId: values.vesselId,
                    executionStatus: values.executionStatus,
                    notes: values.notes,
                    manualOverrideAmount: null,
                    moment: values.moment,
                  }
                  setArrivalAmount('')
                  change(
                    type === 'ENTRY'
                      ? {
                          ...common,
                          operationType: 'ENTRY',
                          portId: original.endpoint.portId,
                          berthId: original.endpoint.berthId,
                        }
                      : type === 'EXIT'
                        ? {
                            ...common,
                            operationType: 'EXIT',
                            interpretationPortId: original.endpoint.portId,
                          }
                        : {
                            ...common,
                            operationType: 'MOVEMENT',
                            interpretationPortId: original.endpoint.portId,
                            destinationPortId: original.arrival?.portId ?? original.endpoint.portId,
                            destinationBerthId: original.arrival?.berthId ?? null,
                            arrivalMoment: original.arrival
                              ? {
                                  localDateTime: original.arrival.moment.localDateTime,
                                  selectedOffset: original.arrival.moment.offset,
                                }
                              : { localDateTime: '', selectedOffset: null },
                          },
                  )
                }}
              />
            </>
          )}
          <Select
            data-autofocus
            label="Esito"
            allowDeselect={false}
            value={values.executionStatus}
            disabled={disabled}
            data={[
              ...(correction ? [{ value: 'PLANNED', label: 'Prevista' }] : []),
              { value: 'PERFORMED', label: 'Effettuata' },
              { value: 'MISSED', label: 'Mancata' },
            ]}
            onChange={(status) =>
              change({
                ...(correction ? values : fromOperation(original, correction)),
                notes: values.notes,
                executionStatus: status as CreateOperationDto['executionStatus'],
              })
            }
          />
          {missed && (
            <p>
              La mancata conserva gli estremi e il contesto pianificati. L’anteprima verifica la
              sequenza e tutte le prestazioni.
            </p>
          )}
          {values.operationType === 'ENTRY' && (
            <>
              <PortPicker
                context={draftContext}
                label={correction ? 'Porto' : 'Porto effettivo'}
                retainedId={original.endpoint.portId}
                value={values.portId}
                disabled={disabled || missed}
                onChange={(id) =>
                  change({
                    ...values,
                    portId: id ?? '',
                    berthId: null,
                    moment: { ...values.moment, selectedOffset: null },
                  })
                }
              />
              {values.portId && (
                <BerthPicker
                  historical={correction}
                  retained={
                    correction
                      ? original.endpoint.portId === values.portId && original.endpoint.berthId
                        ? {
                            id: original.endpoint.berthId,
                            label: original.endpoint.berthName ?? 'Banchina storica',
                          }
                        : null
                      : undefined
                  }
                  key={values.portId}
                  context={draftContext}
                  portId={values.portId}
                  value={values.berthId}
                  disabled={disabled || missed}
                  onChange={(id) => change({ ...values, berthId: id })}
                />
              )}
            </>
          )}
          {values.operationType !== 'ENTRY' && (
            <details>
              <summary>Porto di interpretazione del momento effettivo</summary>
              <PortPicker
                context={draftContext}
                label="Porto di interpretazione"
                retainedId={original.endpoint.portId}
                value={values.interpretationPortId}
                disabled={disabled || missed}
                onChange={(id) =>
                  change({
                    ...values,
                    interpretationPortId: id,
                    moment: { ...values.moment, selectedOffset: null },
                  })
                }
              />
            </details>
          )}
          <TariffMomentFields
            economic
            label={
              values.operationType === 'MOVEMENT'
                ? correction
                  ? 'Partenza locale'
                  : 'Partenza effettiva locale'
                : correction
                  ? 'Momento locale'
                  : 'Momento effettivo locale'
            }
            moment={values.moment}
            disabled={disabled || missed}
            resolution={resolution?.resolution ?? null}
            onChange={(moment) => change({ ...values, moment })}
            onResolve={() => {
              void resolving
                .request(() =>
                  api.resolve({
                    context: { sessionId: draftContext.sessionId },
                    query: { id: original.id, values },
                  }),
                )
                .then((r) => {
                  if (r?.ok) setResolution(r.value)
                })
            }}
          />
          {values.operationType === 'MOVEMENT' && (
            <>
              <PortPicker
                context={draftContext}
                label={correction ? 'Porto di destinazione' : 'Porto effettivo di destinazione'}
                retainedId={original.arrival?.portId}
                value={values.destinationPortId}
                disabled={disabled || missed}
                onChange={(id) =>
                  change({
                    ...values,
                    destinationPortId: id ?? '',
                    destinationBerthId: null,
                    arrivalMoment: { ...values.arrivalMoment, selectedOffset: null },
                  })
                }
              />
              {values.destinationPortId && (
                <BerthPicker
                  historical={correction}
                  retained={
                    correction
                      ? original.arrival?.portId === values.destinationPortId &&
                        original.arrival.berthId
                        ? {
                            id: original.arrival.berthId,
                            label: original.arrival.berthName ?? 'Banchina storica',
                          }
                        : null
                      : undefined
                  }
                  key={values.destinationPortId}
                  context={draftContext}
                  portId={values.destinationPortId}
                  value={values.destinationBerthId}
                  disabled={disabled || missed}
                  onChange={(id) => change({ ...values, destinationBerthId: id })}
                />
              )}
              <TariffMomentFields
                economic
                label={correction ? 'Arrivo locale' : 'Arrivo effettivo locale'}
                moment={values.arrivalMoment}
                disabled={disabled || missed}
                resolution={resolution?.arrivalResolution ?? null}
                onChange={(arrivalMoment) => change({ ...values, arrivalMoment })}
                onResolve={() => {
                  void resolving
                    .request(() =>
                      api.resolve({
                        context: { sessionId: draftContext.sessionId },
                        query: { id: original.id, values },
                      }),
                    )
                    .then((r) => {
                      if (r?.ok) setResolution(r.value)
                    })
                }}
              />
            </>
          )}
          <TextInput
            label="Sostituzione manuale della base (EUR)"
            description="Facoltativa, anche zero; il calcolo tariffario resta conservato."
            value={amount}
            error={
              amount.trim() && moneyInput(amount) === null
                ? 'Indica un importo non negativo con al massimo due decimali.'
                : undefined
            }
            disabled={disabled}
            onChange={(e) => {
              invalidate()
              setAmount(e.currentTarget.value)
            }}
          />
          {values.operationType === 'MOVEMENT' &&
            (correction || values.destinationPortId !== original.endpoint.portId) && (
              <TextInput
                label="Sostituzione manuale all’arrivo (EUR)"
                description="Applicabile soltanto agli spostamenti tra porti."
                value={arrivalAmount}
                error={
                  arrivalAmount.trim() && moneyInput(arrivalAmount) === null
                    ? 'Indica un importo non negativo con al massimo due decimali.'
                    : undefined
                }
                disabled={disabled}
                onChange={(e) => {
                  invalidate()
                  setArrivalAmount(e.currentTarget.value)
                }}
              />
            )}
          <Textarea
            label={correction ? 'Note' : 'Note effettive'}
            value={values.notes ?? ''}
            maxLength={10000}
            disabled={disabled}
            onChange={(e) => change({ ...values, notes: e.currentTarget.value || null })}
          />
          <Group className="form-actions">
            <Button
              variant="default"
              disabled={busy}
              onClick={() => {
                invalidate()
                setOpen(false)
              }}
            >
              Chiudi
            </Button>
            <Button disabled={disabled} onClick={showPreview}>
              Verifica e mostra anteprima
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
