import { Temporal } from '@js-temporal/polyfill'
import type { MomentResolutionDto, ResolvedMomentDto } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'

function invalid(path: string, message: string): never {
  throw new ArchiveError('VALIDATION_ERROR', message, [
    { path: [path], code: 'INVALID_LOCAL_MINUTE', message },
  ])
}

export function timeZoneId(value: unknown): string {
  if (typeof value === 'string' && value.length <= 200 && !/^[+-]/.test(value)) {
    try {
      return Temporal.Instant.from('2000-01-01T00:00:00Z').toZonedDateTimeISO(value).timeZoneId
    } catch {
      // A named IANA zone is required; a numeric offset cannot replace it.
    }
  }
  throw new ArchiveError('INVALID_TIME_ZONE', 'Scegli un fuso IANA valido.', [
    { path: ['zoneId'], code: 'INVALID_TIME_ZONE', message: 'Fuso IANA non valido.' },
  ])
}

export interface InitialTimeZone {
  readonly zoneId: string
  readonly effectiveFrom: null
}

/** P03 persists this value with the new port, independently of the company configuration. */
export function initialPortTimeZone(
  companyZone: unknown,
  selectedZone: unknown = null,
): InitialTimeZone {
  return Object.freeze({ zoneId: timeZoneId(selectedZone ?? companyZone), effectiveFrom: null })
}

export function resolveMoment(
  localDateTime: unknown,
  zone: unknown,
  selectedOffset: unknown,
): MomentResolutionDto {
  if (
    typeof localDateTime !== 'string' ||
    !/^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(localDateTime)
  )
    invalid('localDateTime', 'Inserisci data e ora al minuto, con anno tra 0001 e 9999.')
  let local: Temporal.PlainDateTime
  try {
    local = Temporal.PlainDateTime.from(localDateTime, { overflow: 'reject' })
  } catch {
    invalid('localDateTime', 'La data o l’ora non è valida.')
  }
  const zoneId = timeZoneId(zone)
  if (selectedOffset !== null && typeof selectedOffset !== 'string')
    throw new ArchiveError('INVALID_OFFSET', 'L’offset selezionato non è valido.')
  const candidates = new Map<string, ResolvedMomentDto>()
  for (const disambiguation of ['earlier', 'later'] as const) {
    const zoned = local.toZonedDateTime(zoneId, { disambiguation })
    // Temporal shifts a gap to a nearby valid time. Never accept that adjustment.
    if (!zoned.toPlainDateTime().equals(local)) continue
    const utc = zoned.toInstant().toString({ smallestUnit: 'millisecond' })
    if (!/^(?!0000)[0-9]{4}-/.test(utc))
      invalid('localDateTime', 'L’istante UTC deve avere anno tra 0001 e 9999.')
    candidates.set(utc, { localDateTime, zoneId, offset: zoned.offset, utc })
  }
  const choices = [...candidates.values()].sort((a, b) => Temporal.Instant.compare(a.utc, b.utc))
  if (choices.length === 0)
    throw new ArchiveError('LOCAL_TIME_NOT_EXISTENT', 'L’ora locale non esiste in questo fuso.', [
      { path: ['localDateTime'], code: 'LOCAL_TIME_NOT_EXISTENT', message: 'Scegli un’altra ora.' },
    ])
  if (selectedOffset !== null) {
    const moment = choices.find((choice) => choice.offset === selectedOffset)
    if (!moment)
      throw new ArchiveError('INVALID_OFFSET', 'L’offset non corrisponde a un’occorrenza valida.')
    return { status: 'RESOLVED', moment }
  }
  if (choices.length === 1) return { status: 'RESOLVED', moment: choices[0] }
  return {
    status: 'CHOICE_REQUIRED',
    choices: choices as [ResolvedMomentDto, ResolvedMomentDto, ...ResolvedMomentDto[]],
  }
}
