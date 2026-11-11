import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { ChangePreviewDto, PageDto } from './master-data'

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
export interface CatalogApi {
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
  list: 'catalog:list',
  get: 'catalog:get',
  fixedWeights: 'catalog:fixed-weights',
  create: 'catalog:create',
  preview: 'catalog:preview',
  confirm: 'catalog:confirm',
  reactivate: 'catalog:reactivate',
  previewEffects: 'catalog:preview-effects',
} as const
