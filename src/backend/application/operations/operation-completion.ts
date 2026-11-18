import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type {
  CompleteOperationDto,
  OperationApi,
  OperationCompletionPreviewDto,
  OperationEndpointDto,
  OperationChargeDto,
  VesselOperationDto,
} from '../../../shared/contracts/operations'
import type { ConflictDto } from '../../../shared/contracts/application'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import type { ServiceActivityDto } from '../../../shared/contracts/services'
import type { MomentInputDto, ResolvedMomentDto } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { Money } from '../../domain/values/numbers'
import { resolveMoment } from '../../domain/values/moments'
import { replayOperations } from '../../domain/operations/replay'
import { subjectTimeline } from '../../domain/operations/subject-context'
import { serviceContext } from '../../domain/services/context'
import { operationTotal } from '../../domain/operations/charges'
import {
  OperationRepository,
  type OpeningIds,
} from '../../infrastructure/database/operation-repository'
import { AssignmentRepository } from '../../infrastructure/database/assignment-repository'
import { PortRepository } from '../../infrastructure/database/port-repository'
import { BerthRepository } from '../../infrastructure/database/berth-repository'
import { VesselRepository } from '../../infrastructure/database/vessel-repository'
import {
  replayPersistence,
  operationReplacementBlockers,
  replaceOperation,
  assertReplayIntegrity,
} from '../../infrastructure/database/operation-replay-repository'
import type { ArchiveCoordinator, ArchiveApplicationSession } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { momentInput } from '../tariffs/tariff-input'
import { calculateBase } from '../tariffs/calculate-base'
import { subjectEffects, subjectPlan } from './subject-resolution'

const namespace = 'OPERATION_COMPLETE'
const momentText = (e: OperationEndpointDto) =>
  `${e.moment.localDateTime} · ${e.moment.zoneId} · ${e.moment.offset} · UTC ${e.moment.utc}`
