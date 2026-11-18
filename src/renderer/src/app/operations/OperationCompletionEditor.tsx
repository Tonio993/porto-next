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
import { moneyInput } from '../../api/numeric-input'
import { StateMessage } from '../StateMessage'
import { PortConfirmation } from '../ports/PortConfirmation'
import { PortPicker } from '../tariffs/PortPicker'
import { TariffMomentFields } from '../tariffs/TariffMomentFields'
import { BerthPicker } from './BerthPicker'
import { OperationDetail } from './OperationDetail'

function fromOperation(op: VesselOperationDto): CreateOperationDto {
  const moment = {
    localDateTime: op.endpoint.moment.localDateTime,
    selectedOffset: op.endpoint.moment.offset,
  }
  const base = {
    vesselId: op.vesselId,
    moment,
    executionStatus: 'PERFORMED' as const,
    notes: op.notes,
    manualOverrideAmount: op.charges[0].manualOverrideAmount,
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
    arrivalManualOverrideAmount: op.charges[1]?.manualOverrideAmount ?? null,
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
}: {
  operation: VesselOperationDto
  opened: boolean
  originalContext: ArchiveContextDto
  archives: ReturnType<typeof useArchives>
  onClose: () => void
  onApplied: (value: VesselOperationDto) => void
  trigger: HTMLElement | null
}) {
  const context = archives.state.context!
  const [draftContext, setDraftContext] = useState(originalContext)
  const [original, setOriginal] = useState(operation)
  const [values, setValues] = useState(() => fromOperation(operation))
  const [amount, setAmount] = useState(operation.charges[0].manualOverrideAmount ?? '')
  const [arrivalAmount, setArrivalAmount] = useState(
    operation.charges[1]?.manualOverrideAmount ?? '',
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
      if (result.value.executionStatus !== 'PLANNED') {
        onApplied(result.value)
        setOpen(false)
      } else {
        setOriginal(result.value)
        setValues(fromOperation(result.value))
        setAmount(result.value.charges[0].manualOverrideAmount ?? '')
        setArrivalAmount(result.value.charges[1]?.manualOverrideAmount ?? '')
        setDraftContext(result.context)
      }
    }
  }
  const confirm = async () => {
    if (!preview || uncertain) return
    const result = await editor.request(() =>
      checked(() =>
        window.operations.confirmComplete({
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
  const missed = values.executionStatus === 'MISSED'
  const disabled = busy || stale || uncertain || original.executionStatus !== 'PLANNED'
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
                values.destinationPortId !== original.endpoint.portId ? arrival : null,
            }
          : {}),
      },
    }
    void editor
      .request(() =>
        checked(() => window.operations.previewComplete({ context: draftContext, payload })),
      )
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
      title="Consuntiva operazione"
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
        <StateMessage kind="error" title="Consuntivazione non disponibile">
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
          Verifica l’esito con Ricarica bozza prima di ripetere la scrittura. I valori inseriti sono
          conservati.
        </StateMessage>
      )}
      {(stale || uncertain) && (
        <Button disabled={busy} onClick={() => void reload()}>
          Ricarica bozza
        </Button>
      )}
      {preview ? (
        <>
          {preview.blockers.length > 0 && (
            <StateMessage kind="error" title="Consuntivazione bloccata">
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
                    window.operations.completionEffects({
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
          <Select
            data-autofocus
            label="Esito"
            allowDeselect={false}
            value={values.executionStatus}
            disabled={busy || uncertain}
            data={[
              { value: 'PERFORMED', label: 'Effettuata' },
              { value: 'MISSED', label: 'Mancata' },
            ]}
            onChange={(status) =>
              change({
                ...fromOperation(original),
                notes: values.notes,
                executionStatus: status as 'PERFORMED' | 'MISSED',
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
                label="Porto effettivo"
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
                ? 'Partenza effettiva locale'
                : 'Momento effettivo locale'
            }
            moment={values.moment}
            disabled={disabled || missed}
            resolution={resolution?.resolution ?? null}
            onChange={(moment) => change({ ...values, moment })}
            onResolve={() => {
              void resolving
                .request(() =>
                  window.operations.resolveCompletionMoment({
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
                label="Porto effettivo di destinazione"
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
                label="Arrivo effettivo locale"
                moment={values.arrivalMoment}
                disabled={disabled || missed}
                resolution={resolution?.arrivalResolution ?? null}
                onChange={(arrivalMoment) => change({ ...values, arrivalMoment })}
                onResolve={() => {
                  void resolving
                    .request(() =>
                      window.operations.resolveCompletionMoment({
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
            values.destinationPortId !== original.endpoint.portId && (
              <TextInput
                label="Sostituzione manuale all’arrivo (EUR)"
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
            label="Note effettive"
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
