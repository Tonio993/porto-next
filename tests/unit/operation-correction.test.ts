import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { operationCorrectionOutcome } from '../../src/renderer/src/api/operation-correction-outcome'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { BerthService } from '../../src/backend/application/berths/berth-service'
import { TariffService } from '../../src/backend/application/tariffs/tariff-service'
import { OperationService } from '../../src/backend/application/operations/operation-service'
import { OperationRepository } from '../../src/backend/infrastructure/database/operation-repository'
import { ServiceService } from '../../src/backend/application/services/service-service'
import { ServiceRepository } from '../../src/backend/infrastructure/database/service-repository'
import { TimeService } from '../../src/backend/application/time/time-service'
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
  folder = mkdtempSync(join(tmpdir(), 'porto-p17c-'))
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

function correction(
  op: VesselOperationDto,
  patch: Partial<CreateOperationDto> = {},
): CreateOperationDto {
  return {
    vesselId: op.vesselId,
    operationType: op.operationType,
    executionStatus: op.executionStatus,
    notes: op.notes,
    manualOverrideAmount: op.charges.find((c) => c.economicEndpointRole !== 'ARRIVAL')!
      .manualOverrideAmount,
    moment: moment(op.endpoint.moment.localDateTime, op.endpoint.moment.offset),
    ...(op.operationType === 'ENTRY'
      ? { portId: op.endpoint.portId, berthId: op.endpoint.berthId }
      : { interpretationPortId: op.endpoint.portId }),
    ...(op.arrival
      ? {
          destinationPortId: op.arrival.portId,
          destinationBerthId: op.arrival.berthId,
          arrivalMoment: moment(op.arrival.moment.localDateTime, op.arrival.moment.offset),
          arrivalManualOverrideAmount:
            op.charges.find((c) => c.economicEndpointRole === 'ARRIVAL')?.manualOverrideAmount ??
            null,
        }
      : {}),
    ...patch,
  } as CreateOperationDto
}
const correctPreview = (op: VesselOperationDto, patch: Partial<CreateOperationDto> = {}) =>
  operations.previewCorrect({
    context: context(),
    payload: { id: op.id, values: correction(op, patch) },
  })
const confirm = (p: { context: ReturnType<typeof context>; previewId: string }) =>
  operations.confirmCorrect({ context: p.context, payload: { previewId: p.previewId } })
