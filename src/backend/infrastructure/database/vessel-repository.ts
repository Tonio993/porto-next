import { randomUUID } from 'node:crypto'
import type {
  VesselDto,
  VesselListQuery,
  VesselVersionDto,
  VesselDescriptionDto,
} from '../../../shared/contracts/vessels'
import type { PageDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { versionSequence } from '../../domain/ports/version-sequence'
import { normalizedIdentifier } from '../../domain/values/identifiers'
import { utcInstant } from '../../domain/values/moments'
import type { DatabaseSession } from './database-session'
import { momentFromColumns, momentToColumns } from './moment-storage'

type VersionRow = {
  id: string
  registeredName: string
  imoNumber: string | null
  vesselTypeId: VesselDescriptionDto['vesselTypeId']
  size: number
  utc: string | null
  local_date_time: string | null
  zone_id: string | null
  utc_offset: string | null
}
type VesselRow = Omit<VesselDto, 'selectable' | 'version'> & {
  selectable: 0 | 1
  versionId: string
} & Omit<VersionRow, 'id'>

const momentColumns =
  'v.effective_from AS utc, v.effective_local_date_time AS local_date_time, v.effective_zone_id AS zone_id, v.effective_utc_offset AS utc_offset'
const selection = `SELECT b.id, b.code, b.status,
  (b.status = 'ACTIVE') AS selectable,
  v.id AS versionId, v.registered_name AS registeredName, v.imo_number AS imoNumber,
  v.vessel_type_id AS vesselTypeId, v.size, ${momentColumns},
  (SELECT min(f.effective_from) FROM vessel_versions f
    WHERE f.vessel_id = b.id AND f.effective_from > @now) AS nextTransitionAt
  FROM vessels b
  JOIN vessel_versions v ON v.id = (SELECT c.id FROM vessel_versions c
    WHERE c.vessel_id = b.id AND (c.effective_from IS NULL OR c.effective_from <= @now)
    ORDER BY c.effective_from DESC LIMIT 1)`

function version(row: VersionRow): VesselVersionDto {
  return {
    id: row.id,
    registeredName: row.registeredName,
    imoNumber: row.imoNumber,
    vesselTypeId: row.vesselTypeId,
    size: row.size,
    effectiveFrom: row.utc,
    effectiveMoment: row.utc === null ? null : momentFromColumns(row),
    effectiveTo: null,
    phase: 'CURRENT',
  }
}

function vessel(row: VesselRow): VesselDto {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    selectable: row.selectable === 1,
    nextTransitionAt: row.nextTransitionAt,
    version: { ...version({ ...row, id: row.versionId }), effectiveTo: row.nextTransitionAt },
  }
}

/** Reads share one observation instant. Writes run inside the archive command transaction. */
export class VesselRepository {
  constructor(
    private readonly database: DatabaseSession,
    private readonly now: string,
  ) {}

