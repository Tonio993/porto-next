import type { AssignmentLevel } from '../../../shared/contracts/assignments'
import type {
  VersionReferenceDto,
  ConfigurationReferenceDto,
  ActivityReferenceDto,
  StayReferenceDto,
} from '../../../shared/contracts/descriptive-references'
import {
  operationLabels,
  executionLabels,
  endpointLabels,
} from '../../../shared/description-labels'
import type { DatabaseSession } from './database-session'
import { momentFromColumns, type MomentColumns } from './moment-storage'

type VersionKind = VersionReferenceDto['kind']
const versions = {
  PORT: ['port_versions', 'port_id', 'name'],
  BERTH: ['berth_versions', 'berth_id', 'name'],
  VESSEL: ['vessel_versions', 'vessel_id', 'registered_name'],
  CUSTOMER: ['customer_versions', 'customer_id', 'business_name'],
  AGENCY: ['agency_versions', 'agency_id', 'business_name'],
  TARIFF: ['tariffs', 'port_id', "'Tariffa'"],
  WEIGHT_VERSION: ['weight_versions', 'sequence_id', "'Peso'"],
} as const
const levels = { VOYAGE: 'Viaggio', PORT_CALL: 'Visita', BERTH_STAY: 'Ormeggio' } as const

/** One instance per related read/preview page; indexed lookups are memoized, never persisted. */
export class DescriptiveReferenceRepository {
  private readonly cache = new Map<string, unknown>()
  constructor(
    private readonly database: DatabaseSession,
    private readonly observedAt: string,
  ) {}
  private read<T>(key: string, query: () => T): T {
    if (!this.cache.has(key)) this.cache.set(key, query())
    return this.cache.get(key) as T
  }
  version(kind: VersionKind, id: string | null): VersionReferenceDto | null {
    if (!id) return null
    return this.read('version:' + kind + ':' + id, () => {
      const [table, owner, name] = versions[kind]
      const row = this.database.sqlite
        .prepare(
          'SELECT v.*, ' +
            name +
            ' AS name, (SELECT min(n.effective_from) FROM ' +
            table +
            ' n WHERE n.' +
            owner +
            '=v.' +
            owner +
            ' AND (v.effective_from IS NULL OR n.effective_from>v.effective_from)) AS effective_to FROM ' +
            table +
            ' v WHERE v.id=?',
        )
        .get(id) as Record<string, string | null> | undefined
      if (!row) return null
      let label = row.name!
      if (kind === 'PORT') label += ' · ' + row.locality + ' · ' + row.country_code
      if (kind === 'BERTH') {
        const owner = this.database.sqlite
          .prepare('SELECT p.code FROM berths b JOIN ports p ON p.id=b.port_id WHERE b.id=?')
          .pluck()
          .get(row.berth_id!) as number | undefined
        label +=
          owner === undefined
            ? ' · Porto proprietario non disponibile'
            : ' · Porto proprietario (codice ' + owner + ')'
      }
      if (kind === 'VESSEL' && row.imo_number) label += ' · IMO ' + row.imo_number
      if (kind === 'TARIFF')
        label += ' · ' + this.identity('PORT', row.port_id!, row.effective_from ?? this.observedAt)
      if (kind === 'WEIGHT_VERSION') label += ' · ' + this.weightOwner(row.sequence_id!)
      return {
        kind,
        name: label,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
        effectiveMoment: row.effective_from
          ? momentFromColumns({
              utc: row.effective_from,
              local_date_time: row.effective_local_date_time!,
              zone_id: row.effective_zone_id!,
              utc_offset: row.effective_utc_offset!,
            })
          : null,
      }
    })
  }
  versionAt(
    kind: Exclude<VersionKind, 'TARIFF' | 'WEIGHT_VERSION'>,
    id: string,
    instant = this.observedAt,
  ): VersionReferenceDto | null {
    return this.read('identity:' + kind + ':' + id + ':' + instant, () => {
      const [table, owner] = versions[kind]
      const row = this.database.sqlite
        .prepare(
          'SELECT id FROM ' +
            table +
            ' WHERE ' +
            owner +
            '=? AND (effective_from IS NULL OR effective_from<=?) ORDER BY effective_from DESC LIMIT 1',
        )
        .get(id, instant) as { id: string } | undefined
      return row ? this.version(kind, row.id) : null
    })
  }
  identity(
    kind: Exclude<VersionKind, 'TARIFF' | 'WEIGHT_VERSION'>,
    id: string,
    instant = this.observedAt,
  ): string {
    return this.versionAt(kind, id, instant)?.name ?? 'Riferimento non disponibile'
  }
  weightOwner(sequenceId: string): string {
    return this.read('weight:' + sequenceId, () => {
      const row = this.database.sqlite
        .prepare(
          'SELECT w.operation_type, s.description FROM weight_sequences w LEFT JOIN service_types s ON s.id=w.service_type_id WHERE w.id=?',
        )
        .get(sequenceId) as
        | { operation_type: keyof typeof operationLabels | null; description: string | null }
        | undefined
      return row?.operation_type
        ? operationLabels[row.operation_type]
        : (row?.description ?? 'Attività non disponibile')
    })
  }
  catalog(id: string): string | null {
    return this.read(
      'catalog:' + id,
      () =>
        (this.database.sqlite
          .prepare('SELECT description FROM service_types WHERE id=?')
          .pluck()
          .get(id) as string | undefined) ?? null,
    )
  }
  configuration(id: string, bracket: boolean): ConfigurationReferenceDto | null {
    return this.read('configuration:' + bracket + ':' + id, () => {
      const row = this.database.sqlite
        .prepare(
          bracket
            ? 'SELECT c.vessel_type_id AS type, c.tariff_id AS tariffId, b.upper_limit AS upperLimit, b.value FROM tariff_brackets b JOIN tariff_configurations c ON c.id=b.configuration_id WHERE b.id=?'
            : 'SELECT vessel_type_id AS type, tariff_id AS tariffId FROM tariff_configurations WHERE id=?',
        )
        .get(id) as
        | {
            type: ConfigurationReferenceDto['vesselTypeId']
            tariffId: string
            upperLimit?: number
            value?: string
          }
        | undefined
      return row
        ? {
            configuration: true,
            vesselTypeId: row.type,
            tariff: this.version('TARIFF', row.tariffId),
            ...(bracket ? { upperLimit: row.upperLimit, value: row.value } : {}),
          }
        : null
    })
  }
  activity(id: string, utc?: string): ActivityReferenceDto | null {
    return this.read('activity:' + id + ':' + (utc ?? ''), () => {
      const row = this.database.sqlite
        .prepare(
          'SELECT e.*, o.operation_type, v.registered_name, p.name AS port_name, p.locality, p.country_code, o.execution_status, b.name AS berth_name FROM operation_endpoints e JOIN vessel_operations o ON o.id=e.operation_id JOIN vessel_versions v ON v.id=e.vessel_version_id JOIN port_versions p ON p.id=e.port_version_id LEFT JOIN berth_versions b ON b.id=e.berth_version_id WHERE o.id=?' +
            (utc ? ' AND e.utc=?' : " AND e.role<>'ARRIVAL'"),
        )
        .get(...(utc ? [id, utc] : [id])) as
        | (MomentColumns & {
            operation_type: keyof typeof operationLabels
            execution_status: keyof typeof executionLabels
            role: keyof typeof endpointLabels
            locality: string
            country_code: string
            registered_name: string
            port_name: string
            berth_name: string | null
          })
        | undefined
      return row
        ? {
            name:
              operationLabels[row.operation_type] +
              ' · ' +
              executionLabels[row.execution_status] +
              (row.role === 'OCCURRENCE' ? '' : ' · ' + endpointLabels[row.role]) +
              ' · ' +
              row.registered_name +
              ' · ' +
              row.port_name +
              ' · ' +
              row.locality +
              ' · ' +
              row.country_code +
              ' · ' +
              (row.berth_name ?? 'Banchina non specificata'),
            moment: momentFromColumns(row),
          }
        : null
    })
  }
  charge(id: string): ActivityReferenceDto | null {
    return this.read('charge:' + id, () => {
      const row = this.database.sqlite
        .prepare(
          'SELECT c.operation_id, c.charge_kind, e.utc FROM operation_charges c JOIN operation_endpoints e ON e.operation_id=c.operation_id AND e.role=c.economic_endpoint_role WHERE c.id=?',
        )
        .get(id) as
        { operation_id: string; charge_kind: keyof typeof operationLabels; utc: string } | undefined
      const activity = row ? this.activity(row.operation_id, row.utc) : null
      return row && activity
        ? {
            ...activity,
            name: 'Componente ' + operationLabels[row.charge_kind] + ' · ' + activity.name,
          }
        : null
    })
  }
  stay(kind: keyof typeof levels, id: string): StayReferenceDto | null {
    return this.read('stay:' + kind + ':' + id, () => {
      const table =
        kind === 'VOYAGE' ? 'voyages' : kind === 'PORT_CALL' ? 'port_calls' : 'berth_stays'
      const row = this.database.sqlite
        .prepare(
          'SELECT opening_operation_id, closing_operation_id, started_at, ended_at FROM ' +
            table +
            ' WHERE id=?',
        )
        .get(id) as
        | {
            opening_operation_id: string
            closing_operation_id: string | null
            started_at: string
            ended_at: string | null
          }
        | undefined
      if (!row) return null
      const opening = this.activity(row.opening_operation_id, row.started_at)
      if (!opening) return null
      return {
        name: levels[kind] + ' · ' + opening.name,
        opening,
        closing:
          row.closing_operation_id && row.ended_at
            ? this.activity(row.closing_operation_id, row.ended_at)
            : null,
      }
    })
  }
  origin(kind: AssignmentLevel, id: string): StayReferenceDto | ActivityReferenceDto | null {
    if (kind === 'VESSEL_OPERATION') return this.activity(id)
    if (kind !== 'SERVICE_ACTIVITY') return this.stay(kind, id)
    return this.read('service:' + id, () => {
      const row = this.database.sqlite
        .prepare(
          'SELECT s.*, coalesce(t.description,s.description) AS activity_name, v.registered_name, p.name AS port_name FROM service_activities s LEFT JOIN service_types t ON t.id=s.service_type_id JOIN vessel_versions v ON v.id=s.vessel_version_id JOIN port_versions p ON p.id=s.port_version_id WHERE s.id=?',
        )
        .get(id) as
        | (MomentColumns & { activity_name: string; registered_name: string; port_name: string })
        | undefined
      return row
        ? {
            name: row.activity_name + ' · ' + row.registered_name + ' · ' + row.port_name,
            moment: momentFromColumns(row),
          }
        : null
    })
  }
}
