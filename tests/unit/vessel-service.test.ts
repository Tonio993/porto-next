import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { CustomerService } from '../../src/backend/application/customers/customer-service'
import { TimeService } from '../../src/backend/application/time/time-service'
import { VesselRepository } from '../../src/backend/infrastructure/database/vessel-repository'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type {
  VesselChangeDto,
  VesselPreviewDto,
  VesselDescriptionDto,
} from '../../src/shared/contracts/vessels'

let folder: string
let archives: ArchiveService
let service: VesselService
let now: string
const context = () => archives.context()!
const db = () => archives.coordinator.requireSession().database
const queryContext = () => ({ sessionId: context().sessionId })
const value = <T>(r: ApplicationResult<T>) => {
  if (!r.ok) throw new Error(r.error.code + ': ' + r.error.message)
  return r.value
}
const failure = (code: string) => ({ ok: false, error: { code } })
const defaults = { imoNumber: null, vesselTypeId: 'STANDARD', size: 0 } as const
const create = (registeredName: string, fields: Partial<VesselDescriptionDto> = {}) =>
  service.create({ context: context(), payload: { ...defaults, registeredName, ...fields } })
const list = (search = '', page = 1, pageSize = 10, selectableOnly = false) =>
  service.list({ context: queryContext(), query: { search, page, pageSize, selectableOnly } })
const history = async (id: string) =>
  value(await service.history({ context: queryContext(), query: { id, page: 1, pageSize: 100 } }))
type ChangeInput =
  | ({
      operation: 'INSERT_VERSION'
      vesselId: string
      registeredName: string
      moment: typeof moment
    } & Partial<VesselDescriptionDto>)
  | ({
      operation: 'UPDATE_VERSION'
      vesselId: string
      versionId: string
      registeredName: string
      moment: typeof moment | null
    } & Partial<VesselDescriptionDto>)
  | Exclude<VesselChangeDto, { operation: 'INSERT_VERSION' | 'UPDATE_VERSION' }>
const preview = (payload: ChangeInput) =>
  service.preview({
    context: context(),
    payload: ('registeredName' in payload
      ? { ...defaults, ...payload }
      : payload) as VesselChangeDto,
  })
const confirm = (p: VesselPreviewDto) =>
  service.confirm({ context: p.context, payload: { previewId: p.previewId } })
const apply = async (payload: ChangeInput) => value(await confirm(value(await preview(payload))))
const moment: import('../../src/shared/contracts/values').MomentInputDto = {
  localDateTime: '2027-01-01T10:00',
  selectedOffset: null,
}
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p07-'))
  archives = new ArchiveService()
  now = '2026-11-11T08:00:00.000Z'
  service = new VesselService(archives.coordinator, () => now)
  await archives.create(join(folder, 'A.ormeggi'), 'A')
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})

