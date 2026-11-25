import { BaseCalculator } from '../../src/renderer/src/app/tariffs/BaseCalculator'
import { PortPicker } from '../../src/renderer/src/app/tariffs/PortPicker'
import { VesselPicker } from '../../src/renderer/src/app/operations/VesselPicker'
import { SubjectPicker } from '../../src/renderer/src/app/operations/SubjectPicker'
import { BerthPicker } from '../../src/renderer/src/app/operations/BerthPicker'
import { CatalogPicker } from '../../src/renderer/src/app/services/CatalogPicker'
import { AssignmentEditor } from '../../src/renderer/src/app/operations/AssignmentEditor'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
vi.mock('react', async (actual) => ({
  ...(await actual<typeof import('react')>()),
  ...(await import('./support/hook-runner')),
}))
import { HookRunner, contexts, provide } from './support/hook-runner'
import { ConsultationWorkspace } from '../../src/renderer/src/api/use-consultation-state'
import { DraftProtection } from '../../src/renderer/src/app/DraftProtection'
import { NumericPreferenceProvider } from '../../src/renderer/src/api/use-numeric-preference'
import { Catalog } from '../../src/renderer/src/app/Catalog'
import { Services } from '../../src/renderer/src/app/services/Services'
import { Operations } from '../../src/renderer/src/app/operations/Operations'
import { OperationCompletionEditor } from '../../src/renderer/src/app/operations/OperationCompletionEditor'
import { WeightHistory } from '../../src/renderer/src/app/weights/WeightHistory'
import { ExactNumericInput } from '../../src/renderer/src/app/ExactNumericInput'
import { CalculationNumbers } from '../../src/renderer/src/app/CalculationNumbers'
import {
  ConfigurationFields,
  copyDraft,
  readConfigurations,
} from '../../src/renderer/src/app/tariffs/ConfigurationFields'
import type { BaseCalculationDto } from '../../src/shared/contracts/tariffs'
import { useVessels } from '../../src/renderer/src/api/use-vessels'
import {
  italianNumericFormat as italian,
  englishNumericFormat as english,
  type NumericFormat,
} from '../../src/shared/contracts/numeric-preference'
import type { ArchiveContextDto, ApplicationResult } from '../../src/shared/contracts/application'
import type { useArchives } from '../../src/renderer/src/api/use-archives'
import type { VesselOperationDto } from '../../src/shared/contracts/operations'

