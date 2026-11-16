import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { EffectiveSubjectsDto, SpecifiedSubjectsDto } from './assignments'
import type { PageDto } from './master-data'
import type { ExecutionStatus, OperationalContextDto } from './operations'
import type { MomentInputDto, MomentResolutionDto, ResolvedMomentDto } from './values'
import type { BaseCalculationDto } from './tariffs'

export interface ServiceMomentInput {
  vesselId: string
  interpretationPortId: string | null
  moment: MomentInputDto
}
export interface CreateFreeServiceDto extends ServiceMomentInput {
  executionStatus: ExecutionStatus
  description: string
  base: string
  notes: string | null
  specified: SpecifiedSubjectsDto
}
export interface CreateCatalogServiceDto extends Omit<
  CreateFreeServiceDto,
  'description' | 'base'
> {
  serviceTypeId: string
}
export interface ServiceMomentDto {
  portId: string
  portName: string
  resolution: MomentResolutionDto
}
interface ServiceActivityCommonDto {
  id: string
  vesselId: string
  vesselVersionId: string
  vesselName: string
  moment: ResolvedMomentDto
  executionStatus: ExecutionStatus
  description: string
  base: string
  notes: string | null
  context: Extract<OperationalContextDto, { status: 'IN_PORT' }>
  portVersionId: string
  portName: string
  berthVersionId: string | null
  berthName: string | null
  specified: SpecifiedSubjectsDto
  subjects: EffectiveSubjectsDto
}
export type ServiceActivityDto = ServiceActivityCommonDto &
  (
    | { category: 'FREE'; serviceTypeId: null; calculation: null }
    | { category: 'CATALOG'; serviceTypeId: string; calculation: BaseCalculationDto }
  )
export interface ServiceApi {
  createCatalog(
    request: CommandRequest<CreateCatalogServiceDto>,
  ): Promise<ApplicationResult<ServiceActivityDto>>
  resolveMoment(
    request: QueryRequest<ServiceMomentInput>,
  ): Promise<ApplicationResult<ServiceMomentDto>>
  createFree(
    request: CommandRequest<CreateFreeServiceDto>,
  ): Promise<ApplicationResult<ServiceActivityDto>>
  list(
    request: QueryRequest<{ vesselId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<PageDto<ServiceActivityDto>>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<ServiceActivityDto>>
}
export const serviceChannels = {
  resolveMoment: 'services:resolve-moment',
  createFree: 'services:create-free',
  createCatalog: 'services:create-catalog',
  list: 'services:list',
  get: 'services:get',
} as const
