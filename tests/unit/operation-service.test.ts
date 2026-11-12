import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { BerthService } from '../../src/backend/application/berths/berth-service'
import { TariffService } from '../../src/backend/application/tariffs/tariff-service'
import { TimeService } from '../../src/backend/application/time/time-service'
import { OperationService } from '../../src/backend/application/operations/operation-service'
import { OperationRepository } from '../../src/backend/infrastructure/database/operation-repository'
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
const all = () => new OperationRepository(db()).all(vesselId)
const stays = () => new OperationRepository(db()).stays(vesselId, 1, 100).items
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
it('entrata → uscita → nuova entrata: struttura atomica, identità ancorate, stati stabili e riapertura', async () => {
  const original = context(),
    metadata = db().metadata(),
    p = value(await preview())
  expect(context()).toEqual(original)
  expect(p).not.toHaveProperty('input')
  expect(p.operationValues).not.toHaveProperty('openingIds')
  const paged = value(
    await operations.previewEffects({
      context: { sessionId: context().sessionId },
      query: { previewId: p.previewId, page: 1, pageSize: 50 },
    }),
  )
  expect(paged).not.toHaveProperty('input')
  expect(paged.operationValues).not.toHaveProperty('openingIds')
  expect(db().metadata()).toEqual(metadata)
  expect(p.summary).toMatchObject({ created: 5 })
  const entry = value(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(BigInt(context().revision)).toBe(BigInt(original.revision) + 1n)
  expect(entry.charge).toMatchObject({
    effectiveBase: '115.00',
    calculation: { extraCount: 3, tariffValue: '115.00', base: '115.00' },
  })
  const first = stays()[0]
  expect(first.visits[0].stays[0].berthId).toBe(berthId)
  const exit = await create(input('EXIT', '2026-06-02T12:00', 'PERFORMED'))
  expect(stays()[0]).toMatchObject({
    id: first.id,
    closingOperationId: exit.id,
    endedAt: exit.endpoint.moment.utc,
  })
  expect(stays()[0].visits[0].id).toBe(first.visits[0].id)
  expect(stays()[0].visits[0].stays[0].id).toBe(first.visits[0].stays[0].id)
  const second = await create({
    ...input('ENTRY', '2026-06-03T12:00', 'PERFORMED'),
    operationType: 'ENTRY',
    portId,
    berthId: null,
  })
  expect(stays()).toHaveLength(2)
  expect(stays()[0].id).not.toBe(first.id)
  expect(stays()[0].openingOperationId).toBe(second.id)
  expect(stays()[0].visits[0].stays[0].berthId).toBeNull()
  const saved = all(),
    hierarchy = stays(),
    revision = context().revision
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(all()).toEqual(saved)
  expect(stays()).toEqual(hierarchy)
  expect(context().revision).toBe(revision)
  expect(all()[0].executionStatus).toBe('PLANNED')
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('MISSED richiede tariffa e contesto, non apre né chiude e mantiene il calcolo e override zero', async () => {
  const missed = await create({
    ...input('ENTRY', '2026-05-01T12:00', 'MISSED'),
    manualOverrideAmount: '0.00',
  })
  expect(stays()).toEqual([])
  expect(missed.charge).toMatchObject({
    manualOverrideAmount: '0.00',
    effectiveBase: '0.00',
    calculation: { base: '115.00' },
  })
  expect(await preview(input('EXIT', '2026-05-02T12:00', 'MISSED'))).toMatchObject(
    failure('OPERATIONAL_CONTEXT_MISSING'),
  )
  await create()
  await create(input('EXIT', '2026-06-02T12:00', 'MISSED'))
  expect(stays()[0].endedAt).toBeNull()
  expect(await preview(input('ENTRY', '2026-06-03T12:00', 'MISSED'))).toMatchObject(
    failure('OPERATION_SEQUENCE_INVALID'),
  )
  await create(input('EXIT', '2026-06-04T12:00'))
  expect(stays()[0].endedAt).not.toBeNull()
})
it('valida tutta la sequenza, comprese operazioni successive MISSED; collisioni UTC anche fra fusi', async () => {
  await create()
  await create(input('EXIT', '2026-06-04T12:00', 'MISSED'))
  expect(await preview(input('EXIT', '2026-06-03T12:00'))).toMatchObject(
    failure('OPERATIONAL_CONTEXT_MISSING'),
  )
  expect(await preview(input('ENTRY', '2026-06-02T12:00'))).toMatchObject(
    failure('OPERATION_SEQUENCE_INVALID'),
  )
  expect(await preview(input('ENTRY', '2026-06-01T12:00', 'MISSED'))).toMatchObject(
    failure('OPERATION_MINUTE_CONFLICT'),
  )
  const other = value(
    await ports.create({
      context: context(),
      payload: { name: 'NY', locality: 'NY', countryCode: 'US', initialZoneId: 'America/New_York' },
    }),
  ).id
  await tariff('2026-01-01T00:00', '10', other)
  expect(
    await preview({
      ...input('ENTRY', '2026-06-01T06:00', 'MISSED'),
      operationType: 'ENTRY',
      portId: other,
      berthId: null,
    }),
  ).toMatchObject(failure('OPERATION_MINUTE_CONFLICT'))
  expect(all()).toHaveLength(2)
})
it('selezionabilità e appartenenza nella transazione; origine disattivata conservata in uscita', async () => {
  const other = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Altro',
        locality: 'Savona',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  ).id
  const foreignBerth = value(
    await berths.create({ context: context(), payload: { portId: other, name: 'Altro molo' } }),
  ).id
  expect(
    await preview({ ...input(), operationType: 'ENTRY', portId, berthId: foreignBerth }),
  ).toMatchObject(failure('NOT_SELECTABLE'))
  await create()
  sql().prepare("UPDATE ports SET status='INACTIVE' WHERE id=?").run(portId)
  sql().prepare("UPDATE berths SET status='INACTIVE' WHERE id=?").run(berthId)
  const exit = await create(input('EXIT', '2026-06-02T12:00'))
  expect(exit.endpoint).toMatchObject({ portId, berthId })
  expect(await preview(input('ENTRY', '2026-06-03T12:00'))).toMatchObject(failure('NOT_SELECTABLE'))
  sql().prepare("UPDATE vessels SET status='INACTIVE' WHERE id=?").run(vesselId)
  expect(await preview(input('ENTRY', '2026-06-04T12:00', 'MISSED'))).toMatchObject(
    failure('NOT_SELECTABLE'),
  )
})
it('tariffa assente anche per MISSED e override zero: nessuna struttura o revisione', async () => {
  const before = context()
  for (const status of ['PLANNED', 'PERFORMED', 'MISSED'] as const)
    expect(
      await preview({
        ...input('ENTRY', '2025-12-31T23:59', status),
        manualOverrideAmount: '0.00',
      }),
    ).toMatchObject(failure('TARIFF_NOT_FOUND'))
  expect(context()).toEqual(before)
  expect(all()).toEqual([])
  expect(stays()).toEqual([])
})
it('gap, overlap esplicito, offset estranei e tuple nel fuso del porto; confini UTC distinti', async () => {
  expect(await preview(input('ENTRY', '2026-03-29T02:30'))).toMatchObject(
    failure('LOCAL_TIME_NOT_EXISTENT'),
  )
  expect(await preview(input('ENTRY', '2026-10-25T02:30'))).toMatchObject(
    failure('LOCAL_TIME_AMBIGUOUS'),
  )
  expect(
    await preview({
      ...input('ENTRY', '2026-10-25T02:30'),
      moment: moment('2026-10-25T02:30', '+03:00'),
    }),
  ).toMatchObject(failure('INVALID_OFFSET'))
  const entry = await create({
    ...input('ENTRY', '2026-10-25T02:30'),
    moment: moment('2026-10-25T02:30', '+02:00'),
  })
  const exit = await create({
    ...input('EXIT', '2026-10-25T02:30'),
    moment: moment('2026-10-25T02:30', '+01:00'),
  })
  expect(entry.endpoint.moment).toMatchObject({
    utc: '2026-10-25T00:30:00.000Z',
    zoneId: 'Europe/Rome',
    offset: '+02:00',
  })
  expect(exit.endpoint.moment.utc).toBe('2026-10-25T01:30:00.000Z')
  expect(stays()[0].endedAt).toBe(exit.endpoint.moment.utc)
})
it('tariffa intermedia ricalcola soltanto intervallo incluso/escluso e conserva override e identità', async () => {
  const initial = await create(input('ENTRY', '2026-05-31T23:59'))
  const a = await create({ ...input('EXIT', '2026-06-01T00:00'), manualOverrideAmount: '0.00' })
  const next = await tariff('2026-07-01T00:00', '300')
  const b = await create(input('ENTRY', '2026-07-01T00:00', 'MISSED'))
  const before = context(),
    p = value(
      await tariffs.previewCreate({
        context: context(),
        payload: { portId, moment: moment('2026-06-01T00:00'), configurations: config('200') },
      }),
    )
  expect(p).toMatchObject({ status: 'READY', summary: { recalculated: 1 } })
  expect(context()).toEqual(before)
  expect(p.effects.items.some((e) => e.reference.id === a.charge.id)).toBe(true)
  value(await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  const saved = all()
  expect(saved[0]).toEqual(initial)
  expect(saved[2]).toEqual(b)
  expect(saved[1].charge).toMatchObject({
    id: a.charge.id,
    manualOverrideAmount: '0.00',
    effectiveBase: '0.00',
    calculation: { base: '215.00' },
  })
  expect(saved[2].charge.calculation.tariffId).toBe(next.id)
  expect(BigInt(context().revision)).toBe(BigInt(before.revision) + 1n)
})
it('versioni nave: anteprima completa, ricalcolo e versione applicata alle aperture, cancellazione e no-op', async () => {
  await new TimeService(archives.coordinator).configureCompanyZone({
    context: context(),
    payload: { zoneId: 'Europe/Rome' },
  })
  const entry = await create(),
    exit = await create(input('EXIT', '2026-08-01T12:00'))
  const first = stays()[0]
  const p = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        registeredName: 'Nuova nave',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 2500,
        moment: moment('2026-07-01T00:00'),
      },
    }),
  )
  expect(p.status).toBe('READY')
  expect(p.summary.recalculated).toBe(1)
  value(await vessels.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  expect(all()[0]).toEqual(entry)
  expect(all()[1].charge).toMatchObject({
    id: exit.charge.id,
    calculation: { size: 2500, extraCount: 5, base: '125.00' },
  })
  expect(stays()[0]).toEqual(first)
  const versionId = all()[1].vesselVersionId
  const del = value(
    await vessels.preview({
      context: context(),
      payload: { operation: 'DELETE_VERSION', vesselId, versionId },
    }),
  )
  expect(del.status).toBe('READY')
  value(await vessels.confirm({ context: del.context, payload: { previewId: del.previewId } }))
  expect(all()[1]).toEqual(exit)
  const initial = all()[0].vesselVersionId
  const correct = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'UPDATE_VERSION',
        vesselId,
        versionId: initial,
        registeredName: 'Corretta',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 2200,
        moment: null,
      },
    }),
  )
  expect(correct.effects.items.some((e) => e.reference.kind === 'VOYAGE')).toBe(true)
  value(
    await vessels.confirm({ context: correct.context, payload: { previewId: correct.previewId } }),
  )
  expect(stays()[0].id).toBe(first.id)
  const noop = value(
      await vessels.preview({
        context: context(),
        payload: {
          operation: 'UPDATE_VERSION',
          vesselId,
          versionId: initial,
          registeredName: 'Corretta',
          imoNumber: null,
          vesselTypeId: 'STANDARD',
          size: 2200,
          moment: null,
        },
      }),
    ),
    before = context()
  expect(noop.effects.total).toBe(0)
  value(await vessels.confirm({ context: noop.context, payload: { previewId: noop.previewId } }))
  expect(context()).toEqual(before)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('porti e banchine: versioni applicate alle operazioni e permanenze; eliminazioni identità bloccate', async () => {
  const entry = await create(),
    first = stays()[0]
  const p = value(
    await ports.previewInsertVersion({
      context: context(),
      payload: {
        portId,
        name: 'Genova nuova',
        locality: 'Genova',
        countryCode: 'IT',
        moment: moment('2026-05-01T00:00'),
      },
    }),
  )
  expect(p.status).toBe('READY')
  expect(p.effects.items.some((e) => e.reference.kind === 'PORT_CALL')).toBe(true)
  value(
    await ports.confirmInsertVersion({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(all()[0].endpoint.portName).toBe('Genova nuova')
  expect(stays()[0].visits[0]).toMatchObject({
    id: first.visits[0].id,
    portVersionId: all()[0].endpoint.portVersionId,
  })
  const b = value(
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
  expect(b.status).toBe('READY')
  value(await berths.confirm({ context: b.context, payload: { previewId: b.previewId } }))
  expect(all()[0].endpoint.berthName).toBe('Molo nuovo')
  expect(stays()[0].visits[0].stays[0]).toMatchObject({
    id: first.visits[0].stays[0].id,
    berthVersionId: all()[0].endpoint.berthVersionId,
  })
  expect(all()[0].charge).toEqual(entry.charge)
  expect(
    value(
      await vessels.preview({
        context: context(),
        payload: { operation: 'DELETE_VESSEL', vesselId },
      }),
    ).status,
  ).toBe('BLOCKED')
  expect(
    value(
      await berths.preview({ context: context(), payload: { operation: 'DELETE_BERTH', berthId } }),
    ).status,
  ).toBe('BLOCKED')
  expect(value(await ports.previewDelete({ context: context(), payload: { portId } })).status).toBe(
    'BLOCKED',
  )
})
it('rollback dopo scritture parziali e metadati; anteprima consumata soltanto dopo commit', async () => {
  const p = value(await preview()),
    before = context(),
    metadata = db().metadata()
  sql().exec(
    "CREATE TRIGGER fail_stay BEFORE INSERT ON berth_stays BEGIN SELECT RAISE(ABORT,'injected'); END",
  )
  expect(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual([])
  expect(stays()).toEqual([])
  expect(context()).toEqual(before)
  expect(db().metadata()).toEqual(metadata)
  sql().exec('DROP TRIGGER fail_stay')
  value(await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  expect(
    await operations.confirmCreate({ context: context(), payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
})
it('ricalcolo tariffario e anagrafico atomici anche dopo scritture parziali', async () => {
  await create()
  const before = context(),
    saved = all(),
    first = stays()
  const p = value(
    await tariffs.previewCreate({
      context: context(),
      payload: { portId, moment: moment('2026-06-01T00:00'), configurations: config('200') },
    }),
  )
  sql().exec(
    "CREATE TRIGGER fail_calc BEFORE UPDATE ON operation_charges BEGIN SELECT RAISE(ABORT,'injected'); END",
  )
  expect(
    (await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } })).ok,
  ).toBe(false)
  expect(all()).toEqual(saved)
  expect(stays()).toEqual(first)
  expect(context()).toEqual(before)
  expect(
    value(
      await tariffs.list({
        context: { sessionId: context().sessionId },
        query: { portId, page: 1, pageSize: 25 },
      }),
    ).total,
  ).toBe(1)
  const v = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'UPDATE_VERSION',
        vesselId,
        versionId: saved[0].vesselVersionId,
        registeredName: 'Cambia',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 2500,
        moment: null,
      },
    }),
  )
  expect(
    (await vessels.confirm({ context: v.context, payload: { previewId: v.previewId } })).ok,
  ).toBe(false)
  expect(all()).toEqual(saved)
  expect(context()).toEqual(before)
  sql().exec('DROP TRIGGER fail_calc')
  value(await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
})
it('contesto originale, scadenza, namespace, campi inattesi e sessioni anche Salva con nome', async () => {
  const p = value(await preview()),
    before = context()
  expect(
    await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  expect(
    await preview({ ...input(), zoneId: 'UTC' } as unknown as CreateOperationDto),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(await preview({ ...input(), manualOverrideAmount: '0.001' })).toMatchObject(
    failure('VALIDATION_ERROR'),
  )
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(p.expiresAtUtc))
  expect(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  clock.mockRestore()
  expect(context()).toEqual(before)
  const q = value(await preview())
  await tariff('2026-08-01T00:00', '200')
  expect(
    await operations.confirmCreate({ context: q.context, payload: { previewId: q.previewId } }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  const stale = context()
  await archives.saveAs(join(folder, 'copy.ormeggi'), stale)
  expect(
    await operations.list({
      context: { sessionId: stale.sessionId },
      query: { vesselId, page: 1, pageSize: 25 },
    }),
  ).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  expect(
    await operations.confirmCreate({ context: stale, payload: { previewId: q.previewId } }),
  ).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
})
it('vincoli SQLite reali: riferimenti composti, unicità minuti, importi esatti e rollback revisione', async () => {
  const op = await create({ ...input(), manualOverrideAmount: '92233720368547758.07' }),
    before = context()
  expect(op.charge.effectiveBase).toBe('92233720368547758.07')
  for (const [column, value] of [
    ['effective_base_cents', -1],
    ['manual_override_cents', -1],
    ['tariff_id', 'absent'],
    ['bracket_id', 'absent'],
  ] as const)
    expect(() =>
      sql().prepare(`UPDATE operation_charges SET ${column}=? WHERE id=?`).run(value, op.charge.id),
    ).toThrow()
  expect(() =>
    sql()
      .prepare('UPDATE operation_endpoints SET berth_version_id=NULL WHERE id=?')
      .run(op.endpoint.id),
  ).toThrow()
  expect(() =>
    sql().prepare('DELETE FROM vessel_versions WHERE id=?').run(op.vesselVersionId),
  ).toThrow()
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(context()).toEqual(before)
})

it('uscita: collisione sul minuto di entrata e scelta esplicita anche se una sola occorrenza ha contesto', async () => {
  await create({
    ...input('ENTRY', '2026-10-25T02:45'),
    moment: moment('2026-10-25T02:45', '+02:00'),
  })
  expect(
    await preview({
      ...input('EXIT', '2026-10-25T02:45'),
      moment: moment('2026-10-25T02:45', '+02:00'),
    }),
  ).toMatchObject(failure('OPERATION_MINUTE_CONFLICT'))
  const q = {
    operationType: 'EXIT' as const,
    vesselId,
    interpretationPortId: null,
    moment: moment('2026-10-25T02:30'),
  }
  expect(
    value(await operations.resolveMoment({ context: { sessionId: context().sessionId }, query: q }))
      .resolution.status,
  ).toBe('CHOICE_REQUIRED')
  expect(await preview(input('EXIT', '2026-10-25T02:30'))).toMatchObject(
    failure('LOCAL_TIME_AMBIGUOUS'),
  )
  expect(
    await preview({
      ...input('EXIT', '2026-10-25T02:30'),
      moment: moment('2026-10-25T02:30', '+02:00'),
    }),
  ).toMatchObject(failure('OPERATIONAL_CONTEXT_MISSING'))
  expect(
    (
      await create({
        ...input('EXIT', '2026-10-25T02:30'),
        moment: moment('2026-10-25T02:30', '+01:00'),
      })
    ).endpoint.moment.utc,
  ).toBe('2026-10-25T01:30:00.000Z')
})

it('uscita: il porto di interpretazione disambigua soltanto contesti ammessi dalla cronologia', async () => {
  await create(input('ENTRY', '2026-05-01T10:00'))
  await create(input('EXIT', '2026-05-01T12:00'))
  const ny = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'New York',
        locality: 'NY',
        countryCode: 'US',
        initialZoneId: 'America/New_York',
      },
    }),
  ).id
  await tariff('2026-01-01T00:00', '100', ny)
  await create({
    ...input('ENTRY', '2026-05-01T06:01'),
    operationType: 'ENTRY',
    portId: ny,
    berthId: null,
  })
  const query = {
    operationType: 'EXIT' as const,
    vesselId,
    interpretationPortId: null as string | null,
    moment: moment('2026-05-01T11:00'),
  }
  expect(
    await operations.resolveMoment({ context: { sessionId: context().sessionId }, query }),
  ).toMatchObject(failure('OPERATIONAL_CONTEXT_AMBIGUOUS'))
  expect(
    value(
      await operations.resolveMoment({
        context: { sessionId: context().sessionId },
        query: { ...query, interpretationPortId: ny },
      }),
    ),
  ).toMatchObject({ portId: ny, resolution: { moment: { utc: '2026-05-01T15:00:00.000Z' } } })
  expect(
    await operations.resolveMoment({
      context: { sessionId: context().sessionId },
      query: { ...query, interpretationPortId: ny, moment: moment('2026-04-01T11:00') },
    }),
  ).toMatchObject(failure('OPERATIONAL_CONTEXT_MISSING'))
})

it('tutti gli effetti tariffari sono paginati, ma la conferma ricalcola l’insieme completo', async () => {
  for (let i = 0; i < 53; i++)
    await create(input('ENTRY', `2026-06-01T12:${String(i).padStart(2, '0')}`, 'MISSED'))
  const before = context(),
    p = value(
      await tariffs.previewCreate({
        context: context(),
        payload: { portId, moment: moment('2026-06-01T00:00'), configurations: config('200') },
      }),
    )
  expect(p.summary.recalculated).toBe(53)
  expect(p.effects.total).toBe(55)
  expect(p.effects.items).toHaveLength(50)
  const second = value(
    await tariffs.previewEffects({
      context: { sessionId: context().sessionId },
      query: { previewId: p.previewId, page: 2, pageSize: 50 },
    }),
  )
  expect(second.effects.items).toHaveLength(5)
  expect(context()).toEqual(before)
  value(await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  expect(all().every((o) => o.charge.calculation.base === '215.00')).toBe(true)
  expect(stays()).toEqual([])
})

it('un errore nell’aggiornamento metadati annulla anche attività e identità derivate', async () => {
  const p = value(await preview()),
    before = context()
  sql().exec(
    "CREATE TRIGGER fail_metadata BEFORE UPDATE ON archive_metadata BEGIN SELECT RAISE(ABORT,'injected'); END",
  )
  expect(
    (await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
      .ok,
  ).toBe(false)
  expect(all()).toEqual([])
  expect(stays()).toEqual([])
  expect(context()).toEqual(before)
  sql().exec('DROP TRIGGER fail_metadata')
  value(await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  for (const [kind, id] of [
    ['VOYAGE', stays()[0].id],
    ['PORT_CALL', stays()[0].visits[0].id],
    ['BERTH_STAY', stays()[0].visits[0].stays[0].id],
  ] as const)
    expect(p.effects.items.find((e) => e.reference.kind === kind)?.reference.id).toBe(id)
})
