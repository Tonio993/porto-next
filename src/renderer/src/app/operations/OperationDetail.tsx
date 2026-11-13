import { SubjectValues } from './SubjectValues'
import type { VesselOperationDto } from '../../../../shared/contracts/operations'
import { formatMoney } from '../../api/numeric-input'
export const operationLabels = { ENTRY: 'Entrata', EXIT: 'Uscita', MOVEMENT: 'Spostamento' }
export const executionLabels = { PLANNED: 'Prevista', PERFORMED: 'Effettuata', MISSED: 'Mancata' }
export function OperationDetail({ operation: o }: { operation: VesselOperationDto }) {
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
        {e.moment.localDateTime} · {e.moment.zoneId} · offset {e.moment.offset}
        <br />
        UTC {e.moment.utc}
      </p>
      {o.arrival && (
        <>
          <h4>Arrivo · Destinazione</h4>
          <p>
            {o.arrival.portName} · {o.arrival.berthName ?? 'Banchina non specificata'}
          </p>
          <p>
            {o.arrival.moment.localDateTime} · {o.arrival.moment.zoneId} · offset{' '}
            {o.arrival.moment.offset}
            <br />
            UTC {o.arrival.moment.utc}
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
              Base economica · EUR · {c.chargeKind}
              {c.economicEndpointRole === 'ARRIVAL'
                ? ' all’arrivo'
                : c.economicEndpointRole === 'DEPARTURE'
                  ? ' alla partenza'
                  : ''}
            </h4>
            <p>
              {e.portName} · {r.moment.localDateTime} · {r.moment.zoneId} · {r.vesselName}
            </p>
            <p>
              Valore tariffario: {formatMoney(r.tariffValue)} · Peso: {r.weight}
            </p>
            <p>
              Base calcolata: {formatMoney(r.base)}
              <br />
              Sostituzione manuale:{' '}
              {c.manualOverrideAmount === null ? 'Assente' : formatMoney(c.manualOverrideAmount)}
              <br />
              <strong>Base effettiva: {formatMoney(c.effectiveBase)}</strong>
            </p>
            <SubjectValues subjects={c.subjects} />
            <ol>
              {r.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
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
                Tipologia {r.vesselTypeId}, dimensione {r.size}, limite {r.upperLimit}, valore{' '}
                {r.ordinaryValue}, extra {r.extraCount} × {r.extraValue}, ampiezza {r.extraWidth}.
              </p>
            </details>
          </section>
        )
      })}
      {o.charges.length > 1 && (
        <p>
          <strong>Totale basi effettive: {formatMoney(o.totalBase)}</strong>
        </p>
      )}
      <p>Note: {o.notes ?? '—'}</p>
    </section>
  )
}
