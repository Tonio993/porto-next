import { randomUUID } from 'node:crypto'
import type { CommandRequest, QueryRequest } from '../../../shared/contracts/application'
import type {
  BerthApi,
  BerthChangeDto,
  BerthListQuery,
  BerthPreviewDto,
  BerthVersionDto,
} from '../../../shared/contracts/berths'
import type { MomentInputDto } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { versionSequence } from '../../domain/ports/version-sequence'
import { identifierText } from '../../domain/values/identifiers'
import { resolveMoment } from '../../domain/values/moments'
import { BerthRepository } from '../../infrastructure/database/berth-repository'
import { berthReferences } from '../../infrastructure/database/port-references'
import { PortRepository } from '../../infrastructure/database/port-repository'
import type { ArchiveApplicationSession, ArchiveCoordinator } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { insertVersion, versionEffects, versionMoment } from '../ports/version-change'

type Change = { berthId: string } & (
  | { operation: 'INSERT_VERSION' | 'UPDATE_VERSION'; version: BerthVersionDto }
  | { operation: 'DELETE_VERSION'; versionId: string }
  | { operation: 'DEACTIVATE_BERTH' | 'DELETE_BERTH' }
)
const previewNamespace = 'berths:change'
const keys = {
  INSERT_VERSION: ['name', 'moment'],
  UPDATE_VERSION: ['versionId', 'name', 'moment'],
  DELETE_VERSION: ['versionId'],
  DEACTIVATE_BERTH: [],
  DELETE_BERTH: [],
} as const

export class BerthService implements BerthApi {
  constructor(
    private readonly coordinator: ArchiveCoordinator,
    private readonly now = () => new Date().toISOString(),
  ) {}

  create(request: CommandRequest<{ portId: string; name: string }>) {
    return this.coordinator.command(request, ({ database }, payload) => {
      const input = record(payload, ['portId', 'name'])
      return new BerthRepository(database, this.now()).create(
        entityId(input.portId, 'portId'),
        identifierText(input.name, 'name', 'Controlla il nome della banchina.'),
      )
    })
  }