  get(id: string): VesselDto {
    const row = this.database.sqlite
      .prepare(`${selection} WHERE b.id = @id`)
      .get({ now: this.now, id }) as VesselRow | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'La nave non esiste.')
    return vessel(row)
  }

  requireSelectable(id: string): VesselDto {
    const result = this.get(id)
    if (!result.selectable) throw new ArchiveError('NOT_SELECTABLE', 'La nave non è selezionabile.')
    return result
  }

  /** Resolve historical data independently of current selectability. */
  versionAt(id: string, instant: unknown): VesselVersionDto {
    const at = utcInstant(instant)
    this.get(id)
    return this.versions(id).find(
      (v) =>
        (v.effectiveFrom === null || v.effectiveFrom <= at) &&
        (v.effectiveTo === null || at < v.effectiveTo),
    )!
  }

  list(query: VesselListQuery): PageDto<VesselDto> {
    const { search, page, pageSize, selectableOnly } = query
    const sql = this.database.sqlite
    const filter = `WHERE (@allStatuses = 1 OR b.status = 'ACTIVE') AND
      (@search = '' OR CAST(b.code AS TEXT) = @search OR EXISTS (
        SELECT 1 FROM vessel_identifier_reservations r WHERE r.vessel_id = b.id
          AND instr(r.normalized_value, @search) > 0))`
    const parameters = {
      search: normalizedIdentifier(search),
      allStatuses: Number(!selectableOnly),
    }
    const total = sql
      .prepare(`SELECT count(*) FROM vessels b ${filter}`)
      .pluck()
      .get(parameters) as number
    const rows = sql
      .prepare(`${selection} ${filter} ORDER BY b.code LIMIT @limit OFFSET @offset`)
      .all({
        ...parameters,
        now: this.now,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }) as VesselRow[]
    return { items: rows.map(vessel), total, page, pageSize }
  }

  versions(id: string): VesselVersionDto[] {
    const rows = this.database.sqlite
      .prepare(
        `SELECT v.id, v.registered_name AS registeredName, v.imo_number AS imoNumber,
        v.vessel_type_id AS vesselTypeId, v.size, ${momentColumns} FROM vessel_versions v WHERE v.vessel_id = ?`,
      )
      .all(id) as VersionRow[]
    return versionSequence(rows.map(version), this.now)
  }

  create(description: VesselDescriptionDto): VesselDto {
    const sql = this.database.sqlite
    const id = randomUUID()
    this.assertAvailable(id, description)
    const last = sql
      .prepare('SELECT last_code FROM vessel_code_counter WHERE singleton = 1')
      .pluck()
      .get() as number
    if (!Number.isSafeInteger(last) || last >= Number.MAX_SAFE_INTEGER)
      throw new ArchiveError('LIMIT_EXCEEDED', 'È stato raggiunto il limite dei codici nave.')
    sql.prepare('UPDATE vessel_code_counter SET last_code = ? WHERE singleton = 1').run(last + 1)
    sql.prepare("INSERT INTO vessels (id, code, status) VALUES (?, ?, 'ACTIVE')").run(id, last + 1)
    sql
      .prepare(
        'INSERT INTO vessel_versions (id, vessel_id, registered_name, imo_number, vessel_type_id, size) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        randomUUID(),
        id,
        description.registeredName,
        description.imoNumber,
        description.vesselTypeId,
        description.size,
      )
    this.reserve(id, description)
    return this.get(id)
  }

  assertAvailable(vesselId: string, description: VesselDescriptionDto): void {
    for (const [kind, field, label] of [
      ['NAME', 'registeredName', 'Nome di registrazione'],
      ['IMO', 'imoNumber', 'IMO'],
    ] as const) {
      const value = description[field]
      if (value === null) continue
      const conflict = this.database.sqlite
        .prepare(
          `SELECT b.id, b.code FROM vessel_identifier_reservations r
        JOIN vessels b ON b.id = r.vessel_id
        WHERE r.kind = ? AND r.normalized_value = ? AND r.vessel_id <> ?`,
        )
        .get(kind, normalizedIdentifier(value), vesselId) as
        { id: string; code: number } | undefined
      if (conflict)
        throw new ArchiveError(
          'DUPLICATE_IDENTIFIER',
          `${label} già riservato a un’altra nave.`,
          [
            {
              path: [field],
              code: 'DUPLICATE_IDENTIFIER',
              message: `${label} già riservato in questa anagrafica.`,
            },
          ],
          [
            {
              reference: { kind: 'VESSEL', id: conflict.id, label: `Nave ${conflict.code}` },
              reason: 'Chiave identificativa storica già riservata.',
            },
          ],
        )
    }
  }

  private reserve(vesselId: string, description: VesselDescriptionDto): void {
    for (const [kind, value] of [
      ['NAME', description.registeredName],
      ['IMO', description.imoNumber],
    ] as const) {
      if (value === null) continue
      this.database.sqlite
        .prepare(
          `INSERT INTO vessel_identifier_reservations (id, vessel_id, kind, normalized_value, created_at)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT (kind, normalized_value) DO NOTHING`,
        )
        .run(randomUUID(), vesselId, kind, normalizedIdentifier(value), this.now)
    }
  }

  saveVersion(vessel: VesselDto, version: VesselVersionDto, insert: boolean): void {
    this.assertAvailable(vessel.id, version)
    this.reserve(vessel.id, version)
    const moment = version.effectiveMoment ? momentToColumns(version.effectiveMoment) : null
    const values = [
      version.registeredName,
      version.imoNumber,
      version.vesselTypeId,
      version.size,
      moment?.utc ?? null,
      moment?.local_date_time ?? null,
      moment?.zone_id ?? null,
      moment?.utc_offset ?? null,
      version.id,
      vessel.id,
    ]
    const statement = insert
      ? `INSERT INTO vessel_versions (registered_name, imo_number, vessel_type_id, size, effective_from, effective_local_date_time, effective_zone_id,
          effective_utc_offset, id, vessel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `UPDATE vessel_versions SET registered_name = ?, imo_number = ?, vessel_type_id = ?, size = ?, effective_from = ?, effective_local_date_time = ?,
          effective_zone_id = ?, effective_utc_offset = ? WHERE id = ? AND vessel_id = ?`
    this.database.sqlite.prepare(statement).run(...values)
  }

  deleteVersion(id: string, versionId: string): void {
    this.database.sqlite
      .prepare(
        'DELETE FROM vessel_versions WHERE vessel_id = ? AND id = ? AND effective_from IS NOT NULL',
      )
      .run(id, versionId)
  }

  setStatus(id: string, status: VesselDto['status']): void {
    this.database.sqlite
      .prepare('UPDATE vessels SET status = ? WHERE id = ? AND status <> ?')
      .run(status, id, status)
  }

  delete(id: string): void {
    const sql = this.database.sqlite
    sql.prepare('DELETE FROM vessel_versions WHERE vessel_id = ?').run(id)
    sql.prepare('DELETE FROM vessel_identifier_reservations WHERE vessel_id = ?').run(id)
    sql.prepare('DELETE FROM vessels WHERE id = ?').run(id)
  }
}
