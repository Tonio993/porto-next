import { useEffect, useRef, useState, type RefObject } from 'react'
import { Badge, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import type {
  ApplicationResult,
  ArchiveContextDto,
  FieldIssueDto,
} from '../../../../shared/contracts/application'
import type {
  WeightChangeDto,
  WeightHistoryDto,
  WeightPreviewDto,
  WeightVersionDto,
} from '../../../../shared/contracts/catalog'
import type { MomentInputDto, MomentResolutionDto } from '../../../../shared/contracts/values'
import type { useArchives } from '../../api/use-archives'
import { useApplicationRequest } from '../../api/use-application-request'
import { decimalInput } from '../../api/numeric-input'
import { weightChangeOutcome } from '../../api/weight-change-outcome'
import { PageControls } from '../PageControls'
import { StateMessage } from '../StateMessage'
import { PortConfirmation } from '../ports/PortConfirmation'
import { TariffMomentFields, emptyMoment } from '../tariffs/TariffMomentFields'

type Draft = {
  context: ArchiveContextDto
  operation: WeightChangeDto['operation']
  before: WeightVersionDto | null
  weight: string
  moment: MomentInputDto | null
}
const phaseLabels = { CURRENT: 'Corrente', HISTORICAL: 'Storica', FUTURE: 'Futura' }
export function WeightHistory({
  sequenceId,
  label,
  opened,
  archives,
  trigger,
  resumeTrigger,
  onClose,
  onUncertainChange,
  onApplied,
}: {
  sequenceId: string
  label: string
  opened: boolean
  archives: ReturnType<typeof useArchives>
  trigger: HTMLElement | null
  resumeTrigger: RefObject<HTMLButtonElement | null>
  onClose: (keep: boolean) => void
  onUncertainChange: (value: boolean) => void
  onApplied: () => void
}) {
  const context = archives.state.context!
  const [page, setPage] = useState(1),
    [reload, setReload] = useState(0)
  const [history, setHistory] = useState<WeightHistoryDto | null>(null)
  const [historyContext, setHistoryContext] = useState(context)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState<WeightPreviewDto | null>(null)
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<readonly FieldIssueDto[]>([])
  const otherIssues = issues.filter((issue) => issue.path[0] !== 'weight')
  const [uncertain, setUncertain] = useState(false),
    [reloadRequired, setReloadRequired] = useState(false)
  const expected = useRef<{ versionId: string; version: WeightVersionDto | null } | null>(null)
  const active = useRef(true)
  const weightInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (opened && editing && !preview) weightInput.current?.focus()
  }, [opened, editing, preview])
  const reading = useApplicationRequest(context, setError),
    editor = useApplicationRequest(context, setError),
    paging = useApplicationRequest(context, setError),
    resolving = useApplicationRequest(context, setError)
  const { request: readHistory } = reading
  const busy =
    archives.busy || archives.commandBusy || editor.loading || paging.loading || resolving.loading
  const stale =
    !!draft &&
    (reloadRequired ||
      draft.context.archiveId !== context.archiveId ||
      draft.context.sessionId !== context.sessionId ||
      draft.context.revision !== context.revision)
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
  useEffect(() => {
    if (!opened) return
    void readHistory(() =>
      window.catalog.weightHistory({
        context: { sessionId: context.sessionId },
        query: { sequenceId, page, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok) {
        setHistory(r.value)
        setHistoryContext(r.context)
        const last = Math.max(1, Math.ceil(r.value.versions.total / 25))
        if (page > last) setPage(last)
      }
    })
  }, [readHistory, sequenceId, page, context.sessionId, context.revision, reload, opened])
  useEffect(() => {
    const now = Date.now(),
      next = history?.versions.items
        .flatMap((v) => [v.effectiveFrom, v.effectiveTo])
        .filter((v): v is string => !!v && Date.parse(v) > now)
        .sort()[0]
    if (!next || !opened) return
    const timer = window.setTimeout(
      () => setReload((n) => n + 1),
      Math.min(2147483647, Math.max(1, Date.parse(next) - now + 10)),
    )
    return () => window.clearTimeout(timer)
  }, [history, opened])
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
        state.context.archiveId !== r.context.archiveId ||
        state.context.sessionId !== r.context.sessionId ||
        state.context.revision !== r.context.revision
      )
        throw Error('Risposta superata')
    }
    return r
  }
  const start = (operation: Draft['operation'], before: WeightVersionDto | null) => {
    if (busy || reading.loading || draft || historyContext.revision !== context.revision) return
    invalidate()
    setReloadRequired(false)
    setDraft({
      operation,
      before,
      context: { ...historyContext },
      weight: before?.weight.replace('.', ',') ?? '1',
      moment: before
        ? before.effectiveMoment
          ? {
              localDateTime: before.effectiveMoment.localDateTime,
              selectedOffset: before.effectiveMoment.offset,
            }
          : null
        : emptyMoment(),
    })
    setEditing(true)
  }
  const reloadDraft = async () => {
    if (!draft || busy || uncertain) return
    invalidate()
    if (draft.operation === 'INSERT') {
      const r = await editor.request(() =>
        checked(() =>
          window.catalog.weightHistory({
            context: { sessionId: draft.context.sessionId },
            query: { sequenceId, page: 1, pageSize: 1 },
          }),
        ),
      )
      if (r?.ok) {
        setDraft({ ...draft, context: r.context })
        setReloadRequired(false)
      }
    } else {
      const r = await editor.request(() =>
        checked(() =>
          window.catalog.getWeight({
            context: { sessionId: draft.context.sessionId },
            query: { sequenceId, versionId: draft.before!.id },
          }),
        ),
      )
      if (r?.ok) {
        setDraft({ ...draft, before: r.value, context: r.context })
        setReloadRequired(false)
      }
    }
  }
  const analyze = async () => {
    if (!draft || disabled) return
    invalidate()
    const weight = decimalInput(draft.weight)
    if (
      draft.operation !== 'DELETE' &&
      (weight === null || draft.weight.trim().replace(',', '.').replace('.', '').length > 256)
    ) {
      setError('Inserisci un peso positivo, senza esponenti, con al massimo 256 cifre.')
      return
    }
    const payload: WeightChangeDto =
      draft.operation === 'INSERT'
        ? { operation: 'INSERT', sequenceId, moment: draft.moment!, weight: weight! }
        : draft.operation === 'UPDATE'
          ? {
              operation: 'UPDATE',
              sequenceId,
              versionId: draft.before!.id,
              moment: draft.moment,
              weight: weight!,
            }
          : { operation: 'DELETE', sequenceId, versionId: draft.before!.id }
    const r = await editor.request(() =>
      checked(() => window.catalog.previewWeight({ context: draft.context, payload })),
    )
    if (r?.ok) setPreview(r.value)
    else if (r && !r.ok) setIssues(r.error.fields)
  }
  const applied = () => {
    setUncertain(false)
    setDraft(null)
    setEditing(false)
    invalidate()
    setReloadRequired(false)
    setReload((n) => n + 1)
    onApplied()
  }
  const write = async () => {
    if (!draft || !preview || disabled) return
    expected.current = { versionId: preview.versionId, version: preview.version }
    const r = await editor.request(() =>
      checked(() =>
        window.catalog.confirmWeight({
          context: preview.context,
          payload: { previewId: preview.previewId },
        }),
      ),
    )
    if (!active.current) return
    if (r?.ok) applied()
    else if (!r || r.error.code === 'UNEXPECTED') {
      setUncertain(true)
      setPreview(null)
    }
  }
  const verify = async () => {
    if (!draft || !uncertain || busy || !expected.current) return
    const r = await editor.request(() =>
      checked(() =>
        window.catalog.getWeight({
          context: { sessionId: draft.context.sessionId },
          query: { sequenceId, versionId: expected.current!.versionId },
        }),
      ),
    )
    if (!active.current || !r || !r.context || (!r.ok && r.error.code !== 'NOT_FOUND')) return
    const outcome = weightChangeOutcome(
      draft.before,
      expected.current.version,
      r.ok ? r.value : null,
      draft.context,
      r.context,
    )
    if (outcome === 'APPLIED') applied()
    else if (outcome === 'UNCHANGED') {
      setUncertain(false)
      setError('La modifica non risulta applicata. La bozza è conservata e puoi riprovare.')
    } else {
      setUncertain(false)
      setReloadRequired(true)
      setError('I dati sono cambiati. Ricarica esplicitamente il contesto prima di continuare.')
    }
  }
  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!busy) {
          invalidate()
          reading.invalidate()
          onClose(!!draft)
        }
      }}
      size="xl"
      title={'Pesi · ' + label}
      closeOnClickOutside={false}
      closeOnEscape={!busy}
      withCloseButton={!busy}
      returnFocus={false}
      onExitTransitionEnd={() => {
        if (trigger?.isConnected && !trigger.matches(':disabled')) trigger.focus()
        else if (resumeTrigger.current) resumeTrigger.current.focus()
        else document.querySelector<HTMLElement>('[aria-label="Dettaglio catalogo"]')?.focus()
      }}
    >
      <Stack>
        {error && (
          <StateMessage title="Operazione non completata" kind="error">
            {error}
          </StateMessage>
        )}
        {otherIssues.length > 0 && (
          <div role="alert">
            {otherIssues.map((issue, i) => (
              <p key={i}>
                {issue.path.join(' · ')}: {issue.message}
              </p>
            ))}
          </div>
        )}
        {editing && draft ? (
          <>
            {stale && (
              <StateMessage title="Bozza obsoleta" kind="warning">
                Ricarica esplicitamente il contesto. I valori digitati restano conservati.
              </StateMessage>
            )}
            {uncertain && (
              <StateMessage title="Esito non verificato" kind="warning">
                Verifica i dati persistiti prima di ripetere una scrittura.
              </StateMessage>
            )}
            {uncertain && (
              <Button disabled={busy} onClick={() => void verify()}>
                Verifica esito della scrittura
              </Button>
            )}
            {stale && !uncertain && (
              <Button disabled={busy} onClick={() => void reloadDraft()}>
                Ricarica contesto
              </Button>
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
                  void paging
                    .request(() =>
                      checked(() =>
                        window.catalog.weightEffects({
                          context: { sessionId: draft.context.sessionId },
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
                  {draft.operation === 'INSERT'
                    ? 'Nuova versione del peso'
                    : draft.operation === 'UPDATE'
                      ? 'Correzione del peso'
                      : 'Eliminazione della versione del peso'}
                </p>
                {draft.operation !== 'DELETE' ? (
                  <>
                    {draft.moment ? (
                      <TariffMomentFields
                        moment={draft.moment}
                        resolution={resolution}
                        disabled={disabled}
                        onChange={(moment) => {
                          invalidate()
                          setDraft({ ...draft, moment })
                        }}
                        onResolve={() => {
                          void resolving
                            .request(() =>
                              window.catalog.resolveWeightMoment({
                                context: { sessionId: draft.context.sessionId },
                                query: { moment: draft.moment! },
                              }),
                            )
                            .then((r) => {
                              if (r?.ok) setResolution(r.value)
                            })
                        }}
                      />
                    ) : (
                      <p>Peso iniziale senza decorrenza.</p>
                    )}
                    <TextInput
                      label="Peso"
                      ref={weightInput}
                      data-autofocus
                      error={issues.find((issue) => issue.path[0] === 'weight')?.message}
                      inputMode="decimal"
                      description="Strettamente positivo; sono ammessi decimali esatti e la virgola."
                      value={draft.weight}
                      disabled={disabled}
                      onChange={(e) => {
                        invalidate()
                        setDraft({ ...draft, weight: e.currentTarget.value })
                      }}
                    />
                  </>
                ) : (
                  <p>
                    Decorrenza: {draft.before?.effectiveMoment?.localDateTime} · peso{' '}
                    {draft.before?.weight}. Le attività saranno ricalcolate con la sequenza
                    restante.
                  </p>
                )}
                <Button
                  disabled={disabled}
                  color={draft.operation === 'DELETE' ? 'red' : undefined}
                  onClick={() => void analyze()}
                >
                  Mostra anteprima
                </Button>
              </>
            )}
            <Button
              variant="default"
              disabled={busy}
              onClick={() => {
                invalidate()
                setEditing(false)
              }}
            >
              Torna alla cronologia
            </Button>
          </>
        ) : (
          <>
            <p>
              Ogni sequenza mantiene un peso iniziale senza decorrenza. Le versioni iniziano al
              confine incluso e terminano al confine escluso.
            </p>
            {reading.loading && <p role="status">Caricamento cronologia…</p>}
            {draft ? (
              <Group>
                <Button disabled={busy} onClick={() => setEditing(true)}>
                  Riprendi bozza
                </Button>
                <Button
                  disabled={busy || uncertain}
                  variant="default"
                  onClick={() => {
                    invalidate()
                    setDraft(null)
                  }}
                >
                  Scarta bozza
                </Button>
              </Group>
            ) : (
              <Button
                disabled={busy || reading.loading || !history}
                onClick={() => start('INSERT', null)}
              >
                Nuova versione del peso
              </Button>
            )}
            {history?.versions.items.map((v) => (
              <section key={v.id} className="archive-panel">
                <Group justify="space-between">
                  <strong>Peso {v.weight.replace('.', ',')}</strong>
                  <Badge>{phaseLabels[v.phase]}</Badge>
                </Group>
                <p>
                  {v.effectiveMoment
                    ? v.effectiveMoment.localDateTime +
                      ' · ' +
                      v.effectiveMoment.zoneId +
                      ' · ' +
                      v.effectiveMoment.offset
                    : 'Peso iniziale senza decorrenza'}
                  <br />
                  Inizio incluso: {v.effectiveFrom ?? 'Senza limite iniziale'}
                  <br />
                  Fine esclusa: {v.effectiveTo ?? 'Senza limite finale'}
                </p>
                <Group>
                  <Button
                    variant="default"
                    disabled={busy || reading.loading || !!draft}
                    onClick={() => start('UPDATE', v)}
                  >
                    Correggi peso
                  </Button>
                  <Button
                    variant="light"
                    color="red"
                    disabled={busy || reading.loading || !!draft || v.effectiveFrom === null}
                    onClick={() => start('DELETE', v)}
                  >
                    Elimina versione
                  </Button>
                </Group>
              </section>
            ))}
            {history && (
              <PageControls
                page={history.versions}
                disabled={busy || reading.loading}
                onPage={(p) => {
                  reading.invalidate()
                  setPage(p)
                }}
              />
            )}
          </>
        )}
      </Stack>
    </Modal>
  )
}
