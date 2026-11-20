import type { ConflictDto } from '../../../shared/contracts/application'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import type {
  OperationApi,
  OperationDeletionPreviewDto,
} from '../../../shared/contracts/operations'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { AssignmentRepository } from '../../infrastructure/database/assignment-repository'
import { OperationRepository } from '../../infrastructure/database/operation-repository'
import {
  assertReplayIntegrity,
  operationDeletionBlockers,
  removeOperation,
  updateOperationNotes,
} from '../../infrastructure/database/operation-replay-repository'
import type { ArchiveApplicationSession, ArchiveCoordinator } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { operationReplay, serviceValues } from './operation-replay'
import { subjectEffects } from './subject-resolution'

const namespace = 'OPERATION_DELETE'
type Prepared = { id: string; originalBlockers: ConflictDto[] }

export class OperationRemoval {
  constructor(private readonly coordinator: ArchiveCoordinator) {}

  private analyze(s: ArchiveApplicationSession, prepared: Prepared) {
    const repository = new OperationRepository(s.database)
    const before = repository.get(prepared.id)
    const effects: ChangeEffectDto[] = [
      {
        reference: { kind: 'VESSEL_OPERATION', id: before.id, label: 'Operazione da eliminare' },
        versionId: null,
        action: 'DELETE',
        changes: [
          { field: 'Tipologia', before: before.operationType, after: null },
          { field: 'status', before: before.executionStatus, after: null },
          { field: 'moment', before: before.endpoint.moment.utc, after: null },
          { field: 'port', before: before.endpoint.portName, after: null },
          { field: 'Arrivo', before: before.arrival?.moment.utc ?? null, after: null },
          { field: 'Note', before: before.notes, after: null },
        ],
      },
      ...before.charges.map((c): ChangeEffectDto => ({
        reference: {
          kind: 'OPERATION_CHARGE',
          id: c.id,
          label: 'Componente economica da eliminare',
        },
        versionId: null,
        action: 'DELETE',
        changes: [{ field: 'effectiveBase', before: c.effectiveBase, after: null }],
      })),
    ]
    const blockers = operationDeletionBlockers(s.database, before)
    try {
      const { subjects, persistence } = operationReplay(
        s.database,
        repository.all().filter((o) => o.id !== before.id),
        before.vesselId,
        new AssignmentRepository(s.database).openings(),
      )
      effects.push(
        ...persistence.effects,
        ...subjects.effects.filter((e) => e.reference.kind !== 'SERVICE_ACTIVITY'),
        ...subjects.serviceUpdates.flatMap((u) =>
          subjectEffects(
            { kind: 'SERVICE_ACTIVITY', id: u.before.id, label: u.before.description },
            serviceValues(u.before),
            serviceValues(u.after),
          ),
        ),
      )
      blockers.push(...persistence.blockers)
      return {
        before,
        effects,
        blockers,
        recalculated: subjects.serviceUpdates.filter(
          (u) => u.before.category === 'CATALOG' && u.before.calculation !== u.after.calculation,
        ).length,
        apply: () => {
          s.database.sqlite.pragma('defer_foreign_keys=ON')
          persistence.apply()
          subjects.apply()
          removeOperation(s.database, before)
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
      return { before, effects, blockers, recalculated: 0, apply: () => {} }
    }
  }

  private dto(
    s: ArchiveApplicationSession,
    prepared: Prepared,
    entry: { previewId: string; generatedAtUtc: string; expiresAtUtc: string },
    page = 1,
    pageSize = 50,
    a = this.analyze(s, prepared),
  ): OperationDeletionPreviewDto {
    return {
      ...entry,
      context: s.context(),
      operation: namespace,
      before: a.before,
      status: a.blockers.length || prepared.originalBlockers.length ? 'BLOCKED' : 'READY',
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
      warnings: [
        'L’operazione e le sue componenti economiche saranno eliminate. Le prestazioni collegate vengono conservate: la rimozione è vietata se perdono un contesto valido.',
      ],
    }
  }

  previewDelete: OperationApi['previewDelete'] = (request) =>
    this.coordinator.command(request, (s, payload) => {
      const id = entityId(record(payload, ['id']).id, 'id')
      const prepared: Prepared = { id, originalBlockers: [] }
      const analysis = this.analyze(s, prepared)
      prepared.originalBlockers = analysis.blockers
      const entry = s.previews.put(namespace, s.context(), prepared)
      return this.dto(s, prepared, entry, 1, 50, analysis)
    })

  deletionEffects: OperationApi['deletionEffects'] = (request) =>
    this.coordinator.query(request, (s, query) => {
      const p = record(query, ['previewId', 'page', 'pageSize'])
      const id = entityId(p.previewId, 'previewId'),
        paging = pagination(p.page, p.pageSize)
      const entry = s.previews.get(id, namespace, s.context())
      return this.dto(
        s,
        entry.input as Prepared,
        { ...entry, previewId: id },
        paging.page,
        paging.pageSize,
      )
    })

  confirmDelete: OperationApi['confirmDelete'] = (request) => {
    let consumed = ''
    return this.coordinator.command(
      request,
      (s, payload) => {
        const id = entityId(record(payload, ['previewId']).previewId, 'previewId')
        const entry = s.previews.get(id, namespace, s.context()),
          prepared = entry.input as Prepared
        const analysis = this.analyze(s, prepared)
        const blockers = prepared.originalBlockers.length
          ? prepared.originalBlockers
          : analysis.blockers
        if (blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'L’eliminazione non è consentita. Genera una nuova anteprima dopo aver risolto i blocchi.',
            [],
            blockers,
          )
        analysis.apply()
        consumed = id
        return { id: prepared.id }
      },
      (s) => s.previews.consume(consumed),
    )
  }

  updateNotes: OperationApi['updateNotes'] = (request) =>
    this.coordinator.command(request, (s, payload) => {
      const p = record(payload, ['id', 'notes']),
        id = entityId(p.id, 'id')
      if (p.notes !== null && (typeof p.notes !== 'string' || [...p.notes].length > 10000))
        throw new ArchiveError(
          'VALIDATION_ERROR',
          'Le note ammettono al massimo 10000 caratteri.',
          [
            {
              path: ['notes'],
              code: 'INVALID_VALUE',
              message: 'Indica note di al massimo 10000 caratteri oppure nessuna nota.',
            },
          ],
        )
      const repository = new OperationRepository(s.database)
      repository.get(id)
      updateOperationNotes(s.database, id, p.notes as string | null)
      return repository.get(id)
    })
}
