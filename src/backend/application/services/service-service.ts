import type { CommandRequest } from '../../../shared/contracts/application'
import { randomUUID } from 'node:crypto'
import type {
  ServiceApi,
  ServiceMomentInput,
  ServiceMomentDto,
  ServiceActivityDto,
} from '../../../shared/contracts/services'
import type { ArchiveApplicationSession, ArchiveCoordinator } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { momentInput } from '../tariffs/tariff-input'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { resolveMoment } from '../../domain/values/moments'
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
import { calculateBase } from '../tariffs/calculate-base'

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
      new ServiceRepository(s.database).get(entityId(record(q, ['id']).id, 'id')),
    )
  list: ServiceApi['list'] = (request) =>
    this.coordinator.query(request, (s, q) => {
      const i = record(q, ['vesselId', 'page', 'pageSize']),
        id = entityId(i.vesselId, 'vesselId'),
        p = pagination(i.page, i.pageSize)
      new VesselRepository(s.database, new Date().toISOString()).get(id)
      return new ServiceRepository(s.database).list(id, p.page, p.pageSize)
    })
  createFree: ServiceApi['createFree'] = (request) => this.create(request, 'FREE')
  createCatalog: ServiceApi['createCatalog'] = (request) => this.create(request, 'CATALOG')
  private create(request: CommandRequest<unknown>, category: ServiceActivityDto['category']) {
    return this.coordinator.command(request, (s, p) => this.register(s, p, category))
  }
  private register(
    s: ArchiveApplicationSession,
    p: unknown,
    category: ServiceActivityDto['category'],
  ) {
    const { input: i, target } = parseMoment(p, [
      'executionStatus',
      ...(category === 'FREE' ? ['description', 'base'] : ['serviceTypeId']),
      'notes',
      'specified',
    ])
    const invalid = (field: string, message: string): never => {
      throw new ArchiveError('VALIDATION_ERROR', message, [
        { path: [field], code: 'INVALID_VALUE', message },
      ])
    }
    if (!['PLANNED', 'PERFORMED', 'MISSED'].includes(i.executionStatus as string))
      invalid('executionStatus', 'Scegli uno stato valido.')
    if (
      category === 'FREE' &&
      (typeof i.description !== 'string' ||
        !i.description.trim() ||
        [...i.description.trim()].length > 1000)
    )
      invalid('description', 'Inserisci una descrizione da 1 a 1000 caratteri.')
    if (i.notes !== null && (typeof i.notes !== 'string' || [...i.notes].length > 10000))
      invalid('notes', 'Le note ammettono al massimo 10000 caratteri.')
    const base = category === 'FREE' ? Money.parse(i.base, 'base') : null
    if (base?.cents === 0n) invalid('base', 'L’importo base deve essere maggiore di zero.')
    const v = record(i.specified, ['customerId', 'agencyId'])
    const specified = {
      customerId: v.customerId === null ? null : entityId(v.customerId, 'customerId'),
      agencyId: v.agencyId === null ? null : entityId(v.agencyId, 'agencyId'),
    }
    const now = new Date().toISOString()
    new VesselRepository(s.database, now).requireSelectable(target.vesselId)
    for (const kind of ['customer', 'agency'] as const) {
      const field = kind === 'customer' ? 'customerId' : 'agencyId',
        id = specified[field]
      if (id)
        try {
          if (kind === 'customer') new CustomerRepository(s.database, now).requireSelectable(id)
          else new AgencyRepository(s.database, now).requireSelectable(id)
        } catch (error) {
          if (error instanceof ArchiveError)
            throw new ArchiveError(error.code, error.message, [
              { path: ['specified', field], code: error.code, message: error.message },
            ])
          throw error
        }
    }
    const resolved = this.resolve(s, target)
    if (resolved.resolution.status !== 'RESOLVED')
      throw new ArchiveError(
        'LOCAL_TIME_AMBIGUOUS',
        'Scegli esplicitamente l’occorrenza del momento della prestazione.',
      )
    const moment = resolved.resolution.moment
    const context = serviceContext(
      subjectTimeline(
        new OperationRepository(s.database).all(target.vesselId),
        new AssignmentRepository(s.database).openings(),
      ),
      moment.utc,
    )
    if (context.portId !== resolved.portId)
      throw new ArchiveError(
        'OPERATIONAL_CONTEXT_MISSING',
        'Il porto scelto non corrisponde alla permanenza.',
      )
    const repository = new ServiceRepository(s.database)
    const catalog = new CatalogRepository(s.database)
    const type =
      category === 'CATALOG'
        ? catalog.requireSelectable(entityId(i.serviceTypeId, 'serviceTypeId'))
        : null
    const calculation = type
      ? calculateBase(s.database, {
          vesselId: target.vesselId,
          portId: context.portId,
          moment,
          activity: { kind: 'CATALOG', serviceTypeId: type.id },
        })
      : null
    const value: ServiceActivityDto = {
      id: randomUUID(),
      ...(type && calculation
        ? { category: 'CATALOG' as const, serviceTypeId: type.id, calculation }
        : { category: 'FREE' as const, serviceTypeId: null, calculation: null }),
      vesselId: target.vesselId,
      moment,
      context,
      ...repository.versions(context, target.vesselId, moment.utc),
      executionStatus: i.executionStatus as ServiceActivityDto['executionStatus'],
      description: type?.description ?? (i.description as string).trim(),
      notes: i.notes as string | null,
      base: calculation?.base ?? base!.text,
      specified,
      subjects: { customer: null, agency: null },
    }
    value.subjects = subjectPlan(s.database).subjectsForService(value)
    repository.insert(value)
    if (type) catalog.markUsed(type.id)
    return repository.get(value.id)
  }
}
