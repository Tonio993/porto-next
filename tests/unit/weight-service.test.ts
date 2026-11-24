import { weightChangeOutcome } from '../../src/renderer/src/api/weight-change-outcome'
import { WeightRepository } from '../../src/backend/infrastructure/database/weight-repository'
import type { WeightChangeDto, WeightVersionDto } from '../../src/shared/contracts/catalog'
import { TimeService } from '../../src/backend/application/time/time-service'
import { CatalogService } from '../../src/backend/application/catalog/catalog-service'
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import Database from 'better-sqlite3'
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
  folder = mkdtempSync(join(tmpdir(), 'porto-p19-'))
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
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  await tariff()
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
  vi.restoreAllMocks()
})

const catalog = () => new CatalogService(archives.coordinator)
const fixed = async (operation = 'ENTRY') =>
  value(
    await catalog().fixedWeights({ context: { sessionId: context().sessionId }, query: null }),
  ).find((s) => s.operation === operation)!.initialWeight
const history = async (sequenceId: string, page = 1, pageSize = 100) =>
  value(
    await catalog().weightHistory({
      context: { sessionId: context().sessionId },
      query: { sequenceId, page, pageSize },
    }),
  )
const weightPreview = (payload: WeightChangeDto) =>
  catalog().previewWeight({ context: context(), payload })
const weightConfirm = (p: { context: ReturnType<typeof context>; previewId: string }) =>
  catalog().confirmWeight({ context: p.context, payload: { previewId: p.previewId } })
const add = async (sequenceId: string, at = '2026-06-01T00:00', weight = '2') => {
  const p = value(
    await weightPreview({ operation: 'INSERT', sequenceId, moment: moment(at), weight }),
  )
  value(await weightConfirm(p))
  return p.version!
}
const edit = async (v: WeightVersionDto, weight: string, at = v.effectiveMoment?.localDateTime) => {
  const p = value(
    await weightPreview({
      operation: 'UPDATE',
      sequenceId: v.sequenceId,
      versionId: v.id,
      moment: at ? moment(at, v.effectiveMoment?.offset ?? null) : null,
      weight,
    }),
  )
  value(await weightConfirm(p))
  return p.version!
}
const remove = async (v: WeightVersionDto) => {
  const p = value(
    await weightPreview({ operation: 'DELETE', sequenceId: v.sequenceId, versionId: v.id }),
  )
  value(await weightConfirm(p))
  return p
}
const snapshot = () =>
  Object.fromEntries(
    (
      sql()
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as { name: string }[]
    ).map(({ name }) => [
      name,
      sql()
        .prepare('SELECT * FROM "' + name + '" ORDER BY rowid')
        .all(),
    ]),
  )

