import Decimal from 'decimal.js'
import type { TariffConfigurationInput } from '../../../shared/contracts/tariffs'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { decimalText, Money, multiplyToMoney, positiveDecimal } from '../values/numbers'

const Exact = Decimal.clone({ precision: 1024, rounding: Decimal.ROUND_HALF_UP })
export function tariffInteger(value: unknown, path: string, positive = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (positive ? 1 : 0))
    throw new ArchiveError(
      'VALIDATION_ERROR',
      'Controlla i limiti e le ampiezze degli scaglioni.',
      [
        {
          path: path.split('.'),
          code: 'INVALID_INTEGER',
          message: `Inserisci un intero ${positive ? 'positivo' : 'non negativo'} entro 9007199254740991.`,
        },
      ],
    )
  return value
}
/** All tariff operands remain unrounded until the resulting tariff monetary step. */
export function calculateBracket(
  configuration: TariffConfigurationInput,
  size: number,
  weight: string,
) {
  tariffInteger(size, 'size')
  const index = configuration.brackets.findIndex((bracket) => size <= bracket.upperLimit)
  const bracketIndex = index < 0 ? configuration.brackets.length - 1 : index
  const bracket = configuration.brackets[bracketIndex]
  if (!bracket) throw new ArchiveError('VALIDATION_ERROR', 'La configurazione è incompleta.')
  const width = BigInt(tariffInteger(configuration.extraWidth, 'extraWidth', true))
  const excess = index < 0 ? BigInt(size) - BigInt(bracket.upperLimit) : 0n
  const extraCount = (excess + width - 1n) / width
  const raw = new Exact(decimalText(bracket.value)).plus(
    new Exact(decimalText(configuration.extraValue)).times(extraCount.toString()),
  )
  // A result may contain more than the 256 digits allowed for a single operand.
  const rounded = raw.toDecimalPlaces(2).toFixed(2)
  // parse checks int64 before multiplying by the weight, even when the weight is tiny.
  const tariffValue = Money.parse(rounded).text
  const base = multiplyToMoney(tariffValue, positiveDecimal(weight)).text
  return { bracketIndex, extraCount: Number(extraCount), tariffValue, base }
}
