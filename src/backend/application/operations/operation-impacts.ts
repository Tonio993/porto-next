import type { ConflictDto } from '../../../shared/contracts/application'
import type { ServiceActivityDto } from '../../../shared/contracts/services'
import { ServiceRepository } from '../../infrastructure/database/service-repository'
import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import type { VesselOperationDto, OperationChargeDto } from '../../../shared/contracts/operations'
import type { PortVersionDto } from '../../../shared/contracts/ports'
import type { BerthVersionDto } from '../../../shared/contracts/berths'
import type { VesselVersionDto } from '../../../shared/contracts/vessels'
import type { TariffDto } from '../../../shared/contracts/tariffs'
import type { DatabaseSession } from '../../infrastructure/database/database-session'
import { OperationRepository } from '../../infrastructure/database/operation-repository'
import { calculateBase } from '../tariffs/calculate-base'
import { recalculateService } from '../services/service-calculation'

export const operationTables = [
  'service_activities',
  'vessel_operations',
  'operation_endpoints',
  'operation_charges',
  'voyages',
  'port_calls',
  'berth_stays',
] as const
type MasterChange =
  | { kind: 'VESSEL'; id: string; versions: readonly VesselVersionDto[] }
  | { kind: 'PORT'; id: string; versions: readonly PortVersionDto[] }
  | { kind: 'BERTH'; id: string; versions: readonly BerthVersionDto[] }
function at<T extends { effectiveFrom: string | null; effectiveTo: string | null }>(
  versions: readonly T[],
  utc: string,
): T {
  return versions.find(
    (v) => (!v.effectiveFrom || v.effectiveFrom <= utc) && (!v.effectiveTo || utc < v.effectiveTo),
  )!
}
function diff(
  reference: ChangeEffectDto['reference'],
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): ChangeEffectDto[] {
  const text = (x: unknown) =>
    x === null ? null : typeof x === 'object' ? JSON.stringify(x) : String(x)
  const changes = Object.keys(after)
    .filter((k) => text(before[k]) !== text(after[k]))
    .map((field) => ({ field, before: text(before[field]), after: text(after[field]) }))
  return changes.length ? [{ reference, versionId: null, action: 'UPDATE', changes }] : []
}
function recalculate(
  database: DatabaseSession,
  op: VesselOperationDto,
  charge: OperationChargeDto,
  simulated: Parameters<typeof calculateBase>[2],
) {
  const calculation = calculateBase(
    database,
    {
      vesselId: op.vesselId,
      portId: charge.calculation.portId,
      moment: charge.calculation.moment,
      activity: { kind: 'OPERATION', operation: charge.chargeKind },
    },
    simulated,
  )
  return {
    ...charge,
    calculation,
    effectiveBase: charge.manualOverrideAmount ?? calculation.base,
  }
}
export function tariffOperationImpacts(
  database: DatabaseSession,
  tariff: TariffDto,
  next: string | null,
) {
  return tariffSequenceImpacts(database, (portId, utc) =>
    portId === tariff.portId && utc >= tariff.effectiveFrom && (!next || utc < next)
      ? tariff
      : undefined,
  )
}

/** undefined leaves an interval untouched; null reports an uncovered economic endpoint. */
export function tariffSequenceImpacts(
  database: DatabaseSession,
  resolve: (portId: string, utc: string) => TariffDto | null | undefined,
) {
  return economicSequenceImpacts(database, (portId, utc) => {
    const tariff = resolve(portId, utc)
    return tariff ? { tariff } : tariff
  })
}

