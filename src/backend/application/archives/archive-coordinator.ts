import { randomUUID } from 'node:crypto'
import type {
  ApplicationResult,
  ArchiveContextDto,
  CommandRequest,
  QueryRequest,
} from '../../../shared/contracts/application'
import type { ArchiveInfo } from '../../../shared/contracts/archive'
import { ArchiveError, asArchiveError } from '../../../shared/errors/archive-error'
import { DatabaseSession } from '../../infrastructure/database/database-session'
import { SCHEMA_VERSION } from '../../infrastructure/database/migrations'
import { record, validateContext, validateSession } from './context-validation'

type Synchronous<T> = T extends PromiseLike<unknown> ? never : T

/** One scope per activation. Repositories for future use cases belong to this scope. */
export class ArchiveApplicationSession {
  readonly sessionId = randomUUID()
  constructor(readonly database: DatabaseSession) {}

  context(): ArchiveContextDto {
    const { id, revision } = this.database.metadata()
    return { archiveId: id, sessionId: this.sessionId, revision }
  }
}

export class ArchiveCoordinator {
  constructor(private readonly log: (error: unknown) => void = () => {}) {}

  private active: ArchiveApplicationSession | null = null
  private pending: Promise<void> = Promise.resolve()

  get database(): DatabaseSession | null {
    return this.active?.database ?? null
  }

  context(): ArchiveContextDto | null {
    return this.active?.context() ?? null
  }

  current(): ArchiveInfo | null {
    if (!this.active) return null
    const { id, name, createdAt, updatedAt } = this.active.database.metadata()
    return {
      id,
      name,
      createdAt,
      updatedAt,
      path: this.active.database.path,
      schemaVersion: SCHEMA_VERSION,
    }
  }

  requireSession(): ArchiveApplicationSession {
    if (!this.active)
      throw new ArchiveError('NO_ARCHIVE', 'Apri o crea un archivio per continuare.')
    return this.active
  }

  /** Lifecycle primitives: call only inside run(), never enqueue again from its callback. */
  activate(database: DatabaseSession): void {
    const next = new ArchiveApplicationSession(database)
    this.active?.database.close()
    this.active = next
  }

  deactivate(): void {
    this.active?.database.close()
    this.active = null
  }

  assertContext(expected: ArchiveContextDto | null): void {
    const session = this.requireSession()
    if (!expected)
      throw new ArchiveError('NO_ARCHIVE', 'La richiesta non aveva un archivio aperto.')
    // Check the in-memory token before reading even the new archive's metadata.
    if (session.sessionId !== expected.sessionId)
      throw new ArchiveError(
        'ARCHIVE_SESSION_CHANGED',
        'L’archivio aperto è cambiato. Ricarica la vista.',
      )
    const current = session.context()
    if (current.archiveId !== expected.archiveId)
      throw new ArchiveError('ARCHIVE_SESSION_CHANGED', 'L’archivio della richiesta non coincide.')
    if (BigInt(current.revision) !== BigInt(expected.revision))
      throw new ArchiveError(
        'REVISION_CONFLICT',
        'I dati sono cambiati. Ricarica la vista prima di continuare.',
      )
  }

  run<T>(operation: () => T | Promise<T>): Promise<T> {
    const result = this.pending.then(operation)
    this.pending = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  /** Synchronous transaction primitive, used within the single queue. */
  write<T>(
    expected: ArchiveContextDto | null,
    operation: (session: ArchiveApplicationSession) => Synchronous<T>,
  ): T {
    const session = this.requireSession()
    return session.database.sqlite.transaction(() => {
      this.assertContext(expected)
      const sqlite = session.database.sqlite
      const changes = () =>
        sqlite.prepare('SELECT CAST(total_changes() AS TEXT)').pluck().get() as string
      const before = changes()
      const value = operation(session)
      if (value && typeof (value as { then?: unknown }).then === 'function')
        throw new ArchiveError(
          'UNEXPECTED',
          'Una transazione non può contenere operazioni asincrone.',
        )
      if (changes() !== before) {
        const revision = BigInt(session.context().revision)
        if (revision === 9223372036854775807n)
          throw new ArchiveError(
            'LIMIT_EXCEEDED',
            'È stato raggiunto il limite delle revisioni dell’archivio.',
          )
        sqlite
          .prepare('UPDATE archive_metadata SET revision = ?, updated_at = ? WHERE singleton = 1')
          .run(revision + 1n, new Date().toISOString())
      }
      return value
    })()
  }

  query<T, R>(
    request: QueryRequest<T>,
    read: (session: ArchiveApplicationSession, query: T) => Synchronous<R>,
  ): Promise<ApplicationResult<R>> {
    return this.run(() =>
      this.result<R>(() => {
        const input = record(request, ['context', 'query'])
        const context = record(input.context, ['sessionId'])
        const sessionId = validateSession(context.sessionId)
        const session = this.requireSession()
        if (session.sessionId !== sessionId)
          throw new ArchiveError(
            'ARCHIVE_SESSION_CHANGED',
            'L’archivio aperto è cambiato. Ricarica la vista.',
          )
        return read(session, input.query as T)
      }),
    )
  }

  command<T, R>(
    request: CommandRequest<T>,
    execute: (session: ArchiveApplicationSession, payload: T) => Synchronous<R>,
  ): Promise<ApplicationResult<R>> {
    return this.run(() =>
      this.result<R>(() => {
        const input = record(request, ['context', 'payload'])
        const context = validateContext(input.context)
        return this.write<R>(context, (session) => execute(session, input.payload as T))
      }),
    )
  }

  private result<T>(operation: () => T): ApplicationResult<T> {
    try {
      const value = operation()
      if (value && typeof (value as { then?: unknown }).then === 'function')
        throw new ArchiveError('UNEXPECTED', 'Una richiesta applicativa deve essere sincrona.')
      return { ok: true, value, context: this.requireSession().context() }
    } catch (error) {
      this.log(error)
      const known = asArchiveError(error)
      return {
        ok: false,
        error: {
          code: known.code,
          message: known.message,
          fields: known.fields,
          conflicts: known.conflicts,
        },
        context: ['NO_ARCHIVE', 'ARCHIVE_SESSION_CHANGED', 'VALIDATION_ERROR'].includes(known.code)
          ? null
          : this.context(),
      }
    }
  }
}
