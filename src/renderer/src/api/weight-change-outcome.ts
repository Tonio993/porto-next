import type { ArchiveContextDto } from '../../../shared/contracts/application'
import type { WeightVersionDto } from '../../../shared/contracts/catalog'
const same = (a: WeightVersionDto | null, b: WeightVersionDto | null) =>
  a === null || b === null
    ? a === b
    : a.id === b.id &&
      a.sequenceId === b.sequenceId &&
      a.weight === b.weight &&
      a.effectiveFrom === b.effectiveFrom &&
      a.effectiveMoment?.localDateTime === b.effectiveMoment?.localDateTime &&
      a.effectiveMoment?.zoneId === b.effectiveMoment?.zoneId &&
      a.effectiveMoment?.offset === b.effectiveMoment?.offset
/** Only after a successful read, or NOT_FOUND with a verified current archive context. */
export function weightChangeOutcome(
  before: WeightVersionDto | null,
  expected: WeightVersionDto | null,
  actual: WeightVersionDto | null,
  original: ArchiveContextDto,
  observed: ArchiveContextDto,
): 'APPLIED' | 'UNCHANGED' | 'CONFLICT' {
  if (
    original.archiveId !== observed.archiveId ||
    original.sessionId !== observed.sessionId ||
    BigInt(observed.revision) < BigInt(original.revision)
  )
    return 'CONFLICT'
  if (
    same(expected, actual) &&
    (expected !== null || BigInt(observed.revision) > BigInt(original.revision))
  )
    return 'APPLIED'
  if (same(before, actual) && original.revision === observed.revision) return 'UNCHANGED'
  return 'CONFLICT'
}