async function correct(op: VesselOperationDto, patch: Partial<CreateOperationDto> = {}) {
  const p = value(await correctPreview(op, patch))
  expect(p.blockers).toEqual([])
  expect(p.status).toBe('READY')
  const result = value(await confirm(p))
  expect(result).toEqual(p.operationValues)
  expect(operationCorrectionOutcome(op, p.operationValues, result, p.context, context())).toBe(
    'APPLIED',
  )
  expect(sql().pragma('foreign_key_check')).toEqual([])
  return result
}
async function otherVessel() {
  return value(
    await vessels.create({
      context: context(),
      payload: {
        registeredName: 'Seconda nave',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 1200,
      },
    }),
  ).id
}
async function destination() {
  const p = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Savona',
        locality: 'Savona',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  ).id
  await tariff('2026-01-01T00:00', '200', p)
  return p
}
const snapshot = () => ({
  metadata: db().metadata(),
  operations: new OperationRepository(db()).all(),
  stays: sql().prepare('SELECT * FROM berth_stays ORDER BY id').all(),
  services: new ServiceRepository(db()).all(),
})

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'corregge entrata %s, conserva ID, created_at e componente e aggiorna una revisione',
  async (status) => {
    const op = await create(input('ENTRY', '2026-06-01T12:00', status))
    const created = sql()
      .prepare('SELECT created_at FROM vessel_operations WHERE id=?')
      .pluck()
      .get(op.id)
    const old = snapshot(),
      revision = context().revision
    const p = value(
      await correctPreview(op, {
        moment: moment('2026-06-01T11:00'),
        manualOverrideAmount: '0.00',
      }),
    )
    expect(snapshot()).toEqual(old)
    const paged = value(
      await operations.correctionEffects({
        context: { sessionId: context().sessionId },
        query: { previewId: p.previewId, page: 1, pageSize: 100 },
      }),
    )
    expect(paged.operationValues).toEqual(p.operationValues)
    const result = value(await confirm(p))
    expect(result.id).toBe(op.id)
    expect(result.charges[0].id).toBe(op.charges[0].id)
    expect(result.charges[0].manualOverrideAmount).toBe('0.00')
    expect(BigInt(context().revision)).toBe(BigInt(revision) + 1n)
    expect(
      sql().prepare('SELECT created_at FROM vessel_operations WHERE id=?').pluck().get(op.id),
    ).toBe(created)
  },
)
it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'corregge uscita %s senza cambiare gli altri record',
  async (status) => {
    const entry = await create(),
      exit = await create(input('EXIT', '2026-06-03T12:00', status))
    const result = await correct(exit, { moment: moment('2026-06-04T12:00') })
    expect(result.charges[0].id).toBe(exit.charges[0].id)
    expect(new OperationRepository(db()).get(entry.id)).toEqual(entry)
  },
)
it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'corregge spostamento %s e valida entrambi gli estremi',
  async (status) => {
    await create()
    const move = await movement()
    const result = await correct(move, {
      executionStatus: status,
      moment: moment('2026-06-02T14:00'),
      arrivalMoment: moment('2026-06-02T15:00'),
    })
    expect(result.charges[0].id).toBe(move.charges[0].id)
    expect(stays()[0].visits[0].stays).toHaveLength(status === 'MISSED' ? 1 : 2)
  },
)
it.each(['PLANNED', 'PERFORMED'] as const)(
  'riattiva un’entrata MISSED come %s con ID strutturali preparati',
  async (status) => {
    const op = await create(input('ENTRY', '2026-06-01T12:00', 'MISSED'))
    const p = value(await correctPreview(op, { executionStatus: status }))
    const ids = p.effects.items.filter((e) => e.action === 'CREATE').map((e) => e.reference.id)
    value(await confirm(p))
    expect(ids).toContain(stays()[0].id)
    expect(ids).toContain(stays()[0].visits[0].stays[0].id)
  },
)
it('cambio nave di entrata: sposta le identità ancorate, assegnazioni e ricalcoli nella stessa transazione', async () => {
  const op = await create(),
    original = stays()[0],
    second = await otherVessel()
  const customer = value(
    await new CustomerService(archives.coordinator).create({
      context: context(),
      payload: { businessName: 'Cliente viaggio' },
    }),
  )
  const svc = new AssignmentService(archives.coordinator)
  const pre = value(
    await svc.preview({
      context: context(),
      payload: {
        target: { kind: 'VOYAGE', id: original.id },
        specified: { customerId: customer.id, agencyId: null },
      },
    }),
  )
  value(await svc.confirm({ context: pre.context, payload: { previewId: pre.previewId } }))
  const revision = context().revision
  const result = await correct(new OperationRepository(db()).get(op.id), { vesselId: second })
  expect(result.vesselId).toBe(second)
  expect(result.charges[0].id).toBe(op.charges[0].id)
  expect(result.charges[0].calculation.vesselId).toBe(second)
  expect(result.charges[0].subjects.customer?.id).toBe(customer.id)
  expect(stays()).toEqual([])
  expect(new OperationRepository(db()).stays(second, 1, 100).items[0].id).toBe(original.id)
  expect(BigInt(context().revision)).toBe(BigInt(revision) + 1n)
})
it('cambio nave di uscita valido aggiorna entrambe le cronologie e conserva le entrate', async () => {
  const entry = await create(),
    exit = await create(input('EXIT', '2026-06-03T12:00'))
  const second = await otherVessel(),
    entry2 = await create({ ...input(), vesselId: second })
  await correct(exit, { vesselId: second })
  expect(stays()[0].closingOperationId).toBeNull()
  expect(new OperationRepository(db()).stays(second, 1, 100).items[0].closingOperationId).toBe(
    exit.id,
  )
  expect(new OperationRepository(db()).get(entry.id)).toEqual(entry)
  expect(new OperationRepository(db()).get(entry2.id)).toEqual(entry2)
})
it.each(['source', 'target', 'service'] as const)(
  'cambio nave bloccato da %s non modifica nessuna cronologia',
  async (cause) => {
    const entry = await create(),
      second = await otherVessel()
    if (cause === 'source') await create(input('EXIT', '2026-06-03T12:00'))
    if (cause === 'target') await create({ ...input(), vesselId: second })
    if (cause === 'service') await free('2026-06-02T12:00', 'MISSED')
    const before = snapshot(),
      p = value(await correctPreview(entry, { vesselId: second }))
    expect(p.status).toBe('BLOCKED')
    expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(snapshot()).toEqual(before)
  },
)
it('trasforma interno/esterno, ricrea componenti non equivalenti e non riusa ID rimossi', async () => {
  await create()
  const move = await movement(),
    port2 = await destination()
  const external = await correct(move, {
    destinationPortId: port2,
    destinationBerthId: null,
    arrivalManualOverrideAmount: '12.34',
  })
  expect(external.id).toBe(move.id)
  expect(external.charges.map((c) => c.id)).not.toContain(move.charges[0].id)
  expect(external.charges.map((c) => c.chargeKind)).toEqual(['EXIT', 'ENTRY'])
  const again = await correct(external, {
    destinationPortId: portId,
    destinationBerthId: berthId,
    arrivalManualOverrideAmount: null,
  })
  expect(again.charges[0].id).not.toBe(move.charges[0].id)
  expect(external.charges.map((c) => c.id)).not.toContain(again.charges[0].id)
  expect(
    sql()
      .prepare(
        'SELECT count(*) FROM operation_charge_subjects s LEFT JOIN operation_charges c ON c.id=s.charge_id WHERE c.id IS NULL',
      )
      .pluck()
      .get(),
  ).toBe(0)
})
it('le componenti equivalenti di uno spostamento esterno si conservano anche con array invertito', async () => {
  await create()
  const p2 = await destination()
  const move = await movement('2026-06-02T12:00', '2026-06-02T13:00', p2, null)
  const original = OperationRepository.prototype.get
  vi.spyOn(OperationRepository.prototype, 'get').mockImplementation(function (
    this: OperationRepository,
    id,
  ) {
    const op = original.call(this, id)
    return op.id === move.id ? { ...op, charges: [...op.charges].reverse() } : op
  })
  const p = value(await correctPreview(move, { arrivalMoment: moment('2026-06-02T14:00') }))
  const result = value(await confirm(p))
  expect(new Set(result.charges.map((c) => c.id))).toEqual(new Set(move.charges.map((c) => c.id)))
})
it('cambia tipologia EXIT in MOVEMENT e ritorno preservando l’operazione', async () => {
  await create()
  const exit = await create(input('EXIT', '2026-06-03T12:00'))
  const movementValues: CreateOperationDto = {
    ...input('EXIT', '2026-06-03T12:00'),
    operationType: 'MOVEMENT',
    interpretationPortId: portId,
    destinationPortId: portId,
    destinationBerthId: berthId,
    arrivalMoment: moment('2026-06-03T13:00'),
  }
  const p = value(
    await operations.previewCorrect({
      context: context(),
      payload: { id: exit.id, values: movementValues },
    }),
  )
  expect(p.blockers).toEqual([])
  const moved = value(await confirm(p))
  expect(moved.id).toBe(exit.id)
  expect(moved.charges[0].id).not.toBe(exit.charges[0].id)
  const back = value(
    await operations.previewCorrect({
      context: context(),
      payload: { id: exit.id, values: input('EXIT', '2026-06-03T12:00') },
    }),
  )
  expect(back.status).toBe('READY')
  const result = value(await confirm(back))
  expect(result.arrival).toBeNull()
  expect(
    sql()
      .prepare('SELECT count(*) FROM operation_endpoints WHERE operation_id=?')
      .pluck()
      .get(exit.id),
  ).toBe(1)
})
it('completa banchina sconosciuta mantenendo ormeggio, prestazioni e origini successive', async () => {
  const entry = await create({ ...input(), berthId: null } as CreateOperationDto)
  const svc = await free('2026-06-02T12:00'),
    catalog = await free('2026-06-02T12:00', 'MISSED', true)
  const exit = await create(input('EXIT', '2026-06-03T12:00'))
  const before = stays()[0],
    originalServices = [svc, catalog]
  await correct(entry, { berthId })
  const after = stays()[0]
  expect(after.id).toBe(before.id)
  expect(after.visits[0].stays).toHaveLength(1)
  expect(after.visits[0].stays[0]).toMatchObject({ id: before.visits[0].stays[0].id, berthId })
  expect(new OperationRepository(db()).get(exit.id).endpoint.berthId).toBe(berthId)
  for (const old of originalServices) {
    const next = new ServiceRepository(db()).get(old.id)
    expect(next.base).toBe(old.base)
    expect(next.moment).toEqual(old.moment)
    expect(next.context.berthStayId).toBe(old.context.berthStayId)
    expect(next.context.berthId).toBe(berthId)
  }
})
it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'blocca prestazioni %s lasciate orfane da correzioni temporali',
  async (status) => {
    const entry = await create()
    await free('2026-06-01T13:00', status)
    const before = snapshot(),
      p = value(await correctPreview(entry, { moment: moment('2026-06-01T14:00') }))
    expect(p.status).toBe('BLOCKED')
    expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(snapshot()).toEqual(before)
  },
)
it('valida operazioni MISSED lontane e collisioni con arrivi mancati', async () => {
  await create()
  const move = await movement()
  await create(input('EXIT', '2026-06-02T15:00', 'MISSED'))
  const p = value(await correctPreview(move, { arrivalMoment: moment('2026-06-02T16:00') }))
  expect(p.status).toBe('BLOCKED')
  const missedMove = await correct(move, { executionStatus: 'MISSED' })
  const collision = value(
    await correctPreview(missedMove, { arrivalMoment: moment('2026-06-02T15:00') }),
  )
  expect(collision.status).toBe('BLOCKED')
  const equal = value(
    await correctPreview(missedMove, { arrivalMoment: moment('2026-06-02T12:00') }),
  )
  expect(equal.status).toBe('BLOCKED')
})
it('riferimenti storici invariati e tupla salvata sopravvivono a disattivazioni', async () => {
  const op = await create()
  sql().prepare("UPDATE vessels SET status='INACTIVE' WHERE id=?").run(vesselId)
  sql().prepare("UPDATE ports SET status='INACTIVE' WHERE id=?").run(portId)
  sql().prepare("UPDATE berths SET status='INACTIVE' WHERE id=?").run(berthId)
  const result = await correct(op, { executionStatus: 'PERFORMED' })
  expect(result.endpoint.moment).toEqual(op.endpoint.moment)
})
it('rifiuta nuovi riferimenti disattivati e li riesamina alla conferma', async () => {
  const op = await create({ ...input(), berthId: null } as CreateOperationDto)
  const p = value(await correctPreview(op, { berthId }))
  const old = snapshot()
  sql().prepare("UPDATE berths SET status='INACTIVE' WHERE id=?").run(berthId)
  expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(snapshot()).toEqual(old)
  sql().prepare("UPDATE berths SET status='ACTIVE' WHERE id=?").run(berthId)
  expect(value(await confirm(p)).endpoint.berthId).toBe(berthId)
})
it.each(['charge', 'subjects', 'endpoint', 'operation', 'stay'] as const)(
  'FK composte CASCADE verso %s impediscono la modifica senza eliminare dipendenti',
  async (target) => {
    const op = await create(),
      stay = stays()[0].visits[0].stays[0]
    const p = value(await correctPreview(op, { moment: moment('2026-06-01T11:00') }))
    if (target === 'charge')
      sql().exec(
        'CREATE TABLE external_ref(id TEXT PRIMARY KEY REFERENCES operation_charges(id) ON DELETE CASCADE)',
      )
    if (target === 'subjects')
      sql().exec(
        'CREATE TABLE external_ref(id TEXT PRIMARY KEY REFERENCES operation_charge_subjects(charge_id) ON DELETE CASCADE)',
      )
    if (target === 'endpoint')
      sql().exec(
        'CREATE TABLE external_ref(id TEXT, role TEXT, FOREIGN KEY(id, role) REFERENCES operation_endpoints(operation_id, role) ON DELETE CASCADE)',
      )
    if (target === 'operation')
      sql().exec(
        'CREATE TABLE external_ref(id TEXT, vessel TEXT, FOREIGN KEY(id, vessel) REFERENCES vessel_operations(id, vessel_id) ON UPDATE CASCADE)',
      )
    if (target === 'stay')
      sql().exec(
        'CREATE TABLE external_ref(id TEXT PRIMARY KEY REFERENCES berth_stays(id) ON DELETE CASCADE)',
      )
    if (target === 'endpoint')
      sql().prepare('INSERT INTO external_ref VALUES (?,?)').run(op.id, op.endpoint.role)
    else if (target === 'operation')
      sql().prepare('INSERT INTO external_ref VALUES (?,?)').run(op.id, vesselId)
    else
      sql()
        .prepare('INSERT INTO external_ref VALUES (?)')
        .run(target === 'stay' ? stay.id : op.charges[0].id)
    const before = snapshot()
    expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(snapshot()).toEqual(before)
    expect(sql().prepare('SELECT count(*) FROM external_ref').pluck().get()).toBe(1)
  },
)
it('rollback dopo sostituzione e ricalcoli, anteprima non consumata e ID ripetibili', async () => {
  await create()
  const op = await movement(),
    p2 = await destination()
  const p = value(await correctPreview(op, { destinationPortId: p2, destinationBerthId: null }))
  const before = snapshot(),
    save = vi.spyOn(ServiceRepository.prototype, 'saveAttribution')
  // Failure after operation/structure writes through the final integrity inspection.
  const pragma = sql().pragma.bind(sql())
  const fault = vi.spyOn(sql(), 'pragma').mockImplementation((source, options) => {
    if (source === 'foreign_key_check') throw Error('Injected rollback')
    return pragma(source, options)
  })
  expect(await confirm(p)).toMatchObject(failure('UNEXPECTED'))
  expect(snapshot()).toEqual(before)
  fault.mockRestore()
  save.mockRestore()
  expect(value(await confirm(p))).toEqual(p.operationValues)
})
it('namespace, revisione, scadenza, consumo e campi inattesi proteggono la conferma', async () => {
  const op = await create(),
    p = value(await correctPreview(op, { executionStatus: 'PERFORMED' }))
  expect(
    await operations.confirmComplete({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  expect(
    await operations.previewCorrect({
      context: context(),
      payload: { id: op.id, values: { ...correction(op), bogus: true } } as never,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  value(await confirm(p))
  expect(await confirm(p)).toMatchObject(failure('REVISION_CONFLICT'))
  expect(
    await operations.confirmCorrect({ context: context(), payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  const p2 = value(
    await correctPreview(new OperationRepository(db()).get(op.id), { notes: 'Nuova' }),
  )
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60 * 1000)
  expect(await confirm(p2)).toMatchObject(failure('PREVIEW_EXPIRED'))
})
it('una correzione identica è no-op per revisione, timestamp e identità', async () => {
  const op = await create(),
    before = snapshot()
  await correct(op)
  expect(snapshot()).toEqual(before)
})

it('ricalcola CATALOG storico disattivato, preserva FREE int64, momenti e assegnazioni compatibili', async () => {
  await create()
  const move = await movement(),
    original = stays()[0]
  const svc = await free('2026-06-03T12:00'),
    catalog = await free('2026-06-03T12:00', 'PERFORMED', true)
  if (catalog.category !== 'CATALOG') throw Error('Fixture catalogo')
  const port2 = await destination()
  const customer = value(
    await new CustomerService(archives.coordinator).create({
      context: context(),
      payload: { businessName: 'Cliente visita' },
    }),
  )
  const assignments = new AssignmentService(archives.coordinator)
  const assignment = value(
    await assignments.preview({
      context: context(),
      payload: {
        target: { kind: 'PORT_CALL', id: original.visits[0].id },
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
  sql().prepare("UPDATE service_types SET status='INACTIVE' WHERE id=?").run(catalog.serviceTypeId)
  const other = await otherVessel(),
    unrelated = await create({ ...input(), vesselId: other })
  await correct(new OperationRepository(db()).get(move.id), {
    destinationPortId: port2,
    destinationBerthId: null,
  })
  const services = new ServiceRepository(db()),
    next = services.get(catalog.id),
    manual = services.get(svc.id)
  expect(next).toMatchObject({
    serviceTypeId: catalog.serviceTypeId,
    base: '215.00',
    moment: catalog.moment,
    context: { portId: port2 },
  })
  expect(manual.base).toBe('92233720368547758.07')
  expect(manual.moment).toEqual(svc.moment)
  expect(next.context.berthStayId).toBe(catalog.context.berthStayId)
  // The newly opened visit does not inherit the previous visit's explicit assignment.
  expect(next.subjects.customer).toBeNull()
  expect(
    sql()
      .prepare('SELECT customer_id FROM port_calls WHERE id=?')
      .pluck()
      .get(original.visits[0].id),
  ).toBe(customer.id)
  expect(
    sql()
      .prepare('SELECT has_ever_been_used FROM service_types WHERE id=?')
      .pluck()
      .get(catalog.serviceTypeId),
  ).toBe(1)
  expect(new OperationRepository(db()).get(unrelated.id)).toEqual(unrelated)
})
it('ridetermina versioni ai due estremi e basi conservando le due identità economiche', async () => {
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const entry = await create(),
    port2 = await destination()
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
  const move = await movement('2026-06-02T11:00', '2026-06-02T12:00', port2, null)
  const result = await correct(move, {
    moment: moment('2026-06-02T12:00'),
    arrivalMoment: moment('2026-06-02T13:00'),
  })
  expect(result.endpoint.vesselVersionId).toBe(entry.vesselVersionId)
  expect(result.arrival!.vesselVersionId).not.toBe(entry.vesselVersionId)
  expect(result.charges.map((c) => c.calculation.size)).toEqual([2100, 2500])
  expect(result.charges.map((c) => c.id)).toEqual(move.charges.map((c) => c.id))
})
it('cambio nave di spostamento ricostruisce entrambi gli ormeggi e conserva la destinazione ancorata', async () => {
  await create()
  const move = await movement(),
    stay = stays()[0].visits[0].stays[1]
  const second = await otherVessel()
  await create({ ...input(), vesselId: second })
  await correct(move, { vesselId: second, interpretationPortId: null })
  expect(stays()[0].visits[0].stays).toHaveLength(1)
  expect(new OperationRepository(db()).stays(second, 1, 100).items[0].visits[0].stays[1].id).toBe(
    stay.id,
  )
})
it('cambio nave riconosce il nuovo porto di origine senza forzare quello storico', async () => {
  await create()
  const exit = await create(input('EXIT', '2026-06-03T12:00')),
    second = await otherVessel(),
    port2 = await destination()
  await create({ ...input(), vesselId: second, portId: port2, berthId: null } as CreateOperationDto)
  const resolved = value(
    await operations.resolveCorrectionMoment({
      context: { sessionId: context().sessionId },
      query: {
        id: exit.id,
        values: correction(exit, { vesselId: second, interpretationPortId: null }),
      },
    }),
  )
  expect(resolved.portId).toBe(port2)
  const result = await correct(exit, { vesselId: second, interpretationPortId: null })
  expect(result.endpoint.portId).toBe(port2)
  expect(result.charges[0].id).toBe(exit.charges[0].id)
  expect(result.charges[0].calculation.base).toBe('200.00')
})
it('confronta UTC tra fusi e blocca una collisione con l’arrivo anche se le ore locali sono diverse', async () => {
  await create()
  const p2 = value(
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
  await tariff('2026-01-01T00:00', '200', p2)
  const move = await movement('2026-06-02T12:00', '2026-06-02T07:00', p2, null)
  expect(move.arrival!.moment.utc > move.endpoint.moment.utc).toBe(true)
  const p = value(await correctPreview(move, { arrivalMoment: moment('2026-06-02T06:00') }))
  expect(p.status).toBe('BLOCKED')
  expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
})
it('gap e overlap richiedono un momento valido e una scelta esplicita', async () => {
  const op = await create()
  expect(
    await operations.resolveCorrectionMoment({
      context: { sessionId: context().sessionId },
      query: { id: op.id, values: correction(op, { moment: moment('2026-03-29T02:30') }) },
    }),
  ).toMatchObject(failure('LOCAL_TIME_NOT_EXISTENT'))
  const resolution = value(
    await operations.resolveCorrectionMoment({
      context: { sessionId: context().sessionId },
      query: { id: op.id, values: correction(op, { moment: moment('2026-10-25T02:30') }) },
    }),
  )
  expect(resolution.resolution.status).toBe('CHOICE_REQUIRED')
  const p = value(await correctPreview(op, { moment: moment('2026-10-25T02:30') }))
  expect(p.status).toBe('BLOCKED')
  const result = await correct(op, { moment: moment('2026-10-25T02:30', '+01:00') })
  expect(result.endpoint.moment.offset).toBe('+01:00')
})
it('rollback dopo riattribuzione CATALOG ripristina le due cronologie e lascia disponibile l’anteprima', async () => {
  await create()
  const op = await movement(),
    catalog = await free('2026-06-03T12:00', 'MISSED', true),
    port2 = await destination()
  const p = value(await correctPreview(op, { destinationPortId: port2, destinationBerthId: null })),
    before = snapshot()
  const save = ServiceRepository.prototype.saveAttribution
  const fault = vi
    .spyOn(ServiceRepository.prototype, 'saveAttribution')
    .mockImplementationOnce(function (this: ServiceRepository, value) {
      save.call(this, value)
      throw Error('Rollback dopo catalogo')
    })
  expect(await confirm(p)).toMatchObject(failure('UNEXPECTED'))
  expect(snapshot()).toEqual(before)
  expect(new ServiceRepository(db()).get(catalog.id)).toEqual(catalog)
  fault.mockRestore()
  expect(value(await confirm(p))).toEqual(p.operationValues)
})
it('FK su componenti rimosse e soggetti posseduti bloccano la trasformazione prima di qualsiasi CASCADE', async () => {
  await create()
  const move = await movement(),
    port2 = await destination()
  sql().exec(
    'CREATE TABLE external_owned(id TEXT REFERENCES operation_charge_subjects(charge_id) ON DELETE CASCADE)',
  )
  sql().prepare('INSERT INTO external_owned VALUES (?)').run(move.charges[0].id)
  const before = snapshot(),
    p = value(await correctPreview(move, { destinationPortId: port2, destinationBerthId: null }))
  expect(p.status).toBe('BLOCKED')
  expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(snapshot()).toEqual(before)
  expect(sql().prepare('SELECT count(*) FROM external_owned').pluck().get()).toBe(1)
})
it('Salva con nome invalida le anteprime anche mantenendo lo stesso ID archivio', async () => {
  const op = await create(),
    p = value(await correctPreview(op, { executionStatus: 'PERFORMED' })),
    before = snapshot()
  await archives.saveAs(join(folder, 'copy.ormeggi'))
  expect(await confirm(p)).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  expect(snapshot()).toEqual(before)
})
it('riesamina e blocca un’anteprima nata bloccata anche dopo la rimozione esterna del vincolo', async () => {
  const op = await create()
  sql().exec(
    'CREATE TABLE temporary_block(id TEXT REFERENCES operation_charges(id) ON DELETE CASCADE)',
  )
  sql().prepare('INSERT INTO temporary_block VALUES (?)').run(op.charges[0].id)
  const p = value(await correctPreview(op, { moment: moment('2026-06-01T11:00') }))
  expect(p.status).toBe('BLOCKED')
  sql().exec('DROP TABLE temporary_block')
  expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
})
it('rifiuta campi mancanti e trasformazioni senza contesto di origine', async () => {
  const op = await create()
  const { berthId: omitted, ...missing } = correction(op) as Extract<
    CreateOperationDto,
    { operationType: 'ENTRY' }
  >
  expect(omitted).toBe(berthId)
  expect(
    await operations.previewCorrect({
      context: context(),
      payload: { id: op.id, values: missing } as never,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  const p = value(
    await operations.previewCorrect({
      context: context(),
      payload: { id: op.id, values: input('EXIT') },
    }),
  )
  expect(p.status).toBe('BLOCKED')
})

it('recupero esito confronta valori e contesto, ignorando ordine delle proprietà e delle componenti', async () => {
  await create()
  const p2 = await destination(),
    move = await movement('2026-06-02T12:00', '2026-06-02T13:00', p2, null)
  const p = value(await correctPreview(move, { arrivalMoment: moment('2026-06-02T14:00') }))
  expect(operationCorrectionOutcome(move, p.operationValues, move, p.context, p.context)).toBe(
    'UNCHANGED',
  )
  expect(
    operationCorrectionOutcome(move, p.operationValues, move, p.context, {
      ...p.context,
      revision: (BigInt(p.context.revision) + 1n).toString(),
    }),
  ).toBe('CONFLICT')
  const result = value(await confirm(p))
  expect(
    operationCorrectionOutcome(
      move,
      p.operationValues,
      { ...result, charges: [...result.charges].reverse() },
      p.context,
      context(),
    ),
  ).toBe('APPLIED')
  expect(
    operationCorrectionOutcome(move, p.operationValues, result, p.context, {
      ...context(),
      sessionId: 'another',
    }),
  ).toBe('CONFLICT')
})
it('un errore dopo l’applicazione delle due cronologie annulla integralmente il cambio nave', async () => {
  await create()
  const move = await movement(),
    second = await otherVessel()
  await create({ ...input(), vesselId: second })
  const p = value(await correctPreview(move, { vesselId: second })),
    before = snapshot()
  const pragma = sql().pragma.bind(sql())
  const fault = vi.spyOn(sql(), 'pragma').mockImplementation((source, options) => {
    if (source === 'foreign_key_check') throw Error('Rollback due navi')
    return pragma(source, options)
  })
  expect(await confirm(p)).toMatchObject(failure('UNEXPECTED'))
  expect(snapshot()).toEqual(before)
  fault.mockRestore()
  expect(value(await confirm(p))).toEqual(p.operationValues)
})
it('una correzione descrittiva conserva la tupla storica anche se cambia il fuso configurato', async () => {
  const op = await create()
  sql().prepare("UPDATE port_time_zones SET zone_id='America/New_York' WHERE port_id=?").run(portId)
  const result = await correct(op, { notes: 'Correzione descrittiva' })
  expect(result.endpoint.moment).toEqual(op.endpoint.moment)
  expect(result.charges[0].calculation.moment).toEqual(op.charges[0].calculation.moment)
})
