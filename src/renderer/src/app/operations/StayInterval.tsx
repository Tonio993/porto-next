import type { StayIntervalDto } from '../../../../shared/contracts/operations'
import { formatHistoricalMoment, formatUtcInstant } from '../../api/date-display'
import { MomentDisplay, UtcDisplay } from '../MomentDisplay'

/** The port-local tuples are projected by the backend from the owning operation endpoints. */
export function stayIntervalLabel(interval: StayIntervalDto): string {
  return (
    (interval.openingMoment
      ? formatHistoricalMoment(interval.openingMoment)
      : formatUtcInstant(interval.startedAt)) +
    ' → ' +
    (interval.closingMoment
      ? formatHistoricalMoment(interval.closingMoment)
      : interval.endedAt
        ? formatUtcInstant(interval.endedAt)
        : 'Aperta')
  )
}
export function StayInterval({ interval }: { interval: StayIntervalDto }) {
  return (
    <span>
      Inizio:{' '}
      {interval.openingMoment ? (
        <MomentDisplay moment={interval.openingMoment} detail />
      ) : (
        <UtcDisplay utc={interval.startedAt} />
      )}{' '}
      · Fine:{' '}
      {interval.closingMoment ? (
        <MomentDisplay moment={interval.closingMoment} detail />
      ) : interval.endedAt ? (
        <UtcDisplay utc={interval.endedAt} />
      ) : (
        'Aperta'
      )}
    </span>
  )
}
