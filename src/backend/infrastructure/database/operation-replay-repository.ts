import { isDeepStrictEqual } from 'node:util'
import type { ConflictDto } from '../../../shared/contracts/application'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import type {
  StayIntervalDto,
  VesselOperationDto,
  VoyageDto,
} from '../../../shared/contracts/operations'
import { ArchiveError } from '../../../shared/errors/archive-error'
import type { DatabaseSession } from './database-session'
import { foreignReferences } from './port-references'
import { momentToColumns } from './moment-storage'
import { OperationRepository } from './operation-repository'

type Table = 'voyages' | 'port_calls' | 'berth_stays'
type Row = Record<string, string | null> & { id: string }
const kinds = { voyages: 'VOYAGE', port_calls: 'PORT_CALL', berth_stays: 'BERTH_STAY' } as const
const names = { voyages: 'Viaggio', port_calls: 'Visita', berth_stays: 'Ormeggio' }
const fields: Record<string, string> = {
  id: 'Identità',
  vessel_id: 'Nave',
  vessel_version_id: 'vesselVersionId',
  voyage_id: 'Viaggio',
  port_call_id: 'Visita',
  port_id: 'Porto',
  port_version_id: 'portVersionId',
  berth_id: 'Banchina',
  berth_version_id: 'berthVersionId',
  opening_operation_id: 'Operazione di apertura',
  closing_operation_id: 'Operazione di chiusura',
  started_at: 'startedAt',
  ended_at: 'endedAt',
  customer_id: 'customerId',
  agency_id: 'agencyId',
}
const managed = ['voyages', 'port_calls', 'berth_stays', 'service_activities']

