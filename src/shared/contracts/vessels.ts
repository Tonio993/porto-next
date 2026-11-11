import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { ChangePreviewDto, PageDto, VersionIntervalDto } from './master-data'
import type { MomentInputDto, MomentResolutionDto } from './values'

/** Stable technical codes, never administered by the operator. */
export const vesselTypes = [
  { id: 'STANDARD', label: 'Nave normale' },
  { id: 'PASSENGER', label: 'Nave passeggeri' },
  { id: 'ADM', label: 'Nave ADM' },
] as const
export type VesselTypeId = (typeof vesselTypes)[number]['id']

export interface VesselDescriptionDto {
  registeredName: string
  imoNumber: string | null
  vesselTypeId: VesselTypeId
  size: number
}

export interface VesselVersionDto extends VersionIntervalDto, VesselDescriptionDto {}

export interface VesselDto {
  id: string
  code: number
  status: 'ACTIVE' | 'INACTIVE'
  selectable: boolean
  version: VesselVersionDto
  nextTransitionAt: string | null
}

export interface VesselListQuery {
  search: string
  page: number
  pageSize: number
  selectableOnly: boolean
}

export interface VesselHistoryDto {
  vessel: VesselDto
  versions: PageDto<VesselVersionDto>
}

export type VesselChangeDto = { vesselId: string } & (
  | ({ operation: 'INSERT_VERSION'; moment: MomentInputDto } & VesselDescriptionDto)
  | ({
      operation: 'UPDATE_VERSION'
      versionId: string
      moment: MomentInputDto | null
    } & VesselDescriptionDto)
  | { operation: 'DELETE_VERSION'; versionId: string }
  | { operation: 'DEACTIVATE_VESSEL' | 'DELETE_VESSEL' }
)

export interface VesselPreviewDto extends ChangePreviewDto {
  operation: VesselChangeDto['operation']
}

export interface VesselApi {
  create(request: CommandRequest<VesselDescriptionDto>): Promise<ApplicationResult<VesselDto>>
  list(request: QueryRequest<VesselListQuery>): Promise<ApplicationResult<PageDto<VesselDto>>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<VesselDto>>
  versionAt(
    request: QueryRequest<{ vesselId: string; instant: string }>,
  ): Promise<ApplicationResult<VesselVersionDto>>
  history(
    request: QueryRequest<{ id: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<VesselHistoryDto>>
  resolveVersionMoment(
    request: QueryRequest<{ vesselId: string; moment: MomentInputDto }>,
  ): Promise<ApplicationResult<MomentResolutionDto>>
  preview(request: CommandRequest<VesselChangeDto>): Promise<ApplicationResult<VesselPreviewDto>>
  confirm(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ vesselId: string }>>
  reactivate(
    request: CommandRequest<{ vesselId: string }>,
  ): Promise<ApplicationResult<{ vesselId: string }>>
  previewEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<VesselPreviewDto['effects']>>
}

export const vesselChannels = {
  create: 'vessels:create',
  list: 'vessels:list',
  get: 'vessels:get',
  versionAt: 'vessels:version-at',
  history: 'vessels:history',
  resolveVersionMoment: 'vessels:resolve-version-moment',
  preview: 'vessels:preview',
  confirm: 'vessels:confirm',
  reactivate: 'vessels:reactivate',
  previewEffects: 'vessels:preview-effects',
} as const