  list(request: QueryRequest<BerthListQuery>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['portId', 'page', 'pageSize', 'selectableOnly'])
      const portId = entityId(input.portId, 'portId')
      const { page, pageSize } = pagination(input.page, input.pageSize)
      if (typeof input.selectableOnly !== 'boolean')
        throw new ArchiveError('VALIDATION_ERROR', 'Filtro delle banchine non valido.')
      const now = this.now()
      new PortRepository(database, () => now).get(portId)
      return new BerthRepository(database, now).list({
        portId,
        page,
        pageSize,
        selectableOnly: input.selectableOnly,
      })
    })
  }

  history(request: QueryRequest<{ id: string; page: number; pageSize: number }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['id', 'page', 'pageSize'])
      const id = entityId(input.id, 'id')
      const { page, pageSize } = pagination(input.page, input.pageSize)
      const repository = new BerthRepository(database, this.now())
      const berth = repository.get(id)
      const versions = repository.versions(id)
      return {
        berth,
        versions: {
          items: versions.slice((page - 1) * pageSize, page * pageSize),
          total: versions.length,
          page,
          pageSize,
        },
      }
    })
  }

  resolveVersionMoment(request: QueryRequest<{ berthId: string; moment: MomentInputDto }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['berthId', 'moment'])
      const now = this.now()
      const berth = new BerthRepository(database, now).get(entityId(input.berthId, 'berthId'))
      const port = new PortRepository(database, () => now).get(berth.portId)
      const moment = record(input.moment, ['localDateTime', 'selectedOffset'])
      return resolveMoment(moment.localDateTime, port.initialZoneId, moment.selectedOffset)
    })
  }

  private parse(session: ArchiveApplicationSession, payload: unknown, now: string): Change {
    // Allow only the keys of the chosen operation, including on direct IPC calls.
    const operation =
      payload && typeof payload === 'object' && Object.hasOwn(payload, 'operation')
        ? (payload as { operation: unknown }).operation
        : null
    if (typeof operation !== 'string' || !Object.hasOwn(keys, operation))
      throw new ArchiveError('VALIDATION_ERROR', 'Operazione banchina non valida.')
    const kind = operation as BerthChangeDto['operation']
    const input = record(payload, ['operation', 'berthId', ...keys[kind]])
    const berthId = entityId(input.berthId, 'berthId')
    const repository = new BerthRepository(session.database, now)
    const berth = repository.get(berthId)
    if (kind === 'DELETE_BERTH' || kind === 'DEACTIVATE_BERTH') return { operation: kind, berthId }
    const versionId =
      kind === 'INSERT_VERSION' ? randomUUID() : entityId(input.versionId, 'versionId')
    const existing = repository.versions(berthId).find(({ id }) => id === versionId)
    if (kind !== 'INSERT_VERSION' && !existing)
      throw new ArchiveError('NOT_FOUND', 'La versione non esiste in questa banchina.')
    if (kind === 'DELETE_VERSION') {
      if (existing?.effectiveFrom === null)
        throw new ArchiveError('VALIDATION_ERROR', 'La versione iniziale non può essere eliminata.')
      return { operation: kind, berthId, versionId }
    }
    const name = identifierText(input.name, 'name', 'Controlla il nome della banchina.')
    const port = new PortRepository(session.database, () => now).get(berth.portId)
    const effectiveMoment = versionMoment(existing, input.moment, port.initialZoneId)
    return {
      operation: kind,
      berthId,
      version: {
        id: versionId,
        name,
        effectiveMoment,
        effectiveFrom: effectiveMoment?.utc ?? null,
        effectiveTo: null,
        phase: 'CURRENT',
      },
    }
  }

  private analyse(session: ArchiveApplicationSession, change: Change, now: string) {
    const repository = new BerthRepository(session.database, now)
    const berth = repository.get(change.berthId)
    const before = repository.versions(berth.id)
    let after = before
    if ('version' in change) {
      repository.assertAvailable(berth.portId, berth.id, change.version.name)
      after =
        change.operation === 'INSERT_VERSION'
          ? insertVersion(before, change.version, now, (a, b) => a.name === b.name)
          : versionSequence(
              before.map((v) => (v.id === change.version.id ? change.version : v)),
              now,
            )
    } else if (change.operation === 'DELETE_VERSION') {
      after = versionSequence(
        before.filter(({ id }) => id !== change.versionId),
        now,
      )
    } else if (change.operation === 'DELETE_BERTH') after = []
    const reference = { kind: 'BERTH' as const, id: berth.id, label: `Banchina ${berth.code}` }
    const effects = versionEffects(
      before,
      after,
      ['name', 'effectiveFrom', 'effectiveTo'],
      (name) => ({ ...reference, label: `${reference.label} · ${name} · versione` }),
      (version) => version.name,
    )
    const changedIds = effects.flatMap(({ versionId }) => (versionId ? [versionId] : []))
    const deleting = change.operation === 'DELETE_BERTH'
    const deactivating = change.operation === 'DEACTIVATE_BERTH'
    if (deleting)
      effects.push({
        versionId: null,
        reference,
        action: 'DELETE',
        changes: [{ field: 'berth', before: berth.version.name, after: null }],
      })
    if (deactivating && berth.status === 'ACTIVE')
      effects.push({
        versionId: null,
        reference,
        action: 'UPDATE',
        changes: [
          { field: 'status', before: 'ACTIVE', after: 'INACTIVE' },
          ...(berth.selectable ? [{ field: 'selectable', before: 'Sì', after: 'No' }] : []),
        ],
      })
    const blockers = deactivating
      ? []
      : berthReferences(session.database, berth.id, changedIds, deleting)
    const warnings = deleting
      ? [
          blockers.length
            ? 'Puoi disattivare la banchina per escluderla dalle nuove selezioni.'
            : 'L’eliminazione comprende tutte le versioni e le prenotazioni. Il codice progressivo non sarà riutilizzato.',
        ]
      : deactivating
        ? [
            'La banchina sarà esclusa dalle nuove selezioni. I riferimenti esistenti restano validi.',
          ]
        : ['I nomi storici rimangono riservati a questa banchina.']
    return { repository, berth, effects, blockers, warnings }
  }

  preview(request: CommandRequest<BerthChangeDto>) {
    return this.coordinator.command(request, (session, payload): BerthPreviewDto => {
      const now = this.now()
      const change = this.parse(session, payload, now)
      const { effects, blockers, warnings } = this.analyse(session, change, now)
      const context = session.context()
      return {
        ...session.previews.put(previewNamespace, context, change),
        operation: change.operation,
        context,
        status: blockers.length ? 'BLOCKED' : 'READY',
        summary: {
          created: effects.filter(({ action }) => action === 'CREATE').length,
          updated: effects.filter(({ action }) => action === 'UPDATE').length,
          deleted: effects.filter(({ action }) => action === 'DELETE').length,
          recalculated: 0,
          reattributed: 0,
        },
        effects: { items: effects.slice(0, 50), total: effects.length, page: 1, pageSize: 50 },
        blockers,
        warnings,
      }
    })
  }

  previewEffects(request: QueryRequest<{ previewId: string; page: number; pageSize: number }>) {
    return this.coordinator.query(request, (session, query) => {
      const input = record(query, ['previewId', 'page', 'pageSize'])
      const { page, pageSize } = pagination(input.page, input.pageSize)
      const { input: change } = session.previews.get(
        entityId(input.previewId, 'previewId'),
        previewNamespace,
        session.context(),
      )
      const { effects } = this.analyse(session, change as Change, this.now())
      return {
        items: effects.slice((page - 1) * pageSize, page * pageSize),
        total: effects.length,
        page,
        pageSize,
      }
    })
  }

  confirm(request: CommandRequest<{ previewId: string }>) {
    let consumed = ''
    return this.coordinator.command(
      request,
      (session, payload) => {
        const input = record(payload, ['previewId'])
        const id = entityId(input.previewId, 'previewId')
        const change = session.previews.get(id, previewNamespace, session.context()).input as Change
        const { repository, berth, effects, blockers } = this.analyse(session, change, this.now())
        if (blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'I riferimenti presenti impediscono l’operazione.',
            [],
            blockers,
          )
        if (effects.length) {
          if ('version' in change)
            repository.saveVersion(berth, change.version, change.operation === 'INSERT_VERSION')
          else if (change.operation === 'DELETE_VERSION')
            repository.deleteVersion(berth.id, change.versionId)
          else if (change.operation === 'DEACTIVATE_BERTH')
            repository.setStatus(berth.id, 'INACTIVE')
          else repository.delete(berth.id)
        }
        consumed = id
        return { berthId: berth.id }
      },
      (session) => session.previews.consume(consumed),
    )
  }

  reactivate(request: CommandRequest<{ berthId: string }>) {
    return this.coordinator.command(request, ({ database }, payload) => {
      const input = record(payload, ['berthId'])
      const berthId = entityId(input.berthId, 'berthId')
      const repository = new BerthRepository(database, this.now())
      repository.get(berthId)
      repository.setStatus(berthId, 'ACTIVE')
      return { berthId }
    })
  }
}
