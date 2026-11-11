import { randomUUID } from 'node:crypto'
import type {
  CustomerDto,
  CustomerListQuery,
  CustomerVersionDto,
} from '../../../shared/contracts/customers'
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
type CustomerRow = Omit<CustomerDto, 'selectable' | 'version'> & {
  selectable: 0 | 1
  versionId: string
} & Omit<VersionRow, 'id'>

const momentColumns =
  'v.effective_from AS utc, v.effective_local_date_time AS local_date_time, v.effective_zone_id AS zone_id, v.effective_utc_offset AS utc_offset'
const selection = `SELECT b.id, b.code, b.status,
  (b.status = 'ACTIVE') AS selectable,
  v.id AS versionId, v.business_name AS businessName, ${momentColumns},
  (SELECT min(f.effective_from) FROM customer_versions f
    WHERE f.customer_id = b.id AND f.effective_from > @now) AS nextTransitionAt
  FROM customers b
  JOIN customer_versions v ON v.id = (SELECT c.id FROM customer_versions c
    WHERE c.customer_id = b.id AND (c.effective_from IS NULL OR c.effective_from <= @now)
    ORDER BY c.effective_from DESC LIMIT 1)`

function version(row: VersionRow): CustomerVersionDto {
  return {
    id: row.id,
    businessName: row.businessName,
    effectiveFrom: row.utc,
    effectiveMoment: row.utc === null ? null : momentFromColumns(row),
    effectiveTo: null,
    phase: 'CURRENT',
  }
}

