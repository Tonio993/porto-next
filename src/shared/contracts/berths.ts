import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { ChangePreviewDto, PageDto, VersionIntervalDto } from './master-data'
import type { MomentInputDto, MomentResolutionDto } from './values'

export interface BerthVersionDto extends VersionIntervalDto {
  name: string
}

export interface BerthDto {
  id: string
  portId: string
  code: number
  status: 'ACTIVE' | 'INACTIVE'
  selectable: boolean
  version: BerthVersionDto
  nextTransitionAt: string | null
}

export interface BerthListQuery {
  portId: string
  page: number
  pageSize: number
  selectableOnly: boolean
}

export interface BerthHistoryDto {
  berth: BerthDto
  versions: PageDto<BerthVersionDto>
}

export type BerthChangeDto = { berthId: string } & (
  | { operation: 'INSERT_VERSION'; name: string; moment: MomentInputDto }
  | { operation: 'UPDATE_VERSION'; versionId: string; name: string; moment: MomentInputDto | null }
  | { operation: 'DELETE_VERSION'; versionId: string }
  | { operation: 'DEACTIVATE_BERTH' | 'DELETE_BERTH' }
)

export interface BerthPreviewDto extends ChangePreviewDto {
  operation: BerthChangeDto['operation']
}

export interface BerthApi {
  create(
    request: CommandRequest<{ portId: string; name: string }>,
  ): Promise<ApplicationResult<BerthDto>>
  list(request: QueryRequest<BerthListQuery>): Promise<ApplicationResult<PageDto<BerthDto>>>
  history(
    request: QueryRequest<{ id: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<BerthHistoryDto>>
  resolveVersionMoment(
    request: QueryRequest<{ berthId: string; moment: MomentInputDto }>,
  ): Promise<ApplicationResult<MomentResolutionDto>>
  preview(request: CommandRequest<BerthChangeDto>): Promise<ApplicationResult<BerthPreviewDto>>
  confirm(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ berthId: string }>>
  reactivate(
    request: CommandRequest<{ berthId: string }>,
  ): Promise<ApplicationResult<{ berthId: string }>>
  previewEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<BerthPreviewDto['effects']>>
}

export const berthChannels = {
  create: 'berths:create',
  list: 'berths:list',
  history: 'berths:history',
  resolveVersionMoment: 'berths:resolve-version-moment',
  preview: 'berths:preview',
  confirm: 'berths:confirm',
  reactivate: 'berths:reactivate',
  previewEffects: 'berths:preview-effects',
} as const
