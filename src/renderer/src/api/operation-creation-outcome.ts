import type { ApplicationResult, ArchiveContextDto } from '../../../shared/contracts/application'
import type { VesselOperationDto } from '../../../shared/contracts/operations'

/** Preview-generated identity is unique; absence after intervening writes is inconclusive. */
export function operationCreationOutcome(
  pending: { id: string; context: ArchiveContextDto },
  observed: ApplicationResult<VesselOperationDto> | null,
): 'APPLIED' | 'UNCHANGED' | 'UNKNOWN' {
  if (
    !observed?.context ||
    observed.context.sessionId !== pending.context.sessionId ||
    observed.context.archiveId !== pending.context.archiveId
  )
    return 'UNKNOWN'
  if (
    observed.ok &&
    observed.value.id === pending.id &&
    BigInt(observed.context.revision) > BigInt(pending.context.revision)
  )
    return 'APPLIED'
  if (
    !observed.ok &&
    observed.error.code === 'NOT_FOUND' &&
    observed.context.revision === pending.context.revision
  )
    return 'UNCHANGED'
  return 'UNKNOWN'
}
