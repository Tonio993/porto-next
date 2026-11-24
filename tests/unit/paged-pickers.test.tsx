import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
vi.mock('react', async (actual) => ({
  ...(await actual<typeof import('react')>()),
  ...(await import('./support/hook-runner')),
}))
import { HookRunner, contexts, provide, deferred } from './support/hook-runner'
import {
  ConsultationWorkspace,
  useConsultationPicker,
} from '../../src/renderer/src/api/use-consultation-state'
import type { ConsultationStore } from '../../src/renderer/src/api/consultation-state'
import type {
  ApplicationResult,
  ApplicationErrorCode,
  ArchiveContextDto,
} from '../../src/shared/contracts/application'
import type { PagedPickerProps } from '../../src/renderer/src/app/PagedPicker'
import { VesselPicker } from '../../src/renderer/src/app/operations/VesselPicker'
import { PortPicker } from '../../src/renderer/src/app/tariffs/PortPicker'
import { SubjectPicker } from '../../src/renderer/src/app/operations/SubjectPicker'
import { BerthPicker } from '../../src/renderer/src/app/operations/BerthPicker'
import { CatalogPicker } from '../../src/renderer/src/app/services/CatalogPicker'

const kinds = ['vessels', 'ports', 'customers', 'agencies', 'catalog', 'berths'] as const
type Kind = (typeof kinds)[number]
let context: ArchiveContextDto, store: ConsultationStore
const mounted: HookRunner<unknown>[] = []
function mount<T>(fn: () => T) {
  const r = new HookRunner(fn)
  mounted.push(r)
  r.flush()
  return r
}
const ok = <T,>(value: T): ApplicationResult<T> => ({ ok: true, value, context: { ...context } })
const failure = (code: ApplicationErrorCode = 'NOT_FOUND'): ApplicationResult<never> => ({
  ok: false,
  context: { ...context },
  error: {
    code,
    message: code === 'NOT_FOUND' ? 'Assente' : 'Errore applicativo',
    fields: [],
    conflicts: [],
  },
})
// Structurally complete DTOs shared by the six typed APIs, including their version metadata.
function entity(id: string, active = true, portId = 'port-A') {
  return {
    id,
    code: Number(id.replace(/[^0-9]/g, '')) || 1,
    portId,
    status: active ? ('ACTIVE' as const) : ('INACTIVE' as const),
    selectable: active,
    nextTransitionAt: null,
    initialZoneId: 'Europe/Rome',
    description: 'Descrizione ' + id,
    hasEverBeenUsed: !active,
    initialWeight: {
      id: 'weight-' + id,
      sequenceId: 'sequence-' + id,
      effectiveFrom: null,
      weight: '1',
    },
    version: {
      id: 'version-' + id,
      name: 'Nome ' + id,
      registeredName: 'Nome ' + id,
      businessName: 'Nome ' + id,
      imoNumber: null,
      vesselTypeId: 'STANDARD' as const,
      size: 100,
      locality: 'Genova',
      countryCode: 'IT',
      effectiveFrom: null,
      effectiveTo: null,
      effectiveMoment: null,
      phase: 'CURRENT' as const,
    },
  }
}
type Entity = ReturnType<typeof entity>
const page = (items: Entity[] = [], total = items.length, number = 1) => ({
  items,
  total,
  page: number,
  pageSize: 25,
})
function api() {
  return {
    list: vi.fn(async (request: { query: { page: number; search?: string } }) =>
      ok(page([], 0, request.query.page)),
    ),
    get: vi.fn(async (request: { query: { id: string } }) => ok(entity(request.query.id))),
    history: vi.fn(async (request: { query: { id: string } }) =>
      ok({
        berth: entity(request.query.id),
        versions: { items: [], page: 1, total: 0, pageSize: 1 },
      }),
    ),
  }
}
let apis: Record<Kind, ReturnType<typeof api>>
beforeEach(() => {
  context = { sessionId: 'session-A', archiveId: 'archive-A', revision: '5' }
  apis = Object.fromEntries(kinds.map((kind) => [kind, api()])) as typeof apis
  vi.stubGlobal('window', apis)
  const workspace = mount(() => ConsultationWorkspace({ children: null }))
  provide(workspace.value)
  store = workspace.value.props.value
})
afterEach(() => {
  mounted
    .splice(0)
    .reverse()
    .forEach((r) => r.unmount())
  contexts.clear()
  vi.unstubAllGlobals()
})
function setup(
  kind: Kind,
  initial: { value?: string | null; historical?: boolean; retained?: string; owner?: string } = {},
) {
  let value = initial.value ?? null,
    historical = initial.historical ?? false,
    owner = initial.owner ?? 'owner-A',
    portId = 'port-A'
  const onChange = vi.fn((id: string | null) => {
      value = id
      r.dirty = true
    }),
    onMissing = vi.fn()
  const render = () => {
    const common = {
      context,
      value,
      disabled: false,
      onChange,
      onMissing,
      historical,
      consultation: useConsultationPicker('serviceTypes', owner),
    }
    const retainedId = initial.retained
    let element: ReactElement<PagedPickerProps>
    if (kind === 'vessels') element = VesselPicker({ ...common, retainedId })
    else if (kind === 'ports') element = PortPicker({ ...common, retainedId })
    else if (kind === 'catalog') element = CatalogPicker({ ...common, retainedId })
    else if (kind === 'berths')
      element = BerthPicker({
        ...common,
        portId,
        retained: retainedId
          ? { id: retainedId, label: 'Nome storico originale', portId: 'port-A' }
          : undefined,
      })
    else
      element = SubjectPicker({
        ...common,
        kind: kind === 'customers' ? 'customer' : 'agency',
        retainedId,
      })
    return element.props
  }
  let r = mount(render)
  return {
    get r() {
      return r
    },
    onChange,
    onMissing,
    rerender: () => {
      r.dirty = true
      r.flush()
    },
    remount: () => {
      r.unmount()
      r = mount(render)
    },
    select: (id: string | null) => {
      value = id
    },
    history: (next: boolean) => {
      historical = next
    },
    owner: (next: string) => {
      owner = next
    },
    port: (next: string) => {
      portId = next
    },
  }
}
function read(kind: Kind, implementation: (id: string) => Promise<ApplicationResult<Entity>>) {
  if (kind === 'berths')
    apis.berths.history.mockImplementation(async (r) => {
      const response = await implementation(r.query.id)
      return response.ok
        ? {
            ...response,
            value: {
              berth: response.value,
              versions: { items: [], page: 1, total: 0, pageSize: 1 },
            },
          }
        : response
    })
  else apis[kind].get.mockImplementation((r) => implementation(r.query.id))
}