it('conserva IMO testuali, null senza prenotazione e tipologie tecniche; applica i limiti esatti', async () => {
  expect(db().sqlite.prepare('SELECT id FROM vessel_types ORDER BY id').all()).toEqual([
    { id: 'ADM' },
    { id: 'PASSENGER' },
    { id: 'STANDARD' },
  ])
  for (const vesselTypeId of ['STANDARD', 'PASSENGER', 'ADM'] as const) {
    const a = value(await create(vesselTypeId, { vesselTypeId, imoNumber: '   ', size: 0 }))
    expect(a.version).toMatchObject({ imoNumber: null, vesselTypeId, size: 0 })
  }
  const a = value(
    await create('Massima', { size: Number.MAX_SAFE_INTEGER, imoNumber: '  000abc-À_7  ' }),
  )
  expect(a.version).toMatchObject({ imoNumber: '000abc-À_7', size: 9007199254740991 })
  expect(value(await list('ABC-A\u0300_7')).items[0].id).toBe(a.id)
  expect(await create('IMO duplicato', { imoNumber: '000ABC-A\u0300_7' })).toMatchObject({
    ok: false,
    error: { code: 'DUPLICATE_IDENTIFIER', fields: [{ path: ['imoNumber'] }] },
  })
  value(await create('Testo limite', { imoNumber: '𐐀'.repeat(64) }))
  expect(await create('Troppo lungo', { imoNumber: '𐐀'.repeat(65) })).toMatchObject(
    failure('VALIDATION_ERROR'),
  )
  for (const size of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '1', null]) {
    const before = context()
    expect(await create('Invalida', { size } as Partial<VesselDescriptionDto>)).toMatchObject(
      failure('LIMIT_EXCEEDED'),
    )
    expect(context()).toEqual(before)
  }
  for (const vesselTypeId of ['UNKNOWN', '', null])
    expect(
      await create('Tipo invalido', { vesselTypeId } as Partial<VesselDescriptionDto>),
    ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    db()
      .sqlite.prepare("SELECT count(*) FROM vessel_identifier_reservations WHERE kind = 'IMO'")
      .pluck()
      .get(),
  ).toBe(2)
  const sql = db().sqlite
  for (const size of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1])
    expect(() =>
      sql.prepare('UPDATE vessel_versions SET size = ? WHERE id = ?').run(size, a.version.id),
    ).toThrow()
  expect(() =>
    sql
      .prepare("UPDATE vessel_versions SET vessel_type_id = 'UNKNOWN' WHERE id = ?")
      .run(a.version.id),
  ).toThrow()
})

it('prenota indipendentemente nomi e IMO rimossi o corretti fino all’eliminazione dell’identità', async () => {
  const time = new TimeService(archives.coordinator)
  value(await time.configureCompanyZone({ context: context(), payload: { zoneId: 'Europe/Rome' } }))
  const a = value(await create('Primo nome', { imoNumber: '001-A' }))
  await apply({
    operation: 'UPDATE_VERSION',
    vesselId: a.id,
    versionId: a.version.id,
    registeredName: 'Secondo nome',
    imoNumber: null,
    moment: null,
  })
  expect(await create('Altro', { imoNumber: '001-a' })).toMatchObject(
    failure('DUPLICATE_IDENTIFIER'),
  )
  await apply({
    operation: 'INSERT_VERSION',
    vesselId: a.id,
    registeredName: 'Futuro',
    imoNumber: '002-B',
    size: 2100,
    vesselTypeId: 'PASSENGER',
    moment,
  })
  const future = (await history(a.id)).versions.items[1]
  await apply({
    operation: 'UPDATE_VERSION',
    vesselId: a.id,
    versionId: future.id,
    registeredName: 'Corretto',
    imoNumber: '003-C',
    size: 2200,
    vesselTypeId: 'ADM',
    moment,
  })
  await apply({ operation: 'DELETE_VERSION', vesselId: a.id, versionId: future.id })
  for (const name of ['Primo nome', 'Futuro', 'Corretto']) {
    expect(value(await list(name)).items[0].id).toBe(a.id)
    expect(await create(name)).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  }
  for (const imoNumber of ['001-A', '002-B', '003-C']) {
    expect(value(await list(imoNumber)).items[0].id).toBe(a.id)
    expect(await create('Altra nave', { imoNumber })).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  }
  // Reusing an old identifier within its owner is legitimate.
  await apply({
    operation: 'UPDATE_VERSION',
    vesselId: a.id,
    versionId: a.version.id,
    registeredName: 'Primo nome',
    imoNumber: '001-A',
    moment: null,
  })
  await archives.close()
  await archives.open(join(folder, 'A.ormeggi'))
  expect(await create('Libera?', { imoNumber: '002-B' })).toMatchObject(
    failure('DUPLICATE_IDENTIFIER'),
  )
  await apply({ operation: 'DELETE_VESSEL', vesselId: a.id })
  expect(value(await create('Futuro', { imoNumber: '003-C' })).code).toBe(2)
})

