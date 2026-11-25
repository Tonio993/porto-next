import { ServiceFilters } from '../../src/renderer/src/app/services/ServiceFilters'
import { CatalogPicker } from '../../src/renderer/src/app/services/CatalogPicker'
import { SubjectPicker } from '../../src/renderer/src/app/operations/SubjectPicker'
import { BerthPicker } from '../../src/renderer/src/app/operations/BerthPicker'
import { VesselPicker } from '../../src/renderer/src/app/operations/VesselPicker'
import { PortPicker } from '../../src/renderer/src/app/tariffs/PortPicker'
import { WeightHistory } from '../../src/renderer/src/app/weights/WeightHistory'
import type { ArchiveState } from '../../src/shared/contracts/archive'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import * as harness from './support/hook-runner'
vi.mock('react', async (importActual) => ({
  ...(await importActual<typeof import('react')>()),
  ...(await import('./support/hook-runner')),
}))
import {
  ConsultationWorkspace,
  useConsultationState,
  useConsultationPicker,
} from '../../src/renderer/src/api/use-consultation-state'
import { ConsultationStore } from '../../src/renderer/src/api/consultation-state'
import { DraftProtection } from '../../src/renderer/src/app/DraftProtection'
import type { DraftGuard } from '../../src/renderer/src/api/draft-guard'
import type { ApplicationResult, ArchiveContextDto } from '../../src/shared/contracts/application'
import { App } from '../../src/renderer/src/app/App'
import type { useArchives } from '../../src/renderer/src/api/use-archives'
import { useAgencies } from '../../src/renderer/src/api/use-agencies'
import { useCustomers } from '../../src/renderer/src/api/use-customers'
import { usePorts } from '../../src/renderer/src/api/use-ports'
import { useVessels } from '../../src/renderer/src/api/use-vessels'
import { useBerths } from '../../src/renderer/src/api/use-berths'
import { Operations } from '../../src/renderer/src/app/operations/Operations'
import { Services } from '../../src/renderer/src/app/services/Services'
import { Tariffs } from '../../src/renderer/src/app/tariffs/Tariffs'
import { Catalog } from '../../src/renderer/src/app/Catalog'
import { MasterDataPage } from '../../src/renderer/src/app/MasterDataPage'
import { CatalogPage } from '../../src/renderer/src/app/CatalogPage'
import { useServiceFilterReferences } from '../../src/renderer/src/api/use-service-filter-references'
import { HookRunner, deferred } from './support/hook-runner'

const mounted: HookRunner<unknown>[] = []
function mount<T>(fn: () => T) {
  const r = new HookRunner(fn)
  mounted.push(r)
  r.flush()
  return r
}
let context: ArchiveContextDto, store: ConsultationStore, guard: DraftGuard
let stable: Pick<
  ReturnType<typeof useArchives>,
  'setError' | 'setNotice' | 'execute' | 'update' | 'run'
>
const ok = <T,>(value: T): ApplicationResult<T> => ({ ok: true, context: { ...context }, value })
const missing = (): ApplicationResult<never> => ({
  ok: false,
  context: { ...context },
  error: { code: 'NOT_FOUND', message: 'Assente', fields: [], conflicts: [] },
})
const page = <T,>(items: T[] = [], total = items.length, number = 1, pageSize = 25) => ({
  items,
  total,
  page: number,
  pageSize,
})
function archives() {
  return {
    state: { context, active: {} },
    busy: false,
    commandBusy: false,
    ...stable,
  } as unknown as ReturnType<typeof useArchives>
}
function workspace() {
  const provider = mount(() => ConsultationWorkspace({ children: null }))
  harness.provide(provider.value)
  store = provider.value.props.value as ConsultationStore
  const protection = mount(() => DraftProtection({ children: null }))
  harness.provide(protection.value)
  guard = protection.value.props.value as DraftGuard
}
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const e = node as ReactElement<Record<string, unknown>>
  return [e, ...elements(e.props.children as ReactNode)]
}
function find(node: ReactNode, predicate: (props: Record<string, unknown>) => boolean) {
  const found = elements(node).find((e) => predicate(e.props))
  if (!found) throw Error('Elemento atteso assente')
  return found.props
}
function click(node: ReactNode, text: string) {
  const p = find(node, (p) => p.children === text)
  ;(p.onClick as () => void)()
}
function api() {
  return {
    list: vi.fn(async () => ok(page())),
    history: vi.fn(async () => missing()),
    get: vi.fn(async () => missing()),
  }
}
beforeEach(() => {
  context = { sessionId: 'session-1', archiveId: 'archive', revision: '4' }
  stable = {
    setError: vi.fn(),
    setNotice: vi.fn(),
    execute: vi.fn(async (fn: () => Promise<unknown>) => fn()),
    update: vi.fn(),
    run: vi.fn(),
  } as unknown as typeof stable
  vi.stubGlobal('window', {
    agencies: api(),
    customers: api(),
    ports: api(),
    berths: api(),
    vessels: api(),
    catalog: { ...api(), fixedWeights: vi.fn(async () => ok([])) },
    operations: { ...api(), stays: vi.fn(async () => ok(page())) },
    services: api(),
    tariffs: api(),
    time: { getCompanyZone: vi.fn(async () => ok({ zoneId: 'Europe/Rome', confirmed: true })) },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    clearTimeout,
    setTimeout,
  })
  vi.stubGlobal('document', { activeElement: null })
  vi.stubGlobal('HTMLElement', class {})
  workspace()
})
afterEach(() => {
  mounted
    .splice(0)
    .reverse()
    .forEach((r) => r.unmount())
  harness.contexts.clear()
  vi.unstubAllGlobals()
})

