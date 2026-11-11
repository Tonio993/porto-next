import { randomUUID } from 'node:crypto'
import type { CommandRequest, QueryRequest } from '../../../shared/contracts/application'
import type {
  VesselApi,
  VesselChangeDto,
  VesselListQuery,
  VesselPreviewDto,
  VesselVersionDto,
  VesselDescriptionDto,
} from '../../../shared/contracts/vessels'
import type { MomentInputDto } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { versionSequence } from '../../domain/ports/version-sequence'
import { vesselDescription, vesselDescriptionKeys } from './vessel-input'
import { resolveMoment } from '../../domain/values/moments'
import { VesselRepository } from '../../infrastructure/database/vessel-repository'
import { foreignReferences } from '../../infrastructure/database/port-references'
import { companyVersionZone } from '../time/company-version-zone'
import type { ArchiveApplicationSession, ArchiveCoordinator } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { insertVersion, versionEffects, versionMoment } from '../ports/version-change'

type Change = { vesselId: string } & (
  | { operation: 'INSERT_VERSION' | 'UPDATE_VERSION'; version: VesselVersionDto }
  | { operation: 'DELETE_VERSION'; versionId: string }
  | { operation: 'DEACTIVATE_VESSEL' | 'DELETE_VESSEL' }
)
const previewNamespace = 'vessels:change'
const keys = {
  INSERT_VERSION: [...vesselDescriptionKeys, 'moment'],
  UPDATE_VERSION: ['versionId', ...vesselDescriptionKeys, 'moment'],
  DELETE_VERSION: ['versionId'],
  DEACTIVATE_VESSEL: [],
  DELETE_VESSEL: [],
} as const

export class VesselService implements VesselApi {
  constructor(
    private readonly coordinator: ArchiveCoordinator,
    private readonly now = () => new Date().toISOString(),
  ) {}

  create(request: CommandRequest<VesselDescriptionDto>) {
    return this.coordinator.command(request, ({ database }, payload) => {
      const input = record(payload, vesselDescriptionKeys)
      return new VesselRepository(database, this.now()).create(vesselDescription(input))
    })
  }