it('risolve dimensione e tipo ai confini di intervalli, anche per navi disattivate, senza scritture', async () => {
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const a = value(await create('Nave', { size: 1000 }))
  await apply({
    operation: 'INSERT_VERSION',
    vesselId: a.id,
    registeredName: 'Nave',
    size: 2000,
    vesselTypeId: 'PASSENGER',
    moment,
  })
  const resolve = (instant: string) =>
    service.versionAt({ context: queryContext(), query: { vesselId: a.id, instant } })
  const before = context()
  expect(value(await resolve('0001-01-01T00:00:00.000Z'))).toMatchObject({
    size: 1000,
    effectiveFrom: null,
  })
  expect(value(await resolve('2027-01-01T08:59:59.999Z'))).toMatchObject({
    size: 1000,
    effectiveTo: '2027-01-01T09:00:00.000Z',
  })
  const applicable = value(await resolve('2027-01-01T09:00:00.000Z'))
  expect(applicable).toMatchObject({ size: 2000, vesselTypeId: 'PASSENGER', effectiveTo: null })
  expect(value(await resolve('9999-12-31T23:59:59.999Z')).id).toBe(applicable.id)
  expect(context()).toEqual(before)
  for (const instant of [
    '',
    '2027-02-30T00:00:00.000Z',
    '0000-01-01T00:00:00.000Z',
    '2027-01-01T09:00:00Z',
    '2027-01-01T10:00:00.000+01:00',
  ])
    expect(await resolve(instant)).toMatchObject(failure('VALIDATION_ERROR'))
  await apply({ operation: 'DEACTIVATE_VESSEL', vesselId: a.id })
  expect(value(await resolve('2027-01-01T09:00:00.000Z')).size).toBe(2000)
  expect(() => new VesselRepository(db(), now).requireSelectable(a.id)).toThrow()
})

it('include dimensione zero negli effetti e annulla entrambe le prenotazioni se fallisce l’IMO', async () => {
  const a = value(await create('Prima', { size: 10, imoNumber: '001' }))
  const p = value(
    await preview({
      operation: 'UPDATE_VERSION',
      vesselId: a.id,
      versionId: a.version.id,
      registeredName: 'Seconda',
      imoNumber: '002',
      size: 0,
      moment: null,
    }),
  )
  expect(p.effects.items[0].changes).toContainEqual({ field: 'size', before: '10', after: '0' })
  const sql = db().sqlite
  const metadata = sql.prepare('SELECT * FROM archive_metadata').get()
  sql.exec(
    "CREATE TRIGGER fail_imo BEFORE INSERT ON vessel_identifier_reservations WHEN NEW.kind = 'IMO' BEGIN SELECT RAISE(ABORT, 'forced'); END",
  )
  expect(await confirm(p)).toMatchObject({ ok: false })
  expect(sql.prepare('SELECT * FROM archive_metadata').get()).toEqual(metadata)
  expect(context()).toEqual(p.context)
  expect(value(await list('Seconda')).total).toBe(0)
  expect((await history(a.id)).vessel.version).toMatchObject({
    registeredName: 'Prima',
    imoNumber: '001',
    size: 10,
  })
  expect(await create('Terza', { imoNumber: '003' })).toMatchObject({ ok: false })
  expect(sql.prepare('SELECT count(*) FROM vessels').pluck().get()).toBe(1)
  expect(sql.prepare('SELECT last_code FROM vessel_code_counter').pluck().get()).toBe(1)
  sql.exec('DROP TRIGGER fail_imo')
  value(await confirm(p))
  expect(value(await create('Terza', { imoNumber: '003' })).code).toBe(2)
})

