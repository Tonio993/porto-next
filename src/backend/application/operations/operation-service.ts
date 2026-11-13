import { subjectPlan } from './subject-resolution'
import { randomUUID } from 'node:crypto'
import type {
  OperationApi,
  OperationMomentInput,
  OperationMomentDto,
  VesselOperationDto,
  OperationEndpointDto,
} from '../../../shared/contracts/operations'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { operationTotal } from '../../domain/operations/charges'
import { validateOperationSequence } from '../../domain/operations/sequence'
import { resolveMoment, utcInstant } from '../../domain/values/moments'
import { Money } from '../../domain/values/numbers'
import {
  OperationRepository,
  type OpeningIds,
} from '../../infrastructure/database/operation-repository'
import { PortRepository } from '../../infrastructure/database/port-repository'
import { VesselRepository } from '../../infrastructure/database/vessel-repository'
import { BerthRepository } from '../../infrastructure/database/berth-repository'
import type { ArchiveCoordinator, ArchiveApplicationSession } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { momentInput } from '../tariffs/tariff-input'
import { calculateBase } from '../tariffs/calculate-base'

const namespace = 'OPERATION_CREATE'
type PreparedOperation = VesselOperationDto & { openingIds: OpeningIds }
const kind = (value: unknown) => {
  const type = (value as { operationType?: unknown } | null)?.operationType
  if (type !== 'ENTRY' && type !== 'EXIT' && type !== 'MOVEMENT')
    throw new ArchiveError('VALIDATION_ERROR', 'Scegli entrata, uscita o spostamento.')
  return type
}
function parseMoment(
  value: unknown,
  extra: string[] = [],
): { input: Record<string, unknown>; target: OperationMomentInput } {
  const operationType = kind(value)
  const input = record(value, [
    'operationType',
    'vesselId',
    'moment',
    ...extra,
    ...(operationType === 'ENTRY' ? ['portId', 'berthId'] : ['interpretationPortId']),
    ...(operationType === 'MOVEMENT'
      ? ['destinationPortId', 'destinationBerthId', 'arrivalMoment']
      : []),
  ])
  const common = {
    vesselId: entityId(input.vesselId, 'vesselId'),
    moment: momentInput(input.moment),
  }
  if (operationType === 'ENTRY')
    return {
      input,
      target: {
        ...common,
        operationType,
        portId: entityId(input.portId, 'portId'),
        berthId: input.berthId === null ? null : entityId(input.berthId, 'berthId'),
      },
    }
  const origin = {
    ...common,
    interpretationPortId:
      input.interpretationPortId === null
        ? null
        : entityId(input.interpretationPortId, 'interpretationPortId'),
  }
  if (operationType === 'EXIT') return { input, target: { ...origin, operationType } }
  return {
    input,
    target: {
      ...origin,
      operationType,
      destinationPortId: entityId(input.destinationPortId, 'destinationPortId'),
      destinationBerthId:
        input.destinationBerthId === null
          ? null
          : entityId(input.destinationBerthId, 'destinationBerthId'),
      arrivalMoment: momentInput(input.arrivalMoment),
    },
  }
}
export class OperationService implements OperationApi {
  constructor(private readonly coordinator: ArchiveCoordinator) {}
  contextAt: OperationApi['contextAt'] = (request) =>
    this.coordinator.query(request, (s, q) => {
      const i = record(q, ['vesselId', 'instant']),
        id = entityId(i.vesselId, 'vesselId'),
        instant = utcInstant(i.instant)
      new VesselRepository(s.database, new Date().toISOString()).get(id)
      return new OperationRepository(s.database).contextAt(id, instant)
    })
  list: OperationApi['list'] = (request) =>
    this.coordinator.query(request, (s, q) => {
      const i = record(q, ['vesselId', 'page', 'pageSize']),
        id = entityId(i.vesselId, 'vesselId'),
        p = pagination(i.page, i.pageSize)
      new VesselRepository(s.database, new Date().toISOString()).get(id)
      return new OperationRepository(s.database).list(id, p.page, p.pageSize)
    })
  get: OperationApi['get'] = (request) =>
    this.coordinator.query(request, (s, q) =>
      new OperationRepository(s.database).get(entityId(record(q, ['id']).id, 'id')),
    )
  stays: OperationApi['stays'] = (request) =>
    this.coordinator.query(request, (s, q) => {
      const i = record(q, ['vesselId', 'page', 'pageSize']),
        id = entityId(i.vesselId, 'vesselId'),
        p = pagination(i.page, i.pageSize)
      new VesselRepository(s.database, new Date().toISOString()).get(id)
      return new OperationRepository(s.database).stays(id, p.page, p.pageSize)
    })
  resolveMoment: OperationApi['resolveMoment'] = (request) =>
    this.coordinator.query(request, (s, q) => this.resolve(s, parseMoment(q).target))

