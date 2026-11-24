import { TimeService } from '../../src/backend/application/time/time-service'
import { CatalogService } from '../../src/backend/application/catalog/catalog-service'
import { tariffMaintenanceOutcome } from '../../src/renderer/src/api/tariff-maintenance-outcome'
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
  folder = mkdtempSync(join(tmpdir(), 'porto-p18-'))
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

const getTariff = (id: string) =>
  tariffs.get({ context: { sessionId: context().sessionId }, query: { id } }).then(value)
const first = () =>
  tariffs
    .list({
      context: { sessionId: context().sessionId },
      query: { portId, page: 1, pageSize: 100 },
    })
    .then(value)
    .then((p) => getTariff(p.items[0].id))
const update = (id: string, at: string, price = '200') =>
  tariffs.previewUpdate({
    context: context(),
    payload: { id, moment: moment(at), configurations: config(price) },
  })
const deletion = (id: string) => tariffs.previewDelete({ context: context(), payload: { id } })
const confirmUpdate = (p: { context: ReturnType<typeof context>; previewId: string }) =>
  tariffs.confirmUpdate({ context: p.context, payload: { previewId: p.previewId } })
const confirmDelete = (p: { context: ReturnType<typeof context>; previewId: string }) =>
  tariffs.confirmDelete({ context: p.context, payload: { previewId: p.previewId } })
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

