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
import { operationReplay } from '../../src/backend/application/operations/operation-replay'
import { replayOperations } from '../../src/backend/domain/operations/replay'
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
  expect(entry.charges[0]).toMatchObject({
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
  expect(missed.charges[0]).toMatchObject({
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
  expect(p.effects.items.some((e) => e.reference.id === a.charges[0].id)).toBe(true)
  value(await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  const saved = all()
  expect(saved[0]).toEqual(initial)
  expect(saved[2]).toEqual(b)
  expect(saved[1].charges[0]).toMatchObject({
    id: a.charges[0].id,
    manualOverrideAmount: '0.00',
    effectiveBase: '0.00',
    calculation: { base: '215.00' },
  })
  expect(saved[2].charges[0].calculation.tariffId).toBe(next.id)
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
  expect(all()[1].charges[0]).toMatchObject({
    id: exit.charges[0].id,
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
  expect(all()[0].charges[0]).toEqual(entry.charges[0])
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
  expect(op.charges[0].effectiveBase).toBe('92233720368547758.07')
  for (const [column, value] of [
    ['effective_base_cents', -1],
    ['manual_override_cents', -1],
    ['tariff_id', 'absent'],
    ['bracket_id', 'absent'],
  ] as const)
    expect(() =>
      sql()
        .prepare(`UPDATE operation_charges SET ${column}=? WHERE id=?`)
        .run(value, op.charges[0].id),
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
  expect(all().every((o) => o.charges[0].calculation.base === '215.00')).toBe(true)
  expect(stays()).toEqual([])
}, 20_000)

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

function movement(
  departure = '2026-06-02T12:00',
  arrival = '2026-06-02T13:00',
  status: CreateOperationDto['executionStatus'] = 'PLANNED',
): Extract<CreateOperationDto, { operationType: 'MOVEMENT' }> {
  return {
    vesselId,
    operationType: 'MOVEMENT',
    interpretationPortId: null,
    moment: moment(departure),
    arrivalMoment: moment(arrival),
    destinationPortId: portId,
    destinationBerthId: null,
    executionStatus: status,
    notes: null,
    manualOverrideAmount: null,
  }
}
const contextAt = async (instant: string) =>
  value(
    await operations.contextAt({
      context: { sessionId: context().sessionId },
      query: { vesselId, instant },
    }),
  )
it('P11: partenza origine, arrivo destinazione, intervallo aperto senza ormeggio; identità e persistenza', async () => {
  const entry = await create(),
    first = stays()[0],
    old = first.visits[0].stays[0]
  const p = value(await preview(movement()))
  expect(p.summary).toMatchObject({ created: 3, updated: 1 })
  expect(p.operationValues.endpoint).toMatchObject({ role: 'DEPARTURE', portId, berthId })
  expect(p.operationValues.arrival).toMatchObject({ role: 'ARRIVAL', portId, berthId: null })
  const proposed = p.effects.items.find(
    (e) => e.action === 'CREATE' && e.reference.kind === 'BERTH_STAY',
  )!.reference.id
  const before = context()
  const move = value(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(BigInt(context().revision)).toBe(BigInt(before.revision) + 1n)
  const current = stays()[0],
    visit = current.visits[0]
  expect(current.id).toBe(first.id)
  expect(current.endedAt).toBeNull()
  expect(visit.id).toBe(first.visits[0].id)
  expect(visit.stays).toHaveLength(2)
  expect(visit.stays[1]).toMatchObject({
    id: old.id,
    endedAt: move.endpoint.moment.utc,
    closingOperationId: move.id,
  })
  expect(visit.stays[0]).toMatchObject({
    id: proposed,
    startedAt: move.arrival!.moment.utc,
    openingOperationId: move.id,
    berthId: null,
  })
  const base = { voyageId: first.id, portCallId: visit.id, portId }
  expect(await contextAt(entry.endpoint.moment.utc)).toMatchObject({
    ...base,
    status: 'IN_PORT',
    berthStayId: old.id,
  })
  expect(await contextAt(move.endpoint.moment.utc)).toMatchObject({
    ...base,
    status: 'IN_PORT',
    berthStayId: old.id,
    berthId,
  })
  expect(await contextAt('2026-06-02T10:30:00.000Z')).toEqual({
    ...base,
    status: 'IN_TRANSFER',
    berthStayId: null,
    berthId: null,
  })
  expect(await contextAt(move.arrival!.moment.utc)).toMatchObject({
    ...base,
    status: 'IN_PORT',
    berthStayId: proposed,
    berthId: null,
  })
  const exit = await create(input('EXIT', '2026-06-03T12:00'))
  expect(exit.endpoint.berthId).toBeNull()
  expect(await contextAt(exit.endpoint.moment.utc)).toMatchObject({
    status: 'IN_PORT',
    berthStayId: proposed,
  })
  expect(await contextAt('2026-06-03T10:01:00.000Z')).toMatchObject({ status: 'OUTSIDE' })
  const saved = all(),
    hierarchy = stays(),
    revision = context().revision
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(all()).toEqual(saved)
  expect(stays()).toEqual(hierarchy)
  expect(context().revision).toBe(revision)
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(sql().pragma('integrity_check', { simple: true })).toBe('ok')
})
it('P11: due ormeggi consecutivi senza banchina restano distinti, anche in una visita già chiusa', async () => {
  await create({ ...input(), operationType: 'ENTRY', portId, berthId: null })
  await create(input('EXIT', '2026-06-04T12:00'))
  const first = stays()[0]
  const move = await create(movement())
  const current = stays()[0]
  expect(current.id).toBe(first.id)
  expect(current.visits[0].id).toBe(first.visits[0].id)
  expect(current.visits[0].stays).toHaveLength(2)
  expect(new Set(current.visits[0].stays.map((b) => b.id)).size).toBe(2)
  expect(current.visits[0].stays.map((b) => b.berthId)).toEqual([null, null])
  expect(current.visits[0].stays[0]).toMatchObject({
    openingOperationId: move.id,
    closingOperationId: first.closingOperationId,
    endedAt: first.endedAt,
  })
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('P11: MISSED conserva origine e calcolo, non trasferisce e non fornisce un contesto successivo', async () => {
  expect(await preview(movement(undefined, undefined, 'MISSED'))).toMatchObject(
    failure('OPERATIONAL_CONTEXT_MISSING'),
  )
  await create()
  const first = stays()
  const missed = await create({
    ...movement(undefined, undefined, 'MISSED'),
    manualOverrideAmount: '0.00',
  })
  expect(stays()).toEqual(first)
  expect(missed.charges[0]).toMatchObject({
    chargeKind: 'MOVEMENT',
    economicEndpointRole: 'DEPARTURE',
    calculation: { base: '115.00' },
    manualOverrideAmount: '0.00',
    effectiveBase: '0.00',
  })
  expect(await contextAt('2026-06-02T10:30:00.000Z')).toMatchObject({ status: 'IN_PORT', berthId })
  expect((await create(input('EXIT', '2026-06-02T12:30', 'MISSED'))).endpoint.berthId).toBe(berthId)
  expect(stays()).toEqual(first)
  await create(input('EXIT', '2026-06-03T12:00'))
})
it('P11: tutti gli estremi, inclusi MISSED, partecipano alle collisioni e alla sequenza completa', async () => {
  await create()
  await create(movement())
  for (const status of ['PLANNED', 'PERFORMED', 'MISSED'] as const) {
    expect(await preview(movement('2026-06-02T12:30', '2026-06-02T14:00', status))).toMatchObject(
      failure('OPERATIONAL_CONTEXT_MISSING'),
    )
    expect(await preview(input('EXIT', '2026-06-02T12:30', status))).toMatchObject(
      failure('OPERATIONAL_CONTEXT_MISSING'),
    )
    expect(await preview(input('ENTRY', '2026-06-02T12:30', status))).toMatchObject(
      failure('OPERATIONAL_CONTEXT_MISSING'),
    )
    expect(await preview(movement('2026-06-02T13:00', '2026-06-02T14:00', status))).toMatchObject(
      failure('OPERATION_MINUTE_CONFLICT'),
    )
    expect(await preview(movement('2026-06-02T11:00', '2026-06-02T12:00', status))).toMatchObject(
      failure('OPERATION_MINUTE_CONFLICT'),
    )
  }
  await create(movement('2026-06-03T12:00', '2026-06-03T13:00', 'MISSED'))
  expect(await preview(movement('2026-06-03T11:00', '2026-06-03T14:00'))).toMatchObject(
    failure('OPERATIONAL_CONTEXT_MISSING'),
  )
  expect(await preview(movement('2026-06-03T11:00', '2026-06-03T13:00', 'MISSED'))).toMatchObject(
    failure('OPERATION_MINUTE_CONFLICT'),
  )
})
it('P11: vincoli UTC stretti, gap e overlap indipendenti, ordine locale invertito valido', async () => {
  await create({
    ...input('ENTRY', '2026-02-01T12:00'),
    operationType: 'ENTRY',
    portId,
    berthId: null,
  })
  for (const status of ['PLANNED', 'PERFORMED', 'MISSED'] as const)
    for (const at of ['2026-06-02T12:00', '2026-06-02T11:59'])
      expect(await preview(movement('2026-06-02T12:00', at, status))).toMatchObject(
        failure('OPERATION_TIME_INVALID'),
      )
  expect(await preview(movement('2026-03-29T01:30', '2026-03-29T02:30'))).toMatchObject(
    failure('LOCAL_TIME_NOT_EXISTENT'),
  )
  const m = movement('2026-10-25T02:45', '2026-10-25T02:15')
  expect(await preview(m)).toMatchObject(failure('LOCAL_TIME_AMBIGUOUS'))
  expect(await preview({ ...m, moment: moment('2026-10-25T02:45', '+02:00') })).toMatchObject(
    failure('LOCAL_TIME_AMBIGUOUS'),
  )
  const result = await create({
    ...m,
    moment: moment('2026-10-25T02:45', '+02:00'),
    arrivalMoment: moment('2026-10-25T02:15', '+01:00'),
  })
  expect(result.endpoint.moment.utc).toBe('2026-10-25T00:45:00.000Z')
  expect(result.arrival!.moment.utc).toBe('2026-10-25T01:15:00.000Z')
  expect(
    await preview({
      ...movement('2026-10-26T12:00', '2026-10-26T13:00'),
      arrivalMoment: moment('2026-10-26T13:00', '+02:00'),
    }),
  ).toMatchObject(failure('INVALID_OFFSET'))
})
it('P11: destinazione esplicita nello stesso porto e selezionabile anche MISSED, origine storica conservata', async () => {
  const other = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Altro',
        locality: 'Altro',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  ).id
  const foreign = value(
    await berths.create({ context: context(), payload: { portId: other, name: 'Altro molo' } }),
  ).id
  await create()
  for (const status of ['PLANNED', 'MISSED'] as const) {
    expect(
      await preview({ ...movement(undefined, undefined, status), destinationPortId: other }),
    ).toMatchObject(failure('TARIFF_NOT_FOUND'))
    expect(
      await preview({ ...movement(undefined, undefined, status), destinationBerthId: foreign }),
    ).toMatchObject(failure('NOT_SELECTABLE'))
  }
  sql().prepare("UPDATE berths SET status='INACTIVE' WHERE id=?").run(berthId)
  expect(await preview({ ...movement(), destinationBerthId: berthId })).toMatchObject(
    failure('NOT_SELECTABLE'),
  )
  const move = await create(movement())
  expect(move.endpoint.berthId).toBe(berthId)
  sql().prepare("UPDATE ports SET status='INACTIVE' WHERE id=?").run(portId)
  expect(await preview(movement('2026-06-03T12:00', '2026-06-03T13:00', 'MISSED'))).toMatchObject(
    failure('NOT_SELECTABLE'),
  )
})
it('P11: tariffa, peso e versione nave alla sola partenza; ricalcoli atomici e override conservato', async () => {
  await create()
  await tariff('2026-06-02T12:30', '200')
  sql().exec(
    "UPDATE weight_versions SET weight='1.5' WHERE sequence_id=(SELECT id FROM weight_sequences WHERE operation_type='MOVEMENT')",
  )
  const move = await create({ ...movement(), manualOverrideAmount: '0.00' })
  expect(move.charges[0].calculation).toMatchObject({
    base: '172.50',
    weight: '1.5',
    ordinaryValue: '100',
    moment: move.endpoint.moment,
  })
  const p = value(
    await tariffs.previewCreate({
      context: context(),
      payload: { portId, moment: moment('2026-06-02T11:00'), configurations: config('300') },
    }),
  )
  expect(p.summary.recalculated).toBe(1)
  const saved = all(),
    before = context()
  sql().exec(
    "CREATE TRIGGER fail_movement_charge BEFORE UPDATE ON operation_charges BEGIN SELECT RAISE(ABORT,'injected'); END",
  )
  expect(
    (await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } })).ok,
  ).toBe(false)
  expect(all()).toEqual(saved)
  expect(context()).toEqual(before)
  sql().exec('DROP TRIGGER fail_movement_charge')
  value(await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  const updated = all()[1]
  expect(updated.charges[0]).toMatchObject({
    id: move.charges[0].id,
    manualOverrideAmount: '0.00',
    effectiveBase: '0.00',
    calculation: { base: '472.50' },
  })
  expect(updated.arrival).toEqual(move.arrival)
})
it('P11: anagrafiche ai due estremi, nuove versioni durante il trasferimento e eliminazione senza riferimenti obsoleti', async () => {
  await create()
  await new TimeService(archives.coordinator).configureCompanyZone({
    context: context(),
    payload: { zoneId: 'Europe/Rome' },
  })
  const move = await create({ ...movement(), destinationBerthId: berthId }),
    first = stays()[0]
  const p = value(
    await ports.previewInsertVersion({
      context: context(),
      payload: {
        portId,
        name: 'Nuovo porto',
        locality: 'Genova',
        countryCode: 'IT',
        moment: moment('2026-06-02T12:30'),
      },
    }),
  )
  expect(
    p.effects.items.some(
      (e) => e.reference.id === move.id && e.reference.label.includes('ARRIVAL'),
    ),
  ).toBe(true)
  value(
    await ports.confirmInsertVersion({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(all()[1].endpoint).toEqual(move.endpoint)
  expect(all()[1].arrival!.portName).toBe('Nuovo porto')
  const b = value(
    await berths.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        berthId,
        name: 'Nuovo molo',
        moment: moment('2026-06-02T12:30'),
      },
    }),
  )
  value(await berths.confirm({ context: b.context, payload: { previewId: b.previewId } }))
  expect(all()[1].endpoint.berthName).toBe('Molo')
  expect(all()[1].arrival!.berthName).toBe('Nuovo molo')
  expect(stays()[0].visits[0].stays[0].berthVersionId).toBe(all()[1].arrival!.berthVersionId)
  const v = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        registeredName: 'Nave nuova',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 5000,
        moment: moment('2026-06-02T12:30'),
      },
    }),
  )
  expect(v.summary.recalculated).toBe(0)
  value(await vessels.confirm({ context: v.context, payload: { previewId: v.previewId } }))
  expect(all()[1].endpoint.vesselVersionId).toBe(move.endpoint.vesselVersionId)
  expect(all()[1].arrival!.vesselVersionId).not.toBe(move.arrival!.vesselVersionId)
  expect(all()[1].charges[0]).toEqual(move.charges[0])
  const del = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'DELETE_VERSION',
        vesselId,
        versionId: all()[1].arrival!.vesselVersionId,
      },
    }),
  )
  expect(del.status).toBe('READY')
  value(await vessels.confirm({ context: del.context, payload: { previewId: del.previewId } }))
  expect(all()[1].arrival!.vesselVersionId).toBe(move.arrival!.vesselVersionId)
  expect(stays()[0].id).toBe(first.id)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('P11: rollback dopo chiusura origine e inserimento destinazione; retry della stessa anteprima', async () => {
  await create()
  const p = value(await preview(movement())),
    saved = all(),
    hierarchy = stays(),
    before = context(),
    metadata = db().metadata()
  sql().exec(
    "CREATE TRIGGER fail_destination BEFORE INSERT ON berth_stays BEGIN SELECT RAISE(ABORT,'injected'); END",
  )
  expect(
    (await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
      .ok,
  ).toBe(false)
  expect(all()).toEqual(saved)
  expect(stays()).toEqual(hierarchy)
  expect(context()).toEqual(before)
  expect(db().metadata()).toEqual(metadata)
  sql().exec('DROP TRIGGER fail_destination')
  value(await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  expect(stays()[0].visits[0].stays).toHaveLength(2)
})
it('P11: IPC diretto rifiuta campi inattesi, contesto scaduto e query invalide senza scritture', async () => {
  await create()
  for (const extra of [
    { originPortId: portId },
    { arrivalMoment: { ...moment('2026-06-02T13:00'), utc: '2026-06-02T11:00:00.000Z' } },
    { destinationBerthId: undefined },
  ])
    expect(
      await preview({ ...movement(), ...extra } as unknown as CreateOperationDto),
    ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await operations.contextAt({
      context: { sessionId: context().sessionId },
      query: { vesselId, instant: '2026-02-30T00:00:00.000Z' },
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  const p = value(await preview(movement()))
  await create(input('EXIT', '2026-06-05T12:00', 'MISSED'))
  expect(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
})

it('P11: MISSED non introduce trasferimenti neppure oltre una successiva uscita; ricalcolo della sola base teorica', async () => {
  await create()
  const missed = await create({
    ...movement('2026-06-02T12:00', '2026-06-05T13:00', 'MISSED'),
    manualOverrideAmount: '7.25',
  })
  await create(input('EXIT', '2026-06-03T12:00'))
  const hierarchy = stays()
  expect(await contextAt('2026-06-04T10:30:00.000Z')).toMatchObject({ status: 'OUTSIDE' })
  const p = value(
    await tariffs.previewCreate({
      context: context(),
      payload: { portId, moment: moment('2026-06-02T11:00'), configurations: config('200') },
    }),
  )
  expect(p.summary.recalculated).toBe(2)
  value(await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  expect(all()[1].charges[0]).toMatchObject({
    id: missed.charges[0].id,
    manualOverrideAmount: '7.25',
    effectiveBase: '7.25',
    calculation: { base: '215.00' },
  })
  expect(stays()).toEqual(hierarchy)
})
it('P11: rollback degli impatti di arrivo e cancellazione versioni porto/banchina senza alterare tuple o identità', async () => {
  await create()
  const move = await create({ ...movement(), destinationBerthId: berthId })
  const port = value(
    await ports.previewInsertVersion({
      context: context(),
      payload: {
        portId,
        name: 'Porto arrivo',
        locality: 'Genova',
        countryCode: 'IT',
        moment: moment('2026-06-02T12:30'),
      },
    }),
  )
  const before = context(),
    saved = all(),
    hierarchy = stays()
  sql().exec(
    "CREATE TRIGGER fail_arrival BEFORE UPDATE ON operation_endpoints WHEN OLD.role='ARRIVAL' BEGIN SELECT RAISE(ABORT,'injected'); END",
  )
  expect(
    (
      await ports.confirmInsertVersion({
        context: port.context,
        payload: { previewId: port.previewId },
      })
    ).ok,
  ).toBe(false)
  expect(all()).toEqual(saved)
  expect(stays()).toEqual(hierarchy)
  expect(context()).toEqual(before)
  sql().exec('DROP TRIGGER fail_arrival')
  value(
    await ports.confirmInsertVersion({
      context: port.context,
      payload: { previewId: port.previewId },
    }),
  )
  const pv = all()[1].arrival!.portVersionId
  expect(all()[1].arrival!.moment).toEqual(move.arrival!.moment)
  const dp = value(
    await ports.previewDeleteVersion({ context: context(), payload: { portId, versionId: pv } }),
  )
  expect(dp.status).toBe('READY')
  value(
    await ports.confirmDeleteVersion({ context: dp.context, payload: { previewId: dp.previewId } }),
  )
  expect(all()[1]).toEqual(move)
  const berth = value(
    await berths.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        berthId,
        name: 'Molo arrivo',
        moment: moment('2026-06-02T12:30'),
      },
    }),
  )
  value(await berths.confirm({ context: berth.context, payload: { previewId: berth.previewId } }))
  const dbv = value(
    await berths.preview({
      context: context(),
      payload: {
        operation: 'DELETE_VERSION',
        berthId,
        versionId: all()[1].arrival!.berthVersionId!,
      },
    }),
  )
  expect(dbv.status).toBe('READY')
  value(await berths.confirm({ context: dbv.context, payload: { previewId: dbv.previewId } }))
  expect(all()[1]).toEqual(move)
  expect(stays()).toEqual(hierarchy)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('P11: SQLite protegge ruoli, ordine dei due estremi, minuto UTC e provenienza della componente', async () => {
  await create()
  const move = await create(movement()),
    saved = all()
  expect(() =>
    sql()
      .prepare("UPDATE operation_endpoints SET role='OCCURRENCE' WHERE id=?")
      .run(move.arrival!.id),
  ).toThrow()
  expect(() =>
    sql()
      .prepare('UPDATE operation_endpoints SET utc=? WHERE id=?')
      .run(move.endpoint.moment.utc, move.arrival!.id),
  ).toThrow()
  expect(() =>
    sql()
      .prepare("UPDATE operation_charges SET economic_endpoint_role='OCCURRENCE' WHERE id=?")
      .run(move.charges[0].id),
  ).toThrow()
  expect(() =>
    sql()
      .prepare("UPDATE operation_charges SET charge_kind='EXIT' WHERE id=?")
      .run(move.charges[0].id),
  ).toThrow()
  expect(() =>
    sql()
      .prepare('UPDATE operation_charges SET effective_base_cents=0 WHERE id=?')
      .run(move.charges[0].id),
  ).toThrow()
  expect(all()).toEqual(saved)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

async function destination(zone = 'Europe/London', withTariff = true) {
  const id = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Destinazione',
        locality: 'Londra',
        countryCode: 'GB',
        initialZoneId: zone,
      },
    }),
  ).id
  if (withTariff) await tariff('2026-01-01T00:00', '200', id)
  return id
}
const transfer = (
  destinationPortId: string,
  status: CreateOperationDto['executionStatus'] = 'PLANNED',
): Extract<CreateOperationDto, { operationType: 'MOVEMENT' }> => ({
  ...movement('2026-06-02T12:00', '2026-06-02T11:30', status),
  destinationPortId,
})
it('P12: fusi e decorrenze distinti, due calcoli/override autonomi, viaggio conservato e contesto senza visita', async () => {
  const dest = await destination()
  await new TimeService(archives.coordinator).configureCompanyZone({
    context: context(),
    payload: { zoneId: 'Europe/Rome' },
  })
  sql().exec(
    "UPDATE weight_versions SET weight='2' WHERE sequence_id IN (SELECT id FROM weight_sequences WHERE operation_type='EXIT'); UPDATE weight_versions SET weight='3' WHERE sequence_id IN (SELECT id FROM weight_sequences WHERE operation_type='ENTRY')",
  )
  await create()
  const first = stays()[0]
  const arrivalTariff = await tariff('2026-06-02T11:15', '250', dest)
  const vp = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        registeredName: 'Versione arrivo',
        imoNumber: null,
        vesselTypeId: 'PASSENGER',
        size: 1000,
        moment: moment('2026-06-02T12:15'),
      },
    }),
  )
  value(await vessels.confirm({ context: vp.context, payload: { previewId: vp.previewId } }))
  const p = value(
    await preview({
      ...transfer(dest),
      manualOverrideAmount: '0.00',
      arrivalManualOverrideAmount: '7.25',
    }),
  )
  expect(p.summary).toMatchObject({ created: 5, updated: 2 })
  expect(p.operationValues.charges).toHaveLength(2)
  const move = value(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(move).toEqual(p.operationValues)
  expect(move.charges[0]).toMatchObject({
    chargeKind: 'EXIT',
    economicEndpointRole: 'DEPARTURE',
    manualOverrideAmount: '0.00',
    effectiveBase: '0.00',
    calculation: { portId, weight: '2', base: '230.00', size: 2100 },
  })
  expect(move.charges[1]).toMatchObject({
    chargeKind: 'ENTRY',
    economicEndpointRole: 'ARRIVAL',
    manualOverrideAmount: '7.25',
    effectiveBase: '7.25',
    calculation: {
      portId: dest,
      weight: '3',
      base: '750.00',
      tariffId: arrivalTariff.id,
      size: 1000,
      vesselTypeId: 'PASSENGER',
    },
  })
  expect(move.totalBase).toBe('7.25')
  expect(move.charges[0].id).not.toBe(move.charges[1].id)
  expect(move.arrival!.moment.utc).toBe('2026-06-02T10:30:00.000Z')
  const graph = stays()[0]
  expect(graph.id).toBe(first.id)
  expect(graph.endedAt).toBeNull()
  expect(graph.visits).toHaveLength(2)
  expect(graph.visits[1]).toMatchObject({
    id: first.visits[0].id,
    endedAt: move.endpoint.moment.utc,
    closingOperationId: move.id,
  })
  expect(graph.visits[0]).toMatchObject({
    portId: dest,
    startedAt: move.arrival!.moment.utc,
    openingOperationId: move.id,
  })
  const ctx = (instant: string) => new OperationRepository(db()).contextAt(vesselId, instant)
  expect(ctx(move.endpoint.moment.utc)).toMatchObject({
    status: 'IN_PORT',
    portId,
    portCallId: first.visits[0].id,
  })
  expect(ctx('2026-06-02T10:15:00.000Z')).toEqual({
    status: 'IN_TRANSFER',
    voyageId: first.id,
    portCallId: null,
    berthStayId: null,
    portId: null,
    berthId: null,
  })
  expect(ctx(move.arrival!.moment.utc)).toMatchObject({
    status: 'IN_PORT',
    portId: dest,
    portCallId: graph.visits[0].id,
  })
  const exit = await create(input('EXIT', '2026-06-02T12:00', 'PERFORMED'))
  expect(exit.endpoint.portId).toBe(dest)
  expect(stays()[0].closingOperationId).toBe(exit.id)
  expect(stays()[0].visits[0].closingOperationId).toBe(exit.id)
  expect(stays()[0].visits[1].closingOperationId).toBe(move.id)
  const saved = all(),
    hierarchy = stays(),
    revision = context().revision
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(all()).toEqual(saved)
  expect(stays()).toEqual(hierarchy)
  expect(context().revision).toBe(revision)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('P12: MISSED occupa entrambi gli estremi ma non cambia porto o struttura, anche oltre l’uscita', async () => {
  const dest = await destination()
  await create()
  const first = stays()
  const m = await create({
    ...transfer(dest, 'MISSED'),
    arrivalMoment: moment('2026-06-05T11:00'),
    arrivalManualOverrideAmount: '0.00',
  })
  expect(m.charges).toHaveLength(2)
  expect(stays()).toEqual(first)
  expect(m.charges[1].effectiveBase).toBe('0.00')
  expect(
    await preview({
      ...transfer(dest, 'MISSED'),
      moment: moment('2026-06-03T12:00'),
      arrivalMoment: moment('2026-06-05T11:00'),
    }),
  ).toMatchObject(failure('OPERATION_MINUTE_CONFLICT'))
  const exit = await create(input('EXIT', '2026-06-03T12:00'))
  expect(exit.endpoint.portId).toBe(portId)
  expect(new OperationRepository(db()).contextAt(vesselId, '2026-06-04T12:00:00.000Z').status).toBe(
    'OUTSIDE',
  )
})
it('P12: gap e overlap dei due fusi, ordine UTC e collisioni con MISSED sull’intera sequenza', async () => {
  const dest = await destination()
  await create(input('ENTRY', '2026-03-01T12:00'))
  expect(
    await preview({
      ...transfer(dest),
      moment: moment('2026-03-29T01:00'),
      arrivalMoment: moment('2026-03-29T01:30'),
    }),
  ).toMatchObject(failure('LOCAL_TIME_NOT_EXISTENT'))
  const m = {
    ...transfer(dest),
    moment: moment('2026-10-25T02:45', '+02:00'),
    arrivalMoment: moment('2026-10-25T01:15'),
  }
  expect(await preview(m)).toMatchObject(failure('LOCAL_TIME_AMBIGUOUS'))
  expect(
    await preview({ ...m, arrivalMoment: moment('2026-10-25T01:15', '+01:00') }),
  ).toMatchObject(failure('OPERATION_TIME_INVALID'))
  expect(
    value(await preview({ ...m, arrivalMoment: moment('2026-10-25T01:15', '+00:00') }))
      .operationValues.arrival!.moment.utc,
  ).toBe('2026-10-25T01:15:00.000Z')
  expect(
    await preview({ ...transfer(dest), arrivalMoment: moment('2026-06-02T11:00') }),
  ).toMatchObject(failure('OPERATION_TIME_INVALID'))
  await create(input('EXIT', '2026-06-03T12:00', 'MISSED'))
  expect(await preview(transfer(dest))).toMatchObject(failure('OPERATION_SEQUENCE_INVALID'))
  expect(
    await preview({ ...transfer(dest), arrivalMoment: moment('2026-06-03T11:00') }),
  ).toMatchObject(failure('OPERATION_MINUTE_CONFLICT'))
})
it('P12: entrambi i porti e gli intervalli tariffari ricalcolano solo le componenti pertinenti, rollback e override conservati', async () => {
  const dest = await destination()
  await create()
  const move = await create({
    ...transfer(dest),
    manualOverrideAmount: '0.00',
    arrivalManualOverrideAmount: '12.34',
  })
  const initial = all(),
    metadata = db().metadata(),
    ctx = context()
  const p = value(
    await tariffs.previewCreate({
      context: ctx,
      payload: { portId: dest, moment: moment('2026-06-02T11:15'), configurations: config('300') },
    }),
  )
  expect(p.summary.recalculated).toBe(1)
  expect(p.effects.items.some((e) => e.reference.id === move.charges[1].id)).toBe(true)
  sql().exec(
    "CREATE TRIGGER fail_arrival_recalc BEFORE UPDATE ON operation_charges WHEN OLD.economic_endpoint_role='ARRIVAL' BEGIN SELECT RAISE(ABORT,'injected'); END",
  )
  expect(
    await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject({ ok: false })
  expect(all()).toEqual(initial)
  expect(db().metadata()).toEqual(metadata)
  expect(context()).toEqual(ctx)
  sql().exec('DROP TRIGGER fail_arrival_recalc')
  value(await tariffs.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  expect(all()[1].charges[0]).toEqual(move.charges[0])
  expect(all()[1].charges[1]).toMatchObject({
    id: move.charges[1].id,
    calculation: { base: '315.00' },
    effectiveBase: '12.34',
  })
  const arrival = all()[1].charges[1]
  await tariff('2026-06-02T11:45', '400', portId)
  expect(all()[1].charges[0]).toMatchObject({
    id: move.charges[0].id,
    calculation: { base: '415.00' },
    effectiveBase: '0.00',
  })
  expect(all()[1].charges[1]).toEqual(arrival)
  expect(all()[1].totalBase).toBe('12.34')
})
it('P12: ricalcoli nave ai rispettivi istanti, correzione ed eliminazione con riferimenti e identità conservati', async () => {
  const dest = await destination()
  await create()
  await new TimeService(archives.coordinator).configureCompanyZone({
    context: context(),
    payload: { zoneId: 'Europe/Rome' },
  })
  const move = await create({ ...transfer(dest), arrivalManualOverrideAmount: '0.00' }),
    graph = stays()
  const p = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        vesselId,
        registeredName: 'Arrivo',
        imoNumber: null,
        vesselTypeId: 'ADM',
        size: 5000,
        moment: moment('2026-06-02T12:15'),
      },
    }),
  )
  expect(p.summary.recalculated).toBe(1)
  value(await vessels.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  expect(all()[1].charges[0]).toEqual(move.charges[0])
  const arrival = all()[1].charges[1]
  expect(arrival).toMatchObject({
    id: move.charges[1].id,
    calculation: { vesselTypeId: 'ADM', size: 5000, base: '285.00' },
    effectiveBase: '0.00',
  })
  expect(all()[1].arrival!.vesselVersionId).toBe(arrival.calculation.vesselVersionId)
  const del = value(
    await vessels.preview({
      context: context(),
      payload: {
        operation: 'DELETE_VERSION',
        vesselId,
        versionId: arrival.calculation.vesselVersionId,
      },
    }),
  )
  expect(del.summary.recalculated).toBe(1)
  value(await vessels.confirm({ context: del.context, payload: { previewId: del.previewId } }))
  expect(all()[1]).toEqual(move)
  expect(stays()).toEqual(graph)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('P12: rollback dopo entrambe le componenti e dopo apertura visita; retry della stessa anteprima', async () => {
  const dest = await destination()
  await create()
  const p = value(await preview(transfer(dest))),
    before = all(),
    graph = stays(),
    metadata = db().metadata(),
    ctx = context()
  for (const injection of [
    "CREATE TRIGGER injected_failure BEFORE INSERT ON operation_charges WHEN NEW.economic_endpoint_role='ARRIVAL' BEGIN SELECT RAISE(ABORT,'injected'); END",
    "CREATE TRIGGER injected_failure BEFORE INSERT ON berth_stays BEGIN SELECT RAISE(ABORT,'injected'); END",
  ]) {
    sql().exec(injection)
    expect(
      await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
    ).toMatchObject({ ok: false })
    expect(all()).toEqual(before)
    expect(stays()).toEqual(graph)
    expect(db().metadata()).toEqual(metadata)
    expect(context()).toEqual(ctx)
    expect(sql().pragma('foreign_key_check')).toEqual([])
    sql().exec('DROP TRIGGER injected_failure')
  }
  const saved = value(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(saved).toEqual(p.operationValues)
  expect(BigInt(context().revision)).toBe(BigInt(ctx.revision) + 1n)
})
it('P12: destinazione selezionabile, appartenenza, tariffa obbligatoria e campi manuali validati anche IPC', async () => {
  const dest = await destination('Europe/London', false)
  await create()
  expect(await preview(transfer(dest))).toMatchObject(failure('TARIFF_NOT_FOUND'))
  await tariff('2026-01-01T00:00', '200', dest)
  expect(await preview({ ...transfer(dest), destinationBerthId: berthId })).toMatchObject(
    failure('NOT_SELECTABLE'),
  )
  for (const amount of [undefined, -1, '1.2', '92233720368547758.08'])
    expect(
      await preview({
        ...transfer(dest),
        arrivalManualOverrideAmount: amount,
      } as unknown as CreateOperationDto),
    ).toMatchObject({ ok: false })
  expect(await preview({ ...movement(), arrivalManualOverrideAmount: '0.00' })).toMatchObject(
    failure('VALIDATION_ERROR'),
  )
  sql().prepare("UPDATE ports SET status='INACTIVE' WHERE id=?").run(dest)
  expect(await preview(transfer(dest, 'MISSED'))).toMatchObject(failure('NOT_SELECTABLE'))
  sql().prepare("UPDATE ports SET status='ACTIVE' WHERE id=?").run(dest)
  sql().prepare("UPDATE ports SET status='INACTIVE' WHERE id=?").run(portId)
  sql().prepare("UPDATE berths SET status='INACTIVE' WHERE id=?").run(berthId)
  expect(value(await preview(transfer(dest))).operationValues.endpoint).toMatchObject({
    portId,
    berthId,
  })
})
it('P12: SQLite impedisce componenti duplicate e contesti tariffari/ruoli incoerenti; totale oltre int64 esatto e derivato', async () => {
  const dest = await destination()
  await create()
  const move = await create({
    ...transfer(dest),
    manualOverrideAmount: '92233720368547758.07',
    arrivalManualOverrideAmount: '92233720368547758.07',
  })
  expect(move.totalBase).toBe('184467440737095516.14')
  const charge = move.charges[1]
  for (const [column, val] of [
    ['charge_kind', 'EXIT'],
    ['economic_endpoint_role', 'DEPARTURE'],
    ['tariff_id', move.charges[0].calculation.tariffId],
  ] as const)
    expect(() =>
      sql().prepare(`UPDATE operation_charges SET ${column}=? WHERE id=?`).run(val, charge.id),
    ).toThrow()
  expect(() =>
    sql()
      .prepare(
        'INSERT INTO operation_charges SELECT ?,' +
          (sql().pragma('table_info(operation_charges)') as { name: string }[])
            .slice(1)
            .map((c) => c.name)
            .join(',') +
          ' FROM operation_charges WHERE id=?',
      )
      .run('duplicate', charge.id),
  ).toThrow()
  expect(all()[1]).toEqual(move)
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(sql().pragma('integrity_check', { simple: true })).toBe('ok')
})
it('P12: versioni di porto e banchina di destinazione aggiornano estremo e nuova visita atomicamente', async () => {
  const dest = await destination(),
    berth = value(
      await berths.create({ context: context(), payload: { portId: dest, name: 'Dest' } }),
    ).id
  await create()
  const move = await create({ ...transfer(dest), destinationBerthId: berth }),
    initial = all()
  const p = value(
    await ports.previewInsertVersion({
      context: context(),
      payload: {
        portId: dest,
        name: 'Londra nuova',
        locality: 'Londra',
        countryCode: 'GB',
        moment: moment('2026-06-02T11:15'),
      },
    }),
  )
  expect(p.effects.items.some((e) => e.reference.kind === 'PORT_CALL')).toBe(true)
  const ctx = context(),
    metadata = db().metadata(),
    graph = stays()
  sql().exec(
    "CREATE TRIGGER fail_new_visit BEFORE UPDATE ON port_calls BEGIN SELECT RAISE(ABORT,'injected'); END",
  )
  expect(
    await ports.confirmInsertVersion({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject({ ok: false })
  expect(all()).toEqual(initial)
  expect(stays()).toEqual(graph)
  expect(context()).toEqual(ctx)
  expect(db().metadata()).toEqual(metadata)
  sql().exec('DROP TRIGGER fail_new_visit')
  value(
    await ports.confirmInsertVersion({ context: p.context, payload: { previewId: p.previewId } }),
  )
  expect(all()[1].endpoint).toEqual(move.endpoint)
  expect(stays()[0].visits[0].portVersionId).toBe(all()[1].arrival!.portVersionId)
  const bp = value(
    await berths.preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        berthId: berth,
        name: 'Dest nuova',
        moment: moment('2026-06-02T11:20'),
      },
    }),
  )
  value(await berths.confirm({ context: bp.context, payload: { previewId: bp.previewId } }))
  const updated = all()[1]
  expect(updated.arrival!.berthName).toBe('Dest nuova')
  expect(stays()[0].visits[0].stays[0].berthVersionId).toBe(updated.arrival!.berthVersionId)
  expect(updated.charges).toEqual(move.charges)
  const pd = value(
    await ports.previewDeleteVersion({
      context: context(),
      payload: { portId: dest, versionId: updated.arrival!.portVersionId },
    }),
  )
  value(
    await ports.confirmDeleteVersion({ context: pd.context, payload: { previewId: pd.previewId } }),
  )
  const bd = value(
    await berths.preview({
      context: context(),
      payload: {
        operation: 'DELETE_VERSION',
        berthId: berth,
        versionId: updated.arrival!.berthVersionId!,
      },
    }),
  )
  value(await berths.confirm({ context: bd.context, payload: { previewId: bd.previewId } }))
  expect(all()[1]).toEqual(move)
  expect(stays()).toEqual(graph)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('P12: ritorno a un porto già visitato, ambiguità locale fra porti e nuova visita distinta nello stesso viaggio', async () => {
  const dest = await destination()
  await create()
  const first = stays()[0]
  const moved = await create(transfer(dest))
  const ambiguity = await operations.resolveMoment({
    context: { sessionId: context().sessionId },
    query: {
      operationType: 'EXIT',
      vesselId,
      moment: moment('2026-06-02T11:45'),
      interpretationPortId: null,
    },
  })
  expect(ambiguity).toMatchObject(failure('OPERATIONAL_CONTEXT_AMBIGUOUS'))
  const chosen = value(
    await operations.resolveMoment({
      context: { sessionId: context().sessionId },
      query: {
        operationType: 'EXIT',
        vesselId,
        moment: moment('2026-06-02T11:45'),
        interpretationPortId: dest,
      },
    }),
  )
  expect(chosen.portId).toBe(dest)
  const back = await create({
    ...movement('2026-06-03T12:00', '2026-06-03T13:30'),
    destinationPortId: portId,
    executionStatus: 'PERFORMED',
  })
  expect(back.endpoint.portId).toBe(dest)
  expect(stays()[0].visits).toHaveLength(3)
  expect(stays()[0].id).toBe(first.id)
  expect(stays()[0].visits[2].id).toBe(first.visits[0].id)
  expect(stays()[0].visits[0].id).not.toBe(first.visits[0].id)
  expect(stays()[0].visits[1].openingOperationId).toBe(moved.id)
  const internal = await create(movement('2026-06-04T12:00', '2026-06-04T13:00'))
  expect(internal.charges).toHaveLength(1)
  expect(stays()[0].visits[0].stays).toHaveLength(2)
  await create(input('EXIT', '2026-06-05T12:00'))
  expect(stays()[0].visits.every((v) => v.endedAt !== null)).toBe(true)
  expect(stays()[0].visits[0].openingOperationId).toBe(back.id)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('P12: correzione descrittiva nave ricalcola entrambe le componenti atomicamente senza perdere override e tuple', async () => {
  const dest = await destination()
  await create()
  const move = await create({
    ...transfer(dest),
    manualOverrideAmount: '12.34',
    arrivalManualOverrideAmount: '0.00',
  })
  const before = all(),
    graph = stays(),
    ctx = context(),
    metadata = db().metadata()
  const p = value(
    await vessels.preview({
      context: ctx,
      payload: {
        operation: 'UPDATE_VERSION',
        vesselId,
        versionId: move.endpoint.vesselVersionId,
        moment: null,
        registeredName: 'Correzione',
        imoNumber: null,
        vesselTypeId: 'PASSENGER',
        size: 100,
      },
    }),
  )
  expect(p.summary.recalculated).toBe(3)
  expect(
    p.effects.items.filter((e) => move.charges.some((c) => c.id === e.reference.id)),
  ).toHaveLength(2)
  sql().exec(
    "CREATE TRIGGER fail_second_economy BEFORE UPDATE ON operation_charges WHEN OLD.economic_endpoint_role='ARRIVAL' BEGIN SELECT RAISE(ABORT,'injected'); END",
  )
  expect(
    await vessels.confirm({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject({ ok: false })
  expect(all()).toEqual(before)
  expect(stays()).toEqual(graph)
  expect(context()).toEqual(ctx)
  expect(db().metadata()).toEqual(metadata)
  sql().exec('DROP TRIGGER fail_second_economy')
  value(await vessels.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  const corrected = all()[1]
  expect(corrected.endpoint).toEqual(move.endpoint)
  expect(corrected.arrival).toEqual(move.arrival)
  expect(corrected.charges[0]).toMatchObject({
    id: move.charges[0].id,
    manualOverrideAmount: '12.34',
    effectiveBase: '12.34',
    calculation: { vesselName: 'Correzione', vesselTypeId: 'PASSENGER', base: '100.00' },
  })
  expect(corrected.charges[1]).toMatchObject({
    id: move.charges[1].id,
    manualOverrideAmount: '0.00',
    effectiveBase: '0.00',
    calculation: { vesselName: 'Correzione', vesselTypeId: 'PASSENGER', base: '200.00' },
  })
  expect(corrected.totalBase).toBe('12.34')
  expect(stays()).toEqual(graph)
  expect(BigInt(context().revision)).toBe(BigInt(ctx.revision) + 1n)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('PR11: consultazione UTC decrescente a tre livelli, pagine globali e letture senza scritture', async () => {
  const firstEntry = await create(input('ENTRY', '2026-06-01T12:00'))
  const firstId = stays()[0].id
  const firstExit = await create(input('EXIT', '2026-06-01T14:00'))
  const first = stays()[0]
  const secondEntry = await create(input('ENTRY', '2026-06-02T12:00'))
  const secondId = stays()[0].id
  const secondExit = await create(input('EXIT', '2026-06-02T14:00'))
  const second = stays()[0]
  const latestEntry = await create(input('ENTRY', '2026-06-03T12:00'))
  const latestOpening = stays()[0]
  const dest = await destination()
  const moved = await create({
    ...transfer(dest),
    moment: moment('2026-06-04T12:00'),
    arrivalMoment: moment('2026-06-04T11:30'),
  })
  const recentVisit = stays()[0].visits[0]
  const internal = await create({
    ...movement('2026-06-05T12:00', '2026-06-05T13:00'),
    destinationPortId: dest,
  })
  const latest = stays()[0]
  expect([first.id, second.id, latest.id]).toEqual([firstId, secondId, latestOpening.id])
  expect(
    [first, second].map((v) => [
      v.openingOperationId,
      v.startedAt,
      v.closingOperationId,
      v.endedAt,
    ]),
  ).toEqual([
    [firstEntry.id, firstEntry.endpoint.moment.utc, firstExit.id, firstExit.endpoint.moment.utc],
    [
      secondEntry.id,
      secondEntry.endpoint.moment.utc,
      secondExit.id,
      secondExit.endpoint.moment.utc,
    ],
  ])
  expect(latest).toMatchObject({
    openingOperationId: latestEntry.id,
    startedAt: latestEntry.endpoint.moment.utc,
    closingOperationId: null,
    endedAt: null,
  })
  expect(
    latest.visits.map((p) => [
      p.id,
      p.openingOperationId,
      p.startedAt,
      p.closingOperationId,
      p.endedAt,
      p.portId,
    ]),
  ).toEqual([
    [recentVisit.id, moved.id, '2026-06-04T10:30:00.000Z', null, null, dest],
    [
      latestOpening.visits[0].id,
      latestEntry.id,
      '2026-06-03T10:00:00.000Z',
      moved.id,
      moved.endpoint.moment.utc,
      portId,
    ],
  ])
  const recentStays = latest.visits[0].stays
  expect(
    recentStays.map((b) => [b.openingOperationId, b.startedAt, b.closingOperationId, b.endedAt]),
  ).toEqual([
    [internal.id, '2026-06-05T12:00:00.000Z', null, null],
    [moved.id, '2026-06-04T10:30:00.000Z', internal.id, internal.endpoint.moment.utc],
  ])
  expect(recentStays[1].id).toBe(recentVisit.stays[0].id)
  expect(recentStays[0].id).not.toBe(recentStays[1].id)
  expect(latest.visits[1].stays).toEqual([
    {
      ...latestOpening.visits[0].stays[0],
      closingMoment: moved.endpoint.moment,
      closingOperationId: moved.id,
      endedAt: moved.endpoint.moment.utc,
    },
  ])
  // The arrival's local clock is earlier than departure; ordering uses UTC, never that label.
  expect(moved.arrival!.moment.localDateTime).toBe('2026-06-04T11:30')
  const metadata = db().metadata(),
    originalContext = context(),
    saved = sql().serialize()
  const changes = sql().prepare('SELECT total_changes()').pluck().get()
  const query = (page: number, pageSize = 2) =>
    operations
      .stays({
        context: { sessionId: context().sessionId },
        query: { vesselId, page, pageSize },
      })
      .then(value)
  sql().pragma('query_only=ON')
  try {
    const page1 = await query(1),
      page2 = await query(2),
      page3 = await query(3)
    expect(page1).toEqual({ items: [latest, second], total: 3, page: 1, pageSize: 2 })
    expect(page2).toEqual({ items: [first], total: 3, page: 2, pageSize: 2 })
    expect(page3).toEqual({ items: [], total: 3, page: 3, pageSize: 2 })
    const global = [...page1.items, ...page2.items]
    expect(new Set(global.map((v) => v.id)).size).toBe(3)
    expect(global.map((v) => [v.id, v.startedAt])).toEqual([
      [latest.id, latestEntry.endpoint.moment.utc],
      [second.id, secondEntry.endpoint.moment.utc],
      [first.id, firstEntry.endpoint.moment.utc],
    ])
    expect(global.flatMap((v) => v.visits)).toHaveLength(4)
    expect(global.flatMap((v) => v.visits.flatMap((p) => p.stays))).toHaveLength(5)
    for (const [i, voyage] of global.entries()) {
      expect(new OperationRepository(db()).stays(vesselId, i + 1, 1).items).toEqual([voyage])
      for (const visit of voyage.visits) {
        expect(
          sql().prepare('SELECT voyage_id FROM port_calls WHERE id=?').pluck().get(visit.id),
        ).toBe(voyage.id)
        for (const stay of visit.stays)
          expect(
            sql().prepare('SELECT port_call_id FROM berth_stays WHERE id=?').pluck().get(stay.id),
          ).toBe(visit.id)
      }
    }
    expect(await query(2)).toEqual(page2)
    expect(await query(1)).toEqual(page1)
    // Context resolution still follows event time and the original opening identities.
    expect(await contextAt(latestEntry.endpoint.moment.utc)).toMatchObject({
      voyageId: latest.id,
      portCallId: latestOpening.visits[0].id,
      berthStayId: latestOpening.visits[0].stays[0].id,
    })
    expect(await contextAt('2026-06-04T10:15:00.000Z')).toMatchObject({
      status: 'IN_TRANSFER',
      voyageId: latest.id,
      portCallId: null,
    })
    expect(await contextAt(internal.arrival!.moment.utc)).toMatchObject({
      voyageId: latest.id,
      portCallId: recentVisit.id,
      berthStayId: recentStays[0].id,
    })
    expect(db().metadata()).toEqual(metadata)
    expect(context()).toEqual(originalContext)
    expect(sql().prepare('SELECT total_changes()').pluck().get()).toBe(changes)
    expect(sql().serialize()).toEqual(saved)
    expect(sql().pragma('foreign_key_check')).toEqual([])
    expect(sql().pragma('integrity_check', { simple: true })).toBe('ok')
  } finally {
    sql().pragma('query_only=OFF')
  }
})

it.each([false, true])(
  'PR11: lista vuota o singola (presente=%s), totali e ultima pagina stabili',
  async (present) => {
    if (present) await create()
    const expected = stays(),
      metadata = db().metadata(),
      saved = sql().serialize()
    const originalContext = context(),
      changes = sql().prepare('SELECT total_changes()').pluck().get()
    for (const page of [1, 2, 1]) {
      const actual = value(
        await operations.stays({
          context: { sessionId: context().sessionId },
          query: { vesselId, page, pageSize: 1 },
        }),
      )
      expect(actual).toEqual({
        items: page === 1 ? expected : [],
        total: present ? 1 : 0,
        page,
        pageSize: 1,
      })
    }
    if (present) {
      expect(expected[0].visits).toHaveLength(1)
      expect(expected[0].visits[0].stays).toHaveLength(1)
      expect(
        [expected[0], expected[0].visits[0], expected[0].visits[0].stays[0]].map(
          (v) => v.startedAt,
        ),
      ).toEqual(Array(3).fill('2026-06-01T10:00:00.000Z'))
    }
    expect(context()).toEqual(originalContext)
    expect(db().metadata()).toEqual(metadata)
    expect(sql().prepare('SELECT total_changes()').pluck().get()).toBe(changes)
    expect(sql().serialize()).toEqual(saved)
  },
)

it('PR11: parità UTC consentita fra navi isolate; il vincolo reale esclude aperture simultanee fra fratelli', async () => {
  const first = await create()
  const other = value(
    await vessels.create({
      context: context(),
      payload: {
        registeredName: 'Seconda nave',
        imoNumber: null,
        vesselTypeId: 'STANDARD',
        size: 2100,
      },
    }),
  ).id
  const simultaneous = await create({ ...input(), vesselId: other })
  expect(simultaneous.endpoint.moment.utc).toBe(first.endpoint.moment.utc)
  const metadata = db().metadata(),
    changes = sql().prepare('SELECT total_changes()').pluck().get()
  expect(await preview(input('EXIT'))).toMatchObject(failure('OPERATION_MINUTE_CONFLICT'))
  // No fabricated same-parent ties: FK to the opening endpoint plus per-vessel UTC-minute
  // uniqueness makes them unreachable in a valid chronology. ID is the defensive tie-breaker.
  for (const id of [vesselId, other, vesselId]) {
    const read = value(
      await operations.stays({
        context: { sessionId: context().sessionId },
        query: { vesselId: id, page: 1, pageSize: 1 },
      }),
    )
    expect(read.total).toBe(1)
    expect(read.items[0]).toMatchObject({
      vesselId: id,
      openingOperationId: id === vesselId ? first.id : simultaneous.id,
      startedAt: first.endpoint.moment.utc,
    })
    expect(read.items[0].visits[0].openingOperationId).toBe(read.items[0].openingOperationId)
    expect(read.items[0].visits[0].stays[0].openingOperationId).toBe(
      read.items[0].openingOperationId,
    )
  }
  expect(db().metadata()).toEqual(metadata)
  expect(sql().prepare('SELECT total_changes()').pluck().get()).toBe(changes)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})

it('PR11: replay crescente da consultazione decrescente conserva identità, intervalli e soggetti senza effetti', async () => {
  await create()
  const dest = await destination()
  await create(transfer(dest))
  await create({ ...movement('2026-06-03T12:00', '2026-06-03T13:00'), destinationPortId: dest })
  await create(input('EXIT', '2026-06-04T12:00'))
  await create(input('ENTRY', '2026-06-05T12:00'))
  const previous = stays(),
    events = all()
  const identities = new Map(
    previous.flatMap((v) =>
      v.visits.flatMap((p) =>
        p.stays.map(
          (b) =>
            [
              b.openingOperationId,
              { voyageId: v.id, portCallId: p.id, berthStayId: b.id },
            ] as const,
        ),
      ),
    ),
  )
  expect(events.map((o) => o.endpoint.moment.utc)).toEqual([
    '2026-06-01T10:00:00.000Z',
    '2026-06-02T10:00:00.000Z',
    '2026-06-03T11:00:00.000Z',
    '2026-06-04T11:00:00.000Z',
    '2026-06-05T10:00:00.000Z',
  ])
  const metadata = db().metadata(),
    changes = sql().prepare('SELECT total_changes()').pluck().get()
  const replayed = replayOperations([...events].reverse(), previous, identities)
  // Reverse the expected presentation explicitly at every level; compare the entire DTO graph.
  const chronological = [...previous].reverse().map((v) => ({
    ...v,
    visits: [...v.visits].reverse().map((p) => ({ ...p, stays: [...p.stays].reverse() })),
  }))
  expect(replayed).toEqual(chronological)
  const plan = operationReplay(db(), [...events].reverse(), vesselId, identities)
  expect(plan.persistence.effects).toEqual([])
  expect(plan.persistence.blockers).toEqual([])
  expect(plan.subjects.effects).toEqual([])
  expect(stays()).toEqual(previous)
  expect(all()).toEqual(events)
  expect(db().metadata()).toEqual(metadata)
  expect(sql().prepare('SELECT total_changes()').pluck().get()).toBe(changes)
})

it('PR06 permanenze backend con overlap: apertura/chiusura originali ai tre livelli e letture senza scritture', async () => {
  const entry = await create({
    ...input('ENTRY', '2026-10-25T02:30'),
    moment: moment('2026-10-25T02:30', '+02:00'),
  })
  const opened = stays()[0]
  for (const interval of [opened, opened.visits[0], opened.visits[0].stays[0]]) {
    expect(interval.openingMoment).toEqual(entry.endpoint.moment)
    expect(interval.closingMoment).toBeNull()
  }
  const exit = await create({
    ...input('EXIT', '2026-10-25T02:30'),
    moment: moment('2026-10-25T02:30', '+01:00'),
  })
  const saved = sql().serialize(),
    ctx = context(),
    metadata = db().metadata(),
    changes = sql().prepare('SELECT total_changes()').pluck().get()
  sql().pragma('query_only=ON')
  try {
    const closed = value(
      await operations.stays({
        context: { sessionId: ctx.sessionId },
        query: { vesselId, page: 1, pageSize: 25 },
      }),
    ).items[0]
    for (const interval of [closed, closed.visits[0], closed.visits[0].stays[0]]) {
      expect(interval.openingMoment).toEqual(entry.endpoint.moment)
      expect(interval.closingMoment).toEqual(exit.endpoint.moment)
      expect(interval.startedAt).toBe(entry.endpoint.moment.utc)
      expect(interval.endedAt).toBe(exit.endpoint.moment.utc)
    }
  } finally {
    sql().pragma('query_only=OFF')
  }
  expect(sql().serialize()).toEqual(saved)
  expect(context()).toEqual(ctx)
  expect(db().metadata()).toEqual(metadata)
  expect(sql().prepare('SELECT total_changes()').pluck().get()).toBe(changes)
})
it('PR06 permanenze tra porti: chiusura alla partenza e apertura all’arrivo, senza conversioni renderer', async () => {
  const dest = await destination()
  await create()
  const move = await create(transfer(dest))
  const voyage = stays()[0],
    arrival = voyage.visits[0],
    origin = voyage.visits[1]
  expect(origin.closingMoment).toEqual(move.endpoint.moment)
  expect(origin.stays[0].closingMoment).toEqual(move.endpoint.moment)
  expect(arrival.openingMoment).toEqual(move.arrival!.moment)
  expect(arrival.stays[0].openingMoment).toEqual(move.arrival!.moment)
  expect(origin.closingMoment?.zoneId).toBe('Europe/Rome')
  expect(arrival.openingMoment.zoneId).toBe('Europe/London')
  expect(voyage.closingMoment).toBeNull()
  // A historical tuple consistent in local/offset/UTC is authoritative even with a different IANA history.
  sql()
    .prepare("UPDATE operation_endpoints SET zone_id='Asia/Tokyo' WHERE id=?")
    .run(move.arrival!.id)
  const original = stays()[0].visits[0].openingMoment
  expect(original).toEqual({ ...move.arrival!.moment, zoneId: 'Asia/Tokyo' })
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
