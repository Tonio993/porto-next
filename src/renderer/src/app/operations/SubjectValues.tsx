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
export function SubjectValues({ subjects }: { subjects: EffectiveSubjectsDto }) {
  return (
    <div aria-label="Soggetti effettivi">
      {(['customer', 'agency'] as const).map((kind) => {
        const s = subjects[kind]
        return (
          <p key={kind}>
            {kind === 'customer' ? 'Cliente' : 'Agenzia'} effettiv
            {kind === 'agency' ? 'a' : 'o'}:{' '}
            {s ? (
              <>
                <strong>{s.businessName}</strong> · Fonte: {assignmentLabels[s.source.kind]}
                <br />
                <small>
                  Versione: {s.versionId} · Fonte: {s.source.id}
                </small>
              </>
            ) : (
              'Assente'
            )}
          </p>
        )
      })}
    </div>
  )
}
