/**
 * Specifica P00 verificata da TypeScript, non importata dall'applicazione.
 * P01 adotta gli envelope; i task funzionali adottano i DTO pertinenti.
 * Le stringhe nominate richiedono validazione runtime al confine IPC.
 */
import type { ErrorCode as ArchiveErrorCode } from '../../src/shared/contracts/archive.js'

export type StableId = string
export type Revision = string
export type MoneyText = string
export type DecimalText = string
export type LocalMinute = string
export type UtcInstant = string

export interface ArchiveContextDto {
  archiveId: StableId
  sessionId: StableId
  revision: Revision
}

export interface QueryRequest<T> {
  context: Pick<ArchiveContextDto, 'sessionId'>
  query: T
}

export interface CommandRequest<T> {
  context: ArchiveContextDto
  payload: T
}

export type ApplicationErrorCode =
  | ArchiveErrorCode
  | 'NO_ARCHIVE'
  | 'ARCHIVE_SESSION_CHANGED'
  | 'REVISION_CONFLICT'
  | 'PREVIEW_EXPIRED'
  | 'PREVIEW_BLOCKED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'NOT_SELECTABLE'
  | 'DUPLICATE_IDENTIFIER'
  | 'REFERENCE_IN_USE'
  | 'OPERATION_SEQUENCE_INVALID'
  | 'OPERATION_MINUTE_CONFLICT'
  | 'OPERATIONAL_CONTEXT_MISSING'
  | 'OPERATIONAL_CONTEXT_AMBIGUOUS'
  | 'TARIFF_NOT_FOUND'
  | 'LOCAL_TIME_NOT_EXISTENT'
  | 'LOCAL_TIME_AMBIGUOUS'
  | 'INVALID_TIME_ZONE'
  | 'INVALID_OFFSET'
  | 'AMOUNT_OUT_OF_RANGE'
  | 'LIMIT_EXCEEDED'
  | 'UNEXPECTED'

export type EntityKind =
  | 'PORT'
  | 'BERTH'
  | 'CUSTOMER'
  | 'AGENCY'
  | 'VESSEL'
  | 'SERVICE_TYPE'
  | 'TARIFF'
  | 'WEIGHT_VERSION'
  | 'VESSEL_OPERATION'
  | 'OPERATION_CHARGE'
  | 'VOYAGE'
  | 'PORT_CALL'
  | 'BERTH_STAY'
  | 'SERVICE_ACTIVITY'

export interface EntityReferenceDto {
  kind: EntityKind
  id: StableId
  label: string
}

export interface FieldIssueDto {
  path: readonly (string | number)[]
  code: string
  message: string
}

export interface ConflictDto {
  reference: EntityReferenceDto
  reason: string
}

export interface ApplicationErrorDto {
  code: ApplicationErrorCode
  message: string
  fields: readonly FieldIssueDto[]
  conflicts: readonly ConflictDto[]
}

export type ApplicationResult<T> =
  | { ok: true; value: T; context: ArchiveContextDto }
  | { ok: false; error: ApplicationErrorDto; context: ArchiveContextDto | null }

export interface PageQueryDto {
  page: number
  pageSize: number
}

export interface PageDto<T> {
  items: readonly T[]
  total: number
  page: number
  pageSize: number
}

export interface MomentInputDto {
  localDateTime: LocalMinute
  selectedOffset: string | null
}

export interface ResolvedMomentDto {
  localDateTime: LocalMinute
  zoneId: string
  offset: string
  utc: UtcInstant
}

export type MomentResolutionDto =
  | { status: 'RESOLVED'; moment: ResolvedMomentDto }
  | {
      status: 'CHOICE_REQUIRED'
      choices: readonly [ResolvedMomentDto, ResolvedMomentDto, ...ResolvedMomentDto[]]
    }

export type ExecutionStatus = 'PLANNED' | 'PERFORMED' | 'MISSED'
export type VesselTypeCode = 'STANDARD' | 'PASSENGER' | 'ADM'

export interface SpecifiedSubjectsDto {
  customerId: StableId | null
  agencyId: StableId | null
}

export interface SubjectSourceDto {
  kind: 'SERVICE_ACTIVITY' | 'VESSEL_OPERATION' | 'BERTH_STAY' | 'PORT_CALL' | 'VOYAGE'
  id: StableId
}

export type EffectiveSubjectDto =
  { subjectId: StableId; source: SubjectSourceDto } | { subjectId: null; source: null }

export interface EffectiveSubjectsDto {
  customer: EffectiveSubjectDto
  agency: EffectiveSubjectDto
}

export interface PortVersionInputDto {
  name: string
  locality: string
  countryCode: string
}

