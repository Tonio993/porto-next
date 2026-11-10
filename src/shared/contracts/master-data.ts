import type { ArchiveContextDto, ConflictDto, EntityReferenceDto } from './application'
import type { ResolvedMomentDto } from './values'

export interface VersionIntervalDto {
  id: string
  effectiveFrom: string | null
  effectiveMoment: ResolvedMomentDto | null
  effectiveTo: string | null
  phase: 'HISTORICAL' | 'CURRENT' | 'FUTURE'
}

export interface PageDto<T> {
  items: readonly T[]
  total: number
  page: number
  pageSize: number
}

export interface ChangeEffectDto {
  versionId: string | null
  reference: EntityReferenceDto
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  changes: readonly { field: string; before: string | null; after: string | null }[]
}

export interface ChangePreviewDto {
  previewId: string
  operation: string
  context: ArchiveContextDto
  generatedAtUtc: string
  expiresAtUtc: string
  status: 'READY' | 'BLOCKED'
  summary: {
    created: number
    updated: number
    deleted: number
    reattributed: number
    recalculated: number
  }
  effects: PageDto<ChangeEffectDto>
  warnings: readonly string[]
  blockers: readonly ConflictDto[]
}