describe('PR03 — consultazione del workspace', () => {
  it.each([
    'ports',
    'customers',
    'agencies',
    'vessels',
    'berths',
    'portHistory',
    'customerHistory',
    'agencyHistory',
    'vesselHistory',
    'berthHistory',
    'catalog',
    'weights',
    'operations',
    'services',
    'tariffs',
    'operationVessels',
    'serviceVessels',
    'tariffPorts',
  ] as const)('ripristina %s dopo smontaggio senza riscrivere i valori iniziali', (section) => {
    // Every production section is exercised, including independent fields and owner namespaces.
    const r = mount(() => useConsultationState(section, 'page', 'owner'))
    const set = r.value[1] as (n: number) => void
    set(3)
    r.flush()
    expect(r.value[0]).toBe(3)
    r.unmount()
    const restored = mount(() => useConsultationState(section, 'page', 'owner'))
    expect(restored.value[0]).toBe(3)
    set(99)
    expect(restored.flush()[0]).toBe(3)
  })
  it('isola campi, sezioni, proprietari e setter superati senza cleanup che sovrascriva il ripristino', () => {
    let owner = 'nave-A'
    const r = mount(() => ({
      page: useConsultationState('operations', 'page', owner),
      selected: useConsultationState('operations', 'selection', owner),
      view: useConsultationState('operations', 'view', owner),
    }))
    r.value.page[1](5)
    r.value.selected[1]('id-A')
    r.value.view[1]('stays')
    r.flush()
    const old = r.value.page[1]
    owner = 'nave-B'
    r.dirty = true
    r.flush()
    expect([r.value.page[0], r.value.selected[0], r.value.view[0]]).toEqual([1, null, 'operations'])
    old(20)
    r.value.page[1](2)
    r.flush()
    owner = 'nave-A'
    r.dirty = true
    r.flush()
    expect([r.value.page[0], r.value.selected[0], r.value.view[0]]).toEqual([5, 'id-A', 'stays'])
    expect(store.read('services', owner, 'page')).toBe(1)
  })
  it('backup e dialogo annullato conservano; la nuova sessione anche dello stesso archivio ricrea il contenitore', () => {
    const r = mount(() => useConsultationState('ports', 'search'))
    r.value[1]('Genova')
    r.flush()
    const same = mount(() => useConsultationState('ports', 'search'))
    expect(same.value[0]).toBe('Genova')
    const old = r.value[1]
    mounted.forEach((r) => r.unmount())
    context = { ...context, sessionId: 'session-2' }
    workspace()
    const reopened = mount(() => useConsultationState('ports', 'search'))
    old('tardivo')
    expect(reopened.flush()[0]).toBe('')
    expect(context.archiveId).toBe('archive')
  })
})

for (const [name, hook] of [
  ['agencies', useAgencies],
  ['customers', useCustomers],
  ['vessels', useVessels],
] as const) {
  it(
    'PR03 adattatore ' +
      name +
      ': ricerca, pagina, selezione e cronologia ripristinate; GET indipendente dal filtro, revisione e NOT_FOUND',
    async () => {
      const api = window[name]
      const entity = { id: 'chosen', nextTransitionAt: null }
      vi.mocked(api.history).mockImplementation(
        async (request) =>
          ok({
            [name === 'agencies' ? 'agency' : name === 'customers' ? 'customer' : 'vessel']: entity,
            versions: page([], 20, request.query.page, 10),
          }) as never,
      )
      vi.mocked(api.list).mockImplementation(
        async (request) =>
          ok(page([], request.query.page === 3 ? 30 : 0, request.query.page, 10)) as never,
      )
      const r = mount(() => hook(archives()))
      r.value.setSearch('non visibile')
      r.value.setPage(3)
      r.value.select('chosen')
      r.flush()
      r.value.setHistoryPage(2)
      r.flush()
      await r.until((v) => v.history?.versions.page === 2 && v.page?.page === 3)
      r.unmount()
      const restored = mount(() => hook(archives()))
      expect(restored.value.selection).toBe('chosen')
      expect(restored.value.search).toBe('non visibile')
      expect(restored.value.history).toBeUndefined()
      await restored.until((v) => v.history?.versions.page === 2)
      expect(restored.value.selection).toBe('chosen')
      context = { ...context, revision: '5' }
      vi.mocked(api.history).mockResolvedValue(missing())
      vi.mocked(api.list).mockImplementation(
        async (request) => ok(page([], 0, request.query.page, 10)) as never,
      )
      restored.dirty = true
      await restored.until((v) => v.selection === null && v.page?.page === 1)
      expect(restored.value.search).toBe('non visibile')
    },
  )
}

