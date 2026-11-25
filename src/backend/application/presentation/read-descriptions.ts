import type { EffectiveSubjectsDto, AssignmentDto } from '../../../shared/contracts/assignments'
import type {
  VesselOperationDto,
  OperationalContextDto,
  VoyageDto,
} from '../../../shared/contracts/operations'
import type { ServiceActivityDto } from '../../../shared/contracts/services'
import type { BaseCalculationDto } from '../../../shared/contracts/tariffs'
import { operationLabels } from '../../../shared/description-labels'
import { DescriptiveReferenceRepository } from '../../infrastructure/database/descriptive-reference-repository'
import type { DatabaseSession } from '../../infrastructure/database/database-session'

/** Explicit DTO adapters at the application boundary, after authoritative comparisons. */
export class ReadDescriptions {
  readonly references: DescriptiveReferenceRepository
  constructor(database: DatabaseSession, observedAt = new Date().toISOString()) {
    this.references = new DescriptiveReferenceRepository(database, observedAt)
  }
  subjects(value: EffectiveSubjectsDto): EffectiveSubjectsDto {
    const one = (kind: 'customer' | 'agency') => {
      const s = value[kind]
      return s
        ? {
            ...s,
            description: {
              version: this.references.version(
                kind === 'customer' ? 'CUSTOMER' : 'AGENCY',
                s.versionId,
              ),
              origin: this.references.origin(s.source.kind, s.source.id),
            },
          }
        : null
    }
    return { customer: one('customer'), agency: one('agency') }
  }
  assignment(value: AssignmentDto): AssignmentDto {
    return {
      ...value,
      effective: this.subjects(value.effective),
      components: value.components.map((c) => ({ ...c, subjects: this.subjects(c.subjects) })),
    }
  }
  calculation(value: BaseCalculationDto): BaseCalculationDto {
    return {
      ...value,
      references: {
        vessel: this.references.version('VESSEL', value.vesselVersionId),
        tariff: this.references.version('TARIFF', value.tariffId),
        weight: this.references.version('WEIGHT_VERSION', value.weightVersionId),
        activity:
          value.activity.kind === 'OPERATION'
            ? operationLabels[value.activity.operation]
            : this.references.weightOwner(value.weightSequenceId),
      },
    }
  }
  context<T extends OperationalContextDto>(value: T): T {
    return {
      ...value,
      references: {
        voyage: value.voyageId ? this.references.stay('VOYAGE', value.voyageId) : null,
        visit: value.portCallId ? this.references.stay('PORT_CALL', value.portCallId) : null,
        stay: value.berthStayId ? this.references.stay('BERTH_STAY', value.berthStayId) : null,
      },
    }
  }
  private endpoint(
    value: Pick<ServiceActivityDto, 'vesselVersionId' | 'portVersionId' | 'berthVersionId'>,
  ) {
    const port = this.references.version('PORT', value.portVersionId)
    const berth = this.references.version('BERTH', value.berthVersionId)
    return {
      vessel: this.references.version('VESSEL', value.vesselVersionId),
      port,
      berth: berth
        ? { ...berth, name: berth.name + ' · ' + (port?.name ?? 'Porto non disponibile') }
        : null,
    }
  }
  operation(value: VesselOperationDto): VesselOperationDto {
    const subjects = (c: VesselOperationDto['charges'][number]) => {
      const result = this.subjects(c.subjects)
      for (const kind of ['customer', 'agency'] as const) {
        const subject = result[kind]
        if (subject?.source.kind === 'VESSEL_OPERATION' && subject.source.id === value.id)
          subject.description!.origin = {
            name:
              operationLabels[value.operationType] +
              ' · ' +
              c.calculation.vesselName +
              ' · ' +
              value.endpoint.portName,
            moment: value.endpoint.moment,
          }
      }
      return result
    }
    return {
      ...value,
      endpoint: { ...value.endpoint, references: this.endpoint(value.endpoint) },
      arrival: value.arrival
        ? { ...value.arrival, references: this.endpoint(value.arrival) }
        : null,
      charges: value.charges.map((c) => ({
        ...c,
        calculation: this.calculation(c.calculation),
        subjects: subjects(c),
      })),
    }
  }
  service(value: ServiceActivityDto): ServiceActivityDto {
    const subjects = this.subjects(value.subjects)
    for (const kind of ['customer', 'agency'] as const) {
      const s = subjects[kind]
      if (s?.source.kind === 'SERVICE_ACTIVITY' && s.source.id === value.id)
        s.description!.origin = {
          name: value.description + ' · ' + value.vesselName + ' · ' + value.portName,
          moment: value.moment,
        }
    }
    const common = {
      ...value,
      references: this.endpoint(value),
      context: this.context(value.context),
      subjects,
    }
    return value.category === 'CATALOG'
      ? {
          ...common,
          category: 'CATALOG',
          serviceTypeId: value.serviceTypeId,
          calculation: this.calculation(value.calculation),
        }
      : { ...common, category: 'FREE', serviceTypeId: null, calculation: null }
  }
  voyage(value: VoyageDto): VoyageDto {
    return {
      ...value,
      reference: this.references.stay('VOYAGE', value.id),
      vesselReference: this.references.version('VESSEL', value.vesselVersionId),
      visits: value.visits.map((p) => ({
        ...p,
        reference: this.references.stay('PORT_CALL', p.id),
        stays: p.stays.map((b) => ({ ...b, reference: this.references.stay('BERTH_STAY', b.id) })),
      })),
    }
  }
}
