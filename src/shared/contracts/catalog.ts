import type { MomentInputDto, MomentResolutionDto } from './values'
import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { ChangePreviewDto, PageDto, VersionIntervalDto } from './master-data'

export const operationTypes = ['ENTRY', 'EXIT', 'MOVEMENT'] as const
export type OperationType = (typeof operationTypes)[number]
export const operationLabels: Record<OperationType, string> = {
  ENTRY: 'entrata',
  EXIT: 'uscita',
  MOVEMENT: 'spostamento',
}
export interface InitialWeightDto {
  id: string
  sequenceId: string
  effectiveFrom: null
  weight: string
}
export interface ServiceTypeDto {
  id: string
  description: string
  status: 'ACTIVE' | 'INACTIVE'
  hasEverBeenUsed: boolean
  initialWeight: InitialWeightDto
}
export interface CatalogListQuery {
  search: string
  status: 'ALL' | 'ACTIVE' | 'INACTIVE'
  page: number
  pageSize: number
}
export type CatalogChange =
  | { operation: 'RENAME'; id: string; description: string }
  | { operation: 'DEACTIVATE' | 'DELETE'; id: string }
export interface WeightVersionDto extends VersionIntervalDto {
  sequenceId: string
  weight: string
}
export type WeightOwnerDto =
  { kind: 'OPERATION'; operation: OperationType } | { kind: 'CATALOG'; serviceTypeId: string }
export interface WeightHistoryDto {
  sequenceId: string
  owner: WeightOwnerDto
  label: string
  versions: PageDto<WeightVersionDto>
}
export type WeightChangeDto = { sequenceId: string } & (
  | { operation: 'INSERT'; moment: MomentInputDto; weight: string }
  | { operation: 'UPDATE'; versionId: string; moment: MomentInputDto | null; weight: string }
  | { operation: 'DELETE'; versionId: string }
)
export interface WeightPreviewDto extends ChangePreviewDto {
  sequenceId: string
  versionId: string
  version: WeightVersionDto | null
}
export interface CatalogApi {
  weightHistory(
    request: QueryRequest<{ sequenceId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<WeightHistoryDto>>
  getWeight(
    request: QueryRequest<{ sequenceId: string; versionId: string }>,
  ): Promise<ApplicationResult<WeightVersionDto>>
  resolveWeightMoment(
    request: QueryRequest<{ moment: MomentInputDto }>,
  ): Promise<ApplicationResult<MomentResolutionDto>>
  previewWeight(
    request: CommandRequest<WeightChangeDto>,
  ): Promise<ApplicationResult<WeightPreviewDto>>
  confirmWeight(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ sequenceId: string; versionId: string }>>
  weightEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<WeightPreviewDto>>
  list(request: QueryRequest<CatalogListQuery>): Promise<ApplicationResult<PageDto<ServiceTypeDto>>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<ServiceTypeDto>>
  fixedWeights(
    request: QueryRequest<null>,
  ): Promise<
    ApplicationResult<readonly { operation: OperationType; initialWeight: InitialWeightDto }[]>
  >
  create(
    request: CommandRequest<{ description: string; initialWeight: string }>,
  ): Promise<ApplicationResult<ServiceTypeDto>>
  preview(request: CommandRequest<CatalogChange>): Promise<ApplicationResult<ChangePreviewDto>>
  confirm(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ id: string }>>
  reactivate(request: CommandRequest<{ id: string }>): Promise<ApplicationResult<ServiceTypeDto>>
  previewEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<ChangePreviewDto>>
}
export const catalogChannels = {
  weightHistory: 'catalog:weight-history',
  getWeight: 'catalog:get-weight',
  resolveWeightMoment: 'catalog:resolve-weight-moment',
  previewWeight: 'catalog:preview-weight',
  confirmWeight: 'catalog:confirm-weight',
  weightEffects: 'catalog:weight-effects',
  list: 'catalog:list',
  get: 'catalog:get',
  fixedWeights: 'catalog:fixed-weights',
  create: 'catalog:create',
  preview: 'catalog:preview',
  confirm: 'catalog:confirm',
  reactivate: 'catalog:reactivate',
  previewEffects: 'catalog:preview-effects',
} as const
