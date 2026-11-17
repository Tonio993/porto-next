import type { ConflictDto, EntityReferenceDto } from '../../../shared/contracts/application'
import type { DatabaseSession } from './database-session'

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`

export function berthReferencesToPort(database: DatabaseSession, portId: string) {
  const rows = database.sqlite
    .prepare('SELECT id, code, status FROM berths WHERE port_id = ? ORDER BY code')
    .all(portId) as { id: string; code: number; status: 'ACTIVE' | 'INACTIVE' }[]
  return rows.map(({ id, code, status }) => ({
    status,
    reference: { kind: 'BERTH', id, label: `Banchina ${code}` } satisfies EntityReferenceDto,
  }))
}

export function portReferences(
  database: DatabaseSession,
  id: string,
  versionIds: readonly string[],
  deleting: boolean,
  managed: readonly string[] = [],
): ConflictDto[] {
  return foreignReferences(
    database,
    { kind: 'PORT', id, label: '' },
    deleting ? 'ports' : null,
    'port_versions',
    versionIds,
    ['berths', 'port_versions', 'port_time_zones', 'port_identifier_reservations', ...managed],
  )
}

export function berthReferences(
  database: DatabaseSession,
  id: string,
  versionIds: readonly string[],
  deleting: boolean,
  managed: readonly string[] = [],
): ConflictDto[] {
  return foreignReferences(
    database,
    { kind: 'BERTH', id, label: '' },
    deleting ? 'berths' : null,
    'berth_versions',
    versionIds,
    ['berth_versions', 'berth_identifier_reservations', ...managed],
  )
}

/** Inspect actual foreign keys, including external rows configured with CASCADE. */
export function foreignReferences(
  database: DatabaseSession,
  reference: EntityReferenceDto,
  identityTable: string | null,
  versionTable: string,
  versionIds: readonly string[],
  owned: readonly string[],
  versionIdColumn = 'id',
): ConflictDto[] {
  const tables = database.sqlite
    .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]
  const blockers: ConflictDto[] = []
  for (const { name } of tables) {
    if (owned.includes(name)) continue
    const keys = database.sqlite.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all() as {
      id: number
      seq: number
      table: string
      from: string
      to: string | null
    }[]
    for (const constraint of new Set(keys.map(({ id }) => id))) {
      const columns = keys.filter(({ id }) => id === constraint)
      const [key] = columns
      const target = key.table.toLowerCase()
      const ids =
        target === identityTable ? [reference.id] : target === versionTable ? versionIds : []
      if (!ids.length) continue
      // REFERENCES parent without a column list targets its actual primary key,
      // in PK order. Owned rows need not use a column named "id".
      const primaryKey = columns.some(({ to }) => to === null)
        ? (
            database.sqlite.prepare(`PRAGMA table_info(${quote(key.table)})`).all() as {
              name: string
              pk: number
            }[]
          )
            .filter(({ pk }) => pk > 0)
            .sort((a, b) => a.pk - b.pk)
        : []
      const matches = columns
        .map(
          ({ from, to, seq }) =>
            `parent.${quote(to ?? primaryKey[seq].name)} = child.${quote(from)}`,
        )
        .join(' AND ')
      const count = database.sqlite
        .prepare(
          `SELECT count(*) FROM ${quote(name)} child WHERE EXISTS (
          SELECT 1 FROM ${quote(key.table)} parent WHERE parent.${quote(target === identityTable ? 'id' : versionIdColumn)} IN (SELECT value FROM json_each(?)) AND ${matches})`,
        )
        .pluck()
        .get(JSON.stringify(ids)) as number
      if (count)
        blockers.push({
          reference: { ...reference, label: `${name}: ${count} riferimenti` },
          reason:
            'Il riferimento persistente deve essere gestito prima della modifica; nessun elemento collegato verrà eliminato automaticamente.',
        })
    }
  }
  return blockers
}
