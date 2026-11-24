import { useNumericFormat } from '../../api/use-numeric-preference'
import { useProtectedDraft } from '../DraftProtection'
import { SingleFlight } from '../../api/single-flight'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Button, Group, Modal, Stack } from '@mantine/core'
import type {
  ApplicationResult,
  ArchiveContextDto,
  FieldIssueDto,
} from '../../../../shared/contracts/application'
import type { TariffDto, TariffPreviewDto } from '../../../../shared/contracts/tariffs'
import type { MomentInputDto, MomentResolutionDto } from '../../../../shared/contracts/values'
import type { useArchives } from '../../api/use-archives'
import { useApplicationRequest } from '../../api/use-application-request'
import { tariffMaintenanceOutcome } from '../../api/tariff-maintenance-outcome'
import { StateMessage } from '../StateMessage'
import { PortConfirmation } from '../ports/PortConfirmation'
import {
  ConfigurationFields,
  ConfigurationDetails,
  copyDraft,
  readConfigurations,
} from './ConfigurationFields'
import { TariffMomentFields } from './TariffMomentFields'

export function TariffMaintenanceEditor({
  tariff,
  mode,
  opened,
  originalContext,
  archives,
  trigger,
  resumeTrigger,
  onClose,
  onResume,
  onApplied,
  withDetailSuspended,
  onUncertainChange,
}: {
  tariff: TariffDto
  mode: 'UPDATE' | 'DELETE'
  opened: boolean
  originalContext: ArchiveContextDto
  archives: ReturnType<typeof useArchives>
  trigger: HTMLElement | null
  resumeTrigger: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onResume: () => void
  withDetailSuspended: ReturnType<typeof useApplicationRequest>['suspendWhile']
  onApplied: (value: TariffDto | null) => void
  onUncertainChange: (value: boolean) => void
}) {
  const numericFormat = useNumericFormat()
  const context = archives.state.context!
  const [draftContext, setDraftContext] = useState(originalContext)
  const [original, setOriginal] = useState(tariff)
  const [configurations, setConfigurations] = useState(() =>
    copyDraft(tariff.configurations, numericFormat),
  )
  const [moment, setMoment] = useState<MomentInputDto>(() => ({
    localDateTime: tariff.effectiveMoment.localDateTime,
    selectedOffset: tariff.effectiveMoment.offset,
  }))
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [preview, setPreview] = useState<TariffPreviewDto | null>(null)
  const [issues, setIssues] = useState<readonly FieldIssueDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const [reloadRequired, setReloadRequired] = useState(false)
  const expected = useRef<TariffDto | null>(null)
  const active = useRef(true)
  const editor = useApplicationRequest(context, setError),
    paging = useApplicationRequest(context, setError),
    resolving = useApplicationRequest(context, setError)
  const busy =
    archives.busy || archives.commandBusy || editor.loading || paging.loading || resolving.loading
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
    resolving.invalidate()
    setPreview(null)
    setResolution(null)
    setError(null)
    setIssues([])
  }
  const checked = async <T,>(call: () => Promise<ApplicationResult<T>>) => {
    const r = await archives.execute(call)
    if (!r.ok && ['REVISION_CONFLICT', 'ARCHIVE_SESSION_CHANGED'].includes(r.error.code)) {
      if (active.current) setReloadRequired(true)
      await archives.update(() => window.archives.getState())
    }
    if (r.ok || r.error.code === 'NOT_FOUND') {
      const state = await archives.update(() => window.archives.getState())
      if (
        !state?.context ||
        !r.context ||
        state.context.sessionId !== r.context.sessionId ||
        state.context.archiveId !== r.context.archiveId ||
        state.context.revision !== r.context.revision
      )
        throw Error('Risposta superata')
    }
    return r
  }
  const readCurrent = (expectedAbsence = false) =>
    editor.request(
      () =>
        checked(() =>
          window.tariffs.get({
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
      } else if (r && !r.ok && r.error.code === 'NOT_FOUND' && r.context) onApplied(null)
    }, mode === 'DELETE')
  const verifyOutcome = async () =>
    withDetailSuspended(async () => {
      if (busy || !uncertain) return
      const r = await readCurrent(mode === 'DELETE')
      if (!active.current || !r || !r.context || (!r.ok && r.error.code !== 'NOT_FOUND')) return
      const actual = r.ok ? r.value : null
      const outcome = tariffMaintenanceOutcome(
        original,
        expected.current,
        actual,
        draftContext,
        r.context,
      )
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
  const analyze = async () => {
    if (disabled) return
    setIssues([])
    setError(null)
    let payload
    try {
      payload = { id: original.id, moment, configurations: readConfigurations(configurations) }
    } catch (e) {
      setError((e as Error).message)
      return
    }
    const r = await editor.request(() =>
      checked(() =>
        mode === 'UPDATE'
          ? window.tariffs.previewUpdate({ context: draftContext, payload })
          : window.tariffs.previewDelete({ context: draftContext, payload: { id: original.id } }),
      ),
    )
    if (r?.ok) setPreview(r.value)
    else if (r && !r.ok) setIssues(r.error.fields)
  }
  const write = async () =>
    flight.run(async () =>
      withDetailSuspended(async () => {
        if (disabled || !preview) return
        expected.current = mode === 'UPDATE' ? preview.tariff : null
        const request = { context: preview.context, payload: { previewId: preview.previewId } }
        const r = await editor.request(() =>
          checked<TariffDto | { id: string }>(() =>
            mode === 'UPDATE'
              ? window.tariffs.confirmUpdate(request)
              : window.tariffs.confirmDelete(request),
          ),
        )
        if (!active.current) return
        if (r?.ok) onApplied(mode === 'UPDATE' ? (r.value as TariffDto) : null)
        else if (!r || r.error.code === 'UNEXPECTED') {
          setUncertain(true)
          setPreview(null)
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
      title={mode === 'UPDATE' ? 'Correggi tariffa' : 'Elimina tariffa'}
      size="xl"
      closeOnClickOutside={false}
      closeOnEscape={!busy}
      withCloseButton={!busy}
      returnFocus={false}
      onExitTransitionEnd={() => {
        if (trigger?.isConnected && !trigger.matches(':disabled')) trigger.focus()
        else if (resumeTrigger.current) resumeTrigger.current.focus()
        else document.querySelector<HTMLElement>('[aria-label="Dettaglio tariffa"]')?.focus()
      }}
    >
      <Stack>
        {error && (
          <StateMessage kind="error" title="Modifica non disponibile">
            {error}
          </StateMessage>
        )}
        {issues.length > 0 && (
          <div role="alert">
            {issues.map((issue, index) => (
              <p key={index}>
                {issue.path.join(' · ')}: {issue.message}
              </p>
            ))}
          </div>
        )}
        {stale && (
          <StateMessage kind="warning" title="Bozza obsoleta">
            I dati sono cambiati. Ricarica esplicitamente il contesto: i valori digitati sono
            conservati.
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
        <p>
          Decorrenza originale: {original.effectiveMoment.localDateTime} ·{' '}
          {original.effectiveMoment.zoneId} · {original.effectiveMoment.offset}
        </p>
        {preview && mode === 'UPDATE' && (
          <ConfigurationDetails configurations={preview.tariff.configurations} />
        )}
        {preview ? (
          <PortConfirmation
            cancelDisabled={busy || uncertain}
            preview={preview}
            disabled={disabled}
            revision={context.revision}
            onConfirm={() => void write()}
            onCancel={invalidate}
            onPage={(page) => {
              const request = {
                context: { sessionId: draftContext.sessionId },
                query: { previewId: preview.previewId, page, pageSize: 50 },
              }
              void paging
                .request(() =>
                  checked(() =>
                    mode === 'UPDATE'
                      ? window.tariffs.updateEffects(request)
                      : window.tariffs.deletionEffects(request),
                  ),
                )
                .then((r) => {
                  if (r?.ok) setPreview(r.value)
                })
            }}
          />
        ) : (
          <>
            {mode === 'UPDATE' ? (
              <>
                <TariffMomentFields
                  moment={moment}
                  disabled={disabled}
                  resolution={resolution}
                  onChange={(m) => {
                    invalidate()
                    setMoment(m)
                  }}
                  onResolve={() => {
                    void resolving
                      .request(() =>
                        window.tariffs.resolveMoment({
                          context: { sessionId: draftContext.sessionId },
                          query: { portId: original.portId, moment },
                        }),
                      )
                      .then((r) => {
                        if (r?.ok) setResolution(r.value)
                      })
                  }}
                />
                <ConfigurationFields
                  value={configurations}
                  disabled={disabled}
                  onChange={(c) => {
                    invalidate()
                    setConfigurations(c)
                  }}
                />
              </>
            ) : (
              <>
                <p>
                  La tariffa e i suoi scaglioni saranno eliminati. Le attività restano conservate;
                  l’assenza di copertura blocca la conferma.
                </p>
                <ConfigurationDetails configurations={original.configurations} />
              </>
            )}
            <Group>
              <Button
                color={mode === 'DELETE' ? 'red' : undefined}
                disabled={disabled}
                onClick={() => void analyze()}
              >
                {mode === 'UPDATE' ? 'Mostra anteprima' : 'Analizza eliminazione'}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
