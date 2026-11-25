import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import { ReadDescriptions } from '../presentation/read-descriptions'
import { subjectEffects } from './subject-resolution'
import type { ServiceActivityDto } from '../../../shared/contracts/services'
import type { VesselOperationDto } from '../../../shared/contracts/operations'
import { replayOperations } from '../../domain/operations/replay'
import { AssignmentRepository } from '../../infrastructure/database/assignment-repository'
import {
  OperationRepository,
  type OpeningIds,
} from '../../infrastructure/database/operation-repository'
import { replayPersistence } from '../../infrastructure/database/operation-replay-repository'
import { subjectPlan } from './subject-resolution'

/** Plans the complete chronology before any operation or structural row is written. */
export function operationReplay(
  database: ConstructorParameters<typeof OperationRepository>[0],
  operations: VesselOperationDto[],
  vesselId: string | readonly string[],
  identities: ReadonlyMap<string, OpeningIds>,
) {
  const vesselIds = typeof vesselId === 'string' ? [vesselId] : [...new Set(vesselId)]
  const affected = operations.filter((o) => vesselIds.includes(o.vesselId))
  const repository = new OperationRepository(database)
  const previous = vesselIds.flatMap((id) => repository.stays(id, 1, Number.MAX_SAFE_INTEGER).items)
  const voyages = vesselIds.flatMap((id) =>
    replayOperations(
      affected.filter((o) => o.vesselId === id),
      previous,
      identities,
    ),
  )
  const openings = new Map(new AssignmentRepository(database).openings())
  for (const op of affected) openings.delete(op.id)
  for (const v of voyages)
    for (const p of v.visits)
      for (const b of p.stays)
        openings.set(b.openingOperationId, {
          voyageId: v.id,
          portCallId: p.id,
          berthStayId: b.id,
        })
  return {
    subjects: subjectPlan(database, { operations, openings }),
    persistence: replayPersistence(database, vesselIds, voyages, operations),
  }
}

export const serviceValues = (s: ServiceActivityDto) => ({
  Viaggio: s.context.voyageId,
  Visita: s.context.portCallId,
  Ormeggio: s.context.berthStayId,
  port: s.portName,
  berth: s.berthName,
  vesselVersionId: s.vesselVersionId,
  portVersionId: s.portVersionId,
  berthVersionId: s.berthVersionId,
  base: s.base,
  tariffId: s.calculation?.tariffId ?? null,
  'Cliente effettivo e fonte': s.subjects.customer
    ? `${s.subjects.customer.businessName} · ${s.subjects.customer.source.kind} ${s.subjects.customer.source.id}`
    : null,
  'Agenzia effettiva e fonte': s.subjects.agency
    ? `${s.subjects.agency.businessName} · ${s.subjects.agency.source.kind} ${s.subjects.agency.source.id}`
    : null,
})

/** Scalar summaries retain original source IDs for comparison, with a separate typed description. */
export function serviceReplayEffects(
  reference: ChangeEffectDto['reference'],
  before: ServiceActivityDto,
  after: ServiceActivityDto,
  database: ConstructorParameters<typeof OperationRepository>[0],
) {
  const descriptions = new ReadDescriptions(database)
  const oldSubjects = descriptions.subjects(before.subjects),
    newSubjects = descriptions.subjects(after.subjects)
  const one = (s: typeof oldSubjects.customer) =>
    s
      ? {
          subject: true as const,
          businessName: s.businessName,
          version: s.description!.version,
          origin: s.description!.origin,
        }
      : null
  return subjectEffects(reference, serviceValues(before), serviceValues(after), database).map(
    (e) => ({
      ...e,
      changes: e.changes.map((c) => {
        const kind =
          c.field === 'Cliente effettivo e fonte'
            ? 'customer'
            : c.field === 'Agenzia effettiva e fonte'
              ? 'agency'
              : null
        return kind
          ? {
              ...c,
              beforeReference: one(oldSubjects[kind]),
              afterReference: one(newSubjects[kind]),
            }
          : c
      }),
    }),
  )
}