it('PR03 porti: ripristina cronologia per porto e corregge anche una pagina con totale zero', async () => {
  const port = { id: 'porto-A', version: {}, nextTransitionAt: null }
  vi.mocked(window.ports.history).mockImplementation(
    async (request) =>
      ok({
        port: { ...port, id: request.query.id },
        versions: page([], 50, request.query.page),
      }) as never,
  )
  vi.mocked(window.ports.list).mockImplementation(async (request) =>
    ok(page([], request.query.page > 1 ? 50 : 0, request.query.page)),
  )
  const r = mount(() => usePorts(archives()))
  r.value.setSearch('Genova')
  r.value.setPageNumber(2)
  r.value.select('porto-A')
  r.flush()
  r.value.setHistoryPage(2)
  r.flush()
  await r.until((v) => v.history?.versions.page === 2)
  r.value.select('porto-B')
  r.flush()
  await r.until((v) => v.history?.port.id === 'porto-B')
  expect(r.value.history?.versions.page).toBe(1)
  r.value.select('porto-A')
  r.flush()
  await r.until((v) => v.history?.port.id === 'porto-A')
  expect(r.value.history?.versions.page).toBe(2)
  r.unmount()
  const back = mount(() => usePorts(archives()))
  await back.until((v) => v.history?.port.id === 'porto-A')
  expect(back.value.search).toBe('Genova')
  expect(back.value.page?.page).toBe(2)
  context = { ...context, revision: '5' }
  vi.mocked(window.ports.history).mockResolvedValue(missing())
  vi.mocked(window.ports.list).mockImplementation(async (request) =>
    ok(page([], 0, request.query.page)),
  )
  context = { ...context, revision: '5' }
  back.dirty = true
  await back.until((v) => v.selection === null && v.page?.page === 1)
  expect(back.value.search).toBe('Genova')
})

it('PR03 banchine: ritorno al porto e alla banchina con pagine isolate, cleanup e risposta tardiva', async () => {
  let owner = 'porto-A'
  const late = deferred<ApplicationResult<never>>()
  vi.mocked(window.berths.history).mockImplementation(async (request) =>
    request.query.id === 'tardiva'
      ? late.promise
      : (ok({
          berth: { id: request.query.id },
          versions: page([{}], 30, request.query.page, 10),
        }) as never),
  )
  vi.mocked(window.berths.list).mockImplementation(
    async (request) => ok(page([{ nextTransitionAt: null }], 40, request.query.page, 10)) as never,
  )
  let r = mount(() => useBerths(archives(), owner))
  r.value.setPage(3)
  r.value.select('banchina-A')
  r.flush()
  r.value.setHistoryPage(2)
  r.flush()
  await r.until((v) => v.history?.versions.page === 2)
  r.unmount()
  owner = 'porto-B'
  r = mount(() => useBerths(archives(), owner))
  expect(r.value.selection).toBeNull()
  r.value.setPage(2)
  r.value.select('tardiva')
  r.flush()
  r.unmount()
  owner = 'porto-A'
  r = mount(() => useBerths(archives(), owner))
  await r.until((v) => v.history?.berth.id === 'banchina-A')
  expect(r.value.history?.versions.page).toBe(2)
  expect(r.value.page?.page).toBe(3)
  late.resolve(missing())
  await Promise.resolve()
  await Promise.resolve()
  r.flush()
  expect(r.value.selection).toBe('banchina-A')
  expect(store.read('berths', 'porto-B', 'selection')).toBe('tardiva')
})

it('PR03 agenzie: risposta tardiva dopo cambio selezione e smontaggio non cancella il nuovo contesto', async () => {
  const late = deferred<ApplicationResult<never>>()
  vi.mocked(window.agencies.history).mockImplementation(async (request) =>
    request.query.id === 'vecchia'
      ? late.promise
      : (ok({ agency: { id: request.query.id }, versions: page() }) as never),
  )
  const r = mount(() => useAgencies(archives()))
  r.value.select('vecchia')
  r.flush()
  r.value.select('nuova')
  r.flush()
  await r.until((v) => v.history?.agency.id === 'nuova')
  r.unmount()
  const back = mount(() => useAgencies(archives()))
  await back.until((v) => v.history?.agency.id === 'nuova')
  late.resolve(missing())
  await Promise.resolve()
  await Promise.resolve()
  back.flush()
  expect(back.value.selection).toBe('nuova')
  expect(back.value.history?.agency.id).toBe('nuova')
})

it.each([
  ['master', MasterDataPage, 'Clienti'],
  ['catalog', CatalogPage, 'Tariffe'],
] as const)(
  'PR03 sottosezione %s: ritorno e navigazione annullata dalla guardia',
  (field, Component, target) => {
    const protectedOwner = { state: 'DRAFT' as const, discard: vi.fn(), recover: vi.fn() }
    guard.register(protectedOwner, () => protectedOwner)
    const props = { archives: archives(), onDialogChange: vi.fn() }
    const r = mount(() => Component(props))
    click(r.value, target)
    expect(guard.pending).not.toBeNull()
    guard.cancel()
    r.flush()
    expect(store.read('navigation', null, field)).toBe(field === 'master' ? 'Porti' : 'CATALOG')
    click(r.value, target)
    guard.discard()
    r.flush()
    r.unmount()
    const back = mount(() => Component(props))
    expect(find(back.value, (p) => p.children === target)['aria-pressed']).toBe(true)
    expect(protectedOwner.discard).toHaveBeenCalledOnce()
  },
)

