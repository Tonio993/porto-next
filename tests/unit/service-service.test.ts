import * as serviceCalculation from '../../src/backend/application/services/service-calculation'
import * as subjectResolution from '../../src/backend/application/operations/subject-resolution'
import { CatalogService } from '../../src/backend/application/catalog/catalog-service'
import { CatalogRepository } from '../../src/backend/infrastructure/database/catalog-repository'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { BerthService } from '../../src/backend/application/berths/berth-service'
import { TariffService } from '../../src/backend/application/tariffs/tariff-service'
import { AssignmentService } from '../../src/backend/application/operations/assignment-service'
import { CustomerService } from '../../src/backend/application/customers/customer-service'
import { AgencyService } from '../../src/backend/application/agencies/agency-service'
import { TimeService } from '../../src/backend/application/time/time-service'
import { OperationService } from '../../src/backend/application/operations/operation-service'
import { OperationRepository } from '../../src/backend/infrastructure/database/operation-repository'
import { ServiceService } from '../../src/backend/application/services/service-service'
import { ServiceRepository } from '../../src/backend/infrastructure/database/service-repository'
import { foreignReferences } from '../../src/backend/infrastructure/database/port-references'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { CreateOperationDto } from '../../src/shared/contracts/operations'
import type {
  ServiceActivityDto,
  ServiceChange,
  ServiceListQuery,
  CreateCatalogServiceDto,
  CreateFreeServiceDto,
} from '../../src/shared/contracts/services'
import type { AssignmentTarget } from '../../src/shared/contracts/assignments'
let folder: string,
  archives: ArchiveService,
  operations: OperationService,
  services: ServiceService,
  portId: string,
  vesselId: string,
  berthId: string
const value = <R extends ApplicationResult<unknown>>(r: R): Extract<R, { ok: true }>['value'] => {
  if (!r.ok) throw Error(`${r.error.code}: ${r.error.message}`)
  return r.value as Extract<R, { ok: true }>['value']
}
const context = () => archives.context()!,
  db = () => archives.coordinator.requireSession().database,
  sql = () => db().sqlite