describe.each(kinds)('PR05 adapter %s', (kind) => {
  it('separa ricerca e scelta; 26 DTO, pagina successiva, totali, reset e ricerca oltre la prima pagina', async () => {
    const all = Array.from({ length: 26 }, (_, i) => entity('item-' + (i + 1)))
    apis[kind].list.mockImplementation(async (r) => {
      const results = r.query.search ? all.filter((v) => v.id === r.query.search) : all
      return ok(
        page(
          results.slice((r.query.page - 1) * 25, r.query.page * 25),
          results.length,
          r.query.page,
        ),
      )
    })
    const s = setup(kind)
    await s.r.until((p) => p.page?.total === 26)
    expect(s.r.value.data).toHaveLength(25)
    s.r.value.onPage(2)
    s.r.flush()
    await s.r.until((p) => p.page?.page === 2)
    expect(s.onChange).not.toHaveBeenCalled()
    expect(s.r.value.data.map((o) => o.value)).toEqual(['item-26'])
    s.r.value.onChange('item-26')
    s.r.flush()
    await s.r.until((p) => p.selectedState === 'ready')
    expect(s.onChange).toHaveBeenCalledExactlyOnceWith('item-26')
    s.r.value.onSearchChange('item-26')
    s.r.flush()
    await s.r.until((p) => p.page?.total === 1)
    expect(apis[kind].list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        context: { sessionId: context.sessionId },
        query: expect.objectContaining({ search: 'item-26', page: 1, pageSize: 25 }),
      }),
    )
    expect(s.r.value.value).toBe('item-26')
    expect(s.r.value.data).toHaveLength(1)
    s.r.value.onSearchChange('assente')
    s.r.flush()
    await s.r.until((p) => p.page?.total === 0)
    expect(s.r.value.chosen?.label).toContain('item-26')
    expect(s.r.value.data).toHaveLength(1)
    expect(s.r.value.page?.items).toEqual([])
    expect(s.onMissing).not.toHaveBeenCalled()
    expect(s.onChange).toHaveBeenCalledTimes(1)
  })
  it('recupera per ID la descrizione fuori filtro, deduplica e distingue assenza, errore e vuoto', async () => {
    const s = setup(kind, { value: 'chosen' })
    await s.r.until((p) => p.selectedState === 'ready' && p.page !== null)
    expect(s.r.value.chosen?.label).toContain('chosen')
    expect(s.r.value.page?.total).toBe(0)
    read(kind, async () => failure('UNEXPECTED'))
    context = { ...context, revision: '6' }
    s.rerender()
    await s.r.until((p) => p.selectedState === 'error')
    expect(s.onMissing).not.toHaveBeenCalled()
    expect(s.r.value.value).toBe('chosen')
    read(kind, async () => failure())
    context = { ...context, revision: '7' }
    s.rerender()
    await s.r.until((p) => p.selectedState === 'missing')
    expect(s.r.value.data).toEqual([])
    expect(s.onMissing).toHaveBeenCalledTimes(kind === 'vessels' || kind === 'ports' ? 1 : 0)
  })
  it('mantiene i vincoli del disattivato fuori pagina e distingue consultazione storica e nuovi riferimenti', async () => {
    read(kind, async (id) => ok(entity(id, false)))
    const s = setup(kind, { value: 'inactive' })
    await s.r.until((p) => p.selectedState === 'ready')
    expect(s.r.value.data[0].disabled).toBe(true)
    s.r.value.onChange('inactive')
    expect(s.onChange).not.toHaveBeenCalled()
    s.history(true)
    s.rerender()
    await s.r.until((p) => p.selectedState === 'ready')
    expect(s.r.value.data[0].disabled).toBe(false)
    s.r.value.onChange('inactive')
    expect(s.onChange).toHaveBeenCalledExactlyOnceWith('inactive')
  })
  it('retained ammette soltanto il riferimento originale e ne conserva i vincoli anche dopo un altro ID', async () => {
    read(kind, async (id) => ok(entity(id, false)))
    apis[kind].list.mockResolvedValue(ok(page([entity('other', false)])))
    const s = setup(kind, { value: 'original', retained: 'original', historical: true })
    await s.r.until((p) => p.selectedState === 'ready' && p.page !== null)
    expect(s.r.value.data.find((o) => o.value === 'original')?.disabled).toBe(false)
    expect(s.r.value.data.find((o) => o.value === 'other')?.disabled).toBe(true)
    s.r.value.onChange('other')
    expect(s.onChange).not.toHaveBeenCalled()
    s.select('replacement')
    s.rerender()
    await s.r.until(
      (p) => p.selectedState === 'ready' && p.data.some((o) => o.value === 'original'),
    )
    expect(s.r.value.data.find((o) => o.value === 'replacement')?.disabled).toBe(true)
    s.r.value.onChange('original')
    expect(s.onChange).toHaveBeenCalledExactlyOnceWith('original')
    if (kind === 'berths')
      expect(s.r.value.data.find((o) => o.value === 'original')?.label).toBe(
        'Nome storico originale',
      )
  })
  it.each(['successo', 'errore'])(
    'ricerche rapide con risposte invertite (%s) e correzione durante caricamento',
    async (outcome) => {
      const old = deferred<ApplicationResult<ReturnType<typeof page>>>()
      apis[kind].list.mockImplementation(async (r) =>
        r.query.search === 'old' ? old.promise : ok(page([entity(r.query.search || 'initial')])),
      )
      const s = setup(kind)
      await s.r.until((p) => p.page !== null)
      s.r.value.onSearchChange('old')
      s.r.flush()
      expect(s.r.value.loading).toBe(true)
      expect(s.r.value.disabled).toBe(false)
      s.r.value.onSearchChange('new')
      s.r.flush()
      await s.r.until((p) => p.page?.items[0] !== undefined)
      old.resolve(outcome === 'successo' ? ok(page([entity('superseded')])) : failure('UNEXPECTED'))
      await old.promise
      await Promise.resolve()
      s.r.flush()
      expect(s.r.value.data[0].value).toBe('new')
      expect(s.r.value.error).toBeNull()
      expect(s.onChange).not.toHaveBeenCalled()
    },
  )
  it.each(['session', 'revision', 'owner', 'selection'] as const)(
    'scarta il dettaglio precedente dopo cambio %s durante richiesta',
    async (change) => {
      const old = deferred<ApplicationResult<Entity>>()
      read(kind, async () => old.promise)
      const s = setup(kind, { value: 'old' })
      expect(s.r.value.selectedState).toBe('loading')
      read(kind, async (id) => ok(entity(id)))
      if (change === 'session') context = { ...context, sessionId: 'session-B' }
      if (change === 'revision') context = { ...context, revision: '6' }
      if (change === 'owner') s.owner('owner-B')
      if (change === 'selection') s.select('new')
      s.rerender()
      await s.r.until((p) => p.selectedState === 'ready')
      old.resolve(failure())
      await old.promise
      await Promise.resolve()
      s.r.flush()
      expect(s.r.value.selectedState).toBe('ready')
      expect(s.onMissing).not.toHaveBeenCalled()
      expect(s.r.value.error).toBeNull()
      if (change === 'selection') expect(s.r.value.chosen?.value).toBe('new')
    },
  )
  it('ripristina PR03 nel proprietario giusto senza cleanup o risultati precedenti che sovrascrivono lo stato', async () => {
    store.write('serviceTypes', 'owner-A', 'search', 'restored')
    store.write('serviceTypes', 'owner-A', 'page', 2)
    const old = deferred<ApplicationResult<ReturnType<typeof page>>>()
    apis[kind].list.mockImplementation(async (r) =>
      r.query.search === 'restored' ? old.promise : ok(page([], 0, r.query.page)),
    )
    const s = setup(kind)
    expect(s.r.value.search).toBe('restored')
    expect(apis[kind].list).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ page: 2, search: 'restored' }) }),
    )
    s.owner('owner-B')
    s.rerender()
    await s.r.until((p) => p.page !== null)
    old.resolve(ok(page([], 0, 2)))
    await old.promise
    await Promise.resolve()
    s.r.flush()
    expect(store.read('serviceTypes', 'owner-A', 'page')).toBe(2)
    expect(s.r.value.search).toBe('')
    s.owner('owner-A')
    s.rerender()
    expect(s.r.value.search).toBe('restored')
    s.remount()
    expect(s.r.value.search).toBe('restored')
  })
  it('trasporto e lista fallita restano distinti da assenza autorevole', async () => {
    read(kind, async () => {
      throw Error('offline')
    })
    apis[kind].list.mockResolvedValue(failure('UNEXPECTED'))
    const s = setup(kind, { value: 'chosen' })
    await s.r.until((p) => p.error !== null && !p.loading)
    expect(s.r.value.value).toBe('chosen')
    expect(s.r.value.selectedState).not.toBe('missing')
    expect(s.onMissing).not.toHaveBeenCalled()
    expect(s.r.value.page).toBeNull()
  })
})

