import { CopyTariffFields } from '../../src/renderer/src/app/tariffs/CopyTariffFields'
import { BaseCalculator } from '../../src/renderer/src/app/tariffs/BaseCalculator'
import { VesselPicker } from '../../src/renderer/src/app/operations/VesselPicker'
import { WeightHistory } from '../../src/renderer/src/app/weights/WeightHistory'
import { Services } from '../../src/renderer/src/app/services/Services'
import { ServicePreview } from '../../src/renderer/src/app/services/ServicePreview'
import { ServiceFilters } from '../../src/renderer/src/app/services/ServiceFilters'
import { Tariffs } from '../../src/renderer/src/app/tariffs/Tariffs'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
vi.mock('react', async (actual) => ({
  ...(await actual<typeof import('react')>()),
  ...(await import('./support/hook-runner')),
}))
import { HookRunner, contexts, provide, deferred } from './support/hook-runner'
import { ConsultationWorkspace } from '../../src/renderer/src/api/use-consultation-state'
import { DraftProtection } from '../../src/renderer/src/app/DraftProtection'
import { usePorts } from '../../src/renderer/src/api/use-ports'
import type { useArchives } from '../../src/renderer/src/api/use-archives'
import type { ApplicationResult, ArchiveContextDto } from '../../src/shared/contracts/application'
import type { CompanyTimeZoneDto, ResolvedMomentDto } from '../../src/shared/contracts/values'
import { TimeZonePicker, staticZoneOptions } from '../../src/renderer/src/app/TimeZonePicker'
import { PagedPicker, type PagedPickerProps } from '../../src/renderer/src/app/PagedPicker'
import { TimeSettings } from '../../src/renderer/src/app/TimeSettings'
import { MomentDisplay, UtcDisplay } from '../../src/renderer/src/app/MomentDisplay'
import { MomentChoices } from '../../src/renderer/src/app/MomentChoices'
import { VersionCard } from '../../src/renderer/src/app/ports/VersionCard'
import { VersionMomentFields } from '../../src/renderer/src/app/ports/VersionMomentFields'
import { TariffMomentFields } from '../../src/renderer/src/app/tariffs/TariffMomentFields'
import { OperationDetail } from '../../src/renderer/src/app/operations/OperationDetail'
import { StayInterval, stayIntervalLabel } from '../../src/renderer/src/app/operations/StayInterval'
import { displayPreviewValue } from '../../src/renderer/src/app/ports/PortConfirmation'
import {
  italianNumericFormat,
  englishNumericFormat,
} from '../../src/shared/contracts/numeric-preference'
import type { StayIntervalDto, VesselOperationDto } from '../../src/shared/contracts/operations'
import { ArchivePage } from '../../src/renderer/src/app/ArchivePage'

