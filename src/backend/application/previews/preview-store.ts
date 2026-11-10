import { randomUUID } from 'node:crypto'
import type { ArchiveContextDto } from '../../../shared/contracts/application'
import { ArchiveError } from '../../../shared/errors/archive-error'

interface Entry {
  operation: string
  context: ArchiveContextDto
  input: unknown
  generatedAtUtc: string
  expiresAtUtc: string
}
/** Session-owned memory only; never a transaction or a renderer-supplied plan. */
export class PreviewStore {
  private readonly entries = new Map<string, Entry>()
  constructor(private readonly now = () => Date.now()) {}
  put(operation: string, context: ArchiveContextDto, input: unknown) {
    for (const [id, entry] of this.entries)
      if (Date.parse(entry.expiresAtUtc) <= this.now()) this.entries.delete(id)
    while (this.entries.size >= 32) this.entries.delete(this.entries.keys().next().value!)
    const previewId = randomUUID()
    const entry = {
      operation,
      context: { ...context },
      input: structuredClone(input),
      generatedAtUtc: new Date(this.now()).toISOString(),
      expiresAtUtc: new Date(this.now() + 15 * 60_000).toISOString(),
    }
    this.entries.set(previewId, entry)
    return { previewId, generatedAtUtc: entry.generatedAtUtc, expiresAtUtc: entry.expiresAtUtc }
  }
  get(id: string, operation: string | null, context: ArchiveContextDto): Entry {
    const entry = this.entries.get(id)
    if (!entry || Date.parse(entry.expiresAtUtc) <= this.now()) {
      this.entries.delete(id)
      throw new ArchiveError(
        'PREVIEW_EXPIRED',
        'L’anteprima non è più disponibile. Generane una nuova.',
      )
    }
    if (operation && entry.operation !== operation)
      throw new ArchiveError('PREVIEW_EXPIRED', 'L’anteprima appartiene a un’altra operazione.')
    if (
      entry.context.sessionId !== context.sessionId ||
      entry.context.archiveId !== context.archiveId
    )
      throw new ArchiveError('ARCHIVE_SESSION_CHANGED', 'L’archivio aperto è cambiato.')
    if (entry.context.revision !== context.revision)
      throw new ArchiveError(
        'REVISION_CONFLICT',
        'I dati sono cambiati. Genera una nuova anteprima.',
      )
    return structuredClone(entry)
  }
  consume(id: string) {
    this.entries.delete(id)
  }
  clear() {
    this.entries.clear()
  }
}