/** A read-only persistence plan; actual FK constraints, including composite/CASCADE, are inspected. */
export function replayPersistence(
  database: DatabaseSession,
  vesselId: string | readonly string[],
  voyages: readonly VoyageDto[],
) {
  const sql = database.sqlite
  const vessels = JSON.stringify(typeof vesselId === 'string' ? [vesselId] : vesselId)
  const previous: Record<Table, Row[]> = {
    voyages: sql
      .prepare('SELECT * FROM voyages WHERE vessel_id IN (SELECT value FROM json_each(?))')
      .all(vessels) as Row[],
    port_calls: sql
      .prepare(
        'SELECT * FROM port_calls WHERE voyage_id IN (SELECT id FROM voyages WHERE vessel_id IN (SELECT value FROM json_each(?)))',
      )
      .all(vessels) as Row[],
    berth_stays: sql
      .prepare(
        'SELECT b.* FROM berth_stays b JOIN port_calls p ON p.id=b.port_call_id JOIN voyages v ON v.id=p.voyage_id WHERE v.vessel_id IN (SELECT value FROM json_each(?))',
      )
      .all(vessels) as Row[],
  }
  const next: Record<Table, Row[]> = { voyages: [], port_calls: [], berth_stays: [] }
  const interval = (v: StayIntervalDto) => ({
    id: v.id,
    opening_operation_id: v.openingOperationId,
    closing_operation_id: v.closingOperationId,
    started_at: v.startedAt,
    ended_at: v.endedAt,
  })
  const specified = (table: Table, id: string) => {
    const old = previous[table].find((r) => r.id === id)
    return { customer_id: old?.customer_id ?? null, agency_id: old?.agency_id ?? null }
  }
  for (const v of voyages) {
    next.voyages.push({
      ...interval(v),
      vessel_id: v.vesselId,
      vessel_version_id: v.vesselVersionId,
      ...specified('voyages', v.id),
    })
    for (const p of v.visits) {
      next.port_calls.push({
        ...interval(p),
        voyage_id: v.id,
        port_id: p.portId,
        port_version_id: p.portVersionId,
        ...specified('port_calls', p.id),
      })
      for (const b of p.stays)
        next.berth_stays.push({
          ...interval(b),
          port_call_id: p.id,
          port_id: p.portId,
          berth_id: b.berthId,
          berth_version_id: b.berthVersionId,
          ...specified('berth_stays', b.id),
        })
    }
  }
  const effects: ChangeEffectDto[] = [],
    blockers: ConflictDto[] = []
  const changed = (table: Table, row: Row) =>
    !isDeepStrictEqual(
      row,
      next[table].find((r) => r.id === row.id),
    )
  for (const table of Object.keys(kinds) as Table[]) {
    for (const id of new Set([...previous[table], ...next[table]].map((r) => r.id))) {
      const before = previous[table].find((r) => r.id === id),
        after = next[table].find((r) => r.id === id)
      if (isDeepStrictEqual(before, after)) continue
      const reference = { kind: kinds[table], id, label: names[table] }
      effects.push({
        reference,
        versionId: null,
        action: !before ? 'CREATE' : !after ? 'DELETE' : 'UPDATE',
        changes: [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])]
          .filter((k) => before?.[k] !== after?.[k])
          .map((field) => ({
            field: fields[field] ?? field,
            before: before?.[field] ?? null,
            after: after?.[field] ?? null,
          })),
      })
      if (before)
        blockers.push(...foreignReferences(database, reference, table, table, [], managed))
    }
  }
  return {
    effects,
    blockers,
    apply: () => {
      // Deferred NO ACTION FKs allow reattribution in this same transaction. Unknown
      // dependents were blocked above, so no CASCADE can silently remove a child.
      for (const table of ['berth_stays', 'port_calls', 'voyages'] as const)
        for (const row of previous[table].filter((r) => changed(table, r)))
          sql.prepare(`DELETE FROM ${table} WHERE id=?`).run(row.id)
      for (const table of ['voyages', 'port_calls', 'berth_stays'] as const)
        for (const row of next[table].filter(
          (r) =>
            !isDeepStrictEqual(
              r,
              previous[table].find((p) => p.id === r.id),
            ),
        )) {
          const columns = Object.keys(row)
          sql
            .prepare(
              `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
            )
            .run(...columns.map((c) => row[c]))
        }
    },
  }
}

export function operationReplacementBlockers(
  database: DatabaseSession,
  before: VesselOperationDto,
  after: VesselOperationDto,
): ConflictDto[] {
  const blockers: ConflictDto[] = []
  if (!isDeepStrictEqual(before, after))
    blockers.push(
      ...foreignReferences(
        database,
        { kind: 'VESSEL_OPERATION', id: before.id, label: 'Operazione modificata' },
        'vessel_operations',
        'vessel_operations',
        [],
        [...managed, 'operation_endpoints', 'operation_charges'],
      ),
    )
  for (const e of [before.endpoint, ...(before.arrival ? [before.arrival] : [])]) {
    const replacement = e.role === 'ARRIVAL' ? after.arrival : after.endpoint
    if (!isDeepStrictEqual(e, replacement))
      blockers.push(
        ...foreignReferences(
          database,
          { kind: 'VESSEL_OPERATION', id: e.id, label: 'Estremo operativo' },
          'operation_endpoints',
          'operation_endpoints',
          [],
          [...managed, 'operation_charges'],
        ),
      )
  }
  for (const c of before.charges.filter(
    (c) =>
      !isDeepStrictEqual(
        c,
        after.charges.find((a) => a.id === c.id),
      ),
  )) {
    const ref = {
      kind: 'OPERATION_CHARGE' as const,
      id: c.id,
      label: 'Componente economica rimossa',
    }
    blockers.push(
      ...foreignReferences(
        database,
        ref,
        'operation_charges',
        'operation_charge_subjects',
        [c.id],
        ['operation_charge_subjects'],
        'charge_id',
      ),
    )
  }
  return blockers
}

/** Includes references to every owned row before any explicit deletion. */
export function operationDeletionBlockers(
  database: DatabaseSession,
  operation: VesselOperationDto,
): ConflictDto[] {
  const ref = {
    kind: 'VESSEL_OPERATION' as const,
    id: operation.id,
    label: 'Operazione da eliminare',
  }
  return [
    ...foreignReferences(
      database,
      ref,
      'vessel_operations',
      'vessel_operations',
      [],
      [...managed, 'operation_endpoints', 'operation_charges'],
    ),
    ...[operation.endpoint, ...(operation.arrival ? [operation.arrival] : [])].flatMap((e) =>
      foreignReferences(
        database,
        { ...ref, id: e.id, label: 'Estremo operativo da eliminare' },
        'operation_endpoints',
        'operation_endpoints',
        [],
        [...managed, 'operation_charges'],
      ),
    ),
    ...operation.charges.flatMap((c) =>
      foreignReferences(
        database,
        { kind: 'OPERATION_CHARGE', id: c.id, label: 'Componente economica da eliminare' },
        'operation_charges',
        'operation_charge_subjects',
        [c.id],
        ['operation_charge_subjects'],
        'charge_id',
      ),
    ),
  ]
}

export function removeOperation(database: DatabaseSession, operation: VesselOperationDto): void {
  const sql = database.sqlite
  for (const c of operation.charges) {
    sql.prepare('DELETE FROM operation_charge_subjects WHERE charge_id=?').run(c.id)
    sql.prepare('DELETE FROM operation_charges WHERE id=?').run(c.id)
  }
  sql.prepare('DELETE FROM operation_endpoints WHERE operation_id=?').run(operation.id)
  sql.prepare('DELETE FROM vessel_operations WHERE id=?').run(operation.id)
}

export function replaceOperation(
  database: DatabaseSession,
  before: VesselOperationDto,
  after: VesselOperationDto,
): void {
  const sql = database.sqlite
  // Delete owned subjects and obsolete charges explicitly, before changing shape.
  for (const c of before.charges.filter((c) => !after.charges.some((a) => a.id === c.id))) {
    sql.prepare('DELETE FROM operation_charge_subjects WHERE charge_id=?').run(c.id)
    sql.prepare('DELETE FROM operation_charges WHERE id=?').run(c.id)
  }
  const endpoints = [after.endpoint, ...(after.arrival ? [after.arrival] : [])]
  const previous = [before.endpoint, ...(before.arrival ? [before.arrival] : [])]
  for (const e of previous.filter((e) => !endpoints.some((a) => a.id === e.id)))
    sql.prepare('DELETE FROM operation_endpoints WHERE id=?').run(e.id)
  sql
    .prepare(
      'UPDATE vessel_operations SET vessel_id=?,vessel_version_id=?,operation_type=?,execution_status=?,notes=? WHERE id=?',
    )
    .run(
      after.vesselId,
      after.vesselVersionId,
      after.operationType,
      after.executionStatus,
      after.notes,
      after.id,
    )
  // Existing movement triggers check the other endpoint immediately. Moving
  // both past the previous arrival therefore requires updating arrival first.
  if (after.arrival && before.arrival && after.endpoint.moment.utc >= before.arrival.moment.utc)
    endpoints.reverse()
  for (const e of endpoints) {
    const original = previous.find((p) => p.id === e.id)
    if (before.vesselId === after.vesselId && isDeepStrictEqual(original, e)) continue
    const m = momentToColumns(e.moment)
    const values = [
      after.vesselId,
      e.role,
      e.vesselVersionId,
      e.portId,
      e.portVersionId,
      e.berthId,
      e.berthVersionId,
      m.local_date_time,
      m.zone_id,
      m.utc_offset,
      m.utc,
    ]
    if (original)
      sql
        .prepare(
          'UPDATE operation_endpoints SET vessel_id=?,role=?,vessel_version_id=?,port_id=?,port_version_id=?,berth_id=?,berth_version_id=?,local_date_time=?,zone_id=?,utc_offset=?,utc=? WHERE id=?',
        )
        .run(...values, e.id)
    else
      sql
        .prepare(
          'INSERT INTO operation_endpoints (vessel_id,role,vessel_version_id,port_id,port_version_id,berth_id,berth_version_id,local_date_time,zone_id,utc_offset,utc,id,operation_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        )
        .run(...values, e.id, after.id)
  }
  new OperationRepository(database).saveCharges(after)
}

export function assertReplayIntegrity(database: DatabaseSession) {
  if ((database.sqlite.pragma('foreign_key_check') as unknown[]).length)
    throw new ArchiveError(
      'PREVIEW_BLOCKED',
      'La consuntivazione viola un riferimento persistente: nessuna modifica è stata applicata.',
    )
}

/** Descriptive update: deliberately does not reconstruct chronology or calculations. */
export function updateOperationNotes(
  database: DatabaseSession,
  id: string,
  notes: string | null,
): void {
  database.sqlite
    .prepare('UPDATE vessel_operations SET notes=? WHERE id=? AND notes IS NOT ?')
    .run(notes, id, notes)
}
