import type {
  ServiceActivityDto,
  ServiceChangePreviewDto,
} from '../../../../shared/contracts/services'
import { SubjectValues } from '../operations/SubjectValues'
import { executionLabels } from '../operations/OperationDetail'
const labels: Record<string, string> = {
  moment: 'Momento',
  vesselId: 'Nave',
  vesselVersionId: 'Versione nave',
  vesselName: 'Nome nave',
  executionStatus: 'Stato',
  description: 'Descrizione',
  base: 'Importo base',
  notes: 'Note',
  context: 'Permanenza',
  portVersionId: 'Versione porto',
  portName: 'Porto',
  berthVersionId: 'Versione banchina',
  berthName: 'Banchina',
  specified: 'Soggetti espliciti',
  subjects: 'Soggetti effettivi',
  serviceTypeId: 'Tipo',
  calculation: 'Calcolo',
}
function Values({ value }: { value: ServiceActivityDto }) {
  return (
    <div className="tariff-long-value">
      <p>
        {value.description} · {executionLabels[value.executionStatus]} · Base EUR {value.base}
      </p>
      <p>
        {value.vesselName} · {value.portName} · {value.berthName ?? 'Banchina non specificata'}
      </p>
      <p>
        {value.moment.localDateTime} · {value.moment.zoneId} · {value.moment.offset} · UTC{' '}
        {value.moment.utc}
      </p>
      <p>
        Viaggio: {value.context.voyageId}
        <br />
        Visita: {value.context.portCallId}
        <br />
        Ormeggio: {value.context.berthStayId}
      </p>
      <SubjectValues subjects={value.subjects} ownLevel="SERVICE_ACTIVITY" />
      <p>Note: {value.notes ?? 'Nessuna'}</p>
      {value.calculation && (
        <ol>
          {value.calculation.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  )
}
export function ServicePreview({
  preview,
  obsolete,
  expired,
}: {
  preview: ServiceChangePreviewDto
  obsolete: boolean
  expired: boolean
}) {
  return (
    <section aria-label="Anteprima prestazione">
      <h3>Anteprima degli effetti</h3>
      <p className="preview-state">
        {obsolete
          ? 'Anteprima obsoleta · ricarica la bozza e genera una nuova anteprima.'
          : expired
            ? 'Anteprima scaduta · torna ai dati e genera una nuova anteprima.'
            : preview.blockers.length
              ? 'Anteprima bloccata · risolvi i vincoli prima di confermare.'
              : 'Anteprima pronta · confronta i valori prima di confermare.'}
      </p>
      <p>
        {preview.changedFields.length
          ? preview.changedFields
              .map((k) => labels[k] ?? (k === 'deleted' ? 'Eliminazione definitiva' : k))
              .join(', ')
          : 'Nessuna variazione.'}
      </p>
      <div className="service-comparison">
        <section aria-label="Valori prima">
          <h4>Prima</h4>
          <Values value={preview.before} />
        </section>
        <section aria-label="Valori dopo">
          <h4>Dopo</h4>
          {preview.after ? (
            <Values value={preview.after} />
          ) : (
            <p>La prestazione e i suoi soggetti verranno eliminati definitivamente.</p>
          )}
        </section>
      </div>
      {preview.blockers.map((b, i) => (
        <p role="alert" key={i}>
          {b.reference.label}: {b.reason}
        </p>
      ))}
    </section>
  )
}
