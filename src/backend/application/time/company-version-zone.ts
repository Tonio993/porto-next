import { ArchiveError } from '../../../shared/errors/archive-error'
import type { DatabaseSession } from '../../infrastructure/database/database-session'

/** General effective dates require the explicitly confirmed company zone. */
export function companyVersionZone(database: DatabaseSession): string {
  const company = database.companyZone()
  if (!company.confirmed)
    throw new ArchiveError(
      'VALIDATION_ERROR',
      'Conferma prima il fuso aziendale iniziale in Riferimenti temporali.',
    )
  return company.zoneId
}