it('PR03 operazioni: nave, vista, selezione fuori pagina, pagine e ordine permanenze passano dai chiamanti reali', async () => {
  store.write('operationOwner', null, 'vesselId', 'nave-A')
  store.write('operations', 'nave-A', 'selection', 'op-A')
  store.write('operations', 'nave-A', 'page', 3)
  store.write('operations', 'nave-A', 'stayPage', 2)
  const op = { id: 'op-A', executionStatus: 'PERFORMED' }
  vi.mocked(window.operations.get).mockResolvedValue(ok(op) as never)
  vi.mocked(window.operations.list).mockImplementation(async (request) =>
    ok(page([], 80, request.query.page)),
  )
  vi.mocked(window.operations.stays).mockImplementation(async (request) =>
    ok(page([], 60, request.query.page)),
  )
  const props = { archives: archives(), onDialogChange: vi.fn() }
  let r = mount(() => Operations({ ...props, archives: archives() }))
  await r.until((v) =>
    elements(v).some((e) => (e.props.operation as { id: string } | undefined)?.id === 'op-A'),
  )
  click(r.value, 'Permanenze')
  r.flush()
  r.unmount()
  r = mount(() => Operations({ ...props, archives: archives() }))
  expect(find(r.value, (p) => p.children === 'Permanenze')['aria-pressed']).toBe(true)
  expect(store.read('operations', 'nave-A', 'selection')).toBe('op-A')
  expect(window.operations.stays).toHaveBeenLastCalledWith({
    context: { sessionId: context.sessionId },
    query: { vesselId: 'nave-A', page: 2, pageSize: 25 },
  })
  const picker = find(r.value, (p) => 'consultation' in p)
  ;(picker.onChange as (id: string) => void)('nave-B')
  r.flush()
  expect(store.read('operations', 'nave-A', 'page')).toBe(3)
  expect(store.read('operations', 'nave-B', 'page')).toBe(1)
  await Promise.resolve()
  ;(find(r.value, (p) => 'consultation' in p).onChange as (id: string) => void)('nave-A')
  r.flush()
  expect(find(r.value, (p) => p.children === 'Permanenze')['aria-pressed']).toBe(true)
  context = { ...context, revision: '5' }
  vi.mocked(window.operations.get).mockResolvedValue(missing())
  vi.mocked(window.operations.list).mockImplementation(async (request) =>
    ok(page([], 0, request.query.page)),
  )
  vi.mocked(window.operations.stays).mockImplementation(async (request) =>
    ok(page([], 0, request.query.page)),
  )
  r.dirty = true
  await r.until(
    () =>
      store.read('operations', 'nave-A', 'selection') === null &&
      store.read('operations', 'nave-A', 'page') === 1 &&
      store.read('operations', 'nave-A', 'stayPage') === 1,
  )
})

it('PR03 prestazioni: filtri per nave e Tutte le navi protetto dalla bozza; pagina e selezione riesaminate', async () => {
  store.write('serviceOwner', null, 'vesselId', 'nave-A')
  store.write('services', 'nave-A', 'filters', { category: 'FREE', executionStatus: 'PERFORMED' })
  store.write('services', 'nave-A', 'page', 2)
  store.write('services', 'nave-A', 'selection', { id: 'service-A' })
  const service = {
    id: 'service-A',
    description: 'Rimorchio',
    category: 'FREE',
    executionStatus: 'PERFORMED',
    moment: {},
    context: {},
  }
  vi.mocked(window.services.get).mockResolvedValue(ok(service) as never)
  vi.mocked(window.services.list).mockImplementation(async (request) =>
    ok(page([], 50, request.query.page)),
  )
  let r = mount(() => Services({ archives: archives(), onDialogChange: vi.fn() }))
  await r.until((v) => elements(v).some((e) => e.props.children === 'Rimorchio'))
  r.unmount()
  r = mount(() => Services({ archives: archives(), onDialogChange: vi.fn() }))
  expect(window.services.list).toHaveBeenLastCalledWith({
    context: { sessionId: context.sessionId },
    query: {
      vesselId: 'nave-A',
      category: 'FREE',
      executionStatus: 'PERFORMED',
      page: 2,
      pageSize: 25,
    },
  })
  click(r.value, 'Nuova prestazione libera')
  r.flush()
  await Promise.resolve()
  click(r.value, 'Tutte le navi')
  expect(guard.pending).not.toBeNull()
  guard.cancel()
  r.flush()
  expect(store.read('serviceOwner', null, 'vesselId')).toBe('nave-A')
  click(r.value, 'Tutte le navi')
  guard.discard()
  r.flush()
  expect(store.read('serviceOwner', null, 'vesselId')).toBeNull()
  await Promise.resolve()
  expect(store.read('services', 'nave-A', 'filters')).toEqual({
    category: 'FREE',
    executionStatus: 'PERFORMED',
  })
  ;(find(r.value, (p) => 'consultation' in p).onChange as (id: string) => void)('nave-A')
  r.flush()
  context = { ...context, revision: '5' }
  vi.mocked(window.services.get).mockResolvedValue(missing())
  vi.mocked(window.services.list).mockImplementation(async (request) =>
    ok(page([], 0, request.query.page)),
  )
  r.dirty = true
  await r.until(
    () =>
      store.read('services', 'nave-A', 'selection') === null &&
      store.read('services', 'nave-A', 'page') === 1,
  )
  expect(store.read('services', 'nave-A', 'filters')).toEqual({
    category: 'FREE',
    executionStatus: 'PERFORMED',
  })
})

