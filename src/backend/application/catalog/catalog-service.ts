import { WeightService } from './weight-service'
import { WeightRepository } from '../../infrastructure/database/weight-repository'
import type { CatalogApi, CatalogChange } from '../../../shared/contracts/catalog'
import type { ChangeEffectDto, ChangePreviewDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { identifierText } from '../../domain/values/identifiers'
import { positiveDecimal } from '../../domain/values/numbers'
import { CatalogRepository } from '../../infrastructure/database/catalog-repository'
import { ArchiveCoordinator, type ArchiveApplicationSession } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'

const namespace = 'CATALOG_CHANGE'
export class CatalogService implements CatalogApi {
  private readonly weights: WeightService
  constructor(private readonly coordinator: ArchiveCoordinator) {
    this.weights = new WeightService(coordinator)
  }
  weightHistory: CatalogApi['weightHistory'] = (request) => this.weights.weightHistory(request)
  getWeight: CatalogApi['getWeight'] = (request) => this.weights.getWeight(request)
  resolveWeightMoment: CatalogApi['resolveWeightMoment'] = (request) =>
    this.weights.resolveWeightMoment(request)
  previewWeight: CatalogApi['previewWeight'] = (request) => this.weights.previewWeight(request)
  confirmWeight: CatalogApi['confirmWeight'] = (request) => this.weights.confirmWeight(request)
  weightEffects: CatalogApi['weightEffects'] = (request) => this.weights.weightEffects(request)
  create: CatalogApi['create'] = (request) =>
    this.coordinator.command(request, (session, payload) => {
      const input = record(payload, ['description', 'initialWeight'])
      return new CatalogRepository(session.database).create(
        identifierText(input.description, 'description', 'Controlla la descrizione del tipo.'),
        positiveDecimal(input.initialWeight, 'initialWeight'),
      )
    })
  list: CatalogApi['list'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const input = record(query, ['search', 'status', 'page', 'pageSize'])
      if (
        typeof input.search !== 'string' ||
        [...input.search].length > 200 ||
        !['ALL', 'ACTIVE', 'INACTIVE'].includes(input.status as string)
      )
        throw new ArchiveError('VALIDATION_ERROR', 'Filtri del catalogo non validi.')
      return new CatalogRepository(session.database).list({
        search: input.search,
        status: input.status as 'ALL' | 'ACTIVE' | 'INACTIVE',
        ...pagination(input.page, input.pageSize),
      })
    })
  get: CatalogApi['get'] = (request) =>
    this.coordinator.query(request, (session, query) =>
      new CatalogRepository(session.database).get(entityId(record(query, ['id']).id, 'id')),
    )
  fixedWeights: CatalogApi['fixedWeights'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      if (query !== null) throw new ArchiveError('VALIDATION_ERROR', 'Richiesta non valida.')
      return new CatalogRepository(session.database).fixedWeights()
    })
  reactivate: CatalogApi['reactivate'] = (request) =>
    this.coordinator.command(request, (session, payload) =>
      new CatalogRepository(session.database).setStatus(
        entityId(record(payload, ['id']).id, 'id'),
        'ACTIVE',
      ),
    )
  preview: CatalogApi['preview'] = (request) =>
    this.coordinator.command(request, (session, payload) => {
      const operation = (payload as CatalogChange | null)?.operation
      const input = record(
        payload,
        operation === 'RENAME' ? ['operation', 'id', 'description'] : ['operation', 'id'],
      )
      if (!['RENAME', 'DELETE', 'DEACTIVATE'].includes(input.operation as string))
        throw new ArchiveError('VALIDATION_ERROR', 'Operazione non valida.')
      const id = entityId(input.id, 'id')
      const change: CatalogChange =
        operation === 'RENAME'
          ? {
              operation,
              id,
              description: identifierText(
                input.description,
                'description',
                'Controlla la descrizione del tipo.',
              ),
            }
          : { operation: input.operation as 'DELETE' | 'DEACTIVATE', id }
      this.analyze(session, change)
      const entry = session.previews.put(namespace, session.context(), change)
      return this.previewDto(session, change, entry, 1, 50)
    })
  confirm: CatalogApi['confirm'] = (request) => {
    let consumed = ''
    return this.coordinator.command(
      request,
      (session, payload) => {
        const id = entityId(record(payload, ['previewId']).previewId, 'previewId')
        const entry = session.previews.get(id, namespace, session.context())
        const change = entry.input as CatalogChange
        const analysis = this.analyze(session, change)
        if (analysis.blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'Il tipo non può essere eliminato.',
            [],
            analysis.blockers,
          )
        const repository = new CatalogRepository(session.database)
        if (change.operation === 'DELETE') repository.delete(change.id)
        else if (change.operation === 'RENAME') repository.rename(change.id, change.description)
        else repository.setStatus(change.id, 'INACTIVE')
        consumed = id
        return { id: change.id }
      },
      (session) => session.previews.consume(consumed),
    )
  }
  previewEffects: CatalogApi['previewEffects'] = (request) =>
    this.coordinator.query(request, (session, query) => {
      const input = record(query, ['previewId', 'page', 'pageSize'])
      const id = entityId(input.previewId, 'previewId')
      const { page, pageSize } = pagination(input.page, input.pageSize)
      const entry = session.previews.get(id, namespace, session.context())
      return this.previewDto(
        session,
        entry.input as CatalogChange,
        { ...entry, previewId: id },
        page,
        pageSize,
      )
    })
  private analyze(session: ArchiveApplicationSession, change: CatalogChange) {
    const repository = new CatalogRepository(session.database)
    const type = repository.get(change.id)
    if (change.operation === 'RENAME') repository.assertDescription(change.description, change.id)
    const blockers = change.operation === 'DELETE' ? repository.deleteBlockers(change.id) : []
    const effects: ChangeEffectDto[] = []
    const reference = { kind: 'SERVICE_TYPE' as const, id: type.id, label: type.description }
    if (change.operation === 'DELETE') {
      effects.push({
        versionId: null,
        reference,
        action: 'DELETE',
        changes: [{ field: 'description', before: type.description, after: null }],
      })
      effects.push(
        ...new WeightRepository(session.database)
          .versions(type.initialWeight.sequenceId)
          .map((version): ChangeEffectDto => ({
            versionId: version.id,
            reference: {
              kind: 'WEIGHT_VERSION',
              id: version.id,
              label: version.effectiveFrom ?? 'Peso iniziale',
            },
            action: 'DELETE',
            changes: [{ field: 'weight', before: version.weight, after: null }],
          })),
      )
    } else {
      const field = change.operation === 'RENAME' ? 'description' : 'status'
      const before = type[field],
        after = change.operation === 'RENAME' ? change.description : 'INACTIVE'
      if (before !== after)
        effects.push({
          versionId: null,
          reference,
          action: 'UPDATE',
          changes: [{ field, before, after }],
        })
    }
    return { blockers, effects }
  }
  private previewDto(
    session: ArchiveApplicationSession,
    change: CatalogChange,
    entry: { previewId: string; generatedAtUtc: string; expiresAtUtc: string },
    page: number,
    pageSize: number,
  ): ChangePreviewDto {
    const { blockers, effects } = this.analyze(session, change)
    return {
      previewId: entry.previewId,
      generatedAtUtc: entry.generatedAtUtc,
      expiresAtUtc: entry.expiresAtUtc,
      operation: `CATALOG_${change.operation}`,
      context: session.context(),
      status: blockers.length ? 'BLOCKED' : 'READY',
      summary: {
        created: 0,
        updated: effects.filter((e) => e.action === 'UPDATE').length,
        deleted: effects.filter((e) => e.action === 'DELETE').length,
        reattributed: 0,
        recalculated: 0,
      },
      effects: {
        items: effects.slice((page - 1) * pageSize, page * pageSize),
        total: effects.length,
        page,
        pageSize,
      },
      warnings: [],
      blockers,
    }
  }
}