/** Shared read-only plan for tariff or weight sequences. Each charge owns its economic endpoint. */
export function economicSequenceImpacts(
  database: DatabaseSession,
  resolve: (
    portId: string,
    utc: string,
    activity: import('../../../shared/contracts/tariffs').TariffActivity,
  ) => Parameters<typeof calculateBase>[2] | null,
) {
  const effects: ChangeEffectDto[] = []
  const blockers: ConflictDto[] = []
  const updates: { operationId: string; after: OperationChargeDto }[] = []
  const uncovered = (reference: ChangeEffectDto['reference'], portId: string, utc: string) =>
    blockers.push({
      reference,
      reason:
        'Nessuna tariffa copre il porto ' +
        portId +
        ' al momento ' +
        utc +
        '. Conserva o anticipa la prima decorrenza.',
    })
  for (const op of new OperationRepository(database).all())
    for (const before of op.charges) {
      const { portId, moment } = before.calculation
      const simulated = resolve(portId, moment.utc, before.calculation.activity)
      const reference = {
        kind: 'OPERATION_CHARGE' as const,
        id: before.id,
        label: 'Componente ' + before.chargeKind + ' · ' + op.executionStatus + ' · ' + moment.utc,
      }
      if (simulated === undefined) continue
      if (simulated === null) {
        uncovered(reference, portId, moment.utc)
        continue
      }
      const after = recalculate(database, op, before, simulated)
      const changed = diff(
        reference,
        { ...before.calculation, effectiveBase: before.effectiveBase },
        { ...after.calculation, effectiveBase: after.effectiveBase },
      )
      if (changed.length) {
        effects.push(...changed)
        updates.push({ operationId: op.id, after })
      }
    }
  const services = new ServiceRepository(database)
  const serviceUpdates: ServiceActivityDto[] = []
  for (const before of services.all()) {
    if (before.category !== 'CATALOG') continue
    const simulated = resolve(before.context.portId, before.moment.utc, {
      kind: 'CATALOG',
      serviceTypeId: before.serviceTypeId,
    })
    const reference = {
      kind: 'SERVICE_ACTIVITY' as const,
      id: before.id,
      label: before.description + ' · ' + before.executionStatus + ' · ' + before.moment.utc,
    }
    if (simulated === undefined) continue
    if (simulated === null) {
      uncovered(reference, before.context.portId, before.moment.utc)
      continue
    }
    const after = recalculateService(database, before, simulated)
    const changed = diff(reference, { ...before }, { ...after })
    if (changed.length) {
      effects.push(...changed)
      serviceUpdates.push(after)
    }
  }
  return {
    effects,
    blockers,
    recalculated: updates.length + serviceUpdates.length,
    apply: () => {
      const repository = new OperationRepository(database)
      for (const u of updates) repository.saveCharge(u.operationId, u.after)
      for (const u of serviceUpdates) services.saveAttribution(u)
    },
  }
}