it.each(['initial', 'intermediate', 'future'])(
  'corregge dati e decorrenza %s, conserva identità compatibili e persiste',
  async (position) => {
    const a = await first(),
      b = await tariff('2026-05-01T00:00', '150'),
      c = await tariff('2099-01-01T00:00', '300')
    const before = position === 'initial' ? a : position === 'intermediate' ? b : c
    const start =
      position === 'initial'
        ? '2025-12-01T00:00'
        : position === 'intermediate'
          ? '2026-04-01T00:00'
          : '2098-01-01T00:00'
    const original = snapshot(),
      p = value(await update(before.id, start))
    expect(snapshot()).toEqual(original)
    expect(p.status).toBe('READY')
    const after = value(await confirmUpdate(p))
    expect(BigInt(context().revision)).toBe(BigInt(p.context.revision) + 1n)
    expect(after.configurations.map((c) => [c.id, c.brackets[0].id])).toEqual(
      before.configurations.map((c) => [c.id, c.brackets[0].id]),
    )
    expect(after.configurations.every((c) => c.brackets[0].value === '200')).toBe(true)
    expect(sql().pragma('foreign_key_check')).toEqual([])
    await archives.close()
    await archives.open(join(folder, 'a.ormeggi'))
    expect(await getTariff(before.id)).toEqual(after)
  },
)
it.each(['initial', 'intermediate', 'future'])(
  'elimina tariffa %s senza dipendenti e riunisce intervalli',
  async (position) => {
    const a = await first(),
      b = await tariff('2026-05-01T00:00'),
      c = await tariff('2099-01-01T00:00')
    const id = (position === 'initial' ? a : position === 'intermediate' ? b : c).id
    const p = value(await deletion(id)),
      original = snapshot()
    expect(
      value(
        await tariffs.deletionEffects({
          context: { sessionId: context().sessionId },
          query: { previewId: p.previewId, page: 1, pageSize: 1 },
        }),
      ).effects.total,
    ).toBe(p.effects.total)
    expect(snapshot()).toEqual(original)
    expect(value(await confirmDelete(p))).toEqual({ id })
    expect(BigInt(context().revision)).toBe(BigInt(p.context.revision) + 1n)
    expect(
      await tariffs.get({ context: { sessionId: context().sessionId }, query: { id } }),
    ).toMatchObject(failure('NOT_FOUND'))
    expect(sql().pragma('foreign_key_check')).toEqual([])
  },
)
it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'blocca perdita di copertura per operazioni %s anche con override zero',
  async (status) => {
    const a = await first()
    await create({ ...input('ENTRY', '2026-01-01T00:00', status), manualOverrideAmount: '0.00' })
    await tariff('2026-06-01T00:00')
    for (const p of [value(await deletion(a.id)), value(await update(a.id, '2026-01-01T00:01'))]) {
      expect(p.status).toBe('BLOCKED')
      expect(p.blockers.some((b) => b.reference.kind === 'OPERATION_CHARGE')).toBe(true)
      const original = snapshot()
      expect(
        await (p.operation === 'TARIFF_DELETE' ? confirmDelete(p) : confirmUpdate(p)),
      ).toMatchObject(failure('PREVIEW_BLOCKED'))
      expect(snapshot()).toEqual(original)
    }
  },
)
it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'blocca perdita copertura CATALOG %s',
  async (status) => {
    await create(input('ENTRY', '2026-01-01T00:00'))
    const a = await first(),
      svc = new ServiceService(archives.coordinator)
    const type = sql().prepare('SELECT id FROM service_types LIMIT 1').pluck().get() as string
    value(
      await svc.createCatalog({
        context: context(),
        payload: {
          vesselId,
          interpretationPortId: portId,
          moment: moment('2026-01-01T00:00'),
          executionStatus: status,
          notes: null,
          specified: { customerId: null, agencyId: null },
          serviceTypeId: type,
        },
      }),
    )
    const p = value(await deletion(a.id)),
      original = snapshot()
    expect(p.blockers.some((b) => b.reference.kind === 'SERVICE_ACTIVITY')).toBe(true)
    expect(await confirmDelete(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(snapshot()).toEqual(original)
  },
)
it('ricalcola confini, CATALOG e override manuali, conserva FREE', async () => {
  const a = await first(),
    b = await tariff('2026-06-02T00:00', '200')
  const op = await create({ ...input(), manualOverrideAmount: '0.00' })
  const catalog = await free('2026-06-02T00:00', 'MISSED', true),
    manual = await free('2026-06-02T00:00', 'MISSED')
  const exit = await create({ ...input('EXIT', '2026-06-03T00:00'), manualOverrideAmount: '12.34' })
  const p = value(await update(b.id, '2026-06-01T12:00', '300'))
  expect(p.summary.recalculated).toBe(3)
  value(await confirmUpdate(p))
  const repository = new OperationRepository(db()),
    services = new ServiceRepository(db())
  expect(repository.get(op.id).charges[0]).toMatchObject({
    manualOverrideAmount: '0.00',
    effectiveBase: '0.00',
    calculation: { tariffId: b.id, base: '315.00' },
  })
  expect(repository.get(exit.id).charges[0]).toMatchObject({
    manualOverrideAmount: '12.34',
    effectiveBase: '12.34',
    calculation: { tariffId: b.id, base: '315.00' },
  })
  expect(services.get(catalog.id)).toMatchObject({
    base: '315.00',
    calculation: { tariffId: b.id },
  })
  expect(services.get(manual.id)).toEqual(manual)
  expect((await getTariff(a.id)).effectiveTo).toBe(p.tariff.effectiveFrom)
  value(await confirmDelete(value(await deletion(b.id))))
  expect(repository.get(op.id).charges[0]).toMatchObject({
    effectiveBase: '0.00',
    calculation: { tariffId: a.id, base: '115.00' },
  })
  expect(services.get(catalog.id).base).toBe('115.00')
  expect(services.get(manual.id)).toEqual(manual)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('sposta tariffa attraverso più intervalli e seleziona il nuovo limite esatto', async () => {
  const a = await first(),
    b = await tariff('2026-06-01T00:00', '200'),
    c = await tariff('2026-07-01T00:00', '300')
  const op = await create(input('ENTRY', '2026-06-15T00:00')),
    service = await free('2026-07-15T00:00', 'PLANNED', true)
  value(await confirmUpdate(value(await update(b.id, '2026-08-01T00:00', '400'))))
  expect(new OperationRepository(db()).get(op.id).charges[0].calculation.tariffId).toBe(a.id)
  expect(new ServiceRepository(db()).get(service.id).calculation?.tariffId).toBe(c.id)
  value(await confirmUpdate(value(await update(b.id, '2026-06-15T00:00', '400'))))
  expect(new OperationRepository(db()).get(op.id).charges[0].calculation.tariffId).toBe(b.id)
})

it('rifiuta collisioni, gap, overlap impliciti, offset estranei e campi inattesi senza scritture', async () => {
  const a = await first()
  await tariff('2026-06-01T00:00')
  const original = snapshot()
  for (const [at, code] of [
    ['2026-06-01T00:00', 'DUPLICATE_IDENTIFIER'],
    ['2026-03-29T02:30', 'LOCAL_TIME_NOT_EXISTENT'],
    ['2026-10-25T02:30', 'LOCAL_TIME_AMBIGUOUS'],
  ])
    expect(await update(a.id, at)).toMatchObject(failure(code))
  expect(
    await tariffs.previewUpdate({
      context: context(),
      payload: { id: a.id, moment: moment('2026-10-25T02:30', '-04:00'), configurations: config() },
    }),
  ).toMatchObject(failure('INVALID_OFFSET'))
  expect(
    await tariffs.previewDelete({
      context: context(),
      payload: { id: a.id, extra: true } as { id: string },
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await tariffs.previewUpdate({
      context: context(),
      payload: { id: a.id, moment: moment('2026-01-01T00:00'), configurations: [] },
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(snapshot()).toEqual(original)
  for (const offset of ['+02:00', '+01:00']) {
    const p = value(
      await tariffs.previewUpdate({
        context: context(),
        payload: { id: a.id, moment: moment('2026-10-25T02:30', offset), configurations: config() },
      }),
    )
    value(await confirmUpdate(p))
  }
})
it('no-op conserva metadati e tupla storica anche al limite di revisione', async () => {
  const a = await first()
  await create()
  await free('2026-06-01T13:00', 'PLANNED', true)
  sql().prepare('UPDATE archive_metadata SET revision=?').run(9223372036854775807n)
  const original = snapshot(),
    p = value(await update(a.id, '2026-01-01T00:00', '100'))
  expect(p.summary.recalculated).toBe(0)
  expect(p.effects.total).toBe(0)
  expect(await confirmUpdate(p)).toMatchObject({ ok: true })
  expect(snapshot()).toEqual(original)
})
it('rollback dopo ricalcoli conserva ogni riga, metadati e anteprima; consumo dopo commit', async () => {
  const a = await first()
  await create()
  await free('2026-06-01T13:00', 'PLANNED', true)
  const p = value(await update(a.id, '2026-01-01T00:00', '300')),
    original = snapshot()
  sql().exec(
    "CREATE TRIGGER fail_recalculation BEFORE UPDATE ON service_activities BEGIN SELECT RAISE(ABORT,'rollback'); END",
  )
  expect(await confirmUpdate(p)).toMatchObject({ ok: false })
  expect(snapshot()).toEqual(original)
  sql().exec('DROP TRIGGER fail_recalculation')
  expect(await confirmUpdate(p)).toMatchObject({ ok: true })
  expect(
    await tariffs.confirmUpdate({ context: context(), payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
})
it('elimina scaglioni posseduti dopo riattribuzione atomica, conserva soggetti', async () => {
  const a = await first(),
    op = await create(),
    svc = await free('2026-06-01T13:00', 'PLANNED', true)
  const p = value(
    await tariffs.previewUpdate({
      context: context(),
      payload: {
        id: a.id,
        moment: moment('2026-01-01T00:00'),
        configurations: config('200').map((c) => ({
          ...c,
          brackets: [{ upperLimit: 3000, value: '200' }],
        })),
      },
    }),
  )
  const original = snapshot()
  sql().exec(
    "CREATE TRIGGER fail_retire BEFORE DELETE ON tariff_brackets BEGIN SELECT RAISE(ABORT,'rollback'); END",
  )
  expect(await confirmUpdate(p)).toMatchObject({ ok: false })
  expect(snapshot()).toEqual(original)
  sql().exec('DROP TRIGGER fail_retire')
  value(await confirmUpdate(p))
  expect(new OperationRepository(db()).get(op.id).charges[0]).toMatchObject({
    id: op.charges[0].id,
    subjects: op.charges[0].subjects,
    calculation: { base: '200.00' },
  })
  expect(new ServiceRepository(db()).get(svc.id).base).toBe('200.00')
  expect(
    sql().prepare('SELECT count(*) FROM tariff_brackets WHERE upper_limit=1600').pluck().get(),
  ).toBe(0)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it.each(['tariff', 'configuration', 'bracket', 'composite', 'implicit'])(
  'riesamina dipendenti esterni %s anche CASCADE senza eliminarli',
  async (target) => {
    const a = await first()
    await tariff('2025-01-01T00:00', '50')
    const p = value(await deletion(a.id))
    if (target === 'composite') {
      sql().exec(
        'CREATE UNIQUE INDEX composite_bracket ON tariff_brackets(id,configuration_id); CREATE TABLE dependent (a TEXT,b TEXT,FOREIGN KEY(a,b) REFERENCES tariff_brackets(id,configuration_id) ON DELETE CASCADE)',
      )
      sql()
        .prepare('INSERT INTO dependent VALUES (?,?)')
        .run(a.configurations[0].brackets[0].id, a.configurations[0].id)
    } else {
      const table =
        target === 'tariff'
          ? 'tariffs'
          : target === 'configuration'
            ? 'tariff_configurations'
            : 'tariff_brackets'
      sql().exec(
        'CREATE TABLE dependent (a TEXT REFERENCES ' +
          table +
          (target === 'implicit' ? '' : '(id)') +
          ' ON DELETE CASCADE)',
      )
      sql()
        .prepare('INSERT INTO dependent VALUES (?)')
        .run(
          target === 'tariff'
            ? a.id
            : target === 'configuration'
              ? a.configurations[0].id
              : a.configurations[0].brackets[0].id,
        )
    }
    const original = snapshot()
    expect(await confirmDelete(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(snapshot()).toEqual(original)
    const blocked = value(await deletion(a.id))
    expect(blocked.status).toBe('BLOCKED')
    sql().exec('DELETE FROM dependent')
    expect(await confirmDelete(blocked)).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(await confirmDelete(p)).toMatchObject({ ok: true })
  },
)
it('protegge namespace, scadenza, revisione, sessione e riapertura', async () => {
  const a = await first(),
    p = value(await update(a.id, '2026-01-01T00:00'))
  expect(await confirmDelete(p)).toMatchObject(failure('PREVIEW_EXPIRED'))
  expect(
    await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(p.expiresAtUtc))
  expect(await confirmUpdate(p)).toMatchObject(failure('PREVIEW_EXPIRED'))
  clock.mockRestore()
  const fresh = value(await deletion(a.id))
  await archives.rename('changed')
  expect(await confirmDelete(fresh)).toMatchObject(failure('REVISION_CONFLICT'))
  expect(
    await tariffs.confirmDelete({ context: context(), payload: { previewId: fresh.previewId } }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  const next = value(await deletion(a.id))
  await archives.saveAs(join(folder, 'copy.ormeggi'))
  expect(await confirmDelete(next)).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(await getTariff(a.id)).toEqual(a)
})

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'ricalcola e riattribuisce operazioni %s a due estremi economici indipendenti',
  async (status) => {
    await create()
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
    const before = await first(),
      dest = await tariff('2026-01-01T00:00', '500', other)
    const origin = await tariff('2026-06-02T12:00', '200'),
      next = await tariff('2026-06-02T13:00', '700', other)
    const move = await create({
      vesselId,
      operationType: 'MOVEMENT',
      interpretationPortId: null,
      destinationPortId: other,
      destinationBerthId: null,
      moment: moment('2026-06-02T12:00'),
      arrivalMoment: moment('2026-06-02T13:00'),
      executionStatus: status,
      notes: null,
      manualOverrideAmount: '0.00',
    })
    const repository = new OperationRepository(db()),
      charges = repository.get(move.id).charges
    expect(charges.map((c) => c.calculation.tariffId)).toEqual([origin.id, next.id])
    expect(charges[0].calculation.moment.utc).toBe('2026-06-02T10:00:00.000Z')
    expect(charges[1].calculation.moment.utc).toBe('2026-06-02T17:00:00.000Z')
    value(await confirmDelete(value(await deletion(origin.id))))
    expect(repository.get(move.id).charges.map((c) => c.calculation.tariffId)).toEqual([
      before.id,
      next.id,
    ])
    value(await confirmDelete(value(await deletion(next.id))))
    const after = repository.get(move.id).charges
    expect(after.map((c) => c.calculation.tariffId)).toEqual([before.id, dest.id])
    expect(after.map((c) => c.id)).toEqual(charges.map((c) => c.id))
    expect(after[0].effectiveBase).toBe(charges[0].effectiveBase)
    expect(after[1]).toMatchObject({ manualOverrideAmount: null, effectiveBase: '515.00' })
    expect(after.map((c) => c.calculation.base)).toEqual(['115.00', '515.00'])
    expect(sql().pragma('foreign_key_check')).toEqual([])
  },
)
it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'aggiorna dimensione/tipologia nave, CATALOG storico disattivato e FREE %s',
  async (status) => {
    if (status === 'MISSED') await create(input('ENTRY', '2026-05-01T00:00'))
    const a = await first(),
      op = await create({
        ...input(status === 'MISSED' ? 'EXIT' : 'ENTRY', '2026-06-01T12:00', status),
        manualOverrideAmount: '0.00',
      })
    const svc = new ServiceService(archives.coordinator),
      type = sql().prepare('SELECT id FROM service_types LIMIT 1').pluck().get() as string
    const common = {
      vesselId,
      interpretationPortId: portId,
      moment: moment('2026-06-02T00:00'),
      executionStatus: status,
      notes: null,
      specified: { customerId: null, agencyId: null },
    }
    const catalog = value(
      await svc.createCatalog({ context: context(), payload: { ...common, serviceTypeId: type } }),
    )
    const manual = value(
      await svc.createFree({
        context: context(),
        payload: { ...common, description: 'Libera', base: '123.45' },
      }),
    )
    const catalogService = new CatalogService(archives.coordinator)
    const deactivate = value(
      await catalogService.preview({
        context: context(),
        payload: { operation: 'DEACTIVATE', id: type },
      }),
    )
    value(
      await catalogService.confirm({
        context: deactivate.context,
        payload: { previewId: deactivate.previewId },
      }),
    )
    const p = value(
      await vessels.preview({
        context: context(),
        payload: {
          operation: 'INSERT_VERSION',
          vesselId,
          moment: moment('2026-05-01T00:00'),
          registeredName: 'Nuova nave',
          imoNumber: null,
          vesselTypeId: 'PASSENGER',
          size: 100,
        },
      }),
    )
    value(await vessels.confirm({ context: p.context, payload: { previewId: p.previewId } }))
    const repository = new OperationRepository(db()),
      services = new ServiceRepository(db())
    expect(repository.get(op.id).charges[0]).toMatchObject({
      effectiveBase: '0.00',
      calculation: { vesselTypeId: 'PASSENGER', size: 100, base: '100.00' },
    })
    expect(services.get(catalog.id)).toMatchObject({
      serviceTypeId: type,
      base: '100.00',
      calculation: { vesselTypeId: 'PASSENGER', size: 100 },
    })
    const currentFree = services.get(manual.id)
    expect(currentFree.base).toBe(manual.base)
    expect(currentFree.calculation).toBeNull()
    value(await confirmUpdate(value(await update(a.id, '2026-01-01T00:00', '250'))))
    expect(services.get(catalog.id)).toMatchObject({ serviceTypeId: type, base: '250.00' })
    expect(repository.get(op.id).charges[0]).toMatchObject({
      effectiveBase: '0.00',
      calculation: { base: '250.00' },
    })
    expect(services.get(manual.id)).toEqual(currentFree)
    expect(sql().pragma('foreign_key_check')).toEqual([])
  },
)
it('variazione nave ai due estremi e al momento CATALOG, preserva le sostituzioni', async () => {
  await create()
  const move = await movement('2026-06-02T12:00', '2026-06-02T13:00')
  // Internal movement has one economic component; the later service observes the later vessel version.
  const service = await free('2026-06-02T14:00', 'MISSED', true)
  const p = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        moment: moment('2026-06-02T12:30'),
        registeredName: 'Piccola',
        imoNumber: null,
        vesselTypeId: 'ADM',
        size: 0,
      },
    }),
  )
  value(await vessels.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  expect(new OperationRepository(db()).get(move.id).charges[0].calculation.size).toBe(2100)
  expect(new ServiceRepository(db()).get(service.id)).toMatchObject({
    base: '100.00',
    calculation: { size: 0, vesselTypeId: 'ADM' },
  })
})
it('elimina ultima tariffa senza attività e corregge tariffe di porto disattivato', async () => {
  const a = await first()
  const p = value(await ports.previewDeactivate({ context: context(), payload: { portId } }))
  value(await ports.confirmDeactivate({ context: p.context, payload: { previewId: p.previewId } }))
  value(await confirmUpdate(value(await update(a.id, '2026-01-01T00:00', '300'))))
  value(await confirmDelete(value(await deletion(a.id))))
  expect(sql().prepare('SELECT count(*) FROM tariffs').pluck().get()).toBe(0)
})
it('riconosce esiti persistiti, letture obsolete e sessioni diverse prima di un nuovo tentativo', async () => {
  const a = await first(),
    original = context(),
    p = value(await update(a.id, '2026-01-01T00:00', '300'))
  expect(tariffMaintenanceOutcome(a, p.tariff, a, original, original)).toBe('UNCHANGED')
  const after = value(await confirmUpdate(p)),
    observed = context()
  expect(tariffMaintenanceOutcome(a, p.tariff, after, original, observed)).toBe('APPLIED')
  expect(tariffMaintenanceOutcome(a, p.tariff, a, original, observed)).toBe('CONFLICT')
  expect(
    tariffMaintenanceOutcome(a, p.tariff, after, original, { ...observed, sessionId: 'different' }),
  ).toBe('CONFLICT')
  expect(tariffMaintenanceOutcome(a, null, null, original, original)).toBe('CONFLICT')
  expect(tariffMaintenanceOutcome(a, null, null, original, observed)).toBe('APPLIED')
})

it('variazioni nave tra estremi di uno spostamento tra porti e prestazioni CATALOG nei due porti', async () => {
  await create()
  const other = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Destinazione',
        locality: 'Destinazione',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  ).id
  const t = await tariff('2026-01-01T00:00', '500', other),
    a = await first()
  const origin = await free('2026-06-02T11:59', 'PERFORMED', true)
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
  const destination = await free('2026-06-02T13:00', 'MISSED', true)
  const version = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        moment: moment('2026-06-02T12:30'),
        registeredName: 'Nuova',
        imoNumber: null,
        vesselTypeId: 'PASSENGER',
        size: 100,
      },
    }),
  )
  value(
    await vessels.confirm({ context: version.context, payload: { previewId: version.previewId } }),
  )
  const repo = new OperationRepository(db()),
    services = new ServiceRepository(db())
  expect(
    repo
      .get(move.id)
      .charges.map((c) => [c.calculation.size, c.calculation.tariffId, c.effectiveBase]),
  ).toEqual([
    [2100, a.id, '0.00'],
    [100, t.id, '12.34'],
  ])
  expect(services.get(origin.id)).toMatchObject({ base: '115.00', calculation: { size: 2100 } })
  expect(services.get(destination.id)).toMatchObject({ base: '500.00', calculation: { size: 100 } })
  value(await confirmUpdate(value(await update(t.id, '2026-01-01T00:00', '700'))))
  expect(repo.get(move.id).charges[1]).toMatchObject({
    effectiveBase: '12.34',
    calculation: { size: 100, base: '700.00' },
  })
  expect(services.get(destination.id)).toMatchObject({ base: '700.00' })
  expect(services.get(origin.id)).toMatchObject({ base: '115.00' })
  // Correct and remove the vessel version through its existing API; all activities return to the surviving version.
  const correction = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'UPDATE_VERSION',
        vesselId,
        versionId: version.effects.items.find((e) => e.action === 'CREATE')!.versionId!,
        moment: moment('2026-06-02T12:30'),
        registeredName: 'Nuova',
        imoNumber: null,
        vesselTypeId: 'ADM',
        size: 3000,
      },
    }),
  )
  value(
    await vessels.confirm({
      context: correction.context,
      payload: { previewId: correction.previewId },
    }),
  )
  expect(services.get(destination.id)).toMatchObject({
    calculation: { vesselTypeId: 'ADM', size: 3000 },
  })
  const removal = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'DELETE_VERSION',
        vesselId,
        versionId: version.effects.items.find((e) => e.action === 'CREATE')!.versionId!,
      },
    }),
  )
  value(
    await vessels.confirm({ context: removal.context, payload: { previewId: removal.previewId } }),
  )
  expect(repo.get(move.id).charges[1]).toMatchObject({
    effectiveBase: '12.34',
    calculation: { size: 2100, vesselTypeId: 'STANDARD', base: '715.00' },
  })
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('rollback eliminazione dopo riattribuzione conserva componenti, servizi e metadati', async () => {
  const a = await first(),
    b = await tariff('2026-05-01T00:00', '200')
  const op = await create(),
    svc = await free('2026-06-01T13:00', 'MISSED', true)
  const p = value(await deletion(b.id)),
    original = snapshot()
  sql().exec(
    "CREATE TRIGGER fail_delete_tariff BEFORE DELETE ON tariffs BEGIN SELECT RAISE(ABORT,'rollback'); END",
  )
  expect(await confirmDelete(p)).toMatchObject({ ok: false })
  expect(snapshot()).toEqual(original)
  sql().exec('DROP TRIGGER fail_delete_tariff')
  value(await confirmDelete(p))
  expect(new OperationRepository(db()).get(op.id).charges[0].calculation.tariffId).toBe(a.id)
  expect(new ServiceRepository(db()).get(svc.id).calculation?.tariffId).toBe(a.id)
  expect(BigInt(context().revision)).toBe(BigInt(p.context.revision) + 1n)
})

it('ricalcola attività future alla cancellazione e non anticipa gli effetti prima del confine', async () => {
  const a = await first(),
    b = await tariff('2099-01-01T00:00', '300')
  const op = await create(input('ENTRY', '2098-12-31T23:59')),
    service = await free('2099-01-01T00:00', 'PLANNED', true)
  const exit = await create(input('EXIT', '2099-01-01T01:00'))
  const p = value(await deletion(b.id))
  expect(p.summary.recalculated).toBe(2)
  value(await confirmDelete(p))
  const repo = new OperationRepository(db())
  expect(repo.get(op.id).charges).toEqual(op.charges)
  expect(repo.get(exit.id).charges[0].calculation.tariffId).toBe(a.id)
  expect(new ServiceRepository(db()).get(service.id).calculation?.tariffId).toBe(a.id)
})
