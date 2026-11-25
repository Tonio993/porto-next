import { withoutDescriptions } from './support/without-descriptions'
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
import { TimeService } from '../../src/backend/application/time/time-service'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { CreateOperationDto } from '../../src/shared/contracts/operations'
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
  return withoutDescriptions(r.value)
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
  folder = mkdtempSync(join(tmpdir(), 'porto-p17b-'))
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

const insertionPreview = (payload: CreateOperationDto) =>
  operations.previewInsert({ context: context(), payload })
const confirmInsertion = (p: { context: ReturnType<typeof context>; previewId: string }) =>
  operations.confirmInsert({ context: p.context, payload: { previewId: p.previewId } })
async function insert(payload: CreateOperationDto) {
  const p = value(await insertionPreview(payload))
  expect(p.blockers).toEqual([])
  expect(p.status).toBe('READY')
  const result = value(await confirmInsertion(p))
  expect(result).toEqual(p.operationValues)
  return result
}
const moveInput = (
  status: CreateOperationDto['executionStatus'] = 'PLANNED',
  destinationPortId = portId,
  destinationBerthId: string | null = berthId,
  depart = '2026-06-02T12:00',
  arrival = '2026-06-02T13:00',
): CreateOperationDto => ({
  vesselId,
  operationType: 'MOVEMENT',
  executionStatus: status,
  moment: moment(depart),
  arrivalMoment: moment(arrival),
  interpretationPortId: null,
  destinationPortId,
  destinationBerthId,
  notes: 'Retroattiva',
  manualOverrideAmount: '0.00',
})

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'inserisce uno spostamento interno %s tra entrata e uscita senza applicazione incrementale',
  async (status) => {
    const entry = await create(),
      exit = await create(input('EXIT', '2026-06-05T12:00'))
    const original = stays()[0],
      oldOperations = all(),
      metadata = db().metadata(),
      revision = context().revision
    const incremental = vi.spyOn(OperationRepository.prototype, 'insert')
    const p = value(await insertionPreview(moveInput(status)))
    expect(p.status).toBe('READY')
    expect(db().metadata()).toEqual(metadata)
    expect(all()).toEqual(oldOperations)
    const paged = value(
      await operations.insertionEffects({
        context: { sessionId: context().sessionId },
        query: { previewId: p.previewId, page: 1, pageSize: 100 },
      }),
    )
    expect(paged.operationValues).toEqual(p.operationValues)
    expect(paged.effects.items).toEqual(p.effects.items)
    const result = value(await confirmInsertion(p))
    expect(result).toEqual(p.operationValues)
    expect(incremental).not.toHaveBeenCalled()
    expect(BigInt(context().revision)).toBe(BigInt(revision) + 1n)
    expect(new OperationRepository(db()).get(entry.id)).toEqual(entry)
    expect(new OperationRepository(db()).get(exit.id)).toEqual(exit)
    const voyage = stays()[0]
    expect(voyage.id).toBe(original.id)
    expect(voyage.visits[0].id).toBe(original.visits[0].id)
    expect(voyage.visits[0].stays[status === 'MISSED' ? 0 : 1].id).toBe(
      original.visits[0].stays[0].id,
    )
    expect(voyage.visits[0].stays).toHaveLength(status === 'MISSED' ? 1 : 2)
    if (status !== 'MISSED') {
      const next = voyage.visits[0].stays[0]
      expect(next.openingOperationId).toBe(result.id)
      expect(next.closingOperationId).toBe(exit.id)
      expect(p.effects.items.some((e) => e.reference.id === next.id && e.action === 'CREATE')).toBe(
        true,
      )
    }
    expect(sql().pragma('foreign_key_check')).toEqual([])
  },
)

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'inserisce entrata e uscita %s con identità e componenti stabili',
  async (status) => {
    await create(input('ENTRY', '2026-05-01T12:00'))
    await create(input('EXIT', '2026-05-02T12:00'))
    const before = structuredClone(stays())
    const entry = await insert(input('ENTRY', '2026-06-01T12:00', status))
    expect(stays().find((v) => v.id === before[0].id)).toEqual(before[0])
    if (status === 'MISSED') {
      expect(stays()).toEqual(before)
      await insert(input('ENTRY', '2026-05-03T12:00', 'MISSED'))
      await create(input('ENTRY', '2026-06-02T12:00'))
      const open = structuredClone(stays())
      await insert(input('EXIT', '2026-06-03T12:00', 'MISSED'))
      expect(stays()).toEqual(open)
    } else {
      const exit = await insert(input('EXIT', '2026-06-02T12:00', status))
      expect(stays().find((v) => v.openingOperationId === entry.id)).toMatchObject({
        openingOperationId: entry.id,
        closingOperationId: exit.id,
      })
    }
  },
)

