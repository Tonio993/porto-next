import { ServiceFilters, type ServiceFiltersValue } from './ServiceFilters'
import { ServicePreview } from './ServicePreview'
import { CatalogPicker } from './CatalogPicker'
import { useEffect, useRef, useState } from 'react'
import { Button, Fieldset, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core'
import type {
  ApplicationResult,
  ArchiveContextDto,
  FieldIssueDto,
} from '../../../../shared/contracts/application'
import type {
  CreateFreeServiceDto,
  ServiceActivityDto,
  ServiceChange,
  ServiceChangePreviewDto,
  ServiceMomentDto,
} from '../../../../shared/contracts/services'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { useArchives } from '../../api/use-archives'
import { useApplicationRequest } from '../../api/use-application-request'
import { moneyInput } from '../../api/numeric-input'
import { VesselPicker } from '../operations/VesselPicker'
import { SubjectPicker } from '../operations/SubjectPicker'
import { SubjectValues } from '../operations/SubjectValues'
import { executionLabels } from '../operations/OperationDetail'
import { TariffMomentFields, emptyMoment } from '../tariffs/TariffMomentFields'
import { PageControls } from '../PageControls'
import { StateMessage } from '../StateMessage'

type Draft = {
  mode?: 'UPDATE' | 'COMPLETE' | 'NOTES' | 'DELETE'
  original?: ServiceActivityDto
  context: ArchiveContextDto
  values: CreateFreeServiceDto
  amount: string
  category: 'FREE' | 'CATALOG'
  serviceTypeId: string | null
}
export function Services({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const context = archives.state.context!
  const [vesselId, setVesselId] = useState<string | null>(null),
    [page, setPage] = useState(1),
    [reload, setReload] = useState(0)
  const [filters, setFilters] = useState<ServiceFiltersValue>({}),
    [preview, setPreview] = useState<ServiceChangePreviewDto | null>(null),
    [detailRevision, setDetailRevision] = useState<string | null>(null)
  const [list, setList] = useState<PageDto<ServiceActivityDto> | null>(null),
    [selected, setSelected] = useState<{ id: string } | null>(null),
    [detail, setDetail] = useState<ServiceActivityDto | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null),
    [open, setOpen] = useState(false),
    [resolution, setResolution] = useState<ServiceMomentDto | null>(null)
  const [candidates, setCandidates] = useState<{ value: string; label: string }[]>([])
  const [error, setError] = useState<string | null>(null),
    [dialogError, setDialogError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const [issues, setIssues] = useState<readonly FieldIssueDto[]>([])
  const [previewExpired, setPreviewExpired] = useState(false)
  useEffect(() => {
    if (!preview) {
      setPreviewExpired(false)
      return
    }
    const remaining = Date.parse(preview.expiresAtUtc) - Date.now()
    setPreviewExpired(remaining <= 0)
    const timer = window.setTimeout(() => setPreviewExpired(true), Math.max(0, remaining))
    return () => window.clearTimeout(timer)
  }, [preview])
  const trigger = useRef<HTMLElement | null>(null),
    detailFocus = useRef<HTMLButtonElement | null>(null),
    reloadFocus = useRef<HTMLButtonElement | null>(null)
  const listing = useApplicationRequest(context, setError),
    reading = useApplicationRequest(context, setError),
    resolving = useApplicationRequest(context, setDialogError),
    command = useApplicationRequest(context, setDialogError)
  const { request: readList } = listing,
    { request: readDetail } = reading
  const busy = archives.busy || archives.commandBusy || command.loading
  useEffect(() => {
    onDialogChange(open)
    return () => onDialogChange(false)
  }, [open, onDialogChange])
  useEffect(() => {
    void readList(() =>
      window.services.list({
        context: { sessionId: context.sessionId },
        query: { ...filters, vesselId, page, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok) setList(r.value)
    })
  }, [readList, context.sessionId, context.revision, vesselId, page, reload, filters])
  useEffect(() => {
    if (!selected) return
    void readDetail(() =>
      window.services.get({
        context: { sessionId: context.sessionId },
        query: { id: selected.id },
      }),
    ).then((r) => {
      if (r?.ok) {
        setDetail(r.value)
        setDetailRevision(r.context.revision)
      }
    })
  }, [readDetail, context.sessionId, context.revision, selected, reload])
  // execute() refreshes archive state, but React may batch that update with this reply.
  // Check the persisted context before applying a preview/write DTO or allowing a retry.
  const executeServiceCommand = async <T,>(operation: () => Promise<ApplicationResult<T>>) => {
    const result = await archives.execute(operation)
    if (result.ok || result.error.code === 'NOT_FOUND') {
      const state = await archives.update(() => window.archives.getState())
      const observed = state?.context
      if (
        !observed ||
        !result.context ||
        observed.sessionId !== result.context.sessionId ||
        observed.archiveId !== result.context.archiveId ||
        observed.revision !== result.context.revision
      )
        throw new Error('Risposta superata dal contesto persistito.')
    }
    return result
  }
  const invalidateEditor = () => {
    resolving.invalidate()
    command.invalidate()
    setPreview(null)
    setResolution(null)
    setCandidates([])
    setDialogError(null)
    setIssues([])
  }
  const change = (values: CreateFreeServiceDto) => {
    invalidateEditor()
    if (draft) setDraft({ ...draft, values })
  }
  const start = (category: 'FREE' | 'CATALOG') => {
    if (!vesselId) return
    trigger.current = document.activeElement as HTMLElement
    invalidateEditor()
    setUncertain(false)
    setDraft({
      context,
      amount: '',
      category,
      serviceTypeId: null,
      values: {
        vesselId,
        interpretationPortId: null,
        moment: emptyMoment(),
        executionStatus: 'PLANNED',
        description: '',
        base: '0.00',
        notes: null,
        specified: { customerId: null, agencyId: null },
      },
    })
    setOpen(true)
  }
  const resolve = async () => {
    if (!draft) return
    const { vesselId, interpretationPortId, moment } = draft.values
    const r = await resolving.request(() =>
      window.services.resolveMoment({
        context: { sessionId: context.sessionId },
        query: { vesselId, interpretationPortId, moment },
      }),
    )
    if (r?.ok) {
      setResolution(r.value)
      setCandidates([])
    } else if (r && !r.ok && r.error.code === 'OPERATIONAL_CONTEXT_AMBIGUOUS')
      setCandidates(
        r.error.conflicts.map((c) => ({ value: c.reference.id, label: c.reference.label })),
      )
  }
  const fromDetail = (
    value: ServiceActivityDto,
    mode: Draft['mode'],
    snapshot: ArchiveContextDto,
  ): Draft => ({
    mode: mode === 'COMPLETE' && value.executionStatus !== 'PLANNED' ? 'UPDATE' : mode,
    original: value,
    context: snapshot,
    category: value.category,
    serviceTypeId: value.serviceTypeId,
    amount: value.base,
    values: {
      vesselId: value.vesselId,
      interpretationPortId: value.context.portId,
      moment: { localDateTime: value.moment.localDateTime, selectedOffset: value.moment.offset },
      executionStatus:
        mode === 'COMPLETE' && value.executionStatus === 'PLANNED'
          ? 'PERFORMED'
          : value.executionStatus,
      description: value.description,
      base: value.base,
      notes: value.notes,
      specified: value.specified,
    },
  })
  const edit = (mode: Draft['mode']) => {
    if (!detail || detailRevision !== context.revision) return
    trigger.current = document.activeElement as HTMLElement
    invalidateEditor()
    setUncertain(false)
    setDraft(fromDetail(detail, mode, context))
    setOpen(true)
  }
  const reloadDraft = async () => {
    if (!draft) return
    invalidateEditor()
    if (draft.original) {
      const r = await command.request(() =>
        executeServiceCommand(() =>
          window.services.get({
            context: { sessionId: draft.context.sessionId },
            query: { id: draft.original!.id },
          }),
        ),
      )
      if (r?.ok) {
        setDraft(fromDetail(r.value, draft.mode, r.context))
        setUncertain(false)
      } else if (r && !r.ok && r.error.code === 'NOT_FOUND') {
        setDraft(null)
        setOpen(false)
        setDetail(null)
        setSelected(null)
        setNotice('La prestazione non esiste più.')
        setUncertain(false)
      }
    } else if (uncertain) {
      const r = await command.request(() =>
        executeServiceCommand(async () => {
          const resolved = await window.services.resolveMoment({
            context: { sessionId: draft.context.sessionId },
            query: {
              vesselId: draft.values.vesselId,
              interpretationPortId: draft.values.interpretationPortId,
              moment: draft.values.moment,
            },
          })
          if (!resolved.ok) return resolved
          if (resolved.value.resolution.status !== 'RESOLVED')
            throw new Error('Il momento della registrazione richiede una verifica.')
          const utc = resolved.value.resolution.moment.utc
          const result = await window.services.list({
            context: { sessionId: draft.context.sessionId },
            query: {
              vesselId: draft.values.vesselId,
              category: draft.category,
              fromUtc: utc,
              toUtc: utc,
              page: 1,
              pageSize: 25,
            },
          })
          return result.ok ? { ...result, value: { list: result.value, utc } } : result
        }),
      )
      if (!r?.ok) return
      // Show all candidates at the submitted instant before allowing an explicit retry.
      // Multiple ordinary services may legitimately have identical data.
      listing.invalidate()
      reading.invalidate()
      setVesselId(draft.values.vesselId)
      setFilters({ category: draft.category, fromUtc: r.value.utc, toUtc: r.value.utc })
      setPage(1)
      setList(r.value.list)
      setSelected(null)
      setDetail(null)
      setDraft({ ...draft, context: r.context })
      setUncertain(false)
      setOpen(false)
      setNotice(
        'Verifica nell’elenco le prestazioni già registrate al momento della bozza prima di riprenderla. I valori inseriti sono conservati.',
      )
    } else {
      setDraft({ ...draft, context })
      setUncertain(false)
    }
    setReload((n) => n + 1)
  }
  const finish = (service: ServiceActivityDto | null, revision: string) => {
    setOpen(false)
    setDraft(null)
    setPreview(null)
    setDetail(service)
    setDetailRevision(revision)
    setSelected(service ? { id: service.id } : null)
    setReload((n) => n + 1)
    setNotice('Prestazione aggiornata.')
  }
  const confirm = async () => {
    if (!preview || !draft) return
    const r = await command.request(() =>
      executeServiceCommand(() =>
        window.services.confirm({
          context: preview.context,
          payload: { previewId: preview.previewId },
        }),
      ),
    )
    if (r?.ok) finish(r.value.service, r.context.revision)
    else if (!r) {
      setUncertain(true)
      setDialogError(
        'Esito non verificato. Ricarica la bozza e controlla i dati prima di riprovare.',
      )
    }
  }
  const save = async () => {
    if (!draft) return
    if (draft.mode === 'NOTES' && draft.original) {
      const r = await command.request(() =>
        executeServiceCommand(() =>
          window.services.updateNotes({
            context: draft.context,
            payload: { id: draft.original!.id, notes: draft.values.notes },
          }),
        ),
      )
      if (r?.ok) finish(r.value, r.context.revision)
      else if (!r) {
        setUncertain(true)
        setDialogError(
          'Esito non verificato. Ricarica la bozza e controlla le note prima di riprovare.',
        )
      }
      return
    }
    if (draft.mode === 'DELETE' && draft.original) {
      const r = await command.request(() =>
        executeServiceCommand(() =>
          window.services.preview({
            context: draft.context,
            payload: { operation: 'DELETE', id: draft.original!.id },
          }),
        ),
      )
      if (r?.ok) setPreview(r.value)
      else if (r) setIssues(r.error.fields)
      return
    }
    const base = moneyInput(draft.amount)
    if (draft.category === 'FREE' && (!base || base === '0.00')) {
      setDialogError('Inserisci un importo base maggiore di zero con al massimo due decimali.')
      return
    }
    setDialogError(null)
    if (draft.mode && draft.original) {
      const common = {
        vesselId: draft.values.vesselId,
        interpretationPortId: draft.values.interpretationPortId,
        moment: draft.values.moment,
        executionStatus: draft.values.executionStatus,
        notes: draft.values.notes,
        specified: draft.values.specified,
      }
      const payload: ServiceChange =
        draft.category === 'FREE'
          ? {
              operation: draft.mode === 'COMPLETE' ? 'COMPLETE_FREE' : 'UPDATE_FREE',
              id: draft.original.id,
              values: { ...common, description: draft.values.description, base: base! },
            }
          : {
              operation: draft.mode === 'COMPLETE' ? 'COMPLETE_CATALOG' : 'UPDATE_CATALOG',
              id: draft.original.id,
              values: { ...common, serviceTypeId: draft.serviceTypeId! },
            }
      const r = await command.request(() =>
        executeServiceCommand(() => window.services.preview({ context: draft.context, payload })),
      )
      if (r?.ok) setPreview(r.value)
      else if (r) setIssues(r.error.fields)
      return
    }
    const r = await command.request(() =>
      executeServiceCommand(() =>
        draft.category === 'FREE'
          ? window.services.createFree({
              context: draft.context,
              payload: { ...draft.values, base: base! },
            })
          : window.services.createCatalog({
              context: draft.context,
              payload: {
                vesselId: draft.values.vesselId,
                interpretationPortId: draft.values.interpretationPortId,
                moment: draft.values.moment,
                executionStatus: draft.values.executionStatus,
                notes: draft.values.notes,
                specified: draft.values.specified,
                serviceTypeId: draft.serviceTypeId!,
              },
            }),
      ),
    )
    if (r?.ok) {
      setOpen(false)
      setDraft(null)
      setSelected({ id: r.value.id })
      setDetail(r.value)
      setDetailRevision(r.context.revision)
      setNotice(
        draft.category === 'FREE'
          ? 'Prestazione libera registrata.'
          : 'Prestazione da catalogo registrata.',
      )
      setReload((n) => n + 1)
    } else if (r) setIssues(r.error.fields)
    else if (!r) {
      setUncertain(true)
      setDialogError(
        'Esito non verificato. Ricarica la consultazione e controlla la registrazione prima di riprovare.',
      )
    }
  }
  const stale =
    !!draft &&
    (draft.context.sessionId !== context.sessionId || draft.context.revision !== context.revision)
  return (
    <section className="master-data-page services-page" aria-label="Prestazioni">
      <Group justify="space-between" className="operational-heading">
        <h2>Prestazioni nave</h2>
        <Group>
          <Button disabled={!vesselId || busy} onClick={() => start('FREE')}>
            Nuova prestazione libera
          </Button>
          <Button variant="light" disabled={!vesselId || busy} onClick={() => start('CATALOG')}>
            Nuova prestazione da catalogo
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
      <VesselPicker
        context={context}
        value={vesselId}
        disabled={busy}
        onChange={(id) => {
          listing.invalidate()
          reading.invalidate()
          invalidateEditor()
          setFilters({})
          setVesselId(id)
          setPage(1)
          setList(null)
          setSelected(null)
          setDetail(null)
          setDraft(null)
          setUncertain(false)
          setNotice(null)
        }}
      />
      <ServiceFilters
        key={vesselId ?? 'all'}
        context={context}
        vesselId={vesselId}
        value={filters}
        disabled={busy}
        onChange={(value) => {
          listing.invalidate()
          setError(null)
          setList(null)
          setFilters(value)
          setPage(1)
        }}
      />
      <Group gap="xs" className="consultation-actions">
        {vesselId && (
          <Button
            variant="default"
            disabled={busy}
            onClick={() => {
              listing.invalidate()
              reading.invalidate()
              setVesselId(null)
              setFilters({})
              setPage(1)
              setList(null)
              setSelected(null)
              setDetail(null)
            }}
          >
            Tutte le navi
          </Button>
        )}
        <Button
          ref={reloadFocus}
          variant="subtle"
          disabled={busy}
          onClick={() => {
            reading.invalidate()
            setDetail(null)
            setReload((n) => n + 1)
          }}
        >
          Ricarica consultazione
        </Button>
      </Group>
      {error && (
        <StateMessage kind="error" title="Consultazione non disponibile">
          {error}
        </StateMessage>
      )}
      {notice && <StateMessage kind="success" title={notice} />}
      <div className="services-workspace" data-detail={!!detail || reading.loading}>
        <section
          className="services-results"
          aria-label="Risultati prestazioni"
          aria-busy={listing.loading}
        >
          {listing.loading ? (
            <p role="status">Caricamento prestazioni…</p>
          ) : (
            list && (
              <>
                <div
                  className="table-scroll"
                  role="region"
                  aria-label="Elenco prestazioni"
                  tabIndex={0}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Momento locale</th>
                        <th>Categoria</th>
                        <th>Descrizione</th>
                        <th>Stato</th>
                        <th>Base EUR</th>
                        <th>Consultazione</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.items.map((s) => (
                        <tr key={s.id} aria-selected={selected?.id === s.id}>
                          <td>
                            {!vesselId && (
                              <strong className="service-row-vessel">{s.vesselName}</strong>
                            )}
                            {s.moment.localDateTime.slice(0, 10)}
                            <br />
                            {s.moment.localDateTime.slice(11)} ({s.moment.offset})
                          </td>
                          <td>{s.category === 'FREE' ? 'Libera' : 'Catalogo'}</td>
                          <td>
                            <span className="service-list-description" title={s.description}>
                              {s.description}
                            </span>
                          </td>
                          <td>{executionLabels[s.executionStatus]}</td>
                          <td>{s.base}</td>
                          <td>
                            <Button
                              variant="subtle"
                              aria-pressed={selected?.id === s.id}
                              onClick={() => {
                                reading.invalidate()
                                setSelected({ id: s.id })
                                setDetail(null)
                              }}
                            >
                              Apri prestazione
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!list.total && <p>Nessuna prestazione registrata.</p>}
                <PageControls
                  page={list}
                  disabled={busy || listing.loading}
                  onPage={(n) => {
                    listing.invalidate()
                    setPage(n)
                  }}
                />
              </>
            )
          )}
        </section>
        {detail ? (
          <section
            className="archive-panel service-detail"
            aria-label="Dettaglio prestazione"
            tabIndex={0}
          >
            <h3 className="service-detail-title">{detail.description}</h3>
            {detail.description.length > 120 && (
              <details className="service-complete-description">
                <summary>Descrizione completa</summary>
                <p>{detail.description}</p>
              </details>
            )}
            <p>
              {detail.category === 'FREE' ? 'Libera' : 'Catalogo'} ·{' '}
              {executionLabels[detail.executionStatus]} · Base EUR {detail.base}
            </p>
            <p>
              {detail.vesselName} · {detail.portName} ·{' '}
              {detail.berthName ?? 'Banchina non specificata'}
            </p>
            <p>
              {detail.moment.localDateTime} · {detail.moment.zoneId} · {detail.moment.offset} · UTC{' '}
              {detail.moment.utc}
            </p>
            <details className="tariff-long-value">
              <summary>Riferimenti della permanenza</summary>
              <p>
                Viaggio: {detail.context.voyageId}
                <br />
                Visita: {detail.context.portCallId}
                <br />
                Ormeggio: {detail.context.berthStayId}
              </p>
            </details>
            {detail.calculation && (
              <section aria-label="Calcolo della prestazione" className="tariff-long-value">
                <h4>Spiegazione del calcolo</h4>
                <p>
                  Tipologia {detail.calculation.vesselTypeId} · dimensione {detail.calculation.size}{' '}
                  · Peso: {detail.calculation.weight}
                </p>
                <p>
                  Tariffa dal {detail.calculation.tariffEffectiveFrom} · Scaglione fino a{' '}
                  {detail.calculation.upperLimit}
                </p>
                <ol>
                  {detail.calculation.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <details>
                  <summary>Riferimenti del calcolo</summary>
                  <p>
                    Tipo: {detail.serviceTypeId}
                    <br />
                    Tariffa: {detail.calculation.tariffId}
                    <br />
                    Configurazione: {detail.calculation.configurationId}
                    <br />
                    Scaglione: {detail.calculation.bracketId}
                    <br />
                    Sequenza peso: {detail.calculation.weightSequenceId}
                    <br />
                    Versione peso: {detail.calculation.weightVersionId}
                  </p>
                </details>
              </section>
            )}
            <SubjectValues subjects={detail.subjects} ownLevel="SERVICE_ACTIVITY" />
            {detail.notes && <p>Note: {detail.notes}</p>}
            <Group className="detail-actions">
              <Button
                disabled={busy || reading.loading || detailRevision !== context.revision}
                ref={detailFocus}
                onClick={() => edit('UPDATE')}
              >
                Modifica prestazione
              </Button>
              {detail.executionStatus === 'PLANNED' && (
                <Button
                  disabled={busy || reading.loading || detailRevision !== context.revision}
                  onClick={() => edit('COMPLETE')}
                >
                  Consuntiva prestazione
                </Button>
              )}
              <Button
                variant="default"
                disabled={busy || reading.loading || detailRevision !== context.revision}
                onClick={() => edit('NOTES')}
              >
                Modifica sole note
              </Button>
              <Button
                color="red"
                variant="default"
                disabled={busy || reading.loading || detailRevision !== context.revision}
                onClick={() => edit('DELETE')}
              >
                Elimina prestazione
              </Button>
            </Group>
            <p>
              {detail.category === 'FREE'
                ? 'Importo base manuale.'
                : 'Importo base calcolato dalla tariffa e dal peso applicabili.'}{' '}
              Disponibilità operativa: contesto di permanenza completo; l’idoneità definitiva alla
              fatturazione sarà valutata in una fase successiva.
            </p>
          </section>
        ) : (
          <section
            className="archive-panel service-detail selection-empty"
            aria-busy={reading.loading}
          >
            {reading.loading ? (
              <p role="status">Caricamento dettaglio prestazione…</p>
            ) : (
              <StateMessage title="Seleziona una prestazione">
                Apri una riga per consultare contesto, soggetti, importo base e azioni.
              </StateMessage>
            )}
          </section>
        )}
      </div>
      <Modal
        opened={open}
        onClose={() => {
          if (!busy) {
            invalidateEditor()
            setOpen(false)
          }
        }}
        title={
          draft?.mode
            ? {
                UPDATE: 'Modifica prestazione',
                COMPLETE: 'Consuntiva prestazione',
                NOTES: 'Modifica sole note',
                DELETE: 'Elimina prestazione',
              }[draft.mode]
            : draft?.category === 'CATALOG'
              ? 'Nuova prestazione da catalogo'
              : 'Nuova prestazione libera'
        }
        size={preview ? 'xl' : 'lg'}
        returnFocus={false}
        closeOnEscape={!busy}
        withCloseButton={!busy}
        closeOnClickOutside={false}
        onExitTransitionEnd={() => {
          const target = trigger.current
          if (target?.isConnected && !target.hasAttribute('disabled')) target.focus()
          else if (detailFocus.current && !detailFocus.current.disabled) detailFocus.current.focus()
          else reloadFocus.current?.focus()
        }}
      >
        {draft && (
          <Stack>
            {dialogError && (
              <StateMessage kind="error" title="Registrazione non disponibile">
                {dialogError}
              </StateMessage>
            )}
            {stale && (
              <StateMessage kind="error" title="I dati sono cambiati">
                Ricarica la bozza per usare il contesto corrente.
              </StateMessage>
            )}
            {!!issues.length && (
              <div role="alert">
                {issues.map((issue, i) => (
                  <p key={i}>{issue.message}</p>
                ))}
              </div>
            )}
            {preview && (
              <ServicePreview preview={preview} obsolete={stale} expired={previewExpired} />
            )}
            {draft.mode === 'NOTES' && (
              <Textarea
                data-autofocus
                label="Note"
                maxLength={10000}
                value={draft.values.notes ?? ''}
                disabled={busy || stale || uncertain}
                onChange={(e) => change({ ...draft.values, notes: e.currentTarget.value || null })}
              />
            )}
            {draft.mode !== 'NOTES' && draft.mode !== 'DELETE' && !preview && (
              <Fieldset
                disabled={busy || stale || uncertain}
                legend={
                  draft.category === 'FREE' ? 'Prestazione libera' : 'Prestazione da catalogo'
                }
              >
                <Stack>
                  {draft.mode && (
                    <VesselPicker
                      context={context}
                      value={draft.values.vesselId}
                      disabled={
                        busy ||
                        (draft.mode === 'COMPLETE' && draft.values.executionStatus === 'MISSED')
                      }
                      onChange={(vesselId) => {
                        if (vesselId)
                          change({ ...draft.values, vesselId, interpretationPortId: null })
                      }}
                    />
                  )}
                  <TariffMomentFields
                    moment={draft.values.moment}
                    onChange={(moment) =>
                      change({ ...draft.values, moment, interpretationPortId: null })
                    }
                    resolution={resolution?.resolution ?? null}
                    onResolve={() => void resolve()}
                    disabled={
                      busy ||
                      resolving.loading ||
                      (draft.mode === 'COMPLETE' && draft.values.executionStatus === 'MISSED')
                    }
                    label="Momento prestazione locale"
                    resolveLabel="Verifica momento e contesto"
                  />
                  {!!candidates.length && (
                    <Select
                      label="Porto di interpretazione"
                      data={candidates}
                      value={draft.values.interpretationPortId}
                      onChange={(id) => {
                        resolving.invalidate()
                        setResolution(null)
                        setDialogError(null)
                        setDraft({
                          ...draft,
                          values: { ...draft.values, interpretationPortId: id },
                        })
                      }}
                    />
                  )}
                  {resolution && <p>Porto competente: {resolution.portName}</p>}
                  <Select
                    label="Stato"
                    data={Object.entries(executionLabels)
                      .filter(
                        ([value]) =>
                          !draft.mode ||
                          (draft.mode === 'COMPLETE'
                            ? value !== 'PLANNED'
                            : draft.original?.executionStatus === 'PLANNED'
                              ? value === 'PLANNED'
                              : value !== 'PLANNED'),
                      )
                      .map(([value, label]) => ({ value, label }))}
                    value={draft.values.executionStatus}
                    onChange={(v) =>
                      change({
                        ...draft.values,
                        ...(draft.mode === 'COMPLETE' && v === 'MISSED' && draft.original
                          ? {
                              vesselId: draft.original.vesselId,
                              interpretationPortId: draft.original.context.portId,
                              moment: {
                                localDateTime: draft.original.moment.localDateTime,
                                selectedOffset: draft.original.moment.offset,
                              },
                            }
                          : {}),
                        executionStatus: v as CreateFreeServiceDto['executionStatus'],
                      })
                    }
                  />
                  {draft.category === 'CATALOG' ? (
                    <>
                      <CatalogPicker
                        context={context}
                        value={draft.serviceTypeId}
                        retainedId={draft.original?.serviceTypeId}
                        disabled={busy}
                        onChange={(id) => {
                          invalidateEditor()
                          setDraft({ ...draft, serviceTypeId: id })
                        }}
                      />
                      <p>
                        La base viene calcolata al salvataggio con tariffa e peso applicabili. Il
                        dettaglio mostra la spiegazione del calcolo.
                      </p>
                    </>
                  ) : (
                    <>
                      <TextInput
                        label="Descrizione"
                        error={issues.find((issue) => issue.path.at(-1) === 'description')?.message}
                        required
                        maxLength={1000}
                        value={draft.values.description}
                        onChange={(e) =>
                          change({ ...draft.values, description: e.currentTarget.value })
                        }
                      />
                      <TextInput
                        label="Importo base EUR"
                        error={
                          issues.find((issue) => issue.path.at(-1) === 'base')?.message ??
                          (dialogError?.startsWith('Inserisci un importo base')
                            ? dialogError
                            : undefined)
                        }
                        required
                        inputMode="decimal"
                        value={draft.amount}
                        onChange={(e) => {
                          invalidateEditor()
                          setDraft({ ...draft, amount: e.currentTarget.value })
                        }}
                      />
                    </>
                  )}
                  <Textarea
                    label="Note"
                    maxLength={10000}
                    value={draft.values.notes ?? ''}
                    onChange={(e) =>
                      change({ ...draft.values, notes: e.currentTarget.value || null })
                    }
                  />
                  <SubjectPicker
                    kind="customer"
                    context={context}
                    value={draft.values.specified.customerId}
                    disabled={busy}
                    onChange={(id) =>
                      change({
                        ...draft.values,
                        specified: { ...draft.values.specified, customerId: id },
                      })
                    }
                  />
                  <SubjectPicker
                    kind="agency"
                    context={context}
                    value={draft.values.specified.agencyId}
                    disabled={busy}
                    onChange={(id) =>
                      change({
                        ...draft.values,
                        specified: { ...draft.values.specified, agencyId: id },
                      })
                    }
                  />
                </Stack>
              </Fieldset>
            )}
            {(stale || uncertain) && (
              <Button variant="default" disabled={busy} onClick={() => void reloadDraft()}>
                {uncertain && !draft.original ? 'Verifica registrazione' : 'Ricarica bozza'}
              </Button>
            )}
            {preview && (
              <Button variant="default" disabled={busy} onClick={() => setPreview(null)}>
                Torna ai dati
              </Button>
            )}
            <Group justify="space-between" className="form-actions">
              <Button
                data-autofocus={draft.mode === 'DELETE' || !!preview || undefined}
                variant="default"
                disabled={busy}
                onClick={() => {
                  invalidateEditor()
                  setOpen(false)
                }}
              >
                Chiudi
              </Button>
              <Button
                color={draft.mode === 'DELETE' ? 'red' : undefined}
                disabled={
                  busy ||
                  stale ||
                  uncertain ||
                  !!preview?.blockers.length ||
                  (!!preview && previewExpired) ||
                  (draft.category === 'CATALOG' && !draft.serviceTypeId)
                }
                loading={command.loading}
                onClick={() => void (preview ? confirm() : save())}
              >
                {preview
                  ? 'Conferma variazione'
                  : draft.mode === 'NOTES'
                    ? 'Salva note'
                    : draft.mode
                      ? 'Mostra anteprima'
                      : 'Registra prestazione'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </section>
  )
}