it('PR03 tariffe: pagina e selezione per porto, ritorno e rimozione della tariffa dopo revisione', async () => {
  store.write('tariffOwner', null, 'portId', 'porto-A')
  store.write('tariffs', 'porto-A', 'page', 2)
  store.write('tariffs', 'porto-A', 'selection', 'tariff-A')
  vi.mocked(window.tariffs.list).mockImplementation(async (request) =>
    ok(page([], 50, request.query.page)),
  )
  vi.mocked(window.tariffs.get).mockResolvedValue(
    ok({
      id: 'tariff-A',
      phase: 'HISTORICAL',
      effectiveMoment: { localDateTime: '2026-01-01T12:00' },
      configurations: [],
    }) as never,
  )
  vi.mocked(window.ports.get).mockResolvedValue(ok({ id: 'porto-A', version: {} }) as never)
  let r = mount(() => Tariffs({ archives: archives(), onDialogChange: vi.fn() }))
  await r.until((v) => elements(v).some((e) => e.props.configurations !== undefined))
  r.unmount()
  r = mount(() => Tariffs({ archives: archives(), onDialogChange: vi.fn() }))
  expect(window.tariffs.list).toHaveBeenLastCalledWith({
    context: { sessionId: context.sessionId },
    query: { portId: 'porto-A', page: 2, pageSize: 25 },
  })
  ;(find(r.value, (p) => 'consultation' in p).onChange as (id: string) => void)('porto-B')
  r.flush()
  expect(store.read('tariffs', 'porto-A', 'selection')).toBe('tariff-A')
  await Promise.resolve()
  ;(find(r.value, (p) => 'consultation' in p).onChange as (id: string) => void)('porto-A')
  r.flush()
  context = { ...context, revision: '5' }
  vi.mocked(window.tariffs.get).mockResolvedValue(missing())
  vi.mocked(window.tariffs.list).mockImplementation(async (request) =>
    ok(page([], 0, request.query.page)),
  )
  r.dirty = true
  await r.until(
    () =>
      store.read('tariffs', 'porto-A', 'selection') === null &&
      store.read('tariffs', 'porto-A', 'page') === 1,
  )
})

it('PR03 catalogo: ricerca e stato non cancellano un tipo esistente fuori filtro, eliminazione e pagina vuota', async () => {
  store.write('catalog', null, 'search', 'assente')
  store.write('catalog', null, 'status', 'INACTIVE')
  store.write('catalog', null, 'page', 2)
  store.write('catalog', null, 'selection', 'type-A')
  vi.mocked(window.catalog.list).mockImplementation(async (request) =>
    ok(page([], 50, request.query.page)),
  )
  vi.mocked(window.catalog.get).mockResolvedValue(
    ok({
      id: 'type-A',
      description: 'Tipo storico',
      status: 'ACTIVE',
      initialWeight: { weight: '1' },
    }) as never,
  )
  let r = mount(() => Catalog({ archives: archives(), onDialogChange: vi.fn() }))
  await r.until((v) => elements(v).some((e) => e.props.children === 'Tipo storico'))
  r.unmount()
  r = mount(() => Catalog({ archives: archives(), onDialogChange: vi.fn() }))
  expect(store.read('catalog', null, 'selection')).toBe('type-A')
  context = { ...context, revision: '5' }
  vi.mocked(window.catalog.get).mockResolvedValue(missing())
  vi.mocked(window.catalog.list).mockImplementation(async (request) =>
    ok(page([], 0, request.query.page)),
  )
  r.dirty = true
  await r.until(
    () =>
      store.read('catalog', null, 'selection') === null &&
      store.read('catalog', null, 'page') === 1,
  )
  expect(store.read('catalog', null, 'search')).toBe('assente')
  expect(store.read('catalog', null, 'status')).toBe('INACTIVE')
})

it('PR03 riferimenti filtri prestazioni: risolve viaggio fuori pagina e rimuove soltanto riferimenti inesistenti', async () => {
  const voyage = { id: 'voyage-A', visits: [{ id: 'visit-A', stays: [{ id: 'stay-A' }] }] }
  vi.mocked(window.operations.stays).mockImplementation(
    async (request) =>
      ok(page(request.query.page === 2 ? [voyage] : [], 101, request.query.page, 100)) as never,
  )
  vi.mocked(window.customers.get).mockResolvedValue(missing())
  vi.mocked(window.agencies.get).mockImplementation(async () => ok({ id: 'agency-A' }) as never)
  const patch = vi.fn()
  let filters = {
    category: 'FREE' as const,
    customerId: 'deleted',
    agencyId: 'agency-A',
    voyageId: 'voyage-A',
    portCallId: 'visit-A',
    berthStayId: 'stay-A',
  }
  const r = mount(() => useServiceFilterReferences(context, 'vessel', filters, patch))
  await r.until((v) => v.voyage?.id === 'voyage-A')
  expect(window.operations.stays).toHaveBeenCalledTimes(2)
  expect(patch).toHaveBeenLastCalledWith({ customerId: null })
  context = { ...context, revision: '5' }
  vi.mocked(window.operations.stays).mockResolvedValue(ok(page()))
  filters = { ...filters, customerId: '' }
  r.dirty = true
  await r.until(() => patch.mock.calls.length === 2)
  expect(patch).toHaveBeenLastCalledWith({ voyageId: null, portCallId: null, berthStayId: null })
})

it('PR03 riferimenti: nessuna pulizia da risposta tardiva dopo modifica del filtro o smontaggio', async () => {
  const late = deferred<ApplicationResult<never>>()
  vi.mocked(window.customers.get).mockReturnValue(late.promise)
  const patch = vi.fn()
  let filters = { customerId: 'old' }
  const r = mount(() => useServiceFilterReferences(context, null, filters, patch))
  filters = { customerId: '' }
  r.dirty = true
  r.flush()
  r.unmount()
  late.resolve(missing())
  await Promise.resolve()
  await Promise.resolve()
  expect(patch).not.toHaveBeenCalled()
})

