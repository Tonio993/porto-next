import type {
  ApplicationResult,
  ArchiveContextDto,
  FieldIssueDto,
} from '../../../shared/contracts/application'

/** One lane per independently replaceable view (list, detail, editor). */
export class ResponseScope {
  private generation = 0
  private active = false
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
  begin() {
    const generation = ++this.generation
    const session = this.context()?.sessionId
    const current = () =>
      this.active && generation === this.generation && session === this.context()?.sessionId
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
