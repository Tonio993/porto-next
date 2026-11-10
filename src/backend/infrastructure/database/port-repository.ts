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
import type { PortDescriptionDto, PortVersionDto } from '../../../shared/contracts/ports'
import { momentFromColumns, momentToColumns } from './moment-storage'
import { versionSequence } from '../../domain/ports/version-sequence'

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
    nextTransitionAt: null,
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
  private readonly now: () => string
  constructor(
    private readonly database: DatabaseSession,
    now = () => new Date().toISOString(),
  ) {
    // One observation instant for current version, history and next boundary.
    const instant = now()
    this.now = () => instant
  }

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
    const row = this.database.sqlite.prepare(`${selection} AND p.id = ?`).get(this.now(), id) as
      PortRow | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'Il porto non esiste.')
    return { ...dto(row), nextTransitionAt: this.nextTransition(id) }
  }

  private nextTransition(id: string): string | null {
    return this.database.sqlite
      .prepare(
        'SELECT min(effective_from) FROM port_versions WHERE port_id = ? AND effective_from > ?',
      )
      .pluck()
      .get(id, this.now()) as string | null
  }

  versions(id: string): PortVersionDto[] {
    const rows = this.database.sqlite
      .prepare(
        `SELECT id, name, locality, country_code AS countryCode,
      effective_from AS utc, effective_local_date_time AS local_date_time,
      effective_zone_id AS zone_id, effective_utc_offset AS utc_offset FROM port_versions WHERE port_id = ?`,
      )
      .all(id) as (PortDescriptionDto & {
      id: string
      utc: string | null
      local_date_time: string | null
      zone_id: string | null
      utc_offset: string | null
    })[]
    return versionSequence(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        locality: row.locality,
        countryCode: row.countryCode,
        effectiveFrom: row.utc,
        effectiveMoment: row.utc === null ? null : momentFromColumns(row),
        effectiveTo: null,
        phase: 'CURRENT',
      })),
      this.now(),
    )
  }

  reserve(portId: string, description: PortDescriptionDto): void {
    this.assertAvailable(portId, description)
    this.database.sqlite
      .prepare(
        `INSERT OR IGNORE INTO port_identifier_reservations
      (id, port_id, normalized_name, normalized_locality, country_code, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        portId,
        normalizedIdentifier(description.name),
        normalizedIdentifier(description.locality),
        description.countryCode,
        this.now(),
      )
  }

  assertAvailable(portId: string, description: PortDescriptionDto): void {
    const row = this.database.sqlite
      .prepare(
        `SELECT port_id FROM port_identifier_reservations WHERE normalized_name = ?
      AND normalized_locality = ? AND country_code = ? AND port_id <> ?`,
      )
      .get(
        normalizedIdentifier(description.name),
        normalizedIdentifier(description.locality),
        description.countryCode,
        portId,
      ) as { port_id: string } | undefined
    if (row)
      throw new ArchiveError(
        'DUPLICATE_IDENTIFIER',
        'Questi dati sono riservati a un altro porto.',
        [],
        [
          {
            reference: { kind: 'PORT', id: row.port_id, label: 'Porto già esistente' },
            reason: 'Chiave identificativa storica già riservata.',
          },
        ],
      )
  }

  saveVersion(portId: string, version: PortVersionDto, insert: boolean): void {
    this.reserve(portId, version)
    const moment = version.effectiveMoment ? momentToColumns(version.effectiveMoment) : null
    const values = [
      version.name,
      version.locality,
      version.countryCode,
      moment?.utc ?? null,
      moment?.local_date_time ?? null,
      moment?.zone_id ?? null,
      moment?.utc_offset ?? null,
    ]
    if (insert)
      this.database.sqlite
        .prepare(
          `INSERT INTO port_versions
      (name, locality, country_code, effective_from, effective_local_date_time, effective_zone_id, effective_utc_offset, id, port_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(...values, version.id, portId)
    else
      this.database.sqlite
        .prepare(
          `UPDATE port_versions SET name = ?, locality = ?, country_code = ?, effective_from = ?,
      effective_local_date_time = ?, effective_zone_id = ?, effective_utc_offset = ? WHERE id = ? AND port_id = ?`,
        )
        .run(...values, version.id, portId)
  }

  deleteVersion(portId: string, id: string): void {
    this.database.sqlite
      .prepare(
        'DELETE FROM port_versions WHERE port_id = ? AND id = ? AND effective_from IS NOT NULL',
      )
      .run(portId, id)
  }

  setStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): void {
    this.database.sqlite
      .prepare('UPDATE ports SET status = ? WHERE id = ? AND status <> ?')
      .run(status, id, status)
  }

  delete(id: string): void {
    for (const table of ['port_versions', 'port_identifier_reservations', 'port_time_zones'])
      this.database.sqlite.prepare(`DELETE FROM ${table} WHERE port_id = ?`).run(id)
    this.database.sqlite.prepare('DELETE FROM ports WHERE id = ?').run(id)
  }

  list(query: PortListQueryDto): PortPageDto {
    // instr treats %, _ and separators literally. Reservations also retain historical names.
    const filter = ` AND EXISTS (SELECT 1 FROM port_identifier_reservations r WHERE r.port_id = p.id
      AND (instr(r.normalized_name, ?) > 0 OR instr(r.normalized_locality, ?) > 0 OR instr(r.country_code, ?) > 0))`
    const search = normalizedIdentifier(query.search)
    const parameters = [this.now(), search, search, search]
    const sql = this.database.sqlite
    const total = sql
      .prepare(`SELECT count(*) FROM (${selection}${filter})`)
      .pluck()
      .get(...parameters) as number
    const rows = sql
      .prepare(`${selection}${filter} ORDER BY p.code LIMIT ? OFFSET ?`)
      .all(...parameters, query.pageSize, (query.page - 1) * query.pageSize) as PortRow[]
    return {
      items: rows.map((row) => ({ ...dto(row), nextTransitionAt: this.nextTransition(row.id) })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }
}