let context: ArchiveContextDto, archives: ReturnType<typeof useArchives>
const mounted: HookRunner<unknown>[] = []
function mount<T>(fn: () => T) {
  const r = new HookRunner(fn)
  mounted.push(r)
  r.flush()
  return r
}
const ok = <T,>(value: T, ctx = context): ApplicationResult<T> => ({
  ok: true,
  value,
  context: { ...ctx },
})
const page = { items: [], page: 1, pageSize: 25, total: 0 }
const moment: ResolvedMomentDto = {
  localDateTime: '2026-10-25T02:30',
  zoneId: 'Europe/Rome',
  offset: '+02:00',
  utc: '2026-10-25T00:30:00.000Z',
}
function nodes(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const e = node as ReactElement<Record<string, unknown>>
  return [e, ...nodes(e.props.children as ReactNode)]
}
function props<T>(node: ReactNode, type: unknown): T {
  const n = nodes(node).find((e) => e.type === type)
  if (!n) throw Error('Controllo assente')
  return n.props as T
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join('')
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (node && typeof node === 'object' && 'props' in node)
    return text((node as ReactElement<{ children: ReactNode }>).props.children)
  return ''
}
function display(node: ReactNode) {
  return nodes(node)
    .filter((e) => e.type === MomentDisplay)
    .map((e) => text(MomentDisplay(e.props as unknown as Parameters<typeof MomentDisplay>[0])))
    .join(' ')
}
beforeEach(() => {
  context = { archiveId: 'archive', sessionId: 'session-A', revision: '4' }
  archives = {
    state: { context, active: {} },
    busy: false,
    commandBusy: false,
    setError: vi.fn(),
    setNotice: vi.fn(),
    execute: vi.fn(async (fn: () => Promise<unknown>) => fn()),
    update: vi.fn(),
    run: vi.fn(),
  } as unknown as ReturnType<typeof useArchives>
  vi.stubGlobal('window', {
    time: {
      getCompanyZone: vi.fn(async () => ok({ zoneId: 'Europe/Rome', confirmed: false })),
      configureCompanyZone: vi.fn(async () => ok({ zoneId: 'Europe/Rome', confirmed: true })),
      resolveCompanyMoment: vi.fn(async () => ok({ status: 'RESOLVED', moment })),
    },
    ports: {
      list: vi.fn(async () => ok(page)),
      history: vi.fn(),
      create: vi.fn(async () => ok({ id: 'created', code: 1 })),
    },
    archives: { getState: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout,
    clearTimeout,
  })
  vi.stubGlobal('document', { activeElement: null })
  vi.stubGlobal('HTMLElement', class {})
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => fn())
  provide(mount(() => ConsultationWorkspace({ children: null })).value)
  provide(mount(() => DraftProtection({ children: null })).value)
})
afterEach(() => {
  mounted
    .splice(0)
    .reverse()
    .forEach((r) => r.unmount())
  contexts.clear()
  vi.unstubAllGlobals()
})
it('PR06 adapter statico reale: filtro per termini, scelta fuori ricerca, page=null e nessuna conferma del testo', () => {
  expect(
    staticZoneOptions(['Europe/Rome', 'America/New_York', 'Europe/London'], 'EURO rom'),
  ).toEqual([{ value: 'Europe/Rome', label: 'Europe/Rome', disabled: false }])
  const choose = vi.fn()
  const r = mount(() =>
    TimeZonePicker({ label: 'Fuso', value: 'Europe/Rome', country: 'IT', onChange: choose }),
  )
  let p = props<PagedPickerProps>(r.value, PagedPicker)
  expect(p).toMatchObject({
    page: null,
    loading: false,
    value: 'Europe/Rome',
    chosen: { label: 'Europe/Rome' },
    data: [{ value: 'Europe/Rome' }],
  })
  p.onSearchChange('arbitrario')
  r.flush()
  p = props(r.value, PagedPicker)
  expect(p.data).toEqual([])
  expect(p.chosen?.label).toBe('Europe/Rome')
  expect(choose).not.toHaveBeenCalled()
  p.onChange('arbitrario')
  p.onChange('America/New_York')
  p.onChange(null)
  expect(choose).not.toHaveBeenCalled()
  p.onChange('Europe/Rome')
  expect(choose).toHaveBeenCalledExactlyOnceWith('Europe/Rome')
})
it('PR06 adapter globale UTC/alias e paese senza voce esplicito', () => {
  const onChange = vi.fn()
  const global = mount(() => TimeZonePicker({ label: 'Fuso', value: 'US/Eastern', onChange }))
  expect(
    props<PagedPickerProps>(global.value, PagedPicker).data.some((v) => v.value === 'UTC'),
  ).toBe(true)
  expect(props<PagedPickerProps>(global.value, PagedPicker).chosen?.label).toBe('US/Eastern')
  const none = mount(() => TimeZonePicker({ label: 'Fuso', value: '', country: 'BV', onChange }))
  expect(props<PagedPickerProps>(none.value, PagedPicker)).toMatchObject({
    disabled: true,
    page: null,
    data: [],
  })
  expect(text(none.value)).toContain('Nessun fuso supportato associato')
})
it('PR06 usePorts cambia paese: proposta compatibile, scelta multipla esplicita, scelta unica e bozza conservata', async () => {
  const r = mount(() => usePorts(archives))
  await r.until((v) => !!v.draftContext)
  r.value.openCreate()
  r.value.setDraft({ ...r.value.draft, name: 'Bozza', locality: 'Qui', countryCode: 'US' })
  r.flush()
  expect(r.value.draft).toMatchObject({ name: 'Bozza', initialZoneId: '', countryCode: 'US' })
  const original = { ...r.value.draftContext! }
  r.value.setDraft({ ...r.value.draft, initialZoneId: 'America/Chicago' })
  r.flush()
  r.value.setDraft({ ...r.value.draft, countryCode: 'IT' })
  r.flush()
  expect(r.value.draft).toMatchObject({
    name: 'Bozza',
    locality: 'Qui',
    initialZoneId: 'Europe/Rome',
  })
  expect(r.value.draftContext).toEqual(original)
  r.value.setDraft({ ...r.value.draft, countryCode: 'BV' })
  r.flush()
  expect(r.value.draft.initialZoneId).toBe('')
})
it('PR06 caricamento aziendale tardivo non sovrascrive la scelta né il contesto originale della bozza', async () => {
  const pending = deferred<ApplicationResult<CompanyTimeZoneDto>>()
  vi.mocked(window.time.getCompanyZone).mockReturnValue(pending.promise)
  const r = mount(() => usePorts(archives))
  r.value.openCreate()
  r.value.setDraft({ ...r.value.draft, countryCode: 'US', name: 'Intatta' })
  r.flush()
  r.value.setDraft({ ...r.value.draft, initialZoneId: 'America/Chicago' })
  r.flush()
  const original = r.value.draftContext
  pending.resolve(
    ok({ zoneId: 'America/New_York', confirmed: true }, { ...context, revision: '5' }),
  )
  await pending.promise
  await Promise.resolve()
  r.flush()
  expect(r.value.draft).toMatchObject({
    name: 'Intatta',
    countryCode: 'US',
    initialZoneId: 'America/Chicago',
  })
  expect(r.value.draftContext).toBe(original)
})
it('PR06 risposta aziendale superata da revisione non sostituisce una bozza esistente', async () => {
  const pending = deferred<ApplicationResult<CompanyTimeZoneDto>>()
  vi.mocked(window.time.getCompanyZone).mockReturnValue(pending.promise)
  const r = mount(() => usePorts(archives))
  r.value.openCreate()
  r.value.setDraft({ ...r.value.draft, name: 'Vecchia bozza' })
  r.flush()
  archives = { ...archives, state: { ...archives.state, context: { ...context, revision: '6' } } }
  r.dirty = true
  r.flush()
  pending.resolve(ok({ zoneId: 'America/New_York', confirmed: true }))
  await pending.promise
  await Promise.resolve()
  r.flush()
  expect(r.value.draft).toMatchObject({ name: 'Vecchia bozza', initialZoneId: 'Europe/Rome' })
  expect(r.value.draftContext?.revision).toBe('4')
})
it('PR06 risposta dopo smontaggio/sessione non applica configurazioni al nuovo workspace', async () => {
  const pending = deferred<ApplicationResult<CompanyTimeZoneDto>>()
  vi.mocked(window.time.getCompanyZone).mockReturnValueOnce(pending.promise)
  const old = mount(() => usePorts(archives))
  old.unmount()
  context = { ...context, sessionId: 'session-B' }
  archives = { ...archives, state: { ...archives.state, context } }
  const next = mount(() => usePorts(archives))
  await next.until((v) => !!v.draftContext)
  pending.resolve(
    ok({ zoneId: 'America/New_York', confirmed: true }, { ...context, sessionId: 'session-A' }),
  )
  await pending.promise
  await Promise.resolve()
  next.flush()
  expect(next.value.draft.initialZoneId).toBe('Europe/Rome')
  expect(next.value.draftContext?.sessionId).toBe('session-B')
})
it('PR06 TimeSettings usa il picker; configurazione confermata resta non modificabile', async () => {
  vi.mocked(window.time.getCompanyZone).mockResolvedValueOnce(
    ok({ zoneId: 'US/Eastern', confirmed: true }),
  )
  const r = mount(() => TimeSettings({ archives }))
  await r.until((v) => text(v).includes('Fuso aziendale confermato:'))
  expect(text(r.value)).toContain('US/Eastern')
  expect(nodes(r.value).some((e) => e.type === TimeZonePicker)).toBe(false)
  expect(window.time.configureCompanyZone).not.toHaveBeenCalled()
})
it('PR06 MomentChoices conserva scelta esplicita e distingue le due occorrenze senza normalizzare input', () => {
  const second = { ...moment, offset: '+01:00', utc: '2026-10-25T01:30:00.000Z' },
    onChoose = vi.fn()
  const view = MomentChoices({ choices: [moment, second], disabled: false, onChoose })
  const buttons = nodes(view).filter((e) => typeof e.props.onClick === 'function')
  expect(buttons.map((e) => e.props.title)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('25/10/2026 02:30 (+02:00)'),
      expect.stringContaining('25/10/2026 02:30 (+01:00)'),
    ]),
  )
  expect(onChoose).not.toHaveBeenCalled()
  ;(buttons[1].props.onClick as () => void)()
  expect(onChoose).toHaveBeenCalledExactlyOnceWith(second)
})
it.each([
  ['versione', VersionMomentFields],
  ['tariffa', TariffMomentFields],
] as const)('PR06 campi decorrenza reali %s separano ISO da display', (_label, Component) => {
  const onChange = vi.fn(),
    input = { localDateTime: moment.localDateTime, selectedOffset: moment.offset }
  const view = Component({
    moment: input,
    fields: {},
    disabled: false,
    onResolve: vi.fn(),
    resolution: { status: 'RESOLVED', moment },
    onChange,
  })
  expect(nodes(view).find((e) => e.props.type === 'datetime-local')?.props.value).toBe(
    '2026-10-25T02:30',
  )
  expect(display(view)).toContain('25/10/2026 02:30 (+02:00)')
  expect(onChange).not.toHaveBeenCalled()
})
it('PR06 VersionCard: inizio storico e fine tecnica esclusa, senza dipendenza dalla notazione numerica', () => {
  const version = {
    id: 'v',
    effectiveFrom: moment.utc,
    effectiveTo: '2026-10-25T03:00:59.123Z',
    effectiveMoment: moment,
    phase: 'CURRENT' as const,
  }
  const view = VersionCard({
    version,
    description: 'Prova',
    disabled: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  })
  expect(display(view)).toContain('25/10/2026 02:30 (+02:00)')
  const utc = props<{ utc: string }>(view, UtcDisplay)
  expect(text(UtcDisplay(utc))).toBe('25/10/2026 03:00 (+00:00) · UTC')
  expect(text(view)).toContain('(escluso)')
})
it('PR06 permanenze aperte/chiuse mostrano tuple backend e precisione, UTC soltanto se disponibile da solo', () => {
  const base: StayIntervalDto = {
    id: 'stay',
    openingOperationId: 'entry',
    closingOperationId: null,
    startedAt: moment.utc,
    endedAt: null,
    openingMoment: moment,
    closingMoment: null,
  }
  expect(stayIntervalLabel(base)).toBe('25/10/2026 02:30 (+02:00) → Aperta')
  expect(display(StayInterval({ interval: base }))).toContain('Europe/Rome')
  const closed = {
    ...base,
    closingOperationId: 'exit',
    endedAt: '2026-10-25T01:30:00.000Z',
    closingMoment: { ...moment, offset: '+01:00', utc: '2026-10-25T01:30:00.000Z' },
  }
  expect(stayIntervalLabel(closed)).toBe('25/10/2026 02:30 (+02:00) → 25/10/2026 02:30 (+01:00)')
  expect(display(StayInterval({ interval: closed }))).toContain('(+01:00)')
})
it('PR06 anteprime scalari note, payload opachi conservati e notazione PR04 indipendente', () => {
  for (const format of [italianNumericFormat, englishNumericFormat]) {
    for (const field of [
      'moment',
      'arrival',
      'Arrivo',
      'startedAt',
      'endedAt',
      'effectiveFrom',
      'effectiveTo',
      'tariffEffectiveFrom',
    ])
      expect(displayPreviewValue(field, moment.utc, format)).toBe('25/10/2026 00:30 (+00:00) · UTC')
    const opaque = JSON.stringify(moment)
    expect(displayPreviewValue('effectiveMoment', opaque, format)).toBe(opaque)
    expect(displayPreviewValue('description', moment.utc, format)).toBe(moment.utc)
    expect(displayPreviewValue('moment', '2026-10-25T02:30 · Europe/Rome · +02:00', format)).toBe(
      '2026-10-25T02:30 · Europe/Rome · +02:00',
    )
  }
})
it('PR06 metadati archivio e recenti usano UTC esplicito e conservano precisione nel dettaglio', () => {
  archives = {
    ...archives,
    state: {
      ...archives.state,
      recent: [{ name: 'Recente', path: 'r', lastOpenedAt: moment.utc }],
      active: {
        name: 'Archivio',
        createdAt: '2026-10-25T02:30:00+02:00',
        updatedAt: '2026-10-25T00:30:59.123Z',
      },
    },
  } as ReturnType<typeof useArchives>
  const r = mount(() => ArchivePage({ archives }))
  const values = nodes(r.value).filter((e) => e.type === UtcDisplay)
  expect(values).toHaveLength(2)
  expect(values.map((e) => text(UtcDisplay(e.props as { utc: string })))).toEqual(
    Array(2).fill('25/10/2026 00:30 (+00:00) · UTC'),
  )
  archives = { ...archives, state: { ...archives.state, active: null } }
  r.dirty = true
  r.flush()
  expect(nodes(r.value).filter((e) => e.type === UtcDisplay)).toHaveLength(1)
  expect(text(UtcDisplay({ utc: '2026-10-25' }))).toBe('Istante UTC non disponibile')
  expect(UtcDisplay({ utc: '2026-10-25' }).props.title).toContain('2026-10-25')
  expect(UtcDisplay({ utc: '2026-10-25T00:30:59.123Z' }).props.title).toContain('59.123Z')
})
it('PR06 OperationDetail usa entrambe le tuple dei due estremi e dei calcoli senza cambiarle', () => {
  const arrival = {
    ...moment,
    zoneId: 'America/New_York',
    localDateTime: '2026-10-25T03:30',
    offset: '-04:00',
    utc: '2026-10-25T07:30:00.000Z',
  }
  const value = {
    operationType: 'MOVEMENT',
    executionStatus: 'PLANNED',
    endpoint: { moment, portName: 'Origine' },
    arrival: { moment: arrival, portName: 'Destinazione' },
    charges: [],
    totalBase: '0.00',
    notes: null,
  } as unknown as VesselOperationDto
  // The detailed caller needs a charge for the vessel heading; the actual calculation remains typed.
  value.charges = [
    {
      id: 'c',
      chargeKind: 'EXIT',
      economicEndpointRole: 'DEPARTURE',
      calculation: { moment, vesselName: 'Nave', tariffValue: '1.00', weight: '1', base: '1.00' },
      manualOverrideAmount: null,
      effectiveBase: '1.00',
    },
  ] as VesselOperationDto['charges']
  const before = structuredClone(value),
    r = mount(() => OperationDetail({ operation: value }))
  expect(display(r.value)).toContain('25/10/2026 02:30 (+02:00)')
  expect(display(r.value)).toContain('25/10/2026 03:30 (-04:00)')
  expect(value).toEqual(before)
})

