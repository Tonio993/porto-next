import { useEffect, useState } from 'react'
import { Button, Group, Select, Stack, TextInput } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type { BaseCalculationDto, TariffActivity } from '../../../../shared/contracts/tariffs'
import type { PageDto } from '../../../../shared/contracts/master-data'
import type { VesselDto } from '../../../../shared/contracts/vessels'
import type { ServiceTypeDto } from '../../../../shared/contracts/catalog'
import { operationLabels } from '../../../../shared/contracts/catalog'
import type { MomentResolutionDto } from '../../../../shared/contracts/values'
import { useApplicationRequest } from '../../api/use-application-request'
import { formatMoney } from '../../api/numeric-input'
import { PageControls } from '../PageControls'
import { StateMessage } from '../StateMessage'
import { TariffMomentFields, emptyMoment } from './TariffMomentFields'

export function BaseCalculator({
  context,
  portId,
}: {
  context: ArchiveContextDto
  portId: string
}) {
  const [vesselSearch, setVesselSearch] = useState(''),
    [vesselPage, setVesselPage] = useState(1)
  const [vessels, setVessels] = useState<PageDto<VesselDto> | null>(null)
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [chosenVessel, setChosenVessel] = useState<{ value: string; label: string } | null>(null)
  const [chosenType, setChosenType] = useState<{ value: string; label: string } | null>(null)
  const [kind, setKind] = useState('ENTRY')
  const [typeSearch, setTypeSearch] = useState(''),
    [typePage, setTypePage] = useState(1)
  const [types, setTypes] = useState<PageDto<ServiceTypeDto> | null>(null)
  const [typeId, setTypeId] = useState<string | null>(null)
  const [moment, setMoment] = useState(emptyMoment)
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calculation, setCalculation] = useState<{
    trace: BaseCalculationDto
    revision: string
  } | null>(null)
  const vesselRequest = useApplicationRequest(context, setError)
  const typeRequest = useApplicationRequest(context, setError)
  const momentRequest = useApplicationRequest(context, setError)
  const calculationRequest = useApplicationRequest(context, setError)
  const { request: readVessels } = vesselRequest,
    { request: readTypes } = typeRequest
  useEffect(() => {
    void readVessels(() =>
      window.vessels.list({
        context: { sessionId: context.sessionId },
        query: { search: vesselSearch, page: vesselPage, pageSize: 25, selectableOnly: false },
      }),
    ).then((r) => {
      if (r?.ok) setVessels(r.value)
    })
  }, [readVessels, context.sessionId, context.revision, vesselSearch, vesselPage])
  useEffect(() => {
    if (kind !== 'CATALOG') return
    void readTypes(() =>
      window.catalog.list({
        context: { sessionId: context.sessionId },
        query: { search: typeSearch, page: typePage, pageSize: 25, status: 'ALL' },
      }),
    ).then((r) => {
      if (r?.ok) setTypes(r.value)
    })
  }, [readTypes, context.sessionId, context.revision, kind, typeSearch, typePage])
  const invalidate = () => {
    calculationRequest.invalidate()
    setCalculation(null)
    setError(null)
  }
  const resolve = async () => {
    setError(null)
    const r = await momentRequest.request(() =>
      window.tariffs.resolveMoment({
        context: { sessionId: context.sessionId },
        query: { portId, moment },
      }),
    )
    if (r?.ok) setResolution(r.value)
  }
  const calculate = async () => {
    if (!vesselId || (kind === 'CATALOG' && !typeId)) return
    setError(null)
    setCalculation(null)
    const activity: TariffActivity =
      kind === 'CATALOG'
        ? { kind: 'CATALOG', serviceTypeId: typeId! }
        : { kind: 'OPERATION', operation: kind as 'ENTRY' | 'EXIT' | 'MOVEMENT' }
    const r = await calculationRequest.request(() =>
      window.tariffs.simulateBase({
        context: { sessionId: context.sessionId },
        query: { portId, vesselId, moment, activity },
      }),
    )
    if (r?.ok) setCalculation({ trace: r.value, revision: r.context.revision })
  }
  const vesselOptions =
    vessels?.items.map((v) => ({
      value: v.id,
      label: `${v.code} · ${v.version.registeredName}`,
    })) ?? []
  if (chosenVessel?.value === vesselId && !vesselOptions.some((o) => o.value === vesselId))
    vesselOptions.unshift(chosenVessel)
  const typeOptions = types?.items.map((t) => ({ value: t.id, label: t.description })) ?? []
  if (chosenType?.value === typeId && !typeOptions.some((o) => o.value === typeId))
    typeOptions.unshift(chosenType)
  const trace = calculation?.trace
  return (
    <Stack>
      <StateMessage title="Simulazione del calcolo base">
        Scegli porto, nave, tipo e momento economico. La simulazione consulta i dati storici e non
        registra attività. Il fuso è determinato dal porto.
      </StateMessage>
      {error && (
        <StateMessage kind="error" title="Calcolo non disponibile">
          {error}
        </StateMessage>
      )}
      <TextInput
        label="Cerca nave"
        value={vesselSearch}
        onChange={(e) => {
          vesselRequest.invalidate()
          setVesselSearch(e.currentTarget.value)
          setVesselPage(1)
          setVessels(null)
        }}
      />
      <Select
        label="Nave"
        value={vesselId}
        placeholder={vesselRequest.loading ? 'Caricamento…' : 'Seleziona una nave'}
        data={vesselOptions}
        onChange={(id) => {
          invalidate()
          setChosenVessel(vesselOptions.find((o) => o.value === id) ?? null)
          setVesselId(id)
        }}
        allowDeselect={false}
      />
      {vessels && (
        <PageControls
          page={vessels}
          disabled={vesselRequest.loading}
          onPage={(p) => {
            vesselRequest.invalidate()
            setVesselPage(p)
          }}
        />
      )}
      <Select
        label="Tipo di attività"
        value={kind}
        data={[
          ...Object.entries(operationLabels).map(([value, label]) => ({ value, label })),
          { value: 'CATALOG', label: 'Prestazione da catalogo' },
        ]}
        allowDeselect={false}
        onChange={(v) => {
          invalidate()
          typeRequest.invalidate()
          setKind(v ?? 'ENTRY')
        }}
      />
      {kind === 'CATALOG' && (
        <>
          <TextInput
            label="Cerca tipo di prestazione"
            value={typeSearch}
            onChange={(e) => {
              typeRequest.invalidate()
              setTypeSearch(e.currentTarget.value)
              setTypePage(1)
              setTypes(null)
            }}
          />
          <Select
            label="Tipo di prestazione"
            value={typeId}
            data={typeOptions}
            onChange={(id) => {
              invalidate()
              setChosenType(typeOptions.find((o) => o.value === id) ?? null)
              setTypeId(id)
            }}
            allowDeselect={false}
          />
          {types && (
            <PageControls
              page={types}
              disabled={typeRequest.loading}
              onPage={(p) => {
                typeRequest.invalidate()
                setTypePage(p)
              }}
            />
          )}
        </>
      )}
      <TariffMomentFields
        economic
        moment={moment}
        resolution={resolution}
        disabled={false}
        onResolve={() => void resolve()}
        onChange={(m) => {
          invalidate()
          momentRequest.invalidate()
          setMoment(m)
          setResolution(null)
        }}
      />
      <Group>
        <Button
          disabled={
            calculationRequest.loading ||
            !vesselId ||
            !moment.localDateTime ||
            (kind === 'CATALOG' && !typeId)
          }
          onClick={() => void calculate()}
        >
          {calculationRequest.loading ? 'Calcolo…' : 'Simula base'}
        </Button>
      </Group>
      {trace && (
        <section aria-label="Traccia del calcolo" className="tariff-trace">
          {calculation.revision !== context.revision && (
            <StateMessage title="Calcolo obsoleto" kind="warning">
              I dati sono cambiati. Esegui una nuova simulazione.
            </StateMessage>
          )}
          <h3>
            Base simulata: <span data-testid="calculated-base">{formatMoney(trace.base)}</span>
          </h3>
          <p>
            Nave {trace.vesselName} · {trace.vesselTypeId} · dimensione storica {trace.size}
          </p>
          <p>
            {trace.moment.localDateTime.replace('T', ' ')} · {trace.moment.zoneId} ·{' '}
            {trace.moment.offset} · UTC {trace.moment.utc}
          </p>
          <ol>
            {trace.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <details>
            <summary>Riferimenti applicati</summary>
            <dl>
              {Object.entries({
                Tariffa: trace.tariffId,
                Configurazione: trace.configurationId,
                Scaglione: trace.bracketId,
                'Versione nave': trace.vesselVersionId,
                'Sequenza peso': trace.weightSequenceId,
                'Versione peso': trace.weightVersionId,
              }).map(([label, id]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{id}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>
      )}
    </Stack>
  )
}
