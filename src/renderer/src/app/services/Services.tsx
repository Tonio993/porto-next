import { CatalogPicker } from './CatalogPicker'
import { useEffect, useRef, useState } from 'react'
import { Button, Fieldset, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type {
  CreateFreeServiceDto,
  ServiceActivityDto,
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
  const trigger = useRef<HTMLElement | null>(null)
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
    if (!vesselId) return
    void readList(() =>
      window.services.list({
        context: { sessionId: context.sessionId },
        query: { vesselId, page, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok) setList(r.value)
    })
  }, [readList, context.sessionId, context.revision, vesselId, page, reload])
  useEffect(() => {
    if (!selected) return
    void readDetail(() =>
      window.services.get({
        context: { sessionId: context.sessionId },
        query: { id: selected.id },
      }),
    ).then((r) => {
      if (r?.ok) setDetail(r.value)
    })
  }, [readDetail, context.sessionId, context.revision, selected, reload])
  const invalidateEditor = () => {
    resolving.invalidate()
    command.invalidate()
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
  const save = async () => {
    if (!draft) return
    const base = moneyInput(draft.amount)
    if (draft.category === 'FREE' && (!base || base === '0.00')) {
      setDialogError('Inserisci un importo base maggiore di zero con al massimo due decimali.')
      return
    }
    setDialogError(null)
    const r = await command.request(() =>
      archives.execute(() =>
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
      <Button
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
      {!vesselId ? (
        <p>Seleziona una nave per consultare le prestazioni.</p>
      ) : listing.loading ? (
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
          <p>
            {detail.category === 'FREE'
              ? 'Importo base manuale.'
              : 'Importo base calcolato dalla tariffa e dal peso applicabili.'}{' '}
            Modifica e consuntivazione saranno disponibili nei prossimi passi.
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
          draft?.category === 'CATALOG'
            ? 'Nuova prestazione da catalogo'
            : 'Nuova prestazione libera'
        }
        size="lg"
        closeOnClickOutside={false}
        onExitTransitionEnd={() => trigger.current?.focus()}
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
            <Fieldset
              disabled={busy || stale || uncertain}
              legend={draft.category === 'FREE' ? 'Prestazione libera' : 'Prestazione da catalogo'}
            >
              <Stack>
                <TariffMomentFields
                  moment={draft.values.moment}
                  onChange={(moment) =>
                    change({ ...draft.values, moment, interpretationPortId: null })
                  }
                  resolution={resolution?.resolution ?? null}
                  onResolve={() => void resolve()}
                  disabled={busy || resolving.loading}
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
                      setDraft({ ...draft, values: { ...draft.values, interpretationPortId: id } })
                    }}
                  />
                )}
                {resolution && <p>Porto competente: {resolution.portName}</p>}
                <Select
                  label="Stato"
                  data={Object.entries(executionLabels).map(([value, label]) => ({ value, label }))}
                  value={draft.values.executionStatus}
                  onChange={(v) =>
                    change({
                      ...draft.values,
                      executionStatus: v as CreateFreeServiceDto['executionStatus'],
                    })
                  }
                />
                {draft.category === 'CATALOG' ? (
                  <>
                    <CatalogPicker
                      context={context}
                      value={draft.serviceTypeId}
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
            {(stale || uncertain) && (
              <Button
                variant="default"
                disabled={busy}
                onClick={() => {
                  invalidateEditor()
                  setUncertain(false)
                  setReload((n) => n + 1)
                  setDraft({ ...draft, context })
                }}
              >
                Ricarica bozza
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
                  (draft.category === 'CATALOG' && !draft.serviceTypeId)
                }
                loading={command.loading}
                onClick={() => void save()}
              >
                Registra prestazione
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </section>
  )
}
