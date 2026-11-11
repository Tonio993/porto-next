import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { ChangePreviewDto, PageDto, VersionIntervalDto } from './master-data'
import type { MomentInputDto, MomentResolutionDto } from './values'

export interface AgencyVersionDto extends VersionIntervalDto {
  businessName: string
}

export interface AgencyDto {
  id: string
  code: number
  status: 'ACTIVE' | 'INACTIVE'
  selectable: boolean
  version: AgencyVersionDto
  nextTransitionAt: string | null
}

export interface AgencyListQuery {
  search: string
  page: number
  pageSize: number
  selectableOnly: boolean
}

export interface AgencyHistoryDto {
  agency: AgencyDto
  versions: PageDto<AgencyVersionDto>
}

export type AgencyChangeDto = { agencyId: string } & (
  | { operation: 'INSERT_VERSION'; businessName: string; moment: MomentInputDto }
  | {
      operation: 'UPDATE_VERSION'
      versionId: string
      businessName: string
      moment: MomentInputDto | null
    }
  | { operation: 'DELETE_VERSION'; versionId: string }
  | { operation: 'DEACTIVATE_AGENCY' | 'DELETE_AGENCY' }
)

export interface AgencyPreviewDto extends ChangePreviewDto {
  operation: AgencyChangeDto['operation']
}

export interface AgencyApi {
  create(request: CommandRequest<{ businessName: string }>): Promise<ApplicationResult<AgencyDto>>
  list(request: QueryRequest<AgencyListQuery>): Promise<ApplicationResult<PageDto<AgencyDto>>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<AgencyDto>>
  history(
    request: QueryRequest<{ id: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<AgencyHistoryDto>>
  resolveVersionMoment(
    request: QueryRequest<{ agencyId: string; moment: MomentInputDto }>,
  ): Promise<ApplicationResult<MomentResolutionDto>>
  preview(request: CommandRequest<AgencyChangeDto>): Promise<ApplicationResult<AgencyPreviewDto>>
  confirm(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ agencyId: string }>>
  reactivate(
    request: CommandRequest<{ agencyId: string }>,
  ): Promise<ApplicationResult<{ agencyId: string }>>
  previewEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<AgencyPreviewDto['effects']>>
}

export const agencyChannels = {
  create: 'agencies:create',
  list: 'agencies:list',
  get: 'agencies:get',
  history: 'agencies:history',
  resolveVersionMoment: 'agencies:resolve-version-moment',
  preview: 'agencies:preview',
  confirm: 'agencies:confirm',
  reactivate: 'agencies:reactivate',
  previewEffects: 'agencies:preview-effects',
} as const
