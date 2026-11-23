import type {
  ApplicationResult,
  ArchiveContextDto,
  FieldIssueDto,
} from '../../../shared/contracts/application'

/** One lane per independently replaceable view (list, detail, editor). */
export class ResponseScope {
  private generation = 0
  private active = false
  private suspensions = 0
  constructor(private readonly context: () => ArchiveContextDto | null) {}
  activate() {
    this.active = true
    ++this.generation
  }
  invalidate() {
    ++this.generation
  }
  dispose() {
    this.active = false
    this.invalidate()
  }
  /** Keep a destructive command and its selection update in the same read barrier. */
  async suspendWhile<T>(operation: () => Promise<T>, enabled = true): Promise<T> {
    if (!enabled) return operation()
    ++this.suspensions
    this.invalidate()
    try {
      return await operation()
    } finally {
      --this.suspensions
      this.invalidate()
    }
  }
  begin() {
    const generation = ++this.generation
    const session = this.context()?.sessionId
    const current = () =>
      this.active &&
      this.suspensions === 0 &&
      generation === this.generation &&
      session === this.context()?.sessionId
    return {
      current,
      accepts: <T>(result: ApplicationResult<T>) =>
        current() &&
        (!result.context ||
          (result.context.sessionId === session &&
            BigInt(result.context.revision) >= BigInt(this.context()!.revision))),
    }
  }
}

export const fieldErrors = (fields: readonly FieldIssueDto[]) =>
  Object.fromEntries(fields.map((field) => [field.path.join('.'), field.message]))
