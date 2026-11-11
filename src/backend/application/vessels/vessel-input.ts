import { vesselTypes, type VesselDescriptionDto } from '../../../shared/contracts/vessels'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { identifierText } from '../../domain/values/identifiers'

export const vesselDescriptionKeys = [
  'registeredName',
  'imoNumber',
  'vesselTypeId',
  'size',
] as const

export function vesselDescription(input: Record<string, unknown>): VesselDescriptionDto {
  const registeredName = identifierText(
    input.registeredName,
    'registeredName',
    'Controlla il nome di registrazione della nave.',
  )
  if (
    input.imoNumber !== null &&
    (typeof input.imoNumber !== 'string' || [...input.imoNumber.trim()].length > 64)
  )
    throw new ArchiveError('VALIDATION_ERROR', 'Controlla l’IMO della nave.', [
      {
        path: ['imoNumber'],
        code: 'INVALID_TEXT',
        message: 'Inserisci al massimo 64 caratteri oppure lascia il campo vuoto.',
      },
    ])
  if (!vesselTypes.some(({ id }) => id === input.vesselTypeId))
    throw new ArchiveError('VALIDATION_ERROR', 'Scegli una tipologia nave.', [
      {
        path: ['vesselTypeId'],
        code: 'INVALID_TYPE',
        message: 'Scegli una delle tre tipologie previste.',
      },
    ])
  if (typeof input.size !== 'number' || !Number.isSafeInteger(input.size) || input.size < 0)
    throw new ArchiveError('LIMIT_EXCEEDED', 'Controlla la dimensione della nave.', [
      {
        path: ['size'],
        code: 'INVALID_INTEGER',
        message: 'Inserisci un intero da 0 a 9007199254740991.',
      },
    ])
  return {
    registeredName,
    imoNumber: typeof input.imoNumber === 'string' ? input.imoNumber.trim() || null : null,
    vesselTypeId: input.vesselTypeId as VesselDescriptionDto['vesselTypeId'],
    size: input.size,
  }
}
