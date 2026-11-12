import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import type { VesselOperationDto } from '../../../shared/contracts/operations'
import type { PortVersionDto } from '../../../shared/contracts/ports'
import type { BerthVersionDto } from '../../../shared/contracts/berths'
import type { VesselVersionDto } from '../../../shared/contracts/vessels'
import type { TariffDto } from '../../../shared/contracts/tariffs'
import type { DatabaseSession } from '../../infrastructure/database/database-session'
import { OperationRepository } from '../../infrastructure/database/operation-repository'
import { calculateBase } from '../tariffs/calculate-base'

export const operationTables = [
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
  simulated: Parameters<typeof calculateBase>[2],
) {
  const calculation = calculateBase(
    database,
    {
      vesselId: op.vesselId,
      portId: op.endpoint.portId,
      moment: op.endpoint.moment,
      activity: { kind: 'OPERATION', operation: op.operationType },
    },
    simulated,
  )
  return {
    ...op.charge,
    calculation,
    effectiveBase: op.charge.manualOverrideAmount ?? calculation.base,
  }
}
export function tariffOperationImpacts(
  database: DatabaseSession,
  tariff: TariffDto,
  next: string | null,
) {
  const operations = new OperationRepository(database)
    .all()
    .filter(
      (o) =>
        o.endpoint.portId === tariff.portId &&
        o.endpoint.moment.utc >= tariff.effectiveFrom &&
        (!next || o.endpoint.moment.utc < next),
    )
  const updates = operations.map((op) => ({ ...op, charge: recalculate(database, op, { tariff }) }))
  const effects = updates.flatMap((op, index) =>
    diff(
      {
        kind: 'OPERATION_CHARGE',
        id: op.charge.id,
        label: `Componente ${op.operationType} · ${op.endpoint.moment.utc}`,
      },
      {
        ...operations[index].charge.calculation,
        effectiveBase: operations[index].charge.effectiveBase,
      },
      { ...op.charge.calculation, effectiveBase: op.charge.effectiveBase },
    ),
  )
  return {
    effects,
    recalculated: updates.length,
    apply: () => {
      const repository = new OperationRepository(database)
      for (const op of updates) repository.saveCharge(op)
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
      op.charge = recalculate(database, op, { vesselVersion: version })
      const economic = diff(
        {
          kind: 'OPERATION_CHARGE',
          id: op.charge.id,
          label: `Componente ${op.operationType} · ${op.endpoint.moment.utc}`,
        },
        { ...original.charge.calculation, effectiveBase: original.charge.effectiveBase },
        { ...op.charge.calculation, effectiveBase: op.charge.effectiveBase },
      )
      effects.push(...economic)
      if (economic.length) recalculated++
    } else if (change.kind === 'PORT' && op.endpoint.portId === change.id) {
      const version = at(change.versions, op.endpoint.moment.utc)
      op.endpoint = { ...op.endpoint, portVersionId: version.id, portName: version.name }
    } else if (change.kind === 'BERTH' && op.endpoint.berthId === change.id) {
      const version = at(change.versions, op.endpoint.moment.utc)
      op.endpoint = { ...op.endpoint, berthVersionId: version.id, berthName: version.name }
    } else continue
    effects.push(
      ...diff(
        {
          kind: 'VESSEL_OPERATION',
          id: op.id,
          label: `Operazione ${op.operationType} · ${op.endpoint.moment.utc}`,
        },
        {
          vesselVersionId: original.vesselVersionId,
          portVersionId: original.endpoint.portVersionId,
          port: original.endpoint.portName,
          berthVersionId: original.endpoint.berthVersionId,
          berth: original.endpoint.berthName,
        },
        {
          vesselVersionId: op.vesselVersionId,
          portVersionId: op.endpoint.portVersionId,
          port: op.endpoint.portName,
          berthVersionId: op.endpoint.berthVersionId,
          berth: op.endpoint.berthName,
        },
      ),
    )
    if (effects.length > effectCount) updates.push(op)
  }
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
          repository.saveCharge(op)
        } else
          sql
            .prepare(
              'UPDATE operation_endpoints SET port_version_id=?,berth_version_id=? WHERE operation_id=?',
            )
            .run(op.endpoint.portVersionId, op.endpoint.berthVersionId, op.id)
      }
      for (const update of structures)
        sql
          .prepare(`UPDATE ${update.table} SET ${update.column}=? WHERE id=?`)
          .run(update.versionId, update.id)
    },
  }
}
