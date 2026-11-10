import Decimal from 'decimal.js'
import type { DecimalText, MoneyText } from '../../../shared/contracts/values'
import { ArchiveError } from '../../../shared/errors/archive-error'

// Isolated settings; 1024 significant digits cover the P00 base formula budget.
const Exact = Decimal.clone({ precision: 1024, rounding: Decimal.ROUND_HALF_UP })
const maxCents = 9223372036854775807n

function invalid(path: string, message: string): never {
  throw new ArchiveError('VALIDATION_ERROR', message, [
    { path: [path], code: 'INVALID_DECIMAL', message },
  ])
}

export function decimalText(value: unknown, path = 'value'): DecimalText {
  if (typeof value !== 'string' || value !== value.trim() || !/^[0-9]+(?:\.[0-9]+)?$/.test(value))
    invalid(path, 'Inserisci un valore decimale non negativo, senza esponenti o separatori.')
  if (value.replace('.', '').length > 256) invalid(path, 'Il valore supera il limite di 256 cifre.')
  return new Exact(value).toFixed()
}

export function positiveDecimal(value: unknown, path = 'weight'): DecimalText {
  const canonical = decimalText(value, path)
  if (canonical === '0') invalid(path, 'Il valore deve essere maggiore di zero.')
  return canonical
}

/** Nonnegative EUR amount. Only exact bigint cents cross the SQLite boundary. */
export class Money {
  private constructor(readonly cents: bigint) {
    if (cents < 0n || cents > maxCents)
      throw new ArchiveError('AMOUNT_OUT_OF_RANGE', 'L’importo supera i limiti consentiti.')
  }

  static fromCents(cents: bigint): Money {
    if (typeof cents !== 'bigint') invalid('amount', 'I centesimi devono essere interi esatti.')
    return new Money(cents)
  }

  static parse(value: unknown, path = 'amount'): Money {
    if (
      typeof value !== 'string' ||
      value !== value.trim() ||
      !/^(0|[1-9][0-9]*)\.[0-9]{2}$/.test(value)
    )
      invalid(path, 'Inserisci un importo con punto e due cifre decimali.')
    if (value.length > 20)
      throw new ArchiveError('AMOUNT_OUT_OF_RANGE', 'L’importo supera i limiti consentiti.')
    return new Money(BigInt(value.replace('.', '')))
  }

  get text(): MoneyText {
    return `${this.cents / 100n}.${(this.cents % 100n).toString().padStart(2, '0')}`
  }

  multiply(factor: unknown): Money {
    return multiplyToMoney(this.text, factor)
  }
}

/** One monetary step: exact operands, ROUND_HALF_UP, then int64 range validation. */
export function multiplyToMoney(amount: unknown, factor: unknown): Money {
  const product = new Exact(decimalText(amount, 'amount')).times(decimalText(factor, 'factor'))
  const rounded = product.toDecimalPlaces(2, Exact.ROUND_HALF_UP)
  if (rounded.gt('92233720368547758.07'))
    throw new ArchiveError('AMOUNT_OUT_OF_RANGE', 'L’importo supera i limiti consentiti.')
  return Money.fromCents(BigInt(rounded.times(100).toFixed(0)))
}
