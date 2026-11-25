import type { ArchiveContextDto } from '../../../shared/contracts/application'
import type { VesselOperationDto } from '../../../shared/contracts/operations'

// IPC object key order and economic component array order carry no meaning.
function fingerprint(operation: VesselOperationDto) {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical)
    if (value !== null && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, canonical(item)]),
      )
    return value
  }
  return JSON.stringify(
    canonical({
      ...operation,
      // Descriptive read projections never decide whether an uncertain write was applied.
      endpoint: { ...operation.endpoint, references: undefined },
      arrival: operation.arrival ? { ...operation.arrival, references: undefined } : null,
      charges: operation.charges
        .map((c) => ({
          ...c,
          calculation: { ...c.calculation, references: undefined },
          subjects: {
            customer: c.subjects.customer
              ? { ...c.subjects.customer, description: undefined }
              : null,
            agency: c.subjects.agency ? { ...c.subjects.agency, description: undefined } : null,
          },
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    }),
  )
}

/** A failed read never reaches this decision and cannot authorize a retry. */
export function operationCorrectionOutcome(
  before: VesselOperationDto,
  expected: VesselOperationDto,
  actual: VesselOperationDto,
  original: ArchiveContextDto,
  observed: ArchiveContextDto,
): 'APPLIED' | 'UNCHANGED' | 'CONFLICT' {
  if (original.archiveId !== observed.archiveId || original.sessionId !== observed.sessionId)
    return 'CONFLICT'
  if (fingerprint(actual) === fingerprint(expected)) return 'APPLIED'
  if (observed.revision === original.revision && fingerprint(actual) === fingerprint(before))
    return 'UNCHANGED'
  return 'CONFLICT'
}
