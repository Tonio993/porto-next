import type { ArchiveContextDto } from '../../../shared/contracts/application'
import { ArchiveError } from '../../../shared/errors/archive-error'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new ArchiveError('VALIDATION_ERROR', 'La richiesta non è valida.', [
      { path: [], code: 'INVALID_SHAPE', message: 'Campi mancanti o non riconosciuti.' },
    ])
  }
  return value as Record<string, unknown>
}

export function validateSession(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value))
    throw new ArchiveError('VALIDATION_ERROR', 'La sessione non è valida.', [
      { path: ['context', 'sessionId'], code: 'INVALID_UUID', message: 'Sessione non valida.' },
    ])
  return value
}

export function validateContext(value: unknown): ArchiveContextDto {
  const input = record(value, ['archiveId', 'sessionId', 'revision'])
  validateSession(input.sessionId)
  if (typeof input.archiveId !== 'string' || !uuid.test(input.archiveId))
    throw new ArchiveError('VALIDATION_ERROR', 'L’identificativo dell’archivio non è valido.', [
      { path: ['context', 'archiveId'], code: 'INVALID_UUID', message: 'Archivio non valido.' },
    ])
  if (
    typeof input.revision !== 'string' ||
    !/^(0|[1-9][0-9]{0,18})$/.test(input.revision) ||
    BigInt(input.revision) > 9223372036854775807n
  )
    throw new ArchiveError('VALIDATION_ERROR', 'La revisione non è valida.', [
      { path: ['context', 'revision'], code: 'INVALID_REVISION', message: 'Revisione non valida.' },
    ])
  return input as unknown as ArchiveContextDto
}

export function validateFileRequest(input: unknown): ArchiveContextDto {
  const request = record(input, ['context', 'payload'])
  if (request.payload !== null)
    throw new ArchiveError('VALIDATION_ERROR', 'Il contenuto della richiesta non è valido.')
  return validateContext(request.context)
}
