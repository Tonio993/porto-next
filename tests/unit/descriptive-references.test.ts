import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { BerthService } from '../../src/backend/application/berths/berth-service'
import { CustomerService } from '../../src/backend/application/customers/customer-service'
import { AgencyService } from '../../src/backend/application/agencies/agency-service'
import { TariffService } from '../../src/backend/application/tariffs/tariff-service'
import { OperationService } from '../../src/backend/application/operations/operation-service'
import { ServiceService } from '../../src/backend/application/services/service-service'
import { AssignmentService } from '../../src/backend/application/operations/assignment-service'
import { CatalogService } from '../../src/backend/application/catalog/catalog-service'
import { TimeService } from '../../src/backend/application/time/time-service'
import { DescriptiveReferenceRepository } from '../../src/backend/infrastructure/database/descriptive-reference-repository'
import { effectFieldLabel } from '../../src/shared/description-labels'
import type { ChangePreviewDto } from '../../src/shared/contracts/master-data'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { CreateOperationDto } from '../../src/shared/contracts/operations'

let folder: string,
  archives: ArchiveService,
  ports: PortService,
  vessels: VesselService,
  berths: BerthService,
  operations: OperationService,
  services: ServiceService,
  tariffs: TariffService,
  customers: CustomerService,
  agencies: AgencyService,
  assignments: AssignmentService,
  catalog: CatalogService
let portId: string, vesselId: string, berthId: string
const value = <T>(r: ApplicationResult<T>): T => {
  if (!r.ok) throw Error(JSON.stringify(r.error))
  return r.value
}
const context = () => archives.context()!
const db = () => archives.coordinator.requireSession().database
const moment = (localDateTime: string) => ({ localDateTime, selectedOffset: null })
const query = () => ({ sessionId: context().sessionId })
const readOperation = (id: string) =>
  operations.get({ context: query(), query: { id } }).then(value)
const readService = (id: string) => services.get({ context: query(), query: { id } }).then(value)
const entry = (at = '2026-06-01T12:00'): CreateOperationDto => ({
  operationType: 'ENTRY',
  vesselId,
  portId,
  berthId,
  moment: moment(at),
  executionStatus: 'PERFORMED',
  notes: null,
  manualOverrideAmount: null,
})
async function createOperation(input = entry()) {
  const p = value(await operations.previewCreate({ context: context(), payload: input }))
  return value(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
}
async function free(at = '2026-06-01T13:00', customerId: string | null = null) {
  return value(
    await services.createFree({
      context: context(),
      payload: {
        vesselId,
        interpretationPortId: null,
        moment: moment(at),
        executionStatus: 'PLANNED',
        description: 'Assistenza',
        base: '1234.56',
        notes: null,
        specified: { customerId, agencyId: null },
      },
    }),
  )
}
async function vesselVersion(at: string, name: string) {
  const p = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        registeredName: name,
        imoNumber: 'IMO-stabile',
        vesselTypeId: 'STANDARD',
        size: 100,
        moment: moment(at),
      },
    }),
  )
  value(await vessels.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  return p
}
function checkLabels(preview: ChangePreviewDto) {
  for (const e of preview.effects.items)
    for (const c of e.changes)
      expect(effectFieldLabel(e.reference.kind, c.field)).not.toBe('Altro dato modificato')
}
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-pr07-'))
  archives = new ArchiveService()
  await archives.create(join(folder, 'a.ormeggi'), 'PR07')
  const c = archives.coordinator
  ports = new PortService(c)
  vessels = new VesselService(c)
  berths = new BerthService(c)
  operations = new OperationService(c)
  services = new ServiceService(c)
  tariffs = new TariffService(c)
  customers = new CustomerService(c)
  agencies = new AgencyService(c)
  assignments = new AssignmentService(c)
  catalog = new CatalogService(c)
  value(
    await new TimeService(c).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  portId = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Porto omonimo',
        locality: 'Genova',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  ).id
  vesselId = value(
    await vessels.create({
      context: context(),
      payload: {
        registeredName: 'Aurora storica',
        imoNumber: 'IMO-stabile',
        vesselTypeId: 'STANDARD',
        size: 100,
      },
    }),
  ).id
  berthId = value(
    await berths.create({ context: context(), payload: { portId, name: 'Molo omonimo' } }),
  ).id
  const p = value(
    await tariffs.previewCreate({
      context: context(),
      payload: {
        portId,
        moment: moment('2026-01-01T00:00'),
        configurations: (['STANDARD', 'PASSENGER', 'ADM'] as const).map((vesselTypeId) => ({
          vesselTypeId,
          brackets: [{ upperLimit: 5000, value: '1234.56' }],
          extraWidth: 100,
          extraValue: '10',
        })),
      },
    }),
  )
  value(await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
  vi.restoreAllMocks()
})

