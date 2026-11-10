import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { APPLICATION_ID, SCHEMA_VERSION } from './migrations'
import * as schema from './schema'

export class DatabaseSession {
  readonly sqlite: Database.Database
  readonly db: ReturnType<typeof drizzle<typeof schema>>

  constructor(
    readonly path: string,
    mustExist = true,
  ) {
    this.sqlite = new Database(path, { fileMustExist: mustExist, timeout: 5_000 })
    this.db = drizzle(this.sqlite, { schema })
  }

  validate(): number {
    const applicationId = this.sqlite.pragma('application_id', { simple: true })
    const version = this.sqlite.pragma('user_version', { simple: true }) as number
    if (applicationId !== APPLICATION_ID || !Number.isInteger(version) || version < 1)
      throw new ArchiveError('INVALID_ARCHIVE', 'Il file non è un archivio di Porto Next.')
    if (version > SCHEMA_VERSION)
      throw new ArchiveError(
        'NEWER_SCHEMA',
        'Questo archivio richiede una versione più recente di Porto Next.',
      )
    if (this.sqlite.pragma('quick_check', { simple: true }) !== 'ok')
      throw new ArchiveError(
        'INVALID_ARCHIVE',
        'Il controllo di integrità dell’archivio non è riuscito.',
      )
    return version
  }

  configure(): void {
    // Un archivio chiuso deve essere trasferibile come singolo file.
    const mode = this.sqlite.pragma('journal_mode = DELETE', { simple: true })
    if (mode !== 'delete')
      throw new ArchiveError(
        'ARCHIVE_BUSY',
        'Non è possibile preparare l’archivio. Verifica che non sia utilizzato da un’altra applicazione.',
      )
    this.sqlite.pragma('foreign_keys = ON')
    this.sqlite.pragma('synchronous = FULL')
    this.sqlite.pragma('trusted_schema = OFF')
  }

  metadata() {
    const row = this.db.select().from(schema.archiveMetadata).get()
    if (
      !row ||
      row.singleton !== 1 ||
      !row.id ||
      !row.name ||
      !Number.isFinite(Date.parse(row.createdAt)) ||
      !Number.isFinite(Date.parse(row.updatedAt))
    )
      throw new ArchiveError('INVALID_ARCHIVE', 'I metadati dell’archivio non sono validi.')
    return row
  }

  close(): void {
    if (this.sqlite.open) this.sqlite.close()
  }
}
