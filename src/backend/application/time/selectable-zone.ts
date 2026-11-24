import { availableTimeZones, compatibleTimeZone } from '../../../shared/time-zones'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { timeZoneId } from '../../domain/values/moments'

export function selectableZone(value: unknown, country?: string): string {
  const path = country === undefined ? 'zoneId' : 'initialZoneId'
  let zone: string
  try {
    zone = timeZoneId(value)
    if (!availableTimeZones().includes(zone)) throw Error('Unavailable zone')
    if (country !== undefined && !compatibleTimeZone(country, zone))
      throw Error('Incompatible zone')
  } catch {
    const message =
      country === undefined
        ? 'Scegli un fuso IANA disponibile.'
        : 'Scegli un fuso disponibile compatibile con il paese. Se non ci sono associazioni, il porto non può essere creato.'
    throw new ArchiveError('INVALID_TIME_ZONE', message, [
      { path: [path], code: 'INVALID_TIME_ZONE', message },
    ])
  }
  return zone
}
