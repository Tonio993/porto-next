import { operationLabels } from '../../../shared/description-labels'
import { describeEffects } from '../presentation/effect-descriptions'
import { ServiceRepository } from '../../infrastructure/database/service-repository'
import { serviceContext } from '../../domain/services/context'
import type { ServiceActivityDto } from '../../../shared/contracts/services'
import { isDeepStrictEqual } from 'node:util'
import type {
  AssignmentChangeDto,
  AssignmentDto,
  AssignmentTarget,
  EffectiveSubjectsDto,
} from '../../../shared/contracts/assignments'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import type { VesselOperationDto } from '../../../shared/contracts/operations'
import type { CustomerVersionDto } from '../../../shared/contracts/customers'
import type { AgencyVersionDto } from '../../../shared/contracts/agencies'
import { resolveSubjects } from '../../domain/operations/subjects'
import {
  economicSubjectTargets,
  subjectTimeline,
  type SubjectOpeningIds,
} from '../../domain/operations/subject-context'
import { AssignmentRepository } from '../../infrastructure/database/assignment-repository'
import type { DatabaseSession } from '../../infrastructure/database/database-session'
import { OperationRepository } from '../../infrastructure/database/operation-repository'
import { recalculateService } from '../services/service-calculation'

export interface SubjectVersionChange {
  kind: 'customer' | 'agency'
  id: string
  versions: readonly (CustomerVersionDto | AgencyVersionDto)[]
}
const same = (a: unknown, b: unknown) => isDeepStrictEqual(a, b)
export function subjectEffects(
  reference: ChangeEffectDto['reference'],
  before: object,
  after: object,
  database?: DatabaseSession,
): ChangeEffectDto[] {
  const changes = Object.entries(after)
    .filter(([key, value]) => !same((before as Record<string, unknown>)[key], value))
    .map(([field, value]) => ({
      field,
      structured:
        (value !== null && typeof value === 'object') ||
        ((before as Record<string, unknown>)[field] !== null &&
          typeof (before as Record<string, unknown>)[field] === 'object'),
      before: JSON.stringify((before as Record<string, unknown>)[field]) ?? null,
      after: JSON.stringify(value) ?? null,
    }))
  if (!changes.length) return []
  if (!database) return [{ reference, versionId: null, action: 'UPDATE', changes }]
  const scalars = describeEffects(
    database,
    [
      {
        reference,
        versionId: null,
        action: 'UPDATE',
        changes: changes.map((c) => ({
          ...c,
          before:
            typeof (before as Record<string, unknown>)[c.field] === 'string'
              ? (before as Record<string, string>)[c.field]
              : null,
          after:
            typeof (after as Record<string, unknown>)[c.field] === 'string'
              ? (after as Record<string, string>)[c.field]
              : null,
        })),
      },
    ],
    undefined,
    undefined,
    false,
  )[0]
  return [
    {
      reference,
      versionId: null,
      action: 'UPDATE',
      changes: changes.map((c, i) => ({
        ...c,
        ...(typeof (before as Record<string, unknown>)[c.field] === 'string'
          ? { beforeReference: scalars.changes[i].beforeReference }
          : {}),
        ...(typeof (after as Record<string, unknown>)[c.field] === 'string'
          ? { afterReference: scalars.changes[i].afterReference }
          : {}),
      })),
    },
  ]
}
/** Simulazione senza scritture, condivisa da assegnazioni, nuove operazioni e anagrafiche. */
export function subjectPlan(
  database: DatabaseSession,
  options: {
    assignment?: AssignmentChangeDto
    pending?: VesselOperationDto & { openingIds: SubjectOpeningIds }
    versionChange?: SubjectVersionChange
    operations?: VesselOperationDto[]
    openings?: ReadonlyMap<string, SubjectOpeningIds>
  } = {},
) {
  const repository = new AssignmentRepository(database)
  const operations = options.operations ?? new OperationRepository(database).all()
  if (options.pending) operations.push(options.pending)
  const openings = new Map(options.openings ?? repository.openings())
  if (options.pending) openings.set(options.pending.id, options.pending.openingIds)
  const timelines = new Map(
    [...new Set(operations.map((o) => o.vesselId))].map((vesselId) => [
      vesselId,
      subjectTimeline(
        operations.filter((a) => a.vesselId === vesselId),
        openings,
      ),
    ]),
  )
  const specified = (target: AssignmentTarget) =>
    options.assignment && same(target, options.assignment.target)
      ? options.assignment.specified
      : repository.specified(target, true)
  const resolve = (
    targets: AssignmentTarget[],
    utc: string,
    direct?: ServiceActivityDto,
  ): EffectiveSubjectsDto => {
    const result = resolveSubjects(
      targets.map((target) => ({
        target,
        specified:
          direct && target.kind === 'SERVICE_ACTIVITY' ? direct.specified : specified(target),
      })),
    )
    const one = (kind: 'customer' | 'agency') => {
      const subject = result[kind]
      if (!subject) return null
      const change = options.versionChange
      const version =
        change?.kind === kind && change.id === subject.id
          ? change.versions.find(
              (v) =>
                (!v.effectiveFrom || v.effectiveFrom <= utc) &&
                (!v.effectiveTo || utc < v.effectiveTo),
            )!
          : repository.subjectVersion(kind, subject.id, utc)
      return { ...subject, versionId: version.id, businessName: version.businessName }
    }
    return { customer: one('customer'), agency: one('agency') }
  }
  const updates = operations.flatMap((op) =>
    op.charges.flatMap((c) => {
      const before = c.subjects
      const after = resolve(
        economicSubjectTargets(op, c.economicEndpointRole, timelines.get(op.vesselId)!),
        c.calculation.moment.utc,
      )
      const effects = subjectEffects(
        {
          kind: 'OPERATION_CHARGE',
          id: c.id,
          label: 'Soggetti ' + operationLabels[c.chargeKind] + ' · ' + c.calculation.moment.utc,
        },
        before,
        after,
        database,
      )
      return effects.length ? [{ chargeId: c.id, operationId: op.id, before, after, effects }] : []
    }),
  )
  const serviceRepository = new ServiceRepository(database)
  const serviceTargets = (value: ServiceActivityDto): AssignmentTarget[] => [
    { kind: 'SERVICE_ACTIVITY', id: value.id },
    { kind: 'BERTH_STAY', id: value.context.berthStayId },
    { kind: 'PORT_CALL', id: value.context.portCallId },
    { kind: 'VOYAGE', id: value.context.voyageId },
  ]
  const subjectsForService = (value: ServiceActivityDto) =>
    resolve(serviceTargets(value), value.moment.utc, value)
  const serviceUpdates = serviceRepository.all().flatMap((before) => {
    const context = serviceContext(timelines.get(before.vesselId) ?? [], before.moment.utc)
    let after: ServiceActivityDto = {
      ...before,
      context,
      ...serviceRepository.versions(context, before.vesselId, before.moment.utc),
    }
    if (
      after.context.portId !== before.context.portId ||
      after.vesselVersionId !== before.vesselVersionId
    )
      after = recalculateService(database, after)
    after.subjects = subjectsForService(after)
    const effects = subjectEffects(
      { kind: 'SERVICE_ACTIVITY', id: before.id, label: before.description },
      before,
      after,
      database,
    )
    return effects.length ? [{ before, after, effects }] : []
  })
  const values = (target: AssignmentTarget): AssignmentDto => {
    const op =
      target.kind === 'VESSEL_OPERATION' ? operations.find((o) => o.id === target.id)! : null
    const components =
      op?.charges.map((c) => ({
        id: c.id,
        label: operationLabels[c.chargeKind] + ' · ' + c.calculation.moment.utc,
        subjects: resolve(
          economicSubjectTargets(op, c.economicEndpointRole, timelines.get(op.vesselId)!),
          c.calculation.moment.utc,
        ),
      })) ?? []
    return {
      target,
      specified: specified(target),
      effective: op
        ? components[0].subjects
        : resolve(repository.ancestors(target), repository.startedAt(target)),
      components,
    }
  }
  return {
    updates: [...updates, ...serviceUpdates],
    serviceUpdates,
    effects: [...updates, ...serviceUpdates].flatMap((u) => u.effects),
    subjectsForService,
    values,
    apply: () => {
      for (const u of updates) repository.saveSubjects(u.chargeId, u.after)
      for (const u of serviceUpdates) serviceRepository.saveAttribution(u.after)
    },
    subjectsFor: (op: VesselOperationDto) =>
      op.charges.map((c) => ({
        ...c,
        subjects: resolve(
          economicSubjectTargets(op, c.economicEndpointRole, timelines.get(op.vesselId)!),
          c.calculation.moment.utc,
        ),
      })),
  }
}
