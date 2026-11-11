import vesselsSql from '../../../../migrations/0008_vessels.sql?raw'
import type Database from 'better-sqlite3'
import initialSql from '../../../../migrations/0001_archive.sql?raw'
import revisionSql from '../../../../migrations/0002_archive_revision.sql?raw'
import timeZoneSql from '../../../../migrations/0003_company_time_zone.sql?raw'
import portsSql from '../../../../migrations/0004_ports.sql?raw'
import portMomentsSql from '../../../../migrations/0005_port_version_moments.sql?raw'
import berthsSql from '../../../../migrations/0006_berths.sql?raw'
import { ArchiveError } from '../../../shared/errors/archive-error'

import subjectsSql from '../../../../migrations/0007_customers_agencies.sql?raw'

export const APPLICATION_ID = 0x504f5254
export const SCHEMA_VERSION = 8

const migrations = [
  { version: 1, sql: initialSql },
  { version: 2, sql: revisionSql },
  { version: 3, sql: timeZoneSql },
  { version: 4, sql: portsSql },
  { version: 5, sql: portMomentsSql },
  { version: 6, sql: berthsSql },
  { version: 7, sql: subjectsSql },
  { version: 8, sql: vesselsSql },
]

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
