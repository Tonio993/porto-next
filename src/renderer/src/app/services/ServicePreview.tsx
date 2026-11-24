import { MomentDisplay } from '../MomentDisplay'
import { CalculationNumbers } from '../CalculationNumbers'
import { formatNumeric } from '../../api/numeric-input'
import { useNumericFormat } from '../../api/use-numeric-preference'
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
  const numericFormat = useNumericFormat()
  return (
    <div className="tariff-long-value">
      <p>
        {value.description} · {executionLabels[value.executionStatus]} · Base EUR{' '}
        {formatNumeric(value.base, numericFormat)}
      </p>
      <p>
        {value.vesselName} · {value.portName} · {value.berthName ?? 'Banchina non specificata'}
      </p>
      <p>
        <MomentDisplay moment={value.moment} detail />
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
      {value.calculation && <CalculationNumbers value={value.calculation} />}
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
