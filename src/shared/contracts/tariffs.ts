import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { OperationType } from './catalog'
import type { ChangePreviewDto, PageDto, VersionIntervalDto } from './master-data'
import type { MomentInputDto, MomentResolutionDto, ResolvedMomentDto } from './values'
import type { VesselTypeId } from './vessels'

export interface TariffBracketInput {
  upperLimit: number
  value: string
}
export interface TariffConfigurationInput {
  vesselTypeId: VesselTypeId
  brackets: readonly TariffBracketInput[]
  extraWidth: number
  extraValue: string
}
export interface TariffConfigurationDto extends Omit<TariffConfigurationInput, 'brackets'> {
  id: string
  brackets: readonly (TariffBracketInput & { id: string })[]
}
export interface CreateTariffDto {
  portId: string
  moment: MomentInputDto
  configurations: readonly TariffConfigurationInput[]
}
export interface UpdateTariffDto extends Omit<CreateTariffDto, 'portId'> {
  id: string
}
export interface TariffSummaryDto extends VersionIntervalDto {
  effectiveFrom: string
  effectiveMoment: ResolvedMomentDto
  portId: string
}
export interface TariffDto extends TariffSummaryDto {
  configurations: readonly TariffConfigurationDto[]
}
export interface TariffPreviewDto extends ChangePreviewDto {
  tariff: TariffDto
}
export type TariffActivity =
  { kind: 'OPERATION'; operation: OperationType } | { kind: 'CATALOG'; serviceTypeId: string }
export interface CalculateBaseDto {
  portId: string
  vesselId: string
  moment: MomentInputDto
  activity: TariffActivity
}
/** Same trace is returned by simulation and by the synchronous calculator used in future writes. */
export interface BaseCalculationDto {
  portId: string
  vesselId: string
  vesselVersionId: string
  vesselName: string
  vesselTypeId: VesselTypeId
  size: number
  moment: ResolvedMomentDto
  activity: TariffActivity
  tariffId: string
  tariffEffectiveFrom: string
  configurationId: string
  bracketId: string
  upperLimit: number
  ordinaryValue: string
  extraWidth: number
  extraValue: string
  extraCount: number
  tariffValue: string
  weightSequenceId: string
  weightVersionId: string
  weight: string
  base: string
  steps: readonly string[]
}
export interface TariffApi {
  previewUpdate(
    request: CommandRequest<UpdateTariffDto>,
  ): Promise<ApplicationResult<TariffPreviewDto>>
  confirmUpdate(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<TariffDto>>
  previewDelete(
    request: CommandRequest<{ id: string }>,
  ): Promise<ApplicationResult<TariffPreviewDto>>
  confirmDelete(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<{ id: string }>>
  updateEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<TariffPreviewDto>>
  deletionEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<TariffPreviewDto>>
  list(
    request: QueryRequest<{ portId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<PageDto<TariffSummaryDto>>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<TariffDto>>
  copyConfigurations(
    request: QueryRequest<{ id: string }>,
  ): Promise<ApplicationResult<readonly TariffConfigurationInput[]>>
  resolveMoment(
    request: QueryRequest<{ portId: string; moment: MomentInputDto }>,
  ): Promise<ApplicationResult<MomentResolutionDto>>
  previewCreate(
    request: CommandRequest<CreateTariffDto>,
  ): Promise<ApplicationResult<TariffPreviewDto>>
  confirmCreate(
    request: CommandRequest<{ previewId: string }>,
  ): Promise<ApplicationResult<TariffDto>>
  previewEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<TariffPreviewDto>>
  simulateBase(
    request: QueryRequest<CalculateBaseDto>,
  ): Promise<ApplicationResult<BaseCalculationDto>>
}
export const tariffChannels = {
  previewUpdate: 'tariffs:preview-update',
  confirmUpdate: 'tariffs:confirm-update',
  previewDelete: 'tariffs:preview-delete',
  confirmDelete: 'tariffs:confirm-delete',
  updateEffects: 'tariffs:update-effects',
  deletionEffects: 'tariffs:deletion-effects',
  list: 'tariffs:list',
  get: 'tariffs:get',
  copyConfigurations: 'tariffs:copy-configurations',
  resolveMoment: 'tariffs:resolve-moment',
  previewCreate: 'tariffs:preview-create',
  confirmCreate: 'tariffs:confirm-create',
  previewEffects: 'tariffs:preview-effects',
  simulateBase: 'tariffs:simulate-base',
} as const
