import type { CommandRequest, QueryRequest } from '../../../shared/contracts/application'
import type { CreatePortDto, PortListQueryDto } from '../../../shared/contracts/ports'
import { countryCodes } from '../../../shared/contracts/countries'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { identifierText } from '../../domain/values/identifiers'
import { initialPortTimeZone } from '../../domain/values/moments'
import { PortRepository } from '../../infrastructure/database/port-repository'
import type { ArchiveCoordinator } from '../archives/archive-coordinator'
import { record, validateSession } from '../archives/context-validation'

export class PortService {
  constructor(private readonly coordinator: ArchiveCoordinator) {}

  create(request: CommandRequest<CreatePortDto>) {
    return this.coordinator.command(request, ({ database }, payload) => {
      const input = record(payload, ['name', 'locality', 'countryCode', 'initialZoneId'])
      const name = identifierText(input.name, 'name')
      const locality = identifierText(input.locality, 'locality')
      const countryCode =
        typeof input.countryCode === 'string' ? input.countryCode.trim().toUpperCase() : ''
      if (!countryCodes.includes(countryCode))
        throw new ArchiveError('VALIDATION_ERROR', 'Scegli un paese valido.', [
          {
            path: ['countryCode'],
            code: 'INVALID_COUNTRY',
            message: 'Scegli un paese ISO alpha-2.',
          },
        ])
      // The company zone is only a proposal; each new port stores its own choice.
      if (typeof input.initialZoneId !== 'string')
        throw new ArchiveError('VALIDATION_ERROR', 'Scegli il fuso iniziale del porto.')
      let initialZoneId: string
      try {
        initialZoneId = initialPortTimeZone(
          database.companyZone().zoneId,
          input.initialZoneId,
        ).zoneId
      } catch {
        throw new ArchiveError('INVALID_TIME_ZONE', 'Scegli un fuso IANA valido.', [
          { path: ['initialZoneId'], code: 'INVALID_TIME_ZONE', message: 'Fuso IANA non valido.' },
        ])
      }
      return new PortRepository(database).create({ name, locality, countryCode, initialZoneId })
    })
  }

  list(request: QueryRequest<PortListQueryDto>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['page', 'pageSize', 'search'])
      const { page, pageSize, search } = input
      if (
        typeof page !== 'number' ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        typeof pageSize !== 'number' ||
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100 ||
        !Number.isSafeInteger((page - 1) * pageSize) ||
        typeof search !== 'string' ||
        [...search].length > 200
      )
        throw new ArchiveError('VALIDATION_ERROR', 'Ricerca o pagina non valida.')
      return new PortRepository(database).list({ page, pageSize, search })
    })
  }

  get(request: QueryRequest<{ id: string }>) {
    return this.coordinator.query(request, ({ database }, query) => {
      const input = record(query, ['id'])
      const id = validateSession(input.id)
      return new PortRepository(database).get(id)
    })
  }
}
