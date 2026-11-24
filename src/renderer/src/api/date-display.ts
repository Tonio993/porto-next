import type { ResolvedMomentDto } from '../../../shared/contracts/values'

function civilParts(value: string): string {
  const match = /^(?!0000)([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value)
  if (!match) throw Error('Data civile non valida')
  const [, year, month, day] = match
  const y = Number(year),
    m = Number(month),
    d = Number(day)
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) throw Error('Data civile non valida')
  return day + '/' + month + '/' + year
}

// These functions accept known contract fields, never infer dates from opaque text or JSON.
export function formatLocalMinute(local: string): string {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(local))
    throw Error('Minuto locale non valido')
  return civilParts(local.slice(0, 10)) + ' ' + local.slice(11)
}
export function formatHistoricalMoment(moment: ResolvedMomentDto): string {
  return `${formatLocalMinute(moment.localDateTime)} (${moment.offset})`
}
export function historicalMomentDetail(moment: ResolvedMomentDto): string {
  return `${formatHistoricalMoment(moment)} · ${moment.zoneId} · UTC originale ${moment.utc}`
}

/** Metadata accepts explicit ISO instants too. Never parse a civil date or host-local value. */
function technicalUtc(value: string): string {
  const match =
    /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(
      value,
    )
  if (!match) throw Error('Istante con offset esplicito non valido')
  civilParts(match[1])
  const utc = new Date(value).toISOString()
  if (!/^(?!0000)[0-9]{4}-/.test(utc)) throw Error('Istante UTC fuori intervallo')
  return utc
}
/** Technical instants use UTC only. Historical tuples never enter this path. */
export function formatUtcInstant(utc: string): string {
  return `${formatLocalMinute(technicalUtc(utc).slice(0, 16))} (+00:00) · UTC`
}
/** Explicit precision detail, retaining all persisted seconds and milliseconds. */
export function formatPreciseUtcInstant(utc: string): string {
  const value = technicalUtc(utc)
  return formatLocalMinute(value.slice(0, 16)) + value.slice(16, 23) + ' (+00:00) · UTC'
}
/** Civil date stays a date, with no implicit midnight. */
export function formatCivilDate(date: string): string {
  return civilParts(date)
}
