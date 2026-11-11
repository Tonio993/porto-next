import { randomUUID } from 'node:crypto'
import type {
  AgencyDto,
  AgencyListQuery,
  AgencyVersionDto,
} from '../../../shared/contracts/agencies'
import type { PageDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { versionSequence } from '../../domain/ports/version-sequence'
import { normalizedIdentifier } from '../../domain/values/identifiers'
import type { DatabaseSession } from './database-session'
import { momentFromColumns, momentToColumns } from './moment-storage'

type VersionRow = {
  id: string
  businessName: string
  utc: string | null
  local_date_time: string | null
  zone_id: string | null
  utc_offset: string | null
}
type AgencyRow = Omit<AgencyDto, 'selectable' | 'version'> & {
  selectable: 0 | 1
  versionId: string
} & Omit<VersionRow, 'id'>

const momentColumns =
  'v.effective_from AS utc, v.effective_local_date_time AS local_date_time, v.effective_zone_id AS zone_id, v.effective_utc_offset AS utc_offset'
const selection = `SELECT b.id, b.code, b.status,
  (b.status = 'ACTIVE') AS selectable,
  v.id AS versionId, v.business_name AS businessName, ${momentColumns},
  (SELECT min(f.effective_from) FROM agency_versions f
    WHERE f.agency_id = b.id AND f.effective_from > @now) AS nextTransitionAt
  FROM agencies b
  JOIN agency_versions v ON v.id = (SELECT c.id FROM agency_versions c
    WHERE c.agency_id = b.id AND (c.effective_from IS NULL OR c.effective_from <= @now)
    ORDER BY c.effective_from DESC LIMIT 1)`

function version(row: VersionRow): AgencyVersionDto {
  return {
    id: row.id,
    businessName: row.businessName,
    effectiveFrom: row.utc,
    effectiveMoment: row.utc === null ? null : momentFromColumns(row),
    effectiveTo: null,
    phase: 'CURRENT',
  }
}

function agency(row: AgencyRow): AgencyDto {
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
export class AgencyRepository {
  constructor(
    private readonly database: DatabaseSession,
    private readonly now: string,
  ) {}

  get(id: string): AgencyDto {
    const row = this.database.sqlite
      .prepare(`${selection} WHERE b.id = @id`)
      .get({ now: this.now, id }) as AgencyRow | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'L’agenzia non esiste.')
    return agency(row)
  }

  requireSelectable(id: string): AgencyDto {
    const result = this.get(id)
    if (!result.selectable)
      throw new ArchiveError('NOT_SELECTABLE', 'L’agenzia non è selezionabile.')
    return result
  }

  list(query: AgencyListQuery): PageDto<AgencyDto> {
    const { search, page, pageSize, selectableOnly } = query
    const sql = this.database.sqlite
    const filter = `WHERE (@allStatuses = 1 OR b.status = 'ACTIVE') AND
      (@search = '' OR CAST(b.code AS TEXT) = @search OR EXISTS (
        SELECT 1 FROM agency_identifier_reservations r WHERE r.agency_id = b.id
          AND instr(r.normalized_business_name, @search) > 0))`
    const parameters = {
      search: normalizedIdentifier(search),
      allStatuses: Number(!selectableOnly),
    }
    const total = sql
      .prepare(`SELECT count(*) FROM agencies b ${filter}`)
      .pluck()
      .get(parameters) as number
    const rows = sql
      .prepare(`${selection} ${filter} ORDER BY b.code LIMIT @limit OFFSET @offset`)
      .all({
        ...parameters,
        now: this.now,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }) as AgencyRow[]
    return { items: rows.map(agency), total, page, pageSize }
  }

  versions(id: string): AgencyVersionDto[] {
    const rows = this.database.sqlite
      .prepare(
        `SELECT v.id, v.business_name AS businessName, ${momentColumns} FROM agency_versions v WHERE v.agency_id = ?`,
      )
      .all(id) as VersionRow[]
    return versionSequence(rows.map(version), this.now)
  }

  create(businessName: string): AgencyDto {
    const sql = this.database.sqlite
    const id = randomUUID()
    this.assertAvailable(id, businessName)
    const last = sql
      .prepare('SELECT last_code FROM agency_code_counter WHERE singleton = 1')
      .pluck()
      .get() as number
    if (!Number.isSafeInteger(last) || last >= Number.MAX_SAFE_INTEGER)
      throw new ArchiveError('LIMIT_EXCEEDED', 'È stato raggiunto il limite dei codici agenzia.')
    sql.prepare('UPDATE agency_code_counter SET last_code = ? WHERE singleton = 1').run(last + 1)
    sql.prepare("INSERT INTO agencies (id, code, status) VALUES (?, ?, 'ACTIVE')").run(id, last + 1)
    sql
      .prepare('INSERT INTO agency_versions (id, agency_id, business_name) VALUES (?, ?, ?)')
      .run(randomUUID(), id, businessName)
    this.reserve(id, businessName)
    return this.get(id)
  }

  assertAvailable(agencyId: string, businessName: string): void {
    const conflict = this.database.sqlite
      .prepare(
        `SELECT b.id, b.code FROM agency_identifier_reservations r
        JOIN agencies b ON b.id = r.agency_id
        WHERE r.normalized_business_name = ? AND r.agency_id <> ?`,
      )
      .get(normalizedIdentifier(businessName), agencyId) as { id: string; code: number } | undefined
    if (conflict)
      throw new ArchiveError(
        'DUPLICATE_IDENTIFIER',
        'Questa ragione sociale è riservata a un’altra agenzia.',
        [
          {
            path: ['businessName'],
            code: 'DUPLICATE_IDENTIFIER',
            message: 'Ragione sociale già riservata in questa anagrafica.',
          },
        ],
        [
          {
            reference: { kind: 'AGENCY', id: conflict.id, label: `Agenzia ${conflict.code}` },
            reason: 'Chiave identificativa storica già riservata.',
          },
        ],
      )
  }

  private reserve(agencyId: string, businessName: string): void {
    this.database.sqlite
      .prepare(
        `INSERT INTO agency_identifier_reservations (id, agency_id, normalized_business_name, created_at)
        VALUES (?, ?, ?, ?) ON CONFLICT (normalized_business_name) DO NOTHING`,
      )
      .run(randomUUID(), agencyId, normalizedIdentifier(businessName), this.now)
  }

  saveVersion(agency: AgencyDto, version: AgencyVersionDto, insert: boolean): void {
    this.assertAvailable(agency.id, version.businessName)
    this.reserve(agency.id, version.businessName)
    const moment = version.effectiveMoment ? momentToColumns(version.effectiveMoment) : null
    const values = [
      version.businessName,
      moment?.utc ?? null,
      moment?.local_date_time ?? null,
      moment?.zone_id ?? null,
      moment?.utc_offset ?? null,
      version.id,
      agency.id,
    ]
    const statement = insert
      ? `INSERT INTO agency_versions (business_name, effective_from, effective_local_date_time, effective_zone_id,
          effective_utc_offset, id, agency_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
      : `UPDATE agency_versions SET business_name = ?, effective_from = ?, effective_local_date_time = ?,
          effective_zone_id = ?, effective_utc_offset = ? WHERE id = ? AND agency_id = ?`
    this.database.sqlite.prepare(statement).run(...values)
  }

  deleteVersion(id: string, versionId: string): void {
    this.database.sqlite
      .prepare(
        'DELETE FROM agency_versions WHERE agency_id = ? AND id = ? AND effective_from IS NOT NULL',
      )
      .run(id, versionId)
  }

  setStatus(id: string, status: AgencyDto['status']): void {
    this.database.sqlite
      .prepare('UPDATE agencies SET status = ? WHERE id = ? AND status <> ?')
      .run(status, id, status)
  }

  delete(id: string): void {
    const sql = this.database.sqlite
    sql.prepare('DELETE FROM agency_versions WHERE agency_id = ?').run(id)
    sql.prepare('DELETE FROM agency_identifier_reservations WHERE agency_id = ?').run(id)
    sql.prepare('DELETE FROM agencies WHERE id = ?').run(id)
  }
}
