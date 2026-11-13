import type { OperationEndpointDto, VesselOperationDto } from '../../../shared/contracts/operations'
import { ArchiveError } from '../../../shared/errors/archive-error'

/** Validate every endpoint before replaying the complete structural chronology. */
export function validateOperationSequence(operations: readonly VesselOperationDto[]): void {
  const minutes = new Set<string>()
  for (const op of operations) {
    if (op.operationType === 'MOVEMENT') {
      if (!op.arrival || op.arrival.moment.utc <= op.endpoint.moment.utc)
        throw new ArchiveError(
          'OPERATION_TIME_INVALID',
          'L’arrivo deve essere strettamente successivo alla partenza in UTC.',
          [
            {
              path: ['arrivalMoment'],
              code: 'INVALID_ORDER',
              message: 'Indica un arrivo successivo alla partenza.',
            },
          ],
        )
    }
    for (const end of [op.endpoint, ...(op.arrival ? [op.arrival] : [])]) {
      const minute = end.moment.utc.slice(0, 16)
      if (minutes.has(minute))
        throw new ArchiveError(
          'OPERATION_MINUTE_CONFLICT',
          'La nave ha già un estremo operativo nello stesso minuto UTC.',
        )
      minutes.add(minute)
    }
  }
  let open: OperationEndpointDto | null = null
  let availableAt: string | null = null
  for (const op of [...operations].sort((a, b) =>
    a.endpoint.moment.utc.localeCompare(b.endpoint.moment.utc),
  )) {
    if (availableAt && op.endpoint.moment.utc < availableAt)
      throw new ArchiveError(
        'OPERATIONAL_CONTEXT_MISSING',
        'La nave è in trasferimento: nessuna operazione può iniziare prima dell’arrivo.',
      )
    if (op.operationType === 'ENTRY') {
      if (open)
        throw new ArchiveError(
          'OPERATION_SEQUENCE_INVALID',
          'La nave ha già un viaggio aperto al momento dell’entrata.',
        )
      if (op.executionStatus !== 'MISSED') open = op.endpoint
    } else {
      if (!open)
        throw new ArchiveError(
          'OPERATIONAL_CONTEXT_MISSING',
          'L’operazione richiede viaggio, visita e ormeggio aperti al proprio istante.',
        )
      if (open.portId !== op.endpoint.portId || open.berthId !== op.endpoint.berthId)
        throw new ArchiveError(
          'OPERATION_SEQUENCE_INVALID',
          'L’operazione non coincide con il contesto operativo di origine.',
        )
      if (op.executionStatus !== 'MISSED') {
        open = op.operationType === 'MOVEMENT' ? op.arrival : null
        availableAt = op.arrival?.moment.utc ?? null
      }
    }
  }
}