it.each([
  ['operationVessels', VesselPicker, 'vessels'],
  ['tariffPorts', PortPicker, 'ports'],
] as const)(
  'PR03 selettore proprietario %s: ricerca ripristinata, pagina vuota e selezionato fuori filtro, risposte invertite',
  async (section, Picker, apiName) => {
    store.write(section, null, 'search', 'filtrato')
    store.write(section, null, 'page', 2)
    let value: string | null = 'chosen'
    const missingOwner = vi.fn()
    vi.mocked(window[apiName].list).mockImplementation(
      async (request) => ok(page([], 50, request.query.page)) as never,
    )
    const old = deferred<ApplicationResult<never>>()
    vi.mocked(window[apiName].get).mockImplementation(async (request) =>
      request.query.id === 'old'
        ? old.promise
        : (ok({
            id: request.query.id,
            code: '1',
            status: 'ACTIVE',
            selectable: true,
            version: {
              name: 'Nome',
              registeredName: 'Nome',
              locality: 'Genova',
              countryCode: 'IT',
            },
          }) as never),
    )
    const render = () =>
      Picker({
        context,
        value,
        onChange: (id) => {
          value = id
        },
        onMissing: missingOwner,
        consultation: useConsultationPicker(section),
      })
    let r = mount(render)
    await r.until((v) =>
      elements(v).some(
        (e) =>
          Array.isArray(e.props.data) &&
          (e.props.data as { value: string }[]).some((o) => o.value === 'chosen'),
      ),
    )
    expect(missingOwner).not.toHaveBeenCalled()
    r.unmount()
    r = mount(render)
    expect(
      find(r.value, (p) => p.label === (apiName === 'vessels' ? 'Nave' : 'Porto')).search,
    ).toBe('filtrato')
    value = 'old'
    r.dirty = true
    r.flush()
    value = 'new'
    r.dirty = true
    r.flush()
    await r.until((v) =>
      elements(v).some(
        (e) =>
          Array.isArray(e.props.data) &&
          (e.props.data as { value: string }[]).some((o) => o.value === 'new'),
      ),
    )
    old.resolve(missing())
    await Promise.resolve()
    await Promise.resolve()
    r.flush()
    expect(missingOwner).not.toHaveBeenCalled()
    context = { ...context, revision: '5' }
    vi.mocked(window[apiName].get).mockResolvedValue(missing())
    vi.mocked(window[apiName].list).mockImplementation(
      async (request) => ok(page([], 0, request.query.page)) as never,
    )
    r.dirty = true
    await r.until(
      () => missingOwner.mock.calls.length === 1 && store.read(section, null, 'page') === 1,
    )
    expect(store.read(section, null, 'search')).toBe('filtrato')
  },
)

it('PR03 cronologia pesi: rimontaggio per sequenza e pagina oltre totale dopo revisione', async () => {
  store.write('weights', 'seq-A', 'page', 3)
  window.catalog.weightHistory = vi.fn(async (request) =>
    ok({ versions: page([], 80, request.query.page), sequenceId: request.query.sequenceId }),
  ) as never
  const props = {
    sequenceId: 'seq-A',
    label: 'Peso',
    opened: true,
    archives: archives(),
    trigger: null,
    resumeTrigger: { current: null },
    onClose: vi.fn(),
    onResume: vi.fn(),
    onUncertainChange: vi.fn(),
    onApplied: vi.fn(),
  }
  const r = mount(() => WeightHistory({ ...props, archives: archives() }))
  await r.until((v) =>
    elements(v).some((e) => (e.props.page as { page?: number } | undefined)?.page === 3),
  )
  r.unmount()
  const back = mount(() => WeightHistory({ ...props, archives: archives() }))
  expect(window.catalog.weightHistory).toHaveBeenLastCalledWith({
    context: { sessionId: context.sessionId },
    query: { sequenceId: 'seq-A', page: 3, pageSize: 25 },
  })
  expect(store.read('weights', 'seq-B', 'page')).toBe(1)
  context = { ...context, revision: '5' }
  vi.mocked(window.catalog.weightHistory).mockImplementation(
    async (request) =>
      ok({
        versions: page([], 0, request.query.page),
        sequenceId: request.query.sequenceId,
      }) as never,
  )
  back.dirty = true
  await back.until(() => store.read('weights', 'seq-A', 'page') === 1)
})

it('PR03 App/useArchives: backup e annullamenti non cambiano chiave; Salva con nome, chiusura e riapertura la cambiano con archiveId uguale', async () => {
  const state = (): ArchiveState => ({
    active: {
      id: 'archive',
      name: 'Archivio',
      path: 'original',
      schemaVersion: 17,
      createdAt: '',
      updatedAt: '',
    },
    recent: [],
    context,
  })
  let changed!: (value: ArchiveState) => void
  window.archives = {
    getState: vi.fn(async () => ({ ok: true, value: state() })),
    onChanged: (callback: (value: ArchiveState) => void) => {
      changed = callback
      return () => {}
    },
    onActionRequested: () => () => {},
    backup: vi.fn(async () => ({ ok: true, value: { path: 'backup' }, context })),
    open: vi.fn(async () => ({ ok: true, value: state() })),
    saveAs: vi.fn(async () => {
      context = { ...context, sessionId: 'session-saved' }
      return { ok: true, value: state() }
    }),
  } as unknown as typeof window.archives
  const r = mount(App)
  await r.until((v) => v.key === 'session-1')
  const getArchives = () =>
    find(r.value, (p) => 'archives' in p).archives as ReturnType<typeof useArchives>
  const key = r.value.key
  store.write('ports', null, 'search', 'Conservata')
  await getArchives().run(() => window.archives.backup())
  r.flush()
  expect(r.value.key).toBe(key)
  expect(store.read('ports', null, 'search')).toBe('Conservata')
  await getArchives().update(() => window.archives.open())
  r.flush()
  expect(r.value.key).toBe(key)
  changed(state())
  r.flush()
  expect(r.value.key).toBe(key)
  await getArchives().update(() => window.archives.saveAs())
  r.flush()
  expect(r.value.key).toBe('session-saved')
  expect(getArchives().state.context?.archiveId).toBe('archive')
  changed({ active: null, recent: [], context: null })
  r.flush()
  expect(r.value.key).toBe('closed')
  context = { ...context, sessionId: 'reopened' }
  changed(state())
  r.flush()
  expect(r.value.key).toBe('reopened')
})

