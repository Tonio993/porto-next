import type { ApplicationResult, ArchiveContextDto, QueryRequest } from './application'

export type WriteOutcome = 'APPLIED' | 'REJECTED' | 'UNKNOWN'
export interface WriteOutcomeDto {
  outcome: WriteOutcome
  /** Context returned by the original invocation, never a refreshed/rebased context. */
  context: ArchiveContextDto | null
}
export interface WriteOutcomeApi {
  get(request: QueryRequest<{ attemptId: string }>): Promise<ApplicationResult<WriteOutcomeDto>>
}
export const writeOutcomeChannel = 'write-outcomes:get'

/** Transport metadata; stripped before the unchanged authoritative domain validation. */
export function trackedRequest<T>(request: T, attemptId: string): T & { attemptId: string } {
  return { ...request, attemptId }
}
