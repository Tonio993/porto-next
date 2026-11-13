import type { OperationChargeDto } from '../../../shared/contracts/operations'
import { Money } from '../values/numbers'

/** Display aggregate, never stored or limited to the int64 of a single charge. */
export function operationTotal(charges: readonly OperationChargeDto[]): string {
  const cents = charges.reduce((sum, c) => sum + Money.parse(c.effectiveBase).cents, 0n)
  return String(cents / 100n) + '.' + (cents % 100n).toString().padStart(2, '0')
}
