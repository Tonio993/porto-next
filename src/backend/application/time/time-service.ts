import type { CommandRequest, QueryRequest } from '../../../shared/contracts/application'
import type { MomentInputDto } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { resolveMoment } from '../../domain/values/moments'
import { TimeZoneRepository } from '../../infrastructure/database/time-zone-repository'
import type { ArchiveCoordinator } from '../archives/archive-coordinator'
import { record } from '../archives/context-validation'

export class TimeService {
  constructor(private readonly coordinator: ArchiveCoordinator) {}

  getCompanyZone(request: QueryRequest<null>) {
    return this.coordinator.query(request, ({ database }, query) => {
      if (query !== null) throw new ArchiveError('VALIDATION_ERROR', 'La richiesta non è valida.')
      return new TimeZoneRepository(database).company()
    })
  }

  configureCompanyZone(request: CommandRequest<{ zoneId: string }>) {
    return this.coordinator.command(request, ({ database }, payload) => {
      const input = record(payload, ['zoneId'])
      return new TimeZoneRepository(database).configureCompany(input.zoneId)
    })
  }

  resolveCompanyMoment(request: QueryRequest<MomentInputDto>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['localDateTime', 'selectedOffset'])
      const company = new TimeZoneRepository(database).company()
      if (!company.confirmed)
        throw new ArchiveError('VALIDATION_ERROR', 'Conferma prima il fuso aziendale iniziale.')
      // Only administrative moments: port activities must resolve their own port zone.
      return resolveMoment(input.localDateTime, company.zoneId, input.selectedOffset)
    })
  }
}
