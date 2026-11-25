import { describeEffects } from '../presentation/effect-descriptions'
import { ReadDescriptions } from '../presentation/read-descriptions'
import type { ConflictDto } from '../../../shared/contracts/application'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import type {
  CreateOperationDto,
  OperationApi,
  OperationPreviewDto,
} from '../../../shared/contracts/operations'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { AssignmentRepository } from '../../infrastructure/database/assignment-repository'
import {
  OperationRepository,
  type OpeningIds,
} from '../../infrastructure/database/operation-repository'
import { assertReplayIntegrity } from '../../infrastructure/database/operation-replay-repository'
import type { ArchiveApplicationSession, ArchiveCoordinator } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import type { PreparedOperation } from './operation-service'
import { operationReplay, serviceReplayEffects } from './operation-replay'

const namespace = 'OPERATION_INSERT_RETROACTIVE'
type Prepared = {
  input: CreateOperationDto
  operation: PreparedOperation
  openings: Map<string, OpeningIds>
  originalBlockers: ConflictDto[]
}
type Prepare = (
  session: ArchiveApplicationSession,
  input: CreateOperationDto,
  identity?: PreparedOperation,
) => PreparedOperation

export class OperationInsertion {
  constructor(
    private readonly coordinator: ArchiveCoordinator,
    private readonly prepare: Prepare,
  ) {}

  private analyze(s: ArchiveApplicationSession, prepared: Prepared, operation?: PreparedOperation) {
    const after = operation ?? this.prepare(s, prepared.input, prepared.operation)
    const effects: ChangeEffectDto[] = [
      {
        reference: { kind: 'VESSEL_OPERATION', id: after.id, label: 'Operazione retroattiva' },
        versionId: null,
        action: 'CREATE',
        changes: [
          { field: 'status', before: null, after: after.executionStatus },
          { field: 'moment', before: null, after: after.endpoint.moment.utc },
          { field: 'port', before: null, after: after.endpoint.portName },
          { field: 'berth', before: null, after: after.endpoint.berthName },
          { field: 'Arrivo', before: null, after: after.arrival?.moment.utc ?? null },
          { field: 'Porto di destinazione', before: null, after: after.arrival?.portName ?? null },
          { field: 'effectiveBase', before: null, after: after.totalBase },
        ],
      },
    ]
    const blockers: ConflictDto[] = []
    try {
      const operations = [...new OperationRepository(s.database).all(), after]
      const { subjects, persistence } = operationReplay(
        s.database,
        operations,
        after.vesselId,
        prepared.openings,
      )
      after.charges = subjects.subjectsFor(after)
      effects.push(
        ...persistence.effects,
        ...subjects.effects.filter(
          (e) =>
            e.reference.kind !== 'SERVICE_ACTIVITY' &&
            !after.charges.some((c) => c.id === e.reference.id),
        ),
        ...subjects.serviceUpdates.flatMap((u) =>
          serviceReplayEffects(
            { kind: 'SERVICE_ACTIVITY', id: u.before.id, label: u.before.description },
            u.before,
            u.after,
            s.database,
          ),
        ),
        ...after.charges.map((c): ChangeEffectDto => ({
          reference: { kind: 'OPERATION_CHARGE', id: c.id, label: 'Nuova componente economica' },
          versionId: null,
          action: 'CREATE',
          changes: [
            { field: 'calculatedBase', before: null, after: c.calculation.base },
            { field: 'manualOverride', before: null, after: c.manualOverrideAmount },
            { field: 'effectiveBase', before: null, after: c.effectiveBase },
          ],
        })),
      )
      blockers.push(...persistence.blockers)
      return {
        after,
        effects,
        blockers,
        recalculated:
          after.charges.length +
          subjects.serviceUpdates.filter(
            (u) => u.before.category === 'CATALOG' && u.before.calculation !== u.after.calculation,
          ).length,
        apply: () => {
          s.database.sqlite.pragma('defer_foreign_keys=ON')
          new OperationRepository(s.database).insertRecords(after)
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
        reference: { kind: 'VESSEL_OPERATION', id: after.id, label: 'Sequenza e prestazioni' },
        reason: error.message,
      })
      return { after, effects, blockers, recalculated: 0, apply: () => {} }
    }
  }

  private dto(
    s: ArchiveApplicationSession,
    prepared: Prepared,
    entry: { previewId: string; generatedAtUtc: string; expiresAtUtc: string },
    page = 1,
    pageSize = 50,
    a = this.analyze(s, prepared),
  ): OperationPreviewDto {
    const operationValues = {
      id: a.after.id,
      vesselId: a.after.vesselId,
      vesselVersionId: a.after.vesselVersionId,
      operationType: a.after.operationType,
      executionStatus: a.after.executionStatus,
      notes: a.after.notes,
      endpoint: a.after.endpoint,
      arrival: a.after.arrival,
      charges: a.after.charges,
      totalBase: a.after.totalBase,
    }
    const descriptions = new ReadDescriptions(s.database)
    return {
      ...entry,
      context: s.context(),
      operation: namespace,
      status: a.blockers.length || prepared.originalBlockers.length ? 'BLOCKED' : 'READY',
      operationValues: descriptions.operation(operationValues),
      summary: {
        created: a.effects.filter((e) => e.action === 'CREATE').length,
        updated: a.effects.filter((e) => e.action === 'UPDATE').length,
        deleted: a.effects.filter((e) => e.action === 'DELETE').length,
        reattributed: a.effects.filter((e) => e.reference.kind === 'SERVICE_ACTIVITY').length,
        recalculated: a.recalculated,
      },
      effects: {
        items: describeEffects(
          s.database,
          a.effects.slice((page - 1) * pageSize, page * pageSize),
          a.after,
          descriptions.references,
        ),
        total: a.effects.length,
        page,
        pageSize,
      },
      blockers: a.blockers.length ? a.blockers : prepared.originalBlockers,
      warnings: [
        'Gli importi sono basi in EUR. L’intera cronologia viene riesaminata alla conferma.',
      ],
    }
  }

  previewInsert: OperationApi['previewInsert'] = (request) =>
    this.coordinator.command(request, (s, input) => {
      const operation = this.prepare(s, input)
      const openings = new Map(new AssignmentRepository(s.database).openings())
      openings.set(operation.id, operation.openingIds)
      const prepared: Prepared = { input, operation, openings, originalBlockers: [] }
      const analysis = this.analyze(s, prepared, operation)
      prepared.originalBlockers = analysis.blockers
      const entry = s.previews.put(namespace, s.context(), prepared)
      return this.dto(s, prepared, entry, 1, 50, analysis)
    })

  insertionEffects: OperationApi['insertionEffects'] = (request) =>
    this.coordinator.query(request, (s, query) => {
      const p = record(query, ['previewId', 'page', 'pageSize']),
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

  confirmInsert: OperationApi['confirmInsert'] = (request) => {
    let consumed = ''
    return this.coordinator.command(
      request,
      (s, payload) => {
        const id = entityId(record(payload, ['previewId']).previewId, 'previewId'),
          entry = s.previews.get(id, namespace, s.context()),
          prepared = entry.input as Prepared,
          a = this.analyze(s, prepared)
        const blockers = prepared.originalBlockers.length ? prepared.originalBlockers : a.blockers
        if (blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'L’inserimento retroattivo non è consentito. Genera una nuova anteprima dopo aver risolto i blocchi.',
            [],
            blockers,
          )
        a.apply()
        consumed = id
        return new OperationRepository(s.database).get(a.after.id)
      },
      (s) => s.previews.consume(consumed),
    )
  }
}
