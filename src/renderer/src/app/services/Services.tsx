import { ServiceFilters, type ServiceFiltersValue } from './ServiceFilters'
import { ServicePreview } from './ServicePreview'
import { CatalogPicker } from './CatalogPicker'
import { useEffect, useRef, useState } from 'react'
import { Button, Fieldset, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core'
import type { ApplicationResult, ArchiveContextDto } from '../../../../shared/contracts/application'
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
    if (result.ok) {
      const state = await window.archives.getState()
      const observed = state.ok ? state.value.context : null
      if (
        !observed ||
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
    mode,
    original: value,
    context: snapshot,
    category: value.category,
    serviceTypeId: value.serviceTypeId,
    amount: value.base,
    values: {
      vesselId: value.vesselId,
      interpretationPortId: value.context.portId,
      moment: { localDateTime: value.moment.localDateTime, selectedOffset: value.moment.offset },
      executionStatus: mode === 'COMPLETE' ? 'PERFORMED' : value.executionStatus,
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
        window.services.get({
          context: { sessionId: context.sessionId },
          query: { id: draft.original!.id },
        }),
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
    } else if (!r) {
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
      <Group justify="space-between">
        <h2>Prestazioni nave</h2>
        <Group>
          <Button disabled={!vesselId || busy} onClick={() => start('FREE')}>
            Nuova prestazione libera
          </Button>
          <Button disabled={!vesselId || busy} onClick={() => start('CATALOG')}>
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
      {error && (
        <StateMessage kind="error" title="Consultazione non disponibile">
          {error}
        </StateMessage>
      )}
      {notice && <StateMessage kind="success" title={notice} />}
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
                    <tr key={s.id}>
                      <td>
                        {s.moment.localDateTime} ({s.moment.offset})
                      </td>
                      <td>{s.category === 'FREE' ? 'Libera' : 'Catalogo'}</td>
                      <td>{s.description}</td>
                      <td>{executionLabels[s.executionStatus]}</td>
                      <td>{s.base}</td>
                      <td>
                        <Button
                          variant="subtle"
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
      {detail && (
        <section className="archive-panel" aria-label="Dettaglio prestazione">
          <h3>{detail.description}</h3>
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
          <p className="tariff-long-value">
            Viaggio: {detail.context.voyageId}
            <br />
            Visita: {detail.context.portCallId}
            <br />
            Ormeggio: {detail.context.berthStayId}
          </p>
          {detail.calculation && (
            <section aria-label="Calcolo della prestazione" className="tariff-long-value">
              <h4>Spiegazione del calcolo</h4>
              <p>
                Tipologia {detail.calculation.vesselTypeId} · dimensione {detail.calculation.size} ·
                Peso: {detail.calculation.weight}
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
          <SubjectValues subjects={detail.subjects} />
          {detail.notes && <p>Note: {detail.notes}</p>}
          <Group>
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
      )}
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
        size="lg"
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
            {preview && <ServicePreview preview={preview} />}
            {draft.mode === 'NOTES' && (
              <Textarea
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
                        required
                        maxLength={1000}
                        value={draft.values.description}
                        onChange={(e) =>
                          change({ ...draft.values, description: e.currentTarget.value })
                        }
                      />
                      <TextInput
                        label="Importo base EUR"
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
                Ricarica bozza
              </Button>
            )}
            {preview && (
              <Button variant="default" disabled={busy} onClick={() => setPreview(null)}>
                Torna ai dati
              </Button>
            )}
            <Group justify="space-between">
              <Button
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
                disabled={
                  busy ||
                  stale ||
                  uncertain ||
                  !!preview?.blockers.length ||
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