const context: ArchiveContextDto = { archiveId: 'archive', sessionId: 'session', revision: '4' }
const mounted: HookRunner<unknown>[] = []
function mount<T>(fn: () => T) {
  const r = new HookRunner(fn)
  mounted.push(r)
  r.flush()
  return r
}
const page = <T,>(items: T[] = []) => ({ items, total: items.length, page: 1, pageSize: 25 })
const ok = <T,>(value: T): ApplicationResult<T> => ({ ok: true, context, value })
const rejected = (): ApplicationResult<never> => ({
  ok: false,
  context,
  error: { code: 'VALIDATION_ERROR', message: 'Vincolo di dominio', fields: [], conflicts: [] },
})
const api = () => ({
  list: vi.fn(async () => ok(page())),
  get: vi.fn(async () => rejected()),
  history: vi.fn(async () => rejected()),
})
let archives: ReturnType<typeof useArchives>
beforeEach(() => {
  archives = {
    state: { context, active: {} },
    busy: false,
    commandBusy: false,
    execute: vi.fn(async (fn: () => Promise<unknown>) => fn()),
    update: vi.fn(async () => ({ context })),
    setError: vi.fn(),
    setNotice: vi.fn(),
    run: vi.fn(),
  } as unknown as ReturnType<typeof useArchives>
  vi.stubGlobal('window', {
    numericPreference: {
      get: vi.fn(async () => ({ ok: true, value: italian, source: 'saved', warning: null })),
      set: vi.fn(async (value: NumericFormat) => ({
        ok: true,
        value,
        source: 'saved',
        warning: null,
      })),
    },
    archives: { getState: vi.fn(async () => ({ ok: true, value: { context } })) },
    catalog: {
      ...api(),
      fixedWeights: vi.fn(async () => ok([])),
      create: vi.fn(async () => rejected()),
      previewWeight: vi.fn(async () => rejected()),
      weightHistory: vi.fn(async () =>
        ok({
          sequenceId: 'seq',
          versions: page([
            {
              id: 'w',
              weight: '1234.56',
              phase: 'CURRENT',
              effectiveFrom: null,
              effectiveTo: null,
              effectiveMoment: null,
            },
          ]),
        }),
      ),
    },
    vessels: { ...api(), create: vi.fn(async () => rejected()) },
    ports: api(),
    berths: api(),
    agencies: api(),
    customers: api(),
    operations: {
      ...api(),
      stays: vi.fn(async () => ok(page())),
      previewCreate: vi.fn(async () => rejected()),
      previewComplete: vi.fn(async () => rejected()),
      previewCorrect: vi.fn(async () => rejected()),
    },
    services: { ...api(), createFree: vi.fn(async () => rejected()) },
    tariffs: api(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout,
    clearTimeout,
  })
  vi.stubGlobal('document', { activeElement: null })
  vi.stubGlobal('HTMLElement', class {})
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => fn())
  const consultation = mount(() => ConsultationWorkspace({ children: null }))
  provide(consultation.value)
  consultation.value.props.value.write('serviceOwner', null, 'vesselId', 'vessel')
  consultation.value.props.value.write('operationOwner', null, 'vesselId', 'vessel')
  const guard = mount(() => DraftProtection({ children: null }))
  provide(guard.value)
})
afterEach(() => {
  mounted
    .splice(0)
    .reverse()
    .forEach((r) => r.unmount())
  contexts.clear()
  vi.unstubAllGlobals()
})
function nodes(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const e = node as ReactElement<Record<string, unknown>>
  return [e, ...nodes(e.props.children as ReactNode)]
}
function find(node: ReactNode, matches: (p: Record<string, unknown>) => boolean) {
  const found = nodes(node).find((e) => matches(e.props))
  if (!found) throw Error('Controllo atteso assente')
  return found.props
}
function click(node: ReactNode, label: string) {
  ;(find(node, (p) => p.children === label).onClick as () => void)()
}
function change(node: ReactNode, label: string, value: string) {
  ;(
    find(node, (p) => p.label === label).onChange as (e: {
      currentTarget: { value: string }
    }) => void
  )({ currentTarget: { value } })
}
async function preference(format: NumericFormat) {
  const provider = mount(() => NumericPreferenceProvider({ children: null }))
  await provider.until((v) => !v.props.value.loading)
  await provider.value.props.value.save(format)
  provider.flush()
  provide(provider.value)
  return provider
}
/** Execute the real common field before passing its canonical edit back to the real caller. */
function localized(node: ReactNode, label: string, text: string) {
  const field = find(node, (p) => p.label === label)
  const r = mount(() => ExactNumericInput(field as Parameters<typeof ExactNumericInput>[0]))
  r.value.props.onChange({
    currentTarget: { value: text, selectionStart: text.length, selectionEnd: text.length },
  })
  r.flush()
  return r
}
for (const format of [italian, english]) {
  it(`catalogo ${format.decimalSeparator}: bozza chiusa/ripresa conserva formato, incompleti, limite 256 e DTO`, async () => {
    const pref = await preference(format)
    const r = mount(() => Catalog({ archives, onDialogChange: vi.fn() }))
    await r.until((v) => find(v, (p) => p.children === 'Nuovo tipo').disabled === false)
    click(r.value, 'Nuovo tipo')
    r.flush()
    change(r.value, 'Descrizione', 'Tipo PR04')
    r.flush()
    const numeric = find(r.value, (p) => p.label === 'Peso iniziale')
    const captured = numeric.format
    localized(r.value, 'Peso iniziale', `1${format.groupSeparator}234${format.decimalSeparator}`)
    r.flush()
    expect(find(r.value, (p) => p.label === 'Peso iniziale').value).toBe('1234.')
    click(r.value, 'Annulla')
    r.flush()
    await pref.value.props.value.save(format === italian ? english : italian)
    pref.flush()
    provide(pref.value)
    r.dirty = true
    r.flush()
    click(r.value, 'Riprendi bozza')
    r.flush()
    expect(find(r.value, (p) => p.label === 'Peso iniziale')).toMatchObject({
      value: '1234.',
      format: captured,
    })
    click(r.value, 'Crea tipo')
    r.flush()
    expect(window.catalog.create).not.toHaveBeenCalled()
    localized(r.value, 'Peso iniziale', '9'.repeat(257))
    r.flush()
    click(r.value, 'Crea tipo')
    r.flush()
    expect(window.catalog.create).not.toHaveBeenCalled()
    localized(r.value, 'Peso iniziale', `1${format.groupSeparator}234${format.decimalSeparator}567`)
    r.flush()
    click(r.value, 'Crea tipo')
    await r.until(() => vi.mocked(window.catalog.create).mock.calls.length === 1)
    expect(vi.mocked(window.catalog.create).mock.calls[0][0]).toMatchObject({
      context,
      payload: { initialWeight: '1234.567' },
    })
    expect(vi.mocked(window.catalog.create).mock.calls[0][0].payload).not.toHaveProperty(
      'numericFormat',
    )
  })
  it(`prestazioni ${format.decimalSeparator}: precisione importi, int64 e bozza incerta conservati al cambio preferenza`, async () => {
    const pref = await preference(format)
    const r = mount(() => Services({ archives, onDialogChange: vi.fn() }))
    await r.until(
      (v) => find(v, (p) => p.children === 'Nuova prestazione libera').disabled === false,
    )
    click(r.value, 'Nuova prestazione libera')
    r.flush()
    localized(r.value, 'Importo base EUR', `1${format.decimalSeparator}001`)
    r.flush()
    click(r.value, 'Registra prestazione')
    r.flush()
    expect(window.services.createFree).not.toHaveBeenCalled()
    localized(r.value, 'Importo base EUR', `92233720368547758${format.decimalSeparator}08`)
    r.flush()
    click(r.value, 'Registra prestazione')
    r.flush()
    expect(window.services.createFree).not.toHaveBeenCalled()
    localized(r.value, 'Importo base EUR', `92233720368547758${format.decimalSeparator}07`)
    r.flush()
    const captured = find(r.value, (p) => p.label === 'Importo base EUR').format
    vi.mocked(window.services.createFree).mockRejectedValue(Error('Risposta persa'))
    click(r.value, 'Registra prestazione')
    await r.until((v) => nodes(v).some((e) => e.props.children === 'Verifica registrazione'))
    expect(vi.mocked(window.services.createFree).mock.calls[0][0]).toMatchObject({
      context,
      payload: { base: '92233720368547758.07' },
    })
    const original = structuredClone(vi.mocked(window.services.createFree).mock.calls[0][0])
    await pref.value.props.value.save(format === italian ? english : italian)
    pref.flush()
    provide(pref.value)
    r.dirty = true
    r.flush()
    expect(find(r.value, (p) => p.label === 'Importo base EUR')).toMatchObject({
      value: '92233720368547758.07',
      format: captured,
    })
    expect(nodes(r.value).some((e) => e.props.children === 'Verifica registrazione')).toBe(true)
    expect(vi.mocked(window.services.createFree).mock.calls[0][0]).toEqual(original)
    expect(window.services.createFree).toHaveBeenCalledOnce()
  })
  it(`operazioni ${format.decimalSeparator}: due basi manuali, errore su decimali ulteriori e anteprima con payload esatto`, async () => {
    await preference(format)
    const r = mount(() => Operations({ archives, onDialogChange: vi.fn() }))
    await r.until((v) => find(v, (p) => p.children === 'Nuova entrata').disabled === false)
    click(r.value, 'Nuova entrata')
    r.flush()
    localized(
      r.value,
      'Sostituzione manuale della base (EUR, facoltativa)',
      `1${format.decimalSeparator}000`,
    )
    r.flush()
    click(r.value, 'Verifica e mostra anteprima')
    r.flush()
    expect(window.operations.previewCreate).not.toHaveBeenCalled()
    localized(
      r.value,
      'Sostituzione manuale della base (EUR, facoltativa)',
      `1${format.groupSeparator}234${format.decimalSeparator}50`,
    )
    r.flush()
    click(r.value, 'Verifica e mostra anteprima')
    await r.until(() => vi.mocked(window.operations.previewCreate).mock.calls.length === 1)
    expect(vi.mocked(window.operations.previewCreate).mock.calls[0][0]).toMatchObject({
      context,
      payload: { manualOverrideAmount: '1234.50' },
    })
  })
  it(`pesi versionati ${format.decimalSeparator}: copia canonica, bozza e comando preview con tutte le cifre`, async () => {
    const pref = await preference(format)
    const props = {
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
    }
    const r = mount(() => WeightHistory(props))
    await r.until((v) => nodes(v).some((e) => e.props.children === 'Correggi peso'))
    click(r.value, 'Correggi peso')
    r.flush()
    const field = find(r.value, (p) => p.label === 'Peso')
    expect(field.value).toBe('1234.56')
    await pref.value.props.value.save(format === italian ? english : italian)
    pref.flush()
    provide(pref.value)
    r.dirty = true
    r.flush()
    expect(find(r.value, (p) => p.label === 'Peso').format).toEqual(format)
    localized(r.value, 'Peso', '1'.repeat(256))
    r.flush()
    click(r.value, 'Mostra anteprima')
    await r.until(() => vi.mocked(window.catalog.previewWeight).mock.calls.length === 1)
    expect(vi.mocked(window.catalog.previewWeight).mock.calls[0][0]).toMatchObject({
      context,
      payload: { weight: '1'.repeat(256) },
    })
  })
}
it('hook nave reale: caricamento preferenza dopo apertura non cambia la bozza, intero oltre limite non inviato', async () => {
  const r = mount(() => useVessels(archives))
  r.value.openCreate()
  r.flush()
  const original = r.value.description.numericFormat
  r.value.setDescription({
    ...r.value.description,
    registeredName: 'Nave',
    vesselTypeId: 'STANDARD',
    size: '9007199254740992',
  })
  r.flush()
  await preference(english)
  r.dirty = true
  r.flush()
  expect(r.value.description.numericFormat).toEqual(original)
  await r.value.create()
  r.flush()
  expect(window.vessels.create).not.toHaveBeenCalled()
  expect(r.value.fields.size).toContain('9007199254740991')
  r.value.setDescription({ ...r.value.description, size: '9007199254740991' })
  r.flush()
  await r.value.create()
  expect(vi.mocked(window.vessels.create).mock.calls[0][0].payload.size).toBe(9007199254740991)
  expect(vi.mocked(window.vessels.create).mock.calls[0][0].payload).not.toHaveProperty(
    'numericFormat',
  )
})
it.each([false, true])(
  'consuntivazione/correzione %s: due sostituzioni esatte, chiusura e anteprima conservate',
  async (correction) => {
    const pref = await preference(english)
    const operation = {
      id: 'op',
      vesselId: 'vessel',
      operationType: 'MOVEMENT',
      executionStatus: 'PLANNED',
      notes: null,
      endpoint: {
        portId: 'origin',
        berthId: null,
        moment: { localDateTime: '2026-11-24T09:00', offset: '+01:00' },
      },
      arrival: {
        portId: 'destination',
        berthId: null,
        moment: { localDateTime: '2026-11-24T10:00', offset: '+01:00' },
      },
      charges: [
        { economicEndpointRole: 'DEPARTURE', manualOverrideAmount: '1234.50' },
        { economicEndpointRole: 'ARRIVAL', manualOverrideAmount: '2345.60' },
      ],
    } as unknown as VesselOperationDto
    let opened = true
    const r = mount(() =>
      OperationCompletionEditor({
        operation,
        opened,
        correction,
        originalContext: context,
        archives,
        onClose: () => {
          opened = false
          r.dirty = true
        },
        onResume: vi.fn(),
        onApplied: vi.fn(),
        trigger: null,
      }),
    )
    expect(find(r.value, (p) => p.label === 'Sostituzione manuale della base (EUR)').value).toBe(
      '1234.50',
    )
    localized(r.value, 'Sostituzione manuale all’arrivo (EUR)', '2,345.678')
    r.flush()
    click(r.value, 'Verifica e mostra anteprima')
    r.flush()
    expect(window.operations.previewComplete).not.toHaveBeenCalled()
    expect(window.operations.previewCorrect).not.toHaveBeenCalled()
    localized(r.value, 'Sostituzione manuale all’arrivo (EUR)', '2,345.67')
    r.flush()
    click(r.value, 'Chiudi')
    r.flush()
    await pref.value.props.value.save(italian)
    pref.flush()
    provide(pref.value)
    opened = true
    r.dirty = true
    r.flush()
    expect(find(r.value, (p) => p.label === 'Sostituzione manuale all’arrivo (EUR)')).toMatchObject(
      { value: '2345.67', format: english },
    )
    const preview = {
      previewId: 'preview',
      blockers: [],
      before: operation,
      context,
      status: 'READY',
      expiresAtUtc: '2099-01-01T00:00:00Z',
      operationValues: operation,
    }
    const method = correction ? window.operations.previewCorrect : window.operations.previewComplete
    vi.mocked(method).mockResolvedValue(ok(preview) as never)
    click(r.value, 'Verifica e mostra anteprima')
    await r.until((v) => nodes(v).some((e) => e.props.preview === preview))
    expect(vi.mocked(method).mock.calls[0][0]).toMatchObject({
      context,
      payload: {
        id: 'op',
        values: { manualOverrideAmount: '1234.50', arrivalManualOverrideAmount: '2345.67' },
      },
    })
    await pref.value.props.value.save(english)
    pref.flush()
    provide(pref.value)
    r.dirty = true
    r.flush()
    expect(find(r.value, (p) => p.preview === preview).preview).toBe(preview)
    expect(method).toHaveBeenCalledOnce()
  },
)
it.each([italian, english])(
  'campi tariffa reali: incolla localizzata → adattatore → DTO, nessun arrotondamento %j',
  async (format) => {
    await preference(format)
    let configs = copyDraft(
      ['STANDARD', 'PASSENGER', 'ADM'].map((vesselTypeId) => ({
        vesselTypeId: vesselTypeId as 'STANDARD',
        extraWidth: 1000,
        extraValue: '1.5',
        brackets: [{ upperLimit: 1000, value: '1234.567' }],
      })),
      format,
    )
    const r = mount(() =>
      ConfigurationFields({
        value: configs,
        disabled: false,
        onChange: (value) => {
          configs = value
          r.dirty = true
        },
      }),
    )
    localized(
      r.value,
      'Valore EUR 1',
      `9${format.groupSeparator}876${format.decimalSeparator}54321`,
    )
    r.flush()
    localized(r.value, 'Limite incluso 1', '9007199254740991')
    r.flush()
    const dto = readConfigurations(configs)
    expect(dto[0].brackets[0]).toEqual({ upperLimit: 9007199254740991, value: '9876.54321' })
    expect(dto[0]).not.toHaveProperty('numericFormat')
    expect(find(r.value, (p) => p.label === 'Valore EUR 1').unit).toBe('EUR')
    localized(r.value, 'Limite incluso 1', '9007199254740992')
    r.flush()
    expect(() => readConfigurations(configs)).toThrow(/9007199254740991/)
  },
)
it.each([italian, english])(
  'presentazione del calcolo da operandi tipizzati; traccia originale conservata %j',
  async (format) => {
    await preference(format)
    const steps = ['Evidenza storica 1234.56; IMO 1234.56']
    const trace: BaseCalculationDto = {
      portId: 'port',
      vesselId: 'vessel',
      vesselVersionId: 'vessel-version',
      vesselName: 'Nave',
      vesselTypeId: 'STANDARD',
      size: 2000,
      moment: {
        localDateTime: '2026-11-24T09:00',
        zoneId: 'Europe/Rome',
        offset: '+01:00',
        utc: '2026-11-24T08:00:00.000Z',
      },
      activity: { kind: 'OPERATION', operation: 'ENTRY' },
      tariffId: 'tariff',
      tariffEffectiveFrom: '2026-01-01T00:00:00.000Z',
      configurationId: 'config',
      bracketId: 'bracket',
      weightSequenceId: 'sequence',
      weightVersionId: 'version',
      upperLimit: 1000,
      ordinaryValue: '1234.567',
      extraWidth: 1000,
      extraCount: 2000,
      extraValue: '2.34567',
      tariffValue: '9876.54321',
      weight: '1.234567',
      base: '1234.56',
      steps,
    }
    const before = structuredClone(trace)
    const r = mount(() => CalculationNumbers({ value: trace }))
    const strings = nodes(r.value)
      .flatMap((e) => (Array.isArray(e.props.children) ? e.props.children : [e.props.children]))
      .filter((v) => typeof v === 'string')
    expect(strings).toContain(format === italian ? '1.234,56 €' : '1,234.56 €')
    expect(strings).toContain(format === italian ? '1.234,567' : '1,234.567')
    expect(strings).toContain(steps[0])
    expect(trace).toEqual(before)
  },
)

