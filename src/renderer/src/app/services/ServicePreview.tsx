import { ReferenceValue } from '../ReferenceValues'
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
import { serviceFieldLabel } from '../../../../shared/description-labels'
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
        Viaggio: <ReferenceValue value={value.context.references?.voyage} />
        <br />
        Visita: <ReferenceValue value={value.context.references?.visit} />
        <br />
        Ormeggio: <ReferenceValue value={value.context.references?.stay} />
      </p>
      <details>
        <summary>Versioni applicate</summary>
        <p>
          Nave: <ReferenceValue value={value.references?.vessel} />
          <br />
          Porto: <ReferenceValue value={value.references?.port} />
          <br />
          Banchina:{' '}
          {value.berthVersionId ? (
            <ReferenceValue value={value.references?.berth} />
          ) : (
            'Banchina non specificata'
          )}
        </p>
      </details>
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
          ? preview.changedFields.map(serviceFieldLabel).join(', ')
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
