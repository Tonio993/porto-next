import { MomentDisplay } from '../MomentDisplay'
import { VesselPicker } from '../operations/VesselPicker'
import { CatalogPicker } from '../services/CatalogPicker'
import { CalculationNumbers } from '../CalculationNumbers'
import { formatNumeric } from '../../api/numeric-input'
import { useNumericFormat } from '../../api/use-numeric-preference'
import { useState } from 'react'
import { Button, Group, Select, Stack } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type { BaseCalculationDto, TariffActivity } from '../../../../shared/contracts/tariffs'
import { operationLabels } from '../../../../shared/contracts/catalog'
import type { MomentResolutionDto } from '../../../../shared/contracts/values'
import { useApplicationRequest } from '../../api/use-application-request'
import { formatMoney } from '../../api/numeric-input'
import { StateMessage } from '../StateMessage'
import { TariffMomentFields, emptyMoment } from './TariffMomentFields'

export function BaseCalculator({
  context,
  portId,
}: {
  context: ArchiveContextDto
  portId: string
}) {
  const numericFormat = useNumericFormat()
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [kind, setKind] = useState('ENTRY')
  const [typeId, setTypeId] = useState<string | null>(null)
  const [moment, setMoment] = useState(emptyMoment)
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calculation, setCalculation] = useState<{
    trace: BaseCalculationDto
    revision: string
  } | null>(null)
  const momentRequest = useApplicationRequest(context, setError)
  const calculationRequest = useApplicationRequest(context, setError)
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
      <VesselPicker
        context={context}
        value={vesselId}
        historical
        onChange={(id) => {
          invalidate()
          setVesselId(id)
        }}
      />
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
          setKind(v ?? 'ENTRY')
        }}
      />
      {kind === 'CATALOG' && (
        <CatalogPicker
          context={context}
          value={typeId}
          historical
          required
          disabled={false}
          onChange={(id) => {
            invalidate()
            setTypeId(id)
          }}
        />
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
            Base simulata:{' '}
            <span data-testid="calculated-base">{formatMoney(trace.base, numericFormat)}</span>
          </h3>
          <p>
            Nave {trace.vesselName} · {trace.vesselTypeId} · dimensione storica{' '}
            {formatNumeric(trace.size, numericFormat)}
          </p>
          <p>
            <MomentDisplay moment={trace.moment} detail />
          </p>
          <CalculationNumbers value={trace} />
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
