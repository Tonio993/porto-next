import type { EntityReferenceDto } from '../../../shared/contracts/application'
import type { ChangeEffectDto, VersionIntervalDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { versionSequence } from '../../domain/ports/version-sequence'
import { resolveMoment } from '../../domain/values/moments'
import { record } from '../archives/context-validation'

export function versionMoment(
  existing: VersionIntervalDto | undefined,
  input: unknown,
  zone: string,
) {
  if (existing?.effectiveFrom === null) {
    if (input !== null)
      throw new ArchiveError(
        'VALIDATION_ERROR',
        'La versione iniziale non può ricevere una decorrenza.',
      )
    return null
  }
  const moment = record(input, ['localDateTime', 'selectedOffset'])
  const saved = existing?.effectiveMoment
  if (
    saved &&
    moment.localDateTime === saved.localDateTime &&
    moment.selectedOffset === saved.offset
  )
    return saved
  const resolved = resolveMoment(moment.localDateTime, zone, moment.selectedOffset)
  if (resolved.status !== 'RESOLVED')
    throw new ArchiveError('LOCAL_TIME_AMBIGUOUS', 'Scegli l’occorrenza della decorrenza.', [
      {
        path: ['moment'],
        code: 'CHOICE_REQUIRED',
        message: 'Verifica la decorrenza e scegli l’occorrenza.',
      },
    ])
  return resolved.moment
}

export function insertVersion<T extends VersionIntervalDto>(
  before: readonly T[],
  version: T,
  now: string,
  sameDescription: (a: T, b: T) => boolean,
): T[] {
  const after = versionSequence([...before, version], now)
  const index = after.findIndex(({ id }) => id === version.id)
  if (index < 1 || sameDescription(after[index - 1], version))
    throw new ArchiveError('VALIDATION_ERROR', 'La nuova versione deve differire dalla precedente.')
  return after
}

export function versionEffects<T extends VersionIntervalDto & { name: string }>(
  before: readonly T[],
  after: readonly T[],
  fields: readonly { [K in keyof T]: T[K] extends string | null ? K : never }[keyof T][],
  reference: (name: string) => EntityReferenceDto,
): ChangeEffectDto[] {
  const previous = new Map(before.map((item) => [item.id, item]))
  const next = new Map(after.map((item) => [item.id, item]))
  const effects: ChangeEffectDto[] = []
  for (const id of new Set([...previous.keys(), ...next.keys()])) {
    const oldValue = previous.get(id)
    const newValue = next.get(id)
    const changes = fields.flatMap((field) => {
      const before = (oldValue?.[field] ?? null) as string | null
      const after = (newValue?.[field] ?? null) as string | null
      return before === after ? [] : [{ field: String(field), before, after }]
    })
    if (changes.length || !oldValue || !newValue)
      effects.push({
        versionId: id,
        reference: reference((newValue ?? oldValue)!.name),
        action: !oldValue ? 'CREATE' : !newValue ? 'DELETE' : 'UPDATE',
        changes,
      })
  }
  return effects
}
