import { describeEffects } from '../presentation/effect-descriptions'
import { randomUUID } from 'node:crypto'
import type {
  CatalogApi,
  WeightChangeDto,
  WeightPreviewDto,
  WeightVersionDto,
} from '../../../shared/contracts/catalog'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { positiveDecimal } from '../../domain/values/numbers'
import { resolveMoment } from '../../domain/values/moments'
import { versionSequence } from '../../domain/ports/version-sequence'
import { WeightRepository } from '../../infrastructure/database/weight-repository'
import { ArchiveCoordinator, type ArchiveApplicationSession } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { versionMoment } from '../ports/version-change'
import { companyVersionZone } from '../time/company-version-zone'
import { economicSequenceImpacts } from '../operations/operation-impacts'

type Change = {
  operation: WeightChangeDto['operation']
  sequenceId: string
  versionId: string
  version: WeightVersionDto | null
  blocked: boolean
}
const namespace = 'WEIGHT_CHANGE'
const text = (value: unknown) =>
  value == null ? null : typeof value === 'object' ? JSON.stringify(value) : String(value)
export class WeightService {
  constructor(private readonly coordinator: ArchiveCoordinator) {}
  weightHistory: CatalogApi['weightHistory'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const input = record(query, ['sequenceId', 'page', 'pageSize'])
      const sequenceId = entityId(input.sequenceId, 'sequenceId'),
        { page, pageSize } = pagination(input.page, input.pageSize)
      const repository = new WeightRepository(session.database),
        versions = repository.versions(sequenceId)
      return {
        sequenceId,
        ...repository.owner(sequenceId),
        versions: {
          items: versions.slice((page - 1) * pageSize, page * pageSize),
          total: versions.length,
          page,
          pageSize,
        },
      }
    })
  getWeight: CatalogApi['getWeight'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const input = record(query, ['sequenceId', 'versionId'])
      return new WeightRepository(session.database).get(
        entityId(input.sequenceId, 'sequenceId'),
        entityId(input.versionId, 'versionId'),
      )
    })
  resolveWeightMoment: CatalogApi['resolveWeightMoment'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const m = record(record(query, ['moment']).moment, ['localDateTime', 'selectedOffset'])
      return resolveMoment(m.localDateTime, companyVersionZone(session.database), m.selectedOffset)
    })
  private parse(session: ArchiveApplicationSession, payload: unknown): Change {
    const kind = (payload as WeightChangeDto | null)?.operation
    if (!kind || !['INSERT', 'UPDATE', 'DELETE'].includes(kind))
      throw new ArchiveError('VALIDATION_ERROR', 'Operazione sul peso non valida.')
    const input = record(
      payload,
      kind === 'DELETE'
        ? ['operation', 'sequenceId', 'versionId']
        : kind === 'INSERT'
          ? ['operation', 'sequenceId', 'moment', 'weight']
          : ['operation', 'sequenceId', 'versionId', 'moment', 'weight'],
    )
    const sequenceId = entityId(input.sequenceId, 'sequenceId'),
      repository = new WeightRepository(session.database)
    repository.owner(sequenceId)
    const versionId = kind === 'INSERT' ? randomUUID() : entityId(input.versionId, 'versionId')
    const existing = kind === 'INSERT' ? undefined : repository.get(sequenceId, versionId)
    if (kind === 'DELETE') {
      if (existing!.effectiveFrom === null)
        throw new ArchiveError('VALIDATION_ERROR', 'Il peso iniziale non può essere eliminato.')
      return { operation: kind, sequenceId, versionId, version: null, blocked: false }
    }
    const weight = positiveDecimal(input.weight, 'weight')
    const moment = versionMoment(
      existing,
      input.moment,
      existing?.effectiveFrom === null ? '' : companyVersionZone(session.database),
    )
    return {
      operation: kind,
      sequenceId,
      versionId,
      blocked: false,
      version: {
        id: versionId,
        sequenceId,
        weight,
        effectiveFrom: moment?.utc ?? null,
        effectiveMoment: moment,
        effectiveTo: null,
        phase: 'CURRENT',
      },
    }
  }
  private analyze(session: ArchiveApplicationSession, change: Change) {
    const now = new Date().toISOString(),
      repository = new WeightRepository(session.database, now)
    const { owner, label } = repository.owner(change.sequenceId),
      before = repository.versions(change.sequenceId)
    const after = versionSequence(
      [
        ...before.filter((v) => v.id !== change.versionId),
        ...(change.version ? [change.version] : []),
      ],
      now,
    )
    const effects: ChangeEffectDto[] = [],
      changedIds: string[] = []
    for (const id of new Set([...before, ...after].map((v) => v.id))) {
      const old = before.find((v) => v.id === id),
        next = after.find((v) => v.id === id)
      const changes = (
        ['weight', 'effectiveFrom', 'effectiveMoment', 'effectiveTo'] as const
      ).flatMap((field) => {
        const a = text(old?.[field]),
          b = text(next?.[field])
        return a === b ? [] : [{ field, before: a, after: b }]
      })
      if (!changes.length) continue
      if (old) changedIds.push(id)
      effects.push({
        reference: {
          kind: 'WEIGHT_VERSION',
          id,
          label: label + ' · ' + (next?.effectiveFrom ?? old?.effectiveFrom ?? 'Peso iniziale'),
        },
        versionId: id,
        versionReference: {
          kind: 'WEIGHT_VERSION',
          name: label,
          effectiveFrom: (next ?? old)!.effectiveFrom,
          effectiveTo: (next ?? old)!.effectiveTo,
          effectiveMoment: (next ?? old)!.effectiveMoment,
        },
        action: !old ? 'CREATE' : !next ? 'DELETE' : 'UPDATE',
        changes,
      })
    }
    const impacts = economicSequenceImpacts(session.database, (_portId, utc, activity) => {
      const matches =
        owner.kind === 'OPERATION'
          ? activity.kind === 'OPERATION' && activity.operation === owner.operation
          : activity.kind === 'CATALOG' && activity.serviceTypeId === owner.serviceTypeId
      if (!matches) return undefined
      const next = after.find(
        (v) =>
          (!v.effectiveFrom || v.effectiveFrom <= utc) && (!v.effectiveTo || utc < v.effectiveTo),
      )!
      return { weight: next }
    })
    effects.push(...impacts.effects)
    return { repository, effects, impacts, after, blockers: repository.blockers(changedIds) }
  }
  previewWeight: CatalogApi['previewWeight'] = (request) =>
    this.coordinator.command(request, (session, payload) => {
      const change = this.parse(session, payload),
        analysis = this.analyze(session, change)
      change.blocked = analysis.blockers.length > 0
      const entry = session.previews.put(namespace, session.context(), change)
      return this.dto(session, change, entry, 1, 50)
    })
  private dto(
    session: ArchiveApplicationSession,
    change: Change,
    entry: { previewId: string; generatedAtUtc: string; expiresAtUtc: string },
    page: number,
    pageSize: number,
  ): WeightPreviewDto {
    const { effects, impacts, blockers, after } = this.analyze(session, change)
    return {
      previewId: entry.previewId,
      generatedAtUtc: entry.generatedAtUtc,
      expiresAtUtc: entry.expiresAtUtc,
      operation: 'WEIGHT_' + change.operation,
      context: session.context(),
      status: change.blocked || blockers.length ? 'BLOCKED' : 'READY',
      sequenceId: change.sequenceId,
      versionId: change.versionId,
      version: after.find((v) => v.id === change.versionId) ?? null,
      summary: {
        created: effects.filter((e) => e.action === 'CREATE').length,
        updated: effects.filter((e) => e.action === 'UPDATE').length,
        deleted: effects.filter((e) => e.action === 'DELETE').length,
        reattributed: 0,
        recalculated: impacts.recalculated,
      },
      effects: {
        items: describeEffects(
          session.database,
          effects.slice((page - 1) * pageSize, page * pageSize),
        ),
        total: effects.length,
        page,
        pageSize,
      },
      blockers,
      warnings: [
        'I calcoli teorici e i riferimenti vengono aggiornati. Le basi FREE e le sostituzioni manuali, incluso zero, restano conservate.',
      ],
    }
  }
  weightEffects: CatalogApi['weightEffects'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const input = record(query, ['previewId', 'page', 'pageSize']),
        id = entityId(input.previewId, 'previewId'),
        { page, pageSize } = pagination(input.page, input.pageSize)
      const entry = session.previews.get(id, namespace, session.context())
      return this.dto(session, entry.input as Change, { ...entry, previewId: id }, page, pageSize)
    })
  confirmWeight: CatalogApi['confirmWeight'] = (request) => {
    let consumed = ''
    return this.coordinator.command(
      request,
      (session, payload) => {
        const id = entityId(record(payload, ['previewId']).previewId, 'previewId'),
          change = session.previews.get(id, namespace, session.context()).input as Change
        const { repository, effects, impacts, blockers } = this.analyze(session, change)
        if (change.blocked || blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'I riferimenti impediscono la modifica del peso. Risolvi i blocchi e genera una nuova anteprima.',
            [],
            blockers,
          )
        if (effects.length) {
          if (change.version) repository.save(change.version, change.operation === 'INSERT')
          impacts.apply()
          if (!change.version) repository.remove(change.versionId)
        }
        consumed = id
        return { sequenceId: change.sequenceId, versionId: change.versionId }
      },
      (session) => session.previews.consume(consumed),
    )
  }
}
