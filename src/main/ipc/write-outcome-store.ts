import type { ApplicationResult, ArchiveContextDto } from '../../shared/contracts/application'
import { ArchiveError } from '../../shared/errors/archive-error'
import type { WriteOutcomeDto } from '../../shared/contracts/write-outcomes'
import {
  record,
  validateContext,
  validateSession,
} from '../../backend/application/archives/context-validation'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export class WriteOutcomeStore {
  private entries = new Map<string, { sessionId: string; result: WriteOutcomeDto }>()
  // Bounded memory, absence/eviction always UNKNOWN, never proof of non-execution.
  async execute<T>(input: unknown, operation: (input: unknown) => Promise<ApplicationResult<T>>) {
    if (!input || typeof input !== 'object' || !('attemptId' in input)) return operation(input)
    const envelope = record(input, ['context', 'payload', 'attemptId'])
    const context = validateContext(envelope.context)
    const attemptId = envelope.attemptId
    if (typeof attemptId !== 'string' || !uuid.test(attemptId))
      throw new ArchiveError('VALIDATION_ERROR', 'Identificativo del tentativo non valido.')
    // No replay of writes, including a duplicate token on another method.
    if (this.entries.has(attemptId))
      throw new ArchiveError('VALIDATION_ERROR', 'Tentativo già eseguito.')
    const entry = {
      sessionId: context.sessionId,
      result: { outcome: 'UNKNOWN', context: null } as WriteOutcomeDto,
    }
    this.entries.set(attemptId, entry)
    if (this.entries.size > 2048) this.entries.delete(this.entries.keys().next().value!)
    const result = await operation({ context: envelope.context, payload: envelope.payload })
    entry.result = {
      outcome: result.ok ? 'APPLIED' : result.error.code === 'UNEXPECTED' ? 'UNKNOWN' : 'REJECTED',
      context: result.context,
    }
    return result
  }
  get(input: unknown, current: ArchiveContextDto | null): WriteOutcomeDto {
    const envelope = record(input, ['context', 'query'])
    const context = record(envelope.context, ['sessionId'])
    validateSession(context.sessionId)
    const query = record(envelope.query, ['attemptId'])
    if (!current || context.sessionId !== current.sessionId)
      throw new ArchiveError('ARCHIVE_SESSION_CHANGED', 'Sessione archivio cambiata.')
    if (typeof query.attemptId !== 'string' || !uuid.test(query.attemptId))
      throw new ArchiveError('VALIDATION_ERROR', 'Tentativo non valido.')
    const entry = this.entries.get(query.attemptId)
    return entry?.sessionId === current.sessionId
      ? entry.result
      : { outcome: 'UNKNOWN', context: null }
  }
}
