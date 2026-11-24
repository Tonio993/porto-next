import { describe, expect, it, vi } from 'vitest'
vi.mock('react', async (actual) => ({
  ...(await actual<typeof import('react')>()),
  ...(await import('./support/hook-runner')),
}))
import {
  englishNumericFormat as en,
  italianNumericFormat as itFormat,
} from '../../src/shared/contracts/numeric-preference'
import {
  decimalInput,
  moneyInput,
  integerInput,
  formatNumeric,
  formatMoney,
  parseLocalizedEditing,
  replaceNumericSelection,
  NumericEditHistory,
} from '../../src/renderer/src/api/numeric-input'
import {
  vesselForm,
  vesselFormInput,
  VesselFields,
} from '../../src/renderer/src/app/vessels/VesselFields'
import {
  copyDraft,
  readConfigurations,
  ConfigurationFields,
} from '../../src/renderer/src/app/tariffs/ConfigurationFields'
import { displayPreviewValue } from '../../src/renderer/src/app/ports/PortConfirmation'
import { HookRunner } from './support/hook-runner'
import type { ReactElement } from 'react'

describe.each([itFormat, en, { ...itFormat, grouping: false }, { ...en, grouping: false }])(
  'grammatica esplicita %j',
  (format) => {
    it('round-trip importo int64, fattore 256 cifre e intero massimo, senza unità nel testo/DTO', () => {
      const money = '92233720368547758.07',
        factor = `0.${'1'.repeat(255)}`,
        integer = '9007199254740991'
      expect(moneyInput(parseLocalizedEditing(formatNumeric(money, format), format)!)).toBe(money)
      expect(decimalInput(parseLocalizedEditing(formatNumeric(factor, format), format)!)).toBe(
        factor,
      )
      expect(
        integerInput(parseLocalizedEditing(formatNumeric(integer, format), format, true)!),
      ).toBe(9007199254740991)
      expect(formatMoney(money, format)).toBe(`${formatNumeric(money, format)} €`)
      expect(parseLocalizedEditing(`${formatNumeric(money, format)} EUR`, format)).toBeNull()
    })
    it('vuoto, incompleti, zeri e frazioni rimangono testo distinto dal canonico valido', () => {
      for (const text of ['', '0', '0000', '1.', '0001.200', '0.00'])
        expect(parseLocalizedEditing(formatNumeric(text, format), format)).toBe(text)
      expect(decimalInput('1.')).toBeNull()
      expect(moneyInput('')).toBeNull()
      expect(decimalInput('0001.200')).toBe('1.2')
      expect(moneyInput('0001.2')).toBe('1.20')
    })
    it('digitazione 100 ↔ 1000, cancellazione ai gruppi e cursore nel mezzo', () => {
      const insert = replaceNumericSelection('100', { start: 3, end: 3 }, '0', format)!
      expect(insert.text).toBe('1000')
      expect(formatNumeric(insert.text, format)).toBe(
        format.grouping ? `1${format.groupSeparator}000` : '1000',
      )
      expect(
        replaceNumericSelection(insert.text, insert.selection, '', format, false, 'backward')!.text,
      ).toBe('100')
      const middle = replaceNumericSelection(
        '1234',
        { start: format.grouping ? 3 : 2, end: format.grouping ? 3 : 2 },
        '9',
        format,
      )!
      expect(middle.text).toBe('12934')
      expect(middle.selection.start).toBe(format.grouping ? 4 : 3)
      const group = replaceNumericSelection(
        '1234',
        { start: format.grouping ? 2 : 1, end: format.grouping ? 2 : 1 },
        '',
        format,
        false,
        'backward',
      )!
      expect(group.text).toBe('234')
      expect(group.selection.start).toBe(0)
      if (format.grouping) {
        expect(
          replaceNumericSelection('1234', { start: 1, end: 2 }, '', format, false, 'forward')?.text,
        ).toBe('1234')
      }
      const selection = replaceNumericSelection(
        '1234',
        { start: 0, end: formatNumeric('1234', format).length },
        `56${format.decimalSeparator}70`,
        format,
      )!
      expect(selection.text).toBe('56.70')
    })
    it('incolla rispetta la struttura, respinge esponenti e segni senza autodetection', () => {
      for (const invalid of [
        '1e3',
        '-1',
        '+2',
        'NaN',
        '1 000',
        '12EUR',
        '1,,2',
        '1..2',
        `${format.groupSeparator}123`,
        `1${format.groupSeparator}23`,
      ])
        expect(parseLocalizedEditing(invalid, format, true)).toBeNull()
      expect(parseLocalizedEditing(`1${format.groupSeparator}234`, format)).toBe(
        format.grouping ? '1234' : null,
      )
      expect(parseLocalizedEditing(`1${format.decimalSeparator}234`, format)).toBe('1.234')
    })
  },
)
it('limiti applicati prima della normalizzazione e conversione, senza troncamenti o scala globale', () => {
  expect(moneyInput('92233720368547758.07')).toBe('92233720368547758.07')
  for (const text of ['92233720368547758.08', '1.001', '1.000', '0.000', '-1', '1e2'])
    expect(moneyInput(text)).toBeNull()
  expect(decimalInput('1'.repeat(256))).toBe('1'.repeat(256))
  expect(decimalInput('0'.repeat(257))).toBeNull()
  expect(decimalInput(`0.${'0'.repeat(254)}1`)).not.toBeNull()
  expect(decimalInput(`0.${'0'.repeat(255)}1`)).toBeNull()
  expect(integerInput('9007199254740992')).toBeNull()
  expect(integerInput('1.0')).toBeNull()
})
it('undo/redo conserva testo incompleto e selezione; un nuovo ramo elimina redo', () => {
  const history = new NumericEditHistory()
  const first = { text: '100', selection: { start: 1, end: 2, direction: 'backward' as const } }
  const second = { text: '1000.', selection: { start: 6, end: 6 } }
  history.push(first)
  expect(history.undo(second)).toEqual(first)
  expect(history.redo(first)).toEqual(second)
  expect(history.undo(second)).toEqual(first)
  history.push(first)
  expect(history.redo(first)).toBeUndefined()
})
it.each([itFormat, en])(
  'adattatore nave: dimensione limitata, IMO non localizzato e formato della bozza fuori dal DTO %j',
  (format) => {
    const dto = {
      registeredName: 'Nave',
      imoNumber: '1.234',
      vesselTypeId: 'STANDARD' as const,
      size: 9007199254740991,
    }
    const form = vesselForm(dto, format)
    expect(form.numericFormat).toEqual(format)
    expect(vesselFormInput(form)).toEqual(dto)
    expect(vesselFormInput({ ...form, size: '9007199254740992' })).toBeNull()
    const fields = VesselFields({ value: form, onChange: vi.fn(), fields: {}, disabled: false })
    const children = (fields.props as { children: ReactElement[] }).children
    const size = children.find((e) => (e.props as { label: string }).label === 'Dimensione')!
    expect(size.props).toMatchObject({ integer: true, value: String(dto.size), format })
    expect(size.props).not.toHaveProperty('unit')
  },
)
it.each([itFormat, en])('adattatore tariffa: copia → campi reali → DTO esatti %j', (format) => {
  const dto = ['STANDARD', 'PASSENGER', 'ADM'].map((vesselTypeId) => ({
    vesselTypeId: vesselTypeId as 'STANDARD',
    extraWidth: 9007199254740991,
    extraValue: '1.123456789',
    brackets: [{ upperLimit: 1000, value: '9'.repeat(256) }],
  }))
  const draft = copyDraft(dto, format)
  expect(readConfigurations(draft)).toEqual(dto)
  expect(draft.every((d) => d.numericFormat?.decimalSeparator === format.decimalSeparator)).toBe(
    true,
  )
  const r = new HookRunner(() =>
    ConfigurationFields({ value: draft, onChange: vi.fn(), disabled: false }),
  )
  expect(r.flush()).toBeTruthy()
  r.unmount()
  draft[0].extraValue += '0'.repeat(256)
  expect(() => readConfigurations(draft)).toThrow(/256/)
  draft[0].extraValue = '1'
  draft[0].extraWidth = '9007199254740992'
  expect(() => readConfigurations(draft)).toThrow(/9007199254740991/)
})
it('anteprime: formatta solo campi numerici conosciuti, preserva IMO, UUID, descrizioni e oggetti opachi', () => {
  expect(displayPreviewValue('weight', '1234.567', itFormat)).toBe('1.234,567')
  expect(displayPreviewValue('base', '1234.50', en)).toBe('1,234.50')
  for (const field of ['imoNumber', 'description', 'vesselVersionId', 'calculation', 'steps'])
    expect(displayPreviewValue(field, '1234.50', itFormat)).toBe('1234.50')
})
