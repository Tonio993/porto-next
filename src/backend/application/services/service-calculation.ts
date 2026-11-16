import type { ServiceActivityDto } from '../../../shared/contracts/services'
import type { DatabaseSession } from '../../infrastructure/database/database-session'
import { calculateBase } from '../tariffs/calculate-base'

/** Caller owns the transaction and the proposed context/version sequence. FREE stays manual. */
export function recalculateService(
  database: DatabaseSession,
  value: ServiceActivityDto,
  simulated: Parameters<typeof calculateBase>[2] = {},
): ServiceActivityDto {
  if (value.category === 'FREE') return value
  const calculation = calculateBase(
    database,
    {
      vesselId: value.vesselId,
      portId: value.context.portId,
      moment: value.moment,
      activity: { kind: 'CATALOG', serviceTypeId: value.serviceTypeId },
    },
    simulated,
  )
  return { ...value, calculation, base: calculation.base }
}
