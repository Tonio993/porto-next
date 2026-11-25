import type { EntityKind } from './application'
import type { ResolvedMomentDto } from './values'

/** Read projections only. Technical identities remain on the owning DTO. */
export interface VersionReferenceDto {
  kind: Extract<
    EntityKind,
    'PORT' | 'BERTH' | 'VESSEL' | 'CUSTOMER' | 'AGENCY' | 'TARIFF' | 'WEIGHT_VERSION'
  >
  name: string
  effectiveFrom: string | null
  effectiveTo: string | null
  effectiveMoment: ResolvedMomentDto | null
}

export interface ActivityReferenceDto {
  name: string
  moment: ResolvedMomentDto
}

export interface StayReferenceDto {
  name: string
  opening: ActivityReferenceDto
  closing: ActivityReferenceDto | null
}

export interface ContextReferencesDto {
  voyage: StayReferenceDto | null
  visit: StayReferenceDto | null
  stay: StayReferenceDto | null
}

export interface CalculationReferencesDto {
  vessel: VersionReferenceDto | null
  tariff: VersionReferenceDto | null
  weight: VersionReferenceDto | null
  activity: string
}

export interface ConfigurationReferenceDto {
  configuration: true
  vesselTypeId: import('./vessels').VesselTypeId
  tariff: VersionReferenceDto | null
  upperLimit?: number
  value?: string
}
export interface SubjectReferenceDto {
  subject: true
  businessName: string
  version: VersionReferenceDto | null
  origin: StayReferenceDto | ActivityReferenceDto | null
}
export type ScalarReferenceDto =
  | SubjectReferenceDto
  | VersionReferenceDto
  | StayReferenceDto
  | ActivityReferenceDto
  | ConfigurationReferenceDto
  | string
  | null