  list(request: QueryRequest<VesselListQuery>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['search', 'page', 'pageSize', 'selectableOnly'])
      const { page, pageSize } = pagination(input.page, input.pageSize)
      if (
        typeof input.selectableOnly !== 'boolean' ||
        typeof input.search !== 'string' ||
        [...input.search].length > 200
      )
        throw new ArchiveError('VALIDATION_ERROR', 'Filtro delle navi non valido.')
      const now = this.now()
      return new VesselRepository(database, now).list({
        search: input.search,
        page,
        pageSize,
        selectableOnly: input.selectableOnly,
      })
    })
  }

  get(request: QueryRequest<{ id: string }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['id'])
      return new VesselRepository(database, this.now()).get(entityId(input.id, 'id'))
    })
  }

  versionAt(request: QueryRequest<{ vesselId: string; instant: string }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['vesselId', 'instant'])
      return new VesselRepository(database, this.now()).versionAt(
        entityId(input.vesselId, 'vesselId'),
        input.instant,
      )
    })
  }

  history(request: QueryRequest<{ id: string; page: number; pageSize: number }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['id', 'page', 'pageSize'])
      const id = entityId(input.id, 'id')
      const { page, pageSize } = pagination(input.page, input.pageSize)
      const repository = new VesselRepository(database, this.now())
      const vessel = repository.get(id)
      const versions = repository.versions(id)
      return {
        vessel,
        versions: {
          items: versions.slice((page - 1) * pageSize, page * pageSize),
          total: versions.length,
          page,
          pageSize,
        },
      }
    })
  }

  resolveVersionMoment(request: QueryRequest<{ vesselId: string; moment: MomentInputDto }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['vesselId', 'moment'])
      const now = this.now()
      new VesselRepository(database, now).get(entityId(input.vesselId, 'vesselId'))
      const moment = record(input.moment, ['localDateTime', 'selectedOffset'])
      return resolveMoment(
        moment.localDateTime,
        companyVersionZone(database),
        moment.selectedOffset,
      )
    })
  }

  private parse(session: ArchiveApplicationSession, payload: unknown, now: string): Change {
    // Allow only the keys of the chosen operation, including on direct IPC calls.
    const operation =
      payload && typeof payload === 'object' && Object.hasOwn(payload, 'operation')
        ? (payload as { operation: unknown }).operation
        : null
    if (typeof operation !== 'string' || !Object.hasOwn(keys, operation))
      throw new ArchiveError('VALIDATION_ERROR', 'Operazione nave non valida.')
    const kind = operation as VesselChangeDto['operation']
    const input = record(payload, ['operation', 'vesselId', ...keys[kind]])
    const vesselId = entityId(input.vesselId, 'vesselId')
    const repository = new VesselRepository(session.database, now)
    repository.get(vesselId)
    if (kind === 'DELETE_VESSEL' || kind === 'DEACTIVATE_VESSEL')
      return { operation: kind, vesselId }
    const versionId =
      kind === 'INSERT_VERSION' ? randomUUID() : entityId(input.versionId, 'versionId')
    const existing = repository.versions(vesselId).find(({ id }) => id === versionId)
    if (kind !== 'INSERT_VERSION' && !existing)
      throw new ArchiveError('NOT_FOUND', 'La versione non esiste in questa nave.')
    if (kind === 'DELETE_VERSION') {
      if (existing?.effectiveFrom === null)
        throw new ArchiveError('VALIDATION_ERROR', 'La versione iniziale non può essere eliminata.')
      return { operation: kind, vesselId, versionId }
    }
    const description = vesselDescription(input)
    const effectiveMoment = versionMoment(
      existing,
      input.moment,
      existing?.effectiveFrom === null ? '' : companyVersionZone(session.database),
    )
    return {
      operation: kind,
      vesselId,
      version: {
        id: versionId,
        ...description,
        effectiveMoment,
        effectiveFrom: effectiveMoment?.utc ?? null,
        effectiveTo: null,
        phase: 'CURRENT',
      },
    }
  }

  private analyse(session: ArchiveApplicationSession, change: Change, now: string) {
    const repository = new VesselRepository(session.database, now)
    const vessel = repository.get(change.vesselId)
    const before = repository.versions(vessel.id)
    let after = before
    if ('version' in change) {
      repository.assertAvailable(vessel.id, change.version)
      after =
        change.operation === 'INSERT_VERSION'
          ? insertVersion(before, change.version, now, (a, b) =>
              vesselDescriptionKeys.every((key) => a[key] === b[key]),
            )
          : versionSequence(
              before.map((v) => (v.id === change.version.id ? change.version : v)),
              now,
            )
    } else if (change.operation === 'DELETE_VERSION') {
      after = versionSequence(
        before.filter(({ id }) => id !== change.versionId),
        now,
      )
    } else if (change.operation === 'DELETE_VESSEL') after = []
    const reference = { kind: 'VESSEL' as const, id: vessel.id, label: `Nave ${vessel.code}` }
    const effects = versionEffects(
      before,
      after,
      [...vesselDescriptionKeys, 'effectiveFrom', 'effectiveTo'],
      (registeredName) => ({
        ...reference,
        label: `${reference.label} · ${registeredName} · versione`,
      }),
      (version) => version.registeredName,
    )
    const changedIds = effects.flatMap(({ versionId }) => (versionId ? [versionId] : []))
    const deleting = change.operation === 'DELETE_VESSEL'
    const deactivating = change.operation === 'DEACTIVATE_VESSEL'
    if (deleting)
      effects.push({
        versionId: null,
        reference,
        action: 'DELETE',
        changes: [{ field: 'vessel', before: vessel.version.registeredName, after: null }],
      })
    if (deactivating && vessel.status === 'ACTIVE')
      effects.push({
        versionId: null,
        reference,
        action: 'UPDATE',
        changes: [
          { field: 'status', before: 'ACTIVE', after: 'INACTIVE' },
          ...(vessel.selectable ? [{ field: 'selectable', before: 'Sì', after: 'No' }] : []),
        ],
      })
    const blockers = deactivating
      ? []
      : foreignReferences(
          session.database,
          reference,
          deleting ? 'vessels' : null,
          'vessel_versions',
          changedIds,
          ['vessel_versions', 'vessel_identifier_reservations'],
        )
    const warnings = deleting
      ? [
          blockers.length
            ? 'Puoi disattivare la nave per escluderla dalle nuove selezioni.'
            : 'L’eliminazione comprende tutte le versioni e le prenotazioni. Il codice progressivo non sarà riutilizzato.',
        ]
      : deactivating
        ? ['La nave sarà esclusa dalle nuove selezioni. I riferimenti esistenti restano validi.']
        : ['I nomi e gli IMO storici rimangono riservati a questa nave.']
    return { repository, vessel, effects, blockers, warnings }
  }

  preview(request: CommandRequest<VesselChangeDto>) {
    return this.coordinator.command(request, (session, payload): VesselPreviewDto => {
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
        const { repository, vessel, effects, blockers } = this.analyse(session, change, this.now())
        if (blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'I riferimenti presenti impediscono l’operazione.',
            [],
            blockers,
          )
        if (effects.length) {
          if ('version' in change)
            repository.saveVersion(vessel, change.version, change.operation === 'INSERT_VERSION')
          else if (change.operation === 'DELETE_VERSION')
            repository.deleteVersion(vessel.id, change.versionId)
          else if (change.operation === 'DEACTIVATE_VESSEL')
            repository.setStatus(vessel.id, 'INACTIVE')
          else repository.delete(vessel.id)
        }
        consumed = id
        return { vesselId: vessel.id }
      },
      (session) => session.previews.consume(consumed),
    )
  }

  reactivate(request: CommandRequest<{ vesselId: string }>) {
    return this.coordinator.command(request, ({ database }, payload) => {
      const input = record(payload, ['vesselId'])
      const vesselId = entityId(input.vesselId, 'vesselId')
      const repository = new VesselRepository(database, this.now())
      repository.get(vesselId)
      repository.setStatus(vesselId, 'ACTIVE')
      return { vesselId }
    })
  }
}
