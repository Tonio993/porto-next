import type { DecimalText, MoneyText } from '../../../shared/contracts/values'

/** Text only: never pass financial input through a binary floating point number. */
export function decimalInput(raw: string): DecimalText | null {
  const value = raw.trim().replace(',', '.')
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(value)) return null
  const [integer, fraction = ''] = value.split('.')
  const whole = integer.replace(/^0+(?=[0-9])/, '')
  const tail = fraction.replace(/0+$/, '')
  return tail ? `${whole}.${tail}` : whole
}

export function moneyInput(raw: string): MoneyText | null {
  const value = raw.trim().replace(',', '.')
  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(value)) return null
  const [integer, fraction = ''] = value.split('.')
  return `${integer.replace(/^0+(?=[0-9])/, '')}.${fraction.padEnd(2, '0')}`
}

export function formatMoney(value: MoneyText): string {
  const [whole, fraction] = value.split('.')
  return `${whole.replace(/\B(?=(?:[0-9]{3})+(?![0-9]))/g, '.')},${fraction} €`
}
