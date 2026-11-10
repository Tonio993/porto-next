import type { ErrorCode as ArchiveErrorCode } from './archive'

export type StableId = string
export type Revision = string

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
