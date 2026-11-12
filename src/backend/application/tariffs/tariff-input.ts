import type { TariffActivity, TariffConfigurationInput } from '../../../shared/contracts/tariffs'
import type { MomentInputDto } from '../../../shared/contracts/values'
import { vesselTypes } from '../../../shared/contracts/vessels'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { tariffInteger } from '../../domain/tariffs/base-calculator'
import { decimalText } from '../../domain/values/numbers'
import { record } from '../archives/context-validation'
import { entityId } from '../ports/port-input'

export function momentInput(value: unknown): MomentInputDto {
  return record(value, ['localDateTime', 'selectedOffset']) as unknown as MomentInputDto
}
export function configurationsInput(value: unknown): TariffConfigurationInput[] {
  if (!Array.isArray(value) || value.length !== 3)
    throw new ArchiveError(
      'VALIDATION_ERROR',
      'Completa le tre configurazioni STANDARD, PASSENGER e ADM.',
    )
  const configurations = value.map((item, index) => {
    const input = record(item, ['vesselTypeId', 'brackets', 'extraWidth', 'extraValue'])
    const path = `configurations.${index}`
    if (!vesselTypes.some((type) => type.id === input.vesselTypeId))
      throw new ArchiveError('VALIDATION_ERROR', 'Tipologia nave non valida.')
    if (!Array.isArray(input.brackets) || input.brackets.length < 1 || input.brackets.length > 1000)
      throw new ArchiveError(
        'VALIDATION_ERROR',
        'Ogni configurazione richiede da 1 a 1000 scaglioni ordinari.',
      )
    let previous = -1
    const brackets = input.brackets.map((item, i) => {
      const bracket = record(item, ['upperLimit', 'value'])
      const upperLimit = tariffInteger(bracket.upperLimit, `${path}.brackets.${i}.upperLimit`)
      if (upperLimit <= previous)
        throw new ArchiveError(
          'VALIDATION_ERROR',
          'I limiti devono essere strettamente crescenti e senza duplicati.',
          [
            {
              path: ['configurations', index, 'brackets', i, 'upperLimit'],
              code: 'UNORDERED_BRACKETS',
              message: 'Il limite deve superare il precedente.',
            },
          ],
        )
      previous = upperLimit
      return { upperLimit, value: decimalText(bracket.value, `${path}.brackets.${i}.value`) }
    })
    return {
      vesselTypeId: input.vesselTypeId as TariffConfigurationInput['vesselTypeId'],
      brackets,
      extraWidth: tariffInteger(input.extraWidth, `${path}.extraWidth`, true),
      extraValue: decimalText(input.extraValue, `${path}.extraValue`),
    }
  })
  if (new Set(configurations.map((c) => c.vesselTypeId)).size !== 3)
    throw new ArchiveError(
      'VALIDATION_ERROR',
      'Ogni tipologia deve comparire esattamente una volta.',
    )
  return configurations
}
export function activityInput(value: unknown): TariffActivity {
  const kind = (value as TariffActivity | null)?.kind
  const input = record(
    value,
    kind === 'OPERATION' ? ['kind', 'operation'] : ['kind', 'serviceTypeId'],
  )
  if (kind === 'OPERATION' && ['ENTRY', 'EXIT', 'MOVEMENT'].includes(input.operation as string))
    return { kind, operation: input.operation as 'ENTRY' | 'EXIT' | 'MOVEMENT' }
  if (kind === 'CATALOG')
    return { kind, serviceTypeId: entityId(input.serviceTypeId, 'serviceTypeId') }
  throw new ArchiveError('VALIDATION_ERROR', 'Scegli un tipo di attività valido.')
}
