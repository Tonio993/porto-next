import { ReadDescriptions } from '../presentation/read-descriptions'
import { isDeepStrictEqual as same } from 'node:util'
import { recalculateService, type ServiceCalculationInput } from './service-calculation'
import type { CommandRequest } from '../../../shared/contracts/application'
import { randomUUID } from 'node:crypto'
import type {
  ServiceApi,
  ServiceChange,
  ServiceChangePreviewDto,
  ServiceListQuery,
  ServiceMomentInput,
  ServiceMomentDto,
  ServiceActivityDto,
} from '../../../shared/contracts/services'
import type { ArchiveApplicationSession, ArchiveCoordinator } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { momentInput } from '../tariffs/tariff-input'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { utcInstant, resolveMoment } from '../../domain/values/moments'
import { Money } from '../../domain/values/numbers'
import { serviceContext } from '../../domain/services/context'
import { subjectTimeline } from '../../domain/operations/subject-context'
import { OperationRepository } from '../../infrastructure/database/operation-repository'
import { AssignmentRepository } from '../../infrastructure/database/assignment-repository'
import { ServiceRepository } from '../../infrastructure/database/service-repository'
import { PortRepository } from '../../infrastructure/database/port-repository'
import { VesselRepository } from '../../infrastructure/database/vessel-repository'
import { CustomerRepository } from '../../infrastructure/database/customer-repository'
import { AgencyRepository } from '../../infrastructure/database/agency-repository'
import { subjectPlan } from '../operations/subject-resolution'
import { CatalogRepository } from '../../infrastructure/database/catalog-repository'
const namespace = 'SERVICE_CHANGE'
function invalid(field: string, message: string): never {
  throw new ArchiveError('VALIDATION_ERROR', message, [
    { path: [field], code: 'INVALID_VALUE', message },
  ])
}
function notes(value: unknown): string | null {
  if (value !== null && (typeof value !== 'string' || [...value].length > 10000))
    invalid('notes', 'Le note ammettono al massimo 10000 caratteri.')
  return value as string | null
}
const filterKeys = [
  'vesselId',
  'category',
  'serviceTypeId',
  'executionStatus',
  'fromUtc',
  'toUtc',
  'portId',
  'berthId',
  'voyageId',
  'portCallId',
  'berthStayId',
  'customerId',
  'agencyId',
] as const

