import { randomUUID } from 'node:crypto'
import type { CommandRequest, QueryRequest } from '../../../shared/contracts/application'
import type {
  InsertPortVersionDto,
  UpdatePortVersionDto,
  PortVersionTargetDto,
  PortChangeOperation,
  PortVersionDto,
  PortPreviewDto,
} from '../../../shared/contracts/ports'
import type { MomentInputDto } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'
import type { ArchiveCoordinator, ArchiveApplicationSession } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { sameDescription, versionSequence } from '../../domain/ports/version-sequence'
import { resolveMoment } from '../../domain/values/moments'
import { PortRepository } from '../../infrastructure/database/port-repository'
import {
  berthReferencesToPort,
  portReferences,
} from '../../infrastructure/database/port-references'
import { insertVersion, versionEffects, versionMoment } from './version-change'
import { entityId, pagination, portDescription } from './port-input'

interface Change {
  operation: PortChangeOperation
  portId: string
  versionId: string | null
  version: PortVersionDto | null
}

export class PortLifecycleService {
  constructor(
    protected readonly coordinator: ArchiveCoordinator,
    protected readonly now = () => new Date().toISOString(),
  ) {}

  history(request: QueryRequest<{ id: string; page: number; pageSize: number }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['id', 'page', 'pageSize'])
      const id = entityId(input.id, 'id')
      const { page, pageSize } = pagination(input.page, input.pageSize)
      const repository = new PortRepository(database, this.now)
      const port = repository.get(id)
      const versions = repository.versions(id)
      return {
        port,
        versions: {
          items: versions.slice((page - 1) * pageSize, page * pageSize),
          total: versions.length,
          page,
          pageSize,
        },
      }
    })
  }

  resolveVersionMoment(request: QueryRequest<{ portId: string; moment: MomentInputDto }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['portId', 'moment'])
      const port = new PortRepository(database, this.now).get(entityId(input.portId, 'portId'))
      const moment = record(input.moment, ['localDateTime', 'selectedOffset'])
      return resolveMoment(moment.localDateTime, port.initialZoneId, moment.selectedOffset)
    })
  }

  previewInsertVersion(request: CommandRequest<InsertPortVersionDto>) {
    return this.preview('INSERT_VERSION', request)
  }
  previewUpdateVersion(request: CommandRequest<UpdatePortVersionDto>) {
    return this.preview('UPDATE_VERSION', request)
  }
  previewDeleteVersion(request: CommandRequest<PortVersionTargetDto>) {
    return this.preview('DELETE_VERSION', request)
  }
  previewDeactivate(request: CommandRequest<{ portId: string }>) {
    return this.preview('DEACTIVATE_PORT', request)
  }
  previewDelete(request: CommandRequest<{ portId: string }>) {
    return this.preview('DELETE_PORT', request)
  }
  confirmInsertVersion(request: CommandRequest<{ previewId: string }>) {
    return this.confirm('INSERT_VERSION', request)
  }
  confirmUpdateVersion(request: CommandRequest<{ previewId: string }>) {
    return this.confirm('UPDATE_VERSION', request)
  }
  confirmDeleteVersion(request: CommandRequest<{ previewId: string }>) {
    return this.confirm('DELETE_VERSION', request)
  }
  confirmDeactivate(request: CommandRequest<{ previewId: string }>) {
    return this.confirm('DEACTIVATE_PORT', request)
  }
  confirmDelete(request: CommandRequest<{ previewId: string }>) {
    return this.confirm('DELETE_PORT', request)
  }

  reactivate(request: CommandRequest<{ portId: string }>) {
    return this.coordinator.command(request, ({ database }, payload) => {
      const input = record(payload, ['portId'])
      const portId = entityId(input.portId, 'portId')
      const repository = new PortRepository(database, this.now)
      repository.get(portId)
      repository.setStatus(portId, 'ACTIVE')
      return { portId }
    })
  }

  previewEffects(request: QueryRequest<{ previewId: string; page: number; pageSize: number }>) {
    return this.coordinator.query(request, (session, query) => {
      const input = record(query, ['previewId', 'page', 'pageSize'])
      const { page, pageSize } = pagination(input.page, input.pageSize)
      const entry = session.previews.get(
        entityId(input.previewId, 'previewId'),
        null,
        session.context(),
      )
      if (!entry.operation.startsWith('ports:'))
        throw new ArchiveError('PREVIEW_EXPIRED', 'L’anteprima non appartiene ai porti.')
      const { effects } = this.analyse(session, entry.input as Change)
      return {
        items: effects.slice((page - 1) * pageSize, page * pageSize),
        total: effects.length,
        page,
        pageSize,
      }
    })
  }

  private preview(operation: PortChangeOperation, request: CommandRequest<unknown>) {
    return this.coordinator.command(request, (session, payload): PortPreviewDto => {
      const keys =
        operation === 'INSERT_VERSION'
          ? ['portId', 'name', 'locality', 'countryCode', 'moment']
          : operation === 'UPDATE_VERSION'
            ? ['portId', 'versionId', 'name', 'locality', 'countryCode', 'moment']
            : operation === 'DELETE_VERSION'
              ? ['portId', 'versionId']
              : ['portId']
      const input = record(payload, keys)
      const portId = entityId(input.portId, 'portId')
      const repository = new PortRepository(session.database, this.now)
      const port = repository.get(portId)
      const before = repository.versions(portId)
      const versionId =
        operation === 'INSERT_VERSION'
          ? randomUUID()
          : keys.includes('versionId')
            ? entityId(input.versionId, 'versionId')
            : null
      const existing = before.find((version) => version.id === versionId)
      if (operation === 'UPDATE_VERSION' || operation === 'DELETE_VERSION') {
        if (!existing)
          throw new ArchiveError('NOT_FOUND', 'La versione non esiste in questo porto.')
        if (operation === 'DELETE_VERSION' && existing.effectiveFrom === null)
          throw new ArchiveError(
            'VALIDATION_ERROR',
            'La versione iniziale non può essere eliminata.',
          )
      }
      let version: PortVersionDto | null = null
      if (operation === 'INSERT_VERSION' || operation === 'UPDATE_VERSION') {
        const description = portDescription(input)
        const effectiveMoment = versionMoment(existing, input.moment, port.initialZoneId)
        version = {
          ...description,
          id: versionId!,
          effectiveMoment,
          effectiveFrom: effectiveMoment?.utc ?? null,
          effectiveTo: null,
          phase: 'CURRENT',
        }
      }
      const change: Change = { operation, portId, versionId, version }
      const analysis = this.analyse(session, change)
      const metadata = session.previews.put(`ports:${operation}`, session.context(), change)
      return {
        ...metadata,
        operation,
        context: session.context(),
        status: analysis.blockers.length ? 'BLOCKED' : 'READY',
        resolved: analysis.blockers.length
          ? null
          : { portId, versionId, effectiveMoment: version?.effectiveMoment ?? null },
        summary: {
          created: analysis.effects.filter((effect) => effect.action === 'CREATE').length,
          updated: analysis.effects.filter((effect) => effect.action === 'UPDATE').length,
          deleted: analysis.effects.filter((effect) => effect.action === 'DELETE').length,
          reattributed: 0,
          recalculated: 0,
        },
        effects: {
          items: analysis.effects.slice(0, 50),
          total: analysis.effects.length,
          page: 1,
          pageSize: 50,
        },
        blockers: analysis.blockers,
        warnings: analysis.warnings,
      }
    })
  }

  private analyse(session: ArchiveApplicationSession, change: Change) {
    const repository = new PortRepository(session.database, this.now)
    const port = repository.get(change.portId)
    const before = repository.versions(change.portId)
    let after = before
    if (change.operation === 'INSERT_VERSION') {
      after = insertVersion(before, change.version!, this.now(), sameDescription)
    } else if (change.operation === 'UPDATE_VERSION') {
      after = versionSequence(
        before.map((version) => (version.id === change.versionId ? change.version! : version)),
        this.now(),
      )
    } else if (change.operation === 'DELETE_VERSION') {
      if (before.find((version) => version.id === change.versionId)?.effectiveFrom === null)
        throw new ArchiveError('VALIDATION_ERROR', 'La versione iniziale non può essere eliminata.')
      after = versionSequence(
        before.filter((version) => version.id !== change.versionId),
        this.now(),
      )
    } else if (change.operation === 'DELETE_PORT') after = []
    if (change.version) repository.assertAvailable(change.portId, change.version)
    const effects = versionEffects(
      before,
      after,
      ['name', 'locality', 'countryCode', 'effectiveFrom', 'effectiveTo'],
      (name) => ({ kind: 'PORT', id: port.id, label: `Porto ${port.code} · ${name} · versione` }),
    )
    const berths =
      change.operation === 'DELETE_PORT' ||
      (change.operation === 'DEACTIVATE_PORT' && port.status === 'ACTIVE')
        ? berthReferencesToPort(session.database, port.id)
        : []
    if (change.operation === 'DEACTIVATE_PORT' && port.status === 'ACTIVE') {
      effects.push({
        versionId: null,
        reference: { kind: 'PORT', id: port.id, label: `Porto ${port.code}` },
        action: 'UPDATE',
        changes: [{ field: 'status', before: port.status, after: 'INACTIVE' }],
      })
      for (const berth of berths.filter(({ status }) => status === 'ACTIVE'))
        effects.push({
          versionId: null,
          reference: berth.reference,
          action: 'UPDATE',
          changes: [{ field: 'selectable', before: 'Sì', after: 'No' }],
        })
    }
    if (change.operation === 'DELETE_PORT')
      effects.push({
        versionId: null,
        reference: { kind: 'PORT', id: port.id, label: `Porto ${port.code}` },
        action: 'DELETE',
        changes: [{ field: 'port', before: port.version.name, after: null }],
      })
    const changedIds = effects
      .map((effect) => effect.versionId)
      .filter((id): id is string => id !== null)
    const blockers =
      change.operation === 'DEACTIVATE_PORT'
        ? []
        : [
            ...(change.operation === 'DELETE_PORT'
              ? berths.map(({ reference }) => ({
                  reference,
                  reason:
                    'La banchina appartiene a questo porto. Eliminala esplicitamente se priva di riferimenti.',
                }))
              : []),
            ...portReferences(
              session.database,
              port.id,
              changedIds,
              change.operation === 'DELETE_PORT',
            ),
          ]
    const warnings =
      change.operation === 'DELETE_PORT'
        ? [
            'L’eliminazione comprende versioni, prenotazioni e fuso. Il codice progressivo non sarà riutilizzato.',
          ]
        : change.operation === 'DEACTIVATE_PORT'
          ? [
              'Il porto non sarà selezionabile per nuovi riferimenti. I riferimenti esistenti restano validi. Le banchine attive non saranno selezionabili. Il loro stato individuale sarà conservato.',
            ]
          : [
              'Le chiavi identificative storiche restano riservate a questo porto. Il fuso operativo non cambia.',
              'Non sono presenti moduli operativi o fatture da ricalcolare in questo incremento.',
            ]
    return { effects, blockers, warnings }
  }

  private confirm(operation: PortChangeOperation, request: CommandRequest<{ previewId: string }>) {
    let consumed = ''
    return this.coordinator.command(
      request,
      (session, payload) => {
        const input = record(payload, ['previewId'])
        const id = entityId(input.previewId, 'previewId')
        const change = session.previews.get(id, `ports:${operation}`, session.context())
          .input as Change
        const analysis = this.analyse(session, change)
        if (analysis.blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'I riferimenti presenti impediscono l’operazione.',
            [],
            analysis.blockers,
          )
        const repository = new PortRepository(session.database, this.now)
        if (analysis.effects.length) {
          if (change.operation === 'INSERT_VERSION' || change.operation === 'UPDATE_VERSION')
            repository.saveVersion(
              change.portId,
              change.version!,
              change.operation === 'INSERT_VERSION',
            )
          else if (change.operation === 'DELETE_VERSION')
            repository.deleteVersion(change.portId, change.versionId!)
          else if (change.operation === 'DEACTIVATE_PORT')
            repository.setStatus(change.portId, 'INACTIVE')
          else repository.delete(change.portId)
        }
        consumed = id
        return { portId: change.portId }
      },
      (session) => session.previews.consume(consumed),
    )
  }
}