it('PR03 navigazione principale: Annulla e incertezza non alterano sezione, filtri e selezione', async () => {
  // The private workspace is reached through App's actual element tree, without exporting test APIs.
  window.archives = {
    getState: vi.fn(async () => ({ ok: true, value: { active: {}, recent: [], context } })),
    onChanged: () => () => {},
    onActionRequested: () => () => {},
  } as unknown as typeof window.archives
  const app = mount(App)
  await app.until((v) => v.key === context.sessionId)
  const workspace = elements(app.value).find((e) => 'archives' in e.props)!
  const renderWorkspace = workspace.type as (props: Record<string, unknown>) => ReactNode
  const r = mount(() => renderWorkspace(workspace.props))
  click(r.value, 'Operazioni nave')
  r.flush()
  await Promise.resolve()
  store.write('operationOwner', null, 'vesselId', 'nave-A')
  const owner = { state: 'DRAFT' as 'DRAFT' | 'UNCERTAIN', discard: vi.fn(), recover: vi.fn() }
  guard.register(owner, () => owner)
  click(r.value, 'Anagrafiche')
  expect(guard.pending).not.toBeNull()
  guard.cancel()
  r.flush()
  expect(find(r.value, (p) => p.children === 'Operazioni nave')['aria-current']).toBe('page')
  owner.state = 'UNCERTAIN'
  click(r.value, 'Prestazioni')
  r.flush()
  expect(guard.blocked).toBe('UNCERTAIN')
  expect(owner.discard).not.toHaveBeenCalled()
  expect(store.read('operationOwner', null, 'vesselId')).toBe('nave-A')
  expect(find(r.value, (p) => p.children === 'Operazioni nave')['aria-current']).toBe('page')
})

it('PR03 una risposta già risolta prima del cambio selezione non elimina il nuovo intento prima del commit React', async () => {
  const late = deferred<ApplicationResult<never>>()
  vi.mocked(window.agencies.history).mockImplementation(async (request) =>
    request.query.id === 'old'
      ? late.promise
      : (ok({ agency: { id: request.query.id }, versions: page() }) as never),
  )
  const r = mount(() => useAgencies(archives()))
  r.value.select('old')
  r.flush()
  late.resolve(missing())
  await Promise.resolve()
  await Promise.resolve()
  r.value.select('new')
  // Do not render yet: the previous continuation must compare with the synchronous store.
  await Promise.resolve()
  await Promise.resolve()
  expect(store.read('agencies', null, 'selection')).toBe('new')
  await r.until((v) => v.history?.agency.id === 'new')
})

it.each([
  ['serviceCustomers', 'customers', 'customer'],
  ['serviceAgencies', 'agencies', 'agency'],
  ['serviceTypes', 'catalog', 'catalog'],
] as const)(
  'PR03 filtro %s: ricerca e pagina per nave ripristinate, ID letto fuori lista',
  async (section, apiName, kind) => {
    store.write(section, 'nave-A', 'search', 'query')
    store.write(section, 'nave-A', 'page', 3)
    vi.mocked(window[apiName].list).mockImplementation(
      async (request) => ok(page([], 100, request.query.page)) as never,
    )
    vi.mocked(window[apiName].get).mockResolvedValue(
      ok({
        id: 'chosen',
        code: '1',
        description: 'Tipo',
        status: 'ACTIVE',
        version: { businessName: 'Nome' },
        selectable: true,
      }) as never,
    )
    let owner = 'nave-A'
    const render = () => {
      const consultation = useConsultationPicker(section, owner)
      const common = {
        context,
        value: 'chosen',
        onChange: vi.fn(),
        disabled: false,
        historical: true,
        consultation,
      }
      return kind === 'catalog' ? CatalogPicker(common) : SubjectPicker({ ...common, kind })
    }
    let r = mount(render)
    await r.until((v) =>
      elements(v).some(
        (e) =>
          Array.isArray(e.props.data) &&
          (e.props.data as { value: string }[]).some((o) => o.value === 'chosen'),
      ),
    )
    const search = find(r.value, (p) => p.search === 'query')
    ;(search.onSearchChange as (text: string) => void)('edited')
    r.flush()
    await r.until((v) => elements(v).some((e) => 'onPage' in e.props))
    ;(find(r.value, (p) => 'onPage' in p).onPage as (page: number) => void)(2)
    r.flush()
    r.unmount()
    r = mount(render)
    expect(find(r.value, (p) => p.search === 'edited')).toBeDefined()
    expect(store.read(section, 'nave-A', 'page')).toBe(2)
    owner = 'nave-B'
    r.dirty = true
    r.flush()
    expect(store.read(section, 'nave-B', 'search')).toBe('')
    expect(store.read(section, 'nave-B', 'page')).toBe(1)
  },
)