  private resolve(s: ArchiveApplicationSession, input: OperationMomentInput): OperationMomentDto {
    const ports = new PortRepository(s.database)
    new VesselRepository(s.database, new Date().toISOString()).get(input.vesselId)
    if (input.operationType === 'ENTRY') {
      const port = ports.get(input.portId)
      return {
        portId: port.id,
        berthId: input.berthId,
        resolution: resolveMoment(
          input.moment.localDateTime,
          port.initialZoneId,
          input.moment.selectedOffset,
        ),
      }
    }
    const repository = new OperationRepository(s.database)
    const operations = repository.all(input.vesselId)
    const portIds = [
      ...new Set(
        operations
          .filter((o) => o.executionStatus !== 'MISSED')
          .flatMap((o) =>
            o.operationType === 'ENTRY' ? [o.endpoint.portId] : o.arrival ? [o.arrival.portId] : [],
          ),
      ),
    ]
    const candidates: OperationMomentDto[] = []
    let resolutionError: unknown
    for (const portId of portIds) {
      if (input.interpretationPortId && portId !== input.interpretationPortId) continue
      try {
        const resolution = resolveMoment(
          input.moment.localDateTime,
          ports.get(portId).initialZoneId,
          input.moment.selectedOffset,
        )
        const moments = resolution.status === 'RESOLVED' ? [resolution.moment] : resolution.choices
        if (
          resolution.status === 'RESOLVED' &&
          operations.some((o) =>
            [o.endpoint, o.arrival].some(
              (e) => e?.moment.utc.slice(0, 16) === resolution.moment.utc.slice(0, 16),
            ),
          )
        )
          throw new ArchiveError(
            'OPERATION_MINUTE_CONFLICT',
            'La nave ha già un estremo operativo nello stesso minuto UTC.',
          )
        const valid = moments.flatMap((moment) => {
          const context = repository.contextAt(input.vesselId, moment.utc)
          return context.status === 'IN_PORT' && context.portId === portId
            ? [{ moment, berthId: context.berthId }]
            : []
        })
        if (valid.length)
          candidates.push({
            portId,
            berthId: valid[0].berthId,
            resolution,
          })
      } catch (error) {
        resolutionError = error
      }
    }
    if (candidates.length > 1)
      throw new ArchiveError(
        'OPERATIONAL_CONTEXT_AMBIGUOUS',
        'L’ora locale corrisponde a più porti. Indica il porto di interpretazione fra quelli della cronologia.',
        [],
        candidates.map((c) => ({
          reference: { kind: 'PORT', id: c.portId, label: ports.get(c.portId).version.name },
          reason: 'Contesto candidato ammesso dalla cronologia.',
        })),
      )
    if (!candidates.length) {
      if (resolutionError && (portIds.length === 1 || input.interpretationPortId))
        throw resolutionError
      throw new ArchiveError(
        'OPERATIONAL_CONTEXT_MISSING',
        'Non esiste un contesto aperto al momento indicato o la nave è in trasferimento.',
      )
    }
    const result = candidates[0]
    if (input.operationType === 'MOVEMENT') {
      result.arrivalResolution = resolveMoment(
        input.arrivalMoment.localDateTime,
        ports.get(input.destinationPortId).initialZoneId,
        input.arrivalMoment.selectedOffset,
      )
    }
    return result
  }
  private validate(s: ArchiveApplicationSession, operation: VesselOperationDto) {
    const now = new Date().toISOString(),
      e = operation.endpoint
    new VesselRepository(s.database, now).requireSelectable(operation.vesselId)
    if (operation.operationType === 'ENTRY' || operation.operationType === 'MOVEMENT') {
      const destination = operation.arrival ?? e
      if (new PortRepository(s.database, () => now).get(destination.portId).status !== 'ACTIVE')
        throw new ArchiveError('NOT_SELECTABLE', 'Il porto non è selezionabile.')
      if (destination.berthId)
        new BerthRepository(s.database, now).requireSelectable(
          destination.portId,
          destination.berthId,
        )
    }
    validateOperationSequence([
      ...new OperationRepository(s.database).all(operation.vesselId),
      operation,
    ])
  }
  private effects(s: ArchiveApplicationSession, op: PreparedOperation): ChangeEffectDto[] {
    const reference = {
      kind: 'VESSEL_OPERATION' as const,
      id: op.id,
      label:
        op.operationType === 'ENTRY'
          ? 'Entrata'
          : op.operationType === 'MOVEMENT'
            ? 'Spostamento'
            : 'Uscita',
    }
    const effects: ChangeEffectDto[] = [
      {
        reference,
        versionId: null,
        action: 'CREATE',
        changes: [
          { field: 'status', before: null, after: op.executionStatus },
          { field: 'moment', before: null, after: op.endpoint.moment.utc },
          { field: 'port', before: null, after: op.endpoint.portName },
          { field: 'berth', before: null, after: op.endpoint.berthName },
          ...(op.arrival
            ? [
                { field: 'arrival', before: null, after: op.arrival.moment.utc },
                { field: 'destinationPort', before: null, after: op.arrival.portName },
                { field: 'destinationBerth', before: null, after: op.arrival.berthName },
              ]
            : []),
        ],
      },
      ...op.charges.map((c): ChangeEffectDto => ({
        reference: {
          kind: 'OPERATION_CHARGE',
          id: c.id,
          label: 'Componente ' + c.chargeKind + ' · ' + c.calculation.moment.utc,
        },
        versionId: null,
        action: 'CREATE',
        changes: [
          { field: 'port', before: null, after: c.calculation.portId },
          { field: 'moment', before: null, after: c.calculation.moment.utc },
          { field: 'calculatedBase', before: null, after: c.calculation.base },
          { field: 'manualOverride', before: null, after: c.manualOverrideAmount },
          { field: 'effectiveBase', before: null, after: c.effectiveBase },
        ],
      })),
    ]
    if (op.executionStatus !== 'MISSED' && op.operationType === 'MOVEMENT') {
      const repository = new OperationRepository(s.database)
      const ids = repository.openIds(op.vesselId, op.endpoint.moment.utc)
      const closure = repository.stayClosure(ids.berthStayId)
      effects.push(
        {
          reference: { kind: 'BERTH_STAY', id: ids.berthStayId, label: 'Ormeggio di origine' },
          versionId: null,
          action: 'UPDATE',
          changes: [
            { field: 'endedAt', before: closure.endedAt, after: op.endpoint.moment.utc },
            { field: 'closingOperationId', before: closure.closingOperationId, after: op.id },
          ],
        },
        {
          reference: {
            kind: 'BERTH_STAY',
            id: op.openingIds.berthStayId,
            label: 'Ormeggio di destinazione',
          },
          versionId: null,
          action: 'CREATE',
          changes: [
            { field: 'startedAt', before: null, after: op.arrival!.moment.utc },
            { field: 'portCallId', before: null, after: op.openingIds.portCallId },
            { field: 'berth', before: null, after: op.arrival!.berthName },
            { field: 'endedAt', before: null, after: closure.endedAt },
            { field: 'closingOperationId', before: null, after: closure.closingOperationId },
          ],
        },
      )
      if (op.arrival!.portId !== op.endpoint.portId) {
        effects.push(
          {
            reference: { kind: 'PORT_CALL', id: ids.portCallId, label: 'Visita di origine' },
            versionId: null,
            action: 'UPDATE',
            changes: [
              { field: 'endedAt', before: null, after: op.endpoint.moment.utc },
              { field: 'closingOperationId', before: null, after: op.id },
            ],
          },
          {
            reference: {
              kind: 'PORT_CALL',
              id: op.openingIds.portCallId,
              label: 'Visita di destinazione',
            },
            versionId: null,
            action: 'CREATE',
            changes: [
              { field: 'startedAt', before: null, after: op.arrival!.moment.utc },
              { field: 'voyageId', before: null, after: ids.voyageId },
              { field: 'port', before: null, after: op.arrival!.portName },
            ],
          },
        )
      }
    } else if (op.executionStatus !== 'MISSED') {
      const ids =
        op.operationType === 'ENTRY'
          ? op.openingIds
          : new OperationRepository(s.database).openIds(op.vesselId, op.endpoint.moment.utc)
      for (const [kind, label, id] of [
        ['VOYAGE', 'Viaggio', ids.voyageId],
        ['PORT_CALL', 'Visita', ids.portCallId],
        ['BERTH_STAY', 'Ormeggio', ids.berthStayId],
      ] as const)
        effects.push({
          reference: { kind, id, label },
          versionId: null,
          action: op.operationType === 'ENTRY' ? 'CREATE' : 'UPDATE',
          changes: [
            {
              field: op.operationType === 'ENTRY' ? 'startedAt' : 'endedAt',
              before: null,
              after: op.endpoint.moment.utc,
            },
          ],
        })
    }
    effects.push(
      ...subjectPlan(s.database, { pending: op }).effects.filter(
        (e) => !op.charges.some((c) => c.id === e.reference.id),
      ),
    )
    return effects
  }
  previewCreate: OperationApi['previewCreate'] = (request) =>
    this.coordinator.command(request, (s, payload) => {
      const { input, target } = parseMoment(payload, [
        'executionStatus',
        'notes',
        'manualOverrideAmount',
        ...(kind(payload) === 'MOVEMENT' &&
        Object.hasOwn(payload as object, 'arrivalManualOverrideAmount')
          ? ['arrivalManualOverrideAmount']
          : []),
      ])
      if (!['PLANNED', 'PERFORMED', 'MISSED'].includes(input.executionStatus as string))
        throw new ArchiveError('VALIDATION_ERROR', 'Stato operativo non valido.')
      if (
        input.notes !== null &&
        (typeof input.notes !== 'string' || [...input.notes].length > 10000)
      )
        throw new ArchiveError(
          'VALIDATION_ERROR',
          'Le note possono contenere al massimo 10000 caratteri.',
          [{ path: ['notes'], code: 'INVALID_TEXT', message: 'Controlla le note.' }],
        )
      const override =
        input.manualOverrideAmount === null
          ? null
          : Money.parse(input.manualOverrideAmount, 'manualOverrideAmount').text
      const arrivalOverride =
        !Object.hasOwn(input, 'arrivalManualOverrideAmount') ||
        input.arrivalManualOverrideAmount === null
          ? null
          : Money.parse(input.arrivalManualOverrideAmount, 'arrivalManualOverrideAmount').text
      const resolved = this.resolve(s, target)
      if (
        arrivalOverride !== null &&
        target.operationType === 'MOVEMENT' &&
        target.destinationPortId === resolved.portId
      )
        throw new ArchiveError(
          'VALIDATION_ERROR',
          'La sostituzione all’arrivo è ammessa solo per lo spostamento tra porti.',
          [
            {
              path: ['arrivalManualOverrideAmount'],
              code: 'NOT_APPLICABLE',
              message: 'Lo spostamento interno ha una sola componente alla partenza.',
            },
          ],
        )
      if (
        resolved.resolution.status !== 'RESOLVED' ||
        resolved.arrivalResolution?.status === 'CHOICE_REQUIRED'
      )
        throw new ArchiveError(
          'LOCAL_TIME_AMBIGUOUS',
          'Scegli esplicitamente l’occorrenza del momento operativo.',
        )
      const moment = resolved.resolution.moment,
        now = new Date().toISOString()
      const ports = new PortRepository(s.database, () => now),
        berths = new BerthRepository(s.database, now)
      const endpoint = (
        portId: string,
        berthId: string | null,
        moment: OperationEndpointDto['moment'],
        role: OperationEndpointDto['role'],
      ): OperationEndpointDto => {
        const applicable = <T extends { effectiveFrom: string | null; effectiveTo: string | null }>(
          versions: readonly T[],
        ) =>
          versions.find(
            (v) =>
              (!v.effectiveFrom || v.effectiveFrom <= moment.utc) &&
              (!v.effectiveTo || moment.utc < v.effectiveTo),
          )!
        const portVersion = applicable(ports.versions(portId)),
          berthVersion = berthId ? applicable(berths.versions(berthId)) : null
        const vesselVersion = applicable(
          new VesselRepository(s.database, now).versions(target.vesselId),
        )
        return {
          id: randomUUID(),
          role,
          vesselVersionId: vesselVersion.id,
          moment,
          portId,
          portVersionId: portVersion.id,
          portName: portVersion.name,
          berthId,
          berthVersionId: berthVersion?.id ?? null,
          berthName: berthVersion?.name ?? null,
        }
      }
      const operation: PreparedOperation = {
        openingIds: {
          ...(target.operationType === 'MOVEMENT'
            ? new OperationRepository(s.database).openIds(target.vesselId, moment.utc)
            : { voyageId: randomUUID(), portCallId: randomUUID() }),
          ...(target.operationType === 'MOVEMENT' && target.destinationPortId !== resolved.portId
            ? { portCallId: randomUUID() }
            : {}),
          berthStayId: randomUUID(),
        },
        id: randomUUID(),
        vesselId: target.vesselId,
        vesselVersionId: '',
        operationType: target.operationType,
        executionStatus: input.executionStatus as VesselOperationDto['executionStatus'],
        notes: input.notes as string | null,
        endpoint: endpoint(
          resolved.portId,
          resolved.berthId,
          moment,
          target.operationType === 'MOVEMENT' ? 'DEPARTURE' : 'OCCURRENCE',
        ),
        arrival:
          target.operationType === 'MOVEMENT' && resolved.arrivalResolution?.status === 'RESOLVED'
            ? endpoint(
                target.destinationPortId,
                target.destinationBerthId,
                resolved.arrivalResolution.moment,
                'ARRIVAL',
              )
            : null,
        charges: [],
        totalBase: '0.00',
      }
      this.validate(s, operation)
      const external = operation.arrival && operation.arrival.portId !== operation.endpoint.portId
      operation.charges = (
        external
          ? [
              { endpoint: operation.endpoint, kind: 'EXIT' as const, override },
              { endpoint: operation.arrival!, kind: 'ENTRY' as const, override: arrivalOverride },
            ]
          : [{ endpoint: operation.endpoint, kind: target.operationType, override }]
      ).map(({ endpoint: e, kind, override }) => {
        const calculation = calculateBase(s.database, {
          portId: e.portId,
          vesselId: target.vesselId,
          moment: e.moment,
          activity: { kind: 'OPERATION', operation: kind },
        })
        return {
          subjects: { customer: null, agency: null },
          id: randomUUID(),
          chargeKind: kind,
          economicEndpointRole: e.role,
          calculation,
          manualOverrideAmount: override,
          effectiveBase: override ?? calculation.base,
        }
      })
      operation.vesselVersionId = operation.endpoint.vesselVersionId
      operation.totalBase = operationTotal(operation.charges)
      operation.charges = subjectPlan(s.database, { pending: operation }).subjectsFor(operation)
      const entry = s.previews.put(namespace, s.context(), operation)
      return this.previewDto(s, operation, entry, 1, 50)
    })
  private previewDto(
    s: ArchiveApplicationSession,
    op: PreparedOperation,
    entry: { previewId: string; generatedAtUtc: string; expiresAtUtc: string },
    page: number,
    pageSize: number,
  ) {
    this.validate(s, op)
    const effects = this.effects(s, op)
    return {
      previewId: entry.previewId,
      generatedAtUtc: entry.generatedAtUtc,
      expiresAtUtc: entry.expiresAtUtc,
      operation: namespace,
      context: s.context(),
      status: 'READY' as const,
      summary: {
        created: effects.filter((e) => e.action === 'CREATE').length,
        updated: effects.filter((e) => e.action === 'UPDATE').length,
        deleted: 0,
        recalculated: 0,
        reattributed: effects.filter(
          (e) => e.action === 'UPDATE' && e.reference.kind === 'OPERATION_CHARGE',
        ).length,
      },
      effects: {
        items: effects.slice((page - 1) * pageSize, page * pageSize),
        total: effects.length,
        page,
        pageSize,
      },
      warnings: [
        'L’importo è una base in EUR. Consuntivazione e correzioni strutturali non sono ancora disponibili.',
      ],
      blockers: [],
      operationValues: {
        id: op.id,
        vesselId: op.vesselId,
        vesselVersionId: op.vesselVersionId,
        operationType: op.operationType,
        executionStatus: op.executionStatus,
        notes: op.notes,
        endpoint: op.endpoint,
        arrival: op.arrival,
        charges: op.charges,
        totalBase: operationTotal(op.charges),
      },
    }
  }
  previewEffects: OperationApi['previewEffects'] = (request) =>
    this.coordinator.query(request, (s, q) => {
      const i = record(q, ['previewId', 'page', 'pageSize']),
        id = entityId(i.previewId, 'previewId'),
        p = pagination(i.page, i.pageSize)
      const entry = s.previews.get(id, namespace, s.context())
      return this.previewDto(
        s,
        entry.input as PreparedOperation,
        { ...entry, previewId: id },
        p.page,
        p.pageSize,
      )
    })
  confirmCreate: OperationApi['confirmCreate'] = (request) => {
    let consumed = ''
    return this.coordinator.command(
      request,
      (s, p) => {
        const id = entityId(record(p, ['previewId']).previewId, 'previewId'),
          op = s.previews.get(id, namespace, s.context()).input as PreparedOperation
        this.validate(s, op)
        op.charges = op.charges.map((c) => {
          const e = c.economicEndpointRole === 'ARRIVAL' ? op.arrival! : op.endpoint
          const calculation = calculateBase(s.database, {
            portId: e.portId,
            vesselId: op.vesselId,
            moment: e.moment,
            activity: { kind: 'OPERATION', operation: c.chargeKind },
          })
          return { ...c, calculation, effectiveBase: c.manualOverrideAmount ?? calculation.base }
        })
        const repository = new OperationRepository(s.database)
        const subjects = subjectPlan(s.database, { pending: op })
        op.charges = subjects.subjectsFor(op)
        repository.insert(op, op.openingIds)
        subjects.apply()
        consumed = id
        return repository.get(op.id)
      },
      (s) => s.previews.consume(consumed),
    )
  }
}