it('banchine: proprietari differenti, retained e nome storico non trasferibili al nuovo porto', async () => {
  read('berths', async (id) => ok(entity(id, false, 'port-A')))
  const s = setup('berths', { value: 'original', retained: 'original', historical: true })
  await s.r.until((p) => p.selectedState === 'ready')
  expect(s.r.value.chosen?.label).toBe('Nome storico originale')
  s.port('port-B')
  s.rerender()
  await s.r.until((p) => p.selectedState === 'missing')
  expect(s.r.value.data).toEqual([])
  expect(apis.berths.list).toHaveBeenLastCalledWith(
    expect.objectContaining({
      query: expect.objectContaining({ portId: 'port-B', search: '', page: 1 }),
    }),
  )
})

it.each(['customers', 'agencies', 'catalog', 'berths'] as const)(
  'null/clear %s conserva il significato del chiamante senza scegliere durante ricerca',
  async (kind) => {
    const s = setup(kind, { value: 'chosen', historical: kind === 'catalog' })
    await s.r.until((p) => p.selectedState === 'ready')
    expect(s.r.value.clearable).toBe(true)
    s.r.value.onChange(null)
    s.r.flush()
    expect(s.r.value.value).toBeNull()
    expect(s.onChange).toHaveBeenCalledExactlyOnceWith(null)
    if (kind === 'customers' || kind === 'agencies')
      expect(s.r.value.placeholder).toBe('Eredita dal livello superiore')
  },
)
it.each(['vessels', 'ports', 'catalog'] as const)(
  'campo obbligatorio %s non espone cancellazione',
  (kind) => {
    const s = setup(kind)
    expect(s.r.value.required).toBe(true)
    expect(s.r.value.clearable).not.toBe(true)
  },
)