// PR05 exercises the real reference adapters through editors, with the original PR04 format snapshot.
function reference(id: string, active = true, portId = 'port-new') {
  return {
    id,
    code: 1,
    status: active ? 'ACTIVE' : 'INACTIVE',
    selectable: active,
    portId,
    description: 'Tipo ' + id,
    version: {
      name: 'Nome ' + id,
      businessName: 'Nome ' + id,
      registeredName: 'Nome ' + id,
      locality: 'Genova',
      countryCode: 'IT',
    },
  }
}
function pickerProps<T extends (...args: never[]) => unknown>(
  node: ReactNode,
  type: T,
  matches: (p: Record<string, unknown>) => boolean = () => true,
) {
  const found = nodes(node).find((e) => e.type === (type as unknown) && matches(e.props))
  if (!found) throw Error('Adapter assente')
  return found.props as Parameters<T>[0]
}
it('PR05 operazioni: ricerca porto non modifica bozza; scelta tramite adapter conserva formato, contesto e DTO', async () => {
  const pref = await preference(english)
  vi.mocked(window.ports.list).mockResolvedValue(ok(page([reference('port-new')])) as never)
  vi.mocked(window.ports.get).mockResolvedValue(ok(reference('port-new')) as never)
  const r = mount(() => Operations({ archives, onDialogChange: vi.fn() }))
  await r.until((v) => find(v, (p) => p.children === 'Nuova entrata').disabled === false)
  click(r.value, 'Nuova entrata')
  r.flush()
  localized(r.value, 'Sostituzione manuale della base (EUR, facoltativa)', '1,234.50')
  r.flush()
  await pref.value.props.value.save(italian)
  pref.flush()
  provide(pref.value)
  r.dirty = true
  r.flush()
  const field = find(
    r.value,
    (p) => p.label === 'Sostituzione manuale della base (EUR, facoltativa)',
  )
  const picker = mount(
    () => PortPicker(pickerProps(r.value, PortPicker, (p) => p.label === 'Porto di arrivo')).props,
  )
  await picker.until((p) => p.page !== null)
  picker.value.onSearchChange('nuovo')
  picker.flush()
  await picker.until((p) => p.page !== null)
  expect(window.operations.previewCreate).not.toHaveBeenCalled()
  picker.value.onChange('port-new')
  r.flush()
  expect(find(r.value, (p) => p.label === field.label)).toMatchObject({
    value: '1234.50',
    format: english,
  })
  click(r.value, 'Verifica e mostra anteprima')
  await r.until(() => vi.mocked(window.operations.previewCreate).mock.calls.length === 1)
  expect(vi.mocked(window.operations.previewCreate).mock.calls[0][0]).toMatchObject({
    context,
    payload: { portId: 'port-new', manualOverrideAmount: '1234.50' },
  })
})
it('PR05 prestazioni: cliente scelto e clear tramite adapter mantengono ereditarietà, importo e contesto originale', async () => {
  await preference(english)
  vi.mocked(window.customers.list).mockResolvedValue(ok(page([reference('customer-new')])) as never)
  vi.mocked(window.customers.get).mockResolvedValue(ok(reference('customer-new')) as never)
  const r = mount(() => Services({ archives, onDialogChange: vi.fn() }))
  await r.until((v) => find(v, (p) => p.children === 'Nuova prestazione libera').disabled === false)
  click(r.value, 'Nuova prestazione libera')
  r.flush()
  localized(r.value, 'Importo base EUR', '1,234.50')
  r.flush()
  const picker = mount(
    () => SubjectPicker(pickerProps(r.value, SubjectPicker, (p) => p.kind === 'customer')).props,
  )
  await picker.until((p) => p.page !== null)
  picker.value.onChange('customer-new')
  r.flush()
  picker.dirty = true
  await picker.until((p) => p.selectedState === 'ready')
  picker.value.onChange(null)
  r.flush()
  picker.dirty = true
  picker.flush()
  expect(picker.value.placeholder).toBe('Eredita dal livello superiore')
  click(r.value, 'Registra prestazione')
  await r.until(() => vi.mocked(window.services.createFree).mock.calls.length === 1)
  expect(vi.mocked(window.services.createFree).mock.calls[0][0]).toMatchObject({
    context,
    payload: { base: '1234.50', specified: { customerId: null, agencyId: null } },
  })
})
it('PR05 calcolatore: adapter comuni in consultazione storica, ricerche non selezionano e simulazione usa solo ID confermati', async () => {
  vi.mocked(window.vessels.list).mockResolvedValue(
    ok(page([reference('historical-vessel', false)])) as never,
  )
  vi.mocked(window.vessels.get).mockResolvedValue(
    ok(reference('historical-vessel', false)) as never,
  )
  vi.mocked(window.catalog.list).mockResolvedValue(
    ok(page([reference('historical-type', false)])) as never,
  )
  vi.mocked(window.catalog.get).mockResolvedValue(ok(reference('historical-type', false)) as never)
  window.tariffs.simulateBase = vi.fn(async () => rejected())
  const r = mount(() => BaseCalculator({ context, portId: 'port' }))
  const vessel = mount(() => VesselPicker(pickerProps(r.value, VesselPicker)).props)
  await vessel.until((p) => p.page !== null)
  vessel.value.onSearchChange('ricerca')
  vessel.flush()
  r.flush()
  expect(pickerProps(r.value, VesselPicker).value).toBeNull()
  await vessel.until((p) => p.page !== null)
  expect(vessel.value.data[0].disabled).toBe(false)
  vessel.value.onChange('historical-vessel')
  r.flush()
  ;(find(r.value, (p) => p.label === 'Tipo di attività').onChange as (v: string) => void)('CATALOG')
  r.flush()
  const catalog = mount(() => CatalogPicker(pickerProps(r.value, CatalogPicker)).props)
  await catalog.until((p) => p.page !== null)
  expect(catalog.value.data[0].disabled).toBe(false)
  catalog.value.onChange('historical-type')
  r.flush()
  ;(
    find(r.value, (p) => 'moment' in p).onChange as (m: {
      localDateTime: string
      selectedOffset: null
    }) => void
  )({ localDateTime: '2026-11-24T09:00', selectedOffset: null })
  r.flush()
  click(r.value, 'Simula base')
  await r.until(() => vi.mocked(window.tariffs.simulateBase).mock.calls.length === 1)
  expect(window.tariffs.simulateBase).toHaveBeenCalledWith({
    context: { sessionId: context.sessionId },
    query: {
      portId: 'port',
      vesselId: 'historical-vessel',
      activity: { kind: 'CATALOG', serviceTypeId: 'historical-type' },
      moment: { localDateTime: '2026-11-24T09:00', selectedOffset: null },
    },
  })
  expect(window.catalog.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ query: expect.objectContaining({ status: 'ALL' }) }),
  )
})
it('PR05 assegnazioni: riferimento originale disattivato fuori pagina resta ammesso, un nuovo disattivato è vietato', async () => {
  const target = { kind: 'VOYAGE' as const, id: 'voyage' }
  window.assignments = {
    get: vi.fn(async () =>
      ok({ specified: { customerId: 'original', agencyId: null }, components: [] }),
    ),
  } as never
  vi.mocked(window.customers.get).mockImplementation(
    async (request) => ok(reference(request.query.id, false)) as never,
  )
  vi.mocked(window.customers.list).mockResolvedValue(ok(page([reference('other', false)])) as never)
  const r = mount(() =>
    AssignmentEditor({
      archives,
      target,
      opened: true,
      onClose: vi.fn(),
      onResume: vi.fn(),
      onSaved: vi.fn(),
      trigger: null,
    }),
  )
  await r.until((v) => nodes(v).some((e) => e.type === SubjectPicker))
  const picker = mount(
    () => SubjectPicker(pickerProps(r.value, SubjectPicker, (p) => p.kind === 'customer')).props,
  )
  await picker.until((p) => p.selectedState === 'ready' && p.page !== null)
  expect(picker.value.data.find((o: { value: string }) => o.value === 'original')?.disabled).toBe(
    false,
  )
  expect(picker.value.data.find((o: { value: string }) => o.value === 'other')?.disabled).toBe(true)
  picker.value.onChange(null)
  r.flush()
  expect(pickerProps(r.value, SubjectPicker, (p) => p.kind === 'customer').value).toBeNull()
})
it('PR05 correzione: retained banchina conserva nome storico e proprietario; cambio porto riesamina offset e conserva locale, formato e contesto', async () => {
  await preference(english)
  const operation = {
    id: 'op',
    vesselId: 'vessel',
    operationType: 'ENTRY',
    executionStatus: 'PLANNED',
    notes: null,
    endpoint: {
      portId: 'port-old',
      berthId: 'berth-old',
      berthName: 'Nome storico salvato',
      moment: { localDateTime: '2026-11-24T09:00', offset: '+01:00' },
    },
    arrival: null,
    charges: [{ economicEndpointRole: 'PRIMARY', manualOverrideAmount: '1234.50' }],
  } as unknown as VesselOperationDto
  vi.mocked(window.berths.history).mockResolvedValue(
    ok({ berth: reference('berth-old', false, 'port-old'), versions: page() }) as never,
  )
  const r = mount(() =>
    OperationCompletionEditor({
      operation,
      opened: true,
      correction: true,
      originalContext: context,
      archives,
      onClose: vi.fn(),
      onResume: vi.fn(),
      onApplied: vi.fn(),
      trigger: null,
    }),
  )
  const berth = mount(() => BerthPicker(pickerProps(r.value, BerthPicker)).props)
  await berth.until((p) => p.selectedState === 'ready')
  expect(berth.value.chosen.label).toBe('Nome storico salvato')
  expect(berth.value.chosen.disabled).toBe(false)
  vi.mocked(window.ports.list).mockResolvedValue(ok(page([reference('port-new')])) as never)
  const port = mount(
    () => PortPicker(pickerProps(r.value, PortPicker, (p) => p.label === 'Porto')).props,
  )
  await port.until((p) => p.page !== null)
  port.value.onChange('port-new')
  r.flush()
  expect(pickerProps(r.value, BerthPicker).retained).toBeNull()
  expect(pickerProps(r.value, BerthPicker).portId).toBe('port-new')
  click(r.value, 'Verifica e mostra anteprima')
  await r.until(() => vi.mocked(window.operations.previewCorrect).mock.calls.length === 1)
  expect(vi.mocked(window.operations.previewCorrect).mock.calls[0][0]).toMatchObject({
    context,
    payload: {
      values: {
        portId: 'port-new',
        berthId: null,
        manualOverrideAmount: '1234.50',
        moment: { localDateTime: '2026-11-24T09:00', selectedOffset: null },
      },
    },
  })
})
