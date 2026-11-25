import type { EffectiveSubjectsDto } from './assignments'
import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { ChangePreviewDto, PageDto } from './master-data'
import type { BaseCalculationDto } from './tariffs'
import type { MomentInputDto, MomentResolutionDto, ResolvedMomentDto } from './values'

export type ExecutionStatus = 'PLANNED' | 'PERFORMED' | 'MISSED'
export type OperationMomentInput = { vesselId: string; moment: MomentInputDto } & (
  | { operationType: 'ENTRY'; portId: string; berthId: string | null }
  | { operationType: 'EXIT'; interpretationPortId: string | null }
  | {
      operationType: 'MOVEMENT'
      interpretationPortId: string | null
      destinationPortId: string
      destinationBerthId: string | null
      arrivalMoment: MomentInputDto
    }
)
export type CreateOperationDto = (
  | Extract<OperationMomentInput, { operationType: 'ENTRY' | 'EXIT' }>
  | (Extract<OperationMomentInput, { operationType: 'MOVEMENT' }> & {
      arrivalManualOverrideAmount?: string | null
    })
) & {
  executionStatus: ExecutionStatus
  notes: string | null
  manualOverrideAmount: string | null
}
export interface OperationMomentDto {
  portId: string
  berthId: string | null
  resolution: MomentResolutionDto
  arrivalResolution?: MomentResolutionDto
}
export interface OperationChargeDto {
  subjects: EffectiveSubjectsDto
  id: string
  chargeKind: 'ENTRY' | 'EXIT' | 'MOVEMENT'
  economicEndpointRole: 'OCCURRENCE' | 'DEPARTURE' | 'ARRIVAL'
  calculation: BaseCalculationDto
  manualOverrideAmount: string | null
  effectiveBase: string
}
export interface VesselOperationDto {
  id: string
  vesselId: string
  vesselVersionId: string
  operationType: 'ENTRY' | 'EXIT' | 'MOVEMENT'
  executionStatus: ExecutionStatus
  notes: string | null
  endpoint: OperationEndpointDto
  arrival: OperationEndpointDto | null
  charges: OperationChargeDto[]
  totalBase: string
}
export interface OperationEndpointDto {
  references?: {
    vessel: import('./descriptive-references').VersionReferenceDto | null
    port: import('./descriptive-references').VersionReferenceDto | null
    berth: import('./descriptive-references').VersionReferenceDto | null
  }
  id: string
  role: 'OCCURRENCE' | 'DEPARTURE' | 'ARRIVAL'
  vesselVersionId: string
  moment: ResolvedMomentDto
  portId: string
  portVersionId: string
  portName: string
  berthId: string | null
  berthVersionId: string | null
  berthName: string | null
}
export type OperationalContextDto = {
  references?: import('./descriptive-references').ContextReferencesDto
} & (
  | {
      status: 'OUTSIDE'
      voyageId: null
      portCallId: null
      berthStayId: null
      portId: null
      berthId: null
    }
  | {
      status: 'IN_TRANSFER'
      voyageId: string
      portCallId: string | null
      berthStayId: null
      portId: string | null
      berthId: null
    }
  | {
      status: 'IN_PORT'
      voyageId: string
      portCallId: string
      berthStayId: string
      portId: string
      berthId: string | null
    }
)
export interface StayIntervalDto {
  reference?: import('./descriptive-references').StayReferenceDto | null
  id: string
  openingOperationId: string
  closingOperationId: string | null
  startedAt: string
  endedAt: string | null
  openingMoment: ResolvedMomentDto
  closingMoment: ResolvedMomentDto | null
}
export interface VoyageDto extends StayIntervalDto {
  vesselReference?: import('./descriptive-references').VersionReferenceDto | null
  vesselId: string
  vesselVersionId: string
  visits: readonly (StayIntervalDto & {
    portId: string
    portVersionId: string
    portName: string
    stays: readonly (StayIntervalDto & {
      berthId: string | null
      berthVersionId: string | null
      berthName: string | null
    })[]
  })[]
}
export interface OperationPreviewDto extends ChangePreviewDto {
  operationValues: VesselOperationDto
}
export interface CompleteOperationDto {
  id: string
  values: CreateOperationDto
}
export interface OperationCompletionPreviewDto extends OperationPreviewDto {
  before: VesselOperationDto
}
export type CorrectOperationDto = CompleteOperationDto
export type OperationCorrectionPreviewDto = OperationCompletionPreviewDto
export interface OperationDeletionPreviewDto extends ChangePreviewDto {
  before: VesselOperationDto
}
export interface OperationApi {
  previewDelete(
    request: CommandRequest<{ id: string }>,
  ): Promise<ApplicationResult<OperationDeletionPreviewDto>>
  deletionEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<OperationDeletionPreviewDto>>
  confirmDelete(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ id: string }>>
  updateNotes(
    request: CommandRequest<{ id: string; notes: string | null }>,
  ): Promise<ApplicationResult<VesselOperationDto>>
  resolveCorrectionMoment(
    request: QueryRequest<CorrectOperationDto>,
  ): Promise<ApplicationResult<OperationMomentDto>>
  previewCorrect(
    request: CommandRequest<CorrectOperationDto>,
  ): Promise<ApplicationResult<OperationCorrectionPreviewDto>>
  correctionEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<OperationCorrectionPreviewDto>>
  confirmCorrect(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<VesselOperationDto>>
  previewInsert(
    request: CommandRequest<CreateOperationDto>,
  ): Promise<ApplicationResult<OperationPreviewDto>>
  insertionEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<OperationPreviewDto>>
  confirmInsert(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<VesselOperationDto>>
  resolveCompletionMoment(
    request: QueryRequest<CompleteOperationDto>,
  ): Promise<ApplicationResult<OperationMomentDto>>
  previewComplete(
    request: CommandRequest<CompleteOperationDto>,
  ): Promise<ApplicationResult<OperationCompletionPreviewDto>>
  completionEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<OperationCompletionPreviewDto>>
  confirmComplete(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<VesselOperationDto>>
  contextAt(
    request: QueryRequest<{ vesselId: string; instant: string }>,
  ): Promise<ApplicationResult<OperationalContextDto>>
  list(
    request: QueryRequest<{ vesselId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<PageDto<VesselOperationDto>>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<VesselOperationDto>>
  stays(
    request: QueryRequest<{ vesselId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<PageDto<VoyageDto>>>
  resolveMoment(
    request: QueryRequest<OperationMomentInput>,
  ): Promise<ApplicationResult<OperationMomentDto>>
  previewCreate(
    request: CommandRequest<CreateOperationDto>,
  ): Promise<ApplicationResult<OperationPreviewDto>>
  confirmCreate(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<VesselOperationDto>>
  previewEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<OperationPreviewDto>>
}
export const operationChannels = {
  previewDelete: 'operations:preview-delete',
  deletionEffects: 'operations:deletion-effects',
  confirmDelete: 'operations:confirm-delete',
  updateNotes: 'operations:update-notes',
  resolveCorrectionMoment: 'operations:resolve-correction-moment',
  previewCorrect: 'operations:preview-correct',
  correctionEffects: 'operations:correction-effects',
  confirmCorrect: 'operations:confirm-correct',
  previewInsert: 'operations:preview-insert',
  insertionEffects: 'operations:insertion-effects',
  confirmInsert: 'operations:confirm-insert',
  resolveCompletionMoment: 'operations:resolve-completion-moment',
  previewComplete: 'operations:preview-complete',
  completionEffects: 'operations:completion-effects',
  confirmComplete: 'operations:confirm-complete',
  contextAt: 'operations:context-at',
  list: 'operations:list',
  get: 'operations:get',
  stays: 'operations:stays',
  resolveMoment: 'operations:resolve-moment',
  previewCreate: 'operations:preview-create',
  confirmCreate: 'operations:confirm-create',
  previewEffects: 'operations:preview-effects',
} as const
