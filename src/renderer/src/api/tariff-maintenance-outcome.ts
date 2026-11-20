import type { ArchiveContextDto } from '../../../shared/contracts/application'
import type { TariffDto } from '../../../shared/contracts/tariffs'
const content = (t: TariffDto) =>
  JSON.stringify(
    {
      id: t.id,
      portId: t.portId,
      effectiveMoment: t.effectiveMoment,
      configurations: [...t.configurations].sort((a, b) =>
        a.vesselTypeId.localeCompare(b.vesselTypeId),
      ),
    },
    (_key, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
        : v,
  )
export function tariffMaintenanceOutcome(
  before: TariffDto,
  expected: TariffDto | null,
  actual: TariffDto | null,
  original: ArchiveContextDto,
  observed: ArchiveContextDto,
): 'APPLIED' | 'UNCHANGED' | 'CONFLICT' {
  if (
    original.archiveId !== observed.archiveId ||
    original.sessionId !== observed.sessionId ||
    BigInt(observed.revision) < BigInt(original.revision)
  )
    return 'CONFLICT'
  if (expected && actual && content(expected) === content(actual)) return 'APPLIED'
  if (!expected && !actual && BigInt(observed.revision) > BigInt(original.revision))
    return 'APPLIED'
  if (actual && content(before) === content(actual) && original.revision === observed.revision)
    return 'UNCHANGED'
  return 'CONFLICT'
}
