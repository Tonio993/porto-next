import { useProtectedDraft } from '../DraftProtection'
import { SingleFlight } from '../../api/single-flight'
import { useEffect, useRef, useState } from 'react'
import { Button, Group, Modal, Stack, Textarea } from '@mantine/core'
import type { ApplicationResult, ArchiveContextDto } from '../../../../shared/contracts/application'
import type {
  OperationDeletionPreviewDto,
  VesselOperationDto,
} from '../../../../shared/contracts/operations'
import type { useArchives } from '../../api/use-archives'
import { useApplicationRequest } from '../../api/use-application-request'
import { operationCorrectionOutcome } from '../../api/operation-correction-outcome'
import { operationDeletionOutcome } from '../../api/operation-deletion-outcome'
import { StateMessage } from '../StateMessage'
import { PortConfirmation } from '../ports/PortConfirmation'
import { OperationDetail } from './OperationDetail'

export function OperationMaintenanceEditor({
  operation,
  mode,
  opened,
  originalContext,
  archives,
  trigger,
  onClose,
  onResume,
  onApplied,
  withDetailSuspended,
  onUncertainChange,
}: {
  operation: VesselOperationDto
  mode: 'DELETE' | 'NOTES'
  opened: boolean
  originalContext: ArchiveContextDto
  archives: ReturnType<typeof useArchives>
  trigger: HTMLElement | null
  onClose: () => void
  onResume: () => void
  withDetailSuspended: ReturnType<typeof useApplicationRequest>['suspendWhile']
  onApplied: (value: VesselOperationDto | null) => void
  onUncertainChange: (value: boolean) => void
}) {
  const context = archives.state.context!
  const [draftContext, setDraftContext] = useState(originalContext)
  const [original, setOriginal] = useState(operation)
  const [notes, setNotes] = useState(operation.notes ?? '')
  const [preview, setPreview] = useState<OperationDeletionPreviewDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const [reloadRequired, setReloadRequired] = useState(false)
  const expected = useRef<VesselOperationDto | null>(null)
  const active = useRef(true)
  const editor = useApplicationRequest(context, setError)
  const paging = useApplicationRequest(context, setError)
  const busy = archives.busy || archives.commandBusy || editor.loading || paging.loading
  const stale =
    reloadRequired ||
    draftContext.revision !== context.revision ||
    draftContext.sessionId !== context.sessionId ||
    draftContext.archiveId !== context.archiveId
  const [flight] = useState(() => new SingleFlight())
  useProtectedDraft({
    get state() {
      return flight.busy ? 'BUSY' : uncertain ? 'UNCERTAIN' : busy ? 'BUSY' : 'DRAFT'
    },
    discard: () => {
      invalidate()
      onClose()
    },
    recover: () => {
      onResume()
    },
  })
  const disabled = busy || stale || uncertain
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    onUncertainChange(uncertain)
  }, [uncertain, onUncertainChange])
  const invalidate = () => {
    editor.invalidate()
    paging.invalidate()
    setPreview(null)
    setError(null)
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
    if (result.ok || result.error.code === 'NOT_FOUND') {
      const state = await archives.update(() => window.archives.getState())
      if (
        !state?.context ||
        !result.context ||
        state.context.archiveId !== result.context.archiveId ||
        state.context.sessionId !== result.context.sessionId ||
        state.context.revision !== result.context.revision
      )
        throw Error('Risposta superata')
    }
    return result
  }
  const readCurrent = (expectedAbsence = false) =>
    editor.request(
      () =>
        checked(() =>
          window.operations.get({
            context: { sessionId: draftContext.sessionId },
            query: { id: original.id },
          }),
        ),
      { expectedAbsence },
    )
  const reload = async () =>
    withDetailSuspended(async () => {
      if (busy || uncertain) return
      invalidate()
      const r = await readCurrent()
      if (!active.current) return
      if (r?.ok) {
        setOriginal(r.value)
        setDraftContext(r.context)
        setReloadRequired(false)
        setError(null)
      } else if (r && !r.ok && r.error.code === 'NOT_FOUND' && r.context) {
        onApplied(null)
      }
    }, mode === 'DELETE')
  const verifyOutcome = async () =>
    withDetailSuspended(async () => {
      if (busy || !uncertain) return
      const r = await readCurrent(mode === 'DELETE')
      if (!active.current || !r || !r.context || (!r.ok && r.error.code !== 'NOT_FOUND')) return
      const actual = r.ok ? r.value : null
      const outcome =
        mode === 'DELETE'
          ? operationDeletionOutcome(original, actual, draftContext, r.context)
          : actual && expected.current
            ? operationCorrectionOutcome(
                original,
                expected.current,
                actual,
                draftContext,
                r.context,
              )
            : 'CONFLICT'
      if (outcome === 'APPLIED') {
        setUncertain(false)
        onApplied(actual)
      } else if (outcome === 'UNCHANGED') {
        setUncertain(false)
        setPreview(null)
        setError('La modifica non risulta applicata. La bozza è conservata e puoi riprovare.')
      } else {
        setUncertain(false)
        setReloadRequired(true)
        setError('I dati sono cambiati. Ricarica esplicitamente il contesto prima di continuare.')
      }
    }, mode === 'DELETE')
  const write = async () =>
    flight.run(async () =>
      withDetailSuspended(async () => {
        if (disabled || (mode === 'DELETE' && !preview)) return
        const noteValue = notes === '' ? null : notes
        expected.current = { ...original, notes: noteValue }
        if (mode === 'DELETE') {
          const p = preview!
          const r = await editor.request(() =>
            checked(() =>
              window.operations.confirmDelete({
                context: p.context,
                payload: { previewId: p.previewId },
              }),
            ),
          )
          if (!active.current) return
          if (r?.ok) onApplied(null)
          else if (!r || r.error.code === 'UNEXPECTED') {
            setUncertain(true)
            setPreview(null)
          }
        } else {
          const r = await editor.request(() =>
            checked(() =>
              window.operations.updateNotes({
                context: draftContext,
                payload: { id: original.id, notes: noteValue },
              }),
            ),
          )
          if (!active.current) return
          if (r?.ok) onApplied(r.value)
          else if (!r || r.error.code === 'UNEXPECTED') setUncertain(true)
        }
      }, mode === 'DELETE'),
    )
  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!busy) {
          invalidate()
          onClose()
        }
      }}
      title={mode === 'DELETE' ? 'Elimina operazione' : 'Modifica note operazione'}
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
      <Stack>
        {error && (
          <StateMessage kind="error" title="Modifica non disponibile">
            {error}
          </StateMessage>
        )}
        {stale && (
          <StateMessage kind="warning" title="Bozza obsoleta">
            I dati sono cambiati. Ricarica esplicitamente il contesto: il testo delle note è
            conservato.
          </StateMessage>
        )}
        {uncertain && (
          <StateMessage kind="warning" title="Esito non verificato">
            Verifica la scrittura prima di riprovare. La bozza rimane conservata anche chiudendo
            questa finestra.
          </StateMessage>
        )}
        {uncertain && (
          <Button disabled={busy} onClick={() => void verifyOutcome()}>
            Verifica esito della scrittura
          </Button>
        )}
        {stale && !uncertain && (
          <Button disabled={busy} onClick={() => void reload()}>
            Ricarica contesto
          </Button>
        )}
        <OperationDetail operation={original} />
        {mode === 'NOTES' ? (
          <>
            <Textarea
              label="Note"
              value={notes}
              disabled={disabled}
              autosize
              minRows={3}
              onChange={(e) => {
                invalidate()
                setNotes(e.currentTarget.value)
              }}
            />
            <Group>
              <Button disabled={disabled} onClick={() => void write()}>
                Salva note
              </Button>
            </Group>
          </>
        ) : preview ? (
          <PortConfirmation
            cancelDisabled={busy || uncertain}
            preview={preview}
            disabled={disabled}
            revision={context.revision}
            onConfirm={() => void write()}
            onCancel={invalidate}
            onPage={(page) => {
              void paging
                .request(() =>
                  checked(() =>
                    window.operations.deletionEffects({
                      context: { sessionId: draftContext.sessionId },
                      query: { previewId: preview.previewId, page, pageSize: 50 },
                    }),
                  ),
                )
                .then((r) => {
                  if (r?.ok) setPreview(r.value)
                })
            }}
          />
        ) : (
          <>
            <p>
              L’eliminazione rimuove l’operazione e le sue componenti economiche. Controlla gli
              effetti sulla cronologia prima di confermare.
            </p>
            <Button
              color="red"
              disabled={disabled}
              onClick={() => {
                void editor
                  .request(() =>
                    checked(() =>
                      window.operations.previewDelete({
                        context: draftContext,
                        payload: { id: original.id },
                      }),
                    ),
                  )
                  .then((r) => {
                    if (r?.ok) setPreview(r.value)
                  })
              }}
            >
              Analizza eliminazione
            </Button>
          </>
        )}
      </Stack>
    </Modal>
  )
}
