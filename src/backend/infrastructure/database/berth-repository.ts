import { randomUUID } from 'node:crypto'
import type { BerthDto, BerthListQuery, BerthVersionDto } from '../../../shared/contracts/berths'
import type { PageDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { versionSequence } from '../../domain/ports/version-sequence'
import { normalizedIdentifier } from '../../domain/values/identifiers'
import type { DatabaseSession } from './database-session'
import { momentFromColumns, momentToColumns } from './moment-storage'

type VersionRow = {
  id: string
  name: string
  utc: string | null
  local_date_time: string | null
  zone_id: string | null
  utc_offset: string | null
}
type BerthRow = Omit<BerthDto, 'selectable' | 'version'> & {
  selectable: 0 | 1
  versionId: string
} & Omit<VersionRow, 'id'>

const momentColumns =
  'v.effective_from AS utc, v.effective_local_date_time AS local_date_time, v.effective_zone_id AS zone_id, v.effective_utc_offset AS utc_offset'
const selection = `SELECT b.id, b.port_id AS portId, b.code, b.status,
  (b.status = 'ACTIVE' AND p.status = 'ACTIVE') AS selectable,
  v.id AS versionId, v.name, ${momentColumns},
  (SELECT min(f.effective_from) FROM berth_versions f
    WHERE f.berth_id = b.id AND f.effective_from > @now) AS nextTransitionAt
  FROM berths b JOIN ports p ON p.id = b.port_id
  JOIN berth_versions v ON v.id = (SELECT c.id FROM berth_versions c
    WHERE c.berth_id = b.id AND (c.effective_from IS NULL OR c.effective_from <= @now)
    ORDER BY c.effective_from DESC LIMIT 1)`

function version(row: VersionRow): BerthVersionDto {
  return {
    id: row.id,
    name: row.name,
    effectiveFrom: row.utc,
    effectiveMoment: row.utc === null ? null : momentFromColumns(row),
    effectiveTo: null,
    phase: 'CURRENT',
  }
}

function berth(row: BerthRow): BerthDto {
  return {
    id: row.id,
    portId: row.portId,
    code: row.code,
    status: row.status,
    selectable: row.selectable === 1,
    nextTransitionAt: row.nextTransitionAt,
    version: { ...version({ ...row, id: row.versionId }), effectiveTo: row.nextTransitionAt },
  }
}

/** Reads share one observation instant. Writes run inside the archive command transaction. */
export class BerthRepository {
  constructor(
    private readonly database: DatabaseSession,
    private readonly now: string,
  ) {}

  get(id: string): BerthDto {
    const row = this.database.sqlite
      .prepare(`${selection} WHERE b.id = @id`)
      .get({ now: this.now, id }) as BerthRow | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'La banchina non esiste.')
    return berth(row)
  }

  requireSelectable(portId: string, id: string): BerthDto {
    const result = this.get(id)
    if (!result.selectable || result.portId !== portId)
      throw new ArchiveError('NOT_SELECTABLE', 'La banchina non è selezionabile per questo porto.')
    return result
  }

  list(query: BerthListQuery): PageDto<BerthDto> {
    const { portId, page, pageSize, selectableOnly } = query
    const sql = this.database.sqlite
    const filter = `WHERE b.port_id = @portId AND
      (@allStatuses = 1 OR (b.status = 'ACTIVE' AND p.status = 'ACTIVE'))`
    const parameters = { portId, allStatuses: Number(!selectableOnly) }
    const total = sql
      .prepare(`SELECT count(*) FROM berths b JOIN ports p ON p.id = b.port_id ${filter}`)
      .pluck()
      .get(parameters) as number
    const rows = sql
      .prepare(`${selection} ${filter} ORDER BY b.code LIMIT @limit OFFSET @offset`)
      .all({
        ...parameters,
        now: this.now,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }) as BerthRow[]
    return { items: rows.map(berth), total, page, pageSize }
  }

  versions(id: string): BerthVersionDto[] {
    const rows = this.database.sqlite
      .prepare(`SELECT v.id, v.name, ${momentColumns} FROM berth_versions v WHERE v.berth_id = ?`)
      .all(id) as VersionRow[]
    return versionSequence(rows.map(version), this.now)
  }

  create(portId: string, name: string): BerthDto {
    const sql = this.database.sqlite
    const status = sql.prepare('SELECT status FROM ports WHERE id = ?').pluck().get(portId)
    if (!status) throw new ArchiveError('NOT_FOUND', 'Il porto non esiste.')
    if (status !== 'ACTIVE')
      throw new ArchiveError('NOT_SELECTABLE', 'Per creare una banchina serve un porto attivo.')
    const id = randomUUID()
    this.assertAvailable(portId, id, name)
    const last = sql
      .prepare('SELECT last_code FROM berth_code_counter WHERE singleton = 1')
      .pluck()
      .get() as number
    if (!Number.isSafeInteger(last) || last >= Number.MAX_SAFE_INTEGER)
      throw new ArchiveError('LIMIT_EXCEEDED', 'È stato raggiunto il limite dei codici banchina.')
    sql.prepare('UPDATE berth_code_counter SET last_code = ? WHERE singleton = 1').run(last + 1)
    sql
      .prepare("INSERT INTO berths (id, port_id, code, status) VALUES (?, ?, ?, 'ACTIVE')")
      .run(id, portId, last + 1)
    sql
      .prepare('INSERT INTO berth_versions (id, berth_id, name) VALUES (?, ?, ?)')
      .run(randomUUID(), id, name)
    this.reserve(portId, id, name)
    return this.get(id)
  }

  assertAvailable(portId: string, berthId: string, name: string): void {
    const conflict = this.database.sqlite
      .prepare(
        `SELECT b.id, b.code FROM berth_identifier_reservations r
        JOIN berths b ON b.id = r.berth_id
        WHERE r.port_id = ? AND r.normalized_name = ? AND r.berth_id <> ?`,
      )
      .get(portId, normalizedIdentifier(name), berthId) as { id: string; code: number } | undefined
    if (conflict)
      throw new ArchiveError(
        'DUPLICATE_IDENTIFIER',
        'Questo nome è riservato a un’altra banchina del porto.',
        [
          {
            path: ['name'],
            code: 'DUPLICATE_IDENTIFIER',
            message: 'Nome già riservato in questo porto.',
          },
        ],
        [
          {
            reference: { kind: 'BERTH', id: conflict.id, label: `Banchina ${conflict.code}` },
            reason: 'Chiave identificativa storica già riservata.',
          },
        ],
      )
  }

  private reserve(portId: string, berthId: string, name: string): void {
    this.database.sqlite
      .prepare(
        `INSERT INTO berth_identifier_reservations (id, port_id, berth_id, normalized_name, created_at)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT (port_id, normalized_name) DO NOTHING`,
      )
      .run(randomUUID(), portId, berthId, normalizedIdentifier(name), this.now)
  }

  saveVersion(berth: BerthDto, version: BerthVersionDto, insert: boolean): void {
    this.assertAvailable(berth.portId, berth.id, version.name)
    this.reserve(berth.portId, berth.id, version.name)
    const moment = version.effectiveMoment ? momentToColumns(version.effectiveMoment) : null
    const values = [
      version.name,
      moment?.utc ?? null,
      moment?.local_date_time ?? null,
      moment?.zone_id ?? null,
      moment?.utc_offset ?? null,
      version.id,
      berth.id,
    ]
    const statement = insert
      ? `INSERT INTO berth_versions (name, effective_from, effective_local_date_time, effective_zone_id,
          effective_utc_offset, id, berth_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
      : `UPDATE berth_versions SET name = ?, effective_from = ?, effective_local_date_time = ?,
          effective_zone_id = ?, effective_utc_offset = ? WHERE id = ? AND berth_id = ?`
    this.database.sqlite.prepare(statement).run(...values)
  }

  deleteVersion(id: string, versionId: string): void {
    this.database.sqlite
      .prepare(
        'DELETE FROM berth_versions WHERE berth_id = ? AND id = ? AND effective_from IS NOT NULL',
      )
      .run(id, versionId)
  }

  setStatus(id: string, status: BerthDto['status']): void {
    this.database.sqlite
      .prepare('UPDATE berths SET status = ? WHERE id = ? AND status <> ?')
      .run(status, id, status)
  }

  delete(id: string): void {
    const sql = this.database.sqlite
    sql.prepare('DELETE FROM berth_versions WHERE berth_id = ?').run(id)
    sql.prepare('DELETE FROM berth_identifier_reservations WHERE berth_id = ?').run(id)
    sql.prepare('DELETE FROM berths WHERE id = ?').run(id)
  }
}
