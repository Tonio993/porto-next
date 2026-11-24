import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
vi.mock('react', async (actual) => ({
  ...(await actual<typeof import('react')>()),
  ...(await import('./support/hook-runner')),
}))
import { HookRunner, contexts, provide, deferred } from './support/hook-runner'
import { ExactNumericInput } from '../../src/renderer/src/app/ExactNumericInput'
import { NumericPreferenceProvider } from '../../src/renderer/src/api/use-numeric-preference'
import {
  italianNumericFormat as italian,
  englishNumericFormat as english,
  type NumericFormat,
  type NumericPreferenceResult,
} from '../../src/shared/contracts/numeric-preference'
import { moneyInput } from '../../src/renderer/src/api/numeric-input'

const mounted: HookRunner<unknown>[] = []
function mount<T>(fn: () => T) {
  const r = new HookRunner(fn)
  mounted.push(r)
  r.flush()
  return r
}
const saved = (format: NumericFormat): NumericPreferenceResult => ({
  ok: true,
  value: format,
  source: 'saved',
  warning: null,
})
beforeEach(() => {
  vi.stubGlobal('window', {
    numericPreference: {
      get: vi.fn(async () => saved(italian)),
      set: vi.fn(async () => saved(english)),
    },
  })
})
afterEach(() => {
  mounted
    .splice(0)
    .reverse()
    .forEach((r) => r.unmount())
  contexts.clear()
  vi.unstubAllGlobals()
})

