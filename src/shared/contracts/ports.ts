import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { ChangeEffectDto, ChangePreviewDto, VersionIntervalDto } from './master-data'
import type { MomentInputDto, MomentResolutionDto, ResolvedMomentDto } from './values'

export interface CreatePortDto {
  name: string
  locality: string
  countryCode: string
  initialZoneId: string
}

export interface PortDto {
  id: string
  code: number
  status: 'ACTIVE' | 'INACTIVE'
  version: {
    id: string
    effectiveFrom: string | null
    name: string
    locality: string
    countryCode: string
  }
  initialZoneId: string
  nextTransitionAt: string | null
}

export type PortDescriptionDto = Pick<CreatePortDto, 'name' | 'locality' | 'countryCode'>
export type PortVersionDto = PortDescriptionDto & VersionIntervalDto
export interface PortHistoryDto {
  port: PortDto
  versions: { items: readonly PortVersionDto[]; total: number; page: number; pageSize: number }
}
export interface InsertPortVersionDto extends PortDescriptionDto {
  portId: string
  moment: MomentInputDto
}
export interface UpdatePortVersionDto extends PortDescriptionDto {
  portId: string
  versionId: string
  moment: MomentInputDto | null
}
export interface PortVersionTargetDto {
  portId: string
  versionId: string
}
export type PortChangeOperation =
  'INSERT_VERSION' | 'UPDATE_VERSION' | 'DELETE_VERSION' | 'DEACTIVATE_PORT' | 'DELETE_PORT'
export type PortChangeEffectDto = ChangeEffectDto
export interface PortPreviewDto extends ChangePreviewDto {
  operation: PortChangeOperation
  resolved: {
    portId: string
    versionId: string | null
    effectiveMoment: ResolvedMomentDto | null
  } | null
}

export interface PortListQueryDto {
  page: number
  pageSize: number
  search: string
}

export interface PortPageDto {
  items: readonly PortDto[]
  total: number
  page: number
  pageSize: number
}

export interface PortApi {
  create(request: CommandRequest<CreatePortDto>): Promise<ApplicationResult<PortDto>>
  list(request: QueryRequest<PortListQueryDto>): Promise<ApplicationResult<PortPageDto>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<PortDto>>
  history(
    request: QueryRequest<{ id: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<PortHistoryDto>>
  resolveVersionMoment(
    request: QueryRequest<{ portId: string; moment: MomentInputDto }>,
  ): Promise<ApplicationResult<MomentResolutionDto>>
  previewInsertVersion(
    request: CommandRequest<InsertPortVersionDto>,
  ): Promise<ApplicationResult<PortPreviewDto>>
  previewUpdateVersion(
    request: CommandRequest<UpdatePortVersionDto>,
  ): Promise<ApplicationResult<PortPreviewDto>>
  previewDeleteVersion(
    request: CommandRequest<PortVersionTargetDto>,
  ): Promise<ApplicationResult<PortPreviewDto>>
  previewDeactivate(
    request: CommandRequest<{ portId: string }>,
  ): Promise<ApplicationResult<PortPreviewDto>>
  previewDelete(
    request: CommandRequest<{ portId: string }>,
  ): Promise<ApplicationResult<PortPreviewDto>>
  confirmInsertVersion(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ portId: string }>>
  confirmUpdateVersion(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ portId: string }>>
  confirmDeleteVersion(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ portId: string }>>
  confirmDeactivate(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ portId: string }>>
  confirmDelete(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ portId: string }>>
  reactivate(
    request: CommandRequest<{ portId: string }>,
  ): Promise<ApplicationResult<{ portId: string }>>
  previewEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<PortPreviewDto['effects']>>
}

export const portChannels = {
  create: 'ports:create',
  list: 'ports:list',
  get: 'ports:get',
  history: 'ports:history',
  resolveVersionMoment: 'ports:resolve-version-moment',
  previewInsertVersion: 'ports:preview-insert-version',
  previewUpdateVersion: 'ports:preview-update-version',
  previewDeleteVersion: 'ports:preview-delete-version',
  previewDeactivate: 'ports:preview-deactivate',
  previewDelete: 'ports:preview-delete',
  confirmInsertVersion: 'ports:confirm-insert-version',
  confirmUpdateVersion: 'ports:confirm-update-version',
  confirmDeleteVersion: 'ports:confirm-delete-version',
  confirmDeactivate: 'ports:confirm-deactivate',
  confirmDelete: 'ports:confirm-delete',
  reactivate: 'ports:reactivate',
  previewEffects: 'ports:preview-effects',
} as const
