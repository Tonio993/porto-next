import type Database from 'better-sqlite3'
import initialSql from '../../../../migrations/0001_archive.sql?raw'
import { ArchiveError } from '../../../shared/errors/archive-error'

export const APPLICATION_ID = 0x504f5254
export const SCHEMA_VERSION = 1

const migrations = [{ version: 1, sql: initialSql }]

export function migrate(database: Database.Database, fromVersion: number): void {
  if (fromVersion > SCHEMA_VERSION)
    throw new ArchiveError(
      'NEWER_SCHEMA',
      'Questo archivio richiede una versione più recente di Porto Next.',
    )

  database.transaction(() => {
    for (const migration of migrations) {
      if (migration.version <= fromVersion) continue
      database.exec(migration.sql)
      database.pragma(`user_version = ${migration.version}`)
    }
    database.pragma(`application_id = ${APPLICATION_ID}`)
  })()
}
