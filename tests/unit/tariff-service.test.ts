import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { bracketCases } from '../../doc/p00/scenari.mjs'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { CatalogService } from '../../src/backend/application/catalog/catalog-service'
import { TariffService } from '../../src/backend/application/tariffs/tariff-service'
import { TimeService } from '../../src/backend/application/time/time-service'
import { TariffRepository } from '../../src/backend/infrastructure/database/tariff-repository'
import { calculateBracket } from '../../src/backend/domain/tariffs/base-calculator'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type {
  CreateTariffDto,
  TariffConfigurationInput,
  TariffActivity,
} from '../../src/shared/contracts/tariffs'
let folder: string,
  archives: ArchiveService,
  service: TariffService,
  ports: PortService,
  vessels: VesselService,
  portId: string,
  vesselId: string
const context = () => archives.context()!
const database = () => archives.coordinator.requireSession().database
const sql = () => database().sqlite
const value = <T>(r: ApplicationResult<T>): T => {
  if (!r.ok) throw new Error(r.error.message)
  return r.value
}
const fail = (code: string) => ({ ok: false, error: { code } })
const moment = (localDateTime: string, selectedOffset: string | null = null) => ({
  localDateTime,
  selectedOffset,
})
const configurations = (price = '100'): TariffConfigurationInput[] =>
  ['STANDARD', 'PASSENGER', 'ADM'].map((t) => ({
    vesselTypeId: t as TariffConfigurationInput['vesselTypeId'],
    brackets: [{ upperLimit: 1600, value: price }],
    extraWidth: 200,
    extraValue: '5',
  }))
const input = (start = '2026-01-01T00:00', price = '100'): CreateTariffDto => ({
  portId,
  moment: moment(start),
  configurations: configurations(price),
})
const preview = (payload: CreateTariffDto) => service.previewCreate({ context: context(), payload })
const create = async (payload = input()) => {
  const p = value(await preview(payload))
  return service.confirmCreate({ context: p.context, payload: { previewId: p.previewId } })
}
const list = (page = 1, pageSize = 25) =>
  service.list({ context: { sessionId: context().sessionId }, query: { portId, page, pageSize } })
const simulate = (
  at = '2026-01-01T00:00',
  activity: TariffActivity = { kind: 'OPERATION', operation: 'ENTRY' },
) =>
  service.simulateBase({
    context: { sessionId: context().sessionId },
    query: { portId, vesselId, moment: moment(at), activity },
  })
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p09-'))
  archives = new ArchiveService()
  service = new TariffService(archives.coordinator)
  ports = new PortService(archives.coordinator)
  vessels = new VesselService(archives.coordinator)
  await archives.create(join(folder, 'a.ormeggi'), 'P09')
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
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})
for (const c of bracketCases)
  it(c.id, () => {
    const result = calculateBracket(
      {
        vesselTypeId: 'STANDARD',
        brackets: [{ upperLimit: c.lastLimit, value: c.lastValue }],
        extraWidth: c.extraWidth,
        extraValue: c.extraValue,
      },
      c.size,
      c.weight,
    )
    expect(result).toMatchObject({
      extraCount: c.expected.extraCount,
      tariffValue: !c.expected.tariffValue.includes('.')
        ? c.expected.tariffValue + '.00'
        : c.expected.tariffValue,
      base: c.expected.base,
    })
  })