function input(format?: NumericFormat, start = '', integer = false) {
  let canonical = start
  const listeners = new Map<string, (e: InputEvent) => void>()
  const element = {
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
    selectionDirection: 'none',
    addEventListener: (name: string, fn: (e: InputEvent) => void) => listeners.set(name, fn),
    removeEventListener: (name: string) => listeners.delete(name),
    setSelectionRange: (start: number, end: number, direction = 'none') => {
      element.selectionStart = start
      element.selectionEnd = end
      element.selectionDirection = direction
    },
  }
  const r = mount(() =>
    ExactNumericInput({
      value: canonical,
      format,
      unit: integer ? undefined : 'EUR',
      integer,
      onChange: (e) => {
        canonical = e.currentTarget.value
        r.dirty = true
      },
    }),
  )
  r.value.props.ref(element)
  r.dirty = true
  r.flush()
  const render = () => {
    r.flush()
    element.value = r.value.props.value
  }
  render()
  const before = (type: string, data: string | null = null) => {
    const preventDefault = vi.fn()
    listeners.get('beforeinput')!({
      inputType: type,
      data,
      preventDefault,
      isComposing: false,
    } as unknown as InputEvent)
    render()
    return preventDefault
  }
  return { r, element, before, render, text: () => canonical }
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join('')
  if (node && typeof node === 'object' && 'props' in node)
    return text((node as ReactElement<{ children?: ReactNode }>).props.children)
  return typeof node === 'string' || typeof node === 'number' ? String(node) : ''
}
it.each([italian, english])(
  'campo reale: digitazione, selezione, cancellazione vicino ai separatori, undo/redo e unità %j',
  (format) => {
    const field = input(format, '100')
    field.element.setSelectionRange(3, 3)
    expect(field.before('insertText', '0')).toHaveBeenCalled()
    expect(field.element.value).toBe(`1${format.groupSeparator}000`)
    expect(field.element.selectionStart).toBe(5)
    field.element.setSelectionRange(2, 2)
    field.before('deleteContentBackward')
    expect(field.text()).toBe('000')
    expect(field.element.selectionStart).toBe(0)
    field.before('historyUndo')
    expect(field.text()).toBe('1000')
    expect(field.element.selectionStart).toBe(2)
    field.before('historyRedo')
    expect(field.text()).toBe('000')
    field.element.setSelectionRange(0, 3)
    field.before('insertText', '12')
    field.before('insertText', format.decimalSeparator)
    expect(field.text()).toBe('12.')
    expect(moneyInput(field.text())).toBeNull()
    expect(field.r.value.props.rightSection.props.children).toBe('EUR')
    expect(field.r.value.props.value).not.toContain('EUR')
    expect(field.r.value.props.inputMode).toBe('decimal')
  },
)
it('campo reale: incolla valida e invalida, taglio, selezione nel mezzo e intero senza unità', () => {
  const field = input(italian, '1234', true)
  expect(field.r.value.props.rightSection).toBeUndefined()
  expect(field.r.value.props.inputMode).toBe('numeric')
  field.element.setSelectionRange(0, 5)
  const paste = (value: string) =>
    field.r.value.props.onPaste({
      preventDefault: vi.fn(),
      clipboardData: { getData: () => value },
    })
  paste('1.234')
  field.render()
  expect(field.text()).toBe('1234')
  paste('12.34')
  field.render()
  expect(field.text()).toBe('1234')
  expect(field.r.value.props.error).toContain('formato della bozza')
  field.element.setSelectionRange(2, 4)
  const copied = vi.fn()
  field.r.value.props.onCut({ preventDefault: vi.fn(), clipboardData: { setData: copied } })
  field.render()
  expect(copied).toHaveBeenCalledWith('text/plain', '23')
  expect(field.text()).toBe('14')
})
it('composizione: testo provvisorio separato, commit unico e undo/redo; rifiuto esplicito di composizione invalida', () => {
  const field = input(english, '100')
  field.element.setSelectionRange(3, 3)
  field.r.value.props.onCompositionStart()
  field.render()
  field.r.value.props.onChange({ currentTarget: { value: '1000' } })
  field.render()
  expect(field.text()).toBe('100')
  expect(field.r.value.props.value).toBe('1000')
  field.r.value.props.onCompositionEnd({
    currentTarget: { value: '1000', selectionStart: 4, selectionEnd: 4 },
  })
  field.render()
  expect(field.text()).toBe('1000')
  expect(field.element.selectionStart).toBe(5)
  field.before('historyUndo')
  expect(field.text()).toBe('100')
  field.before('historyRedo')
  expect(field.text()).toBe('1000')
  field.r.value.props.onCompositionStart()
  field.render()
  field.r.value.props.onCompositionEnd({
    currentTarget: { value: '1e3', selectionStart: 3, selectionEnd: 3 },
  })
  field.render()
  expect(field.text()).toBe('1000')
  expect(field.r.value.props.error).toContain('formato della bozza')
})
it.each(['1234.50', '1234.', ''])(
  'caricamento asincrono e cambio preferenza non reinterpretano la bozza %s, anche rimontata',
  async (start) => {
    const pending = deferred<NumericPreferenceResult>()
    vi.mocked(window.numericPreference.get).mockReturnValue(pending.promise)
    const provider = mount(() => NumericPreferenceProvider({ children: null }))
    provide(provider.value)
    const field = input(undefined, start)
    const captured = { ...provider.value.props.value.format }
    pending.resolve(saved(english))
    await provider.until((v) => v.props.value.loading === false)
    provide(provider.value)
    field.r.dirty = true
    field.render()
    expect(field.text()).toBe(start)
    expect(text(field.r.value.props.description)).toContain('preferenza precedente')
    if (start) expect(field.r.value.props.value).toContain(',')
    field.r.unmount()
    const resumed = input(captured, start)
    expect(resumed.text()).toBe(start)
    expect(text(resumed.r.value.props.description)).toContain('preferenza precedente')
    const next = input(undefined, '1234.50')
    expect(next.r.value.props.value).toBe('1,234.50')
  },
)
it('provider aggiorna solo dopo persistenza riuscita, espone errori e ignora letture dopo smontaggio', async () => {
  const r = mount(() => NumericPreferenceProvider({ children: null }))
  await r.until((v) => !v.props.value.loading)
  vi.mocked(window.numericPreference.set).mockResolvedValue({
    ok: false,
    error: { code: 'PREFERENCE_WRITE_FAILED', message: 'Scrittura fallita' },
  })
  await r.value.props.value.save(english)
  r.flush()
  expect(r.value.props.value.format).toEqual(italian)
  expect(r.value.props.value.message).toBe('Scrittura fallita')
  vi.mocked(window.numericPreference.set).mockRejectedValue(Error('transport'))
  await r.value.props.value.save(english)
  r.flush()
  expect(r.value.props.value.format).toEqual(italian)
  vi.mocked(window.numericPreference.set).mockResolvedValue(saved(english))
  await r.value.props.value.save(english)
  r.flush()
  expect(r.value.props.value.format).toEqual(english)
  const pending = deferred<NumericPreferenceResult>()
  vi.mocked(window.numericPreference.get).mockReturnValue(pending.promise)
  const unmounted = mount(() => NumericPreferenceProvider({ children: null }))
  unmounted.unmount()
  pending.resolve(saved(english))
  await Promise.resolve()
  expect(unmounted.value.props.value.format).toEqual(italian)
})
it('provider serializza i salvataggi anche nello stesso evento e ignora un esito tardivo dopo smontaggio', async () => {
  const pending = deferred<NumericPreferenceResult>()
  const r = mount(() => NumericPreferenceProvider({ children: null }))
  await r.until((v) => !v.props.value.loading)
  vi.mocked(window.numericPreference.set).mockReturnValue(pending.promise)
  const first = r.value.props.value.save(english)
  await r.value.props.value.save({ ...italian, grouping: false })
  expect(window.numericPreference.set).toHaveBeenCalledOnce()
  r.unmount()
  pending.resolve(saved(english))
  await first
  expect(r.value.props.value.format).toEqual(italian)
})
