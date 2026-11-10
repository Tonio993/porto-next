import type { ErrorCode } from '../contracts/archive'

export class ArchiveError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ArchiveError'
  }
}

export function asArchiveError(error: unknown): ArchiveError {
  if (error instanceof ArchiveError) return error
  const code = (error as { code?: string } | null)?.code
  if (code === 'ENOENT') return new ArchiveError('FILE_NOT_FOUND', 'Il file non è stato trovato.')
  if (code === 'EEXIST')
    return new ArchiveError(
      'FILE_EXISTS',
      'Esiste già un file con questo nome. Scegli un altro nome.',
    )
  if (code === 'EACCES' || code === 'EPERM' || code === 'SQLITE_READONLY')
    return new ArchiveError(
      'FILE_ACCESS',
      'Non è possibile scrivere nel file o nella cartella scelta.',
    )
  if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED')
    return new ArchiveError(
      'ARCHIVE_BUSY',
      'L’archivio è occupato. Chiudilo nelle altre applicazioni.',
    )
  if (code === 'SQLITE_NOTADB' || code === 'SQLITE_CORRUPT')
    return new ArchiveError(
      'INVALID_ARCHIVE',
      'Il file non è un archivio valido oppure è danneggiato.',
    )
  return new ArchiveError(
    'UNEXPECTED',
    'Operazione non riuscita. Controlla lo spazio su disco e riprova.',
  )
}