it('riesamina i riferimenti alla conferma e protegge anche gli intervalli delle versioni vicine', async () => {
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const a = value(await create('Nave'))
  const p = value(
    await preview({
      operation: 'INSERT_VERSION',
      vesselId: a.id,
      registeredName: 'Futura',
      size: 1000,
      moment,
    }),
  )
  expect(p.status).toBe('READY')
  const sql = db().sqlite
  sql.exec(
    'CREATE TABLE version_reference (id TEXT PRIMARY KEY, version_id TEXT REFERENCES vessel_versions(id) ON DELETE CASCADE)',
  )
  // External fixture without a revision write: confirmation must inspect actual references again.
  sql.prepare('INSERT INTO version_reference VALUES (?,?)').run('existing', a.version.id)
  expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(context()).toEqual(p.context)
  expect((await history(a.id)).versions.total).toBe(1)
  sql.exec('DELETE FROM version_reference')
  value(await confirm(p))
  const future = (await history(a.id)).versions.items[1]
  sql.prepare('INSERT INTO version_reference VALUES (?,?)').run('future', future.id)
  const d = value(
    await preview({ operation: 'DELETE_VERSION', vesselId: a.id, versionId: future.id }),
  )
  expect(d.status).toBe('BLOCKED')
  expect(await confirm(d)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(sql.prepare('SELECT count(*) FROM version_reference').pluck().get()).toBe(1)
})

it('separa identità, contatori e unicità Unicode; conserva nomi storici e codici dopo riapertura', async () => {
  const a = value(await create('  Società  '))
  const other = value(
    await new CustomerService(archives.coordinator).create({
      context: context(),
      payload: { businessName: 'SOCIETA\u0300' },
    }),
  )
  expect([a.code, other.code]).toEqual([1, 1])
  expect(a.id).not.toBe(other.id)
  expect(a.version.registeredName).toBe('Società')
  expect(a.version.effectiveFrom).toBeNull()
  expect(await create('SOCIETA\u0300')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  expect(await service.get({ context: queryContext(), query: { id: other.id } })).toMatchObject(
    failure('NOT_FOUND'),
  )
  await apply({
    operation: 'UPDATE_VERSION',
    vesselId: a.id,
    versionId: a.version.id,
    registeredName: 'Nuova società',
    moment: null,
  })
  expect(value(await list('SOCIETA\u0300')).items[0].id).toBe(a.id)
  expect(await create('SOCIETÀ')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  await apply({ operation: 'DELETE_VESSEL', vesselId: a.id })
  await archives.close()
  await archives.open(join(folder, 'A.ormeggi'))
  expect(value(await create('Società')).code).toBe(2)
  expect(
    value(
      await new CustomerService(archives.coordinator).get({
        context: queryContext(),
        query: { id: other.id },
      }),
    ).code,
  ).toBe(1)
})

it('valida limiti, chiavi IPC e paginazione senza confondere i caratteri speciali della ricerca', async () => {
  for (const registeredName of ['', ' '.repeat(3), '𐐀'.repeat(201)])
    expect(await create(registeredName)).toMatchObject(failure('VALIDATION_ERROR'))
  const a = value(await create('𐐀'.repeat(200)))
  expect(a.code).toBe(1)
  expect(
    await service.create({
      context: context(),
      payload: { ...defaults, registeredName: 'Extra', taxCode: 'no' } as VesselDescriptionDto,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  for (let i = 0; i < 11; i++) value(await create('Società ' + i))
  expect(value(await list('', 2, 10))).toMatchObject({
    total: 12,
    page: 2,
    items: [{ code: 11 }, { code: 12 }],
  })
  expect(value(await list('%')).total).toBe(0)
  expect(value(await list('2')).items.some((x) => x.code === 2)).toBe(true)
  expect(await list('x'.repeat(201))).toMatchObject(failure('VALIDATION_ERROR'))
  expect(await list('', 0)).toMatchObject(failure('VALIDATION_ERROR'))
  db().sqlite.prepare('UPDATE vessel_code_counter SET last_code = ?').run(Number.MAX_SAFE_INTEGER)
  const before = context()
  expect(await create('Overflow')).toMatchObject(failure('LIMIT_EXCEEDED'))
  expect(context()).toEqual(before)
})

it('richiede configurazione iniziale, risolve gap e overlap nel backend e conserva la tupla storica', async () => {
  const a = value(await create('Iniziale'))
  expect(
    await preview({
      operation: 'INSERT_VERSION',
      vesselId: a.id,
      registeredName: 'Futura',
      moment,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const resolve = (localDateTime: string, selectedOffset: string | null = null) =>
    service.resolveVersionMoment({
      context: queryContext(),
      query: { vesselId: a.id, moment: { localDateTime, selectedOffset } },
    })
  expect(await resolve('2026-03-29T02:30')).toMatchObject(failure('LOCAL_TIME_NOT_EXISTENT'))
  expect(value(await resolve('2026-10-25T02:30'))).toMatchObject({
    status: 'CHOICE_REQUIRED',
    choices: [{ offset: '+02:00' }, { offset: '+01:00' }],
  })
  expect(
    await preview({
      operation: 'INSERT_VERSION',
      vesselId: a.id,
      registeredName: 'Ambigua',
      moment: { localDateTime: '2026-10-25T02:30', selectedOffset: null },
    }),
  ).toMatchObject(failure('LOCAL_TIME_AMBIGUOUS'))
  await apply({ operation: 'INSERT_VERSION', vesselId: a.id, registeredName: 'Futura', moment })
  const saved = (await history(a.id)).versions.items[1]
  expect(saved).toMatchObject({
    phase: 'FUTURE',
    effectiveMoment: { zoneId: 'Europe/Rome', utc: '2027-01-01T09:00:00.000Z', offset: '+01:00' },
  })
  const before = context()
  now = saved.effectiveFrom!
  expect((await history(a.id)).vessel.version.id).toBe(saved.id)
  expect(context()).toEqual(before)
  // Simulate a historical IANA tuple that must survive descriptive correction without re-resolution.
  db()
    .sqlite.prepare(
      'UPDATE vessel_versions SET effective_utc_offset = ?, effective_from = ? WHERE id = ?',
    )
    .run('+01:00:01', '2027-01-01T08:59:59.000Z', saved.id)
  await apply({
    operation: 'UPDATE_VERSION',
    vesselId: a.id,
    versionId: saved.id,
    registeredName: 'Corretta',
    moment: { localDateTime: moment.localDateTime, selectedOffset: '+01:00:01' },
  })
  expect((await history(a.id)).versions.items[1].effectiveMoment).toMatchObject({
    offset: '+01:00:01',
    utc: '2027-01-01T08:59:59.000Z',
  })
  await apply({ operation: 'DELETE_VERSION', vesselId: a.id, versionId: saved.id })
  expect(await create('Futura')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  expect(await create('Corretta')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  expect(
    await preview({ operation: 'DELETE_VERSION', vesselId: a.id, versionId: a.version.id }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await preview({
      operation: 'UPDATE_VERSION',
      vesselId: a.id,
      versionId: a.version.id,
      registeredName: 'X',
      moment,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await preview({
      operation: 'INSERT_VERSION',
      vesselId: a.id,
      registeredName: 'Iniziale',
      moment,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
})

it('mantiene riferimenti reali disattivando, impedisce nuove selezioni e blocca eliminazioni con FK anche CASCADE', async () => {
  const a = value(await create('Referenziata'))
  const sql = db().sqlite
  sql.exec(
    'CREATE TABLE actual_reference (id TEXT PRIMARY KEY, vessel_id TEXT REFERENCES vessels(id) ON DELETE CASCADE, version_id TEXT REFERENCES vessel_versions(id) ON DELETE CASCADE)',
  )
  sql.prepare('INSERT INTO actual_reference VALUES (?,?,?)').run('ref', a.id, a.version.id)
  expect(new VesselRepository(db(), now).requireSelectable(a.id).id).toBe(a.id)
  await apply({ operation: 'DEACTIVATE_VESSEL', vesselId: a.id })
  expect(() => new VesselRepository(db(), now).requireSelectable(a.id)).toThrow(/selezionabile/)
  expect(value(await list('', 1, 10, true)).total).toBe(0)
  expect(value(await list()).total).toBe(1)
  expect(sql.prepare('SELECT count(*) FROM actual_reference').pluck().get()).toBe(1)
  const blocked = value(await preview({ operation: 'DELETE_VESSEL', vesselId: a.id }))
  expect(blocked.status).toBe('BLOCKED')
  expect(await confirm(blocked)).toMatchObject(failure('PREVIEW_BLOCKED'))
  const correction = value(
    await preview({
      operation: 'UPDATE_VERSION',
      vesselId: a.id,
      versionId: a.version.id,
      registeredName: 'Impossibile',
      moment: null,
    }),
  )
  expect(correction.status).toBe('BLOCKED')
  value(await service.reactivate({ context: context(), payload: { vesselId: a.id } }))
  expect(new VesselRepository(db(), now).requireSelectable(a.id).id).toBe(a.id)
  sql.exec('DELETE FROM actual_reference')
  await apply({ operation: 'DELETE_VESSEL', vesselId: a.id })
})

it('rifiuta anteprime di altra tipologia, revisioni e sessioni obsolete; non consuma anteprime dopo rollback', async () => {
  const a = value(await create('Prima'))
  const p = value(
    await preview({
      operation: 'UPDATE_VERSION',
      vesselId: a.id,
      versionId: a.version.id,
      registeredName: 'Seconda',
      moment: null,
    }),
  )
  expect(
    await new CustomerService(archives.coordinator).confirm({
      context: p.context,
      payload: { previewId: p.previewId },
    }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  const sql = db().sqlite
  sql.exec(
    "CREATE TRIGGER fail_update BEFORE UPDATE ON vessel_versions BEGIN SELECT RAISE(ABORT, 'forced'); END;",
  )
  expect(await confirm(p)).toMatchObject({ ok: false })
  expect(context()).toEqual(p.context)
  expect((await history(a.id)).vessel.version.registeredName).toBe('Prima')
  expect(
    sql
      .prepare(
        "SELECT count(*) FROM vessel_identifier_reservations WHERE normalized_value = 'SECONDA'",
      )
      .pluck()
      .get(),
  ).toBe(0)
  sql.exec('DROP TRIGGER fail_update')
  value(await confirm(p))
  expect(await confirm(p)).toMatchObject(failure('REVISION_CONFLICT'))
  const d = value(await preview({ operation: 'DELETE_VESSEL', vesselId: a.id }))
  sql.exec(
    "CREATE TRIGGER fail_delete BEFORE DELETE ON vessels BEGIN SELECT RAISE(ABORT, 'forced'); END;",
  )
  expect(await confirm(d)).toMatchObject({ ok: false })
  expect((await history(a.id)).versions.total).toBe(1)
  expect(await create('Prima')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  sql.exec('DROP TRIGGER fail_delete')
  value(await confirm(d))
  const prior = context()
  const stale = value(
    await preview({ operation: 'DEACTIVATE_VESSEL', vesselId: value(await create('Terza')).id }),
  )
  await archives.saveAs(join(folder, 'copy.ormeggi'))
  expect(await confirm(stale)).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  expect(
    await service.list({
      context: { sessionId: prior.sessionId },
      query: { search: '', page: 1, pageSize: 10, selectableOnly: false },
    }),
  ).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
})

it('annulla atomicamente creazione, contatore, prenotazione e metadati se fallisce l’ultima scrittura', async () => {
  const sql = db().sqlite
  const before = context()
  sql.exec(
    "CREATE TRIGGER fail_reservation BEFORE INSERT ON vessel_identifier_reservations BEGIN SELECT RAISE(ABORT, 'forced'); END;",
  )
  expect(await create('Prima')).toMatchObject({ ok: false })
  expect(context()).toEqual(before)
  expect(sql.prepare('SELECT count(*) FROM vessels').pluck().get()).toBe(0)
  expect(sql.prepare('SELECT count(*) FROM vessel_versions').pluck().get()).toBe(0)
  sql.exec('DROP TRIGGER fail_reservation')
  expect(value(await create('Prima')).code).toBe(1)
})
it('usa il fuso aziendale scelto, ordina versioni intermedie, conserva adiacenti identiche e no-op', async () => {
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'America/New_York' },
    }),
  )
  const a = value(await create('Iniziale'))
  await apply({ operation: 'INSERT_VERSION', vesselId: a.id, registeredName: 'Futura', moment })
  await apply({
    operation: 'INSERT_VERSION',
    vesselId: a.id,
    registeredName: 'Passata',
    moment: { localDateTime: '2025-01-01T10:00', selectedOffset: null },
  })
  await apply({
    operation: 'INSERT_VERSION',
    vesselId: a.id,
    registeredName: 'Intermedia',
    moment: { localDateTime: '2026-01-01T10:00', selectedOffset: null },
  })
  expect((await history(a.id)).versions.items.map((v) => v.registeredName)).toEqual([
    'Iniziale',
    'Passata',
    'Intermedia',
    'Futura',
  ])
  expect((await history(a.id)).versions.items[3].effectiveMoment).toMatchObject({
    zoneId: 'America/New_York',
    offset: '-05:00',
    utc: '2027-01-01T15:00:00.000Z',
  })
  expect(
    await preview({
      operation: 'INSERT_VERSION',
      vesselId: a.id,
      registeredName: 'Duplicata',
      moment,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  await apply({
    operation: 'UPDATE_VERSION',
    vesselId: a.id,
    versionId: a.version.id,
    registeredName: 'Passata',
    moment: null,
  })
  expect((await history(a.id)).versions.total).toBe(4)
  const before = context()
  const noop = value(
    await preview({
      operation: 'UPDATE_VERSION',
      vesselId: a.id,
      versionId: a.version.id,
      registeredName: 'Passata',
      moment: null,
    }),
  )
  value(await confirm(noop))
  expect(context()).toEqual(before)
  expect(await confirm(noop)).toMatchObject(failure('PREVIEW_EXPIRED'))
  const page = value(
    await service.history({ context: queryContext(), query: { id: a.id, page: 2, pageSize: 2 } }),
  )
  expect(page.versions.items.map((v) => v.registeredName)).toEqual(['Intermedia', 'Futura'])
  const initial = value(
    await preview({
      operation: 'UPDATE_VERSION',
      vesselId: a.id,
      versionId: a.version.id,
      registeredName: 'Prima',
      moment: null,
    }),
  )
  expect(
    await service.confirm({
      context: initial.context,
      payload: { previewId: initial.previewId, registeredName: 'Manomessa' } as {
        previewId: string
      },
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
})
it('persiste entrambe le occorrenze ambigue e rifiuta offset e fusi imposti dal chiamante', async () => {
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const a = value(await create('Iniziale'))
  const localDateTime = '2026-10-25T02:30'
  expect(
    await service.resolveVersionMoment({
      context: queryContext(),
      query: { vesselId: a.id, moment: { localDateTime, selectedOffset: '+03:00' } },
    }),
  ).toMatchObject(failure('INVALID_OFFSET'))
  expect(
    await service.resolveVersionMoment({
      context: queryContext(),
      query: { vesselId: a.id, moment: { localDateTime, selectedOffset: null }, zoneId: 'UTC' } as {
        vesselId: string
        moment: { localDateTime: string; selectedOffset: null }
      },
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  await apply({
    operation: 'INSERT_VERSION',
    vesselId: a.id,
    registeredName: 'Prima occorrenza',
    moment: { localDateTime, selectedOffset: '+02:00' },
  })
  await apply({
    operation: 'INSERT_VERSION',
    vesselId: a.id,
    registeredName: 'Seconda occorrenza',
    moment: { localDateTime, selectedOffset: '+01:00' },
  })
  expect((await history(a.id)).versions.items.slice(1).map((v) => v.effectiveMoment)).toEqual([
    { localDateTime, zoneId: 'Europe/Rome', offset: '+02:00', utc: '2026-10-25T00:30:00.000Z' },
    { localDateTime, zoneId: 'Europe/Rome', offset: '+01:00', utc: '2026-10-25T01:30:00.000Z' },
  ])
})
