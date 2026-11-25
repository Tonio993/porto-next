import type { ChangeEffectDto } from '../../../shared/contracts/master-data'
import type { VesselOperationDto } from '../../../shared/contracts/operations'
import type { DatabaseSession } from '../../infrastructure/database/database-session'
import { DescriptiveReferenceRepository } from '../../infrastructure/database/descriptive-reference-repository'
import { operationLabels } from '../../../shared/description-labels'

const versionKinds = {
  vesselVersionId: 'VESSEL',
  portVersionId: 'PORT',
  berthVersionId: 'BERTH',
  tariffId: 'TARIFF',
  weightVersionId: 'WEIGHT_VERSION',
} as const
const identityKinds = {
  Nave: 'VESSEL',
  Porto: 'PORT',
  Banchina: 'BERTH',
  customerId: 'CUSTOMER',
  agencyId: 'AGENCY',
  vesselId: 'VESSEL',
  portId: 'PORT',
  berthId: 'BERTH',
} as const
const stayKinds = {
  Viaggio: 'VOYAGE',
  Visita: 'PORT_CALL',
  Ormeggio: 'BERTH_STAY',
  voyageId: 'VOYAGE',
  portCallId: 'PORT_CALL',
  berthStayId: 'BERTH_STAY',
} as const
/** Only known scalar contracts are resolved. No JSON interpretation, UUID detection or full-table lookup. */
export function describeEffects(
  database: DatabaseSession,
  effects: readonly ChangeEffectDto[],
  pending?: VesselOperationDto,
  references = new DescriptiveReferenceRepository(database, new Date().toISOString()),
  projectReferences = true,
): ChangeEffectDto[] {
  const targetTimes = new Map<string, string | undefined>()
  const targetInstant = (effect: ChangeEffectDto, side: 'before' | 'after') => {
    const { kind, id } = effect.reference
    const interval = effect.changes.find((c) => c.field === 'startedAt')?.[side]
    if (interval) return interval
    if (side === 'after' && pending) {
      if (pending.id === id) return pending.endpoint.moment.utc
      const charge = pending.charges.find((c) => c.id === id)
      if (charge) return charge.calculation.moment.utc
    }
    const key = kind + ':' + id
    if (!targetTimes.has(key)) {
      const statement =
        kind === 'VOYAGE'
          ? 'SELECT started_at FROM voyages WHERE id=?'
          : kind === 'PORT_CALL'
            ? 'SELECT started_at FROM port_calls WHERE id=?'
            : kind === 'BERTH_STAY'
              ? 'SELECT started_at FROM berth_stays WHERE id=?'
              : kind === 'SERVICE_ACTIVITY'
                ? 'SELECT utc FROM service_activities WHERE id=?'
                : kind === 'VESSEL_OPERATION'
                  ? "SELECT utc FROM operation_endpoints WHERE operation_id=? AND role<>'ARRIVAL'"
                  : kind === 'OPERATION_CHARGE'
                    ? 'SELECT e.utc FROM operation_charges c JOIN operation_endpoints e ON e.operation_id=c.operation_id AND e.role=c.economic_endpoint_role WHERE c.id=?'
                    : null
      targetTimes.set(
        key,
        statement
          ? (database.sqlite.prepare(statement).pluck().get(id) as string | undefined)
          : undefined,
      )
    }
    return targetTimes.get(key)
  }
  const scalar = (
    field: string,
    value: string | null,
    effect: ChangeEffectDto,
    side: 'before' | 'after',
  ): ChangeEffectDto['changes'][number]['beforeReference'] => {
    if (value === null) return null
    const aliases: Record<string, string> = {
      'Operazione di apertura': 'openingOperationId',
      'Operazione di chiusura': 'closingOperationId',
    }
    const alias = Object.hasOwn(aliases, field) ? aliases[field] : undefined
    if (alias) field = alias
    if (field === 'Identità') return effect.reference.label
    if (
      field === 'versionId' &&
      ['VOYAGE', 'PORT_CALL', 'BERTH_STAY'].includes(effect.reference.kind)
    )
      return references.version(
        effect.reference.kind === 'VOYAGE'
          ? 'VESSEL'
          : effect.reference.kind === 'PORT_CALL'
            ? 'PORT'
            : 'BERTH',
        value,
      )
    if (Object.hasOwn(versionKinds, field))
      return references.version(versionKinds[field as keyof typeof versionKinds], value)
    if (
      field === 'versionId' &&
      ['PORT', 'BERTH', 'VESSEL', 'CUSTOMER', 'AGENCY'].includes(effect.reference.kind)
    )
      return references.version(
        effect.reference.kind as 'PORT' | 'BERTH' | 'VESSEL' | 'CUSTOMER' | 'AGENCY',
        value,
      )
    if (Object.hasOwn(identityKinds, field))
      return references.versionAt(
        identityKinds[field as keyof typeof identityKinds],
        value,
        targetInstant(effect, side),
      )
    if (Object.hasOwn(stayKinds, field))
      return references.stay(stayKinds[field as keyof typeof stayKinds], value)
    if (field === 'openingOperationId' || field === 'closingOperationId') {
      if (pending?.id === value)
        return {
          name:
            operationLabels[pending.operationType] +
            ' · ' +
            pending.charges[0].calculation.vesselName +
            ' · ' +
            pending.endpoint.portName,
          moment: pending.endpoint.moment,
        }
      return references.activity(value)
    }
    if (field === 'weightSequenceId') return references.weightOwner(value)
    if (field === 'serviceTypeId') return references.catalog(value)
    if (field === 'configurationId' || field === 'bracketId')
      return references.configuration(value, field === 'bracketId')
    return undefined
  }
  const referenceDescription = (effect: ChangeEffectDto) => {
    const { kind, id } = effect.reference
    if (kind === 'OPERATION_CHARGE') {
      const stored = references.charge(id)
      if (stored) return stored
      const charge = pending?.charges.find((c) => c.id === id)
      const endpoint =
        charge?.economicEndpointRole === 'ARRIVAL' ? pending?.arrival : pending?.endpoint
      return charge && endpoint
        ? {
            name:
              'Componente ' +
              operationLabels[charge.chargeKind] +
              ' · ' +
              charge.calculation.vesselName +
              ' · ' +
              (references.version('PORT', endpoint.portVersionId)?.name ?? endpoint.portName) +
              ' · ' +
              (endpoint.berthName ?? 'Banchina non specificata'),
            moment: charge.calculation.moment,
          }
        : null
    }
    if (kind === 'VESSEL_OPERATION')
      return pending?.id === id
        ? {
            name:
              operationLabels[pending.operationType] +
              ' · ' +
              pending.charges[0].calculation.vesselName +
              ' · ' +
              pending.endpoint.portName,
            moment: pending.endpoint.moment,
          }
        : references.activity(id)
    if (
      kind === 'VOYAGE' ||
      kind === 'PORT_CALL' ||
      kind === 'BERTH_STAY' ||
      kind === 'SERVICE_ACTIVITY'
    )
      return references.origin(kind, id)
    if (
      kind === 'PORT' ||
      kind === 'BERTH' ||
      kind === 'VESSEL' ||
      kind === 'CUSTOMER' ||
      kind === 'AGENCY'
    )
      return references.versionAt(kind, id)
    if (kind === 'TARIFF' || kind === 'WEIGHT_VERSION') return references.version(kind, id)
    return references.catalog(id)
  }
  const pendingOwns = (effect: ChangeEffectDto) =>
    pending &&
    (pending.id === effect.reference.id ||
      pending.charges.some((c) => c.id === effect.reference.id))
  return effects.map((effect) => ({
    ...effect,
    reference: projectReferences
      ? {
          ...effect.reference,
          description: effect.reference.description ?? referenceDescription(effect),
        }
      : effect.reference,
    changes: effect.changes.map((c) => ({
      ...c,
      ...(c.beforeReference !== undefined
        ? {}
        : { beforeReference: scalar(c.field, c.before, effect, 'before') }),
      ...(c.afterReference !== undefined &&
      !(pendingOwns(effect) && Object.hasOwn(identityKinds, c.field))
        ? {}
        : { afterReference: scalar(c.field, c.after, effect, 'after') }),
    })),
  }))
}
