import type {
  AssignmentTarget,
  SpecifiedSubjectsDto,
  EffectiveSubjectsDto,
  EffectiveSubjectDto,
} from '../../../shared/contracts/assignments'
import { ArchiveError } from '../../../shared/errors/archive-error'
import type { DatabaseSession } from './database-session'
import type { SubjectOpeningIds } from '../../domain/operations/subject-context'

const tables = {
  VESSEL_OPERATION: 'vessel_operations',
  VOYAGE: 'voyages',
  PORT_CALL: 'port_calls',
  BERTH_STAY: 'berth_stays',
} as const
export class AssignmentRepository {
  constructor(private readonly database: DatabaseSession) {}
  specified(target: AssignmentTarget, optional = false): SpecifiedSubjectsDto {
    const row = this.database.sqlite
      .prepare(
        `SELECT customer_id AS customerId, agency_id AS agencyId FROM ${tables[target.kind]} WHERE id=?`,
      )
      .get(target.id) as SpecifiedSubjectsDto | undefined
    if (!row && !optional)
      throw new ArchiveError('NOT_FOUND', 'Il livello di assegnazione non esiste.')
    return row ?? { customerId: null, agencyId: null }
  }
  save(target: AssignmentTarget, value: SpecifiedSubjectsDto) {
    this.database.sqlite
      .prepare(
        `UPDATE ${tables[target.kind]} SET customer_id=?,agency_id=? WHERE id=? AND (customer_id IS NOT ? OR agency_id IS NOT ?)`,
      )
      .run(value.customerId, value.agencyId, target.id, value.customerId, value.agencyId)
  }
  ancestors(target: AssignmentTarget): AssignmentTarget[] {
    if (target.kind === 'VOYAGE') return [target]
    if (target.kind === 'PORT_CALL') {
      const row = this.database.sqlite
        .prepare('SELECT voyage_id AS id FROM port_calls WHERE id=?')
        .get(target.id) as { id: string }
      return [target, { kind: 'VOYAGE', id: row.id }]
    }
    if (target.kind === 'BERTH_STAY') {
      const row = this.database.sqlite
        .prepare('SELECT port_call_id AS id FROM berth_stays WHERE id=?')
        .get(target.id) as { id: string }
      return [target, ...this.ancestors({ kind: 'PORT_CALL', id: row.id })]
    }
    return [target]
  }
  startedAt(target: AssignmentTarget): string {
    return this.database.sqlite
      .prepare(`SELECT started_at FROM ${tables[target.kind]} WHERE id=?`)
      .pluck()
      .get(target.id) as string
  }
  openings(): Map<string, SubjectOpeningIds> {
    return new Map(
      (
        this.database.sqlite
          .prepare(
            `SELECT b.opening_operation_id AS operationId, b.id AS berthStayId, p.id AS portCallId, p.voyage_id AS voyageId FROM berth_stays b JOIN port_calls p ON p.id=b.port_call_id`,
          )
          .all() as (SubjectOpeningIds & { operationId: string })[]
      ).map((r) => [r.operationId, r]),
    )
  }
  subjectVersion(
    kind: 'customer' | 'agency',
    id: string,
    utc: string,
  ): { id: string; businessName: string } {
    const row = this.database.sqlite
      .prepare(
        `SELECT id,business_name AS businessName FROM ${kind}_versions WHERE ${kind}_id=? AND (effective_from IS NULL OR effective_from<=?) ORDER BY effective_from DESC LIMIT 1`,
      )
      .get(id, utc) as { id: string; businessName: string } | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'La versione del soggetto non esiste.')
    return row
  }
  subjects(chargeId: string): EffectiveSubjectsDto {
    const row = this.database.sqlite
      .prepare(
        `SELECT s.*,c.business_name AS customer_name,a.business_name AS agency_name FROM operation_charge_subjects s LEFT JOIN customer_versions c ON c.id=s.customer_version_id LEFT JOIN agency_versions a ON a.id=s.agency_version_id WHERE charge_id=?`,
      )
      .get(chargeId) as Record<string, string | null> | undefined
    const one = (kind: 'customer' | 'agency'): EffectiveSubjectDto | null =>
      row?.[kind + '_id']
        ? {
            id: row[kind + '_id']!,
            versionId: row[kind + '_version_id']!,
            businessName: row[kind + '_name']!,
            source: {
              kind: row[kind + '_source'] as AssignmentTarget['kind'],
              id: row[kind + '_source_id']!,
            },
          }
        : null
    return { customer: one('customer'), agency: one('agency') }
  }
  saveSubjects(chargeId: string, subjects: EffectiveSubjectsDto) {
    const values = [
      chargeId,
      ...(['customer', 'agency'] as const).flatMap((kind) => {
        const s = subjects[kind]
        return [s?.id ?? null, s?.versionId ?? null, s?.source.kind ?? null, s?.source.id ?? null]
      }),
    ]
    this.database.sqlite
      .prepare(
        `INSERT INTO operation_charge_subjects VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(charge_id) DO UPDATE SET customer_id=excluded.customer_id,customer_version_id=excluded.customer_version_id,customer_source=excluded.customer_source,customer_source_id=excluded.customer_source_id,agency_id=excluded.agency_id,agency_version_id=excluded.agency_version_id,agency_source=excluded.agency_source,agency_source_id=excluded.agency_source_id`,
      )
      .run(...values)
  }
}
