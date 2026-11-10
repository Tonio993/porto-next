import { randomUUID } from 'node:crypto'
import type {
  CreatePortDto,
  PortDto,
  PortListQueryDto,
  PortPageDto,
} from '../../../shared/contracts/ports'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { normalizedIdentifier } from '../../domain/values/identifiers'
import type { DatabaseSession } from './database-session'

const selection = `SELECT p.id, p.code, p.status, v.id AS versionId, v.effective_from AS effectiveFrom,
  v.name, v.locality, v.country_code AS countryCode, z.zone_id AS initialZoneId
  FROM ports p JOIN port_versions v ON v.port_id = p.id
  JOIN port_time_zones z ON z.port_id = p.id AND z.effective_from IS NULL
  WHERE v.id = (SELECT id FROM port_versions WHERE port_id = p.id
    AND (effective_from IS NULL OR effective_from <= ?) ORDER BY effective_from DESC LIMIT 1)`

type PortRow = Omit<PortDto, 'version'> & PortDto['version'] & { versionId: string }
function dto(row: PortRow): PortDto {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    initialZoneId: row.initialZoneId,
    version: {
      id: row.versionId,
      effectiveFrom: row.effectiveFrom,
      name: row.name,
      locality: row.locality,
      countryCode: row.countryCode,
    },
  }
}

/** Construct inside the coordinator's current session. Writes use its transaction. */
export class PortRepository {
  constructor(private readonly database: DatabaseSession) {}

  create(input: CreatePortDto): PortDto {
    const sql = this.database.sqlite
    const key = [
      normalizedIdentifier(input.name),
      normalizedIdentifier(input.locality),
      input.countryCode,
    ]
    const conflict = sql
      .prepare(
        `SELECT p.id, p.code FROM port_identifier_reservations r
      JOIN ports p ON p.id = r.port_id WHERE normalized_name = ? AND normalized_locality = ? AND country_code = ?`,
      )
      .get(...key) as { id: string; code: number } | undefined
    if (conflict)
      throw new ArchiveError(
        'DUPLICATE_IDENTIFIER',
        `Esiste già un porto con questo nome, località e paese (codice ${conflict.code}).`,
        [],
        [
          {
            reference: { kind: 'PORT', id: conflict.id, label: `Porto ${conflict.code}` },
            reason: 'Chiave identificativa già riservata.',
          },
        ],
      )
    const last = sql
      .prepare('SELECT last_code FROM port_code_counter WHERE singleton = 1')
      .pluck()
      .get() as number
    if (!Number.isSafeInteger(last) || last >= Number.MAX_SAFE_INTEGER)
      throw new ArchiveError('LIMIT_EXCEEDED', 'È stato raggiunto il limite dei codici porto.')
    const id = randomUUID()
    sql.prepare('UPDATE port_code_counter SET last_code = ? WHERE singleton = 1').run(last + 1)
    sql.prepare("INSERT INTO ports (id, code, status) VALUES (?, ?, 'ACTIVE')").run(id, last + 1)
    sql
      .prepare(
        'INSERT INTO port_versions (id, port_id, effective_from, name, locality, country_code) VALUES (?, ?, NULL, ?, ?, ?)',
      )
      .run(randomUUID(), id, input.name, input.locality, input.countryCode)
    sql
      .prepare(
        'INSERT INTO port_identifier_reservations (id, port_id, normalized_name, normalized_locality, country_code, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(randomUUID(), id, ...key, new Date().toISOString())
    sql
      .prepare(
        'INSERT INTO port_time_zones (id, port_id, effective_from, zone_id) VALUES (?, ?, NULL, ?)',
      )
      .run(randomUUID(), id, input.initialZoneId)
    return this.get(id)
  }

  get(id: string): PortDto {
    const row = this.database.sqlite
      .prepare(`${selection} AND p.id = ?`)
      .get(new Date().toISOString(), id) as PortRow | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'Il porto non esiste.')
    return dto(row)
  }

  list(query: PortListQueryDto): PortPageDto {
    // instr treats %, _ and separators literally. Reservations also retain historical names.
    const filter = ` AND EXISTS (SELECT 1 FROM port_identifier_reservations r WHERE r.port_id = p.id
      AND (instr(r.normalized_name, ?) > 0 OR instr(r.normalized_locality, ?) > 0 OR instr(r.country_code, ?) > 0))`
    const search = normalizedIdentifier(query.search)
    const parameters = [new Date().toISOString(), search, search, search]
    const sql = this.database.sqlite
    const total = sql
      .prepare(`SELECT count(*) FROM (${selection}${filter})`)
      .pluck()
      .get(...parameters) as number
    const rows = sql
      .prepare(`${selection}${filter} ORDER BY p.code LIMIT ? OFFSET ?`)
      .all(...parameters, query.pageSize, (query.page - 1) * query.pageSize) as PortRow[]
    return { items: rows.map(dto), total, page: query.page, pageSize: query.pageSize }
  }
}
