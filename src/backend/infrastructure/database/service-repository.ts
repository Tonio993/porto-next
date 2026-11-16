import type { ServiceActivityDto, ServiceListQuery } from '../../../shared/contracts/services'
import type { PageDto } from '../../../shared/contracts/master-data'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { Money } from '../../domain/values/numbers'
import type { DatabaseSession } from './database-session'
import { foreignReferences } from './port-references'
import { AssignmentRepository } from './assignment-repository'
import { momentFromColumns, momentToColumns, type MomentColumns } from './moment-storage'
import { PortRepository } from './port-repository'
import { BerthRepository } from './berth-repository'
import { VesselRepository } from './vessel-repository'
import type { BaseCalculationDto } from '../../../shared/contracts/tariffs'

export class ServiceRepository {
  constructor(private readonly database: DatabaseSession) {}
  get(id: string): ServiceActivityDto {
    const row = this.database.sqlite
      .prepare(
        `SELECT s.*,CAST(s.base_cents AS TEXT) AS base,
      v.registered_name AS vessel_name,p.name AS port_name,b.name AS berth_name
      FROM service_activities s JOIN vessel_versions v ON v.id=s.vessel_version_id
      JOIN port_versions p ON p.id=s.port_version_id LEFT JOIN berth_versions b ON b.id=s.berth_version_id WHERE s.id=?`,
      )
      .get(id) as (MomentColumns & Record<string, string | null>) | undefined
    if (!row) throw new ArchiveError('NOT_FOUND', 'La prestazione non esiste.')
    return {
      id,
      ...(row.category === 'CATALOG'
        ? {
            category: 'CATALOG' as const,
            serviceTypeId: row.service_type_id!,
            calculation: JSON.parse(row.calculation!) as BaseCalculationDto,
          }
        : { category: 'FREE' as const, serviceTypeId: null, calculation: null }),
      vesselId: row.vessel_id!,
      vesselVersionId: row.vessel_version_id!,
      vesselName: row.vessel_name!,
      moment: momentFromColumns(row),
      executionStatus: row.execution_status as ServiceActivityDto['executionStatus'],
      description:
        row.category === 'CATALOG'
          ? (this.database.sqlite
              .prepare('SELECT description FROM service_types WHERE id=?')
              .pluck()
              .get(row.service_type_id) as string)
          : row.description!,
      base: Money.fromCents(BigInt(row.base!)).text,
      notes: row.notes,
      context: {
        status: 'IN_PORT',
        voyageId: row.voyage_id!,
        portCallId: row.port_call_id!,
        berthStayId: row.berth_stay_id!,
        portId: row.port_id!,
        berthId: row.berth_id,
      },
      portVersionId: row.port_version_id!,
      portName: row.port_name!,
      berthVersionId: row.berth_version_id,
      berthName: row.berth_name,
      specified: { customerId: row.customer_id, agencyId: row.agency_id },
      subjects: new AssignmentRepository(this.database).subjects(id, 'service'),
    }
  }
  all(): ServiceActivityDto[] {
    return (
      this.database.sqlite.prepare('SELECT id FROM service_activities ORDER BY utc,id').all() as {
        id: string
      }[]
    ).map((r) => this.get(r.id))
  }
  list(query: ServiceListQuery): PageDto<ServiceActivityDto> {
    const columns = {
      vesselId: 's.vessel_id',
      category: 's.category',
      serviceTypeId: 's.service_type_id',
      executionStatus: 's.execution_status',
      portId: 's.port_id',
      berthId: 's.berth_id',
      voyageId: 's.voyage_id',
      portCallId: 's.port_call_id',
      berthStayId: 's.berth_stay_id',
      customerId: 'subjects.customer_id',
      agencyId: 'subjects.agency_id',
    } as const
    const conditions: string[] = [],
      args: string[] = []
    for (const [key, column] of Object.entries(columns)) {
      const value = query[key as keyof typeof columns]
      if (value) {
        conditions.push(column + '=?')
        args.push(value)
      }
    }
    if (query.fromUtc) {
      conditions.push('s.utc>=?')
      args.push(query.fromUtc)
    }
    if (query.toUtc) {
      conditions.push('s.utc<=?')
      args.push(query.toUtc)
    }
    const from =
      'FROM service_activities s JOIN service_activity_subjects subjects ON subjects.service_id=s.id' +
      (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '')
    const total = this.database.sqlite
      .prepare('SELECT count(*) ' + from)
      .pluck()
      .get(...args) as number
    const rows = this.database.sqlite
      .prepare('SELECT s.id ' + from + ' ORDER BY s.utc DESC,s.id LIMIT ? OFFSET ?')
      .all(...args, query.pageSize, (query.page - 1) * query.pageSize) as { id: string }[]
    return {
      items: rows.map((r) => this.get(r.id)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }
  deleteBlockers(value: ServiceActivityDto) {
    // Inspect external FKs to both the activity and its owned row, including CASCADE.
    const reference = { kind: 'SERVICE_ACTIVITY' as const, id: value.id, label: value.description }
    return foreignReferences(
      this.database,
      reference,
      'service_activities',
      'service_activity_subjects',
      [value.id],
      ['service_activity_subjects'],
      'service_id',
    )
  }
  delete(id: string) {
    this.database.sqlite.prepare('DELETE FROM service_activity_subjects WHERE service_id=?').run(id)
    this.database.sqlite.prepare('DELETE FROM service_activities WHERE id=?').run(id)
  }
  updateNotes(id: string, notes: string | null) {
    if (this.get(id).notes !== notes)
      this.database.sqlite
        .prepare('UPDATE service_activities SET notes=? WHERE id=?')
        .run(notes, id)
  }
  save(value: ServiceActivityDto) {
    const m = momentToColumns(value.moment),
      c = value.context
    this.database.sqlite
      .prepare(
        `UPDATE service_activities SET vessel_id=?,vessel_version_id=?,execution_status=?,description=?,base_cents=?,notes=?,local_date_time=?,zone_id=?,utc_offset=?,utc=?,voyage_id=?,port_call_id=?,berth_stay_id=?,port_id=?,port_version_id=?,berth_id=?,berth_version_id=?,customer_id=?,agency_id=?,service_type_id=?,tariff_id=?,configuration_id=?,bracket_id=?,weight_sequence_id=?,weight_version_id=?,calculation=? WHERE id=?`,
      )
      .run(
        value.vesselId,
        value.vesselVersionId,
        value.executionStatus,
        value.category === 'FREE' ? value.description : null,
        Money.parse(value.base).cents,
        value.notes,
        m.local_date_time,
        m.zone_id,
        m.utc_offset,
        m.utc,
        c.voyageId,
        c.portCallId,
        c.berthStayId,
        c.portId,
        value.portVersionId,
        c.berthId,
        value.berthVersionId,
        value.specified.customerId,
        value.specified.agencyId,
        ...this.economicColumns(value),
        value.id,
      )
    new AssignmentRepository(this.database).saveSubjects(value.id, value.subjects, 'service')
  }
  versions(context: ServiceActivityDto['context'], vesselId: string, utc: string) {
    const at = <T extends { effectiveFrom: string | null; effectiveTo: string | null }>(
      versions: readonly T[],
    ) =>
      versions.find(
        (v) =>
          (!v.effectiveFrom || v.effectiveFrom <= utc) && (!v.effectiveTo || utc < v.effectiveTo),
      )!
    const now = new Date().toISOString()
    const vessel = at(new VesselRepository(this.database, now).versions(vesselId))
    const port = at(new PortRepository(this.database).versions(context.portId))
    const berth = context.berthId
      ? at(new BerthRepository(this.database, now).versions(context.berthId))
      : null
    return {
      vesselVersionId: vessel.id,
      vesselName: vessel.registeredName,
      portVersionId: port.id,
      portName: port.name,
      berthVersionId: berth?.id ?? null,
      berthName: berth?.name ?? null,
    }
  }
  insert(value: ServiceActivityDto) {
    const m = momentToColumns(value.moment),
      c = value.context
    this.database.sqlite
      .prepare(
        `INSERT INTO service_activities (id,category,vessel_id,vessel_version_id,execution_status,description,base_cents,notes,local_date_time,zone_id,utc_offset,utc,voyage_id,port_call_id,berth_stay_id,port_id,port_version_id,berth_id,berth_version_id,customer_id,agency_id,created_at,service_type_id,tariff_id,configuration_id,bracket_id,weight_sequence_id,weight_version_id,calculation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        value.id,
        value.category,
        value.vesselId,
        value.vesselVersionId,
        value.executionStatus,
        value.category === 'FREE' ? value.description : null,
        Money.parse(value.base).cents,
        value.notes,
        m.local_date_time,
        m.zone_id,
        m.utc_offset,
        m.utc,
        c.voyageId,
        c.portCallId,
        c.berthStayId,
        c.portId,
        value.portVersionId,
        c.berthId,
        value.berthVersionId,
        value.specified.customerId,
        value.specified.agencyId,
        new Date().toISOString(),
        ...this.economicColumns(value),
      )
    new AssignmentRepository(this.database).saveSubjects(value.id, value.subjects, 'service')
  }
  private economicColumns(value: ServiceActivityDto) {
    const c = value.calculation
    return [
      value.serviceTypeId,
      c?.tariffId ?? null,
      c?.configurationId ?? null,
      c?.bracketId ?? null,
      c?.weightSequenceId ?? null,
      c?.weightVersionId ?? null,
      c ? JSON.stringify(c) : null,
    ]
  }
  saveAttribution(value: ServiceActivityDto) {
    const c = value.context
    this.database.sqlite
      .prepare(
        `UPDATE service_activities SET vessel_version_id=?,voyage_id=?,port_call_id=?,berth_stay_id=?,port_id=?,port_version_id=?,berth_id=?,berth_version_id=?,base_cents=?,service_type_id=?,tariff_id=?,configuration_id=?,bracket_id=?,weight_sequence_id=?,weight_version_id=?,calculation=? WHERE id=?`,
      )
      .run(
        value.vesselVersionId,
        c.voyageId,
        c.portCallId,
        c.berthStayId,
        c.portId,
        value.portVersionId,
        c.berthId,
        value.berthVersionId,
        Money.parse(value.base).cents,
        ...this.economicColumns(value),
        value.id,
      )
    new AssignmentRepository(this.database).saveSubjects(value.id, value.subjects, 'service')
  }
}
