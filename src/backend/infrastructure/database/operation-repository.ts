import { AssignmentRepository } from './assignment-repository'
import type {
  VesselOperationDto,
  VoyageDto,
  StayIntervalDto,
  OperationalContextDto,
  OperationEndpointDto,
  OperationChargeDto,
} from '../../../shared/contracts/operations'
import type { BaseCalculationDto } from '../../../shared/contracts/tariffs'
import type { PageDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { operationTotal } from '../../domain/operations/charges'
import { Money } from '../../domain/values/numbers'
import type { DatabaseSession } from './database-session'
import { momentFromColumns, momentToColumns, type MomentColumns } from './moment-storage'

const intervalSelection = `id, opening_operation_id AS openingOperationId,
  closing_operation_id AS closingOperationId, started_at AS startedAt, ended_at AS endedAt`
export interface OpeningIds {
  voyageId: string
  portCallId: string
  berthStayId: string
}
interface ChargeRow {
  id: string
  operation_id: string
  charge_kind: 'ENTRY' | 'EXIT' | 'MOVEMENT'
  economic_endpoint_role: OperationChargeDto['economicEndpointRole']
  tariff_id: string
  configuration_id: string
  bracket_id: string
  weight_sequence_id: string
  weight_version_id: string
  vessel_version_id: string
  vessel_type_id: BaseCalculationDto['vesselTypeId']
  size: number
  upper_limit: number
  ordinary_value: string
  extra_width: number
  extra_value: string
  extra_count: number
  weight: string
  tariff_value_cents: string
  calculated_base_cents: string
  manual_override_cents: string | null
  effective_base_cents: string
  calculation_steps: string
  vessel_name: string
  tariff_effective_from: string
}
export class OperationRepository {
  constructor(private readonly database: DatabaseSession) {}

  get(id: string): VesselOperationDto {
    const sql = this.database.sqlite
    const op = sql
      .prepare(
        `SELECT id, vessel_id AS vesselId, vessel_version_id AS vesselVersionId,
      operation_type AS operationType, execution_status AS executionStatus, notes FROM vessel_operations WHERE id = ?`,
      )
      .get(id) as
      Omit<VesselOperationDto, 'endpoint' | 'arrival' | 'charges' | 'totalBase'> | undefined
    if (!op) throw new ArchiveError('NOT_FOUND', 'L’operazione non esiste.')
    const ends = sql
      .prepare(
        `SELECT e.*, p.name AS port_name, b.name AS berth_name FROM operation_endpoints e
      JOIN port_versions p ON p.id = e.port_version_id LEFT JOIN berth_versions b ON b.id = e.berth_version_id WHERE e.operation_id = ?`,
      )
      .all(id) as (MomentColumns & {
      id: string
      role: OperationEndpointDto['role']
      vessel_version_id: string
      port_id: string
      port_version_id: string
      berth_id: string | null
      berth_version_id: string | null
      port_name: string
      berth_name: string | null
    })[]
    const end = ends.find((e) => e.role !== 'ARRIVAL')!
    const charges = sql
      .prepare(
        `SELECT c.*, CAST(tariff_value_cents AS TEXT) AS tariff_value_cents,
      CAST(calculated_base_cents AS TEXT) AS calculated_base_cents, CAST(manual_override_cents AS TEXT) AS manual_override_cents,
      CAST(effective_base_cents AS TEXT) AS effective_base_cents, v.registered_name AS vessel_name, t.effective_from AS tariff_effective_from
      FROM operation_charges c JOIN vessel_versions v ON v.id=c.vessel_version_id JOIN tariffs t ON t.id=c.tariff_id WHERE operation_id=? ORDER BY CASE economic_endpoint_role WHEN 'ARRIVAL' THEN 1 ELSE 0 END`,
      )
      .all(id) as ChargeRow[]
    if (!end || !charges.length)
      throw new ArchiveError('INVALID_ARCHIVE', 'L’operazione salvata è incompleta.')
    const money = (cents: string) => Money.fromCents(BigInt(cents)).text
    const endpoint = (end: (typeof ends)[number]): OperationEndpointDto => ({
      id: end.id,
      role: end.role,
      vesselVersionId: end.vessel_version_id,
      moment: momentFromColumns(end),
      portId: end.port_id,
      portVersionId: end.port_version_id,
      portName: end.port_name,
      berthId: end.berth_id,
      berthVersionId: end.berth_version_id,
      berthName: end.berth_name,
    })
    const values = charges.map((c): OperationChargeDto => {
      const economic = ends.find((e) => e.role === c.economic_endpoint_role)!
      return {
        subjects: new AssignmentRepository(this.database).subjects(c.id),
        id: c.id,
        chargeKind: c.charge_kind,
        economicEndpointRole: c.economic_endpoint_role,
        manualOverrideAmount:
          c.manual_override_cents === null ? null : money(c.manual_override_cents),
        effectiveBase: money(c.effective_base_cents),
        calculation: {
          portId: economic.port_id,
          vesselId: op.vesselId,
          vesselVersionId: c.vessel_version_id,
          vesselName: c.vessel_name,
          vesselTypeId: c.vessel_type_id,
          size: c.size,
          moment: momentFromColumns(economic),
          activity: { kind: 'OPERATION', operation: c.charge_kind },
          tariffId: c.tariff_id,
          tariffEffectiveFrom: c.tariff_effective_from,
          configurationId: c.configuration_id,
          bracketId: c.bracket_id,
          upperLimit: c.upper_limit,
          ordinaryValue: c.ordinary_value,
          extraWidth: c.extra_width,
          extraValue: c.extra_value,
          extraCount: c.extra_count,
          weightSequenceId: c.weight_sequence_id,
          weightVersionId: c.weight_version_id,
          weight: c.weight,
          tariffValue: money(c.tariff_value_cents),
          base: money(c.calculated_base_cents),
          steps: JSON.parse(c.calculation_steps) as string[],
        },
      }
    })
    return {
      ...op,
      endpoint: endpoint(end),
      arrival: ends.find((e) => e.role === 'ARRIVAL')
        ? endpoint(ends.find((e) => e.role === 'ARRIVAL')!)
        : null,
      charges: values,
      totalBase: operationTotal(values),
    }
  }
  all(vesselId?: string): VesselOperationDto[] {
    const ids = this.database.sqlite
      .prepare(
        `SELECT o.id FROM vessel_operations o JOIN operation_endpoints e ON e.operation_id=o.id
      WHERE e.role <> 'ARRIVAL' ${vesselId ? 'AND o.vessel_id=?' : ''} ORDER BY e.utc, o.id`,
      )
      .all(...(vesselId ? [vesselId] : [])) as { id: string }[]
    return ids.map(({ id }) => this.get(id))
  }
  list(vesselId: string, page: number, pageSize: number): PageDto<VesselOperationDto> {
    const sql = this.database.sqlite
    const total = sql
      .prepare('SELECT count(*) FROM vessel_operations WHERE vessel_id=?')
      .pluck()
      .get(vesselId) as number
    const ids = sql
      .prepare(
        `SELECT o.id FROM vessel_operations o JOIN operation_endpoints e ON e.operation_id=o.id
      WHERE o.vessel_id=? AND e.role <> 'ARRIVAL' ORDER BY e.utc DESC LIMIT ? OFFSET ?`,
      )
      .all(vesselId, pageSize, (page - 1) * pageSize) as { id: string }[]
    return { items: ids.map(({ id }) => this.get(id)), total, page, pageSize }
  }
  contextAt(vesselId: string, utc: string): OperationalContextDto {
    const sql = this.database.sqlite
    const voyage = sql
      .prepare(
        'SELECT id FROM voyages WHERE vessel_id=? AND started_at<=? AND (ended_at IS NULL OR ended_at>=?)',
      )
      .get(vesselId, utc, utc) as { id: string } | undefined
    if (!voyage)
      return {
        status: 'OUTSIDE',
        voyageId: null,
        portCallId: null,
        berthStayId: null,
        portId: null,
        berthId: null,
      }
    const visit = sql
      .prepare(
        'SELECT id,port_id FROM port_calls WHERE voyage_id=? AND started_at<=? AND (ended_at IS NULL OR ended_at>=?)',
      )
      .get(voyage.id, utc, utc) as { id: string; port_id: string } | undefined
    const stay = visit
      ? (sql
          .prepare(
            'SELECT id,berth_id FROM berth_stays WHERE port_call_id=? AND started_at<=? AND (ended_at IS NULL OR ended_at>=?)',
          )
          .get(visit.id, utc, utc) as { id: string; berth_id: string | null } | undefined)
      : undefined
    return stay
      ? {
          status: 'IN_PORT',
          voyageId: voyage.id,
          portCallId: visit!.id,
          berthStayId: stay.id,
          portId: visit!.port_id,
          berthId: stay.berth_id,
        }
      : {
          status: 'IN_TRANSFER',
          voyageId: voyage.id,
          portCallId: visit?.id ?? null,
          berthStayId: null,
          portId: visit?.port_id ?? null,
          berthId: null,
        }
  }
  openIds(vesselId: string, utc: string): OpeningIds {
    const context = this.contextAt(vesselId, utc)
    if (context.status !== 'IN_PORT')
      throw new ArchiveError(
        'OPERATIONAL_CONTEXT_MISSING',
        'Il contesto di origine non esiste o la nave è in trasferimento.',
      )
    return context
  }
  stayClosure(id: string): { closingOperationId: string | null; endedAt: string | null } {
    return this.database.sqlite
      .prepare(
        'SELECT closing_operation_id AS closingOperationId,ended_at AS endedAt FROM berth_stays WHERE id=?',
      )
      .get(id) as { closingOperationId: string | null; endedAt: string | null }
  }
  insertRecords(op: VesselOperationDto): void {
    const sql = this.database.sqlite
    sql
      .prepare(
        'INSERT INTO vessel_operations (id,vessel_id,vessel_version_id,operation_type,execution_status,notes,created_at) VALUES (?,?,?,?,?,?,?)',
      )
      .run(
        op.id,
        op.vesselId,
        op.vesselVersionId,
        op.operationType,
        op.executionStatus,
        op.notes,
        new Date().toISOString(),
      )
    for (const endpoint of [op.endpoint, ...(op.arrival ? [op.arrival] : [])]) {
      const m = momentToColumns(endpoint.moment)
      sql
        .prepare(
          'INSERT INTO operation_endpoints (id,operation_id,vessel_id,role,vessel_version_id,port_id,port_version_id,berth_id,berth_version_id,local_date_time,zone_id,utc_offset,utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        )
        .run(
          endpoint.id,
          op.id,
          op.vesselId,
          endpoint.role,
          endpoint.vesselVersionId,
          endpoint.portId,
          endpoint.portVersionId,
          endpoint.berthId,
          endpoint.berthVersionId,
          m.local_date_time,
          m.zone_id,
          m.utc_offset,
          m.utc,
        )
    }
    this.saveCharges(op)
  }
  insert(op: VesselOperationDto, openingIds: OpeningIds): void {
    this.insertRecords(op)
    const sql = this.database.sqlite,
      e = op.endpoint,
      m = momentToColumns(e.moment)
    if (op.executionStatus === 'MISSED') return
    if (op.operationType === 'ENTRY') {
      const { voyageId, portCallId: callId, berthStayId } = openingIds
      sql
        .prepare(
          'INSERT INTO voyages (id,vessel_id,vessel_version_id,opening_operation_id,started_at) VALUES (?,?,?,?,?)',
        )
        .run(voyageId, op.vesselId, op.vesselVersionId, op.id, m.utc)
      sql
        .prepare(
          'INSERT INTO port_calls (id,voyage_id,port_id,port_version_id,opening_operation_id,started_at) VALUES (?,?,?,?,?,?)',
        )
        .run(callId, voyageId, e.portId, e.portVersionId, op.id, m.utc)
      sql
        .prepare(
          'INSERT INTO berth_stays (id,port_call_id,port_id,berth_id,berth_version_id,opening_operation_id,started_at) VALUES (?,?,?,?,?,?,?)',
        )
        .run(berthStayId, callId, e.portId, e.berthId, e.berthVersionId, op.id, m.utc)
    } else if (op.operationType === 'MOVEMENT') {
      const ids = this.openIds(op.vesselId, e.moment.utc),
        arrival = op.arrival!
      const old = this.stayClosure(ids.berthStayId)
      sql
        .prepare('UPDATE berth_stays SET closing_operation_id=?,ended_at=? WHERE id=?')
        .run(op.id, e.moment.utc, ids.berthStayId)
      if (arrival.portId !== e.portId) {
        const visit = sql
          .prepare(
            'SELECT closing_operation_id AS closingOperationId,ended_at AS endedAt FROM port_calls WHERE id=?',
          )
          .get(ids.portCallId) as { closingOperationId: string | null; endedAt: string | null }
        sql
          .prepare('UPDATE port_calls SET closing_operation_id=?,ended_at=? WHERE id=?')
          .run(op.id, e.moment.utc, ids.portCallId)
        sql
          .prepare(
            'INSERT INTO port_calls (id,voyage_id,port_id,port_version_id,opening_operation_id,started_at,closing_operation_id,ended_at) VALUES (?,?,?,?,?,?,?,?)',
          )
          .run(
            openingIds.portCallId,
            ids.voyageId,
            arrival.portId,
            arrival.portVersionId,
            op.id,
            arrival.moment.utc,
            visit.closingOperationId,
            visit.endedAt,
          )
      }
      sql
        .prepare(
          'INSERT INTO berth_stays (id,port_call_id,port_id,berth_id,berth_version_id,opening_operation_id,started_at,closing_operation_id,ended_at) VALUES (?,?,?,?,?,?,?,?,?)',
        )
        .run(
          openingIds.berthStayId,
          arrival.portId === e.portId ? ids.portCallId : openingIds.portCallId,
          arrival.portId,
          arrival.berthId,
          arrival.berthVersionId,
          op.id,
          arrival.moment.utc,
          old.closingOperationId,
          old.endedAt,
        )
    } else {
      const voyage = sql
        .prepare('SELECT id FROM voyages WHERE vessel_id=? AND started_at < ? AND ended_at IS NULL')
        .get(op.vesselId, m.utc) as { id: string } | undefined
      if (!voyage)
        throw new ArchiveError('OPERATIONAL_CONTEXT_MISSING', 'Il viaggio da chiudere non esiste.')
      sql
        .prepare(
          'UPDATE berth_stays SET closing_operation_id=?,ended_at=? WHERE port_call_id IN (SELECT id FROM port_calls WHERE voyage_id=?) AND ended_at IS NULL',
        )
        .run(op.id, m.utc, voyage.id)
      sql
        .prepare(
          'UPDATE port_calls SET closing_operation_id=?,ended_at=? WHERE voyage_id=? AND ended_at IS NULL',
        )
        .run(op.id, m.utc, voyage.id)
      sql
        .prepare('UPDATE voyages SET closing_operation_id=?,ended_at=? WHERE id=?')
        .run(op.id, m.utc, voyage.id)
    }
  }
  saveCharges(op: VesselOperationDto): void {
    for (const c of op.charges) this.saveCharge(op.id, c)
  }
  saveCharge(operationId: string, c: OperationChargeDto): void {
    const r = c.calculation
    const values = [
      c.id,
      operationId,
      c.chargeKind,
      c.economicEndpointRole,
      r.tariffId,
      r.configurationId,
      r.bracketId,
      r.weightSequenceId,
      r.weightVersionId,
      r.vesselVersionId,
      r.vesselTypeId,
      r.size,
      r.upperLimit,
      r.ordinaryValue,
      r.extraWidth,
      r.extraValue,
      r.extraCount,
      r.weight,
      Money.parse(r.tariffValue).cents,
      Money.parse(r.base).cents,
      c.manualOverrideAmount === null ? null : Money.parse(c.manualOverrideAmount).cents,
      Money.parse(c.effectiveBase).cents,
      JSON.stringify(r.steps),
    ]
    const columns = [
      'id',
      'operation_id',
      'charge_kind',
      'economic_endpoint_role',
      'tariff_id',
      'configuration_id',
      'bracket_id',
      'weight_sequence_id',
      'weight_version_id',
      'vessel_version_id',
      'vessel_type_id',
      'size',
      'upper_limit',
      'ordinary_value',
      'extra_width',
      'extra_value',
      'extra_count',
      'weight',
      'tariff_value_cents',
      'calculated_base_cents',
      'manual_override_cents',
      'effective_base_cents',
      'calculation_steps',
    ]
    this.database.sqlite
      .prepare(
        `INSERT INTO operation_charges (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})
      ON CONFLICT(id) DO UPDATE SET ${columns
        .slice(4)
        .map((k) => `${k}=excluded.${k}`)
        .join(',')}`,
      )
      .run(...values)
    new AssignmentRepository(this.database).saveSubjects(c.id, c.subjects)
  }
  stays(vesselId: string, page: number, pageSize: number): PageDto<VoyageDto> {
    const sql = this.database.sqlite
    const total = sql
      .prepare('SELECT count(*) FROM voyages WHERE vessel_id=?')
      .pluck()
      .get(vesselId) as number
    const voyages = sql
      .prepare(
        `SELECT ${intervalSelection}, vessel_id AS vesselId, vessel_version_id AS vesselVersionId FROM voyages WHERE vessel_id=? ORDER BY started_at DESC LIMIT ? OFFSET ?`,
      )
      .all(vesselId, pageSize, (page - 1) * pageSize) as Omit<VoyageDto, 'visits'>[]
    return {
      total,
      page,
      pageSize,
      items: voyages.map((v) => ({
        ...v,
        visits: (
          sql
            .prepare(
              `SELECT ${intervalSelection},port_id AS portId,port_version_id AS portVersionId FROM port_calls WHERE voyage_id=? ORDER BY started_at`,
            )
            .all(v.id) as (StayIntervalDto & { portId: string; portVersionId: string })[]
        ).map((p) => ({
          ...p,
          portName: sql
            .prepare('SELECT name FROM port_versions WHERE id=?')
            .pluck()
            .get(p.portVersionId) as string,
          stays: (
            sql
              .prepare(
                `SELECT ${intervalSelection},berth_id AS berthId,berth_version_id AS berthVersionId FROM berth_stays WHERE port_call_id=? ORDER BY started_at`,
              )
              .all(p.id) as (StayIntervalDto & {
              berthId: string | null
              berthVersionId: string | null
            })[]
          ).map((b) => ({
            ...b,
            berthName: b.berthVersionId
              ? (sql
                  .prepare('SELECT name FROM berth_versions WHERE id=?')
                  .pluck()
                  .get(b.berthVersionId) as string)
              : null,
          })),
        })),
      })),
    }
  }
}