function customer(row: CustomerRow): CustomerDto {
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
export class CustomerRepository {
  constructor(
    private readonly database: DatabaseSession,
    private readonly now: string,
  ) {}

  get(id: string): CustomerDto {
    const row = this.database.sqlite
      .prepare(`${selection} WHERE b.id = @id`)
      .get({ now: this.now, id }) as CustomerRow | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'Il cliente non esiste.')
    return customer(row)
  }

  requireSelectable(id: string): CustomerDto {
    const result = this.get(id)
    if (!result.selectable)
      throw new ArchiveError('NOT_SELECTABLE', 'Il cliente non è selezionabile.')
    return result
  }

  list(query: CustomerListQuery): PageDto<CustomerDto> {
    const { search, page, pageSize, selectableOnly } = query
    const sql = this.database.sqlite
    const filter = `WHERE (@allStatuses = 1 OR b.status = 'ACTIVE') AND
      (@search = '' OR CAST(b.code AS TEXT) = @search OR EXISTS (
        SELECT 1 FROM customer_identifier_reservations r WHERE r.customer_id = b.id
          AND instr(r.normalized_business_name, @search) > 0))`
    const parameters = {
      search: normalizedIdentifier(search),
      allStatuses: Number(!selectableOnly),
    }
    const total = sql
      .prepare(`SELECT count(*) FROM customers b ${filter}`)
      .pluck()
      .get(parameters) as number
    const rows = sql
      .prepare(`${selection} ${filter} ORDER BY b.code LIMIT @limit OFFSET @offset`)
      .all({
        ...parameters,
        now: this.now,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }) as CustomerRow[]
    return { items: rows.map(customer), total, page, pageSize }
  }

  versions(id: string): CustomerVersionDto[] {
    const rows = this.database.sqlite
      .prepare(
        `SELECT v.id, v.business_name AS businessName, ${momentColumns} FROM customer_versions v WHERE v.customer_id = ?`,
      )
      .all(id) as VersionRow[]
    return versionSequence(rows.map(version), this.now)
  }

  create(businessName: string): CustomerDto {
    const sql = this.database.sqlite
    const id = randomUUID()
    this.assertAvailable(id, businessName)
    const last = sql
      .prepare('SELECT last_code FROM customer_code_counter WHERE singleton = 1')
      .pluck()
      .get() as number
    if (!Number.isSafeInteger(last) || last >= Number.MAX_SAFE_INTEGER)
      throw new ArchiveError('LIMIT_EXCEEDED', 'È stato raggiunto il limite dei codici cliente.')
    sql.prepare('UPDATE customer_code_counter SET last_code = ? WHERE singleton = 1').run(last + 1)
    sql
      .prepare("INSERT INTO customers (id, code, status) VALUES (?, ?, 'ACTIVE')")
      .run(id, last + 1)
    sql
      .prepare('INSERT INTO customer_versions (id, customer_id, business_name) VALUES (?, ?, ?)')
      .run(randomUUID(), id, businessName)
    this.reserve(id, businessName)
    return this.get(id)
  }

  assertAvailable(customerId: string, businessName: string): void {
    const conflict = this.database.sqlite
      .prepare(
        `SELECT b.id, b.code FROM customer_identifier_reservations r
        JOIN customers b ON b.id = r.customer_id
        WHERE r.normalized_business_name = ? AND r.customer_id <> ?`,
      )
      .get(normalizedIdentifier(businessName), customerId) as
      { id: string; code: number } | undefined
    if (conflict)
      throw new ArchiveError(
        'DUPLICATE_IDENTIFIER',
        'Questa ragione sociale è riservata a un altro cliente.',
        [
          {
            path: ['businessName'],
            code: 'DUPLICATE_IDENTIFIER',
            message: 'Ragione sociale già riservata in questa anagrafica.',
          },
        ],
        [
          {
            reference: { kind: 'CUSTOMER', id: conflict.id, label: `Cliente ${conflict.code}` },
            reason: 'Chiave identificativa storica già riservata.',
          },
        ],
      )
  }

  private reserve(customerId: string, businessName: string): void {
    this.database.sqlite
      .prepare(
        `INSERT INTO customer_identifier_reservations (id, customer_id, normalized_business_name, created_at)
        VALUES (?, ?, ?, ?) ON CONFLICT (normalized_business_name) DO NOTHING`,
      )
      .run(randomUUID(), customerId, normalizedIdentifier(businessName), this.now)
  }

  saveVersion(customer: CustomerDto, version: CustomerVersionDto, insert: boolean): void {
    this.assertAvailable(customer.id, version.businessName)
    this.reserve(customer.id, version.businessName)
    const moment = version.effectiveMoment ? momentToColumns(version.effectiveMoment) : null
    const values = [
      version.businessName,
      moment?.utc ?? null,
      moment?.local_date_time ?? null,
      moment?.zone_id ?? null,
      moment?.utc_offset ?? null,
      version.id,
      customer.id,
    ]
    const statement = insert
      ? `INSERT INTO customer_versions (business_name, effective_from, effective_local_date_time, effective_zone_id,
          effective_utc_offset, id, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
      : `UPDATE customer_versions SET business_name = ?, effective_from = ?, effective_local_date_time = ?,
          effective_zone_id = ?, effective_utc_offset = ? WHERE id = ? AND customer_id = ?`
    this.database.sqlite.prepare(statement).run(...values)
  }

  deleteVersion(id: string, versionId: string): void {
    this.database.sqlite
      .prepare(
        'DELETE FROM customer_versions WHERE customer_id = ? AND id = ? AND effective_from IS NOT NULL',
      )
      .run(id, versionId)
  }

  setStatus(id: string, status: CustomerDto['status']): void {
    this.database.sqlite
      .prepare('UPDATE customers SET status = ? WHERE id = ? AND status <> ?')
      .run(status, id, status)
  }

  delete(id: string): void {
    const sql = this.database.sqlite
    sql.prepare('DELETE FROM customer_versions WHERE customer_id = ?').run(id)
    sql.prepare('DELETE FROM customer_identifier_reservations WHERE customer_id = ?').run(id)
    sql.prepare('DELETE FROM customers WHERE id = ?').run(id)
  }
}