it('riattribuisce FREE e CATALOG tra ormeggi, conserva assegnazioni esplicite, basi manuali e tuple', async () => {
  const entry = await create()
  const original = stays()[0],
    stay = original.visits[0].stays[0]
  const customer = value(
    await new CustomerService(archives.coordinator).create({
      context: context(),
      payload: { businessName: 'Cliente ormeggio' },
    }),
  )
  const assignments = new AssignmentService(archives.coordinator)
  const assignment = value(
    await assignments.preview({
      context: context(),
      payload: {
        target: { kind: 'BERTH_STAY', id: stay.id },
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
  const early = await free('2026-06-01T14:00'),
    later = await free('2026-06-03T12:00', 'MISSED'),
    catalog = await free('2026-06-03T12:00', 'PERFORMED', true)
  expect(later.subjects.customer?.id).toBe(customer.id)
  const beforeEntry = new OperationRepository(db()).get(entry.id)
  const p = value(await insertionPreview(moveInput('PERFORMED')))
  expect(
    p.effects.items.some(
      (e) => e.reference.id === later.id && e.changes.some((c) => c.field === 'Ormeggio'),
    ),
  ).toBe(true)
  value(await confirmInsertion(p))
  const newStay = stays()[0].visits[0].stays[0]
  const services = new ServiceRepository(db())
  expect(services.get(early.id)).toEqual(early)
  expect(services.get(later.id)).toMatchObject({
    moment: later.moment,
    base: later.base,
    context: { berthStayId: newStay.id },
    subjects: { customer: null },
  })
  expect(services.get(catalog.id)).toMatchObject({
    moment: catalog.moment,
    calculation: catalog.calculation,
    base: catalog.base,
    context: { berthStayId: newStay.id },
  })
  expect(sql().prepare('SELECT customer_id FROM berth_stays WHERE id=?').pluck().get(stay.id)).toBe(
    customer.id,
  )
  expect(
    sql().prepare('SELECT customer_id FROM berth_stays WHERE id=?').pluck().get(newStay.id),
  ).toBeNull()
  expect(new OperationRepository(db()).get(entry.id)).toEqual(beforeEntry)
})

async function destination() {
  const p = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Livorno',
        locality: 'Livorno',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  )
  await tariff('2026-01-01T00:00', '200', p.id)
  return p.id
}

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'spostamento esterno %s: componenti, versioni storiche, ricalcoli e FREE int64',
  async (status) => {
    await create()
    const dest = await destination(),
      freeService = await free('2026-06-03T12:00'),
      catalog = await free('2026-06-03T12:00', 'MISSED', true)
    const original = stays()[0]
    const result = await insert({
      ...moveInput(status, dest, null),
      arrivalManualOverrideAmount: '3.25',
    } as CreateOperationDto)
    expect(result.charges.map((c) => c.chargeKind)).toEqual(['EXIT', 'ENTRY'])
    expect(result.charges.map((c) => c.effectiveBase)).toEqual(['0.00', '3.25'])
    const services = new ServiceRepository(db())
    expect(services.get(freeService.id)).toMatchObject({
      moment: freeService.moment,
      base: freeService.base,
    })
    expect(services.get(catalog.id)).toMatchObject({
      moment: catalog.moment,
      base: status === 'MISSED' ? '115.00' : '215.00',
    })
    expect(stays()[0].id).toBe(original.id)
    expect(stays()[0].visits).toHaveLength(status === 'MISSED' ? 1 : 2)
    expect(services.get(catalog.id).context.portId).toBe(status === 'MISSED' ? portId : dest)
    expect(sql().pragma('foreign_key_check')).toEqual([])
  },
)

it('riesamina anche le operazioni MISSED lontane e blocca una sequenza invalida senza scritture', async () => {
  await create()
  await movement('2026-06-03T12:00', '2026-06-03T13:00')
  const missed = await create(input('EXIT', '2026-06-05T12:00', 'MISSED'))
  const old = all(),
    metadata = db().metadata()
  const p = value(await insertionPreview(input('EXIT', '2026-06-04T12:00', 'PERFORMED')))
  expect(p.status).toBe('BLOCKED')
  expect(p.blockers.length).toBeGreaterThan(0)
  expect(await confirmInsertion(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(all()).toEqual(old)
  expect(new OperationRepository(db()).get(missed.id)).toEqual(missed)
  expect(db().metadata()).toEqual(metadata)
})

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'rifiuta prestazioni %s orfane durante un trasferimento o dopo un’uscita',
  async (status) => {
    await create()
    await free('2026-06-02T12:30', status)
    const before = structuredClone(stays()),
      metadata = db().metadata()
    for (const payload of [moveInput(), input('EXIT', '2026-06-02T12:00')]) {
      const p = value(await insertionPreview(payload))
      expect(p.status).toBe('BLOCKED')
      expect(p.blockers[0].reason).toMatch(/prestazione|contesto|viaggio/i)
      expect(await confirmInsertion(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
    }
    expect(stays()).toEqual(before)
    expect(all()).toHaveLength(1)
    expect(db().metadata()).toEqual(metadata)
  },
)

it('controlla collisioni su tutti gli estremi, anche arrivi MISSED e minuti UTC', async () => {
  await create()
  const missed = await create({
    ...moveInput('MISSED'),
    arrivalMoment: moment('2026-06-04T13:00'),
  } as CreateOperationDto)
  const metadata = db().metadata()
  expect(
    await insertionPreview(
      moveInput('PERFORMED', portId, berthId, '2026-06-03T12:00', '2026-06-04T13:00'),
    ),
  ).toMatchObject({ ok: true, value: { status: 'BLOCKED' } })
  expect(await insertionPreview(input('EXIT', missed.arrival!.moment.localDateTime))).toMatchObject(
    failure('OPERATION_MINUTE_CONFLICT'),
  )
  const result = await insertionPreview(
    moveInput('MISSED', portId, berthId, '2026-06-03T12:00', '2026-06-03T11:59'),
  )
  expect(result).toMatchObject({ ok: true, value: { status: 'BLOCKED' } })
  expect(db().metadata()).toEqual(metadata)
})

it('riesamina FK composte/CASCADE alla conferma e conserva i dipendenti', async () => {
  await create()
  const original = stays()[0],
    metadata = db().metadata()
  const p = value(await insertionPreview(moveInput()))
  expect(p.status).toBe('READY')
  sql().exec(
    'CREATE TABLE external_stay (id TEXT PRIMARY KEY,stay_id TEXT,call_id TEXT,port_id TEXT,FOREIGN KEY(stay_id,call_id,port_id) REFERENCES berth_stays(id,port_call_id,port_id) ON DELETE CASCADE)',
  )
  sql()
    .prepare('INSERT INTO external_stay VALUES (?,?,?,?)')
    .run('ext', original.visits[0].stays[0].id, original.visits[0].id, portId)
  expect(await confirmInsertion(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(all()).toHaveLength(1)
  expect(sql().prepare('SELECT count(*) FROM external_stay').pluck().get()).toBe(1)
  expect(db().metadata()).toEqual(metadata)
  const blocked = value(await insertionPreview(moveInput()))
  sql().exec('DROP TABLE external_stay')
  expect(await confirmInsertion(blocked)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(value(await confirmInsertion(p))).toEqual(p.operationValues)
})

it('rollback dopo record ed effetti, anteprima riutilizzabile e revisione aggiornata una volta', async () => {
  await create()
  await free('2026-06-03T12:00')
  const before = structuredClone(stays()),
    metadata = db().metadata(),
    old = all()
  const p = value(await insertionPreview(moveInput()))
  const original = ServiceRepository.prototype.saveAttribution
  const spy = vi.spyOn(ServiceRepository.prototype, 'saveAttribution').mockImplementation(function (
    this: ServiceRepository,
    ...args
  ) {
    original.apply(this, args)
    throw Error('Rollback dopo attribuzione')
  })
  expect(await confirmInsertion(p)).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual(old)
  expect(stays()).toEqual(before)
  expect(db().metadata()).toEqual(metadata)
  spy.mockRestore()
  expect(value(await confirmInsertion(p))).toEqual(p.operationValues)
  expect(BigInt(context().revision)).toBe(BigInt(p.context.revision) + 1n)
  expect(await confirmInsertion(p)).toMatchObject(failure('REVISION_CONFLICT'))
  expect(
    await operations.confirmInsert({ context: context(), payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
})

it('anteprime isolate per namespace, obsolete e scadute; rifiuta campi inattesi IPC', async () => {
  await create()
  const normal = value(await preview(input('EXIT', '2026-06-04T12:00')))
  expect(await confirmInsertion(normal)).toMatchObject(failure('PREVIEW_EXPIRED'))
  const p = value(await insertionPreview(moveInput()))
  expect(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  expect(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  expect(
    await insertionPreview({ ...moveInput(), unexpected: true } as unknown as CreateOperationDto),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  await free('2026-06-04T12:00')
  expect(await confirmInsertion(p)).toMatchObject(failure('REVISION_CONFLICT'))
  const fresh = value(await insertionPreview(moveInput()))
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60 * 1000)
  expect(await confirmInsertion(fresh)).toMatchObject(failure('PREVIEW_EXPIRED'))
})

it('uno spostamento esterno retroattivo considera anche un arrivo MISSED successivo senza alterarne i dati', async () => {
  await create()
  const dest = await destination()
  const missed = await create(
    moveInput('MISSED', dest, null, '2026-06-02T12:00', '2026-06-05T13:00'),
  )
  const before = new OperationRepository(db()).get(missed.id)
  const createdAt = sql()
    .prepare('SELECT created_at FROM vessel_operations WHERE id=?')
    .pluck()
    .get(missed.id)
  await insert(moveInput('PERFORMED', dest, null, '2026-06-03T12:00', '2026-06-04T13:00'))
  expect(new OperationRepository(db()).get(missed.id)).toEqual(before)
  expect(
    sql().prepare('SELECT created_at FROM vessel_operations WHERE id=?').pluck().get(missed.id),
  ).toBe(createdAt)
  expect(stays()[0].visits).toHaveLength(2)
})

it('l’intera sequenza rifiuta un’operazione MISSED che inizi durante il nuovo trasferimento', async () => {
  await create()
  await create(input('EXIT', '2026-06-03T12:00', 'MISSED'))
  const p = value(
    await insertionPreview(
      moveInput('PERFORMED', portId, berthId, '2026-06-02T12:00', '2026-06-04T13:00'),
    ),
  )
  expect(p.status).toBe('BLOCKED')
  expect(p.blockers[0].reason).toMatch(/trasferimento/)
  expect(await confirmInsertion(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(all()).toHaveLength(2)
})

it('usa gli estremi UTC fra fusi diversi e rifiuta collisioni fra date locali differenti', async () => {
  await create()
  const dest = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'New York',
        locality: 'New York',
        countryCode: 'US',
        initialZoneId: 'America/New_York',
      },
    }),
  ).id
  await tariff('2026-01-01T00:00', '200', dest)
  const invalid = value(
    await insertionPreview(moveInput('MISSED', dest, null, '2026-06-02T12:00', '2026-06-02T06:00')),
  )
  expect(invalid.status).toBe('BLOCKED')
  const operation = await insert(
    moveInput('PERFORMED', dest, null, '2026-06-02T12:00', '2026-06-02T07:00'),
  )
  expect(operation.endpoint.moment.utc).toBe('2026-06-02T10:00:00.000Z')
  expect(operation.arrival!.moment.utc).toBe('2026-06-02T11:00:00.000Z')
})

it('rollback dopo record e componenti posseduti senza generare nuove identità alla riconferma', async () => {
  await create()
  const p = value(await insertionPreview(moveInput()))
  const repository = OperationRepository.prototype.insertRecords
  const spy = vi
    .spyOn(OperationRepository.prototype, 'insertRecords')
    .mockImplementationOnce(function (this: OperationRepository, op) {
      repository.call(this, op)
      throw Error('Rollback dopo record e componenti')
    })
  const metadata = db().metadata()
  expect(await confirmInsertion(p)).toMatchObject(failure('UNEXPECTED'))
  expect(db().metadata()).toEqual(metadata)
  expect(
    sql()
      .prepare('SELECT count(*) FROM operation_endpoints WHERE operation_id=?')
      .pluck()
      .get(p.operationValues.id),
  ).toBe(0)
  expect(
    sql()
      .prepare('SELECT count(*) FROM operation_charges WHERE operation_id=?')
      .pluck()
      .get(p.operationValues.id),
  ).toBe(0)
  spy.mockRestore()
  expect(value(await confirmInsertion(p))).toEqual(p.operationValues)
})

it('una nuova sessione Salva con nome invalida l’anteprima e conserva l’archivio senza inserimento', async () => {
  await create()
  const p = value(await insertionPreview(moveInput()))
  await archives.saveAs(join(folder, 'copia.ormeggi'))
  expect(context().sessionId).not.toBe(p.context.sessionId)
  expect(await confirmInsertion(p)).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  expect(all()).toHaveLength(1)
})

it('versioni ai due estremi e soggetti ereditati rispettano il proprio momento storico', async () => {
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const entry = await create(),
    dest = await destination()
  const customers = new CustomerService(archives.coordinator)
  const customer = value(
    await customers.create({ context: context(), payload: { businessName: 'Cliente viaggio' } }),
  )
  const assignment = value(
    await new AssignmentService(archives.coordinator).preview({
      context: context(),
      payload: {
        target: { kind: 'VOYAGE', id: stays()[0].id },
        specified: { customerId: customer.id, agencyId: null },
      },
    }),
  )
  value(
    await new AssignmentService(archives.coordinator).confirm({
      context: assignment.context,
      payload: { previewId: assignment.previewId },
    }),
  )
  const version = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        registeredName: 'Nave aggiornata',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 2500,
        moment: moment('2026-06-02T12:30'),
      },
    }),
  )
  value(
    await vessels.confirm({ context: version.context, payload: { previewId: version.previewId } }),
  )
  const op = await insert(moveInput('PERFORMED', dest, null))
  expect(op.endpoint.vesselVersionId).toBe(entry.vesselVersionId)
  expect(op.arrival!.vesselVersionId).not.toBe(entry.vesselVersionId)
  expect(op.charges.map((c) => c.calculation.size)).toEqual([2100, 2500])
  expect(op.charges.every((c) => c.subjects.customer?.id === customer.id)).toBe(true)
  expect(op.charges.every((c) => c.subjects.customer?.source.kind === 'VOYAGE')).toBe(true)
})

it('ricalcola il catalogo storico disattivato e conserva utilizzo e operazioni di un’altra nave', async () => {
  await create()
  const catalog = await free('2026-06-03T12:00', 'PERFORMED', true)
  expect(catalog.category).toBe('CATALOG')
  if (catalog.category !== 'CATALOG') throw Error('Fixture catalogo non valida')
  sql().prepare("UPDATE service_types SET status='INACTIVE' WHERE id=?").run(catalog.serviceTypeId)
  const second = value(
    await vessels.create({
      context: context(),
      payload: {
        registeredName: 'Seconda nave',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 2100,
      },
    }),
  )
  const other = await create({ ...input('ENTRY'), vesselId: second.id })
  const dest = await destination()
  await insert(moveInput('PERFORMED', dest, null))
  expect(new OperationRepository(db()).get(other.id)).toEqual(other)
  expect(new ServiceRepository(db()).get(catalog.id)).toMatchObject({
    base: '215.00',
    moment: catalog.moment,
    serviceTypeId: catalog.serviceTypeId,
  })
  expect(
    sql()
      .prepare('SELECT has_ever_been_used FROM service_types WHERE id=?')
      .pluck()
      .get(catalog.serviceTypeId),
  ).toBe(1)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('riesamina i nuovi riferimenti selezionabili alla conferma e non consuma l’anteprima respinta', async () => {
  await create()
  const p = value(await insertionPreview(moveInput()))
  const metadata = db().metadata()
  sql().prepare("UPDATE berths SET status='INACTIVE' WHERE id=?").run(berthId)
  expect(await confirmInsertion(p)).toMatchObject(failure('NOT_SELECTABLE'))
  expect(all()).toHaveLength(1)
  expect(db().metadata()).toEqual(metadata)
  sql().prepare("UPDATE berths SET status='ACTIVE' WHERE id=?").run(berthId)
  expect(value(await confirmInsertion(p))).toEqual(p.operationValues)
})