function parseMoment(value: unknown, extra: string[] = []) {
  const i = record(value, ['vesselId', 'interpretationPortId', 'moment', ...extra])
  return {
    input: i,
    target: {
      vesselId: entityId(i.vesselId, 'vesselId'),
      interpretationPortId:
        i.interpretationPortId === null
          ? null
          : entityId(i.interpretationPortId, 'interpretationPortId'),
      moment: momentInput(i.moment),
    } satisfies ServiceMomentInput,
  }
}
export class ServiceService implements ServiceApi {
  constructor(private readonly coordinator: ArchiveCoordinator) {}
  private resolve(s: ArchiveApplicationSession, input: ServiceMomentInput): ServiceMomentDto {
    new VesselRepository(s.database, new Date().toISOString()).get(input.vesselId)
    const spans = subjectTimeline(
      new OperationRepository(s.database).all(input.vesselId),
      new AssignmentRepository(s.database).openings(),
    )
    const ports = new PortRepository(s.database),
      candidates: ServiceMomentDto[] = []
    let resolutionError: unknown
    const portIds = [...new Set(spans.map((s) => s.portId))]
    for (const portId of portIds) {
      if (input.interpretationPortId && portId !== input.interpretationPortId) continue
      try {
        const port = ports.get(portId)
        const resolution = resolveMoment(
          input.moment.localDateTime,
          port.initialZoneId,
          input.moment.selectedOffset,
        )
        const moments = resolution.status === 'RESOLVED' ? [resolution.moment] : resolution.choices
        // Un overlap resta sempre una scelta esplicita; il contesto è riesaminato al salvataggio.
        if (
          moments.some((m) => {
            try {
              return serviceContext(spans, m.utc).portId === portId
            } catch {
              return false
            }
          })
        )
          candidates.push({ portId, portName: port.version.name, resolution })
      } catch (error) {
        resolutionError = error
      }
    }
    if (candidates.length > 1)
      throw new ArchiveError(
        'OPERATIONAL_CONTEXT_AMBIGUOUS',
        'L’ora locale corrisponde a più porti. Scegli un porto candidato per disambiguare.',
        [],
        candidates.map((c) => ({
          reference: { kind: 'PORT', id: c.portId, label: c.portName },
          reason: 'Contesto candidato ammesso dalla cronologia.',
        })),
      )
    if (!candidates.length) {
      if (resolutionError && (input.interpretationPortId || portIds.length === 1))
        throw resolutionError
      throw new ArchiveError(
        'OPERATIONAL_CONTEXT_MISSING',
        'Non esiste una permanenza al momento indicato oppure la nave è in trasferimento.',
      )
    }
    return candidates[0]
  }
  resolveMoment: ServiceApi['resolveMoment'] = (request) =>
    this.coordinator.query(request, (s, q) => this.resolve(s, parseMoment(q).target))
  get: ServiceApi['get'] = (request) =>
    this.coordinator.query(request, (s, q) =>
      new ReadDescriptions(s.database).service(
        new ServiceRepository(s.database).get(entityId(record(q, ['id']).id, 'id')),
      ),
    )
  list: ServiceApi['list'] = (request) =>
    this.coordinator.query(request, (s, q) => {
      // Filters are optional; every provided field is still validated, including direct IPC.
      const raw = q as unknown
      const keys = raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw) : []
      record(raw, [
        'page',
        'pageSize',
        ...keys.filter((k) => (filterKeys as readonly string[]).includes(k)),
      ])
      const i = raw as Record<string, unknown>
      const query: ServiceListQuery = pagination(i.page, i.pageSize)
      for (const key of filterKeys) {
        if (i[key] === undefined || i[key] === null) continue
        if (key === 'category') {
          if (!['FREE', 'CATALOG'].includes(i[key] as string)) invalid(key, 'Categoria non valida.')
          query.category = i[key] as 'FREE' | 'CATALOG'
        } else if (key === 'executionStatus') {
          if (!['PLANNED', 'PERFORMED', 'MISSED'].includes(i[key] as string))
            invalid(key, 'Stato non valido.')
          query.executionStatus = i[key] as ServiceActivityDto['executionStatus']
        } else if (key === 'fromUtc' || key === 'toUtc') query[key] = utcInstant(i[key])
        else query[key] = entityId(i[key], key)
      }
      if (query.fromUtc && query.toUtc && query.fromUtc > query.toUtc)
        invalid('toUtc', 'La fine del periodo precede l’inizio.')
      const result = new ServiceRepository(s.database).list(query)
      const descriptions = new ReadDescriptions(s.database)
      return { ...result, items: result.items.map((v) => descriptions.service(v)) }
    })
  createFree: ServiceApi['createFree'] = (request) => this.create(request, 'FREE')
  createCatalog: ServiceApi['createCatalog'] = (request) => this.create(request, 'CATALOG')
  private create(request: CommandRequest<unknown>, category: ServiceActivityDto['category']) {
    return this.coordinator.command(request, (s, p) => {
      const value = this.build(s, p, category)
      const repository = new ServiceRepository(s.database)
      repository.insert(value)
      if (value.category === 'CATALOG')
        new CatalogRepository(s.database).markUsed(value.serviceTypeId)
      return new ReadDescriptions(s.database).service(repository.get(value.id))
    })
  }
  private build(
    s: ArchiveApplicationSession,
    p: unknown,
    category: ServiceActivityDto['category'],
    previous?: ServiceActivityDto,
    force = false,
  ): ServiceActivityDto {
    const { input: i, target } = parseMoment(p, [
      'executionStatus',
      ...(category === 'FREE' ? ['description', 'base'] : ['serviceTypeId']),
      'notes',
      'specified',
    ])
    if (!['PLANNED', 'PERFORMED', 'MISSED'].includes(i.executionStatus as string))
      invalid('executionStatus', 'Scegli uno stato valido.')
    if (
      category === 'FREE' &&
      (typeof i.description !== 'string' ||
        !i.description.trim() ||
        [...i.description.trim()].length > 1000)
    )
      invalid('description', 'Inserisci una descrizione da 1 a 1000 caratteri.')
    const parsedNotes = notes(i.notes)
    const base = category === 'FREE' ? Money.parse(i.base, 'base') : null
    if (base?.cents === 0n) invalid('base', 'L’importo base deve essere maggiore di zero.')
    const v = record(i.specified, ['customerId', 'agencyId'])
    const specified = {
      customerId: v.customerId === null ? null : entityId(v.customerId, 'customerId'),
      agencyId: v.agencyId === null ? null : entityId(v.agencyId, 'agencyId'),
    }
    const now = new Date().toISOString()
    const vessels = new VesselRepository(s.database, now)
    if (previous?.vesselId === target.vesselId) vessels.get(target.vesselId)
    else vessels.requireSelectable(target.vesselId)
    for (const kind of ['customer', 'agency'] as const) {
      const field = kind === 'customer' ? 'customerId' : 'agencyId',
        id = specified[field]
      if (id)
        try {
          const repository =
            kind === 'customer'
              ? new CustomerRepository(s.database, now)
              : new AgencyRepository(s.database, now)
          if (previous?.specified[field] === id) repository.get(id)
          else repository.requireSelectable(id)
        } catch (error) {
          if (error instanceof ArchiveError)
            throw new ArchiveError(error.code, error.message, [
              { path: ['specified', field], code: error.code, message: error.message },
            ])
          throw error
        }
    }
    const repository = new ServiceRepository(s.database),
      catalog = new CatalogRepository(s.database)
    const typeId = category === 'CATALOG' ? entityId(i.serviceTypeId, 'serviceTypeId') : null
    const type = typeId
      ? previous?.serviceTypeId === typeId
        ? catalog.get(typeId)
        : catalog.requireSelectable(typeId)
      : null
    const unchangedMoment =
      previous &&
      previous.vesselId === target.vesselId &&
      previous.moment.localDateTime === target.moment.localDateTime &&
      (target.moment.selectedOffset === null ||
        previous.moment.offset === target.moment.selectedOffset) &&
      (!target.interpretationPortId || previous.context.portId === target.interpretationPortId)
    const relevant =
      force ||
      !previous ||
      !unchangedMoment ||
      previous.serviceTypeId !== typeId ||
      previous.executionStatus !== i.executionStatus ||
      !same(previous.specified, specified) ||
      (category === 'FREE' && previous.base !== base!.text)
    if (previous && !relevant)
      return {
        ...previous,
        description: type?.description ?? (i.description as string).trim(),
        notes: parsedNotes,
      }
    let moment = unchangedMoment ? previous.moment : null
    if (!moment) {
      const resolved = this.resolve(s, target)
      if (resolved.resolution.status !== 'RESOLVED')
        throw new ArchiveError(
          'LOCAL_TIME_AMBIGUOUS',
          'Scegli esplicitamente l’occorrenza del momento della prestazione.',
        )
      moment = resolved.resolution.moment
    }
    const context = serviceContext(
      subjectTimeline(
        new OperationRepository(s.database).all(target.vesselId),
        new AssignmentRepository(s.database).openings(),
      ),
      moment.utc,
    )
    if (target.interpretationPortId && context.portId !== target.interpretationPortId)
      throw new ArchiveError(
        'OPERATIONAL_CONTEXT_MISSING',
        'Il porto scelto non corrisponde alla permanenza.',
      )
    const value: ServiceCalculationInput = {
      id: previous?.id ?? randomUUID(),
      ...(type
        ? {
            category: 'CATALOG' as const,
            serviceTypeId: type.id,
            calculation: previous?.calculation ?? null,
          }
        : { category: 'FREE' as const, serviceTypeId: null, calculation: null }),
      vesselId: target.vesselId,
      moment,
      context,
      ...repository.versions(context, target.vesselId, moment.utc),
      executionStatus: i.executionStatus as ServiceActivityDto['executionStatus'],
      description: type?.description ?? (i.description as string).trim(),
      notes: parsedNotes,
      base: base?.text ?? previous?.base ?? '0.00',
      specified,
      subjects: { customer: null, agency: null },
    }
    const calculated = recalculateService(s.database, value)
    calculated.subjects = subjectPlan(s.database).subjectsForService(calculated)
    return calculated
  }
  updateNotes: ServiceApi['updateNotes'] = (request) =>
    this.coordinator.command(request, (s, p) => {
      const input = record(p, ['id', 'notes']),
        id = entityId(input.id, 'id'),
        value = notes(input.notes)
      const repository = new ServiceRepository(s.database)
      repository.updateNotes(id, value)
      return new ReadDescriptions(s.database).service(repository.get(id))
    })
  private analyze(s: ArchiveApplicationSession, change: ServiceChange) {
    const repository = new ServiceRepository(s.database),
      before = repository.get(change.id)
    if (change.operation === 'DELETE')
      return { before, after: null, blockers: repository.deleteBlockers(before) }
    const category = change.operation.endsWith('_FREE') ? 'FREE' : 'CATALOG'
    if (category !== before.category)
      invalid('operation', 'La categoria della prestazione non può essere modificata.')
    const complete = change.operation.startsWith('COMPLETE_')
    const values = record(change.values, [
      'vesselId',
      'interpretationPortId',
      'moment',
      'executionStatus',
      'notes',
      'specified',
      ...(category === 'FREE' ? ['description', 'base'] : ['serviceTypeId']),
    ])
    const status = values.executionStatus as ServiceActivityDto['executionStatus']
    if (complete) {
      if (before.executionStatus !== 'PLANNED' || !['PERFORMED', 'MISSED'].includes(status))
        invalid('executionStatus', 'Consuntiva una prestazione prevista come effettuata o mancata.')
      if (status === 'MISSED') {
        const requestedMoment = momentInput(values.moment)
        if (
          change.values.vesselId !== before.vesselId ||
          requestedMoment.localDateTime !== before.moment.localDateTime ||
          (requestedMoment.selectedOffset !== null &&
            requestedMoment.selectedOffset !== before.moment.offset) ||
          (change.values.interpretationPortId !== null &&
            change.values.interpretationPortId !== before.context.portId)
        )
          invalid('moment', 'La prestazione mancata conserva nave e istante pianificati.')
      }
    } else if (status !== before.executionStatus && before.executionStatus === 'PLANNED')
      invalid('executionStatus', 'Usa la consuntivazione esplicita per registrare l’esito.')
    else if (status === 'PLANNED' && before.executionStatus !== 'PLANNED')
      invalid('executionStatus', 'Una prestazione consuntivata non può tornare prevista.')
    const after = this.build(s, change.values, category, before, complete)
    return { before, after, blockers: [] }
  }
  preview: ServiceApi['preview'] = (request) =>
    this.coordinator.command(request, (s, p) => {
      const operation = (p as ServiceChange | null)?.operation
      if (
        !['UPDATE_FREE', 'UPDATE_CATALOG', 'COMPLETE_FREE', 'COMPLETE_CATALOG', 'DELETE'].includes(
          operation as string,
        )
      )
        invalid('operation', 'Operazione non valida.')
      const input = record(
        p,
        operation === 'DELETE' ? ['operation', 'id'] : ['operation', 'id', 'values'],
      )
      const change = { ...input, id: entityId(input.id, 'id') } as ServiceChange
      const analysis = this.analyze(s, change)
      const entry = s.previews.put(namespace, s.context(), change)
      const descriptions = new ReadDescriptions(s.database)
      return {
        ...entry,
        context: s.context(),
        operation: change.operation,
        ...analysis,
        before: descriptions.service(analysis.before),
        after: analysis.after ? descriptions.service(analysis.after) : null,
        changedFields: analysis.after
          ? Object.keys(analysis.after).filter(
              (key) =>
                !same(
                  analysis.before[key as keyof ServiceActivityDto],
                  analysis.after![key as keyof ServiceActivityDto],
                ),
            )
          : ['deleted'],
      } satisfies ServiceChangePreviewDto
    })
  confirm: ServiceApi['confirm'] = (request) => {
    let consumed = ''
    return this.coordinator.command(
      request,
      (s, p) => {
        const id = entityId(record(p, ['previewId']).previewId, 'previewId')
        const change = s.previews.get(id, namespace, s.context()).input as ServiceChange
        const { before, after, blockers } = this.analyze(s, change)
        if (blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'La prestazione ha riferimenti che impediscono l’eliminazione.',
            [],
            blockers,
          )
        const repository = new ServiceRepository(s.database)
        if (!after) repository.delete(before.id)
        else if (!same(before, after)) {
          repository.save(after)
          if (after.category === 'CATALOG' && before.serviceTypeId !== after.serviceTypeId)
            new CatalogRepository(s.database).markUsed(after.serviceTypeId)
        }
        consumed = id
        return {
          id: before.id,
          service: after
            ? new ReadDescriptions(s.database).service(repository.get(before.id))
            : null,
        }
      },
      (s) => s.previews.consume(consumed),
    )
  }
}
