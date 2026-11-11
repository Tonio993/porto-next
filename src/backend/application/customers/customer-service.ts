import { randomUUID } from 'node:crypto'
import type { CommandRequest, QueryRequest } from '../../../shared/contracts/application'
import type {
  CustomerApi,
  CustomerChangeDto,
  CustomerListQuery,
  CustomerPreviewDto,
  CustomerVersionDto,
} from '../../../shared/contracts/customers'
import type { MomentInputDto } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { versionSequence } from '../../domain/ports/version-sequence'
import { identifierText } from '../../domain/values/identifiers'
import { resolveMoment } from '../../domain/values/moments'
import { CustomerRepository } from '../../infrastructure/database/customer-repository'
import { foreignReferences } from '../../infrastructure/database/port-references'
import { companyVersionZone } from '../time/company-version-zone'
import type { ArchiveApplicationSession, ArchiveCoordinator } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'
import { entityId, pagination } from '../ports/port-input'
import { insertVersion, versionEffects, versionMoment } from '../ports/version-change'

type Change = { customerId: string } & (
  | { operation: 'INSERT_VERSION' | 'UPDATE_VERSION'; version: CustomerVersionDto }
  | { operation: 'DELETE_VERSION'; versionId: string }
  | { operation: 'DEACTIVATE_CUSTOMER' | 'DELETE_CUSTOMER' }
)
const previewNamespace = 'customers:change'
const keys = {
  INSERT_VERSION: ['businessName', 'moment'],
  UPDATE_VERSION: ['versionId', 'businessName', 'moment'],
  DELETE_VERSION: ['versionId'],
  DEACTIVATE_CUSTOMER: [],
  DELETE_CUSTOMER: [],
} as const

export class CustomerService implements CustomerApi {
  constructor(
    private readonly coordinator: ArchiveCoordinator,
    private readonly now = () => new Date().toISOString(),
  ) {}

  create(request: CommandRequest<{ businessName: string }>) {
    return this.coordinator.command(request, ({ database }, payload) => {
      const input = record(payload, ['businessName'])
      return new CustomerRepository(database, this.now()).create(
        identifierText(
          input.businessName,
          'businessName',
          'Controlla la ragione sociale del cliente.',
        ),
      )
    })
  }

