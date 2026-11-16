import type { AssignmentTarget } from '../../../shared/contracts/assignments'
import type { VesselOperationDto } from '../../../shared/contracts/operations'

export interface SubjectOpeningIds {
  voyageId: string
  portCallId: string
  berthStayId: string
}
export interface SubjectSpan {
  targets: AssignmentTarget[]
  portId: string
  berthId: string | null
  start: string
  end: string | null
}
/** Ricostruzione in memoria per simulare anche le attribuzioni delle operazioni MISSED esistenti. */
export function subjectTimeline(
  operations: readonly VesselOperationDto[],
  openings: ReadonlyMap<string, SubjectOpeningIds>,
): SubjectSpan[] {
  const spans: SubjectSpan[] = []
  let current: SubjectSpan | null = null
  for (const op of [...operations].sort((a, b) =>
    a.endpoint.moment.utc.localeCompare(b.endpoint.moment.utc),
  )) {
    if (op.executionStatus === 'MISSED') continue
    const ids = openings.get(op.id)
    if (op.operationType === 'EXIT') {
      if (current) current.end = op.endpoint.moment.utc
      current = null
      continue
    }
    if (!ids) throw new Error('Identità delle permanenze mancanti.')
    if (current) current.end = op.endpoint.moment.utc
    const e = op.arrival ?? op.endpoint
    current = {
      targets: [
        { kind: 'BERTH_STAY', id: ids.berthStayId },
        { kind: 'PORT_CALL', id: ids.portCallId },
        { kind: 'VOYAGE', id: ids.voyageId },
      ],
      portId: e.portId,
      berthId: e.berthId,
      start: e.moment.utc,
      end: null,
    }
    spans.push(current)
  }
  return spans
}

export function economicSubjectTargets(
  op: VesselOperationDto,
  role: 'OCCURRENCE' | 'DEPARTURE' | 'ARRIVAL',
  spans: readonly SubjectSpan[],
): AssignmentTarget[] {
  const direct: AssignmentTarget = { kind: 'VESSEL_OPERATION', id: op.id }
  if (op.executionStatus === 'MISSED' && op.operationType === 'ENTRY') return [direct]
  const at = (utc: string) => spans.find((s) => s.start <= utc && (!s.end || utc <= s.end))
  const origin = at(op.endpoint.moment.utc)
  const e = role === 'ARRIVAL' ? op.arrival! : op.endpoint
  const candidate = at(e.moment.utc)
  if (op.executionStatus !== 'MISSED') return [direct, ...(candidate?.targets ?? [])]
  const voyage = origin?.targets.find((t) => t.kind === 'VOYAGE')
  // Un arrivo mancato non crea una visita: eredita solo da elementi realmente presenti
  // nel proprio porto economico e nello stesso viaggio dell'origine richiesta.
  const matching =
    candidate?.portId === e.portId &&
    candidate.targets.some((t) => t.kind === 'VOYAGE' && t.id === voyage?.id)
  return [direct, ...(matching ? candidate!.targets : voyage ? [voyage] : [])]
}
