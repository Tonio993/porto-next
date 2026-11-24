import type { ResolvedMomentDto } from '../../../shared/contracts/values'
import {
  formatHistoricalMoment,
  formatPreciseUtcInstant,
  formatUtcInstant,
  historicalMomentDetail,
} from '../api/date-display'

export function MomentDisplay({
  moment,
  detail = false,
}: {
  moment: ResolvedMomentDto
  detail?: boolean
}) {
  return (
    <span tabIndex={0} title={historicalMomentDetail(moment)}>
      {formatHistoricalMoment(moment)}
      {detail && (
        <>
          {' '}
          · {moment.zoneId} · UTC preciso: {formatPreciseUtcInstant(moment.utc)}
        </>
      )}
    </span>
  )
}

export function UtcDisplay({ utc }: { utc: string }) {
  let label: string
  try {
    label = formatUtcInstant(utc)
  } catch {
    label = 'Istante UTC non disponibile'
  }
  return (
    <span tabIndex={0} title={`Istante originale: ${utc}`}>
      {label}
    </span>
  )
}
