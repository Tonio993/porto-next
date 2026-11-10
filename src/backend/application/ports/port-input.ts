import { countryCodes } from '../../../shared/contracts/countries'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { identifierText } from '../../domain/values/identifiers'
import { validateSession } from '../archives/context-validation'

export function portDescription(input: Record<string, unknown>) {
  const name = identifierText(input.name, 'name')
  const locality = identifierText(input.locality, 'locality')
  const countryCode =
    typeof input.countryCode === 'string' ? input.countryCode.trim().toUpperCase() : ''
  if (!countryCodes.includes(countryCode))
    throw new ArchiveError('VALIDATION_ERROR', 'Scegli un paese valido.', [
      { path: ['countryCode'], code: 'INVALID_COUNTRY', message: 'Scegli un paese ISO alpha-2.' },
    ])
  return { name, locality, countryCode }
}

export function entityId(value: unknown, field: string): string {
  try {
    return validateSession(value)
  } catch {
    throw new ArchiveError('VALIDATION_ERROR', 'Identificativo non valido.', [
      { path: [field], code: 'INVALID_UUID', message: 'Identificativo non valido.' },
    ])
  }
}

export function pagination(page: unknown, pageSize: unknown) {
  if (
    typeof page !== 'number' ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    typeof pageSize !== 'number' ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    !Number.isSafeInteger((page - 1) * pageSize)
  )
    throw new ArchiveError('VALIDATION_ERROR', 'Pagina non valida.')
  return { page, pageSize }
}
