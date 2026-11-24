import { useConsultationState } from '../api/use-consultation-state'
import { useProtectedDraft } from './DraftProtection'
import { useWriteAttempt } from '../api/use-write-attempt'
import { trackedRequest } from '../../../shared/contracts/write-outcomes'
import { WeightHistory } from './weights/WeightHistory'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, Group, Modal, Pagination, Select, Stack, TextInput } from '@mantine/core'
import type { ApplicationErrorDto, ArchiveContextDto } from '../../../shared/contracts/application'
import type {
  InitialWeightDto,
  OperationType,
  CatalogChange,
  ServiceTypeDto,
} from '../../../shared/contracts/catalog'
import { operationLabels } from '../../../shared/contracts/catalog'
import type { ChangePreviewDto, PageDto } from '../../../shared/contracts/master-data'
import type { useArchives } from '../api/use-archives'
import { useApplicationRequest } from '../api/use-application-request'
import { decimalInput } from '../api/numeric-input'
import { StateMessage } from './StateMessage'
import { PortConfirmation } from './ports/PortConfirmation'

type Draft = {
  kind: 'CREATE' | 'RENAME'
  context: ArchiveContextDto
  description: string
  weight: string
  id?: string
}
export function Catalog({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const context = archives.state.context!
  const [weightWindow, setWeightWindow] = useState<{
    sequenceId: string
    label: string
    opened: boolean
    uncertain: boolean
    trigger: HTMLElement | null
  } | null>(null)
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useConsultationState('catalog', 'search')
  const [status, setStatus] = useConsultationState('catalog', 'status')
  const [page, setPage, pageCurrent] = useConsultationState('catalog', 'page')
  const [list, setList] = useState<PageDto<ServiceTypeDto> | null>(null)
  const [selected, setSelected, selectionCurrent] = useConsultationState('catalog', 'selection')
  const [detail, setDetail] = useState<ServiceTypeDto | null>(null)
  const [fixed, setFixed] = useState<
    { operation: OperationType; initialWeight: InitialWeightDto }[]
  >([])
  const [error, setError] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [issues, setIssues] = useState<ApplicationErrorDto['fields']>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null)
  const [preview, setPreview] = useState<ChangePreviewDto | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const newButton = useRef<HTMLButtonElement>(null)
  const resumeWeightButton = useRef<HTMLButtonElement>(null)
  const dialogTrigger = useRef<HTMLElement | null>(null)
  const rememberTrigger = () => {
    dialogTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
  }
  const restoreFocus = () => {
    const target = dialogTrigger.current?.isConnected ? dialogTrigger.current : newButton.current
    target?.focus()
  }
  const listRequest = useApplicationRequest(context, setError)
  const detailRequest = useApplicationRequest(context, setError)
  const fixedRequest = useApplicationRequest(context, setError)
  const commandRequest = useApplicationRequest(context, setDialogError)
  const effectsRequest = useApplicationRequest(context, setDialogError)
  const { request: readList } = listRequest,
    { request: readDetail, invalidate: invalidateDetail } = detailRequest,
    { request: readFixed } = fixedRequest
  const discardDraft = () => {
    setDraft(null)
    setSavedDraft(null)
    setPreview(null)
    setConfirmOpen(false)
    commandRequest.invalidate()
    effectsRequest.invalidate()
    setIssues([])
    setDialogError(null)
  }
  const writes = useWriteAttempt(
    archives,
    () => {
      discardDraft()
      setSelected(null)
      setDetail(null)
      setReload((n) => n + 1)
    },
    detailRequest.suspendWhile,
  )
  const guard = useProtectedDraft({
    state: writes.attempt.uncertain
      ? 'UNCERTAIN'
      : archives.commandBusy || commandRequest.loading || writes.attempt.busy
        ? 'BUSY'
        : draft || preview || savedDraft
          ? 'DRAFT'
          : 'CLEAN',
    discard: discardDraft,
    recover: writes.openRecovery,
  })
  const busy =
    writes.attempt.busy ||
    writes.attempt.uncertain ||
    archives.busy ||
    archives.commandBusy ||
    commandRequest.loading
  const dialogOpen = !!draft || confirmOpen
  const anyDialogOpen = dialogOpen || !!weightWindow?.opened
  useEffect(() => {
    onDialogChange(anyDialogOpen)
    return () => onDialogChange(false)
  }, [anyDialogOpen, onDialogChange])
  useEffect(() => {
    void readList(() =>
      window.catalog.list({
        context: { sessionId: context.sessionId },
        query: { search, status: status as 'ALL' | 'ACTIVE' | 'INACTIVE', page, pageSize: 25 },
      }),
    ).then((result) => {
      if (result?.ok && pageCurrent()) {
        setList(result.value)
        const lastPage = Math.max(1, Math.ceil(result.value.total / result.value.pageSize))
        if (page > lastPage) setPage(lastPage)
      }
    })
    return listRequest.invalidate
  }, [
    readList,
    listRequest.invalidate,
    context.sessionId,
    context.revision,
    search,
    status,
    page,
    reload,
  ])
  useEffect(() => {
    if (!selected) return
    void readDetail(() =>
      window.catalog.get({ context: { sessionId: context.sessionId }, query: { id: selected } }),
    ).then((result) => {
      if (!selectionCurrent()) return
      if (result?.ok) setDetail(result.value)
      else if (result && !result.ok && result.error.code === 'NOT_FOUND') {
        setDetail(null)
        setSelected(null)
      }
    })
    return invalidateDetail
  }, [invalidateDetail, readDetail, context.sessionId, context.revision, selected, reload])
  useEffect(() => {
    void readFixed(() =>
      window.catalog.fixedWeights({ context: { sessionId: context.sessionId }, query: null }),
    ).then((result) => {
      if (result?.ok) setFixed([...result.value])
    })
  }, [readFixed, context.sessionId, context.revision, reload])
  const openWeights = (sequenceId: string, label: string) => {
    if (weightWindow?.opened && weightWindow.sequenceId === sequenceId) return
    setWeightWindow({
      sequenceId,
      label,
      opened: true,
      uncertain: false,
      trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    })
  }
  const fieldError = (name: string) => issues.find((issue) => issue.path[0] === name)?.message
  const close = () => {
    if (busy) return
    commandRequest.invalidate()
    effectsRequest.invalidate()
    if (draft) setSavedDraft(draft)
    setDraft(null)
    setConfirmOpen(false)
    setDialogError(null)
    setIssues([])
  }
  const showPreview = async (change: CatalogChange, original = context) => {
    setDialogError(null)
    setIssues([])
    if (!draft) rememberTrigger()
    setConfirmOpen(true)
    const result = await commandRequest.request(() =>
      archives.execute(() => window.catalog.preview({ context: original, payload: change })),
    )
    if (result?.ok) setPreview(result.value)
    else if (result && !result.ok) setIssues(result.error.fields)
  }
  const submit = async () => {
    if (!draft) return
    if (draft.kind === 'RENAME') {
      await showPreview(
        { operation: 'RENAME', id: draft.id!, description: draft.description },
        draft.context,
      )
      return
    }
    setDialogError(null)
    setIssues([])
    const weight = decimalInput(draft.weight)
    if (weight === null || draft.weight.trim().replace(',', '.').replace('.', '').length > 256) {
      setIssues([
        {
          path: ['initialWeight'],
          code: 'INVALID_DECIMAL',
          message: 'Inserisci un peso positivo, senza esponenti, con al massimo 256 cifre.',
        },
      ])
      return
    }
    const result = await writes.attempt.run(draft.context, crypto.randomUUID(), (attemptId) =>
      commandRequest.request(() =>
        archives.execute(() =>
          window.catalog.create(
            trackedRequest(
              {
                context: draft.context,
                payload: { description: draft.description, initialWeight: weight },
              },
              attemptId,
            ),
          ),
        ),
      ),
    )
    if (result?.ok) {
      setSelected(result.value.id)
      setDetail(result.value)
      setSavedDraft(null)
      setDraft(null)
      setNotice('Tipo di prestazione creato.')
    } else if (result && !result.ok) setIssues(result.error.fields)
  }
  const confirm = async () =>
    detailRequest.suspendWhile(async () => {
      if (!preview) return
      setDialogError(null)
      const result = await writes.attempt.run(preview.context, crypto.randomUUID(), (attemptId) =>
        commandRequest.request(() =>
          archives.execute(() =>
            window.catalog.confirm(
              trackedRequest(
                {
                  context: preview.context,
                  payload: { previewId: preview.previewId },
                },
                attemptId,
              ),
            ),
          ),
        ),
      )
      if (result?.ok) {
        if (preview.operation === 'CATALOG_DELETE') {
          detailRequest.invalidate()
          setSelected(null)
          setDetail(null)
        }
        setPreview(null)
        setConfirmOpen(false)
        setDraft(null)
        setNotice('Modifica completata.')
      }
    }, preview?.operation === 'CATALOG_DELETE')
  const pageEffects = async (next: number) => {
    if (!preview) return
    const result = await effectsRequest.request(() =>
      window.catalog.previewEffects({
        context: { sessionId: preview.context.sessionId },
        query: { previewId: preview.previewId, page: next, pageSize: 50 },
      }),
    )
    if (result?.ok) setPreview(result.value)
  }
  const reactivate = async () => {
    if (!detail) return
    setDialogError(null)
    const result = await writes.attempt.run(context, crypto.randomUUID(), (attemptId) =>
      commandRequest.request(() =>
        archives.execute(() =>
          window.catalog.reactivate(
            trackedRequest({ context, payload: { id: detail.id } }, attemptId),
          ),
        ),
      ),
    )
    if (result?.ok) {
      setDetail(result.value)
      setNotice('Tipo riattivato.')
    } else if (result && !result.ok) setError(result.error.message)
  }
  const reloadDraft = useCallback(() => {
    if (!draft) return
    setDraft({ ...draft, context: { ...context } })
    setDialogError(null)
    setIssues([])
    setPreview(null)
    setConfirmOpen(false)
  }, [draft, context])
  return (
    <>
      {writes.recovery}
      {(savedDraft || (preview && !confirmOpen)) && (
        <Button
          variant="default"
          onClick={() => {
            if (savedDraft) {
              setDraft(savedDraft)
              setSavedDraft(null)
            }
            if (preview) setConfirmOpen(true)
          }}
        >
          Riprendi bozza
        </Button>
      )}
      {error && (
        <StateMessage kind="error" title="Catalogo non disponibile">
          {error}
          <Button
            variant="subtle"
            onClick={() => {
              setError(null)
              setPage(1)
              setReload((value) => value + 1)
            }}
          >
            Ricarica
          </Button>
        </StateMessage>
      )}
      {notice && (
        <StateMessage
          kind="success"
          title="Operazione completata"
          onClose={() => {
            setNotice(null)
            newButton.current?.focus()
          }}
        >
          {notice}
        </StateMessage>
      )}
      {weightWindow && !weightWindow.opened && (
        <StateMessage title="Bozza peso conservata" kind="warning">
          <Group>
            <Button
              ref={resumeWeightButton}
              disabled={busy || dialogOpen}
              onClick={() => setWeightWindow({ ...weightWindow, opened: true })}
            >
              Riprendi bozza peso
            </Button>
            <Button
              variant="default"
              disabled={busy || weightWindow.uncertain}
              onClick={() => {
                guard.request({
                  label: 'scartare la bozza del peso',
                  run: () => setWeightWindow(null),
                })
              }}
            >
              Scarta bozza peso
            </Button>
          </Group>
        </StateMessage>
      )}
      <div className="ports-workspace">
        <section className="archive-panel port-list" aria-label="Elenco tipi di prestazione">
          <Group className="port-list-heading" justify="space-between">
            <h2>Catalogo</h2>
            <Button
              size="compact-sm"
              ref={newButton}
              disabled={busy}
              onClick={() => {
                guard.request({
                  label: 'iniziare il nuovo comando',
                  run: () => {
                    rememberTrigger()
                    setDialogError(null)
                    setIssues([])
                    setDraft({
                      kind: 'CREATE',
                      context: { ...context },
                      description: '',
                      weight: '1',
                    })
                  },
                })
              }}
            >
              Nuovo tipo
            </Button>
          </Group>
          <div className="catalog-filters">
            <TextInput
              label="Cerca descrizione"
              value={search}
              onChange={(event) => {
                listRequest.invalidate()
                setSearch(event.currentTarget.value)
                setPage(1)
              }}
            />
            <Select
              label="Stato"
              value={status}
              data={[
                { value: 'ALL', label: 'Tutti' },
                { value: 'ACTIVE', label: 'Attivi' },
                { value: 'INACTIVE', label: 'Disattivati' },
              ]}
              onChange={(value) => {
                listRequest.invalidate()
                setStatus(value ?? 'ALL')
                setPage(1)
              }}
              allowDeselect={false}
            />
          </div>
          {listRequest.loading && <p role="status">Caricamento elenco…</p>}
          {list && (
            <p className="list-summary">
              {list.total} tipi · pagina {list.page}
            </p>
          )}
          <div className="port-list-results">
            {list?.items.map((type) => (
              <button
                key={type.id}
                className="port-list-item"
                aria-pressed={selected === type.id}
                onClick={() => {
                  if (selected === type.id) return
                  detailRequest.invalidate()
                  setDetail(null)
                  setSelected(type.id)
                }}
              >
                <strong>{type.description}</strong>
                <span>
                  {type.status === 'ACTIVE' ? 'Attivo' : 'Disattivato'}
                  {selected === type.id ? ' · Selezionato' : ''}
                </span>
              </button>
            ))}
            {list?.total === 0 && (
              <p>
                {search
                  ? 'Nessun risultato. Modifica la ricerca.'
                  : 'Nessun tipo presente. Crea un nuovo tipo.'}
              </p>
            )}
          </div>
          {list && (
            <Pagination
              className="list-pagination"
              size="sm"
              total={Math.max(1, Math.ceil(list.total / list.pageSize))}
              value={page}
              onChange={setPage}
              aria-label="Pagine catalogo"
            />
          )}
        </section>
        <section
          className="archive-panel catalog-inspector"
          aria-label="Dettaglio catalogo"
          tabIndex={0}
        >
          {detailRequest.loading && <p role="status">Caricamento dettaglio…</p>}
          {detail ? (
            <>
              <h2>{detail.description}</h2>
              <Badge color={detail.status === 'ACTIVE' ? 'teal' : 'gray'}>
                {detail.status === 'ACTIVE' ? 'Attivo' : 'Disattivato'}
              </Badge>
              <p>
                Peso iniziale:{' '}
                <strong data-testid="catalog-weight">
                  {detail.initialWeight.weight.replace('.', ',')}
                </strong>{' '}
                · senza decorrenza
              </p>
              <p>
                {detail.hasEverBeenUsed
                  ? 'Già utilizzato: eliminazione non consentita.'
                  : 'Mai utilizzato.'}
              </p>
              <Button
                variant="light"
                disabled={busy}
                onClick={() => {
                  guard.request({
                    label: 'iniziare il nuovo comando',
                    run: () => openWeights(detail.initialWeight.sequenceId, detail.description),
                  })
                }}
              >
                Cronologia pesi
              </Button>
              <Group gap="xs">
                <Button
                  variant="default"
                  disabled={busy}
                  onClick={() => {
                    guard.request({
                      label: 'iniziare il nuovo comando',
                      run: () => {
                        rememberTrigger()
                        setDialogError(null)
                        setIssues([])
                        setDraft({
                          kind: 'RENAME',
                          id: detail.id,
                          description: detail.description,
                          weight: detail.initialWeight.weight,
                          context: { ...context },
                        })
                      },
                    })
                  }}
                >
                  Rinomina
                </Button>
                {detail.status === 'ACTIVE' ? (
                  <Button
                    variant="default"
                    disabled={busy}
                    onClick={() => {
                      guard.request({
                        label: 'iniziare il nuovo comando',
                        run: () => void showPreview({ operation: 'DEACTIVATE', id: detail.id }),
                      })
                    }}
                  >
                    Disattiva
                  </Button>
                ) : (
                  <Button variant="default" disabled={busy} onClick={() => void reactivate()}>
                    Riattiva
                  </Button>
                )}
                <Button
                  color="red"
                  variant="light"
                  disabled={busy}
                  onClick={() => {
                    guard.request({
                      label: 'iniziare il nuovo comando',
                      run: () => void showPreview({ operation: 'DELETE', id: detail.id }),
                    })
                  }}
                >
                  Elimina tipo
                </Button>
              </Group>
            </>
          ) : (
            <StateMessage title="Seleziona un tipo">
              Scegli un tipo dall’elenco per consultarlo o modificarlo.
            </StateMessage>
          )}
          <hr />
          <h2>Pesi delle operazioni fisse</h2>
          {fixedRequest.loading && <p role="status">Caricamento pesi…</p>}
          {fixed.map((item) => (
            <p key={item.operation}>
              <strong>{operationLabels[item.operation]}</strong>:{' '}
              {item.initialWeight.weight.replace('.', ',')} · peso iniziale senza decorrenza
              <Button
                ml="sm"
                size="compact-sm"
                variant="light"
                disabled={busy || !!weightWindow}
                onClick={() => {
                  guard.request({
                    label: 'iniziare il nuovo comando',
                    run: () =>
                      openWeights(item.initialWeight.sequenceId, operationLabels[item.operation]),
                  })
                }}
              >
                Cronologia pesi {operationLabels[item.operation]}
              </Button>
            </p>
          ))}
          <StateMessage title="Sequenze dei pesi">
            Ogni operazione fissa e tipo configurabile ha una cronologia autonoma. Apri la
            cronologia per inserire, correggere o eliminare versioni datate e consultarne gli
            effetti.
          </StateMessage>
        </section>
      </div>
      {weightWindow && (
        <WeightHistory
          sequenceId={weightWindow.sequenceId}
          label={weightWindow.label}
          opened={weightWindow.opened}
          archives={archives}
          trigger={weightWindow.trigger}
          resumeTrigger={resumeWeightButton}
          onClose={(keep) => {
            setWeightWindow((old) => (keep && old ? { ...old, opened: false } : null))
            if (!keep) requestAnimationFrame(() => weightWindow.trigger?.focus())
          }}
          onResume={() => setWeightWindow({ ...weightWindow, opened: true })}
          onUncertainChange={(uncertain) =>
            setWeightWindow((old) =>
              old && old.uncertain !== uncertain ? { ...old, uncertain } : old,
            )
          }
          onApplied={() => {
            setReload((n) => n + 1)
            setNotice('Peso aggiornato e calcoli ricalcolati.')
          }}
        />
      )}
      <Modal
        opened={dialogOpen}
        onClose={close}
        returnFocus={false}
        onExitTransitionEnd={restoreFocus}
        closeOnClickOutside={false}
        closeOnEscape={!busy}
        withCloseButton={!busy}
        title={
          confirmOpen
            ? 'Conferma modifica catalogo'
            : draft?.kind === 'CREATE'
              ? 'Nuovo tipo di prestazione'
              : 'Rinomina tipo'
        }
        centered
        size="lg"
      >
        <Stack>
          {writes.control}
          {dialogError && (
            <StateMessage kind="error" title="Operazione non completata">
              {dialogError}
            </StateMessage>
          )}
          {confirmOpen ? (
            preview ? (
              <PortConfirmation
                preview={preview}
                disabled={busy || effectsRequest.loading}
                revision={context.revision}
                onConfirm={() => void confirm()}
                onCancel={() => {
                  effectsRequest.invalidate()
                  setPreview(null)
                  setConfirmOpen(false)
                  if (!draft) close()
                }}
                onPage={(next) => void pageEffects(next)}
              />
            ) : (
              <Button
                variant="default"
                disabled={busy}
                onClick={() => {
                  setConfirmOpen(false)
                  if (!draft) close()
                }}
              >
                Torna indietro
              </Button>
            )
          ) : (
            draft && (
              <>
                <TextInput
                  label="Descrizione"
                  data-autofocus
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.currentTarget.value })
                  }
                  error={fieldError('description')}
                  disabled={busy}
                />
                {draft.kind === 'CREATE' && (
                  <TextInput
                    label="Peso iniziale"
                    description="Maggiore di zero. Puoi usare la virgola decimale."
                    inputMode="decimal"
                    value={draft.weight}
                    onChange={(event) => setDraft({ ...draft, weight: event.currentTarget.value })}
                    error={fieldError('initialWeight')}
                    disabled={busy}
                  />
                )}
                {draft.context.revision !== context.revision && (
                  <StateMessage kind="warning" title="Bozza obsoleta">
                    I dati sono cambiati. Ricarica esplicitamente il contesto prima di continuare.
                  </StateMessage>
                )}
                <Group>
                  <Button disabled={busy} onClick={() => void submit()}>
                    {draft.kind === 'CREATE' ? 'Crea tipo' : 'Mostra anteprima'}
                  </Button>
                  <Button variant="default" disabled={busy} onClick={close}>
                    Annulla
                  </Button>
                  <Button variant="subtle" disabled={busy} onClick={reloadDraft}>
                    Ricarica bozza
                  </Button>
                </Group>
              </>
            )
          )}
        </Stack>
      </Modal>
    </>
  )
}
