import type { DecimalText, MoneyText } from '../../../shared/contracts/values'
import type { NumericFormat } from '../../../shared/contracts/numeric-preference'

/** Canonical editing text only. Localized text goes through parseLocalizedEditing. */
export function decimalInput(raw: string): DecimalText | null {
  const value = raw.trim()
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(value) || value.replace('.', '').length > 256) return null
  const [integer, fraction = ''] = value.split('.')
  const whole = integer.replace(/^0+(?=[0-9])/, '')
  const tail = fraction.replace(/0+$/, '')
  return tail ? `${whole}.${tail}` : whole
}
export function moneyInput(raw: string): MoneyText | null {
  const value = raw.trim()
  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(value)) return null
  const [integer, fraction = ''] = value.split('.')
  const whole = integer.replace(/^0+(?=[0-9])/, '')
  if (whole.length > 17 || BigInt(`${whole}${fraction.padEnd(2, '0')}`) > 9223372036854775807n)
    return null
  return `${whole}.${fraction.padEnd(2, '0')}`
}
export function integerInput(raw: string): number | null {
  if (!/^[0-9]+$/.test(raw)) return null
  const whole = raw.replace(/^0+(?=[0-9])/, '')
  if (whole.length > 16 || BigInt(whole) > 9007199254740991n) return null
  return Number(whole)
}
export function formatNumeric(value: string | number, format: NumericFormat): string {
  const [whole, fraction] = String(value).split('.')
  const grouped = format.grouping
    ? whole.replace(/\B(?=(?:[0-9]{3})+(?![0-9]))/g, format.groupSeparator)
    : whole
  return fraction === undefined ? grouped : `${grouped}${format.decimalSeparator}${fraction}`
}
export function formatMoney(value: MoneyText, format: NumericFormat): string {
  return `${formatNumeric(value, format)} €`
}
/** Empty and trailing decimal separator are editing states, never valid DTOs. */
export function parseLocalizedEditing(
  text: string,
  format: NumericFormat,
  integer = false,
): string | null {
  if (text === '') return ''
  if (/[^0-9.,]/.test(text)) return null
  const parts = text.split(format.decimalSeparator)
  if (parts.length > 2 || (integer && parts.length > 1)) return null
  const [whole, fraction] = parts
  if (fraction !== undefined && !/^[0-9]*$/.test(fraction)) return null
  if (whole.includes(format.groupSeparator)) {
    if (!format.grouping) return null
    const groups = whole.split(format.groupSeparator)
    if (!/^[0-9]{1,3}$/.test(groups[0]) || groups.slice(1).some((g) => !/^[0-9]{3}$/.test(g)))
      return null
  } else if (!/^[0-9]+$/.test(whole)) return null
  const digits = whole.split(format.groupSeparator).join('')
  return fraction === undefined ? digits : `${digits}.${fraction}`
}
export interface NumericSelection {
  start: number
  end: number
  direction?: 'forward' | 'backward' | 'none'
}
export interface NumericEdit {
  text: string
  selection: NumericSelection
}
export const numericLogicalOffset = (text: string, offset: number, f: NumericFormat) =>
  text.slice(0, offset).split(f.groupSeparator).join('').length
export function numericVisualOffset(text: string, offset: number, f: NumericFormat) {
  let index = 0,
    count = 0
  while (index < text.length && count < offset) {
    if (text[index] !== f.groupSeparator) count++
    index++
  }
  return index
}
/** beforeinput supplies the selection and replacement; grouping is regenerated exactly. */
export function replaceNumericSelection(
  value: string,
  selection: NumericSelection,
  replacement: string,
  format: NumericFormat,
  integer = false,
  deletion?: 'backward' | 'forward',
): NumericEdit | null {
  const display = formatNumeric(value, format)
  let start = numericLogicalOffset(display, selection.start, format),
    end = numericLogicalOffset(display, selection.end, format)
  if (deletion && start === end && selection.start === selection.end) {
    if (deletion === 'backward') start = Math.max(0, start - 1)
    else end = Math.min(value.length, end + 1)
  }
  const inserted = replacement === '' ? '' : parseLocalizedEditing(replacement, format, integer)
  const fragment = replacement === format.decimalSeparator && !integer ? '.' : inserted
  if (fragment === null) return null
  const next = value.slice(0, start) + fragment + value.slice(end)
  if (next !== '' && !(integer ? /^[0-9]+$/ : /^[0-9]+(?:\.[0-9]*)?$/).test(next)) return null
  const caret = numericVisualOffset(formatNumeric(next, format), start + fragment.length, format)
  return { text: next, selection: { start: caret, end: caret, direction: 'none' } }
}
/** Controlled regrouping uses explicit history, independent of the browser undo stack. */
export class NumericEditHistory {
  private past: NumericEdit[] = []
  private future: NumericEdit[] = []
  push(before: NumericEdit) {
    this.past.push(before)
    this.future = []
  }
  undo(current: NumericEdit) {
    const previous = this.past.pop()
    if (previous) this.future.push(current)
    return previous
  }
  redo(current: NumericEdit) {
    const next = this.future.pop()
    if (next) this.past.push(current)
    return next
  }
}
