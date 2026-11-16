import type { OperationalContextDto } from '../../../shared/contracts/operations'
import type { SubjectSpan } from '../operations/subject-context'
import { ArchiveError } from '../../../shared/errors/archive-error'

/** Estremi inclusi: partenza all'origine, arrivo alla destinazione. */
export function serviceContext(
  spans: readonly SubjectSpan[],
  utc: string,
): Extract<OperationalContextDto, { status: 'IN_PORT' }> {
  const span = spans.find((s) => s.start <= utc && (!s.end || utc <= s.end))
  if (!span)
    throw new ArchiveError(
      'OPERATIONAL_CONTEXT_MISSING',
      'La prestazione richiede viaggio, visita e ormeggio: il momento è fuori permanenza o durante un trasferimento.',
    )
  return {
    status: 'IN_PORT',
    voyageId: span.targets.find((t) => t.kind === 'VOYAGE')!.id,
    portCallId: span.targets.find((t) => t.kind === 'PORT_CALL')!.id,
    berthStayId: span.targets.find((t) => t.kind === 'BERTH_STAY')!.id,
    portId: span.portId,
    berthId: span.berthId,
  }
}
