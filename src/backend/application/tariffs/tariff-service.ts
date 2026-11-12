import { randomUUID } from 'node:crypto'
import type { TariffApi, TariffDto } from '../../../shared/contracts/tariffs'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { resolveMoment } from '../../domain/values/moments'
import { TariffRepository } from '../../infrastructure/database/tariff-repository'
import { PortRepository } from '../../infrastructure/database/port-repository'
import { ArchiveCoordinator, type ArchiveApplicationSession } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { configurationsInput, momentInput, activityInput } from './tariff-input'
import { calculateBase } from './calculate-base'
import { tariffInsertionBlockers } from './tariff-impacts'

const namespace = 'TARIFF_CREATE'
export class TariffService implements TariffApi {
  constructor(private readonly coordinator: ArchiveCoordinator) {}
  list: TariffApi['list'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const input = record(query, ['portId', 'page', 'pageSize'])
      const id = entityId(input.portId, 'portId'),
        { page, pageSize } = pagination(input.page, input.pageSize)
      new PortRepository(session.database).get(id)
      return new TariffRepository(session.database).list(id, page, pageSize)
    })
  get: TariffApi['get'] = (request) =>
    this.coordinator.query(request, (session, query) =>
      new TariffRepository(session.database).get(entityId(record(query, ['id']).id, 'id')),
    )
  copyConfigurations: TariffApi['copyConfigurations'] = (request) =>
    this.coordinator.query(request, (session, query) =>
      new TariffRepository(session.database).copyConfigurations(
        entityId(record(query, ['id']).id, 'id'),
      ),
    )
  resolveMoment: TariffApi['resolveMoment'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const input = record(query, ['portId', 'moment'])
      return this.resolve(session, entityId(input.portId, 'portId'), input.moment)
    })
  private resolve(session: ArchiveApplicationSession, portId: string, input: unknown) {
    const moment = momentInput(input)
    const port = new PortRepository(session.database).get(portId)
    return resolveMoment(moment.localDateTime, port.initialZoneId, moment.selectedOffset)
  }
  private requirePort(session: ArchiveApplicationSession, id: string) {
    const port = new PortRepository(session.database).get(id)
    if (port.status !== 'ACTIVE')
      throw new ArchiveError(
        'NOT_SELECTABLE',
        'Il porto è disattivato e non può ricevere nuove tariffe.',
      )
  }
  previewCreate: TariffApi['previewCreate'] = (request) =>
    this.coordinator.command(request, (session, payload) => {
      const input = record(payload, ['portId', 'moment', 'configurations'])
      const portId = entityId(input.portId, 'portId')
      this.requirePort(session, portId)
      const configurations = configurationsInput(input.configurations)
      const resolution = this.resolve(session, portId, input.moment)
      if (resolution.status !== 'RESOLVED')
        throw new ArchiveError(
          'LOCAL_TIME_AMBIGUOUS',
          'Scegli esplicitamente l’occorrenza della decorrenza.',
        )
      const tariff: TariffDto = {
        id: randomUUID(),
        portId,
        effectiveFrom: resolution.moment.utc,
        effectiveMoment: resolution.moment,
        effectiveTo: null,
        phase: 'FUTURE',
        configurations: TariffRepository.identify(configurations),
      }
      this.analyze(session, tariff)
      const entry = session.previews.put(namespace, session.context(), tariff)
      return this.previewDto(session, tariff, entry, 1, 50)
    })
  confirmCreate: TariffApi['confirmCreate'] = (request) => {
    let consumed = ''
    return this.coordinator.command(
      request,
      (session, payload) => {
        const id = entityId(record(payload, ['previewId']).previewId, 'previewId')
        const entry = session.previews.get(id, namespace, session.context())
        const tariff = entry.input as TariffDto
        this.requirePort(session, tariff.portId)
        const analysis = this.analyze(session, tariff)
        if (analysis.blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'Risolvi i riferimenti bloccanti prima di creare la tariffa.',
            [],
            analysis.blockers,
          )
        const result = new TariffRepository(session.database).insert(tariff)
        // P10 integrates recalculation of dependent charges in this same transaction.
        consumed = id
        return result
      },
      (session) => session.previews.consume(consumed),
    )
  }
  previewEffects: TariffApi['previewEffects'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const input = record(query, ['previewId', 'page', 'pageSize'])
      const id = entityId(input.previewId, 'previewId'),
        { page, pageSize } = pagination(input.page, input.pageSize)
      const entry = session.previews.get(id, namespace, session.context())
      return this.previewDto(
        session,
        entry.input as TariffDto,
        { ...entry, previewId: id },
        page,
        pageSize,
      )
    })
  simulateBase: TariffApi['simulateBase'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const input = record(query, ['portId', 'vesselId', 'moment', 'activity'])
      const portId = entityId(input.portId, 'portId'),
        vesselId = entityId(input.vesselId, 'vesselId'),
        activity = activityInput(input.activity)
      const resolution = this.resolve(session, portId, input.moment)
      if (resolution.status !== 'RESOLVED')
        throw new ArchiveError(
          'LOCAL_TIME_AMBIGUOUS',
          'Scegli esplicitamente l’occorrenza del momento economico.',
        )
      return calculateBase(session.database, {
        portId,
        vesselId,
        activity,
        moment: resolution.moment,
      })
    })
  private analyze(session: ArchiveApplicationSession, tariff: TariffDto) {
    const { previous, next } = new TariffRepository(session.database).neighbors(
      tariff.portId,
      tariff.effectiveFrom!,
    )
    const reference = { kind: 'TARIFF' as const, id: tariff.id, label: 'Nuova tariffa completa' }
    const effects: ChangeEffectDto[] = [
      {
        reference,
        versionId: null,
        action: 'CREATE',
        changes: [
          { field: 'effectiveFrom', before: null, after: tariff.effectiveFrom },
          { field: 'effectiveTo', before: null, after: next },
        ],
      },
    ]
    if (previous)
      effects.push({
        reference: { kind: 'TARIFF', id: previous.id, label: 'Tariffa precedente' },
        versionId: null,
        action: 'UPDATE',
        changes: [
          { field: 'effectiveTo', before: previous.effectiveTo, after: tariff.effectiveFrom },
        ],
      })
    const blockers = tariffInsertionBlockers(session.database, previous)
    return { effects, blockers, next }
  }
  private previewDto(
    session: ArchiveApplicationSession,
    tariff: TariffDto,
    entry: { previewId: string; generatedAtUtc: string; expiresAtUtc: string },
    page: number,
    pageSize: number,
  ) {
    const { effects, blockers, next } = this.analyze(session, tariff)
    const now = new Date().toISOString()
    return {
      previewId: entry.previewId,
      generatedAtUtc: entry.generatedAtUtc,
      expiresAtUtc: entry.expiresAtUtc,
      operation: namespace,
      context: session.context(),
      status: blockers.length ? ('BLOCKED' as const) : ('READY' as const),
      summary: {
        created: 1,
        updated: effects.length - 1,
        deleted: 0,
        reattributed: 0,
        recalculated: 0,
      },
      effects: {
        items: effects.slice((page - 1) * pageSize, page * pageSize),
        total: effects.length,
        page,
        pageSize,
      },
      warnings: ['Non sono ancora presenti attività operative da ricalcolare.'],
      blockers,
      tariff: {
        ...tariff,
        effectiveTo: next,
        phase:
          tariff.effectiveFrom! > now
            ? ('FUTURE' as const)
            : next && next <= now
              ? ('HISTORICAL' as const)
              : ('CURRENT' as const),
      },
    }
  }
}
