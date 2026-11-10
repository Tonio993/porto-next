import { Temporal } from '@js-temporal/polyfill'
import type { ResolvedMomentDto } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { timeZoneId } from '../../domain/values/moments'

export interface MomentColumns {
  local_date_time: string
  zone_id: string
  utc_offset: string
  utc: string
}

/** Validate the stored tuple without re-resolving it with today's IANA rules. */
export function momentFromColumns(row: { [K in keyof MomentColumns]: unknown }): ResolvedMomentDto {
  try {
    if (
      typeof row.local_date_time !== 'string' ||
      !/^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(row.local_date_time) ||
      typeof row.utc_offset !== 'string' ||
      !/^[+-][0-9]{2}:[0-9]{2}(?::[0-9]{2})?$/.test(row.utc_offset) ||
      typeof row.utc !== 'string' ||
      !/^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(row.utc)
    )
      throw new Error('Invalid moment format')
    Temporal.PlainDateTime.from(row.local_date_time, { overflow: 'reject' })
    // ISO offsets can include historical seconds; Temporal zone identifiers cannot.
    const utc = Temporal.Instant.from(`${row.local_date_time}:00${row.utc_offset}`).toString({
      smallestUnit: 'millisecond',
    })
    if (utc !== row.utc) throw new Error('Inconsistent local/offset/UTC tuple')
    return {
      localDateTime: row.local_date_time,
      zoneId: timeZoneId(row.zone_id),
      offset: row.utc_offset,
      utc: row.utc,
    }
  } catch {
    throw new ArchiveError('INVALID_ARCHIVE', 'Il riferimento temporale salvato non è valido.')
  }
}

export function momentToColumns(moment: ResolvedMomentDto): MomentColumns {
  const columns = {
    local_date_time: moment.localDateTime,
    zone_id: moment.zoneId,
    utc_offset: moment.offset,
    utc: moment.utc,
  }
  momentFromColumns(columns)
  return columns
}
