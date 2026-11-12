import type { VesselOperationDto } from '../../../shared/contracts/operations'
import { ArchiveError } from '../../../shared/errors/archive-error'

/** Validate the complete chronology, including informational MISSED events. */
export function validateOperationSequence(operations: readonly VesselOperationDto[]): void {
  let open: VesselOperationDto | null = null
  const minutes = new Set<string>()
  for (const operation of [...operations].sort((a, b) =>
    a.endpoint.moment.utc.localeCompare(b.endpoint.moment.utc),
  )) {
    const minute = operation.endpoint.moment.utc.slice(0, 16)
    if (minutes.has(minute))
      throw new ArchiveError(
        'OPERATION_MINUTE_CONFLICT',
        'La nave ha già un estremo operativo nello stesso minuto UTC.',
      )
    minutes.add(minute)
    if (operation.operationType === 'ENTRY') {
      if (open)
        throw new ArchiveError(
          'OPERATION_SEQUENCE_INVALID',
          'La nave ha già un viaggio aperto al momento dell’entrata.',
        )
      if (operation.executionStatus !== 'MISSED') open = operation
    } else {
      if (!open)
        throw new ArchiveError(
          'OPERATIONAL_CONTEXT_MISSING',
          'L’uscita richiede viaggio, visita e ormeggio aperti al proprio istante.',
        )
      if (
        open.endpoint.portId !== operation.endpoint.portId ||
        open.endpoint.berthId !== operation.endpoint.berthId
      )
        throw new ArchiveError(
          'OPERATION_SEQUENCE_INVALID',
          'L’uscita non coincide con il contesto operativo di origine.',
        )
      if (operation.executionStatus !== 'MISSED') open = null
    }
  }
}