it('sequenze autonome, cronologia iniziale/passata/intermedia/futura e confini', async () => {
  const a = await fixed(),
    exit = await fixed('EXIT'),
    original = snapshot()
  const p = value(
    await weightPreview({
      operation: 'INSERT',
      sequenceId: a.sequenceId,
      moment: moment('2026-07-01T00:00'),
      weight: '2',
    }),
  )
  expect(snapshot()).toEqual(original)
  value(await weightConfirm(p))
  const future = await add(a.sequenceId, '2099-01-01T00:00', '3'),
    middle = await add(a.sequenceId, '2026-08-01T00:00', '2.5')
  const result = await history(a.sequenceId),
    repo = new WeightRepository(db())
  expect(result.versions.items.map((v) => [v.id, v.effectiveTo])).toEqual([
    [a.id, p.version!.effectiveFrom],
    [p.versionId, middle.effectiveFrom],
    [middle.id, future.effectiveFrom],
    [future.id, null],
  ])
  expect((await history(a.sequenceId, 2, 1)).versions.items[0].id).toBe(p.versionId)
  expect(repo.at({ kind: 'OPERATION', operation: 'ENTRY' }, p.version!.effectiveFrom!).id).toBe(
    p.versionId,
  )
  expect(repo.at({ kind: 'OPERATION', operation: 'ENTRY' }, '2026-06-30T21:59:59.999Z').id).toBe(
    a.id,
  )
  expect((await history(exit.sequenceId)).versions.items).toHaveLength(1)
  expect(
    value(
      await tariffs.simulateBase({
        context: { sessionId: context().sessionId },
        query: {
          portId,
          vesselId,
          moment: moment('2026-07-01T00:00'),
          activity: { kind: 'OPERATION', operation: 'ENTRY' },
        },
      }),
    ),
  ).toMatchObject({ weight: '2', base: '230.00', weightVersionId: p.versionId })
})
it('iniziale non eliminabile né databile, versione di altra sequenza respinta e no-op al limite revisione', async () => {
  const a = await fixed(),
    other = await fixed('EXIT'),
    initial = (await history(a.sequenceId)).versions.items[0]
  expect(
    await weightPreview({ operation: 'DELETE', sequenceId: a.sequenceId, versionId: a.id }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await weightPreview({
      operation: 'UPDATE',
      sequenceId: a.sequenceId,
      versionId: a.id,
      moment: moment('2026-06-01T00:00'),
      weight: '2',
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await weightPreview({
      operation: 'UPDATE',
      sequenceId: other.sequenceId,
      versionId: a.id,
      moment: null,
      weight: '2',
    }),
  ).toMatchObject(failure('NOT_FOUND'))
  await edit(initial, '1.5')
  await create()
  sql().prepare('UPDATE archive_metadata SET revision=?').run(9223372036854775807n)
  const original = snapshot(),
    p = value(
      await weightPreview({
        operation: 'UPDATE',
        sequenceId: a.sequenceId,
        versionId: a.id,
        moment: null,
        weight: '1.500',
      }),
    )
  expect(p.effects.total).toBe(0)
  value(await weightConfirm(p))
  expect(snapshot()).toEqual(original)
})
it.each(['initial', 'middle', 'future'])(
  'corregge peso %s e conserva identità e persistenza',
  async (position) => {
    const a = await fixed(),
      b = await add(a.sequenceId),
      c = await add(a.sequenceId, '2099-01-01T00:00', '3')
    const v =
      position === 'initial'
        ? (await history(a.sequenceId)).versions.items[0]
        : position === 'middle'
          ? b
          : c
    const updated = await edit(
      v,
      '4.125',
      position === 'middle' ? '2026-05-01T00:00' : v.effectiveMoment?.localDateTime,
    )
    expect(updated.id).toBe(v.id)
    expect(sql().pragma('foreign_key_check')).toEqual([])
    await archives.close()
    await archives.open(join(folder, 'a.ormeggi'))
    expect(new WeightRepository(db()).get(a.sequenceId, v.id)).toMatchObject({
      weight: '4.125',
      effectiveMoment: updated.effectiveMoment,
    })
  },
)
it('collisioni e regole temporali nel fuso aziendale, gap e scelta esplicita overlap', async () => {
  const a = await fixed(),
    b = await add(a.sequenceId),
    original = snapshot()
  expect(
    await weightPreview({
      operation: 'INSERT',
      sequenceId: a.sequenceId,
      moment: moment('2026-06-01T00:00'),
      weight: '3',
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  for (const [at, code] of [
    ['2026-03-29T02:30', 'LOCAL_TIME_NOT_EXISTENT'],
    ['2026-10-25T02:30', 'LOCAL_TIME_AMBIGUOUS'],
  ])
    expect(
      await weightPreview({
        operation: 'UPDATE',
        sequenceId: a.sequenceId,
        versionId: b.id,
        moment: moment(at),
        weight: '3',
      }),
    ).toMatchObject(failure(code))
  expect(snapshot()).toEqual(original)
  for (const offset of ['+02:00', '+01:00']) {
    const p = value(
      await weightPreview({
        operation: 'INSERT',
        sequenceId: a.sequenceId,
        moment: moment('2026-10-25T02:30', offset),
        weight: '4',
      }),
    )
    value(await weightConfirm(p))
  }
  expect((await history(a.sequenceId)).versions.total).toBe(4)
  expect(
    await catalog().resolveWeightMoment({
      context: { sessionId: context().sessionId },
      query: { moment: moment('2026-10-25T02:30') },
    }),
  ).toMatchObject({ ok: true, value: { status: 'CHOICE_REQUIRED' } })
})
it('positività, precisione e limiti esatti, input inattesi e CHECK SQLite', async () => {
  const a = await fixed(),
    original = snapshot()
  for (const weight of ['0', '0.000', '-1', '1e2', '1,5', ' 1', 'NaN', 'Infinity', '9'.repeat(257)])
    expect(
      await weightPreview({
        operation: 'INSERT',
        sequenceId: a.sequenceId,
        moment: moment('2026-06-01T00:00'),
        weight,
      }),
    ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await weightPreview({
      operation: 'DELETE',
      sequenceId: a.sequenceId,
      versionId: a.id,
      extra: 1,
    } as WeightChangeDto),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(snapshot()).toEqual(original)
  const precise = '0.' + '0'.repeat(254) + '1',
    b = await add(a.sequenceId, '2026-06-01T00:00', precise)
  expect(b.weight).toBe(precise)
  expect(
    sql().prepare('SELECT typeof(weight) FROM weight_versions WHERE id=?').pluck().get(b.id),
  ).toBe('text')
  for (const weight of ['0', '-1', '01', '1.0', '1e2'])
    expect(() =>
      sql().prepare('UPDATE weight_versions SET weight=? WHERE id=?').run(weight, b.id),
    ).toThrow()
  expect(() =>
    sql().prepare('UPDATE weight_versions SET effective_local_date_time=NULL WHERE id=?').run(b.id),
  ).toThrow()
})
it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'ricalcola operazioni %s, incluso zero manuale, con rollback e ripristino peso precedente',
  async (status) => {
    const a = await fixed(),
      op = await create({
        ...input('ENTRY', '2026-06-01T12:00', status),
        manualOverrideAmount: '0.00',
      })
    const original = snapshot(),
      p = value(
        await weightPreview({
          operation: 'INSERT',
          sequenceId: a.sequenceId,
          moment: moment('2026-06-01T12:00'),
          weight: '1.5',
        }),
      )
    expect(snapshot()).toEqual(original)
    expect(p.summary.recalculated).toBe(1)
    value(await weightConfirm(p))
    const repo = new OperationRepository(db())
    expect(repo.get(op.id).charges[0]).toMatchObject({
      id: op.charges[0].id,
      effectiveBase: '0.00',
      subjects: op.charges[0].subjects,
      calculation: { weight: '1.5', base: '172.50', weightVersionId: p.versionId },
    })
    await edit(p.version!, '2')
    expect(repo.get(op.id).charges[0].calculation.base).toBe('230.00')
    await remove(p.version!)
    expect(repo.get(op.id).charges[0]).toMatchObject({
      effectiveBase: '0.00',
      calculation: { weight: '1', weightVersionId: a.id, base: '115.00' },
    })
    expect(sql().pragma('foreign_key_check')).toEqual([])
  },
)
it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'ricalcola CATALOG %s storico disattivato e conserva FREE byte per byte',
  async (status) => {
    await create()
    const service = await free('2026-06-01T13:00', status, true),
      manual = await free('2026-06-01T13:00', status)
    const seq = service.calculation!.weightSequenceId,
      type = service.calculation!.activity
    if (type.kind !== 'CATALOG') throw Error('catalogo')
    const d = value(
      await catalog().preview({
        context: context(),
        payload: { operation: 'DEACTIVATE', id: type.serviceTypeId },
      }),
    )
    value(await catalog().confirm({ context: d.context, payload: { previewId: d.previewId } }))
    const v = await add(seq, '2026-06-01T13:00', '1.5'),
      repo = new ServiceRepository(db())
    expect(repo.get(service.id)).toMatchObject({
      base: '172.50',
      calculation: { weightVersionId: v.id },
      subjects: service.subjects,
      context: service.context,
    })
    expect(repo.get(manual.id)).toEqual(manual)
    await remove(v)
    expect(repo.get(service.id).base).toBe('115.00')
    expect(repo.get(manual.id)).toEqual(manual)
  },
)

it('EXIT ed ENTRY indipendenti ai due istanti di uno spostamento tra porti; MOVEMENT interno autonomo', async () => {
  await create()
  const originService = await free('2026-06-02T11:59', 'PERFORMED', true)
  const other = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Altro',
        locality: 'Altro',
        countryCode: 'US',
        initialZoneId: 'America/New_York',
      },
    }),
  ).id
  await tariff('2026-01-01T00:00', '200', other)
  const move = await create({
    vesselId,
    operationType: 'MOVEMENT',
    interpretationPortId: null,
    destinationPortId: other,
    destinationBerthId: null,
    moment: moment('2026-06-02T12:00'),
    arrivalMoment: moment('2026-06-02T13:00'),
    executionStatus: 'PERFORMED',
    notes: null,
    manualOverrideAmount: '0.00',
    arrivalManualOverrideAmount: '12.34',
  })
  const destinationService = await free('2026-06-02T13:00', 'MISSED', true),
    manual = await free('2026-06-02T13:00', 'MISSED')
  const exit = await fixed('EXIT'),
    entry = await fixed('ENTRY'),
    internal = await fixed('MOVEMENT')
  const x = await add(exit.sequenceId, '2026-06-02T12:00', '2'),
    e = await add(entry.sequenceId, '2026-06-02T19:00', '3')
  const repo = new OperationRepository(db()),
    services = new ServiceRepository(db())
  const charges = repo.get(move.id).charges
  expect(
    charges.map((c) => [c.calculation.weightVersionId, c.calculation.base, c.effectiveBase]),
  ).toEqual([
    [x.id, '230.00', '0.00'],
    [e.id, '645.00', '12.34'],
  ])
  expect(charges[1].calculation.moment.utc).toBe('2026-06-02T17:00:00.000Z')
  const v = await add(destinationService.calculation!.weightSequenceId, '2026-06-02T19:00', '4')
  expect(services.get(originService.id).base).toBe('115.00')
  expect(services.get(destinationService.id)).toMatchObject({
    base: '860.00',
    calculation: { weightVersionId: v.id },
  })
  expect(services.get(manual.id)).toEqual(manual)
  const internalMove = await movement('2026-06-03T12:00', '2026-06-03T13:00', other, null)
  await add(internal.sequenceId, '2026-06-03T18:00', '5')
  expect(repo.get(internalMove.id).charges).toHaveLength(1)
  expect(repo.get(internalMove.id).charges[0]).toMatchObject({
    chargeKind: 'MOVEMENT',
    calculation: { weight: '5', base: '1075.00' },
  })
  expect(repo.get(move.id).charges).toEqual(charges)
})
it('tariffe e versioni nave riusano il peso datato; FREE, identità e soggetti conservati', async () => {
  const a = await fixed()
  await add(a.sequenceId, '2026-06-01T00:00', '2')
  const op = await create(),
    service = await free('2026-06-01T13:00', 'PLANNED', true),
    manual = await free('2026-06-01T13:00', 'PLANNED')
  const v = await add(service.calculation!.weightSequenceId, '2026-06-01T13:00', '3')
  const all = value(
    await tariffs.list({
      context: { sessionId: context().sessionId },
      query: { portId, page: 1, pageSize: 25 },
    }),
  )
  const p = value(
    await tariffs.previewUpdate({
      context: context(),
      payload: {
        id: all.items[0].id,
        moment: moment('2026-01-01T00:00'),
        configurations: config('300'),
      },
    }),
  )
  value(await tariffs.confirmUpdate({ context: p.context, payload: { previewId: p.previewId } }))
  const repo = new OperationRepository(db()),
    services = new ServiceRepository(db())
  expect(repo.get(op.id).charges[0].calculation.base).toBe('630.00')
  expect(services.get(service.id).base).toBe('945.00')
  expect(services.get(manual.id)).toEqual(manual)
  const ship = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        moment: moment('2026-05-01T00:00'),
        registeredName: 'Piccola',
        imoNumber: null,
        vesselTypeId: 'PASSENGER',
        size: 100,
      },
    }),
  )
  value(await vessels.confirm({ context: ship.context, payload: { previewId: ship.previewId } }))
  expect(repo.get(op.id).charges[0]).toMatchObject({
    id: op.charges[0].id,
    subjects: op.charges[0].subjects,
    calculation: { weight: '2', base: '600.00' },
  })
  expect(services.get(service.id)).toMatchObject({
    base: '900.00',
    calculation: { weightVersionId: v.id },
    context: service.context,
    subjects: service.subjects,
  })
  expect(services.get(manual.id).base).toBe(manual.base)
  await tariff('2025-01-01T00:00', '50')
  const d = value(
    await tariffs.previewDelete({ context: context(), payload: { id: all.items[0].id } }),
  )
  value(await tariffs.confirmDelete({ context: d.context, payload: { previewId: d.previewId } }))
  expect(repo.get(op.id).charges[0].calculation.base).toBe('100.00')
  expect(services.get(service.id).base).toBe('150.00')
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('sposta la decorrenza oltre altre versioni, elimina futura usata e rispetta gli intervalli', async () => {
  const a = await fixed(),
    b = await add(a.sequenceId, '2026-06-01T00:00', '2'),
    c = await add(a.sequenceId, '2026-07-01T00:00', '3')
  const op = await create(input('ENTRY', '2026-06-15T00:00'))
  await edit(b, '4', '2026-08-01T00:00')
  expect(new OperationRepository(db()).get(op.id).charges[0].calculation.weightVersionId).toBe(a.id)
  await edit(b, '4', '2026-06-15T00:00')
  expect(new OperationRepository(db()).get(op.id).charges[0].calculation.weightVersionId).toBe(b.id)
  const future = await create(input('EXIT', '2099-01-01T00:00'))
  const exit = await fixed('EXIT'),
    v = await add(exit.sequenceId, '2099-01-01T00:00', '2')
  expect(new OperationRepository(db()).get(future.id).charges[0].calculation.base).toBe('230.00')
  await remove(v)
  expect(new OperationRepository(db()).get(future.id).charges[0].calculation.weightVersionId).toBe(
    exit.id,
  )
  await remove(c)
})
it('arrotondamenti e overflow non cambiano i dati; correzione di valore mantiene la tupla storica', async () => {
  const a = await fixed(),
    op = await create(),
    v = await add(a.sequenceId, '2026-06-01T00:00', '1.005')
  expect(new OperationRepository(db()).get(op.id).charges[0].calculation.base).toBe('115.58')
  const original = snapshot()
  expect(
    await weightPreview({
      operation: 'UPDATE',
      sequenceId: a.sequenceId,
      versionId: v.id,
      moment: moment(v.effectiveMoment!.localDateTime, v.effectiveMoment!.offset),
      weight: '9'.repeat(256),
    }),
  ).toMatchObject(failure('AMOUNT_OUT_OF_RANGE'))
  expect(snapshot()).toEqual(original)
  sql().prepare('UPDATE company_time_zone SET zone_id=?').run('America/New_York')
  const after = await edit(v, '1.5')
  expect(after.effectiveMoment).toEqual(v.effectiveMoment)
  expect(new OperationRepository(db()).get(op.id).charges[0].calculation.base).toBe('172.50')
})
it('rollback dopo ricalcoli e rimozione: righe, metadati e anteprima conservati fino al commit', async () => {
  await create()
  const svc = await free('2026-06-01T13:00', 'MISSED', true),
    seq = svc.calculation!.weightSequenceId
  const p = value(
      await weightPreview({
        operation: 'INSERT',
        sequenceId: seq,
        moment: moment('2026-06-01T13:00'),
        weight: '2',
      }),
    ),
    original = snapshot()
  sql().exec(
    "CREATE TRIGGER fail_weight_update BEFORE UPDATE ON service_activities BEGIN SELECT RAISE(ABORT,'rollback'); END",
  )
  expect(await weightConfirm(p)).toMatchObject({ ok: false })
  expect(snapshot()).toEqual(original)
  sql().exec('DROP TRIGGER fail_weight_update')
  value(await weightConfirm(p))
  expect(BigInt(context().revision)).toBe(BigInt(p.context.revision) + 1n)
  expect(
    await catalog().confirmWeight({ context: context(), payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  const d = value(
      await weightPreview({ operation: 'DELETE', sequenceId: seq, versionId: p.versionId }),
    ),
    after = snapshot()
  sql().exec(
    "CREATE TRIGGER fail_weight_delete BEFORE DELETE ON weight_versions BEGIN SELECT RAISE(ABORT,'rollback'); END",
  )
  expect(await weightConfirm(d)).toMatchObject({ ok: false })
  expect(snapshot()).toEqual(after)
  sql().exec('DROP TRIGGER fail_weight_delete')
  value(await weightConfirm(d))
  expect(new ServiceRepository(db()).get(svc.id).base).toBe('115.00')
})
it.each(['simple', 'composite', 'implicit'])(
  'FK esterna %s CASCADE riesaminata anche dopo anteprima; blocco preserva tutti i dati',
  async (target) => {
    const a = await fixed(),
      b = await add(a.sequenceId),
      p = value(
        await weightPreview({ operation: 'DELETE', sequenceId: a.sequenceId, versionId: b.id }),
      )
    if (target === 'composite') {
      sql().exec(
        'CREATE TABLE weight_dependent(a TEXT,b TEXT,FOREIGN KEY(a,b) REFERENCES weight_versions(id,sequence_id) ON DELETE CASCADE)',
      )
      sql().prepare('INSERT INTO weight_dependent VALUES (?,?)').run(b.id, a.sequenceId)
    } else {
      sql().exec(
        'CREATE TABLE weight_dependent(a TEXT REFERENCES weight_versions' +
          (target === 'implicit' ? '' : '(id)') +
          ' ON DELETE CASCADE)',
      )
      sql().prepare('INSERT INTO weight_dependent VALUES (?)').run(b.id)
    }
    const original = snapshot()
    expect(await weightConfirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(snapshot()).toEqual(original)
    const blocked = value(
      await weightPreview({ operation: 'DELETE', sequenceId: a.sequenceId, versionId: b.id }),
    )
    sql().exec('DELETE FROM weight_dependent')
    expect(await weightConfirm(blocked)).toMatchObject(failure('PREVIEW_BLOCKED'))
    value(await weightConfirm(p))
  },
)
it('catalogo: creazione atomica e rimozione esplicita di tutte le versioni; dipendenti delle datate bloccanti', async () => {
  const original = snapshot()
  sql().exec(
    "CREATE TRIGGER fail_new_weight BEFORE INSERT ON weight_versions BEGIN SELECT RAISE(ABORT,'failure'); END",
  )
  expect(
    await catalog().create({
      context: context(),
      payload: { description: 'Nuova', initialWeight: '1.5' },
    }),
  ).toMatchObject({ ok: false })
  expect(snapshot()).toEqual(original)
  sql().exec('DROP TRIGGER fail_new_weight')
  const type = value(
      await catalog().create({
        context: context(),
        payload: { description: 'Nuova', initialWeight: '1.5' },
      }),
    ),
    v = await add(type.initialWeight.sequenceId)
  sql().exec(
    'CREATE TABLE external_weight(a TEXT REFERENCES weight_versions(id) ON DELETE CASCADE)',
  )
  sql().prepare('INSERT INTO external_weight VALUES (?)').run(v.id)
  const blocked = value(
    await catalog().preview({ context: context(), payload: { operation: 'DELETE', id: type.id } }),
  )
  expect(blocked.status).toBe('BLOCKED')
  expect(blocked.summary.deleted).toBe(3)
  sql().exec('DELETE FROM external_weight')
  const p = value(
    await catalog().preview({ context: context(), payload: { operation: 'DELETE', id: type.id } }),
  )
  value(await catalog().confirm({ context: p.context, payload: { previewId: p.previewId } }))
  expect(
    sql()
      .prepare('SELECT count(*) FROM weight_versions WHERE sequence_id=?')
      .pluck()
      .get(type.initialWeight.sequenceId),
  ).toBe(0)
})
it('namespace, paginazione, scadenza, revisione e Salva con nome proteggono le anteprime', async () => {
  const a = await fixed(),
    p = value(
      await weightPreview({
        operation: 'INSERT',
        sequenceId: a.sequenceId,
        moment: moment('2026-06-01T00:00'),
        weight: '2',
      }),
    ),
    original = snapshot()
  expect(
    value(
      await catalog().weightEffects({
        context: { sessionId: context().sessionId },
        query: { previewId: p.previewId, page: 1, pageSize: 1 },
      }),
    ).effects.total,
  ).toBe(p.effects.total)
  expect(snapshot()).toEqual(original)
  expect(
    await catalog().confirm({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(p.expiresAtUtc))
  expect(await weightConfirm(p)).toMatchObject(failure('PREVIEW_EXPIRED'))
  clock.mockRestore()
  const fresh = value(
    await weightPreview({
      operation: 'INSERT',
      sequenceId: a.sequenceId,
      moment: moment('2026-06-01T00:00'),
      weight: '2',
    }),
  )
  await archives.rename('Changed')
  expect(await weightConfirm(fresh)).toMatchObject(failure('REVISION_CONFLICT'))
  expect(
    await catalog().confirmWeight({ context: context(), payload: { previewId: fresh.previewId } }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  const next = value(
    await weightPreview({
      operation: 'INSERT',
      sequenceId: a.sequenceId,
      moment: moment('2026-06-01T00:00'),
      weight: '2',
    }),
  )
  await archives.saveAs(join(folder, 'copy.ormeggi'))
  expect(await weightConfirm(next)).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
})
it('esiti incerti: lettura persistita distingue inserimento, modifica, rimozione e conflitti', async () => {
  const a = await fixed(),
    before = context(),
    p = value(
      await weightPreview({
        operation: 'INSERT',
        sequenceId: a.sequenceId,
        moment: moment('2026-06-01T00:00'),
        weight: '2',
      }),
    )
  expect(weightChangeOutcome(null, p.version, null, before, before)).toBe('UNCHANGED')
  value(await weightConfirm(p))
  expect(
    weightChangeOutcome(
      null,
      p.version,
      new WeightRepository(db()).get(a.sequenceId, p.versionId),
      before,
      context(),
    ),
  ).toBe('APPLIED')
  expect(weightChangeOutcome(p.version, null, p.version, context(), context())).toBe('UNCHANGED')
  expect(weightChangeOutcome(p.version, null, null, context(), context())).toBe('CONFLICT')
  expect(weightChangeOutcome(p.version, null, null, before, context())).toBe('APPLIED')
  expect(
    weightChangeOutcome(null, p.version, p.version, before, {
      ...context(),
      sessionId: 'different',
    }),
  ).toBe('CONFLICT')
})

/** Export the current task's real activities into the unmodified distributed v16 DDL. */
function archiveV16(path: string) {
  const target = new Database(path)
  target.pragma('foreign_keys=OFF')
  try {
    for (const name of readdirSync('migrations')
      .filter((n) => Number(n.slice(0, 4)) <= 16)
      .sort())
      target.exec(readFileSync(join('migrations', name), 'utf8'))
    const triggers = target
      .prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger'")
      .all() as { name: string; sql: string }[]
    for (const t of triggers) target.exec('DROP TRIGGER "' + t.name + '"')
    const tables = target
      .prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[]
    for (const { name } of tables) target.prepare('DELETE FROM "' + name + '"').run()
    for (const { name } of tables) {
      const columns = (target.pragma('table_info("' + name + '")') as { name: string }[]).map(
        (c) => c.name,
      )
      const rows = sql()
        .prepare(
          'SELECT ' +
            columns.map((c) => '"' + c + '"').join(',') +
            ' FROM "' +
            name +
            '" ORDER BY rowid',
        )
        .safeIntegers()
        .all() as Record<string, unknown>[]
      const insert = target.prepare(
        'INSERT INTO "' +
          name +
          '" (' +
          columns.join(',') +
          ') VALUES (' +
          columns.map(() => '?').join(',') +
          ')',
      )
      for (const row of rows) insert.run(...columns.map((c) => row[c]))
    }
    for (const t of triggers) target.exec(t.sql)
    target.pragma('application_id=0x504f5254')
    target.pragma('user_version=16')
  } finally {
    target.close()
  }
}
function stored(path: string) {
  const target = new Database(path, { readonly: true })
  try {
    const tables = target
      .prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
    return {
      version: target.pragma('user_version', { simple: true }),
      schema: target.prepare('SELECT type,name,sql FROM sqlite_schema ORDER BY name').all(),
      rows: Object.fromEntries(
        tables.map(({ name }) => [
          name,
          target
            .prepare('SELECT * FROM "' + name + '" ORDER BY rowid')
            .safeIntegers()
            .all(),
        ]),
      ),
    }
  } finally {
    target.close()
  }
}
it('migrazione v16 popolato conserva riferimenti e dipendenti CASCADE, tuple, metadati e copia preventiva', async () => {
  const op = await create(),
    svc = await free('2026-06-01T13:00', 'MISSED', true),
    path = join(folder, 'v16.ormeggi')
  archiveV16(path)
  const raw = new Database(path),
    w = svc.calculation!
  raw.exec(
    'CREATE TABLE external_weights(a TEXT,b TEXT,FOREIGN KEY(a,b) REFERENCES weight_versions(id,sequence_id) ON DELETE CASCADE)',
  )
  raw
    .prepare('INSERT INTO external_weights VALUES (?,?)')
    .run(w.weightVersionId, w.weightSequenceId)
  raw.close()
  const before = stored(path),
    info = await archives.open(path),
    after = stored(path)
  expect(info.schemaVersion).toBe(17)
  expect(after.version).toBe(17)
  for (const [table, rows] of Object.entries(before.rows)) {
    const columns = Object.keys((rows as Record<string, unknown>[])[0] ?? {})
    expect(
      (after.rows[table] as Record<string, unknown>[]).map((row) =>
        Object.fromEntries(columns.map((c) => [c, row[c]])),
      ),
    ).toEqual(rows)
  }
  expect(new OperationRepository(db()).get(op.id)).toEqual(op)
  expect(new ServiceRepository(db()).get(svc.id)).toEqual(svc)
  expect(sql().pragma('foreign_key_check')).toEqual([])
  const backup = readdirSync(folder).find((n) => n.startsWith('v16.ormeggi.prima-v17-'))!
  expect(stored(join(folder, backup))).toEqual(before)
  // No referenced table was dropped: the CASCADE row also survives reopening and a dated insertion.
  await add((await fixed()).sequenceId)
  expect(sql().prepare('SELECT * FROM external_weights').all()).toEqual([
    { a: w.weightVersionId, b: w.weightSequenceId },
  ])
})
it('migrazione fallita dopo ALTER ripristina schema e dati v16 e conserva la sessione attiva', async () => {
  await create()
  await free('2026-06-01T13:00', 'PLANNED', true)
  const path = join(folder, 'v16-failure.ormeggi')
  archiveV16(path)
  const raw = new Database(path)
  raw.exec('CREATE INDEX weight_effective_unique ON archive_metadata(name)')
  raw.close()
  const before = stored(path),
    active = context()
  await expect(archives.open(path)).rejects.toThrow()
  expect(context()).toEqual(active)
  expect(stored(path)).toEqual(before)
  const backup = readdirSync(folder).find((n) => n.startsWith('v16-failure.ormeggi.prima-v17-'))!
  expect(stored(join(folder, backup))).toEqual(before)
})

it('date generali richiedono fuso aziendale confermato; la correzione iniziale ne rimane indipendente', async () => {
  const a = await fixed()
  sql().prepare('UPDATE company_time_zone SET confirmed=0').run()
  expect(
    await weightPreview({
      operation: 'INSERT',
      sequenceId: a.sequenceId,
      moment: moment('2026-06-01T00:00'),
      weight: '2',
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  const p = value(
    await weightPreview({
      operation: 'UPDATE',
      sequenceId: a.sequenceId,
      versionId: a.id,
      moment: null,
      weight: '2',
    }),
  )
  value(await weightConfirm(p))
  expect((await history(a.sequenceId)).versions.items[0].weight).toBe('2')
})

it('manutenzione e consuntivazione di operazioni/prestazioni risolvono i pesi al momento risultante', async () => {
  const a = await fixed()
  await add(a.sequenceId, '2026-06-01T00:00', '2')
  const op = await create(),
    svc = await free('2026-06-01T13:00', 'PLANNED', true)
  const w = await add(svc.calculation!.weightSequenceId, '2026-06-01T00:00', '3'),
    services = new ServiceService(archives.coordinator)
  const p = value(
    await operations.previewCorrect({
      context: context(),
      payload: { id: op.id, values: input('ENTRY', '2026-05-31T12:00') },
    }),
  )
  value(
    await operations.confirmCorrect({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(new OperationRepository(db()).get(op.id).charges[0].calculation).toMatchObject({
    weight: '1',
    base: '115.00',
  })
  const values = {
    vesselId,
    interpretationPortId: null,
    moment: moment('2026-05-31T13:00'),
    executionStatus: 'PLANNED' as const,
    notes: null,
    specified: { customerId: null, agencyId: null },
    serviceTypeId: svc.serviceTypeId!,
  }
  const servicePreview = value(
    await services.preview({
      context: context(),
      payload: { operation: 'UPDATE_CATALOG', id: svc.id, values },
    }),
  )
  value(
    await services.confirm({
      context: servicePreview.context,
      payload: { previewId: servicePreview.previewId },
    }),
  )
  expect(new ServiceRepository(db()).get(svc.id).base).toBe('115.00')
  const completed = value(
    await services.preview({
      context: context(),
      payload: {
        operation: 'COMPLETE_CATALOG',
        id: svc.id,
        values: { ...values, moment: moment('2026-06-01T13:00'), executionStatus: 'PERFORMED' },
      },
    }),
  )
  value(
    await services.confirm({
      context: completed.context,
      payload: { previewId: completed.previewId },
    }),
  )
  expect(new ServiceRepository(db()).get(svc.id)).toMatchObject({
    base: '345.00',
    calculation: { weightVersionId: w.id },
  })
  const complete = value(
    await operations.previewComplete({
      context: context(),
      payload: { id: op.id, values: input('ENTRY', '2026-06-01T12:00', 'PERFORMED') },
    }),
  )
  value(
    await operations.confirmComplete({
      context: complete.context,
      payload: { previewId: complete.previewId },
    }),
  )
  expect(new OperationRepository(db()).get(op.id).charges[0].calculation.base).toBe('230.00')
  await create(input('EXIT', '2026-06-05T00:00'))
  const i = value(
    await operations.previewInsert({
      context: context(),
      payload: {
        vesselId,
        operationType: 'MOVEMENT',
        moment: moment('2026-06-02T12:00'),
        arrivalMoment: moment('2026-06-02T13:00'),
        interpretationPortId: null,
        destinationPortId: portId,
        destinationBerthId: berthId,
        executionStatus: 'PLANNED',
        notes: null,
        manualOverrideAmount: '0.00',
      },
    }),
  )
  const inserted = value(
    await operations.confirmInsert({ context: i.context, payload: { previewId: i.previewId } }),
  )
  expect(inserted.charges[0]).toMatchObject({ effectiveBase: '0.00', calculation: { weight: '1' } })
  const d = value(
    await operations.previewDelete({ context: context(), payload: { id: inserted.id } }),
  )
  value(await operations.confirmDelete({ context: d.context, payload: { previewId: d.previewId } }))
  expect(new ServiceRepository(db()).get(svc.id).calculation?.weightVersionId).toBe(w.id)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
