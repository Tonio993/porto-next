import type { PortDescriptionDto, PortVersionDto } from '../../../shared/contracts/ports'
import { ArchiveError } from '../../../shared/errors/archive-error'

export function versionSequence(
  versions: readonly PortVersionDto[],
  now: string,
): PortVersionDto[] {
  const ordered = versions
    .map((version) => ({ ...version }))
    .sort((a, b) =>
      a.effectiveFrom === null
        ? -1
        : b.effectiveFrom === null
          ? 1
          : a.effectiveFrom.localeCompare(b.effectiveFrom),
    )
  if (ordered.length === 0 || ordered[0].effectiveFrom !== null)
    throw new ArchiveError('VALIDATION_ERROR', 'La versione iniziale deve essere conservata.')
  for (let index = 1; index < ordered.length; ++index)
    if (ordered[index].effectiveFrom === ordered[index - 1].effectiveFrom)
      throw new ArchiveError('VALIDATION_ERROR', 'Esiste già una versione con questa decorrenza.', [
        {
          path: ['moment'],
          code: 'DUPLICATE_EFFECTIVE_FROM',
          message: 'Scegli un’altra decorrenza.',
        },
      ])
  return ordered.map((version, index) => {
    const effectiveTo = ordered[index + 1]?.effectiveFrom ?? null
    const phase =
      version.effectiveFrom !== null && version.effectiveFrom > now
        ? 'FUTURE'
        : effectiveTo !== null && effectiveTo <= now
          ? 'HISTORICAL'
          : 'CURRENT'
    return { ...version, effectiveTo, phase }
  })
}

export const sameDescription = (a: PortDescriptionDto, b: PortDescriptionDto) =>
  a.name === b.name && a.locality === b.locality && a.countryCode === b.countryCode
