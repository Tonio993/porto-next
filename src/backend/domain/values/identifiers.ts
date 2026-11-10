import { ArchiveError } from '../../../shared/errors/archive-error'

export const normalizedIdentifier = (value: string): string =>
  value.trim().normalize('NFC').toUpperCase().normalize('NFC')

export function identifierText(
  value: unknown,
  field: string,
  message = 'Controlla i dati del porto.',
): string {
  if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > 200)
    throw new ArchiveError('VALIDATION_ERROR', message, [
      { path: [field], code: 'INVALID_TEXT', message: 'Inserisci da 1 a 200 caratteri.' },
    ])
  return value.trim()
}
