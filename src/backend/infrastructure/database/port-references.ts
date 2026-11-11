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
): ConflictDto[] {
  return foreignReferences(
    database,
    { kind: 'PORT', id, label: '' },
    deleting ? 'ports' : null,
    'port_versions',
    versionIds,
    ['berths', 'port_versions', 'port_time_zones', 'port_identifier_reservations'],
  )
}

export function berthReferences(
  database: DatabaseSession,
  id: string,
  versionIds: readonly string[],
  deleting: boolean,
): ConflictDto[] {
  return foreignReferences(
    database,
    { kind: 'BERTH', id, label: '' },
    deleting ? 'berths' : null,
    'berth_versions',
    versionIds,
    ['berth_versions', 'berth_identifier_reservations'],
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
): ConflictDto[] {
  const tables = database.sqlite
    .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]
  const blockers: ConflictDto[] = []
  for (const { name } of tables) {
    if (owned.includes(name)) continue
    const keys = database.sqlite.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all() as {
      id: number
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
      const matches = columns
        .map(({ from, to }) => `parent.${quote(to ?? 'id')} = child.${quote(from)}`)
        .join(' AND ')
      const count = database.sqlite
        .prepare(
          `SELECT count(*) FROM ${quote(name)} child WHERE EXISTS (
          SELECT 1 FROM ${quote(key.table)} parent WHERE parent.id IN (SELECT value FROM json_each(?)) AND ${matches})`,
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
