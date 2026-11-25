import type { ApplicationResult, CommandRequest, QueryRequest } from './application'
import type { ChangePreviewDto, PageDto } from './master-data'

export type AssignmentLevel =
  'SERVICE_ACTIVITY' | 'VESSEL_OPERATION' | 'BERTH_STAY' | 'PORT_CALL' | 'VOYAGE'
export interface AssignmentTarget {
  kind: AssignmentLevel
  id: string
}
export interface SpecifiedSubjectsDto {
  customerId: string | null
  agencyId: string | null
}
export interface EffectiveSubjectDto {
  id: string
  versionId: string
  businessName: string
  source: AssignmentTarget
  description?: {
    version: import('./descriptive-references').VersionReferenceDto | null
    origin:
      | import('./descriptive-references').StayReferenceDto
      | import('./descriptive-references').ActivityReferenceDto
      | null
  }
}
export interface EffectiveSubjectsDto {
  customer: EffectiveSubjectDto | null
  agency: EffectiveSubjectDto | null
}
export interface AssignmentDto {
  target: AssignmentTarget
  specified: SpecifiedSubjectsDto
  effective: EffectiveSubjectsDto
  /** Operazioni: una coppia per estremo economico, anche se diversa da quella iniziale. */
  components: { id: string; label: string; subjects: EffectiveSubjectsDto }[]
}
export interface AssignmentChangeDto {
  target: AssignmentTarget
  specified: SpecifiedSubjectsDto
}
export interface AssignmentPreviewDto extends ChangePreviewDto {
  assignment: AssignmentDto
}
export interface AssignmentApi {
  get(request: QueryRequest<AssignmentTarget>): Promise<ApplicationResult<AssignmentDto>>
  preview(
    request: CommandRequest<AssignmentChangeDto>,
  ): Promise<ApplicationResult<AssignmentPreviewDto>>
  previewEffects(
    request: QueryRequest<{ previewId: string; page: number; pageSize: number }>,
  ): Promise<ApplicationResult<PageDto<ChangePreviewDto['effects']['items'][number]>>>
  confirm(request: CommandRequest<{ previewId: string }>): Promise<ApplicationResult<AssignmentDto>>
}
export const assignmentChannels = {
  get: 'assignments:get',
  preview: 'assignments:preview',
  previewEffects: 'assignments:preview-effects',
  confirm: 'assignments:confirm',
} as const
