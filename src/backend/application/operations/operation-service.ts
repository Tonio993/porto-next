import { randomUUID } from 'node:crypto'
import type {
  OperationApi,
  OperationMomentInput,
  OperationMomentDto,
  VesselOperationDto,
} from '../../../shared/contracts/operations'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { validateOperationSequence } from '../../domain/operations/sequence'
import { resolveMoment } from '../../domain/values/moments'
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
  if (type !== 'ENTRY' && type !== 'EXIT')
    throw new ArchiveError('VALIDATION_ERROR', 'Scegli entrata o uscita.')
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
  ])
  const common = {
    operationType,
    vesselId: entityId(input.vesselId, 'vesselId'),
    moment: momentInput(input.moment),
  }
  const target: OperationMomentInput =
    operationType === 'ENTRY'
      ? {
          ...common,
          operationType,
          portId: entityId(input.portId, 'portId'),
          berthId: input.berthId === null ? null : entityId(input.berthId, 'berthId'),
        }
      : {
          ...common,
          operationType,
          interpretationPortId:
            input.interpretationPortId === null
              ? null
              : entityId(input.interpretationPortId, 'interpretationPortId'),
        }
  return { input, target }
}
export class OperationService implements OperationApi {
  constructor(private readonly coordinator: ArchiveCoordinator) {}
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
    const operations = new OperationRepository(s.database).all(input.vesselId)
    const portIds = [
      ...new Set(
        operations
          .filter((o) => o.operationType === 'ENTRY' && o.executionStatus !== 'MISSED')
          .map((o) => o.endpoint.portId),
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
          operations.some(
            (o) => o.endpoint.moment.utc.slice(0, 16) === resolution.moment.utc.slice(0, 16),
          )
        )
          throw new ArchiveError(
            'OPERATION_MINUTE_CONFLICT',
            'La nave ha già un estremo operativo nello stesso minuto UTC.',
          )
        const valid = moments.flatMap((moment) => {
          const previous = operations
            .filter((o) => o.executionStatus !== 'MISSED' && o.endpoint.moment.utc < moment.utc)
            .at(-1)
          return previous?.operationType === 'ENTRY' && previous.endpoint.portId === portId
            ? [{ moment, berthId: previous.endpoint.berthId }]
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
      if (resolutionError && portIds.length === 1) throw resolutionError
      throw new ArchiveError(
        'OPERATIONAL_CONTEXT_MISSING',
        'Non esiste un viaggio aperto al momento dell’uscita.',
      )
    }
    return candidates[0]
  }
  private validate(s: ArchiveApplicationSession, operation: VesselOperationDto) {
    const now = new Date().toISOString(),
      e = operation.endpoint
    new VesselRepository(s.database, now).requireSelectable(operation.vesselId)
    if (operation.operationType === 'ENTRY') {
      if (new PortRepository(s.database, () => now).get(e.portId).status !== 'ACTIVE')
        throw new ArchiveError('NOT_SELECTABLE', 'Il porto non è selezionabile.')
      if (e.berthId) new BerthRepository(s.database, now).requireSelectable(e.portId, e.berthId)
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
      label: op.operationType === 'ENTRY' ? 'Entrata' : 'Uscita',
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
        ],
      },
      {
        reference: { kind: 'OPERATION_CHARGE', id: op.charge.id, label: 'Componente economica' },
        versionId: null,
        action: 'CREATE',
        changes: [
          { field: 'calculatedBase', before: null, after: op.charge.calculation.base },
          { field: 'manualOverride', before: null, after: op.charge.manualOverrideAmount },
          { field: 'effectiveBase', before: null, after: op.charge.effectiveBase },
        ],
      },
    ]
    if (op.executionStatus !== 'MISSED') {
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
    return effects
  }
  previewCreate: OperationApi['previewCreate'] = (request) =>
    this.coordinator.command(request, (s, payload) => {
      const { input, target } = parseMoment(payload, [
        'executionStatus',
        'notes',
        'manualOverrideAmount',
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
      const resolved = this.resolve(s, target)
      if (resolved.resolution.status !== 'RESOLVED')
        throw new ArchiveError(
          'LOCAL_TIME_AMBIGUOUS',
          'Scegli esplicitamente l’occorrenza del momento operativo.',
        )
      const moment = resolved.resolution.moment,
        now = new Date().toISOString()
      const ports = new PortRepository(s.database, () => now),
        berths = new BerthRepository(s.database, now)
      const portVersion = ports
        .versions(resolved.portId)
        .find(
          (v) =>
            (!v.effectiveFrom || v.effectiveFrom <= moment.utc) &&
            (!v.effectiveTo || moment.utc < v.effectiveTo),
        )!
      const berthVersion = resolved.berthId
        ? berths
            .versions(resolved.berthId)
            .find(
              (v) =>
                (!v.effectiveFrom || v.effectiveFrom <= moment.utc) &&
                (!v.effectiveTo || moment.utc < v.effectiveTo),
            )!
        : null
      const operation: PreparedOperation = {
        openingIds: { voyageId: randomUUID(), portCallId: randomUUID(), berthStayId: randomUUID() },
        id: randomUUID(),
        vesselId: target.vesselId,
        vesselVersionId: '',
        operationType: target.operationType,
        executionStatus: input.executionStatus as VesselOperationDto['executionStatus'],
        notes: input.notes as string | null,
        endpoint: {
          id: randomUUID(),
          role: 'OCCURRENCE',
          moment,
          portId: resolved.portId,
          portVersionId: portVersion.id,
          portName: portVersion.name,
          berthId: resolved.berthId,
          berthVersionId: berthVersion?.id ?? null,
          berthName: berthVersion?.name ?? null,
        },
        charge: null!,
      }
      this.validate(s, operation)
      const calculation = calculateBase(s.database, {
        portId: resolved.portId,
        vesselId: target.vesselId,
        moment,
        activity: { kind: 'OPERATION', operation: target.operationType },
      })
      operation.vesselVersionId = calculation.vesselVersionId
      operation.charge = {
        id: randomUUID(),
        chargeKind: target.operationType,
        economicEndpointRole: 'OCCURRENCE',
        calculation,
        manualOverrideAmount: override,
        effectiveBase: override ?? calculation.base,
      }
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
        reattributed: 0,
      },
      effects: {
        items: effects.slice((page - 1) * pageSize, page * pageSize),
        total: effects.length,
        page,
        pageSize,
      },
      warnings: [
        'L’importo è una base in EUR. Spostamenti, consuntivazione e correzioni strutturali non sono ancora disponibili.',
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
        charge: op.charge,
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
        const calculation = calculateBase(s.database, {
          portId: op.endpoint.portId,
          vesselId: op.vesselId,
          moment: op.endpoint.moment,
          activity: { kind: 'OPERATION', operation: op.operationType },
        })
        op.vesselVersionId = calculation.vesselVersionId
        op.charge = {
          ...op.charge,
          calculation,
          effectiveBase: op.charge.manualOverrideAmount ?? calculation.base,
        }
        const repository = new OperationRepository(s.database)
        repository.insert(op, op.openingIds)
        consumed = id
        return repository.get(op.id)
      },
      (s) => s.previews.consume(consumed),
    )
  }
}
