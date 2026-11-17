import type {
  EffectiveSubjectsDto,
  AssignmentLevel,
} from '../../../../shared/contracts/assignments'
export const assignmentLabels: Record<AssignmentLevel, string> = {
  SERVICE_ACTIVITY: 'Prestazione',
  VOYAGE: 'Viaggio',
  PORT_CALL: 'Visita',
  BERTH_STAY: 'Ormeggio',
  VESSEL_OPERATION: 'Operazione',
}
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
                  Versione: {s.versionId} · Fonte: {s.source.id}
                </p>
              </details>
            )}
          </div>
        )
      })}
    </div>
  )
}