it('PR06 copia tariffa e calcolatore reale usano la tupla risolta, ISO nella query', async () => {
  window.tariffs = {
    list: vi.fn(async () =>
      ok({ ...page, items: [{ id: 't', effectiveMoment: moment }], total: 1 }),
    ),
    simulateBase: vi.fn(async () =>
      ok({
        moment,
        vesselName: 'Nave',
        vesselTypeId: 'STANDARD',
        size: 1,
        weight: '1',
        tariffValue: '1.00',
        base: '1.00',
      }),
    ),
  } as never
  const copy = mount(() =>
    CopyTariffFields({
      context,
      portId: 'port',
      disabled: false,
      onCopy: vi.fn(),
      report: vi.fn(),
    }),
  )
  await copy.until((v) =>
    nodes(v).some(
      (e) => e.props.label === 'Tariffa sorgente' && (e.props.data as unknown[]).length === 1,
    ),
  )
  expect(nodes(copy.value).find((e) => e.props.label === 'Tariffa sorgente')?.props.data).toEqual([
    { value: 't', label: '25/10/2026 02:30 (+02:00)' },
  ])
  const calc = mount(() => BaseCalculator({ context, portId: 'port' }))
  props<{ onChange: (id: string) => void }>(calc.value, VesselPicker).onChange('vessel')
  calc.flush()
  props<Parameters<typeof TariffMomentFields>[0]>(calc.value, TariffMomentFields).onChange({
    localDateTime: moment.localDateTime,
    selectedOffset: moment.offset,
  })
  calc.flush()
  const button = nodes(calc.value).find((e) => e.props.children === 'Simula base')!
  ;(button.props.onClick as () => void)()
  await calc.until((v) => nodes(v).some((e) => e.type === MomentDisplay))
  expect(display(calc.value)).toContain('25/10/2026 02:30 (+02:00)')
  expect(vi.mocked(window.tariffs.simulateBase).mock.calls[0][0].query.moment).toEqual({
    localDateTime: moment.localDateTime,
    selectedOffset: moment.offset,
  })
})
it('PR06 cronologia pesi e tariffe: tuple storiche e estremi tecnici aperti/chiusi nei chiamanti', async () => {
  window.catalog = {
    weightHistory: vi.fn(async () =>
      ok({
        sequenceId: 'seq',
        versions: {
          ...page,
          total: 1,
          items: [
            {
              id: 'w',
              weight: '1',
              phase: 'CURRENT',
              effectiveMoment: moment,
              effectiveFrom: moment.utc,
              effectiveTo: null,
            },
          ],
        },
      }),
    ),
  } as never
  const weight = mount(() =>
    WeightHistory({
      sequenceId: 'seq',
      label: 'Peso',
      opened: true,
      archives,
      trigger: null,
      resumeTrigger: { current: null },
      onClose: vi.fn(),
      onResume: vi.fn(),
      onUncertainChange: vi.fn(),
      onApplied: vi.fn(),
    }),
  )
  await weight.until((v) => nodes(v).some((e) => e.type === MomentDisplay))
  expect(display(weight.value)).toContain('25/10/2026 02:30 (+02:00)')
  expect(text(weight.value)).toContain('Senza limite finale')
  const store = mount(() => ConsultationWorkspace({ children: null }))
  provide(store.value)
  store.value.props.value.write('tariffOwner', null, 'portId', 'port')
  store.value.props.value.write('tariffs', 'port', 'selection', 't')
  const tariff = {
    id: 't',
    effectiveMoment: moment,
    effectiveFrom: moment.utc,
    effectiveTo: null,
    phase: 'CURRENT',
    configurations: [],
  }
  window.ports.get = vi.fn(async () => ok({ id: 'port', version: { name: 'Porto' } })) as never
  window.tariffs = {
    list: vi.fn(async () => ok({ ...page, total: 1, items: [tariff] })),
    get: vi.fn(async () => ok(tariff)),
  } as never
  const tariffs = mount(() => Tariffs({ archives, onDialogChange: vi.fn() }))
  await tariffs.until((v) => nodes(v).filter((e) => e.type === MomentDisplay).length === 2)
  expect(display(tariffs.value)).toContain('25/10/2026 02:30 (+02:00)')
  expect(text(tariffs.value)).toContain('Senza limite finale')
})
it('PR06 lista/dettaglio e anteprima prestazione mantengono il momento completo', async () => {
  const service = {
    id: 'service',
    vesselId: 'vessel',
    vesselName: 'Nave',
    moment,
    executionStatus: 'PLANNED',
    category: 'FREE',
    description: 'Servizio',
    base: '1.00',
    context: {
      status: 'IN_PORT',
      voyageId: 'voyage',
      portCallId: 'visit',
      berthStayId: 'stay',
      portId: 'port',
      berthId: null,
    },
    specified: { customerId: null, agencyId: null },
    subjects: { customer: null, agency: null },
    portName: 'Porto',
    notes: null,
    calculation: null,
  }
  window.services = {
    list: vi.fn(async () => ok({ ...page, total: 1, items: [service] })),
    get: vi.fn(async () => ok(service)),
  } as never
  const r = mount(() => Services({ archives, onDialogChange: vi.fn() }))
  await r.until((v) => nodes(v).some((e) => e.props.children === 'Apri prestazione'))
  expect(display(r.value)).toContain('25/10/2026 02:30 (+02:00)')
  ;(
    nodes(r.value).find((e) => e.props.children === 'Apri prestazione')!.props.onClick as () => void
  )()
  await r.until((v) => nodes(v).filter((e) => e.type === MomentDisplay).length === 2)
  expect(display(r.value)).toContain('Europe/Rome')
  const preview = ServicePreview({
    preview: { before: service, after: service, changedFields: ['moment'], blockers: [] } as never,
    obsolete: false,
    expired: false,
  })
  const values = nodes(preview).filter(
    (e) => typeof e.type === 'function' && (e.type as { name: string }).name === 'Values',
  )
  expect(values).toHaveLength(2)
  for (const node of values) {
    const view = mount(() => (node.type as (p: Record<string, unknown>) => ReactNode)(node.props))
    expect(display(view.value)).toContain('25/10/2026 02:30 (+02:00)')
  }
})
it('PR06 filtri permanenze ricevono label da tuple backend, anche fuori pagina e con estremi aperti', () => {
  const interval = {
    id: 'voyage',
    openingOperationId: 'entry',
    closingOperationId: null,
    startedAt: moment.utc,
    endedAt: null,
    openingMoment: moment,
    closingMoment: null,
  }
  const stay = { ...interval, id: 'stay', berthName: 'Molo' },
    visit = { ...interval, id: 'visit', portName: 'Porto', stays: [stay] },
    voyage = { ...interval, visits: [visit] }
  window.operations = { stays: vi.fn(async () => ok(page)) } as never
  const r = mount(() =>
    ServiceFilters({
      selectedVoyage: voyage as never,
      referenceError: null,
      context,
      vesselId: 'vessel',
      value: { voyageId: 'voyage', portCallId: 'visit' },
      onChange: vi.fn(),
      disabled: false,
    }),
  )
  ;(r.value.props.onToggle as (e: { currentTarget: { open: boolean } }) => void)({
    currentTarget: { open: true },
  })
  r.flush()
  for (const label of ['Viaggio', 'Visita', 'Ormeggio']) {
    const options = nodes(r.value).find((e) => e.props.label === label)!.props.data as {
      label: string
    }[]
    expect(options[0].label).toContain('25/10/2026 02:30 (+02:00) → Aperta')
  }
})
