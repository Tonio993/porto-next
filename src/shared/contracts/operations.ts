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
export type CreateOperationDto = OperationMomentInput & {
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
  id: string
  chargeKind: 'ENTRY' | 'EXIT' | 'MOVEMENT'
  economicEndpointRole: 'OCCURRENCE' | 'DEPARTURE'
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
  charge: OperationChargeDto
}
export interface OperationEndpointDto {
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
export type OperationalContextDto =
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
      portCallId: string
      berthStayId: null
      portId: string
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
export interface StayIntervalDto {
  id: string
  openingOperationId: string
  closingOperationId: string | null
  startedAt: string
  endedAt: string | null
}
export interface VoyageDto extends StayIntervalDto {
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
export interface OperationApi {
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
  contextAt: 'operations:context-at',
  list: 'operations:list',
  get: 'operations:get',
  stays: 'operations:stays',
  resolveMoment: 'operations:resolve-moment',
  previewCreate: 'operations:preview-create',
  confirmCreate: 'operations:confirm-create',
  previewEffects: 'operations:preview-effects',
} as const
