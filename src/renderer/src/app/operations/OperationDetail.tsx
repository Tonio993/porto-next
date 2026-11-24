import { MomentDisplay } from '../MomentDisplay'
import { CalculationNumbers } from '../CalculationNumbers'
import { formatNumeric } from '../../api/numeric-input'
import { useNumericFormat } from '../../api/use-numeric-preference'
import { SubjectValues } from './SubjectValues'
import type { VesselOperationDto } from '../../../../shared/contracts/operations'
import { formatMoney } from '../../api/numeric-input'
export const operationLabels = { ENTRY: 'Entrata', EXIT: 'Uscita', MOVEMENT: 'Spostamento' }
export const executionLabels = { PLANNED: 'Prevista', PERFORMED: 'Effettuata', MISSED: 'Mancata' }
export function OperationDetail({ operation: o }: { operation: VesselOperationDto }) {
  const numericFormat = useNumericFormat()
  const e = o.endpoint
  return (
    <section aria-label="Dettaglio operazione" className="tariff-long-value">
      <h3>
        {operationLabels[o.operationType]} · {executionLabels[o.executionStatus]}
      </h3>
      {o.arrival && <h4>Partenza · Origine</h4>}
      <p>
        {o.charges[0].calculation.vesselName} · {e.portName} ·{' '}
        {e.berthName ?? 'Banchina non specificata'}
      </p>
      <p>
        <MomentDisplay moment={e.moment} detail />
      </p>
      {o.arrival && (
        <>
          <h4>Arrivo · Destinazione</h4>
          <p>
            {o.arrival.portName} · {o.arrival.berthName ?? 'Banchina non specificata'}
          </p>
          <p>
            <MomentDisplay moment={o.arrival.moment} detail />
          </p>
          <details>
            <summary>Riferimenti di arrivo</summary>
            <p>
              Versione nave: {o.arrival.vesselVersionId}
              <br />
              Versione porto: {o.arrival.portVersionId}
              <br />
              Versione banchina: {o.arrival.berthVersionId ?? '—'}
            </p>
          </details>
        </>
      )}
      <p>
        {o.executionStatus === 'MISSED'
          ? 'Nessun effetto sulle permanenze.'
          : o.operationType === 'ENTRY'
            ? 'Apre viaggio, visita e ormeggio.'
            : o.operationType === 'MOVEMENT'
              ? o.arrival!.portId === e.portId
                ? 'Chiude l’ormeggio di origine e apre quello di destinazione nella stessa visita e nello stesso viaggio.'
                : 'Chiude visita e ormeggio di origine, apre visita e ormeggio di destinazione nello stesso viaggio.'
              : 'Chiude viaggio, visita e ormeggio.'}{' '}
        Lo stato non cambia con il trascorrere del tempo.
      </p>
      {o.charges.map((c) => {
        const e = c.economicEndpointRole === 'ARRIVAL' ? o.arrival! : o.endpoint
        const r = c.calculation
        return (
          <section key={c.id} aria-label={'Componente ' + c.chargeKind}>
            <h4>
              Base economica · EUR · {operationLabels[c.chargeKind]}
              {c.economicEndpointRole === 'ARRIVAL'
                ? ' all’arrivo'
                : c.economicEndpointRole === 'DEPARTURE'
                  ? ' alla partenza'
                  : ''}
            </h4>
            <p>
              {e.portName} · <MomentDisplay moment={r.moment} /> · {r.moment.zoneId} ·{' '}
              {r.vesselName}
            </p>
            <p>
              Valore tariffario: {formatMoney(r.tariffValue, numericFormat)} · Peso:{' '}
              {formatNumeric(r.weight, numericFormat)}
            </p>
            <p>
              Base calcolata: {formatMoney(r.base, numericFormat)}
              <br />
              Sostituzione manuale:{' '}
              {c.manualOverrideAmount === null
                ? 'Assente'
                : formatMoney(c.manualOverrideAmount, numericFormat)}
              <br />
              <strong>Base effettiva: {formatMoney(c.effectiveBase, numericFormat)}</strong>
            </p>
            <SubjectValues subjects={c.subjects} ownLevel="VESSEL_OPERATION" />
            <CalculationNumbers value={r} />
            <details>
              <summary>Riferimenti applicati e operandi</summary>
              <p>
                Operazione: {o.id}
                <br />
                Componente: {c.id}
                <br />
                Versione nave: {r.vesselVersionId}
                <br />
                Versione porto: {e.portVersionId}
                <br />
                Versione banchina: {e.berthVersionId ?? '—'}
                <br />
                Tariffa: {r.tariffId}
                <br />
                Configurazione: {r.configurationId}
                <br />
                Scaglione: {r.bracketId}
                <br />
                Peso: {r.weightVersionId}
              </p>
              <p>
                Tipologia {r.vesselTypeId}, dimensione {formatNumeric(r.size, numericFormat)},
                limite {formatNumeric(r.upperLimit, numericFormat)}, valore{' '}
                {formatNumeric(r.ordinaryValue, numericFormat)}, extra{' '}
                {formatNumeric(r.extraCount, numericFormat)} ×{' '}
                {formatNumeric(r.extraValue, numericFormat)}, ampiezza{' '}
                {formatNumeric(r.extraWidth, numericFormat)}.
              </p>
            </details>
          </section>
        )
      })}
      {o.charges.length > 1 && (
        <p>
          <strong>Totale basi effettive: {formatMoney(o.totalBase, numericFormat)}</strong>
        </p>
      )}
      <p>Note: {o.notes ?? '—'}</p>
      <p className="operations-future">
        Gli importi sono basi operative; l’idoneità definitiva alla fatturazione sarà valutata in
        una fase successiva.
      </p>
    </section>
  )
}