it.each(kinds)(
  'PR05 %s: retry esplicito dopo errore rilegge lista e scelto senza cancellare o riscrivere la scelta',
  async (kind) => {
    apis[kind].list.mockResolvedValue(failure('UNEXPECTED'))
    read(kind, async () => failure('UNEXPECTED'))
    const s = setup(kind, { value: 'chosen' })
    await s.r.until((p) => p.selectedState === 'error' && !p.loading)
    apis[kind].list.mockResolvedValue(ok(page([entity('chosen')])))
    read(kind, async (id) => ok(entity(id)))
    s.r.value.onRetry?.()
    s.r.flush()
    await s.r.until((p) => p.selectedState === 'ready' && p.page !== null)
    expect(s.r.value.error).toBeNull()
    expect(s.r.value.data).toHaveLength(1)
    expect(s.onChange).not.toHaveBeenCalled()
  },
)
it('PR05 intenzione PR03 modificata prima del commit: errore della vecchia lista non sovrascrive la nuova ricerca', async () => {
  const old = deferred<ApplicationResult<ReturnType<typeof page>>>()
  apis.catalog.list.mockImplementation(async (r) => (r.query.search ? ok(page()) : old.promise))
  const s = setup('catalog')
  old.resolve(failure('UNEXPECTED'))
  store.write('serviceTypes', 'owner-A', 'search', 'new')
  await old.promise
  await Promise.resolve()
  s.r.flush()
  await s.r.until((p) => p.page !== null)
  expect(s.r.value.error).toBeNull()
  expect(s.r.value.search).toBe('new')
})