const operationValues = (o: VesselOperationDto) => ({
  status: { PLANNED: 'Prevista', PERFORMED: 'Effettuata', MISSED: 'Mancata' }[o.executionStatus],
  moment: momentText(o.endpoint),
  port: o.endpoint.portName,
  berth: o.endpoint.berthName,
  Arrivo: o.arrival ? momentText(o.arrival) : null,
  'Porto di destinazione': o.arrival?.portName ?? null,
  'Banchina di destinazione': o.arrival?.berthName ?? null,
  Note: o.notes,
  effectiveBase: o.totalBase,
})
const chargeValues = (c: OperationChargeDto) => ({
  calculatedBase: c.calculation.base,
  effectiveBase: c.effectiveBase,
  manualOverride: c.manualOverrideAmount,
  tariffId: c.calculation.tariffId,
  weightVersionId: c.calculation.weightVersionId,
  vesselVersionId: c.calculation.vesselVersionId,
  moment: `${c.calculation.moment.localDateTime} · ${c.calculation.moment.zoneId} · ${c.calculation.moment.offset} · UTC ${c.calculation.moment.utc}`,
})
const serviceValues = (s: ServiceActivityDto) => ({
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
type Prepared = {
  change: CompleteOperationDto
  openings: Map<string, OpeningIds>
  chargeIds: Map<string, string>
  originalBlockers: ConflictDto[]
}
function invalid(field: string, message: string): never {
  throw new ArchiveError('VALIDATION_ERROR', message, [
    { path: [field], code: 'INVALID_VALUE', message },
  ])
}
function parse(payload: unknown): CompleteOperationDto {
  const p = record(payload, ['id', 'values'])
  const type = (p.values as { operationType?: unknown } | null)?.operationType
  if (!['ENTRY', 'EXIT', 'MOVEMENT'].includes(type as string))
    invalid('operationType', 'Tipo di operazione non valido.')
  const v = record(p.values, [
    'vesselId',
    'operationType',
    'executionStatus',
    'moment',
    'notes',
    'manualOverrideAmount',
    ...(type === 'ENTRY' ? ['portId', 'berthId'] : ['interpretationPortId']),
    ...(type === 'MOVEMENT'
      ? [
          'destinationPortId',
          'destinationBerthId',
          'arrivalMoment',
          ...(Object.hasOwn(p.values as object, 'arrivalManualOverrideAmount')
            ? ['arrivalManualOverrideAmount']
            : []),
        ]
      : []),
  ])
  entityId(v.vesselId, 'vesselId')
  if (!['PERFORMED', 'MISSED'].includes(v.executionStatus as string))
    invalid('executionStatus', 'Consuntiva un’operazione prevista come effettuata o mancata.')
  momentInput(v.moment)
  if (v.notes !== null && (typeof v.notes !== 'string' || [...v.notes].length > 10000))
    invalid('notes', 'Le note ammettono al massimo 10000 caratteri.')
  for (const key of [
    'portId',
    'berthId',
    'interpretationPortId',
    'destinationPortId',
    'destinationBerthId',
  ])
    if (Object.hasOwn(v, key) && v[key] !== null) entityId(v[key], key)
  if (type === 'ENTRY') entityId(v.portId, 'portId')
  if (type === 'MOVEMENT') entityId(v.destinationPortId, 'destinationPortId')
  if (type === 'MOVEMENT') momentInput(v.arrivalMoment)
  for (const key of ['manualOverrideAmount', 'arrivalManualOverrideAmount'])
    if (Object.hasOwn(v, key) && v[key] !== null) Money.parse(v[key], key)
  return { id: entityId(p.id, 'id'), values: v as CompleteOperationDto['values'] }
}
export class OperationCompletion {
  constructor(private readonly coordinator: ArchiveCoordinator) {}

  private moments(s: ArchiveApplicationSession, change: CompleteOperationDto) {
    const before = new OperationRepository(s.database).get(change.id),
      v = change.values
    if (before.executionStatus !== 'PLANNED')
      invalid('executionStatus', 'L’operazione è già consuntivata. Ricarica la cronologia.')
    if (v.vesselId !== before.vesselId || v.operationType !== before.operationType)
      invalid('operationType', 'La consuntivazione conserva nave e tipo di operazione.')
    const portId =
      v.operationType === 'ENTRY' ? v.portId : (v.interpretationPortId ?? before.endpoint.portId)
    const resolve = (input: MomentInputDto, portId: string, original: OperationEndpointDto) => {
      if (
        portId === original.portId &&
        input.localDateTime === original.moment.localDateTime &&
        (input.selectedOffset === null || input.selectedOffset === original.moment.offset)
      )
        return { status: 'RESOLVED' as const, moment: original.moment }
      return resolveMoment(
        input.localDateTime,
        new PortRepository(s.database).get(portId).initialZoneId,
        input.selectedOffset,
      )
    }
    return {
      before,
      portId,
      berthId: before.endpoint.berthId,
      resolution: resolve(v.moment, portId, before.endpoint),
      ...(v.operationType === 'MOVEMENT'
        ? { arrivalResolution: resolve(v.arrivalMoment, v.destinationPortId, before.arrival!) }
        : {}),
    }
  }
  resolveCompletionMoment: OperationApi['resolveCompletionMoment'] = (request) =>
    this.coordinator.query(request, (s, p) => {
      const result = this.moments(s, parse(p))
      return {
        portId: result.portId,
        berthId: result.berthId,
        resolution: result.resolution,
        arrivalResolution: result.arrivalResolution,
      }
    })

  private build(s: ArchiveApplicationSession, prepared: Prepared): VesselOperationDto {
    const { change, chargeIds } = prepared,
      v = change.values
    const moments = this.moments(s, change),
      before = moments.before
    if (
      moments.resolution.status !== 'RESOLVED' ||
      moments.arrivalResolution?.status === 'CHOICE_REQUIRED'
    )
      throw new ArchiveError(
        'LOCAL_TIME_AMBIGUOUS',
        'Scegli esplicitamente l’occorrenza di ciascun momento operativo.',
      )
    const now = new Date().toISOString(),
      ports = new PortRepository(s.database, () => now),
      berths = new BerthRepository(s.database, now),
      vessels = new VesselRepository(s.database, now)
    const at = <T extends { effectiveFrom: string | null; effectiveTo: string | null }>(
      versions: readonly T[],
      utc: string,
    ) =>
      versions.find(
        (v) =>
          (!v.effectiveFrom || v.effectiveFrom <= utc) && (!v.effectiveTo || utc < v.effectiveTo),
      )!
    const endpoint = (
      original: OperationEndpointDto,
      portId: string,
      berthId: string | null,
      moment: ResolvedMomentDto,
    ): OperationEndpointDto => {
      if (portId !== original.portId && ports.get(portId).status !== 'ACTIVE')
        throw new ArchiveError('NOT_SELECTABLE', 'Il nuovo porto non è selezionabile.')
      if (berthId !== original.berthId && berthId) berths.requireSelectable(portId, berthId)
      if (berthId && berths.get(berthId).portId !== portId)
        invalid('berthId', 'La banchina non appartiene al porto.')
      const port = at(ports.versions(portId), moment.utc),
        berth = berthId ? at(berths.versions(berthId), moment.utc) : null
      return {
        ...original,
        moment,
        portId,
        berthId,
        vesselVersionId: at(vessels.versions(before.vesselId), moment.utc).id,
        portVersionId: port.id,
        portName: port.name,
        berthVersionId: berth?.id ?? null,
        berthName: berth?.name ?? null,
      }
    }
    const resolvedMoment = moments.resolution.moment
    let portId = moments.portId,
      berthId = v.operationType === 'ENTRY' ? v.berthId : before.endpoint.berthId
    if (v.operationType !== 'ENTRY') {
      const prefix = new OperationRepository(s.database)
        .all(before.vesselId)
        .filter((o) => o.id !== before.id && o.endpoint.moment.utc < resolvedMoment.utc)
      const origin = serviceContext(
        subjectTimeline(prefix, new AssignmentRepository(s.database).openings()),
        moments.resolution.moment.utc,
      )
      portId = origin.portId
      berthId = origin.berthId
      if (
        (v.interpretationPortId && v.interpretationPortId !== portId) ||
        portId !== moments.portId
      )
        invalid(
          'interpretationPortId',
          'Il momento deve corrispondere al porto di origine della cronologia.',
        )
    }
    const after: VesselOperationDto = {
      ...before,
      executionStatus: v.executionStatus,
      notes: v.notes,
      endpoint: endpoint(before.endpoint, portId, berthId, moments.resolution.moment),
      arrival:
        v.operationType === 'MOVEMENT'
          ? endpoint(
              before.arrival!,
              v.destinationPortId,
              v.destinationBerthId,
              moments.arrivalResolution!.status === 'RESOLVED'
                ? moments.arrivalResolution!.moment
                : before.arrival!.moment,
            )
          : null,
    }
    if (v.executionStatus === 'MISSED') {
      if (
        !isDeepStrictEqual(before.endpoint, after.endpoint) ||
        !isDeepStrictEqual(before.arrival, after.arrival)
      )
        invalid('moment', 'L’operazione mancata conserva momenti e contesto pianificati.')
    }
    after.vesselVersionId = after.endpoint.vesselVersionId
    const external = after.arrival && after.arrival.portId !== after.endpoint.portId
    if (!external && v.operationType === 'MOVEMENT' && v.arrivalManualOverrideAmount != null)
      invalid('arrivalManualOverrideAmount', 'La sostituzione all’arrivo è ammessa solo tra porti.')
    after.charges = (
      external
        ? [
            { e: after.endpoint, kind: 'EXIT' as const, override: v.manualOverrideAmount },
            {
              e: after.arrival!,
              kind: 'ENTRY' as const,
              override:
                v.operationType === 'MOVEMENT' ? (v.arrivalManualOverrideAmount ?? null) : null,
            },
          ]
        : [{ e: after.endpoint, kind: after.operationType, override: v.manualOverrideAmount }]
    ).map(({ e, kind, override }) => {
      const key = kind + ':' + e.role
      const original = before.charges.find(
        (c) => c.chargeKind === kind && c.economicEndpointRole === e.role,
      )
      if (!chargeIds.has(key)) chargeIds.set(key, randomUUID())
      const calculation = calculateBase(s.database, {
        vesselId: before.vesselId,
        portId: e.portId,
        moment: e.moment,
        activity: { kind: 'OPERATION', operation: kind },
      })
      return {
        id: original?.id ?? chargeIds.get(key)!,
        chargeKind: kind,
        economicEndpointRole: e.role,
        calculation,
        manualOverrideAmount: override === null ? null : Money.parse(override).text,
        effectiveBase: override === null ? calculation.base : Money.parse(override).text,
        subjects: original?.subjects ?? { customer: null, agency: null },
      }
    })
    after.totalBase = operationTotal(after.charges)
    return after
  }

  private analyze(s: ArchiveApplicationSession, prepared: Prepared) {
    const repository = new OperationRepository(s.database),
      before = repository.get(prepared.change.id)
    const effects: ChangeEffectDto[] = [],
      blockers: ConflictDto[] = []
    let after = { ...before, executionStatus: prepared.change.values.executionStatus }
    try {
      after = this.build(s, prepared)
      const operations = repository.all().map((o) => (o.id === before.id ? after : o))
      const previous = repository.stays(before.vesselId, 1, Number.MAX_SAFE_INTEGER).items
      const voyages = replayOperations(
        operations.filter((o) => o.vesselId === before.vesselId),
        previous,
        prepared.openings,
      )
      const openings = new Map(new AssignmentRepository(s.database).openings())
      for (const op of operations.filter((o) => o.vesselId === before.vesselId))
        openings.delete(op.id)
      for (const v of voyages)
        for (const p of v.visits)
          for (const b of p.stays)
            openings.set(b.openingOperationId, {
              voyageId: v.id,
              portCallId: p.id,
              berthStayId: b.id,
            })
      const subjects = subjectPlan(s.database, { operations, openings })
      after.charges = subjects.subjectsFor(after)
      const persistence = replayPersistence(s.database, before.vesselId, voyages)
      effects.push(
        ...persistence.effects,
        ...subjectEffects(
          { kind: 'VESSEL_OPERATION', id: before.id, label: 'Operazione da consuntivare' },
          operationValues(before),
          operationValues(after),
        ),
        ...subjects.effects.filter((e) => e.reference.kind !== 'SERVICE_ACTIVITY'),
        ...subjects.serviceUpdates.flatMap((u) =>
          subjectEffects(
            { kind: 'SERVICE_ACTIVITY', id: u.before.id, label: u.before.description },
            serviceValues(u.before),
            serviceValues(u.after),
          ),
        ),
      )
      for (const c of before.charges)
        if (!after.charges.some((a) => a.id === c.id))
          effects.push({
            reference: { kind: 'OPERATION_CHARGE', id: c.id, label: 'Componente rimossa' },
            versionId: null,
            action: 'DELETE',
            changes: [{ field: 'base', before: c.effectiveBase, after: null }],
          })
      for (const c of after.charges) {
        const old = before.charges.find((a) => a.id === c.id)
        if (!old)
          effects.push({
            reference: { kind: 'OPERATION_CHARGE', id: c.id, label: 'Nuova componente' },
            versionId: null,
            action: 'CREATE',
            changes: [{ field: 'base', before: null, after: c.effectiveBase }],
          })
        else
          effects.push(
            ...subjectEffects(
              { kind: 'OPERATION_CHARGE', id: c.id, label: 'Componente economica' },
              chargeValues(old),
              chargeValues(c),
            ),
          )
      }
      blockers.push(
        ...persistence.blockers,
        ...operationReplacementBlockers(s.database, before, after),
      )
      return {
        before,
        after,
        effects,
        blockers,
        recalculated:
          after.charges.length +
          subjects.updates.filter(
            (u) => 'before' in u && 'category' in u.before && u.before.category === 'CATALOG',
          ).length,
        apply: () => {
          s.database.sqlite.pragma('defer_foreign_keys=ON')
          replaceOperation(s.database, before, after)
          persistence.apply()
          subjects.apply()
          assertReplayIntegrity(s.database)
        },
      }
    } catch (error) {
      if (
        !(error instanceof ArchiveError) ||
        ['VALIDATION_ERROR', 'NOT_FOUND'].includes(error.code)
      )
        throw error
      blockers.push({
        reference: { kind: 'VESSEL_OPERATION', id: before.id, label: 'Sequenza e prestazioni' },
        reason: error.message,
      })
      return { before, after, effects: [], blockers, recalculated: 0, apply: () => {} }
    }
  }
  private dto(
    s: ArchiveApplicationSession,
    prepared: Prepared,
    entry: { previewId: string; generatedAtUtc: string; expiresAtUtc: string },
    page = 1,
    pageSize = 50,
  ): OperationCompletionPreviewDto {
    const a = this.analyze(s, prepared)
    return {
      ...entry,
      context: s.context(),
      operation: namespace,
      status: a.blockers.length || prepared.originalBlockers.length ? 'BLOCKED' : 'READY',
      before: a.before,
      operationValues: a.after,
      summary: {
        created: a.effects.filter((e) => e.action === 'CREATE').length,
        updated: a.effects.filter((e) => e.action === 'UPDATE').length,
        deleted: a.effects.filter((e) => e.action === 'DELETE').length,
        reattributed: a.effects.filter((e) => e.reference.kind === 'SERVICE_ACTIVITY').length,
        recalculated: a.recalculated,
      },
      effects: {
        items: a.effects.slice((page - 1) * pageSize, page * pageSize),
        total: a.effects.length,
        page,
        pageSize,
      },
      blockers: a.blockers.length ? a.blockers : prepared.originalBlockers,
      warnings: ['Gli importi sono basi in EUR; lo stato mancato non li azzera automaticamente.'],
    }
  }
  previewComplete: OperationApi['previewComplete'] = (request) =>
    this.coordinator.command(request, (s, p) => {
      const change = parse(p),
        openings = new Map<string, OpeningIds>()
      for (const op of new OperationRepository(s.database).all())
        openings.set(op.id, {
          voyageId: randomUUID(),
          portCallId: randomUUID(),
          berthStayId: randomUUID(),
        })
      const prepared: Prepared = {
        change,
        openings,
        chargeIds: new Map<string, string>(),
        originalBlockers: [],
      }
      prepared.originalBlockers = this.analyze(s, prepared).blockers
      const entry = s.previews.put(namespace, s.context(), prepared)
      return this.dto(s, prepared, entry)
    })
  completionEffects: OperationApi['completionEffects'] = (request) =>
    this.coordinator.query(request, (s, q) => {
      const p = record(q, ['previewId', 'page', 'pageSize']),
        id = entityId(p.previewId, 'previewId'),
        paging = pagination(p.page, p.pageSize),
        entry = s.previews.get(id, namespace, s.context())
      return this.dto(
        s,
        entry.input as Prepared,
        { ...entry, previewId: id },
        paging.page,
        paging.pageSize,
      )
    })
  confirmComplete: OperationApi['confirmComplete'] = (request) => {
    let consumed = ''
    return this.coordinator.command(
      request,
      (s, p) => {
        const id = entityId(record(p, ['previewId']).previewId, 'previewId'),
          entry = s.previews.get(id, namespace, s.context()),
          prepared = entry.input as Prepared,
          analysis = this.analyze(s, prepared)
        if (prepared.originalBlockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'Genera una nuova anteprima dopo aver risolto i blocchi.',
            [],
            prepared.originalBlockers,
          )
        if (analysis.blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'La consuntivazione non è consentita.',
            [],
            analysis.blockers,
          )
        analysis.apply()
        consumed = id
        return new OperationRepository(s.database).get(analysis.after.id)
      },
      (s) => s.previews.consume(consumed),
    )
  }
}
