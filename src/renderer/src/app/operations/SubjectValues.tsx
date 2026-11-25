import type {
  EffectiveSubjectsDto,
  AssignmentLevel,
} from '../../../../shared/contracts/assignments'
import { ReferenceValue } from '../ReferenceValues'
import { assignmentLabels } from '../../../../shared/description-labels'
export { assignmentLabels } from '../../../../shared/description-labels'
export function SubjectValues({
  subjects,
  ownLevel,
}: {
  subjects: EffectiveSubjectsDto
  ownLevel?: AssignmentLevel
}) {
  return (
    <div className="effective-subjects" aria-label="Soggetti effettivi">
      {(['customer', 'agency'] as const).map((kind) => {
        const s = subjects[kind]
        return (
          <div key={kind} className="effective-subject">
            <p>
              {kind === 'customer' ? 'Cliente' : 'Agenzia'} effettiv
              {kind === 'agency' ? 'a' : 'o'}:{' '}
              {s ? (
                <>
                  <strong>{s.businessName}</strong>
                  {ownLevel && (
                    <>
                      {' '}
                      ·{' '}
                      {s.source.kind === ownLevel
                        ? kind === 'customer'
                          ? 'Esplicito'
                          : 'Esplicita'
                        : kind === 'customer'
                          ? 'Ereditato'
                          : 'Ereditata'}
                    </>
                  )}{' '}
                  · Fonte: {assignmentLabels[s.source.kind]}
                </>
              ) : (
                'Assente'
              )}
            </p>
            {s && (
              <details>
                <summary>Riferimenti {kind === 'customer' ? 'cliente' : 'agenzia'}</summary>
                <p>
                  Versione: <ReferenceValue value={s.description?.version} />
                  <br />
                  Fonte: <ReferenceValue value={s.description?.origin} />
                </p>
              </details>
            )}
          </div>
        )
      })}
    </div>
  )
}
