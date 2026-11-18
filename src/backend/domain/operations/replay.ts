import type { VesselOperationDto, VoyageDto } from '../../../shared/contracts/operations'
import type { SubjectOpeningIds } from './subject-context'
import { validateOperationSequence } from './sequence'
type Visit = Omit<VoyageDto['visits'][number], 'stays'> & {
  stays: VoyageDto['visits'][number]['stays'][number][]
}
type Voyage = Omit<VoyageDto, 'visits'> & { visits: Visit[] }

/** Pure reconstruction. Only surviving opening anchors may reuse an identity. */
export function replayOperations(
  operations: readonly VesselOperationDto[],
  previous: readonly VoyageDto[],
  identities: ReadonlyMap<string, SubjectOpeningIds>,
): VoyageDto[] {
  validateOperationSequence(operations)
  const voyages: Voyage[] = []
  let voyage: Voyage | undefined
  let visit: Visit | undefined
  let stay: VoyageDto['visits'][number]['stays'][number] | undefined
  const interval = (op: VesselOperationDto, start: string, id: string) => ({
    id,
    openingOperationId: op.id,
    closingOperationId: null as string | null,
    startedAt: start,
    endedAt: null as string | null,
  })
  const close = (
    value: { closingOperationId: string | null; endedAt: string | null },
    op: VesselOperationDto,
  ) => {
    value.closingOperationId = op.id
    value.endedAt = op.endpoint.moment.utc
  }
  for (const op of [...operations].sort((a, b) =>
    a.endpoint.moment.utc.localeCompare(b.endpoint.moment.utc),
  )) {
    if (op.executionStatus === 'MISSED') continue
    if (op.operationType === 'EXIT') {
      close(stay!, op)
      close(visit!, op)
      close(voyage!, op)
      voyage = undefined
      visit = undefined
      stay = undefined
      continue
    }
    const ids = identities.get(op.id)!
    const e = op.arrival ?? op.endpoint
    if (op.operationType === 'ENTRY') {
      const old = previous.find((v) => v.openingOperationId === op.id)
      voyage = {
        ...interval(op, e.moment.utc, old?.id ?? ids.voyageId),
        vesselId: op.vesselId,
        vesselVersionId: e.vesselVersionId,
        visits: [],
      }
      voyages.push(voyage)
    } else close(stay!, op)
    if (op.operationType === 'ENTRY' || e.portId !== op.endpoint.portId) {
      if (op.operationType === 'MOVEMENT') close(visit!, op)
      const old = previous.flatMap((v) => v.visits).find((v) => v.openingOperationId === op.id)
      visit = {
        ...interval(op, e.moment.utc, old?.id ?? ids.portCallId),
        portId: e.portId,
        portVersionId: e.portVersionId,
        portName: e.portName,
        stays: [],
      }
      voyage!.visits.push(visit)
    }
    const old = previous
      .flatMap((v) => v.visits.flatMap((p) => p.stays))
      .find((b) => b.openingOperationId === op.id)
    stay = {
      ...interval(op, e.moment.utc, old?.id ?? ids.berthStayId),
      berthId: e.berthId,
      berthVersionId: e.berthVersionId,
      berthName: e.berthName,
    }
    visit!.stays.push(stay)
  }
  return voyages
}