it.each(
  kinds.flatMap((kind) =>
    (['session', 'revision', 'owner'] as const).map((change) => [kind, change] as const),
  ),
)(
  'PR05 %s lista in volo durante cambio %s: solo i risultati del contesto corrente',
  async (kind, change) => {
    const old = deferred<ApplicationResult<ReturnType<typeof page>>>()
    apis[kind].list.mockImplementationOnce(async () => old.promise)
    const s = setup(kind)
    if (change === 'session') context = { ...context, sessionId: 'session-B' }
    if (change === 'revision') context = { ...context, revision: '6' }
    if (change === 'owner') s.owner('owner-B')
    apis[kind].list.mockImplementation(async () => ok(page([entity('current')])))
    s.rerender()
    await s.r.until((p) => p.page !== null)
    old.resolve(ok(page([entity('superseded')])))
    await old.promise
    await Promise.resolve()
    s.r.flush()
    expect(s.r.value.data.map((o) => o.value)).toEqual(['current'])
    expect(s.r.value.page?.total).toBe(1)
  },
)
it('PR05 banchina senza consultazione: cambio porto azzera soltanto lo stato locale, mai quello controllato PR03', async () => {
  let portId = 'port-A'
  const r = mount(
    () => BerthPicker({ context, portId, value: null, disabled: false, onChange: vi.fn() }).props,
  )
  await r.until((p) => p.page !== null)
  r.value.onSearchChange('locale')
  r.flush()
  await r.until((p) => p.page !== null)
  portId = 'port-B'
  r.dirty = true
  r.flush()
  await r.until((p) => p.page !== null)
  expect(r.value.search).toBe('')
  expect(apis.berths.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ query: expect.objectContaining({ portId, search: '', page: 1 }) }),
  )
})