export interface CreatePortDto extends PortVersionInputDto {
  initialZoneId: string
}

export interface CreateBerthDto {
  portId: StableId
  name: string
}

export interface SubjectVersionInputDto {
  businessName: string
}

export interface VesselVersionInputDto {
  registeredName: string
  imoNumber: string | null
  vesselTypeId: StableId
  size: number
}

export interface VersionChangeDto<T> {
  entityId: StableId
  effectiveFrom: MomentInputDto
  values: T
}

export interface CreateServiceTypeDto {
  description: string
  initialWeight: DecimalText
}

export interface ServiceCommonInputDto {
  vesselId: StableId
  moment: MomentInputDto
  /** Aiuto all'interpretazione del momento, mai un override del contesto derivato. */
  interpretationPortId: StableId | null
  executionStatus: ExecutionStatus
  specifiedSubjects: SpecifiedSubjectsDto
  notes: string | null
}

export type CreateServiceDto = ServiceCommonInputDto &
  (
    | {
        category: 'FREE'
        description: string
        manualBaseAmount: MoneyText
        serviceTypeId?: never
      }
    | {
        category: 'CATALOG'
        serviceTypeId: StableId
        description?: never
        manualBaseAmount?: never
      }
  )

export interface DestinationInputDto {
  portId: StableId
  berthId: StableId | null
}

export interface OperationCommonInputDto {
  vesselId: StableId
  executionStatus: ExecutionStatus
  specifiedSubjects: SpecifiedSubjectsDto
  notes: string | null
}

export type CreateOperationDto = OperationCommonInputDto &
  (
    | {
        operationType: 'ENTRY'
        occurrence: MomentInputDto
        destination: DestinationInputDto
        departure?: never
        arrival?: never
        interpretationPortId?: never
      }
    | {
        operationType: 'EXIT'
        occurrence: MomentInputDto
        interpretationPortId: StableId | null
        destination?: never
        departure?: never
        arrival?: never
      }
    | {
        operationType: 'MOVEMENT'
        departure: MomentInputDto
        arrival: MomentInputDto
        destination: DestinationInputDto
        interpretationPortId: StableId | null
        occurrence?: never
      }
  )

export interface UpdateNotesDto {
  entityId: StableId
  notes: string | null
}

export interface ReplaceOperationDto {
  operationId: StableId
  values: CreateOperationDto
}

/** La modifica è tipizzata per categoria: la categoria salvata deve coincidere. */
export interface ReplaceServiceDto {
  serviceActivityId: StableId
  values: CreateServiceDto
}

export interface ManualOperationBaseDto {
  operationChargeId: StableId
  manualOverrideAmount: MoneyText | null
}

export interface ImpactItemDto {
  reference: EntityReferenceDto
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  changes: readonly {
    field: string
    before: string | null
    after: string | null
  }[]
}

export interface ImpactSummaryDto {
  created: number
  updated: number
  deleted: number
  reattributed: number
  recalculated: number
}

interface ChangePreviewBaseDto {
  previewId: StableId
  operation:
    | 'CREATE_SERVICE'
    | 'REPLACE_SERVICE'
    | 'DELETE_SERVICE'
    | 'CHANGE_OPERATION_STATUS'
    | 'REPLACE_OPERATION'
    | 'DELETE_OPERATION'
    | 'CHANGE_MASTER_DATA_VERSION'
    | 'CHANGE_TARIFF'
    | 'CHANGE_WEIGHT'
  context: ArchiveContextDto
  generatedAtUtc: UtcInstant
  expiresAtUtc: UtcInstant
  summary: ImpactSummaryDto
  effects: PageDto<ImpactItemDto>
  warnings: readonly string[]
}

export type ChangePreviewDto<T> = ChangePreviewBaseDto &
  (
    | { status: 'READY'; resolved: T; blockers: readonly [] }
    | { status: 'BLOCKED'; resolved: T | null; blockers: readonly [ConflictDto, ...ConflictDto[]] }
  )

export interface ConfirmChangeDto {
  previewId: StableId
}

/** Esempio di confine applicativo: metodi specifici, nessun invoke generico. */
export interface ServicesContractExample {
  previewCreate(
    request: CommandRequest<CreateServiceDto>,
  ): Promise<ApplicationResult<ChangePreviewDto<{ category: CreateServiceDto['category'] }>>>
  confirmCreate(
    request: CommandRequest<ConfirmChangeDto>,
  ): Promise<ApplicationResult<{ serviceActivityId: StableId }>>
  updateNotes(request: CommandRequest<UpdateNotesDto>): Promise<ApplicationResult<UpdateNotesDto>>
}
