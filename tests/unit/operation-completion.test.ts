import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { BerthService } from '../../src/backend/application/berths/berth-service'
import { TariffService } from '../../src/backend/application/tariffs/tariff-service'
import { OperationService } from '../../src/backend/application/operations/operation-service'
import { OperationRepository } from '../../src/backend/infrastructure/database/operation-repository'
import { ServiceService } from '../../src/backend/application/services/service-service'
import { ServiceRepository } from '../../src/backend/infrastructure/database/service-repository'
import { AssignmentService } from '../../src/backend/application/operations/assignment-service'
import { CustomerService } from '../../src/backend/application/customers/customer-service'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { CreateOperationDto, VesselOperationDto } from '../../src/shared/contracts/operations'
import type { TariffConfigurationInput } from '../../src/shared/contracts/tariffs'
let folder: string,
  archives: ArchiveService,
  operations: OperationService,
  ports: PortService,
  vessels: VesselService,
  berths: BerthService,
  tariffs: TariffService,
  portId: string,
  vesselId: string,
  berthId: string
const value = <T>(r: ApplicationResult<T>): T => {
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`)
  return r.value
}
const context = () => archives.context()!,
  db = () => archives.coordinator.requireSession().database,
  sql = () => db().sqlite
const moment = (localDateTime: string, selectedOffset: string | null = null) => ({
  localDateTime,
  selectedOffset,
})
const failure = (code: string) => ({ ok: false, error: { code } })
const config = (price = '100'): TariffConfigurationInput[] =>
  ['STANDARD', 'PASSENGER', 'ADM'].map((t) => ({
    vesselTypeId: t as TariffConfigurationInput['vesselTypeId'],
    brackets: [{ upperLimit: 1600, value: price }],
    extraWidth: 200,
    extraValue: '5',
  }))
async function tariff(at = '2026-01-01T00:00', price = '100', p = portId) {
  const pre = value(
    await tariffs.previewCreate({
      context: context(),
      payload: { portId: p, moment: moment(at), configurations: config(price) },
    }),
  )
  return value(
    await tariffs.confirmCreate({ context: pre.context, payload: { previewId: pre.previewId } }),
  )
}
function input(
  type: 'ENTRY' | 'EXIT' = 'ENTRY',
  at = '2026-06-01T12:00',
  status: CreateOperationDto['executionStatus'] = 'PLANNED',
): CreateOperationDto {
  const common = {
    vesselId,
    moment: moment(at),
    executionStatus: status,
    notes: null,
    manualOverrideAmount: null,
  }
  return type === 'ENTRY'
    ? { ...common, operationType: type, portId, berthId }
    : { ...common, operationType: type, interpretationPortId: null }
}
const preview = (payload = input()) => operations.previewCreate({ context: context(), payload })
async function create(payload = input()) {
  const p = value(await preview(payload))
  return value(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
}
const all = () => new OperationRepository(db()).all(vesselId)
const stays = () => new OperationRepository(db()).stays(vesselId, 1, 100).items
function completion(
  op: VesselOperationDto,
  patch: Partial<CreateOperationDto> = {},
): CreateOperationDto {
  return {
    vesselId: op.vesselId,
    operationType: op.operationType,
    executionStatus: 'PERFORMED',
    notes: op.notes,
    manualOverrideAmount: op.charges[0].manualOverrideAmount,
    moment: moment(op.endpoint.moment.localDateTime, op.endpoint.moment.offset),
    ...(op.operationType === 'ENTRY'
      ? { portId: op.endpoint.portId, berthId: op.endpoint.berthId }
      : { interpretationPortId: op.endpoint.portId }),
    ...(op.arrival
      ? {
          destinationPortId: op.arrival.portId,
          destinationBerthId: op.arrival.berthId,
          arrivalMoment: moment(op.arrival.moment.localDateTime, op.arrival.moment.offset),
          arrivalManualOverrideAmount: op.charges[1]?.manualOverrideAmount ?? null,
        }
      : {}),
    ...patch,
  } as CreateOperationDto
}
const completePreview = (op: VesselOperationDto, patch: Partial<CreateOperationDto> = {}) =>
  operations.previewComplete({
    context: context(),
    payload: { id: op.id, values: completion(op, patch) },
  })
async function complete(op: VesselOperationDto, patch: Partial<CreateOperationDto> = {}) {
  const p = value(await completePreview(op, patch))
  expect(p.blockers).toEqual([])
  return value(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  )
}
async function free(
  at: string,
  status: 'PLANNED' | 'PERFORMED' | 'MISSED' = 'PLANNED',
  catalog = false,
) {
  const svc = new ServiceService(archives.coordinator)
  const common = {
    vesselId,
    interpretationPortId: null,
    moment: moment(at),
    executionStatus: status,
    notes: null,
    specified: { customerId: null, agencyId: null },
  }
  if (!catalog)
    return value(
      await svc.createFree({
        context: context(),
        payload: { ...common, description: 'Servizio', base: '92233720368547758.07' },
      }),
    )
  const type = sql().prepare('SELECT id FROM service_types LIMIT 1').pluck().get() as string
  return value(
    await svc.createCatalog({ context: context(), payload: { ...common, serviceTypeId: type } }),
  )
}
async function movement(
  depart = '2026-06-02T12:00',
  arrival = '2026-06-02T13:00',
  destinationPortId = portId,
  destinationBerthId: string | null = berthId,
) {
  return create({
    vesselId,
    moment: moment(depart),
    executionStatus: 'PLANNED',
    notes: null,
    manualOverrideAmount: null,
    operationType: 'MOVEMENT',
    interpretationPortId: null,
    destinationPortId,
    destinationBerthId,
    arrivalMoment: moment(arrival),
  })
}
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p10-'))
  archives = new ArchiveService()
  await archives.create(join(folder, 'a.ormeggi'), 'P10')
  operations = new OperationService(archives.coordinator)
  ports = new PortService(archives.coordinator)
  vessels = new VesselService(archives.coordinator)
  berths = new BerthService(archives.coordinator)
  tariffs = new TariffService(archives.coordinator)
  portId = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Genova',
        locality: 'Genova',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  ).id
  vesselId = value(
    await vessels.create({
      context: context(),
      payload: { registeredName: 'Nave', imoNumber: null, vesselTypeId: 'STANDARD', size: 2100 },
    }),
  ).id
  berthId = value(await berths.create({ context: context(), payload: { portId, name: 'Molo' } })).id
  await tariff()
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
  vi.restoreAllMocks()
})

it('PERFORMED conserva identità, tuple storiche, assegnazioni e basi FREE int64; ricalcola i soggetti', async () => {
  const entry = await create(),
    original = structuredClone(stays()),
    service = await free('2026-06-01T12:00', 'MISSED')
  const customer = value(
    await new CustomerService(archives.coordinator).create({
      context: context(),
      payload: { businessName: 'Cliente viaggio' },
    }),
  )
  const assignments = new AssignmentService(archives.coordinator)
  const assignment = value(
    await assignments.preview({
      context: context(),
      payload: {
        target: { kind: 'VOYAGE', id: original[0].id },
        specified: { customerId: customer.id, agencyId: null },
      },
    }),
  )
  value(
    await assignments.confirm({
      context: assignment.context,
      payload: { previewId: assignment.previewId },
    }),
  )
  const before = context(),
    metadata = db().metadata(),
    p = value(await completePreview(entry))
  expect(p.status).toBe('READY')
  expect(context()).toEqual(before)
  expect(db().metadata()).toEqual(metadata)
  expect(p.operationValues.endpoint.moment).toEqual(entry.endpoint.moment)
  const performed = value(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(performed.executionStatus).toBe('PERFORMED')
  expect(stays()).toEqual(original)
  expect(BigInt(context().revision)).toBe(BigInt(before.revision) + 1n)
  expect(new ServiceRepository(db()).get(service.id)).toMatchObject({
    executionStatus: 'MISSED',
    base: '92233720368547758.07',
    subjects: { customer: { id: customer.id, source: { kind: 'VOYAGE', id: original[0].id } } },
  })
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(sql().pragma('integrity_check', { simple: true })).toBe('ok')
  const saved = all(),
    structure = stays()
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(all()).toEqual(saved)
  expect(stays()).toEqual(structure)
})

it('entrata mancata isolata rimuove esplicitamente le tre permanenze senza azzerare base e tuple', async () => {
  const entry = await create(),
    p = value(await completePreview(entry, { executionStatus: 'MISSED' }))
  expect(p.summary.deleted).toBe(3)
  const result = value(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(stays()).toEqual([])
  expect(result.totalBase).toBe(entry.totalBase)
  expect(result.endpoint).toEqual(entry.endpoint)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'entrata mancata rifiuta la prestazione orfana %s senza alcuna scrittura',
  async (status) => {
    const entry = await create(),
      service = await free('2026-06-01T12:00', status),
      before = db().metadata(),
      original = stays()
    const p = value(await completePreview(entry, { executionStatus: 'MISSED' }))
    expect(p.status).toBe('BLOCKED')
    expect(p.blockers[0].reason).toContain('prestazione')
    expect(
      await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
    ).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(db().metadata()).toEqual(before)
    expect(stays()).toEqual(original)
    expect(new ServiceRepository(db()).get(service.id).base).toBe(service.base)
  },
)

it('valida anche le operazioni MISSED successive e tutti gli estremi temporali', async () => {
  const entry = await create()
  await create(input('EXIT', '2026-06-02T12:00', 'MISSED'))
  expect(value(await completePreview(entry, { executionStatus: 'MISSED' })).status).toBe('BLOCKED')
  expect(value(await completePreview(entry, { moment: moment('2026-06-02T13:00') })).status).toBe(
    'BLOCKED',
  )
  expect(
    value(await completePreview(entry, { moment: moment('2026-06-02T12:00') })).blockers[0].reason,
  ).toContain('minuto UTC')
})

it('uscita effettuata e mancata: chiusure coerenti, estensione e nuova entrata incompatibile', async () => {
  await create()
  const exit = await create(input('EXIT', '2026-06-02T12:00')),
    first = stays()[0]
  await complete(exit, { executionStatus: 'MISSED' })
  expect(stays()[0]).toMatchObject({ id: first.id, endedAt: null, closingOperationId: null })
  const exit2 = await create(input('EXIT', '2026-06-03T12:00'))
  await complete(exit2, { moment: moment('2026-06-03T14:00') })
  expect(stays()[0].endedAt).toBe('2026-06-03T12:00:00.000Z')
  await create(input('ENTRY', '2026-06-04T12:00'))
  const exit3 = await create(input('EXIT', '2026-06-05T12:00'))
  await create(input('ENTRY', '2026-06-06T12:00'))
  expect(value(await completePreview(exit3, { executionStatus: 'MISSED' })).status).toBe('BLOCKED')
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('spostamento interno mancato riattribuisce FREE/CATALOG, conserva assegnazioni compatibili e catalogo storico', async () => {
  await create()
  const secondBerth = value(
    await berths.create({ context: context(), payload: { portId, name: 'Molo due' } }),
  ).id
  const move = await movement('2026-06-02T12:00', '2026-06-02T13:00', portId, secondBerth)
  const freeService = await free('2026-06-02T13:00'),
    catalog = await free('2026-06-03T12:00', 'MISSED', true)
  const original = stays()[0],
    originStay = original.visits[0].stays[0],
    removed = original.visits[0].stays[1]
  const p = value(await completePreview(move, { executionStatus: 'MISSED' }))
  expect(p.summary.reattributed).toBe(2)
  expect(p.summary.deleted).toBe(1)
  const page = value(
    await operations.completionEffects({
      context: { sessionId: p.context.sessionId },
      query: { previewId: p.previewId, page: 1, pageSize: 1 },
    }),
  )
  expect(page.effects.total).toBe(p.effects.total)
  expect(page.effects.items).toHaveLength(1)
  await operations
    .confirmComplete({ context: p.context, payload: { previewId: p.previewId } })
    .then(value)
  expect(stays()[0].visits[0].stays).toHaveLength(1)
  for (const service of [freeService, catalog])
    expect(new ServiceRepository(db()).get(service.id).context).toMatchObject({
      berthStayId: originStay.id,
      berthId,
    })
  expect(new ServiceRepository(db()).get(freeService.id).base).toBe(freeService.base)
  expect(sql().prepare('SELECT 1 FROM berth_stays WHERE id=?').get(removed.id)).toBeUndefined()
  expect(
    sql()
      .prepare('SELECT has_ever_been_used FROM service_types WHERE id=?')
      .pluck()
      .get(catalog.serviceTypeId),
  ).toBe(1)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('spostamento effettuato riattribuisce ai confini e blocca l’intervallo di trasferimento', async () => {
  await create()
  const move = await movement(),
    before = stays(),
    origin = before[0].visits[0].stays[0],
    destination = before[0].visits[0].stays[1]
  const departure = await free('2026-06-02T12:00'),
    arrival = await free('2026-06-02T13:00')
  const blocked = value(await completePreview(move, { arrivalMoment: moment('2026-06-02T13:01') }))
  expect(blocked.status).toBe('BLOCKED')
  await complete(move, { moment: moment('2026-06-02T12:01') })
  expect(new ServiceRepository(db()).get(departure.id).context.berthStayId).toBe(origin.id)
  expect(new ServiceRepository(db()).get(arrival.id).context.berthStayId).toBe(destination.id)
  expect(stays()[0].visits[0].stays[1].id).toBe(destination.id)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

async function destination() {
  const p = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Londra',
        locality: 'Londra',
        countryCode: 'GB',
        initialZoneId: 'Europe/London',
      },
    }),
  )
  await tariff('2026-01-01T00:00', '200', p.id)
  return p.id
}

it('spostamento esterno mancato riattribuisce nel porto origine e ricalcola CATALOG mantenendo FREE e tuple', async () => {
  await create()
  const dest = await destination(),
    move = await movement('2026-06-02T12:00', '2026-06-02T13:00', dest, null)
  const freeService = await free('2026-06-03T12:00'),
    catalog = await free('2026-06-03T12:00', 'PERFORMED', true),
    origin = stays()[0].visits[0]
  expect(catalog.base).toBe('215.00')
  await complete(move, { executionStatus: 'MISSED' })
  expect(stays()[0].visits).toHaveLength(1)
  for (const service of [freeService, catalog])
    expect(new ServiceRepository(db()).get(service.id)).toMatchObject({
      moment: service.moment,
      context: { portId, portCallId: origin.id },
    })
  expect(new ServiceRepository(db()).get(catalog.id).base).toBe('115.00')
  expect(new ServiceRepository(db()).get(freeService.id).base).toBe(freeService.base)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('cambio interno → esterno → nuovo interno assegna nuove identità soltanto alle aperture nuove', async () => {
  await create()
  const move = await movement(),
    original = stays()[0],
    dest = await destination()
  const p = value(
    await completePreview(move, {
      destinationPortId: dest,
      destinationBerthId: null,
      arrivalMoment: moment('2026-06-02T13:00'),
    }),
  )
  expect(p.status).toBe('READY')
  const visitEffect = p.effects.items.find(
    (e) => e.reference.kind === 'PORT_CALL' && e.action === 'CREATE',
  )!
  const result = value(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(result).toEqual(p.operationValues)
  expect(result.charges.map((c) => c.chargeKind)).toEqual(['EXIT', 'ENTRY'])
  expect(stays()[0].id).toBe(original.id)
  expect(stays()[0].visits[1].id).toBe(visitEffect.reference.id)
  expect(stays()[0].visits[1].stays[0].id).toBe(original.visits[0].stays[1].id)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('una permanenza rimossa e ricreata riceve nuova identità; la precedente assegnazione non riappare', async () => {
  await create()
  const move = await movement(),
    old = stays()[0].visits[0].stays[1]
  const customer = value(
    await new CustomerService(archives.coordinator).create({
      context: context(),
      payload: { businessName: 'Solo ormeggio rimosso' },
    }),
  )
  sql().prepare('UPDATE berth_stays SET customer_id=? WHERE id=?').run(customer.id, old.id)
  await complete(move, { executionStatus: 'MISSED' })
  const next = await movement('2026-06-02T14:00', '2026-06-02T15:00')
  const recreated = stays()[0].visits[0].stays[1]
  expect(recreated.id).not.toBe(old.id)
  expect(recreated.openingOperationId).toBe(next.id)
  expect(
    sql().prepare('SELECT customer_id FROM berth_stays WHERE id=?').pluck().get(recreated.id),
  ).toBeNull()
})

it('FK esterne composte/CASCADE su permanenze e componenti posseduti bloccano senza eliminare dipendenti', async () => {
  const entry = await create(),
    voyage = stays()[0]
  sql().exec(
    'CREATE TABLE external_voyage (id TEXT PRIMARY KEY,voyage_id TEXT,vessel_id TEXT,FOREIGN KEY(voyage_id,vessel_id) REFERENCES voyages(id,vessel_id) ON DELETE CASCADE)',
  )
  sql().prepare('INSERT INTO external_voyage VALUES (?,?,?)').run('ext', voyage.id, vesselId)
  const p = value(await completePreview(entry, { executionStatus: 'MISSED' })),
    metadata = db().metadata()
  expect(p.blockers.some((b) => b.reference.label.includes('external_voyage'))).toBe(true)
  expect(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(sql().prepare('SELECT count(*) FROM external_voyage').pluck().get()).toBe(1)
  expect(db().metadata()).toEqual(metadata)
  sql().exec('DROP TABLE external_voyage')
  const move = await movement(),
    dest = await destination()
  sql().exec(
    'CREATE TABLE external_subject (id TEXT PRIMARY KEY,charge_id TEXT REFERENCES operation_charge_subjects(charge_id) ON DELETE CASCADE)',
  )
  sql().prepare('INSERT INTO external_subject VALUES (?,?)').run('ext', move.charges[0].id)
  expect(
    value(
      await completePreview(move, {
        destinationPortId: dest,
        destinationBerthId: null,
        arrivalMoment: moment('2026-06-02T13:00'),
      }),
    ).blockers.some((b) => b.reference.label.includes('external_subject')),
  ).toBe(true)
  expect(sql().prepare('SELECT count(*) FROM external_subject').pluck().get()).toBe(1)
})

it('conferma riesamina FK nuove senza revisione e anteprima resta utilizzabile dopo rollback', async () => {
  const entry = await create(),
    p = value(await completePreview(entry, { executionStatus: 'MISSED' })),
    old = stays(),
    metadata = db().metadata()
  sql().exec(
    'CREATE TABLE late_ref (id TEXT PRIMARY KEY,stay_id TEXT REFERENCES berth_stays(id) ON DELETE CASCADE)',
  )
  sql().prepare('INSERT INTO late_ref VALUES (?,?)').run('late', old[0].visits[0].stays[0].id)
  expect(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(db().metadata()).toEqual(metadata)
  expect(stays()).toEqual(old)
  sql().exec('DROP TABLE late_ref')
  const spy = vi.spyOn(OperationRepository.prototype, 'saveCharges').mockImplementationOnce(() => {
    throw Error('rollback dopo UPDATE')
  })
  expect(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(db().metadata()).toEqual(metadata)
  expect(all()[0].executionStatus).toBe('PLANNED')
  expect(stays()).toEqual(old)
  spy.mockRestore()
  value(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(stays()).toEqual([])
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('protegge namespace, revisione, sessione, scadenza, conferme ripetute e input IPC', async () => {
  const entry = await create(),
    p = value(await completePreview(entry))
  expect(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  expect(
    await operations.previewComplete({
      context: context(),
      payload: { id: entry.id, values: { ...completion(entry), extra: 1 } },
    } as never),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(await completePreview(entry, { executionStatus: 'PLANNED' })).toMatchObject(
    failure('VALIDATION_ERROR'),
  )
  expect(
    await completePreview(entry, { executionStatus: 'MISSED', moment: moment('2026-06-01T13:00') }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  const old = context()
  await free('2026-06-01T13:00')
  expect(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  expect(
    await operations.completionEffects({
      context: { sessionId: old.sessionId },
      query: { previewId: p.previewId, page: 1, pageSize: 1 },
    }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  const next = value(await completePreview(entry))
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(next.expiresAtUtc) + 1)
  expect(
    await operations.confirmComplete({
      context: next.context,
      payload: { previewId: next.previewId },
    }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  vi.restoreAllMocks()
  const last = value(await completePreview(entry))
  value(
    await operations.confirmComplete({
      context: last.context,
      payload: { previewId: last.previewId },
    }),
  )
  expect(
    await operations.confirmComplete({
      context: context(),
      payload: { previewId: last.previewId },
    }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  expect(await completePreview(entry)).toMatchObject(failure('VALIDATION_ERROR'))
  await archives.saveAs(join(folder, 'copy.ormeggi'))
  expect(
    await operations.confirmComplete({
      context: last.context,
      payload: { previewId: last.previewId },
    }),
  ).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
})

it('entrata effettiva in altro porto riattribuisce e ricalcola al proprio istante mantenendo identità e assegnazioni', async () => {
  const entry = await create(),
    service = await free('2026-06-01T12:00', 'MISSED', true),
    original = stays()[0],
    dest = await destination()
  const customer = value(
    await new CustomerService(archives.coordinator).create({
      context: context(),
      payload: { businessName: 'Assegnazione compatibile' },
    }),
  )
  sql()
    .prepare('UPDATE port_calls SET customer_id=? WHERE id=?')
    .run(customer.id, original.visits[0].id)
  const result = await complete(entry, {
    portId: dest,
    berthId: null,
    moment: moment('2026-06-01T11:00'),
  })
  expect(stays()[0].id).toBe(original.id)
  expect(stays()[0].visits[0].id).toBe(original.visits[0].id)
  expect(stays()[0].visits[0].stays[0].id).toBe(original.visits[0].stays[0].id)
  expect(result.endpoint.moment.utc).toBe(entry.endpoint.moment.utc)
  expect(result.endpoint.moment.zoneId).toBe('Europe/London')
  expect(new ServiceRepository(db()).get(service.id)).toMatchObject({
    moment: service.moment,
    base: '215.00',
    context: { portId: dest },
    subjects: {
      customer: { id: customer.id, source: { kind: 'PORT_CALL', id: original.visits[0].id } },
    },
  })
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('esterno effettuato diventa interno: visita rimossa, ormeggio ancorato, componenti e soggetti rimossi esplicitamente', async () => {
  await create()
  const dest = await destination(),
    move = await movement('2026-06-02T12:00', '2026-06-02T13:00', dest, null),
    previous = stays()[0]
  const oldChargeIds = move.charges.map((c) => c.id),
    service = await free('2026-06-03T12:00', 'MISSED', true)
  const p = value(
    await completePreview(move, {
      destinationPortId: portId,
      destinationBerthId: berthId,
      arrivalMoment: moment('2026-06-02T14:00'),
    }),
  )
  expect(p.blockers).toEqual([])
  const result = value(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(result).toEqual(p.operationValues)
  expect(result.charges).toHaveLength(1)
  expect(result.charges[0].chargeKind).toBe('MOVEMENT')
  expect(oldChargeIds).not.toContain(result.charges[0].id)
  for (const id of oldChargeIds) {
    expect(sql().prepare('SELECT 1 FROM operation_charges WHERE id=?').get(id)).toBeUndefined()
    expect(
      sql().prepare('SELECT 1 FROM operation_charge_subjects WHERE charge_id=?').get(id),
    ).toBeUndefined()
  }
  expect(stays()[0].visits).toHaveLength(1)
  expect(stays()[0].visits[0].stays[1].id).toBe(previous.visits[1].stays[0].id)
  expect(new ServiceRepository(db()).get(service.id).base).toBe('115.00')
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('rollback dopo ricostruzione e riattribuzione ripristina dati, metadati e anteprima', async () => {
  await create()
  const move = await movement(),
    service = await free('2026-06-03T12:00'),
    original = stays(),
    metadata = db().metadata(),
    p = value(await completePreview(move, { executionStatus: 'MISSED' }))
  const save = ServiceRepository.prototype.saveAttribution
  const spy = vi
    .spyOn(ServiceRepository.prototype, 'saveAttribution')
    .mockImplementationOnce(function (this: ServiceRepository, value) {
      save.call(this, value)
      throw Error('rollback dopo attribuzione')
    })
  expect(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(stays()).toEqual(original)
  expect(db().metadata()).toEqual(metadata)
  expect(new ServiceRepository(db()).get(service.id)).toEqual(service)
  spy.mockRestore()
  value(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(new ServiceRepository(db()).get(service.id).context.berthStayId).toBe(
    original[0].visits[0].stays[0].id,
  )
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('proposta originariamente bloccata non diventa confermabile dopo rimozione diretta del vincolo', async () => {
  const entry = await create(),
    original = stays()
  sql().exec('CREATE TABLE initial_ref (id TEXT PRIMARY KEY,voyage_id TEXT REFERENCES voyages(id))')
  sql().prepare('INSERT INTO initial_ref VALUES (?,?)').run('ref', original[0].id)
  const p = value(await completePreview(entry, { executionStatus: 'MISSED' }))
  expect(p.status).toBe('BLOCKED')
  sql().exec('DROP TABLE initial_ref')
  expect(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(stays()).toEqual(original)
  await complete(entry, { executionStatus: 'MISSED' })
})

it('gap, overlap esplicito, arrivo non successivo e campi obbligatori nulli sono verificati nel backend', async () => {
  const entry = await create()
  expect(value(await completePreview(entry, { moment: moment('2026-03-29T02:30') })).status).toBe(
    'BLOCKED',
  )
  const choices = value(
    await operations.resolveCompletionMoment({
      context: { sessionId: context().sessionId },
      query: { id: entry.id, values: completion(entry, { moment: moment('2026-10-25T02:30') }) },
    }),
  )
  expect(choices.resolution.status).toBe('CHOICE_REQUIRED')
  expect(value(await completePreview(entry, { moment: moment('2026-10-25T02:30') })).status).toBe(
    'BLOCKED',
  )
  expect(await completePreview(entry, { portId: null } as never)).toMatchObject(
    failure('VALIDATION_ERROR'),
  )
  await complete(entry, { moment: moment('2026-10-25T02:30', '+01:00') })
  const move = await movement('2026-10-26T12:00', '2026-10-26T13:00')
  expect(
    value(await completePreview(move, { arrivalMoment: moment('2026-10-26T12:00') })).status,
  ).toBe('BLOCKED')
})

it('riferimenti storici disattivati restano validi, nuove destinazioni non selezionabili sono bloccate', async () => {
  const entry = await create(),
    dest = await destination()
  sql().prepare("UPDATE ports SET status='INACTIVE' WHERE id IN (?,?)").run(portId, dest)
  sql().prepare("UPDATE berths SET status='INACTIVE' WHERE id=?").run(berthId)
  expect(value(await completePreview(entry)).status).toBe('READY')
  expect(
    value(
      await completePreview(entry, {
        portId: dest,
        berthId: null,
        moment: moment('2026-06-01T11:00'),
      }),
    ).status,
  ).toBe('BLOCKED')
  await complete(entry)
})