it('PR03 filtro banchina: ripristino per nave/porto e dettaglio storico fuori pagina', async () => {
  const owner = JSON.stringify(['nave-A', 'porto-A'])
  store.write('serviceBerths', owner, 'page', 2)
  vi.mocked(window.berths.list).mockImplementation(async (request) =>
    ok(page([], 50, request.query.page)),
  )
  vi.mocked(window.berths.history).mockResolvedValue(
    ok({
      berth: { id: 'chosen', portId: 'porto-A', code: 1, version: { name: 'Molo fuori pagina' } },
      versions: page(),
    }) as never,
  )
  const render = () =>
    BerthPicker({
      context,
      portId: 'porto-A',
      value: 'chosen',
      onChange: vi.fn(),
      historical: true,
      disabled: false,
      consultation: useConsultationPicker('serviceBerths', owner),
    })
  const r = mount(render)
  await r.until((v) =>
    elements(v).some(
      (e) =>
        Array.isArray(e.props.data) &&
        (e.props.data as { value: string }[]).some((o) => o.value === 'chosen'),
    ),
  )
  r.unmount()
  const restored = mount(render)
  await restored.until((v) => elements(v).some((e) => 'onPage' in e.props))
  expect(find(restored.value, (p) => 'onPage' in p)).toBeDefined()
  expect(store.read('serviceBerths', owner, 'page')).toBe(2)
  expect(store.read('serviceBerths', JSON.stringify(['nave-A', 'porto-B']), 'page')).toBe(1)
  expect(window.berths.list).toHaveBeenLastCalledWith({
    context: { sessionId: context.sessionId },
    query: { portId: 'porto-A', search: '', page: 2, pageSize: 25, selectableOnly: false },
  })
})

it('PR03 filtri prestazioni: apertura e pagina viaggi persistono senza conservare i DTO', async () => {
  store.write('services', 'nave-A', 'expanded', true)
  store.write('services', 'nave-A', 'voyagePage', 2)
  vi.mocked(window.operations.stays).mockImplementation(async (request) =>
    ok(page([], 60, request.query.page)),
  )
  const props = {
    context,
    vesselId: 'nave-A',
    value: {},
    onChange: vi.fn(),
    disabled: false,
    selectedVoyage: null,
    referenceError: null,
  }
  let r = mount(() => ServiceFilters(props))
  await r.until((v) =>
    elements(v).some((e) => (e.props.page as { page: number } | undefined)?.page === 2),
  )
  r.unmount()
  r = mount(() => ServiceFilters(props))
  expect(find(r.value, (p) => p.className === 'service-filters').open).toBe(true)
  expect(window.operations.stays).toHaveBeenLastCalledWith({
    context: { sessionId: context.sessionId },
    query: { vesselId: 'nave-A', page: 2, pageSize: 25 },
  })
})

it('PR03 un errore nella rilettura di un riferimento non viene trattato come eliminazione', async () => {
  const patch = vi.fn(),
    filters = { customerId: 'customer-A', category: 'FREE' as const }
  vi.mocked(window.customers.get).mockRejectedValue(Error('trasporto'))
  const r = mount(() => useServiceFilterReferences(context, null, filters, patch))
  await r.until((v) => v.error !== null)
  expect(patch).not.toHaveBeenCalled()
  expect(filters.customerId).toBe('customer-A')
})

it('PR05 tariffe: adapter porto storico reale, scelta esplicita e richieste tariffarie per il porto confermato', async () => {
  const port = {
    id: 'historical-port',
    code: 4,
    status: 'INACTIVE',
    version: { name: 'Porto storico', locality: 'Genova', countryCode: 'IT' },
  }
  vi.mocked(window.ports.list).mockResolvedValue(ok(page([port])) as never)
  vi.mocked(window.ports.get).mockResolvedValue(ok(port) as never)
  const r = mount(() => Tariffs({ archives: archives(), onDialogChange: vi.fn() }))
  const child = mount(
    () =>
      PortPicker(find(r.value, (p) => 'consultation' in p) as Parameters<typeof PortPicker>[0])
        .props,
  )
  await child.until((p) => p.page !== null)
  expect(child.value.data[0].disabled).toBe(false)
  child.value.onSearchChange('storico')
  r.flush()
  child.dirty = true
  child.flush()
  await child.until((p) => p.page !== null)
  expect(window.tariffs.list).not.toHaveBeenCalled()
  child.value.onChange('historical-port')
  r.flush()
  await r.until(() => vi.mocked(window.tariffs.list).mock.calls.length === 1)
  expect(window.tariffs.list).toHaveBeenLastCalledWith({
    context: { sessionId: context.sessionId },
    query: { portId: 'historical-port', page: 1, pageSize: 25 },
  })
})
it('PR05 filtri prestazioni: clear porto rimuove il figlio banchina; ricerca e stato degli altri filtri restano indipendenti', async () => {
  store.write('services', 'vessel', 'expanded', true)
  let value = {
    portId: 'port-A',
    berthId: 'berth-A',
    customerId: 'customer-A',
    category: 'CATALOG' as const,
  }
  const r = mount(() =>
    ServiceFilters({
      context,
      vesselId: 'vessel',
      value,
      selectedVoyage: null,
      referenceError: null,
      disabled: false,
      onChange: (next) => {
        value = next as typeof value
        r.dirty = true
      },
    }),
  )
  const port = mount(
    () =>
      PortPicker(
        find(
          r.value,
          (p) => 'consultation' in p && p.consultation !== null && 'clearable' in p,
        ) as Parameters<typeof PortPicker>[0],
      ).props,
  )
  await port.until((p) => p.page !== null)
  expect(port.value.placeholder).toBe('Tutti i porti')
  expect(port.value.clearable).toBe(true)
  port.value.onSearchChange('porto cercato')
  r.flush()
  port.dirty = true
  port.flush()
  await port.until((p) => p.page !== null)
  expect(value.portId).toBe('port-A')
  port.value.onChange(null)
  r.flush()
  expect(value).toMatchObject({
    portId: null,
    berthId: null,
    customerId: 'customer-A',
    category: 'CATALOG',
  })
  expect(store.read('servicePorts', 'vessel', 'search')).toBe('porto cercato')
})
