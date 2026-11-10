import type { ConflictDto } from '../../../shared/contracts/application'
import type { DatabaseSession } from './database-session'

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`
/** Inspect actual foreign keys. Owned rows are deleted explicitly, never external rows. */
export function portReferences(
  database: DatabaseSession,
  portId: string,
  versionIds: readonly string[],
  deletingPort: boolean,
): ConflictDto[] {
  const owned = new Set(['port_versions', 'port_time_zones', 'port_identifier_reservations'])
  const tables = database.sqlite
    .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]
  const blockers: ConflictDto[] = []
  for (const { name } of tables) {
    if (owned.has(name)) continue
    const keys = database.sqlite.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all() as {
      table: string
      from: string
      to: string
    }[]
    for (const key of keys) {
      const ids =
        key.table === 'ports' && deletingPort
          ? [portId]
          : key.table === 'port_versions'
            ? versionIds
            : []
      if (!ids.length) continue
      const count = database.sqlite
        .prepare(
          `SELECT count(*) FROM ${quote(name)} WHERE ${quote(key.from)} IN (${ids.map(() => '?').join(',')})`,
        )
        .pluck()
        .get(...ids) as number
      if (count)
        blockers.push({
          reference: { kind: 'PORT', id: portId, label: `${name}: ${count} riferimenti` },
          reason:
            'Il riferimento persistente deve essere gestito prima della modifica; nessun elemento collegato verrà eliminato automaticamente.',
        })
    }
  }
  return blockers
}
