import type { ApplicationResult, ArchiveContextDto } from '../../../shared/contracts/application'
import type { WriteOutcomeDto } from '../../../shared/contracts/write-outcomes'
import type { WriteOutcome } from '../../../shared/contracts/write-outcomes'

export type RecoveryBarrier = (work: () => Promise<WriteOutcome>) => Promise<WriteOutcome>

/** Include revision publication and the caller's selection cleanup in the PR01 barrier. */
export function recoverWriteAttempt(
  attempt: WriteAttempt,
  read: Parameters<WriteAttempt['recover']>[0],
  onApplied: () => void,
  barrier: RecoveryBarrier = (work) => work(),
) {
  return barrier(async () => {
    const outcome = await attempt.recover(read)
    if (outcome === 'APPLIED') onApplied()
    return outcome
  })
}

/** Shared by all receipt consumers: don't accept recovery across a session activation. */
export async function readWriteReceipt(
  expected: ArchiveContextDto,
  read: () => Promise<ApplicationResult<WriteOutcomeDto>>,
  refresh: () => Promise<ArchiveContextDto | null>,
  current: () => ArchiveContextDto | null,
): Promise<ApplicationResult<WriteOutcomeDto> | null> {
  const result = await read()
  if (!result.ok) return result
  const observed = await refresh()
  const latest = current()
  if (
    !observed ||
    !latest ||
    observed.sessionId !== expected.sessionId ||
    latest.sessionId !== expected.sessionId ||
    observed.archiveId !== expected.archiveId ||
    latest.archiveId !== expected.archiveId ||
    result.context.sessionId !== expected.sessionId ||
    result.context.archiveId !== expected.archiveId ||
    BigInt(observed.revision) < BigInt(result.context.revision)
  )
    return null
  return result
}

/** Owns one invocation; recovery only reads a receipt, it never calls the write again. */
export class WriteAttempt {
  busy = false
  uncertain = false
  private attempt: { id: string; context: ArchiveContextDto } | null = null
  constructor(private readonly changed: () => void = () => {}) {}
  async run<T>(
    context: ArchiveContextDto,
    id: string,
    operation: (id: string) => Promise<ApplicationResult<T> | null>,
  ) {
    if (this.busy || this.uncertain) return null
    this.attempt = { id, context: { ...context } }
    this.busy = true
    this.changed()
    try {
      const result = await operation(id)
      this.uncertain = !result || (!result.ok && result.error.code === 'UNEXPECTED')
      return result
    } catch {
      this.uncertain = true
      return null
    } finally {
      this.busy = false
      this.changed()
    }
  }
  async recover(
    read: (
      id: string,
      context: ArchiveContextDto,
    ) => Promise<ApplicationResult<WriteOutcomeDto> | null>,
  ): Promise<WriteOutcome> {
    if (!this.attempt || !this.uncertain || this.busy) return 'UNKNOWN'
    this.busy = true
    this.changed()
    try {
      const result = await read(this.attempt.id, this.attempt.context)
      if (!result?.ok || result.context.sessionId !== this.attempt.context.sessionId)
        return 'UNKNOWN'
      const receipt = result.value
      if (receipt.context && receipt.context.sessionId !== this.attempt.context.sessionId)
        return 'UNKNOWN'
      if (
        receipt.outcome === 'APPLIED' &&
        (!receipt.context ||
          receipt.context.archiveId !== this.attempt.context.archiveId ||
          BigInt(receipt.context.revision) < BigInt(this.attempt.context.revision))
      )
        return 'UNKNOWN'
      if (receipt.outcome !== 'UNKNOWN') this.uncertain = false
      return receipt.outcome
    } catch {
      return 'UNKNOWN'
    } finally {
      this.busy = false
      this.changed()
    }
  }
}
