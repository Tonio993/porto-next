import type {
  ApplicationResult,
  ArchiveContextDto,
  CommandRequest,
  ConflictDto,
  QueryRequest,
} from './application'
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
export interface ServiceListQuery {
  vesselId?: string | null
  category?: 'FREE' | 'CATALOG' | null
  serviceTypeId?: string | null
  executionStatus?: ExecutionStatus | null
  fromUtc?: string | null
  toUtc?: string | null
  portId?: string | null
  berthId?: string | null
  voyageId?: string | null
  portCallId?: string | null
  berthStayId?: string | null
  customerId?: string | null
  agencyId?: string | null
  page: number
  pageSize: number
}
export type ServiceChange =
  | { operation: 'UPDATE_FREE' | 'COMPLETE_FREE'; id: string; values: CreateFreeServiceDto }
  | {
      operation: 'UPDATE_CATALOG' | 'COMPLETE_CATALOG'
      id: string
      values: CreateCatalogServiceDto
    }
  | { operation: 'DELETE'; id: string }
export interface ServiceChangePreviewDto {
  previewId: string
  context: ArchiveContextDto
  operation: ServiceChange['operation']
  generatedAtUtc: string
  expiresAtUtc: string
  before: ServiceActivityDto
  after: ServiceActivityDto | null
  changedFields: readonly string[]
  blockers: readonly ConflictDto[]
}
export interface ServiceApi {
  preview(
    request: CommandRequest<ServiceChange>,
  ): Promise<ApplicationResult<ServiceChangePreviewDto>>
  confirm(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ id: string; service: ServiceActivityDto | null }>>
  updateNotes(
    request: CommandRequest<{ id: string; notes: string | null }>,
  ): Promise<ApplicationResult<ServiceActivityDto>>
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
    request: QueryRequest<ServiceListQuery>,
  ): Promise<ApplicationResult<PageDto<ServiceActivityDto>>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<ServiceActivityDto>>
}
export const serviceChannels = {
  preview: 'services:preview',
  confirm: 'services:confirm',
  updateNotes: 'services:update-notes',
  resolveMoment: 'services:resolve-moment',
  createFree: 'services:create-free',
  createCatalog: 'services:create-catalog',
  list: 'services:list',
  get: 'services:get',
} as const