const moment = (localDateTime: string, selectedOffset: string | null = null) => ({
  localDateTime,
  selectedOffset,
})
const failure = (code: string) => ({ ok: false, error: { code } })
const all = () => new ServiceRepository(db()).all()
async function operation(payload: CreateOperationDto) {
  const p = value(await operations.previewCreate({ context: context(), payload }))
  return value(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
}
const entry = (at = '2026-06-01T12:00', p = portId): CreateOperationDto => ({
  operationType: 'ENTRY',
  vesselId,
  portId: p,
  berthId: null,
  moment: moment(at),
  executionStatus: 'PERFORMED',
  manualOverrideAmount: null,
  notes: null,
})
const exit = (at = '2026-06-01T18:00'): CreateOperationDto => ({
  operationType: 'EXIT',
  vesselId,
  interpretationPortId: null,
  moment: moment(at),
  executionStatus: 'PERFORMED',
  manualOverrideAmount: null,
  notes: null,
})
const move = (
  at = '2026-06-01T14:00',
  arrival = '2026-06-01T15:00',
  p = portId,
  b: string | null = berthId,
): CreateOperationDto => ({
  operationType: 'MOVEMENT',
  vesselId,
  interpretationPortId: null,
  destinationPortId: p,
  destinationBerthId: b,
  moment: moment(at),
  arrivalMoment: moment(arrival),
  executionStatus: 'PERFORMED',
  manualOverrideAmount: null,
  notes: null,
})
const input = (at = '2026-06-01T13:00'): CreateFreeServiceDto => ({
  vesselId,
  interpretationPortId: null,
  moment: moment(at),
  executionStatus: 'PLANNED',
  description: 'Assistenza straordinaria',
  base: '123.45',
  notes: null,
  specified: { customerId: null, agencyId: null },
})
const create = (p = input()) => services.createFree({ context: context(), payload: p })
async function tariff(p = portId) {
  const service = new TariffService(archives.coordinator)
  const pre = value(
    await service.previewCreate({
      context: context(),
      payload: {
        portId: p,
        moment: moment('2026-01-01T00:00'),
        configurations: (['STANDARD', 'PASSENGER', 'ADM'] as const).map((vesselTypeId) => ({
          vesselTypeId,
          brackets: [{ upperLimit: 5000, value: '100' }],
          extraWidth: 100,
          extraValue: '1',
        })),
      },
    }),
  )
  value(
    await service.confirmCreate({ context: pre.context, payload: { previewId: pre.previewId } }),
  )
}
const ports = () => new PortService(archives.coordinator),
  vessels = () => new VesselService(archives.coordinator),
  customers = () => new CustomerService(archives.coordinator),
  agencies = () => new AgencyService(archives.coordinator)
async function port(name = 'Genova', zone = 'Europe/Rome') {
  return value(
    await ports().create({
      context: context(),
      payload: { name, locality: name, countryCode: 'IT', initialZoneId: zone },
    }),
  ).id
}
async function assign(
  target: AssignmentTarget,
  customerId: string | null = null,
  agencyId: string | null = null,
) {
  const service = new AssignmentService(archives.coordinator)
  const pre = value(
    await service.preview({
      context: context(),
      payload: { target, specified: { customerId, agencyId } },
    }),
  )
  value(await service.confirm({ context: pre.context, payload: { previewId: pre.previewId } }))
  return pre
}
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p14-'))
  archives = new ArchiveService()
  await archives.create(join(folder, 'active.ormeggi'), 'P14')
  operations = new OperationService(archives.coordinator)
  services = new ServiceService(archives.coordinator)
  portId = await port()
  vesselId = value(
    await vessels().create({
      context: context(),
      payload: { registeredName: 'Nave', imoNumber: null, vesselTypeId: 'STANDARD', size: 100 },
    }),
  ).id
  berthId = value(
    await new BerthService(archives.coordinator).create({
      context: context(),
      payload: { portId, name: 'Molo' },
    }),
  ).id
  await tariff()
  await operation(entry())
})
afterEach(async () => {
  vi.restoreAllMocks()
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})
it('FREE: stati, stesso minuto, banchina assente, soggetti opzionali, importo int64, query e riapertura', async () => {
  const before = context(),
    metadata = db().metadata()
  for (const executionStatus of ['PLANNED', 'PERFORMED', 'MISSED'] as const) {
    const saved = value(await create({ ...input(), executionStatus, base: '92233720368547758.07' }))
    expect(saved).toMatchObject({
      category: 'FREE',
      executionStatus,
      base: '92233720368547758.07',
      context: { portId, berthId: null },
      subjects: { customer: null, agency: null },
    })
  }
  expect(BigInt(context().revision)).toBe(BigInt(before.revision) + 3n)
  const after = context()
  expect(
    value(
      await services.list({
        context: { sessionId: after.sessionId },
        query: { vesselId, page: 1, pageSize: 2 },
      }),
    ),
  ).toMatchObject({ total: 3, items: [{}, {}] })
  expect(
    value(
      await services.get({ context: { sessionId: after.sessionId }, query: { id: all()[0].id } }),
    ),
  ).toEqual(all()[0])
  expect(context()).toEqual(after)
  expect(db().metadata().createdAt).toBe(metadata.createdAt)
  const original = all()
  await archives.close()
  await archives.open(join(folder, 'active.ormeggi'))
  expect(all()).toEqual(original)
})
it.each([
  { base: '0.00' },
  { base: '-1.00' },
  { base: '1e2' },
  { base: '1.234' },
  { description: '  ' },
  { description: 'x'.repeat(1001) },
  { notes: 'x'.repeat(10001) },
  { executionStatus: 'UNKNOWN' },
  { specified: { customerId: null, agencyId: null, extra: 1 } },
  { category: 'CATALOG' },
  { unexpected: true },
])('rifiuta input IPC invalido senza scritture: %j', async (patch) => {
  const before = context(),
    metadata = db().metadata()
  expect(await create({ ...input(), ...patch } as CreateFreeServiceDto)).toMatchObject(
    failure('VALIDATION_ERROR'),
  )
  expect(all()).toEqual([])
  expect(context()).toEqual(before)
  expect(db().metadata()).toEqual(metadata)
})
it('nessuna tariffa al proprio istante; tariffa operativa resta obbligatoria', async () => {
  const p = await port('Porto senza tariffa')
  expect(
    await operations.previewCreate({
      context: context(),
      payload: move('2026-07-01T12:00', '2026-07-01T13:00', p, null),
    }),
  ).toMatchObject(failure('TARIFF_NOT_FOUND'))
  // Fixture: tariffa resa non applicabile al momento della prestazione; il servizio non la consulta.
  sql()
    .prepare(
      "UPDATE tariffs SET effective_from='2026-06-01T12:00:00.000Z',effective_local_date_time='2026-06-01T14:00',effective_utc_offset='+02:00'",
    )
    .run()
  value(await create(input('2026-06-01T12:00')))
  expect(all()).toHaveLength(1)
})
it('confini inclusivi, trasferimento interno vietato, versione e ormeggio destinazione all’arrivo', async () => {
  await operation(move())
  await operation(exit())
  const at = async (time: string) => value(await create(input('2026-06-01T' + time)))
  const e = await at('12:00'),
    departure = await at('14:00'),
    arrival = await at('15:00'),
    end = await at('18:00')
  expect(e.context.berthStayId).toBe(departure.context.berthStayId)
  expect(arrival.context.berthStayId).toBe(end.context.berthStayId)
  expect(arrival.context.berthId).toBe(berthId)
  expect(arrival.context.berthStayId).not.toBe(e.context.berthStayId)
  for (const time of ['11:59', '14:01', '14:59', '18:01'])
    expect(await create(input('2026-06-01T' + time))).toMatchObject(
      failure('OPERATIONAL_CONTEXT_MISSING'),
    )
})
it('nuova operazione blocca prestazioni orfane e riattribuisce quelle successive atomicamente', async () => {
  const s = value(await create(input('2026-06-01T16:00'))),
    before = context()
  expect(
    await operations.previewCreate({
      context: context(),
      payload: move('2026-06-01T15:00', '2026-06-01T17:00'),
    }),
  ).toMatchObject(failure('OPERATIONAL_CONTEXT_MISSING'))
  expect(context()).toEqual(before)
  expect(all()).toEqual([s])
  const pre = value(await operations.previewCreate({ context: context(), payload: move() }))
  expect(pre.effects.items.some((e) => e.reference.kind === 'SERVICE_ACTIVITY')).toBe(true)
  value(
    await operations.confirmCreate({ context: pre.context, payload: { previewId: pre.previewId } }),
  )
  expect(all()[0].context.berthId).toBe(berthId)
  expect(all()[0].base).toBe(s.base)
  expect(all()[0].context.berthStayId).not.toBe(s.context.berthStayId)
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(
    await operations.previewCreate({ context: context(), payload: exit('2026-06-01T15:30') }),
  ).toMatchObject(failure('OPERATIONAL_CONTEXT_MISSING'))
})
it('soggetti indipendenti, override diretto e ricaduta ereditaria nelle anteprime', async () => {
  const c = value(
    await customers().create({ context: context(), payload: { businessName: 'Cliente viaggio' } }),
  ).id
  const d = value(
    await customers().create({ context: context(), payload: { businessName: 'Cliente diretto' } }),
  ).id
  const a = value(
    await agencies().create({ context: context(), payload: { businessName: 'Agenzia visita' } }),
  ).id
  const v = new OperationRepository(db()).stays(vesselId, 1, 10).items[0],
    visit = v.visits[0],
    stay = visit.stays[0]
  await assign({ kind: 'VOYAGE', id: v.id }, c)
  await assign({ kind: 'PORT_CALL', id: visit.id }, null, a)
  const inherited = value(await create()),
    direct = value(await create({ ...input(), specified: { customerId: d, agencyId: null } }))
  expect(inherited.subjects).toMatchObject({
    customer: { id: c, source: { kind: 'VOYAGE' } },
    agency: { id: a, source: { kind: 'PORT_CALL' } },
  })
  expect(direct.subjects.customer).toMatchObject({
    id: d,
    source: { kind: 'SERVICE_ACTIVITY', id: direct.id },
  })
  const pre = await assign({ kind: 'BERTH_STAY', id: stay.id }, d)
  expect(pre.effects.items.some((e) => e.reference.kind === 'SERVICE_ACTIVITY')).toBe(true)
  expect(new ServiceRepository(db()).get(inherited.id).subjects.customer?.id).toBe(d)
  await assign({ kind: 'BERTH_STAY', id: stay.id })
  expect(new ServiceRepository(db()).get(inherited.id).subjects.customer?.id).toBe(c)
  expect(new ServiceRepository(db()).get(direct.id).subjects.customer?.id).toBe(d)
})
it('conflitto revisione/sessione, riferimenti disattivati e rollback dopo inserimento', async () => {
  const before = context()
  value(await create())
  expect(await services.createFree({ context: before, payload: input() })).toMatchObject(
    failure('REVISION_CONFLICT'),
  )
  expect(
    await services.createFree({
      context: { ...context(), sessionId: '00000000-0000-4000-8000-000000000999' },
      payload: input(),
    }),
  ).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  const c = value(
    await customers().create({
      context: context(),
      payload: { businessName: 'Non selezionabile' },
    }),
  ).id
  sql().prepare("UPDATE customers SET status='INACTIVE' WHERE id=?").run(c)
  expect(await create({ ...input(), specified: { customerId: c, agencyId: null } })).toMatchObject(
    failure('NOT_SELECTABLE'),
  )
  const original = all(),
    revision = context(),
    metadata = db().metadata()
  const save = ServiceRepository.prototype.insert
  vi.spyOn(ServiceRepository.prototype, 'insert').mockImplementation(function (
    this: ServiceRepository,
    v,
  ) {
    save.call(this, v)
    throw Error('Dopo INSERT')
  })
  expect(await create()).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual(original)
  expect(context()).toEqual(revision)
  expect(db().metadata()).toEqual(metadata)
})
it('overlap esplicito e gap; entrambe le occorrenze devono avere contesto', async () => {
  const query = { vesselId, interpretationPortId: null, moment: moment('2026-10-25T02:30') }
  expect(
    value(await services.resolveMoment({ context: { sessionId: context().sessionId }, query }))
      .resolution.status,
  ).toBe('CHOICE_REQUIRED')
  expect(await create({ ...input(), moment: query.moment })).toMatchObject(
    failure('LOCAL_TIME_AMBIGUOUS'),
  )
  const first = value(await create({ ...input(), moment: moment('2026-10-25T02:30', '+02:00') }))
  const second = value(await create({ ...input(), moment: moment('2026-10-25T02:30', '+01:00') }))
  expect(first.moment.utc).not.toBe(second.moment.utc)
  expect(
    await services.resolveMoment({
      context: { sessionId: context().sessionId },
      query: { ...query, moment: moment('2027-03-28T02:30') },
    }),
  ).toMatchObject(failure('LOCAL_TIME_NOT_EXISTENT'))
})
it('disambiguazione tra porti: scelta ammessa dalla cronologia, mai una permanenza forzata', async () => {
  const p = await port('Londra', 'Europe/London')
  await tariff(p)
  await operation(move('2026-06-01T14:00', '2026-06-01T13:30', p, null))
  const q = { vesselId, interpretationPortId: null, moment: moment('2026-06-01T13:45') }
  expect(
    await services.resolveMoment({ context: { sessionId: context().sessionId }, query: q }),
  ).toMatchObject(failure('OPERATIONAL_CONTEXT_AMBIGUOUS'))
  expect(
    value(await create({ ...input(), moment: q.moment, interpretationPortId: portId })).context
      .portId,
  ).toBe(portId)
  expect(
    value(await create({ ...input(), moment: q.moment, interpretationPortId: p })).context.portId,
  ).toBe(p)
  expect(
    await create({ ...input(), moment: moment('2026-06-01T16:00'), interpretationPortId: portId }),
  ).toMatchObject(failure('OPERATIONAL_CONTEXT_MISSING'))
})
it('versione nave all’istante e non all’apertura; variazione backend propaga senza cambiare denaro o tupla', async () => {
  await new TimeService(archives.coordinator).configureCompanyZone({
    context: context(),
    payload: { zoneId: 'Europe/Rome' },
  })
  const saved = value(await create(input('2026-06-01T16:00')))
  const pre = value(
    await vessels().preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        moment: moment('2026-06-01T15:00'),
        registeredName: 'Nave aggiornata',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 200,
      },
    }),
  )
  expect(pre.effects.items.some((e) => e.reference.kind === 'SERVICE_ACTIVITY')).toBe(true)
  value(await vessels().confirm({ context: pre.context, payload: { previewId: pre.previewId } }))
  const after = all()[0]
  expect(after.vesselName).toBe('Nave aggiornata')
  expect(after.vesselVersionId).not.toBe(saved.vesselVersionId)
  expect(after.base).toBe(saved.base)
  expect(after.moment).toEqual(saved.moment)
  expect(value(await create(input('2026-06-01T17:00'))).vesselVersionId).toBe(after.vesselVersionId)
  const deletion = value(
    await vessels().preview({
      context: context(),
      payload: { operation: 'DELETE_VERSION', vesselId, versionId: after.vesselVersionId },
    }),
  )
  expect(deletion.blockers).toEqual([])
  value(
    await vessels().confirm({
      context: deletion.context,
      payload: { previewId: deletion.previewId },
    }),
  )
  for (const activity of all()) expect(activity.vesselVersionId).toBe(saved.vesselVersionId)
})
it.each(['FREE', 'CATALOG'] as const)(
  '%s: versioni cliente/agenzia, anteprima, cancellazione e no-op conservano base e tupla',
  async (category) => {
    value(
      await new TimeService(archives.coordinator).configureCompanyZone({
        context: context(),
        payload: { zoneId: 'Europe/Rome' },
      }),
    )
    const c = value(
      await customers().create({ context: context(), payload: { businessName: 'Cliente base' } }),
    ).id
    const a = value(
      await agencies().create({ context: context(), payload: { businessName: 'Agenzia base' } }),
    ).id
    const saved = value(
      await (category === 'FREE'
        ? create({ ...input('2026-06-01T16:00'), specified: { customerId: c, agencyId: a } })
        : createCatalog({
            ...catalogInput(),
            moment: moment('2026-06-01T16:00'),
            specified: { customerId: c, agencyId: a },
          })),
    )
    for (const kind of ['customer', 'agency'] as const) {
      const id = kind === 'customer' ? c : a,
        service = kind === 'customer' ? customers() : agencies()
      const change =
        kind === 'customer'
          ? {
              operation: 'INSERT_VERSION' as const,
              customerId: id,
              businessName: 'Cliente nuovo',
              moment: moment('2026-06-01T15:00'),
            }
          : {
              operation: 'INSERT_VERSION' as const,
              agencyId: id,
              businessName: 'Agenzia nuova',
              moment: moment('2026-06-01T15:00'),
            }
      const pre = value(await service.preview({ context: context(), payload: change as never }))
      expect(pre.blockers).toEqual([])
      expect(pre.effects.items.some((e) => e.reference.kind === 'SERVICE_ACTIVITY')).toBe(true)
      value(await service.confirm({ context: pre.context, payload: { previewId: pre.previewId } }))
      const after = all()[0]
      expect(after.subjects[kind]?.versionId).not.toBe(saved.subjects[kind]?.versionId)
      expect(after.base).toBe(saved.base)
      expect(after.moment).toEqual(saved.moment)
      const deletion =
        kind === 'customer'
          ? {
              operation: 'DELETE_VERSION' as const,
              customerId: id,
              versionId: after.subjects[kind]!.versionId,
            }
          : {
              operation: 'DELETE_VERSION' as const,
              agencyId: id,
              versionId: after.subjects[kind]!.versionId,
            }
      const del = value(await service.preview({ context: context(), payload: deletion as never }))
      expect(del.blockers).toEqual([])
      value(await service.confirm({ context: del.context, payload: { previewId: del.previewId } }))
      expect(all()[0].subjects[kind]?.versionId).toBe(saved.subjects[kind]?.versionId)
    }
    const v = new OperationRepository(db()).stays(vesselId, 1, 10).items[0],
      before = context(),
      metadata = db().metadata()
    await assign({ kind: 'VOYAGE', id: v.id })
    expect(context()).toEqual(before)
    expect(db().metadata()).toEqual(metadata)
    // Un override esplicito mascherato resta comunque un riferimento che blocca l'eliminazione.
    const del = value(
      await customers().preview({
        context: context(),
        payload: { operation: 'DELETE_CUSTOMER', customerId: c },
      }),
    )
    expect(del.status).toBe('BLOCKED')
  },
)
it.each(['FREE', 'CATALOG'] as const)(
  '%s: versioni porto e banchina propagate, eliminazione riporta alla precedente',
  async (category) => {
    await operation(move())
    const saved = value(
      await (category === 'FREE'
        ? create(input('2026-06-01T16:00'))
        : createCatalog({ ...catalogInput(), moment: moment('2026-06-01T16:00') })),
    )
    const b = new BerthService(archives.coordinator)
    const pre = value(
      await b.preview({
        context: context(),
        payload: {
          operation: 'INSERT_VERSION',
          berthId,
          name: 'Molo nuovo',
          moment: moment('2026-06-01T15:30'),
        },
      }),
    )
    expect(pre.blockers).toEqual([])
    expect(pre.effects.items.some((e) => e.reference.kind === 'SERVICE_ACTIVITY')).toBe(true)
    value(await b.confirm({ context: pre.context, payload: { previewId: pre.previewId } }))
    expect(all()[0].berthName).toBe('Molo nuovo')
    const del = value(
      await b.preview({
        context: context(),
        payload: { operation: 'DELETE_VERSION', berthId, versionId: all()[0].berthVersionId! },
      }),
    )
    expect(del.blockers).toEqual([])
    value(await b.confirm({ context: del.context, payload: { previewId: del.previewId } }))
    expect(all()[0].berthVersionId).toBe(saved.berthVersionId)
    const portPre = value(
      await ports().previewInsertVersion({
        context: context(),
        payload: {
          portId,
          moment: moment('2026-06-01T15:30'),
          name: 'Genova aggiornata',
          locality: 'Genova',
          countryCode: 'IT',
        },
      }),
    )
    expect(portPre.blockers).toEqual([])
    expect(portPre.effects.items.some((e) => e.reference.kind === 'SERVICE_ACTIVITY')).toBe(true)
    value(
      await ports().confirmInsertVersion({
        context: portPre.context,
        payload: { previewId: portPre.previewId },
      }),
    )
    expect(all()[0].portName).toBe('Genova aggiornata')
    const portDel = value(
      await ports().previewDeleteVersion({
        context: context(),
        payload: { portId, versionId: all()[0].portVersionId },
      }),
    )
    expect(portDel.blockers).toEqual([])
    value(
      await ports().confirmDeleteVersion({
        context: portDel.context,
        payload: { previewId: portDel.previewId },
      }),
    )
    expect(all()[0].portVersionId).toBe(saved.portVersionId)
    expect(all()[0].base).toBe(saved.base)
    expect(all()[0].moment).toEqual(saved.moment)
  },
)
it('SQLite rifiuta importi non interi/positivi, proprietari incoerenti e soggetti incompleti', async () => {
  const s = value(await create())
  for (const update of [
    'base_cents=0',
    'base_cents=-1',
    'base_cents=1.5',
    "description=' '",
    "category='CATALOG'",
    "port_call_id='missing'",
    "berth_stay_id='missing'",
    "vessel_version_id='missing'",
    "port_version_id='missing'",
    "berth_id='missing'",
    "execution_status='UNKNOWN'",
  ]) {
    expect(() =>
      sql()
        .prepare('UPDATE service_activities SET ' + update + ' WHERE id=?')
        .run(s.id),
    ).toThrow()
  }
  expect(() =>
    sql()
      .prepare("UPDATE service_activity_subjects SET customer_source='VOYAGE' WHERE service_id=?")
      .run(s.id),
  ).toThrow()
  const another = value(
    await vessels().create({
      context: context(),
      payload: { registeredName: 'Altra', imoNumber: null, vesselTypeId: 'STANDARD', size: 100 },
    }),
  )
  expect(() =>
    sql()
      .prepare('UPDATE service_activities SET vessel_version_id=? WHERE id=?')
      .run(another.version.id, s.id),
  ).toThrow()
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(sql().pragma('integrity_check', { simple: true })).toBe('ok')
})
it('rollback della riattribuzione operativa conserva prestazioni, preview riutilizzabile e revisione', async () => {
  value(await create(input('2026-06-01T16:00')))
  const pre = value(await operations.previewCreate({ context: context(), payload: move() })),
    before = all(),
    ctx = context(),
    metadata = db().metadata()
  const save = ServiceRepository.prototype.saveAttribution
  vi.spyOn(ServiceRepository.prototype, 'saveAttribution').mockImplementation(function (
    this: ServiceRepository,
    v,
  ) {
    save.call(this, v)
    throw Error('Riattribuzione fallita')
  })
  expect(
    await operations.confirmCreate({ context: pre.context, payload: { previewId: pre.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual(before)
  expect(context()).toEqual(ctx)
  expect(db().metadata()).toEqual(metadata)
  vi.restoreAllMocks()
  value(
    await operations.confirmCreate({ context: pre.context, payload: { previewId: pre.previewId } }),
  )
  expect(BigInt(context().revision)).toBe(BigInt(ctx.revision) + 1n)
  expect(all()[0].context.berthId).toBe(berthId)
  expect(
    await operations.confirmCreate({ context: context(), payload: { previewId: pre.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
})
it('trasferimento tra porti: origine alla partenza, destinazione all’arrivo, MISSED ordinaria vietata in transito', async () => {
  const p = await port('Livorno')
  await tariff(p)
  await operation(move('2026-06-01T14:00', '2026-06-01T15:00', p, null))
  expect(value(await create(input('2026-06-01T14:00'))).context.portId).toBe(portId)
  expect(value(await create(input('2026-06-01T15:00'))).context.portId).toBe(p)
  expect(await create({ ...input('2026-06-01T14:30'), executionStatus: 'MISSED' })).toMatchObject(
    failure('OPERATIONAL_CONTEXT_MISSING'),
  )
})

const catalogInput = (): CreateCatalogServiceDto => {
  const free = input()
  return {
    vesselId,
    interpretationPortId: null,
    moment: free.moment,
    executionStatus: 'MISSED',
    notes: free.notes,
    specified: free.specified,
    serviceTypeId: new CatalogRepository(db()).list({
      search: '',
      status: 'ACTIVE',
      page: 1,
      pageSize: 25,
    }).items[0].id,
  }
}
const createCatalog = (payload = catalogInput()) =>
  services.createCatalog({ context: context(), payload })
it('CATALOG: calcolo esatto, MISSED, utilizzo storico, descrizione corrente e consultazione dopo disattivazione', async () => {
  const catalog = new CatalogService(archives.coordinator)
  const type = value(
    await catalog.create({
      context: context(),
      payload: { description: 'Assistenza esatta', initialWeight: '1.235' },
    }),
  )
  const saved = value(await createCatalog({ ...catalogInput(), serviceTypeId: type.id }))
  expect(saved).toMatchObject({
    category: 'CATALOG',
    executionStatus: 'MISSED',
    base: '123.50',
    description: 'Assistenza esatta',
    calculation: { weight: '1.235', tariffValue: '100.00', base: '123.50', extraCount: 0 },
  })
  expect(saved.calculation?.steps).toHaveLength(4)
  expect(new CatalogRepository(db()).get(type.id).hasEverBeenUsed).toBe(true)
  for (const payload of [
    { operation: 'RENAME' as const, id: type.id, description: 'Descrizione corrente' },
    { operation: 'DEACTIVATE' as const, id: type.id },
  ]) {
    const pre = value(await catalog.preview({ context: context(), payload }))
    value(await catalog.confirm({ context: pre.context, payload: { previewId: pre.previewId } }))
  }
  expect(all()[0]).toMatchObject({
    description: 'Descrizione corrente',
    base: saved.base,
    calculation: saved.calculation,
  })
  expect(await createCatalog({ ...catalogInput(), serviceTypeId: type.id })).toMatchObject(
    failure('NOT_SELECTABLE'),
  )
  const original = all()
  await archives.close()
  await archives.open(join(folder, 'active.ormeggi'))
  expect(all()).toEqual(original)
  // P16 deletion will remove owned subjects first; historical use survives both rows.
  sql().transaction(() => {
    sql().prepare('DELETE FROM service_activity_subjects WHERE service_id=?').run(saved.id)
    sql().prepare('DELETE FROM service_activities WHERE id=?').run(saved.id)
  })()
  expect(new CatalogRepository(db()).deleteBlockers(type.id).length).toBeGreaterThan(0)
})
it.each([
  { base: '1.00' },
  { description: 'Autonoma' },
  { manualOverrideAmount: '0.00' },
  { category: 'FREE' },
  { serviceTypeId: null },
])('CATALOG rifiuta campi incompatibili e tipo mancante: %j', async (patch) => {
  const before = context(),
    metadata = db().metadata(),
    payload = catalogInput()
  expect(await createCatalog({ ...payload, ...patch } as CreateCatalogServiceDto)).toMatchObject(
    failure('VALIDATION_ERROR'),
  )
  expect(all()).toEqual([])
  expect(new CatalogRepository(db()).get(payload.serviceTypeId).hasEverBeenUsed).toBe(false)
  expect(context()).toEqual(before)
  expect(db().metadata()).toEqual(metadata)
})
it('CATALOG: assenza tariffa, contesto MISSED e zero tariffario senza vincolo FREE', async () => {
  const payload = catalogInput()
  expect(await createCatalog({ ...payload, moment: moment('2026-06-01T11:59') })).toMatchObject(
    failure('OPERATIONAL_CONTEXT_MISSING'),
  )
  sql()
    .prepare(
      "UPDATE tariffs SET effective_from='2026-06-01T12:00:00.000Z',effective_local_date_time='2026-06-01T14:00',effective_utc_offset='+02:00'",
    )
    .run()
  expect(await createCatalog(payload)).toMatchObject(failure('TARIFF_NOT_FOUND'))
  expect(all()).toEqual([])
  expect(new CatalogRepository(db()).get(payload.serviceTypeId).hasEverBeenUsed).toBe(false)
  sql()
    .prepare(
      "UPDATE tariffs SET effective_from='2025-12-31T23:00:00.000Z',effective_local_date_time='2026-01-01T00:00',effective_utc_offset='+01:00'",
    )
    .run()
  sql().exec(
    "UPDATE tariff_brackets SET value='0'; UPDATE tariff_configurations SET extra_value='0'",
  )
  expect(value(await createCatalog(payload)).base).toBe('0.00')
  expect(await create({ ...input(), base: '0.00' })).toMatchObject(failure('VALIDATION_ERROR'))
})
it('CATALOG: rollback anche dopo markUsed conserva attività, soggetti, utilizzo e metadati', async () => {
  const payload = catalogInput(),
    ctx = context(),
    metadata = db().metadata()
  const mark = CatalogRepository.prototype.markUsed
  vi.spyOn(CatalogRepository.prototype, 'markUsed').mockImplementation(function (
    this: CatalogRepository,
    id,
  ) {
    mark.call(this, id)
    throw Error('Dopo utilizzo')
  })
  expect(await createCatalog(payload)).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual([])
  expect(sql().prepare('SELECT * FROM service_activity_subjects').all()).toEqual([])
  expect(new CatalogRepository(db()).get(payload.serviceTypeId).hasEverBeenUsed).toBe(false)
  expect(context()).toEqual(ctx)
  expect(db().metadata()).toEqual(metadata)
})
it('CATALOG: FK del calcolo, categoria immutabile e nessuna descrizione/base autonoma in SQLite', async () => {
  const saved = value(await createCatalog())
  for (const update of [
    "category='FREE'",
    "description='Autonoma'",
    'base_cents=1',
    "configuration_id='missing'",
    "bracket_id='missing'",
    "weight_version_id='missing'",
    "calculation='{}'",
    'service_type_id=NULL',
  ])
    expect(() =>
      sql()
        .prepare('UPDATE service_activities SET ' + update + ' WHERE id=?')
        .run(saved.id),
    ).toThrow()
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(sql().pragma('integrity_check', { simple: true })).toBe('ok')
})
it('CATALOG: tariffa intermedia e versione nave ricalcolano atomicamente; FREE int64 conservata', async () => {
  const free = value(await create({ ...input('2026-06-01T16:00'), base: '92233720368547758.07' }))
  const saved = value(
    await createCatalog({ ...catalogInput(), moment: moment('2026-06-01T16:00') }),
  )
  const tariffs = new TariffService(archives.coordinator)
  const pre = value(
    await tariffs.previewCreate({
      context: context(),
      payload: {
        portId,
        moment: moment('2026-06-01T15:00'),
        configurations: (['STANDARD', 'PASSENGER', 'ADM'] as const).map((vesselTypeId) => ({
          vesselTypeId,
          brackets: [{ upperLimit: 100, value: '10.005' }],
          extraWidth: 100,
          extraValue: '0.005',
        })),
      },
    }),
  )
  expect(pre.blockers).toEqual([])
  expect(pre.effects.items.some((e) => e.reference.kind === 'SERVICE_ACTIVITY')).toBe(true)
  const before = all(),
    ctx = context(),
    metadata = db().metadata(),
    save = ServiceRepository.prototype.saveAttribution
  vi.spyOn(ServiceRepository.prototype, 'saveAttribution').mockImplementation(function (
    this: ServiceRepository,
    v,
  ) {
    save.call(this, v)
    throw Error('Ricalcolo fallito')
  })
  expect(
    await tariffs.confirmCreate({ context: pre.context, payload: { previewId: pre.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual(before)
  expect(context()).toEqual(ctx)
  expect(db().metadata()).toEqual(metadata)
  vi.restoreAllMocks()
  value(
    await tariffs.confirmCreate({ context: pre.context, payload: { previewId: pre.previewId } }),
  )
  expect(new ServiceRepository(db()).get(saved.id)).toMatchObject({
    base: '10.01',
    calculation: { base: '10.01' },
  })
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const version = value(
    await vessels().preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        moment: moment('2026-06-01T15:30'),
        registeredName: 'Dimensione nuova',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 201,
      },
    }),
  )
  expect(version.blockers).toEqual([])
  value(
    await vessels().confirm({
      context: version.context,
      payload: { previewId: version.previewId },
    }),
  )
  const after = new ServiceRepository(db()).get(saved.id)
  expect(after).toMatchObject({
    base: '10.02',
    calculation: { size: 201, extraCount: 2, tariffValue: '10.02' },
  })
  expect(after.moment).toEqual(saved.moment)
  const deletion = value(
    await vessels().preview({
      context: context(),
      payload: { operation: 'DELETE_VERSION', vesselId, versionId: after.vesselVersionId },
    }),
  )
  expect(deletion.blockers).toEqual([])
  value(
    await vessels().confirm({
      context: deletion.context,
      payload: { previewId: deletion.previewId },
    }),
  )
  expect(new ServiceRepository(db()).get(saved.id).base).toBe('10.01')
  expect(new ServiceRepository(db()).get(free.id)).toMatchObject({
    base: free.base,
    moment: free.moment,
    calculation: null,
  })
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('CATALOG: nuova operazione riattribuisce porto e tariffa, con soggetti indipendenti, conserva FREE', async () => {
  const destination = await port('Livorno')
  await tariff(destination)
  sql()
    .prepare(
      "UPDATE tariff_brackets SET value='200' WHERE configuration_id IN (SELECT c.id FROM tariff_configurations c JOIN tariffs t ON t.id=c.tariff_id WHERE t.port_id=?)",
    )
    .run(destination)
  const saved = value(
    await createCatalog({ ...catalogInput(), moment: moment('2026-06-01T16:00') }),
  )
  const free = value(await create(input('2026-06-01T16:00')))
  await operation(move('2026-06-01T14:00', '2026-06-01T15:00', destination, null))
  const after = new ServiceRepository(db()).get(saved.id)
  expect(after).toMatchObject({
    base: '200.00',
    context: { portId: destination },
    calculation: { portId: destination, base: '200.00' },
  })
  expect(after.moment).toEqual(saved.moment)
  const customer = value(
    await customers().create({
      context: context(),
      payload: { businessName: 'Cliente nuovo porto' },
    }),
  ).id
  const agency = value(
    await agencies().create({ context: context(), payload: { businessName: 'Agenzia viaggio' } }),
  ).id
  await assign({ kind: 'PORT_CALL', id: after.context.portCallId }, customer)
  await assign({ kind: 'VOYAGE', id: after.context.voyageId }, null, agency)
  expect(new ServiceRepository(db()).get(saved.id)).toMatchObject({
    base: '200.00',
    subjects: {
      customer: { id: customer, source: { kind: 'PORT_CALL' } },
      agency: { id: agency, source: { kind: 'VOYAGE' } },
    },
  })
  expect(new ServiceRepository(db()).get(free.id).base).toBe(free.base)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('CATALOG: gap e overlap, confini del trasferimento e disambiguazione porto riusano il contesto P14', async () => {
  const payload = catalogInput()
  expect(await createCatalog({ ...payload, moment: moment('2026-10-25T02:30') })).toMatchObject(
    failure('LOCAL_TIME_AMBIGUOUS'),
  )
  expect(await createCatalog({ ...payload, moment: moment('2027-03-28T02:30') })).toMatchObject(
    failure('LOCAL_TIME_NOT_EXISTENT'),
  )
  const first = value(
    await createCatalog({ ...payload, moment: moment('2026-10-25T02:30', '+02:00') }),
  )
  const second = value(
    await createCatalog({ ...payload, moment: moment('2026-10-25T02:30', '+01:00') }),
  )
  expect(first.moment.utc).not.toBe(second.moment.utc)
  const destination = await port('Londra', 'Europe/London')
  await tariff(destination)
  await operation(move('2026-06-01T14:00', '2026-06-01T13:30', destination, null))
  expect(await createCatalog({ ...payload, moment: moment('2026-06-01T13:45') })).toMatchObject(
    failure('OPERATIONAL_CONTEXT_AMBIGUOUS'),
  )
  for (const interpretationPortId of [portId, destination])
    expect(
      value(
        await createCatalog({
          ...payload,
          interpretationPortId,
          moment: moment('2026-06-01T13:45'),
        }),
      ).context.portId,
    ).toBe(interpretationPortId)
  expect(
    value(
      await createCatalog({
        ...payload,
        interpretationPortId: portId,
        moment: moment('2026-06-01T14:00'),
      }),
    ).context.portId,
  ).toBe(portId)
  expect(
    value(
      await createCatalog({
        ...payload,
        interpretationPortId: destination,
        moment: moment('2026-06-01T13:30'),
      }),
    ).context.portId,
  ).toBe(destination)
  expect(
    await createCatalog({
      ...payload,
      interpretationPortId: portId,
      moment: moment('2026-06-01T14:15'),
    }),
  ).toMatchObject(failure('OPERATIONAL_CONTEXT_MISSING'))
})

it('CATALOG: CHECK della base int64 non ammette saturazione del cast e categoria protetta anche con forma coerente', async () => {
  sql().prepare("UPDATE tariff_brackets SET value='92233720368547758.07'").run()
  const saved = value(await createCatalog())
  expect(saved.base).toBe('92233720368547758.07')
  expect(() =>
    sql()
      .prepare(
        "UPDATE service_activities SET calculation=json_set(calculation,'$.base','92233720368547758.08') WHERE id=?",
      )
      .run(saved.id),
  ).toThrow()
  expect(() =>
    sql()
      .prepare(
        "UPDATE service_activities SET category='FREE',description='Conversione',service_type_id=NULL,tariff_id=NULL,configuration_id=NULL,bracket_id=NULL,weight_sequence_id=NULL,weight_version_id=NULL,calculation=NULL WHERE id=?",
      )
      .run(saved.id),
  ).toThrow()
  expect(new ServiceRepository(db()).get(saved.id)).toEqual(saved)
})

function changeFor(
  saved: ServiceActivityDto,
  patch: Partial<CreateFreeServiceDto & CreateCatalogServiceDto> = {},
  complete = false,
): ServiceChange {
  const common = {
    vesselId: saved.vesselId,
    interpretationPortId: saved.context.portId,
    moment: moment(saved.moment.localDateTime, saved.moment.offset),
    executionStatus: saved.executionStatus,
    notes: saved.notes,
    specified: saved.specified,
    ...patch,
  }
  return saved.category === 'FREE'
    ? {
        operation: complete ? 'COMPLETE_FREE' : 'UPDATE_FREE',
        id: saved.id,
        values: {
          ...common,
          description: patch.description ?? saved.description,
          base: patch.base ?? saved.base,
        },
      }
    : {
        operation: complete ? 'COMPLETE_CATALOG' : 'UPDATE_CATALOG',
        id: saved.id,
        values: { ...common, serviceTypeId: patch.serviceTypeId ?? saved.serviceTypeId },
      }
}
const previewChange = (payload: ServiceChange) => services.preview({ context: context(), payload })
async function applyChange(payload: ServiceChange) {
  const p = value(await previewChange(payload))
  return value(await services.confirm({ context: p.context, payload: { previewId: p.previewId } }))
}
function integrity() {
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(sql().pragma('integrity_check', { simple: true })).toBe('ok')
}
it.each(['FREE', 'CATALOG'] as const)(
  'P16 %s: consuntivazione esplicita, anteprima senza scritture, esito mancato con base conservata',
  async (category) => {
    const saved = value(
      category === 'FREE'
        ? await create()
        : await createCatalog({ ...catalogInput(), executionStatus: 'PLANNED' }),
    )
    const metadata = db().metadata(),
      ctx = context()
    const missed = changeFor(saved, { executionStatus: 'MISSED' }, true)
    if (category === 'FREE' && missed.operation !== 'DELETE')
      missed.values.moment.selectedOffset = null
    const pre = value(await previewChange(missed))
    expect(pre.before).toEqual(saved)
    expect(pre.after).toMatchObject({
      executionStatus: 'MISSED',
      moment: saved.moment,
      base: saved.base,
      context: saved.context,
    })
    expect(pre.changedFields).toEqual(['executionStatus'])
    expect(db().metadata()).toEqual(metadata)
    expect(all()).toEqual([saved])
    // A future observation never promotes a planned activity.
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-01-01T00:00:00Z'))
    expect(all()[0].executionStatus).toBe('PLANNED')
    vi.restoreAllMocks()
    const result = value(
      await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }),
    )
    expect(result.service?.executionStatus).toBe('MISSED')
    expect(BigInt(context().revision)).toBe(BigInt(ctx.revision) + 1n)
    expect(
      await previewChange(changeFor(result.service!, { executionStatus: 'PERFORMED' }, true)),
    ).toMatchObject(failure('VALIDATION_ERROR'))
    expect(
      await services.confirm({ context: context(), payload: { previewId: pre.previewId } }),
    ).toMatchObject(failure('PREVIEW_EXPIRED'))
    integrity()
  },
)
it('P16: effettuata con dati effettivi, nuove versioni, permanenza e soggetti; mancata conserva l’istante', async () => {
  const saved = value(await create())
  await operation(move())
  const person = value(
    await customers().create({
      context: context(),
      payload: { businessName: 'Cliente destinazione' },
    }),
  )
  const stay = value(
    await operations.stays({
      context: { sessionId: context().sessionId },
      query: { vesselId, page: 1, pageSize: 25 },
    }),
  ).items[0].visits[0].stays[1]
  await assign({ kind: 'BERTH_STAY', id: stay.id }, person.id)
  expect(
    await previewChange(
      changeFor(saved, { executionStatus: 'MISSED', moment: moment('2026-06-01T15:00') }, true),
    ),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  const pre = value(
    await previewChange(
      changeFor(saved, { executionStatus: 'PERFORMED', moment: moment('2026-06-01T15:00') }, true),
    ),
  )
  expect(pre.after).toMatchObject({
    executionStatus: 'PERFORMED',
    context: { berthId },
    subjects: { customer: { id: person.id, source: { kind: 'BERTH_STAY', id: stay.id } } },
    base: saved.base,
  })
  value(await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }))
  integrity()
})
it.each(['FREE', 'CATALOG'] as const)(
  'P16 %s: modifica con contesto e rifiuto di transito, orfane, categoria e transizioni improprie',
  async (category) => {
    const saved = value(
      category === 'FREE'
        ? await create()
        : await createCatalog({ ...catalogInput(), executionStatus: 'PLANNED' }),
    )
    await operation(move())
    await operation(exit())
    for (const at of ['2026-06-01T11:59', '2026-06-01T14:30', '2026-06-01T18:01'])
      expect(await previewChange(changeFor(saved, { moment: moment(at) }))).toMatchObject(
        failure('OPERATIONAL_CONTEXT_MISSING'),
      )
    expect(await previewChange(changeFor(saved, { executionStatus: 'PERFORMED' }))).toMatchObject(
      failure('VALIDATION_ERROR'),
    )
    const other = {
      ...changeFor(saved),
      operation: category === 'FREE' ? 'UPDATE_CATALOG' : 'UPDATE_FREE',
    } as ServiceChange
    expect(await previewChange(other)).toMatchObject(failure('VALIDATION_ERROR'))
    const updated = (await applyChange(changeFor(saved, { moment: moment('2026-06-01T15:00') })))
      .service!
    expect(updated.context.berthId).toBe(berthId)
    expect(updated.base).toBe(saved.base)
    expect(updated.moment.localDateTime).toBe('2026-06-01T15:00')
    integrity()
  },
)
it('P16 CATALOG: mantiene tipo storico senza markUsed; sostituzione selezionabile atomica, rinomina corrente, FREE manuale', async () => {
  const saved = value(await createCatalog()),
    catalog = new CatalogService(archives.coordinator)
  const deactivate = value(
    await catalog.preview({
      context: context(),
      payload: { operation: 'DEACTIVATE', id: saved.serviceTypeId! },
    }),
  )
  value(
    await catalog.confirm({
      context: deactivate.context,
      payload: { previewId: deactivate.previewId },
    }),
  )
  const realMark = CatalogRepository.prototype.markUsed
  const mark = vi.spyOn(CatalogRepository.prototype, 'markUsed')
  const maintained = (await applyChange(changeFor(saved, { moment: moment('2026-06-01T13:30') })))
    .service!
  expect(maintained.serviceTypeId).toBe(saved.serviceTypeId)
  expect(mark).not.toHaveBeenCalled()
  const replacement = value(
    await catalog.create({
      context: context(),
      payload: { description: 'Nuovo tipo', initialWeight: '2' },
    }),
  )
  const pre = value(await previewChange(changeFor(maintained, { serviceTypeId: replacement.id })))
  expect(pre.after?.base).toBe('200.00')
  expect(new CatalogRepository(db()).get(replacement.id).hasEverBeenUsed).toBe(false)
  const metadata = db().metadata(),
    ctx = context()
  mark.mockImplementation(function (this: CatalogRepository, id: string) {
    // Use the real method, then fail after the historic-use write.
    realMark.call(this, id)
    throw Error('rollback utilizzo')
  })
  expect(
    await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(db().metadata()).toEqual(metadata)
  expect(context()).toEqual(ctx)
  expect(all()[0]).toEqual(maintained)
  expect(new CatalogRepository(db()).get(replacement.id).hasEverBeenUsed).toBe(false)
  mark.mockRestore()
  const result = value(
    await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }),
  ).service!
  expect(result).toMatchObject({
    serviceTypeId: replacement.id,
    description: 'Nuovo tipo',
    base: '200.00',
  })
  expect(new CatalogRepository(db()).get(replacement.id).hasEverBeenUsed).toBe(true)
  expect(
    await previewChange(changeFor(result, { serviceTypeId: saved.serviceTypeId! })),
  ).toMatchObject(failure('NOT_SELECTABLE'))
  const free = value(await create()),
    freeUpdated = (
      await applyChange(
        changeFor(free, { base: '92233720368547758.07', description: 'Libera corretta' }),
      )
    ).service!
  expect(freeUpdated).toMatchObject({
    base: '92233720368547758.07',
    calculation: null,
    category: 'FREE',
  })
  expect(await previewChange(changeFor(freeUpdated, { base: '0.00' }))).toMatchObject(
    failure('VALIDATION_ERROR'),
  )
  integrity()
})
it.each(['FREE', 'CATALOG'] as const)(
  'P16 %s: sole note senza attribuzioni/calcoli, tuple e traccia byte per byte, no-op e rollback',
  async (category) => {
    const saved = value(category === 'FREE' ? await create() : await createCatalog())
    const before = sql()
      .prepare('SELECT * FROM service_activities WHERE id=?')
      .get(saved.id) as Record<string, unknown>
    const subjects = sql().prepare('SELECT * FROM service_activity_subjects').all()
    vi.spyOn(serviceCalculation, 'recalculateService').mockImplementation(() => {
      throw Error('ricalcolo vietato')
    })
    vi.spyOn(subjectResolution, 'subjectPlan').mockImplementation(() => {
      throw Error('riattribuzione vietata')
    })
    const notes = 'Note corrette àèìòù'
    const updated = value(
      await services.updateNotes({ context: context(), payload: { id: saved.id, notes } }),
    )
    expect(updated).toEqual({ ...saved, notes })
    expect(sql().prepare('SELECT * FROM service_activities WHERE id=?').get(saved.id)).toEqual({
      ...before,
      notes,
    })
    expect(sql().prepare('SELECT * FROM service_activity_subjects').all()).toEqual(subjects)
    const metadata = db().metadata(),
      ctx = context()
    value(await services.updateNotes({ context: context(), payload: { id: saved.id, notes } }))
    expect(context()).toEqual(ctx)
    expect(db().metadata()).toEqual(metadata)
    sql().exec(
      "CREATE TRIGGER fail_notes AFTER UPDATE OF notes ON service_activities BEGIN SELECT RAISE(ABORT,'forced'); END",
    )
    expect(
      await services.updateNotes({
        context: context(),
        payload: { id: saved.id, notes: 'Rollback' },
      }),
    ).toMatchObject(failure('UNEXPECTED'))
    expect(all()[0]).toEqual(updated)
    expect(db().metadata()).toEqual(metadata)
    integrity()
  },
)
it('P16: eliminazione fisica ordinata, rollback dei soggetti, utilizzo storico, riferimenti esterni composti/CASCADE bloccanti', async () => {
  const saved = value(await createCatalog()),
    ctx = context()
  sql().exec(
    'CREATE TABLE external_owned (id TEXT PRIMARY KEY, service_id TEXT REFERENCES service_activity_subjects(service_id) ON DELETE CASCADE)',
  )
  sql().prepare('INSERT INTO external_owned VALUES (?,?)').run('external', saved.id)
  const blocked = value(await previewChange({ operation: 'DELETE', id: saved.id }))
  expect(blocked.blockers).toHaveLength(1)
  expect(
    await services.confirm({ context: blocked.context, payload: { previewId: blocked.previewId } }),
  ).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(context()).toEqual(ctx)
  expect(all()).toEqual([saved])
  sql().exec(
    'DROP TABLE external_owned; CREATE UNIQUE INDEX external_service_pair ON service_activities(id,vessel_id); CREATE TABLE external_compound (service_id TEXT,vessel_id TEXT,FOREIGN KEY(service_id,vessel_id) REFERENCES service_activities(id,vessel_id) ON DELETE CASCADE)',
  )
  sql().prepare('INSERT INTO external_compound VALUES (?,?)').run(saved.id, vesselId)
  expect(value(await previewChange({ operation: 'DELETE', id: saved.id })).blockers).toHaveLength(1)
  sql().exec('DROP TABLE external_compound')
  const pre = value(await previewChange({ operation: 'DELETE', id: saved.id })),
    metadata = db().metadata()
  sql().exec(
    "CREATE TRIGGER fail_delete BEFORE DELETE ON service_activities BEGIN SELECT RAISE(ABORT,'forced'); END",
  )
  expect(
    await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual([saved])
  expect(db().metadata()).toEqual(metadata)
  sql().exec('DROP TRIGGER fail_delete')
  value(await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }))
  expect(all()).toEqual([])
  expect(sql().prepare('SELECT * FROM service_activity_subjects').all()).toEqual([])
  expect(new CatalogRepository(db()).get(saved.serviceTypeId!).hasEverBeenUsed).toBe(true)
  expect(new CatalogRepository(db()).deleteBlockers(saved.serviceTypeId!).length).toBeGreaterThan(0)
  integrity()
})
it('post-P16: FK con PK implicita ai soggetti, anche vuote o di altre prestazioni, riesaminate alla conferma', async () => {
  const saved = value(await create()),
    other = value(await create({ ...input(), description: 'Altra prestazione' })),
    metadata = db().metadata()
  sql().exec(
    'CREATE TABLE external_implicit (service_id TEXT REFERENCES service_activity_subjects ON DELETE CASCADE)',
  )
  const change = { operation: 'DELETE' as const, id: saved.id }
  expect(value(await previewChange(change)).blockers).toEqual([])
  sql().prepare('INSERT INTO external_implicit VALUES (?)').run(other.id)
  const pre = value(await previewChange(change))
  expect(pre.blockers).toEqual([])
  // Simulate an external reference arriving after preview, without changing the revision.
  sql().prepare('INSERT INTO external_implicit VALUES (?)').run(saved.id)
  expect(value(await previewChange(change)).blockers).toMatchObject([
    { reference: { label: 'external_implicit: 1 riferimenti' } },
  ])
  expect(
    await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }),
  ).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(all()).toHaveLength(2)
  expect(db().metadata()).toEqual(metadata)
  sql().prepare('DELETE FROM external_implicit WHERE service_id=?').run(saved.id)
  value(await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }))
  expect(all()).toEqual([other])
  expect(sql().prepare('SELECT * FROM external_implicit').all()).toEqual([{ service_id: other.id }])
  expect(BigInt(context().revision)).toBe(BigInt(metadata.revision) + 1n)
  integrity()
})
it('post-P16: le FK composte implicite rispettano l’ordine della PK, distinto da quello delle colonne', () => {
  sql().exec(`
    CREATE TABLE external_parent (service_id TEXT, slot TEXT, PRIMARY KEY(slot,service_id));
    CREATE TABLE external_child (slot TEXT, service_id TEXT,
      FOREIGN KEY(slot,service_id) REFERENCES external_parent ON DELETE CASCADE);
    INSERT INTO external_parent VALUES ('target','slot'),('other','slot');
    INSERT INTO external_child VALUES ('slot','other');
  `)
  const blockers = () =>
    foreignReferences(
      db(),
      { kind: 'SERVICE_ACTIVITY', id: 'target', label: '' },
      null,
      'external_parent',
      ['target'],
      [],
      'service_id',
    )
  expect(blockers()).toEqual([])
  sql().exec("INSERT INTO external_child VALUES ('slot','target')")
  expect(blockers()).toMatchObject([{ reference: { label: 'external_child: 1 riferimenti' } }])
  integrity()
})
it('P16: no-op, anteprime obsolete, namespace, scadenza, sessione e rollback dopo UPDATE', async () => {
  const saved = value(await create()),
    metadata = db().metadata(),
    ctx = context()
  const noop = value(await previewChange(changeFor(saved)))
  expect(noop.changedFields).toEqual([])
  value(await services.confirm({ context: noop.context, payload: { previewId: noop.previewId } }))
  expect(db().metadata()).toEqual(metadata)
  expect(context()).toEqual(ctx)
  const pre = value(await previewChange(changeFor(saved, { base: '125.00' })))
  const save = ServiceRepository.prototype.save
  vi.spyOn(ServiceRepository.prototype, 'save').mockImplementation(function (
    this: ServiceRepository,
    value,
  ) {
    save.call(this, value)
    throw Error('dopo update')
  })
  expect(
    await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual([saved])
  expect(db().metadata()).toEqual(metadata)
  vi.restoreAllMocks()
  const type = new CatalogRepository(db()).list({
    search: '',
    status: 'ALL',
    page: 1,
    pageSize: 25,
  }).items[0]
  const catalogPre = value(
    await new CatalogService(archives.coordinator).preview({
      context: context(),
      payload: { operation: 'RENAME', id: type.id, description: 'Altro' },
    }),
  )
  expect(
    await services.confirm({ context: context(), payload: { previewId: catalogPre.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  value(
    await services.updateNotes({
      context: context(),
      payload: { id: saved.id, notes: 'Nuova revisione' },
    }),
  )
  expect(
    await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  expect(
    await services.confirm({ context: context(), payload: { previewId: pre.previewId } }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  const exp = value(await previewChange(changeFor(all()[0], { base: '126.00' })))
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(exp.expiresAtUtc))
  expect(
    await services.confirm({ context: exp.context, payload: { previewId: exp.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  vi.restoreAllMocks()
  const sessionPre = value(await previewChange(changeFor(all()[0], { base: '127.00' })))
  const expected = all()
  await archives.close()
  await archives.open(join(folder, 'active.ormeggi'))
  expect(
    await services.confirm({
      context: sessionPre.context,
      payload: { previewId: sessionPre.previewId },
    }),
  ).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  expect(all()).toEqual(expected)
  integrity()
})
it('P16: filtri combinati, periodo incluso, soggetti ereditati effettivi, pagine stabili e validazione IPC', async () => {
  const customer = value(
    await customers().create({
      context: context(),
      payload: { businessName: 'Cliente ereditato' },
    }),
  )
  const agency = value(
    await agencies().create({ context: context(), payload: { businessName: 'Agenzia ereditata' } }),
  )
  await operation(move())
  const saved = value(
    await createCatalog({ ...catalogInput(), moment: moment('2026-06-01T15:00') }),
  )
  await assign({ kind: 'VOYAGE', id: saved.context.voyageId }, customer.id, agency.id)
  await create()
  await create(input('2026-06-01T16:00'))
  const filters: ServiceListQuery = {
    page: 1,
    pageSize: 1,
    vesselId,
    category: 'CATALOG',
    serviceTypeId: saved.serviceTypeId,
    executionStatus: 'MISSED',
    fromUtc: saved.moment.utc,
    toUtc: saved.moment.utc,
    portId,
    berthId,
    voyageId: saved.context.voyageId,
    portCallId: saved.context.portCallId,
    berthStayId: saved.context.berthStayId,
    customerId: customer.id,
    agencyId: agency.id,
  }
  const list = (query: ServiceListQuery) =>
    services.list({ context: { sessionId: context().sessionId }, query })
  const result = value(await list(filters))
  expect(result.total).toBe(1)
  expect(result.items[0].id).toBe(saved.id)
  expect(result.items[0].specified).toEqual({ customerId: null, agencyId: null })
  expect(value(await list({ ...filters, category: 'FREE' })).total).toBe(0)
  expect(
    value(await list({ ...filters, fromUtc: '2026-06-01T13:00:00.001Z', toUtc: null })).total,
  ).toBe(0)
  const pages = await Promise.all([1, 2, 3, 4].map((page) => list({ page, pageSize: 1 })))
  expect(pages.map((r) => value(r).items.length)).toEqual([1, 1, 1, 0])
  expect(new Set(pages.flatMap((r) => value(r).items.map((s) => s.id))).size).toBe(3)
  for (const patch of [
    { category: 'OTHER' },
    { executionStatus: 'OTHER' },
    { customerId: 'bad' },
    { fromUtc: '2026-02-30T00:00:00.000Z' },
    { pageSize: 101 },
    { unknown: true },
  ])
    expect(await list({ ...filters, ...patch } as ServiceListQuery)).toMatchObject(
      failure('VALIDATION_ERROR'),
    )
  expect(await list({ ...filters, toUtc: '2026-01-01T00:00:00.000Z' })).toMatchObject(
    failure('VALIDATION_ERROR'),
  )
  for (const payload of [
    null,
    { operation: 'UPDATE_FREE', id: saved.id, values: null },
    { operation: 'DELETE', id: saved.id, category: 'FREE' },
  ])
    expect(await services.preview({ context: context(), payload: payload as never })).toMatchObject(
      failure('VALIDATION_ERROR'),
    )
  expect(
    await services.updateNotes({
      context: context(),
      payload: { id: saved.id, notes: 'x'.repeat(10001) },
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await services.updateNotes({
      context: context(),
      payload: { id: saved.id, notes: null, base: '0.00' } as never,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  integrity()
})

it('P16: cambio nave e istante ridetermina versioni, tariffa zero, soggetti indipendenti; FREE resta manuale', async () => {
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const original = value(await createCatalog()),
    free = value(await create())
  const second = value(
    await vessels().create({
      context: context(),
      payload: {
        registeredName: 'Seconda nave',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 150,
      },
    }),
  )
  expect(await previewChange(changeFor(original, { vesselId: second.id }))).toMatchObject(
    failure('OPERATIONAL_CONTEXT_MISSING'),
  )
  await operation({ ...entry(), vesselId: second.id })
  const version = value(
    await vessels().preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId: second.id,
        moment: moment('2026-06-01T14:00'),
        registeredName: 'Seconda aggiornata',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 200,
      },
    }),
  )
  value(
    await vessels().confirm({
      context: version.context,
      payload: { previewId: version.previewId },
    }),
  )
  const tariffService = new TariffService(archives.coordinator)
  const newTariff = value(
    await tariffService.previewCreate({
      context: context(),
      payload: {
        portId,
        moment: moment('2026-06-01T14:00'),
        configurations: (['STANDARD', 'PASSENGER', 'ADM'] as const).map((vesselTypeId) => ({
          vesselTypeId,
          brackets: [{ upperLimit: 5000, value: '0' }],
          extraWidth: 100,
          extraValue: '0',
        })),
      },
    }),
  )
  value(
    await tariffService.confirmCreate({
      context: newTariff.context,
      payload: { previewId: newTariff.previewId },
    }),
  )
  const customer = value(
      await customers().create({
        context: context(),
        payload: { businessName: 'Esplicito nuovo' },
      }),
    ),
    agency = value(
      await agencies().create({ context: context(), payload: { businessName: 'Ereditata nuova' } }),
    )
  const voyage = value(
    await operations.stays({
      context: { sessionId: context().sessionId },
      query: { vesselId: second.id, page: 1, pageSize: 25 },
    }),
  ).items[0]
  await assign({ kind: 'VOYAGE', id: voyage.id }, null, agency.id)
  const patch = {
    vesselId: second.id,
    moment: moment('2026-06-01T15:00'),
    specified: { customerId: customer.id, agencyId: null },
  }
  const pre = value(await previewChange(changeFor(original, patch)))
  expect(pre.after).toMatchObject({
    vesselId: second.id,
    vesselName: 'Seconda aggiornata',
    base: '0.00',
    subjects: {
      customer: { id: customer.id, source: { kind: 'SERVICE_ACTIVITY', id: original.id } },
      agency: { id: agency.id, source: { kind: 'VOYAGE', id: voyage.id } },
    },
  })
  expect(pre.after?.vesselVersionId).not.toBe(second.version.id)
  expect(pre.after?.calculation?.tariffId).not.toBe(original.calculation?.tariffId)
  const updated = value(
    await services.confirm({ context: pre.context, payload: { previewId: pre.previewId } }),
  ).service!
  expect(updated.base).toBe('0.00')
  const freeUpdated = (await applyChange(changeFor(free, patch))).service!
  expect(freeUpdated).toMatchObject({
    base: free.base,
    calculation: null,
    context: updated.context,
    vesselVersionId: updated.vesselVersionId,
  })
  integrity()
})