it('PR07 omonimi consentiti su pagine e filtri diversi: tuple dei porti e proprietari delle banchine', async () => {
  const second = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Porto omonimo',
        locality: 'Livorno',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  )
  const b = value(
    await berths.create({
      context: context(),
      payload: { portId: second.id, name: 'Molo omonimo' },
    }),
  )
  const firstPage = value(
    await ports.list({ context: query(), query: { search: 'omonimo', page: 1, pageSize: 1 } }),
  )
  const secondPage = value(
    await ports.list({ context: query(), query: { search: 'omonimo', page: 2, pageSize: 1 } }),
  )
  expect(firstPage.total).toBe(2)
  expect(firstPage.items[0].version.name).toBe(secondPage.items[0].version.name)
  expect(firstPage.items[0].version.locality).not.toBe(secondPage.items[0].version.locality)
  const old = value(
    await berths.history({ context: query(), query: { id: berthId, page: 1, pageSize: 1 } }),
  ).berth
  expect(old.portLabel).toBe('Porto omonimo · Genova · IT')
  expect(b.portLabel).toBe('Porto omonimo · Livorno · IT')
  expect(b.id).not.toBe(old.id)
  expect(b.code).not.toBe(old.code)
})
it('PR07 non inventa omonimi vietati: prenotazioni di clienti, agenzie e nomi nave restano autorevoli', async () => {
  for (const service of [customers, agencies]) {
    value(
      await service.create({ context: context(), payload: { businessName: 'Impresa riservata' } }),
    )
    expect(
      await service.create({ context: context(), payload: { businessName: 'Impresa riservata' } }),
    ).toMatchObject({ ok: false, error: { code: 'DUPLICATE_IDENTIFIER' } })
  }
  expect(
    await vessels.create({
      context: context(),
      payload: { registeredName: 'Aurora storica', imoNumber: null, vesselTypeId: 'ADM', size: 0 },
    }),
  ).toMatchObject({ ok: false, error: { code: 'DUPLICATE_IDENTIFIER' } })
})
it('PR07 riferimenti iniziale, storico, corrente e futuro con validità e tupla originale', async () => {
  const initial = value(await vessels.get({ context: query(), query: { id: vesselId } })).version.id
  await vesselVersion('2026-05-01T00:00', 'Aurora maggio')
  await vesselVersion('2026-09-01T00:00', 'Aurora corrente')
  await vesselVersion('2027-01-01T00:00', 'Aurora futura')
  const h = value(
    await vessels.history({ context: query(), query: { id: vesselId, page: 1, pageSize: 100 } }),
  )
  const r = new DescriptiveReferenceRepository(db(), '2026-11-24T00:00:00.000Z')
  expect(r.version('VESSEL', initial)).toMatchObject({
    name: 'Aurora storica · IMO IMO-stabile',
    effectiveFrom: null,
    effectiveTo: '2026-04-30T22:00:00.000Z',
  })
  for (const v of h.versions.items) {
    const d = r.version('VESSEL', v.id)!
    expect(d.effectiveFrom).toBe(v.effectiveFrom)
    expect(d.effectiveTo).toBe(v.effectiveTo)
    expect(d.effectiveMoment).toEqual(v.effectiveMoment)
    expect(d.name).toContain(v.registeredName)
  }
  expect(h.versions.items.map((v) => v.phase)).toEqual(
    expect.arrayContaining(['HISTORICAL', 'CURRENT', 'FUTURE']),
  )
})
it('PR07 una rinomina successiva e disattivazione non riscrivono la nave applicata', async () => {
  const saved = await createOperation()
  const original = await readOperation(saved.id)
  await vesselVersion('2026-07-01T00:00', 'Aurora rinominata')
  const p = value(
    await vessels.preview({
      context: context(),
      payload: { operation: 'DEACTIVATE_VESSEL', vesselId },
    }),
  )
  value(await vessels.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  const historical = await readOperation(saved.id)
  expect(historical.charges[0].calculation.vesselName).toBe('Aurora storica')
  expect(historical.endpoint.references?.vessel?.name).toBe(
    original.endpoint.references?.vessel?.name,
  )
  expect(historical.vesselId).toBe(vesselId)
  expect(historical.endpoint.vesselVersionId).toBe(saved.endpoint.vesselVersionId)
  expect(value(await vessels.get({ context: query(), query: { id: vesselId } }))).toMatchObject({
    selectable: false,
    version: { registeredName: 'Aurora rinominata' },
  })
})
it('PR07 catalogo corrente distinto dalla nave storicamente applicata e ID invariati', async () => {
  await createOperation()
  const type = value(
    await catalog.create({
      context: context(),
      payload: { description: 'Tipo originario', initialWeight: '1' },
    }),
  )
  const saved = value(
    await services.createCatalog({
      context: context(),
      payload: {
        vesselId,
        interpretationPortId: null,
        moment: moment('2026-06-01T13:00'),
        executionStatus: 'PERFORMED',
        serviceTypeId: type.id,
        notes: null,
        specified: { customerId: null, agencyId: null },
      },
    }),
  )
  const p = value(
    await catalog.preview({
      context: context(),
      payload: { operation: 'RENAME', id: type.id, description: 'Tipo corrente' },
    }),
  )
  value(await catalog.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  await vesselVersion('2026-07-01T00:00', 'Aurora successiva')
  const read = await readService(saved.id)
  expect(read.description).toBe('Tipo corrente')
  expect(read.calculation?.references?.activity).toBe('Tipo corrente')
  expect(read.vesselName).toBe('Aurora storica')
  expect(read.references?.vessel?.name).toContain('Aurora storica')
  expect(read.serviceTypeId).toBe(type.id)
  expect(read.vesselVersionId).toBe(saved.vesselVersionId)
})
it('PR07 soggetti: versione applicata, eredità dal viaggio e componenti con origine leggibile', async () => {
  const op = await createOperation(),
    c = value(
      await customers.create({ context: context(), payload: { businessName: 'Cliente storico' } }),
    )
  const stay = value(
    await operations.stays({ context: query(), query: { vesselId, page: 1, pageSize: 25 } }),
  ).items[0]
  const p = value(
    await assignments.preview({
      context: context(),
      payload: {
        target: { kind: 'VOYAGE', id: stay.id },
        specified: { customerId: c.id, agencyId: null },
      },
    }),
  )
  checkLabels(p)
  value(await assignments.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  const s = await free()
  expect(s.subjects.customer).toMatchObject({
    id: c.id,
    versionId: c.version.id,
    source: { kind: 'VOYAGE', id: stay.id },
    description: {
      version: { name: 'Cliente storico' },
      origin: { name: expect.stringContaining('Aurora storica') },
    },
  })
  const a = value(
    await assignments.get({ context: query(), query: { kind: 'VESSEL_OPERATION', id: op.id } }),
  )
  expect(a.components[0].label).toContain('Entrata')
  expect(a.components[0].subjects.customer?.description?.origin).toEqual(
    s.subjects.customer?.description?.origin,
  )
})
it('PR07 permanenze e contesto: nave, porto, banchina e apertura/chiusura ai rispettivi estremi', async () => {
  const op = await createOperation()
  const end = await createOperation({
    operationType: 'EXIT',
    vesselId,
    interpretationPortId: null,
    moment: moment('2026-06-02T12:00'),
    executionStatus: 'PERFORMED',
    notes: null,
    manualOverrideAmount: null,
  })
  const v = value(
    await operations.stays({ context: query(), query: { vesselId, page: 1, pageSize: 25 } }),
  ).items[0]
  expect(v.reference?.opening.moment).toEqual(op.endpoint.moment)
  expect(v.reference?.closing?.moment).toEqual(end.endpoint.moment)
  expect(v.visits[0].stays[0].reference?.name).toContain('Molo omonimo')
  const c = value(
    await operations.contextAt({
      context: query(),
      query: { vesselId, instant: '2026-06-01T11:00:00.000Z' },
    }),
  )
  expect(c.references?.voyage?.name).toContain('Aurora storica')
  expect(c.voyageId).toBe(v.id)
})
it('PR07 anteprima reale: ID scalari conservati e proiettati, enum e campi prodotti hanno etichette', async () => {
  const p = value(await operations.previewCreate({ context: context(), payload: entry() }))
  checkLabels(p)
  const component = p.effects.items.find((e) => e.reference.kind === 'OPERATION_CHARGE')!
  expect(component.reference.label).toContain('Entrata')
  expect(component.reference.label).not.toContain('ENTRY')
  expect(component.changes.find((c) => c.field === 'port')).toMatchObject({
    after: portId,
    afterReference: 'Porto omonimo',
  })
  const saved = value(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(saved.id).toBe(p.operationValues.id)
  expect(saved.charges[0].id).toBe(p.operationValues.charges[0].id)
  const v = await vesselVersion('2026-05-01T00:00', 'Aurora applicata')
  checkLabels(v)
  const projected = v.effects.items
    .flatMap((e) => e.changes)
    .find((c) => c.field === 'vesselVersionId' && c.afterReference)
  expect(projected?.after).toBeTruthy()
  expect(projected?.afterReference).toMatchObject({
    name: 'Aurora applicata',
    effectiveFrom: '2026-04-30T22:00:00.000Z',
  })
})
it('PR07 letture correlate senza scritture: query_only, revisione, timestamp e serializzazione SQLite invariati', async () => {
  const op = await createOperation()
  const s = await free()
  const metadata = db().metadata(),
    snapshot = db().sqlite.serialize(),
    total = db().sqlite.prepare('SELECT total_changes()').pluck().get()
  db().sqlite.pragma('query_only=ON')
  try {
    await readOperation(op.id)
    await readService(s.id)
    value(await operations.stays({ context: query(), query: { vesselId, page: 1, pageSize: 25 } }))
    value(await services.list({ context: query(), query: { page: 1, pageSize: 25 } }))
  } finally {
    db().sqlite.pragma('query_only=OFF')
  }
  expect(db().metadata()).toEqual(metadata)
  expect(db().sqlite.serialize()).toEqual(snapshot)
  expect(db().sqlite.prepare('SELECT total_changes()').pluck().get()).toBe(total)
})
it('PR07 riferimenti assenti, errori e sessione superata non producono descrizioni inventate', async () => {
  const r = new DescriptiveReferenceRepository(db(), new Date().toISOString())
  expect(r.version('VESSEL', randomUUID())).toBeNull()
  expect(r.origin('VOYAGE', randomUUID())).toBeNull()
  expect(await readOperation(randomUUID()).catch((e) => e.message)).toContain('NOT_FOUND')
  const op = await createOperation(),
    old = query()
  await archives.saveAs(join(folder, 'copy.ormeggi'))
  expect(await operations.get({ context: old, query: { id: op.id } })).toMatchObject({
    ok: false,
    error: { code: 'ARCHIVE_SESSION_CHANGED' },
  })
})

it.each([
  'PORT',
  'BERTH',
  'CUSTOMER',
  'AGENCY',
  'TARIFF',
  'WEIGHT',
  'CATALOG',
  'CORRECT',
  'DELETE',
  'INSERT',
  'SERVICE',
] as const)(
  'PR07 campi ed enum dai produttori reali %s, senza chiavi non censite',
  async (family) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const op = await createOperation()
    let preview: ChangePreviewDto | null = null
    if (family === 'PORT')
      preview = value(
        await ports.previewInsertVersion({
          context: context(),
          payload: {
            portId,
            name: 'Porto nuovo',
            locality: 'Genova',
            countryCode: 'IT',
            moment: moment('2026-05-01T00:00'),
          },
        }),
      )
    if (family === 'BERTH')
      preview = value(
        await berths.preview({
          context: context(),
          payload: {
            operation: 'INSERT_VERSION',
            berthId,
            name: 'Molo nuovo',
            moment: moment('2026-05-01T00:00'),
          },
        }),
      )
    if (family === 'CUSTOMER' || family === 'AGENCY') {
      const service = family === 'CUSTOMER' ? customers : agencies
      const s = value(
        await service.create({
          context: context(),
          payload: { businessName: 'Soggetto originario' },
        }),
      )
      const target =
        family === 'CUSTOMER'
          ? { customerId: s.id, agencyId: null }
          : { customerId: null, agencyId: s.id }
      const a = value(
        await assignments.preview({
          context: context(),
          payload: { target: { kind: 'VESSEL_OPERATION', id: op.id }, specified: target },
        }),
      )
      value(await assignments.confirm({ context: a.context, payload: { previewId: a.previewId } }))
      preview =
        family === 'CUSTOMER'
          ? value(
              await customers.preview({
                context: context(),
                payload: {
                  operation: 'INSERT_VERSION',
                  customerId: s.id,
                  businessName: 'Soggetto nuovo',
                  moment: moment('2026-05-01T00:00'),
                },
              }),
            )
          : value(
              await agencies.preview({
                context: context(),
                payload: {
                  operation: 'INSERT_VERSION',
                  agencyId: s.id,
                  businessName: 'Soggetto nuovo',
                  moment: moment('2026-05-01T00:00'),
                },
              }),
            )
    }
    if (family === 'TARIFF') {
      const t = value(
        await tariffs.get({ context: query(), query: { id: op.charges[0].calculation.tariffId } }),
      )
      preview = value(
        await tariffs.previewUpdate({
          context: context(),
          payload: {
            id: t.id,
            moment: moment('2026-01-01T00:00'),
            configurations: t.configurations
              .map((c) => ({ ...c, brackets: c.brackets.map((b) => ({ ...b, value: '2345.67' })) }))
              .map(({ vesselTypeId, brackets, extraWidth, extraValue }) => ({
                vesselTypeId,
                brackets: brackets.map(({ upperLimit, value }) => ({ upperLimit, value })),
                extraWidth,
                extraValue,
              })),
          },
        }),
      )
    }
    if (family === 'WEIGHT') {
      const w = value(await catalog.fixedWeights({ context: query(), query: null }))[0]
      preview = value(
        await catalog.previewWeight({
          context: context(),
          payload: {
            operation: 'INSERT',
            sequenceId: w.initialWeight.sequenceId,
            weight: '2.25',
            moment: moment('2026-05-01T00:00'),
          },
        }),
      )
    }
    if (family === 'CATALOG') {
      const t = value(
        await catalog.create({
          context: context(),
          payload: { description: 'Tipo da rinominare', initialWeight: '1' },
        }),
      )
      preview = value(
        await catalog.preview({
          context: context(),
          payload: { operation: 'RENAME', id: t.id, description: 'Tipo rinominato' },
        }),
      )
    }
    if (family === 'CORRECT')
      preview = value(
        await operations.previewCorrect({
          context: context(),
          payload: { id: op.id, values: { ...entry('2026-06-01T12:30'), notes: 'Correzione' } },
        }),
      )
    if (family === 'DELETE')
      preview = value(
        await operations.previewDelete({ context: context(), payload: { id: op.id } }),
      )
    if (family === 'INSERT')
      preview = value(
        await operations.previewInsert({
          context: context(),
          payload: { ...entry('2026-05-01T12:00'), executionStatus: 'MISSED' },
        }),
      )
    if (family === 'SERVICE') {
      const s = await free()
      const p = value(
        await services.preview({
          context: context(),
          payload: {
            operation: 'UPDATE_FREE',
            id: s.id,
            values: {
              vesselId,
              interpretationPortId: null,
              moment: moment('2026-06-01T13:15'),
              executionStatus: 'PLANNED',
              description: 'Assistenza corretta',
              base: '2345.67',
              notes: 'Nota',
              specified: { customerId: null, agencyId: null },
            },
          },
        }),
      )
      for (const field of p.changedFields)
        expect(effectFieldLabel('SERVICE_ACTIVITY', field)).not.toBe('Altro dato modificato')
    }
    if (preview) {
      expect(preview.effects.total).toBeGreaterThan(0)
      checkLabels(preview)
    }
    expect(warning.mock.calls.filter((c) => c[0] === 'Campo di anteprima inatteso')).toEqual([])
  },
)

it('PR07 un istante di osservazione e cache per letture correlate, senza lookup ripetuti', async () => {
  const original = value(await ports.get({ context: query(), query: { id: portId } }))
  const p = value(
    await ports.previewInsertVersion({
      context: context(),
      payload: {
        portId,
        name: 'Porto dopo il confine',
        locality: 'Genova',
        countryCode: 'IT',
        moment: moment('2026-07-01T00:00'),
      },
    }),
  )
  value(
    await ports.confirmInsertVersion({ context: p.context, payload: { previewId: p.previewId } }),
  )
  const r = new DescriptiveReferenceRepository(db(), '2026-06-01T00:00:00.000Z')
  const prepare = vi.spyOn(db().sqlite, 'prepare')
  expect(r.identity('PORT', portId)).toContain(original.version.name)
  const version = r.version('PORT', original.version.id),
    count = prepare.mock.calls.length
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2027-01-01T00:00:00.000Z'))
  expect(r.identity('PORT', portId)).toContain(original.version.name)
  expect(r.version('PORT', original.version.id)).toBe(version)
  expect(prepare).toHaveBeenCalledTimes(count)
})

it('PR07 soggetto storico dopo rinomina successiva e disattivazione: versione e origine restano applicate', async () => {
  const op = await createOperation()
  const customer = value(
    await customers.create({ context: context(), payload: { businessName: 'Cliente applicato' } }),
  )
  const s = await free('2026-06-01T13:00', customer.id)
  const p = value(
    await customers.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        customerId: customer.id,
        businessName: 'Cliente successivo',
        moment: moment('2026-07-01T00:00'),
      },
    }),
  )
  value(await customers.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  const assignment = value(
    await assignments.preview({
      context: context(),
      payload: {
        target: { kind: 'VESSEL_OPERATION', id: op.id },
        specified: { customerId: customer.id, agencyId: null },
      },
    }),
  )
  expect(
    assignment.effects.items.flatMap((e) => e.changes).find((c) => c.field === 'customerId')
      ?.afterReference,
  ).toMatchObject({
    kind: 'CUSTOMER',
    name: 'Cliente applicato',
    effectiveTo: '2026-06-30T22:00:00.000Z',
  })
  const off = value(
    await customers.preview({
      context: context(),
      payload: { operation: 'DEACTIVATE_CUSTOMER', customerId: customer.id },
    }),
  )
  value(await customers.confirm({ context: off.context, payload: { previewId: off.previewId } }))
  const read = await readService(s.id)
  expect(read.subjects.customer).toMatchObject({
    id: customer.id,
    versionId: customer.version.id,
    businessName: 'Cliente applicato',
    source: { kind: 'SERVICE_ACTIVITY', id: s.id },
    description: {
      version: { name: 'Cliente applicato', effectiveTo: '2026-06-30T22:00:00.000Z' },
      origin: { name: expect.stringContaining('Assistenza') },
    },
  })
  expect(
    value(await customers.get({ context: query(), query: { id: customer.id } })),
  ).toMatchObject({ selectable: false, version: { businessName: 'Cliente successivo' } })
})
it('PR07 porto e banchina applicati mantengono i nomi storici, compreso il proprietario, dopo rinomina', async () => {
  const op = await createOperation()
  const p = value(
    await ports.previewInsertVersion({
      context: context(),
      payload: {
        portId,
        name: 'Porto successivo',
        locality: 'Genova',
        countryCode: 'IT',
        moment: moment('2026-07-01T00:00'),
      },
    }),
  )
  value(
    await ports.confirmInsertVersion({ context: p.context, payload: { previewId: p.previewId } }),
  )
  const b = value(
    await berths.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        berthId,
        name: 'Molo successivo',
        moment: moment('2026-07-01T00:00'),
      },
    }),
  )
  value(await berths.confirm({ context: b.context, payload: { previewId: b.previewId } }))
  const read = await readOperation(op.id)
  expect(read.endpoint.references?.port?.name).toBe('Porto omonimo · Genova · IT')
  expect(read.endpoint.references?.berth?.name).toBe(
    'Molo omonimo · Porto proprietario (codice 1) · Porto omonimo · Genova · IT',
  )
  expect(read.endpoint.references?.berth?.name).toContain('Porto omonimo')
  expect(read.endpoint.references?.berth?.name).not.toContain('successivo')
  expect(read.endpoint.portVersionId).toBe(op.endpoint.portVersionId)
  expect(read.endpoint.berthVersionId).toBe(op.endpoint.berthVersionId)
  const deletion = value(
    await tariffs.previewDelete({
      context: context(),
      payload: { id: op.charges[0].calculation.tariffId },
    }),
  )
  expect(deletion.blockers.some((b) => b.reason.includes('Porto omonimo · Genova · IT'))).toBe(true)
  expect(deletion.blockers.every((b) => !b.reason.includes('Porto successivo'))).toBe(true)
})

