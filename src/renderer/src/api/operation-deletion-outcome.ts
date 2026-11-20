import type { ArchiveContextDto } from '../../../shared/contracts/application'
import type { VesselOperationDto } from '../../../shared/contracts/operations'
import { operationCorrectionOutcome } from './operation-correction-outcome'

/** Called only after a successful read or a NOT_FOUND with verified current context. */
export function operationDeletionOutcome(
  before: VesselOperationDto,
  actual: VesselOperationDto | null,
  original: ArchiveContextDto,
  observed: ArchiveContextDto,
): 'APPLIED' | 'UNCHANGED' | 'CONFLICT' {
  if (original.archiveId !== observed.archiveId || original.sessionId !== observed.sessionId)
    return 'CONFLICT'
  if (!actual) return BigInt(observed.revision) > BigInt(original.revision) ? 'APPLIED' : 'CONFLICT'
  if (
    observed.revision === original.revision &&
    operationCorrectionOutcome(before, before, actual, original, observed) === 'APPLIED'
  )
    return 'UNCHANGED'
  return 'CONFLICT'
}
