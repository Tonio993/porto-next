import type { VesselOperationDto } from '../../../../shared/contracts/operations'
import { formatMoney } from '../../api/numeric-input'
export const executionLabels = { PLANNED: 'Prevista', PERFORMED: 'Effettuata', MISSED: 'Mancata' }
export function OperationDetail({ operation: o }: { operation: VesselOperationDto }) {
  const e = o.endpoint,
    c = o.charge,
    r = c.calculation
  return (
    <section aria-label="Dettaglio operazione" className="tariff-long-value">
      <h3>
        {o.operationType === 'ENTRY' ? 'Entrata' : 'Uscita'} · {executionLabels[o.executionStatus]}
      </h3>
      <p>
        {r.vesselName} · {e.portName} · {e.berthName ?? 'Banchina non specificata'}
      </p>
      <p>
        {e.moment.localDateTime} · {e.moment.zoneId} · offset {e.moment.offset}
        <br />
        UTC {e.moment.utc}
      </p>
      <p>
        {o.executionStatus === 'MISSED'
          ? 'Nessun effetto sulle permanenze.'
          : o.operationType === 'ENTRY'
            ? 'Apre viaggio, visita e ormeggio.'
            : 'Chiude viaggio, visita e ormeggio.'}{' '}
        Lo stato non cambia con il trascorrere del tempo.
      </p>
      <h4>Base economica · EUR</h4>
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
      <p>Note: {o.notes ?? '—'}</p>
    </section>
  )
}