it('crea configurazioni atomiche con UUIDv4; sequenza passata, intermedia e futura, confini inclusi/esclusi e assenza prima della prima', async () => {
  const old = context(),
    beforeMetadata = database().metadata()
  const p = value(await preview(input()))
  expect(context()).toEqual(old)
  expect(database().metadata()).toEqual(beforeMetadata)
  expect(p).toMatchObject({
    status: 'READY',
    summary: { created: 1, updated: 0, recalculated: 0 },
    tariff: { effectiveMoment: { zoneId: 'Europe/Rome', utc: '2025-12-31T23:00:00.000Z' } },
  })
  const a = value(
    await service.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(BigInt(context().revision)).toBe(BigInt(old.revision) + 1n)
  for (const id of [
    a.id,
    ...a.configurations.flatMap((c) => [c.id, ...c.brackets.map((b) => b.id)]),
  ])
    expect(id).toMatch(/^[a-f0-9-]{14}4[a-f0-9]{3}-[89ab]/)
  const c = value(await create(input('2099-01-01T00:00', '300')))
  const b = value(await create(input('2026-06-01T00:00', '200')))
  expect(value(await list()).items.map((t) => [t.id, t.effectiveTo, t.phase])).toEqual([
    [a.id, b.effectiveFrom, 'HISTORICAL'],
    [b.id, c.effectiveFrom, 'CURRENT'],
    [c.id, null, 'FUTURE'],
  ])
  expect(value(await list(2, 1)).items[0].id).toBe(b.id)
  expect(await preview(input())).toMatchObject(fail('DUPLICATE_IDENTIFIER'))
  expect(await simulate('2025-12-31T23:59')).toMatchObject(fail('TARIFF_NOT_FOUND'))
  expect(value(await simulate()).tariffId).toBe(a.id)
  expect(value(await simulate('2026-05-31T23:59')).tariffId).toBe(a.id)
  expect(value(await simulate('2026-06-01T00:00')).tariffId).toBe(b.id)
  expect(value(await simulate('2099-01-01T00:00')).tariffId).toBe(c.id)
})
it('seleziona peso e versione nave storica alla decorrenza; simulazione senza scritture o utilizzo monotono', async () => {
  await create()
  const catalog = new CatalogService(archives.coordinator)
  const type = value(
    await catalog.create({
      context: context(),
      payload: { description: 'Peso 1,5', initialWeight: '1.5' },
    }),
  )
  const time = new TimeService(archives.coordinator)
  value(
    await time.configureCompanyZone({
      context: context(),
      payload: { zoneId: 'America/New_York' },
    }),
  )
  const p = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        moment: moment('2026-06-01T00:00'),
        registeredName: 'Nave passeggeri',
        imoNumber: null,
        vesselTypeId: 'PASSENGER',
        size: 0,
      },
    }),
  )
  value(await vessels.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  const before = context(),
    metadata = database().metadata()
  const a = value(await simulate('2026-06-01T05:59', { kind: 'CATALOG', serviceTypeId: type.id }))
  expect(a).toMatchObject({
    extraCount: 3,
    tariffValue: '115.00',
    weight: '1.5',
    base: '172.50',
    vesselTypeId: 'STANDARD',
    size: 2100,
    moment: { zoneId: 'Europe/Rome', utc: '2026-06-01T03:59:00.000Z' },
    weightVersionId: type.initialWeight.id,
  })
  const b = value(await simulate('2026-06-01T06:00'))
  expect(b).toMatchObject({ vesselTypeId: 'PASSENGER', size: 0, extraCount: 0, base: '100.00' })
  expect(b.vesselVersionId).not.toBe(a.vesselVersionId)
  expect(context()).toEqual(before)
  expect(database().metadata()).toEqual(metadata)
  expect(
    value(
      await catalog.get({ context: { sessionId: context().sessionId }, query: { id: type.id } }),
    ).hasEverBeenUsed,
  ).toBe(false)
})
it('valida forma, completezza, duplicati, ordinamento, interi e precisione senza scrivere', async () => {
  const before = context()
  for (const configs of [
    [],
    configurations().slice(0, 2),
    [...configurations(), configurations()[0]],
    configurations().map((c) => ({ ...c, vesselTypeId: 'STANDARD' })),
    configurations().map((c) => ({ ...c, brackets: [] })),
    configurations().map((c) => ({
      ...c,
      brackets: [
        { upperLimit: 10, value: '1' },
        { upperLimit: 10, value: '2' },
      ],
    })),
    configurations().map((c) => ({
      ...c,
      brackets: [
        { upperLimit: 10, value: '1' },
        { upperLimit: 9, value: '2' },
      ],
    })),
  ]) {
    expect(
      await preview({ ...input(), configurations: configs as TariffConfigurationInput[] }),
    ).toMatchObject(fail('VALIDATION_ERROR'))
  }
  for (const n of [-1, 0.1, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
    expect(
      await preview({
        ...input(),
        configurations: configurations().map((c) => ({
          ...c,
          brackets: [{ upperLimit: n, value: '1' }],
        })),
      }),
    ).toMatchObject(fail('VALIDATION_ERROR'))
  }
  for (const n of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])
    expect(
      await preview({
        ...input(),
        configurations: configurations().map((c) => ({ ...c, extraWidth: n })),
      }),
    ).toMatchObject(fail('VALIDATION_ERROR'))
  for (const price of ['-1', '1e2', 'NaN', '1,5', '9'.repeat(257)])
    expect(await preview(input('2026-01-01T00:00', price))).toMatchObject(fail('VALIDATION_ERROR'))
  expect(await preview({ ...input(), ignored: true } as CreateTariffDto)).toMatchObject(
    fail('VALIDATION_ERROR'),
  )
  expect(
    await preview({
      ...input(),
      configurations: configurations().map((c) => ({ ...c, ignored: true })),
    }),
  ).toMatchObject(fail('VALIDATION_ERROR'))
  expect(
    await preview({
      ...input(),
      moment: { ...moment('2026-01-01T00:00'), zoneId: 'UTC' },
    } as CreateTariffDto),
  ).toMatchObject(fail('VALIDATION_ERROR'))
  expect(context()).toEqual(before)
  expect(value(await list()).total).toBe(0)
})
it('supporta zero, confini ordinari, extra e arrotondamento dopo il risultato tariffario e dopo il peso', () => {
  const c = {
    vesselTypeId: 'STANDARD' as const,
    brackets: [
      { upperLimit: 0, value: '0' },
      { upperLimit: 1600, value: '0.004' },
    ],
    extraWidth: 200,
    extraValue: '0.0004',
  }
  expect(calculateBracket(c, 0, '1')).toMatchObject({
    bracketIndex: 0,
    extraCount: 0,
    base: '0.00',
  })
  expect(calculateBracket(c, 1, '1')).toMatchObject({
    bracketIndex: 1,
    extraCount: 0,
    base: '0.00',
  })
  expect(calculateBracket(c, 1600, '1')).toMatchObject({ extraCount: 0 })
  expect(calculateBracket(c, 1601, '1')).toMatchObject({ extraCount: 1 })
  expect(calculateBracket(c, 2000, '1')).toMatchObject({ extraCount: 2 })
  expect(calculateBracket(c, 2100, '1.5')).toMatchObject({
    extraCount: 3,
    tariffValue: '0.01',
    base: '0.02',
  })
})
it('conserva decimali a 256 cifre e controlla overflow del valore tariffario e della base', async () => {
  const precise = '0.' + '0'.repeat(254) + '1'
  const a = value(await create(input('2026-01-01T00:00', precise)))
  expect(a.configurations[0].brackets[0].value).toBe(precise)
  expect(sql().prepare('SELECT DISTINCT typeof(value) AS t FROM tariff_brackets').all()).toEqual([
    { t: 'text' },
  ])
  const c = configurations('92233720368547758.07')[0]
  expect(calculateBracket(c, 0, '1').base).toBe('92233720368547758.07')
  expect(() => calculateBracket(c, 0, '1.000000000000000001')).toThrowError(
    expect.objectContaining({ code: 'AMOUNT_OUT_OF_RANGE' }),
  )
  expect(() =>
    calculateBracket({ ...c, brackets: [{ upperLimit: 0, value: '9'.repeat(256) }] }, 0, precise),
  ).toThrowError(expect.objectContaining({ code: 'AMOUNT_OUT_OF_RANGE' }))
  expect(() => calculateBracket(c, 1601, '0.0001')).toThrowError(
    expect.objectContaining({ code: 'AMOUNT_OUT_OF_RANGE' }),
  )
})
it('copia da altro porto senza dipendenze e genera nuove identità per tutti gli elementi', async () => {
  const a = value(await create())
  const configs = value(
    await service.copyConfigurations({
      context: { sessionId: context().sessionId },
      query: { id: a.id },
    }),
  )
  const second = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Altro',
        locality: 'Altro',
        countryCode: 'IT',
        initialZoneId: 'America/New_York',
      },
    }),
  )
  const b = value(await create({ ...input(), portId: second.id, configurations: configs }))
  expect(b.portId).toBe(second.id)
  expect(b.effectiveMoment?.zoneId).toBe('America/New_York')
  expect(
    new Set(
      [a, b].flatMap((t) => [
        t.id,
        ...t.configurations.flatMap((c) => [c.id, ...c.brackets.map((b) => b.id)]),
      ]),
    ).size,
  ).toBe(14)
  sql()
    .prepare('UPDATE tariff_brackets SET value=? WHERE id=?')
    .run('999', a.configurations[0].brackets[0].id)
  expect(new TariffRepository(database()).get(b.id).configurations[0].brackets[0].value).toBe('100')
})
it('usa il fuso del porto senza richiedere quello aziendale; gestisce gap, overlap e offset estranei', async () => {
  expect(await preview(input('2026-03-29T02:30'))).toMatchObject(fail('LOCAL_TIME_NOT_EXISTENT'))
  expect(await preview(input('2026-10-25T02:30'))).toMatchObject(fail('LOCAL_TIME_AMBIGUOUS'))
  const r = value(
    await service.resolveMoment({
      context: { sessionId: context().sessionId },
      query: { portId, moment: moment('2026-10-25T02:30') },
    }),
  )
  expect(r.status).toBe('CHOICE_REQUIRED')
  for (const offset of ['+02:00', '+01:00'])
    expect(
      await create({ ...input('2026-10-25T02:30'), moment: moment('2026-10-25T02:30', offset) }),
    ).toMatchObject({ ok: true })
  expect(value(await list()).total).toBe(2)
  expect(await preview({ ...input(), moment: moment('2026-10-25T02:30', '-04:00') })).toMatchObject(
    fail('INVALID_OFFSET'),
  )
})
it('rollback di configurazioni parziali e metadati; anteprima consumata solo dopo commit', async () => {
  const p = value(await preview(input())),
    before = context(),
    metadata = database().metadata()
  sql().exec(
    "CREATE TRIGGER fail_tariff BEFORE INSERT ON tariff_brackets WHEN NEW.configuration_id IN (SELECT id FROM tariff_configurations WHERE vessel_type_id='ADM') BEGIN SELECT RAISE(ABORT,'failure'); END",
  )
  const confirm = () =>
    service.confirmCreate({ context: p.context, payload: { previewId: p.previewId } })
  expect(await confirm()).toMatchObject({ ok: false })
  expect(context()).toEqual(before)
  expect(database().metadata()).toEqual(metadata)
  for (const table of ['tariffs', 'tariff_configurations', 'tariff_brackets'])
    expect(sql().prepare(`SELECT count(*) FROM ${table}`).pluck().get()).toBe(0)
  sql().exec('DROP TRIGGER fail_tariff')
  expect(await confirm()).toMatchObject({ ok: true })
  expect(
    await service.confirmCreate({ context: context(), payload: { previewId: p.previewId } }),
  ).toMatchObject(fail('PREVIEW_EXPIRED'))
})
it('protegge sessioni, revisioni, namespace e scadenze; paginazione non cambia la conferma completa', async () => {
  const p = value(await preview(input())),
    before = context()
  const page = value(
    await service.previewEffects({
      context: { sessionId: context().sessionId },
      query: { previewId: p.previewId, page: 1, pageSize: 1 },
    }),
  )
  expect(page.effects.total).toBe(1)
  expect(context()).toEqual(before)
  expect(
    await new CatalogService(archives.coordinator).confirm({
      context: context(),
      payload: { previewId: p.previewId },
    }),
  ).toMatchObject(fail('PREVIEW_EXPIRED'))
  await archives.rename('Changed')
  expect(
    await service.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(fail('REVISION_CONFLICT'))
  expect(
    await service.confirmCreate({ context: context(), payload: { previewId: p.previewId } }),
  ).toMatchObject(fail('REVISION_CONFLICT'))
  await archives.saveAs(join(folder, 'copy.ormeggi'))
  expect(
    await service.list({
      context: { sessionId: before.sessionId },
      query: { portId, page: 1, pageSize: 25 },
    }),
  ).toMatchObject(fail('ARCHIVE_SESSION_CHANGED'))
})
it('integra FK reali: tariffa blocca eliminazione porto, conservata dalla disattivazione; nuovi riferimenti respinti', async () => {
  await create()
  const p = value(await ports.previewDelete({ context: context(), payload: { portId } }))
  expect(p.status).toBe('BLOCKED')
  expect(p.blockers.some((b) => b.reference.label.includes('tariffs'))).toBe(true)
  const d = value(await ports.previewDeactivate({ context: context(), payload: { portId } }))
  value(await ports.confirmDeactivate({ context: d.context, payload: { previewId: d.previewId } }))
  expect(value(await list()).total).toBe(1)
  expect(await preview(input('2026-06-01T00:00'))).toMatchObject(fail('NOT_SELECTABLE'))
  expect(await simulate()).toMatchObject({ ok: true })
})
it('riesamina riferimenti esterni reali alla conferma, comprese FK composte CASCADE verso scaglioni', async () => {
  const a = value(await create())
  const p = value(await preview(input('2026-06-01T00:00')))
  sql().exec(
    'CREATE UNIQUE INDEX bracket_composite ON tariff_brackets(id,configuration_id); CREATE TABLE dependent (bracket_id TEXT, configuration_id TEXT, FOREIGN KEY(bracket_id,configuration_id) REFERENCES tariff_brackets(id,configuration_id) ON DELETE CASCADE)',
  )
  sql()
    .prepare('INSERT INTO dependent VALUES (?,?)')
    .run(a.configurations[0].brackets[0].id, a.configurations[0].id)
  const before = context()
  expect(
    await service.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(fail('PREVIEW_BLOCKED'))
  expect(value(await preview(input('2026-06-01T00:00'))).status).toBe('BLOCKED')
  expect(context()).toEqual(before)
})
it('vincoli SQLite su duplicati, FK, decimali canonici e limiti; riapertura conserva tuple e configurazioni', async () => {
  const a = value(await create()),
    c = a.configurations[0],
    b = c.brackets[0]
  for (const raw of ['-1', '01', '1.0', '.1', '1e2', '1..2', '9'.repeat(257)])
    expect(() =>
      sql().prepare('UPDATE tariff_brackets SET value=? WHERE id=?').run(raw, b.id),
    ).toThrow()
  for (const raw of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])
    expect(() =>
      sql().prepare('UPDATE tariff_configurations SET extra_width=? WHERE id=?').run(raw, c.id),
    ).toThrow()
  expect(() =>
    sql().prepare('INSERT INTO tariff_brackets VALUES (?,?,?,?)').run('duplicate', c.id, 1600, '1'),
  ).toThrow()
  expect(() =>
    sql()
      .prepare('INSERT INTO tariff_brackets VALUES (?,?,?,?)')
      .run('orphan', 'absent', 1600, '1'),
  ).toThrow()
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(new TariffRepository(database()).get(a.id)).toEqual(a)
})

it('rispetta scadenza di 15 minuti e limite tecnico degli scaglioni senza scritture', async () => {
  const p = value(await preview(input())),
    before = context()
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(p.expiresAtUtc))
  try {
    expect(
      await service.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
    ).toMatchObject(fail('PREVIEW_EXPIRED'))
    expect(context()).toEqual(before)
  } finally {
    clock.mockRestore()
  }
  const tooMany = configurations().map((c) => ({
    ...c,
    brackets: Array.from({ length: 1001 }, (_, i) => ({ upperLimit: i, value: '0' })),
  }))
  expect(await preview({ ...input(), configurations: tooMany })).toMatchObject(
    fail('VALIDATION_ERROR'),
  )
  expect(context()).toEqual(before)
})