it('PR07 componenti nello stesso minuto: intestazioni riferite alla nave e al porto corretti', async () => {
  const first = await createOperation()
  const other = value(
    await vessels.create({
      context: context(),
      payload: {
        registeredName: 'Aurora seconda',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 100,
      },
    }),
  )
  const second = await createOperation({ ...entry(), vesselId: other.id })
  const tariff = value(
    await tariffs.get({ context: query(), query: { id: first.charges[0].calculation.tariffId } }),
  )
  const p = value(
    await tariffs.previewUpdate({
      context: context(),
      payload: {
        id: tariff.id,
        moment: moment('2026-01-01T00:00'),
        configurations: tariff.configurations.map((c) => ({
          vesselTypeId: c.vesselTypeId,
          extraWidth: c.extraWidth,
          extraValue: c.extraValue,
          brackets: c.brackets.map((b) => ({ upperLimit: b.upperLimit, value: '2222.00' })),
        })),
      },
    }),
  )
  const old = p.effects.items.find((e) => e.reference.id === first.charges[0].id)!,
    next = p.effects.items.find((e) => e.reference.id === second.charges[0].id)!
  expect(old.reference.description).toMatchObject({
    name: expect.stringContaining('Aurora storica'),
    moment: first.endpoint.moment,
  })
  expect(next.reference.description).toMatchObject({
    name: expect.stringContaining('Aurora seconda'),
    moment: second.endpoint.moment,
  })
  expect(old.reference.description).toMatchObject({
    name: expect.stringContaining('Porto omonimo · Genova · IT'),
  })
  expect(first.endpoint.moment.utc).toBe(second.endpoint.moment.utc)
})
it('PR07 correzione con nave e momento diversi: il riferimento scalare usa la versione proposta applicabile', async () => {
  const op = await createOperation()
  const target = value(
    await vessels.create({
      context: context(),
      payload: {
        registeredName: 'Boreale iniziale',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 100,
      },
    }),
  )
  const version = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId: target.id,
        registeredName: 'Boreale successiva',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 100,
        moment: moment('2026-07-01T00:00'),
      },
    }),
  )
  value(
    await vessels.confirm({ context: version.context, payload: { previewId: version.previewId } }),
  )
  const before = context()
  const p = value(
    await operations.previewCorrect({
      context: context(),
      payload: { id: op.id, values: { ...entry('2026-08-01T12:00'), vesselId: target.id } },
    }),
  )
  const changed = p.effects.items.flatMap((e) => e.changes).find((c) => c.field === 'Nave')!
  expect(changed.after).toContain(target.id)
  expect(changed.afterReference).toMatchObject({
    kind: 'VESSEL',
    name: 'Boreale successiva',
    effectiveFrom: '2026-06-30T22:00:00.000Z',
  })
  expect(p.operationValues.vesselVersionId).toBe(
    value(
      await vessels.versionAt({
        context: query(),
        query: { vesselId: target.id, instant: p.operationValues.endpoint.moment.utc },
      }),
    ).id,
  )
  expect(context()).toEqual(before)
  expect((await readOperation(op.id)).vesselId).toBe(vesselId)
})
