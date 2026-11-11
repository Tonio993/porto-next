import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { ChangePreviewDto, PageDto, VersionIntervalDto } from './master-data'
import type { MomentInputDto, MomentResolutionDto } from './values'

export interface CustomerVersionDto extends VersionIntervalDto {
  businessName: string
}

export interface CustomerDto {
  id: string
  code: number
  status: 'ACTIVE' | 'INACTIVE'
  selectable: boolean
  version: CustomerVersionDto
  nextTransitionAt: string | null
}

export interface CustomerListQuery {
  search: string
  page: number
  pageSize: number
  selectableOnly: boolean
}

export interface CustomerHistoryDto {
  customer: CustomerDto
  versions: PageDto<CustomerVersionDto>
}

export type CustomerChangeDto = { customerId: string } & (
  | { operation: 'INSERT_VERSION'; businessName: string; moment: MomentInputDto }
  | {
      operation: 'UPDATE_VERSION'
      versionId: string
      businessName: string
      moment: MomentInputDto | null
    }
  | { operation: 'DELETE_VERSION'; versionId: string }
  | { operation: 'DEACTIVATE_CUSTOMER' | 'DELETE_CUSTOMER' }
)

export interface CustomerPreviewDto extends ChangePreviewDto {
  operation: CustomerChangeDto['operation']
}

export interface CustomerApi {
  create(request: CommandRequest<{ businessName: string }>): Promise<ApplicationResult<CustomerDto>>
  list(request: QueryRequest<CustomerListQuery>): Promise<ApplicationResult<PageDto<CustomerDto>>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<CustomerDto>>
  history(
    request: QueryRequest<{ id: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<CustomerHistoryDto>>
  resolveVersionMoment(
    request: QueryRequest<{ customerId: string; moment: MomentInputDto }>,
  ): Promise<ApplicationResult<MomentResolutionDto>>
  preview(
    request: CommandRequest<CustomerChangeDto>,
  ): Promise<ApplicationResult<CustomerPreviewDto>>
  confirm(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ customerId: string }>>
  reactivate(
    request: CommandRequest<{ customerId: string }>,
  ): Promise<ApplicationResult<{ customerId: string }>>
  previewEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<CustomerPreviewDto['effects']>>
}

export const customerChannels = {
  create: 'customers:create',
  list: 'customers:list',
  get: 'customers:get',
  history: 'customers:history',
  resolveVersionMoment: 'customers:resolve-version-moment',
  preview: 'customers:preview',
  confirm: 'customers:confirm',
  reactivate: 'customers:reactivate',
  previewEffects: 'customers:preview-effects',
} as const