/** Simulate with the proposed complete version sequence, without writes or savepoint rollbacks. */
export function masterOperationImpacts(database: DatabaseSession, change: MasterChange) {
  const operations = new OperationRepository(database).all(
    change.kind === 'VESSEL' ? change.id : undefined,
  )
  const effects: ChangeEffectDto[] = [],
    updates: VesselOperationDto[] = []
  const structures: {
    table: 'voyages' | 'port_calls' | 'berth_stays'
    column: string
    id: string
    versionId: string
  }[] = []
  let recalculated = 0
  for (const op of operations) {
    const effectCount = effects.length
    const original = structuredClone(op)
    if (change.kind === 'VESSEL') {
      const version = at(change.versions, op.endpoint.moment.utc)
      op.vesselVersionId = version.id
      op.charges = op.charges.map((c, index) => {
        const updated = recalculate(database, op, c, {
          vesselVersion: at(change.versions, c.calculation.moment.utc),
        })
        const before = original.charges[index]
        const economic = diff(
          {
            kind: 'OPERATION_CHARGE',
            id: c.id,
            label: 'Componente ' + c.chargeKind + ' · ' + c.calculation.moment.utc,
          },
          { ...before.calculation, effectiveBase: before.effectiveBase },
          { ...updated.calculation, effectiveBase: updated.effectiveBase },
        )
        effects.push(...economic)
        if (economic.length) recalculated++
        return updated
      })
    }

    for (const endpoint of [op.endpoint, ...(op.arrival ? [op.arrival] : [])]) {
      const before = { ...endpoint }
      if (change.kind === 'VESSEL')
        endpoint.vesselVersionId = at(change.versions, endpoint.moment.utc).id
      else if (change.kind === 'PORT' && endpoint.portId === change.id) {
        const version = at(change.versions, endpoint.moment.utc)
        endpoint.portVersionId = version.id
        endpoint.portName = version.name
      } else if (change.kind === 'BERTH' && endpoint.berthId === change.id) {
        const version = at(change.versions, endpoint.moment.utc)
        endpoint.berthVersionId = version.id
        endpoint.berthName = version.name
      }
      effects.push(
        ...diff(
          {
            kind: 'VESSEL_OPERATION',
            id: op.id,
            label:
              'Operazione ' +
              op.operationType +
              ' · ' +
              endpoint.role +
              ' · ' +
              endpoint.moment.utc,
          },
          {
            vesselVersionId: before.vesselVersionId,
            portVersionId: before.portVersionId,
            port: before.portName,
            berthVersionId: before.berthVersionId,
            berth: before.berthName,
          },
          {
            vesselVersionId: endpoint.vesselVersionId,
            portVersionId: endpoint.portVersionId,
            port: endpoint.portName,
            berthVersionId: endpoint.berthVersionId,
            berth: endpoint.berthName,
          },
        ),
      )
    }
    if (effects.length > effectCount) updates.push(op)
  }
  const serviceRepository = new ServiceRepository(database)
  const serviceUpdates = serviceRepository.all().flatMap((before) => {
    let after = structuredClone(before)
    if (change.kind === 'VESSEL' && before.vesselId === change.id) {
      const version = at(change.versions, before.moment.utc)
      after.vesselVersionId = version.id
      after.vesselName = version.registeredName
      after = recalculateService(database, after, { vesselVersion: version })
      if (before.category === 'CATALOG') recalculated++
    } else if (change.kind === 'PORT' && before.context.portId === change.id) {
      const version = at(change.versions, before.moment.utc)
      after.portVersionId = version.id
      after.portName = version.name
    } else if (change.kind === 'BERTH' && before.context.berthId === change.id) {
      const version = at(change.versions, before.moment.utc)
      after.berthVersionId = version.id
      after.berthName = version.name
    }
    const changes = diff(
      { kind: 'SERVICE_ACTIVITY', id: before.id, label: before.description },
      { ...before },
      { ...after },
    )
    effects.push(...changes)
    return changes.length ? [after] : []
  })
  const [table, column, owner, kind, label] =
    change.kind === 'VESSEL'
      ? (['voyages', 'vessel_version_id', 'vessel_id', 'VOYAGE', 'Viaggio'] as const)
      : change.kind === 'PORT'
        ? (['port_calls', 'port_version_id', 'port_id', 'PORT_CALL', 'Visita'] as const)
        : (['berth_stays', 'berth_version_id', 'berth_id', 'BERTH_STAY', 'Ormeggio'] as const)
  const rows = database.sqlite
    .prepare(`SELECT id,started_at,${column} AS versionId FROM ${table} WHERE ${owner}=?`)
    .all(change.id) as { id: string; started_at: string; versionId: string }[]
  for (const row of rows) {
    const version = at<PortVersionDto | BerthVersionDto | VesselVersionDto>(
      change.versions,
      row.started_at,
    )
    const name = 'registeredName' in version ? version.registeredName : version.name
    const old = database.sqlite
      .prepare(
        `SELECT ${change.kind === 'VESSEL' ? 'registered_name' : 'name'} FROM ${change.kind === 'VESSEL' ? 'vessel_versions' : change.kind === 'PORT' ? 'port_versions' : 'berth_versions'} WHERE id=?`,
      )
      .pluck()
      .get(row.versionId) as string
    effects.push(
      ...diff(
        { kind, id: row.id, label },
        { versionId: row.versionId, name: old },
        { versionId: version.id, name },
      ),
    )
    if (row.versionId !== version.id)
      structures.push({ table, column, id: row.id, versionId: version.id })
  }
  return {
    effects,
    recalculated,
    apply: () => {
      const sql = database.sqlite,
        repository = new OperationRepository(database)
      for (const op of updates) {
        if (change.kind === 'VESSEL') {
          sql
            .prepare('UPDATE vessel_operations SET vessel_version_id=? WHERE id=?')
            .run(op.vesselVersionId, op.id)
          repository.saveCharges(op)
        }
        for (const e of [op.endpoint, ...(op.arrival ? [op.arrival] : [])])
          sql
            .prepare(
              'UPDATE operation_endpoints SET vessel_version_id=?,port_version_id=?,berth_version_id=? WHERE id=?',
            )
            .run(e.vesselVersionId, e.portVersionId, e.berthVersionId, e.id)
      }
      for (const value of serviceUpdates) serviceRepository.saveAttribution(value)
      for (const update of structures)
        sql
          .prepare(`UPDATE ${update.table} SET ${update.column}=? WHERE id=?`)
          .run(update.versionId, update.id)
    },
  }
}
