import { afterEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
vi.mock('react', async (actual) => ({
  ...(await actual<typeof import('react')>()),
  ...(await import('./support/hook-runner')),
}))
// Only the Mantine controller is substituted: tests inspect production callbacks and markup, not a DOM.
vi.mock('@mantine/core', async (actual) => {
  const mantine = await actual<typeof import('@mantine/core')>()
  const hooks = await import('./support/hook-runner')
  return {
    ...mantine,
    useCombobox: (options: Parameters<typeof mantine.useCombobox>[0]) => {
      const [opened, setOpened] = hooks.useState(false)
      return {
        dropdownOpened: opened,
        resetSelectedOption: vi.fn(),
        openDropdown: () => setOpened(true),
        closeDropdown: () => {
          setOpened(false)
          options?.onDropdownClose?.('unknown')
        },
      } as unknown as ReturnType<typeof mantine.useCombobox>
    },
  }
})
import { Combobox, TextInput } from '@mantine/core'
import { PagedPicker, type PagedPickerProps } from '../../src/renderer/src/app/PagedPicker'
import { PageControls } from '../../src/renderer/src/app/PageControls'
import { HookRunner } from './support/hook-runner'
const mounted: HookRunner<unknown>[] = []
function mount<T>(fn: () => T) {
  const r = new HookRunner(fn)
  mounted.push(r)
  r.flush()
  return r
}
afterEach(() => {
  mounted
    .splice(0)
    .reverse()
    .forEach((r) => r.unmount())
  vi.unstubAllGlobals()
})
function nodes(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const e = node as ReactElement<Record<string, unknown>>
  return [e, ...nodes(e.props.children as ReactNode)]
}
function control(node: ReactNode, type: unknown) {
  const found = nodes(node).find((e) => e.type === type)
  if (!found) throw Error('Controllo assente')
  return found.props
}
const props = (): PagedPickerProps => ({
  label: 'Nave',
  placeholder: 'Seleziona una nave',
  value: 'chosen',
  search: 'filtro',
  chosen: { value: 'chosen', label: 'Nome fuori pagina', disabled: false },
  selectedState: 'ready',
  data: [
    { value: 'chosen', label: 'Nome fuori pagina', disabled: false },
    { value: 'disabled', label: 'Disattivata', disabled: true },
  ],
  page: { items: [], total: 26, page: 1, pageSize: 25 },
  loading: false,
  error: null,
  onChange: vi.fn(),
  onSearchChange: vi.fn(),
  onPage: vi.fn(),
  onRetry: vi.fn(),
})

it('PR05 un solo input: testo, descrizione e scelta distinti; digitazione e chiusura non confermano; submit esplicito vincolato', () => {
  const p = props()
  const r = mount(() => PagedPicker(p))
  expect(nodes(r.value).filter((e) => e.type === TextInput)).toHaveLength(1)
  expect(control(r.value, TextInput).value).toBe('Nome fuori pagina')
  ;(control(r.value, TextInput).onFocus as () => void)()
  r.flush()
  expect(control(r.value, TextInput)).toMatchObject({
    value: 'filtro',
    description: 'Scelto: Nome fuori pagina',
    disabled: false,
  })
  ;(control(r.value, TextInput).onChange as (e: { currentTarget: { value: string } }) => void)({
    currentTarget: { value: 'nuova ricerca' },
  })
  expect(p.onSearchChange).toHaveBeenCalledExactlyOnceWith('nuova ricerca')
  expect(p.onChange).not.toHaveBeenCalled()
  expect(nodes(r.value).filter((e) => e.type === Combobox.Option)).toHaveLength(2)
  vi.stubGlobal('Node', class {})
  ;(r.value.props.onBlur as (event: { relatedTarget: null }) => void)({ relatedTarget: null })
  r.flush()
  expect(p.onChange).not.toHaveBeenCalled()
  const submit = control(r.value, Combobox).onOptionSubmit as (id: string) => void
  submit('disabled')
  submit('unknown')
  expect(p.onChange).not.toHaveBeenCalled()
  submit('chosen')
  r.flush()
  expect(p.onChange).toHaveBeenCalledExactlyOnceWith('chosen')
})
it('PR05 clear esplicito, null non deriva dalla ricerca vuota e i campi obbligatori non offrono clear', () => {
  const p = { ...props(), clearable: true, clearLabel: 'Rimuovi filtro nave' }
  const r = mount(() => PagedPicker(p))
  ;(control(r.value, TextInput).onChange as (e: { currentTarget: { value: string } }) => void)({
    currentTarget: { value: '' },
  })
  expect(p.onChange).not.toHaveBeenCalled()
  const clear = control(control(r.value, TextInput).rightSection as ReactNode, Combobox.ClearButton)
  expect(clear).toMatchObject({
    'aria-label': 'Rimuovi filtro nave',
    tabIndex: 0,
    'aria-hidden': false,
  })
  ;(clear.onClear as () => void)()
  expect(p.onChange).toHaveBeenCalledExactlyOnceWith(null)
  const required = mount(() => PagedPicker({ ...props(), required: true }))
  expect(control(required.value, TextInput).required).toBe(true)
  expect(
    nodes(control(required.value, TextInput).rightSection as ReactNode).some(
      (e) => e.type === Combobox.ClearButton,
    ),
  ).toBe(false)
})
it('PR05 caricamento, vuoto, errore e selezionato fuori filtro hanno stati distinti e totale backend originale', () => {
  const p = props()
  p.loading = true
  p.page = null
  const r = mount(() => PagedPicker(p))
  expect(control(r.value, TextInput).disabled).toBe(false)
  expect(nodes(r.value).find((e) => e.props.role === 'status')?.props.children).toContain(
    'Caricamento…',
  )
  expect(nodes(r.value).some((e) => e.type === Combobox.Empty)).toBe(false)
  p.loading = false
  p.page = { items: [], total: 0, page: 1, pageSize: 25 }
  r.dirty = true
  r.flush()
  expect(control(r.value, Combobox.Empty).children).toBe('Nessun risultato')
  const status = nodes(r.value).find((e) => e.props.role === 'status')!.props.children
  expect(status).toContain('0 risultati')
  expect(status).toContain(' · Selezionato fuori dai risultati: Nome fuori pagina')
  p.error = 'Errore di comunicazione'
  r.dirty = true
  r.flush()
  expect(nodes(r.value).some((e) => e.type === Combobox.Empty)).toBe(false)
  const retry = nodes(r.value).find((e) => e.props.children === 'Riprova')!.props
  ;(retry.onClick as () => void)()
  expect(p.onRetry).toHaveBeenCalledOnce()
})
it.each(['missing', 'error', 'loading'] as const)(
  'PR05 selezionato %s: nessun UUID esposto come descrizione',
  (selectedState) => {
    const r = mount(() => PagedPicker({ ...props(), chosen: null, selectedState }))
    expect(control(r.value, TextInput).value).not.toBe('chosen')
    expect(control(r.value, TextInput).value).toMatch(/riferimento|Caricamento/)
  },
)
it('PR05 paginazione nel footer fuori dal listbox; il callback conserva la scelta', () => {
  const p = props()
  const r = mount(() => PagedPicker(p))
  const footer = control(r.value, Combobox.Footer)
  const paging = control(footer.children as ReactNode, PageControls)
  expect(paging.page).toBe(p.page)
  ;(paging.onPage as (n: number) => void)(2)
  expect(p.onPage).toHaveBeenCalledExactlyOnceWith(2)
  expect(p.onChange).not.toHaveBeenCalled()
  expect(
    nodes(control(r.value, Combobox.Options).children as ReactNode).some(
      (e) => e.type === PageControls,
    ),
  ).toBe(false)
})