  list(request: QueryRequest<CustomerListQuery>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['search', 'page', 'pageSize', 'selectableOnly'])
      const { page, pageSize } = pagination(input.page, input.pageSize)
      if (
        typeof input.selectableOnly !== 'boolean' ||
        typeof input.search !== 'string' ||
        [...input.search].length > 200
      )
        throw new ArchiveError('VALIDATION_ERROR', 'Filtro dei clienti non valido.')
      const now = this.now()
      return new CustomerRepository(database, now).list({
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
      return new CustomerRepository(database, this.now()).get(entityId(input.id, 'id'))
    })
  }

  history(request: QueryRequest<{ id: string; page: number; pageSize: number }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['id', 'page', 'pageSize'])
      const id = entityId(input.id, 'id')
      const { page, pageSize } = pagination(input.page, input.pageSize)
      const repository = new CustomerRepository(database, this.now())
      const customer = repository.get(id)
      const versions = repository.versions(id)
      return {
        customer,
        versions: {
          items: versions.slice((page - 1) * pageSize, page * pageSize),
          total: versions.length,
          page,
          pageSize,
        },
      }
    })
  }

  resolveVersionMoment(request: QueryRequest<{ customerId: string; moment: MomentInputDto }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['customerId', 'moment'])
      const now = this.now()
      new CustomerRepository(database, now).get(entityId(input.customerId, 'customerId'))
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
      throw new ArchiveError('VALIDATION_ERROR', 'Operazione cliente non valida.')
    const kind = operation as CustomerChangeDto['operation']
    const input = record(payload, ['operation', 'customerId', ...keys[kind]])
    const customerId = entityId(input.customerId, 'customerId')
    const repository = new CustomerRepository(session.database, now)
    repository.get(customerId)
    if (kind === 'DELETE_CUSTOMER' || kind === 'DEACTIVATE_CUSTOMER')
      return { operation: kind, customerId }
    const versionId =
      kind === 'INSERT_VERSION' ? randomUUID() : entityId(input.versionId, 'versionId')
    const existing = repository.versions(customerId).find(({ id }) => id === versionId)
    if (kind !== 'INSERT_VERSION' && !existing)
      throw new ArchiveError('NOT_FOUND', 'La versione non esiste in questo cliente.')
    if (kind === 'DELETE_VERSION') {
      if (existing?.effectiveFrom === null)
        throw new ArchiveError('VALIDATION_ERROR', 'La versione iniziale non può essere eliminata.')
      return { operation: kind, customerId, versionId }
    }
    const businessName = identifierText(
      input.businessName,
      'businessName',
      'Controlla la ragione sociale del cliente.',
    )
    const effectiveMoment = versionMoment(
      existing,
      input.moment,
      existing?.effectiveFrom === null ? '' : companyVersionZone(session.database),
    )
    return {
      operation: kind,
      customerId,
      version: {
        id: versionId,
        businessName,
        effectiveMoment,
        effectiveFrom: effectiveMoment?.utc ?? null,
        effectiveTo: null,
        phase: 'CURRENT',
      },
    }
  }

  private analyse(session: ArchiveApplicationSession, change: Change, now: string) {
    const repository = new CustomerRepository(session.database, now)
    const customer = repository.get(change.customerId)
    const before = repository.versions(customer.id)
    let after = before
    if ('version' in change) {
      repository.assertAvailable(customer.id, change.version.businessName)
      after =
        change.operation === 'INSERT_VERSION'
          ? insertVersion(before, change.version, now, (a, b) => a.businessName === b.businessName)
          : versionSequence(
              before.map((v) => (v.id === change.version.id ? change.version : v)),
              now,
            )
    } else if (change.operation === 'DELETE_VERSION') {
      after = versionSequence(
        before.filter(({ id }) => id !== change.versionId),
        now,
      )
    } else if (change.operation === 'DELETE_CUSTOMER') after = []
    const reference = {
      kind: 'CUSTOMER' as const,
      id: customer.id,
      label: `Cliente ${customer.code}`,
    }
    const effects = versionEffects(
      before,
      after,
      ['businessName', 'effectiveFrom', 'effectiveTo'],
      (businessName) => ({
        ...reference,
        label: `${reference.label} · ${businessName} · versione`,
      }),
      (version) => version.businessName,
    )
    const changedIds = effects.flatMap(({ versionId }) => (versionId ? [versionId] : []))
    const deleting = change.operation === 'DELETE_CUSTOMER'
    const deactivating = change.operation === 'DEACTIVATE_CUSTOMER'
    if (deleting)
      effects.push({
        versionId: null,
        reference,
        action: 'DELETE',
        changes: [{ field: 'customer', before: customer.version.businessName, after: null }],
      })
    if (deactivating && customer.status === 'ACTIVE')
      effects.push({
        versionId: null,
        reference,
        action: 'UPDATE',
        changes: [
          { field: 'status', before: 'ACTIVE', after: 'INACTIVE' },
          ...(customer.selectable ? [{ field: 'selectable', before: 'Sì', after: 'No' }] : []),
        ],
      })
    const blockers = deactivating
      ? []
      : foreignReferences(
          session.database,
          reference,
          deleting ? 'customers' : null,
          'customer_versions',
          changedIds,
          ['customer_versions', 'customer_identifier_reservations'],
        )
    const warnings = deleting
      ? [
          blockers.length
            ? 'Puoi disattivare il cliente per escluderlo dalle nuove selezioni.'
            : 'L’eliminazione comprende tutte le versioni e le prenotazioni. Il codice progressivo non sarà riutilizzato.',
        ]
      : deactivating
        ? ['Il cliente sarà escluso dalle nuove selezioni. I riferimenti esistenti restano validi.']
        : ['Le ragioni sociali storiche rimangono riservate a questo cliente.']
    return { repository, customer, effects, blockers, warnings }
  }

  preview(request: CommandRequest<CustomerChangeDto>) {
    return this.coordinator.command(request, (session, payload): CustomerPreviewDto => {
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
        const { repository, customer, effects, blockers } = this.analyse(
          session,
          change,
          this.now(),
        )
        if (blockers.length)
          throw new ArchiveError(
            'PREVIEW_BLOCKED',
            'I riferimenti presenti impediscono l’operazione.',
            [],
            blockers,
          )
        if (effects.length) {
          if ('version' in change)
            repository.saveVersion(customer, change.version, change.operation === 'INSERT_VERSION')
          else if (change.operation === 'DELETE_VERSION')
            repository.deleteVersion(customer.id, change.versionId)
          else if (change.operation === 'DEACTIVATE_CUSTOMER')
            repository.setStatus(customer.id, 'INACTIVE')
          else repository.delete(customer.id)
        }
        consumed = id
        return { customerId: customer.id }
      },
      (session) => session.previews.consume(consumed),
    )
  }

  reactivate(request: CommandRequest<{ customerId: string }>) {
    return this.coordinator.command(request, ({ database }, payload) => {
      const input = record(payload, ['customerId'])
      const customerId = entityId(input.customerId, 'customerId')
      const repository = new CustomerRepository(database, this.now())
      repository.get(customerId)
      repository.setStatus(customerId, 'ACTIVE')
      return { customerId }
    })
  }
}
