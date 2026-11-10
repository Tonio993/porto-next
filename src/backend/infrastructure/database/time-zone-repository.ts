import type { CompanyTimeZoneDto } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { timeZoneId } from '../../domain/values/moments'
import type { DatabaseSession } from './database-session'

/** Constructed within the active session; never cached across activations. */
export class TimeZoneRepository {
  constructor(private readonly database: DatabaseSession) {}

  company(): CompanyTimeZoneDto {
    return this.database.companyZone()
  }

  configureCompany(zone: unknown): CompanyTimeZoneDto {
    const zoneId = timeZoneId(zone)
    const current = this.company()
    if (current.confirmed) {
      if (current.zoneId === zoneId) return current
      throw new ArchiveError(
        'VALIDATION_ERROR',
        'Il fuso iniziale è già confermato. Le variazioni dei fusi non sono disponibili.',
        [{ path: ['zoneId'], code: 'ALREADY_CONFIGURED', message: 'Fuso già confermato.' }],
      )
    }
    this.database.sqlite
      .prepare('UPDATE company_time_zone SET zone_id = ?, confirmed = 1 WHERE singleton = 1')
      .run(zoneId)
    return { zoneId, confirmed: true }
  }
}
