import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { AgencyService } from '../../src/backend/application/agencies/agency-service'
import { CustomerService } from '../../src/backend/application/customers/customer-service'
import { TimeService } from '../../src/backend/application/time/time-service'
import { AgencyRepository } from '../../src/backend/infrastructure/database/agency-repository'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { AgencyChangeDto, AgencyPreviewDto } from '../../src/shared/contracts/agencies'

let folder: string
let archives: ArchiveService
let service: AgencyService
let now: string
const context = () => archives.context()!
const db = () => archives.coordinator.requireSession().database
const queryContext = () => ({ sessionId: context().sessionId })
const value = <T>(r: ApplicationResult<T>) => {
  if (!r.ok) throw new Error(r.error.code + ': ' + r.error.message)
  return r.value
}
const failure = (code: string) => ({ ok: false, error: { code } })
const create = (businessName: string) =>
  service.create({ context: context(), payload: { businessName } })
const list = (search = '', page = 1, pageSize = 10, selectableOnly = false) =>
  service.list({ context: queryContext(), query: { search, page, pageSize, selectableOnly } })
const history = async (id: string) =>
  value(await service.history({ context: queryContext(), query: { id, page: 1, pageSize: 100 } }))
const preview = (payload: AgencyChangeDto) => service.preview({ context: context(), payload })
const confirm = (p: AgencyPreviewDto) =>
  service.confirm({ context: p.context, payload: { previewId: p.previewId } })
const apply = async (payload: AgencyChangeDto) =>
  value(await confirm(value(await preview(payload))))
const moment = { localDateTime: '2027-01-01T10:00', selectedOffset: null }
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p06-'))
  archives = new ArchiveService()
  now = '2026-11-11T08:00:00.000Z'
  service = new AgencyService(archives.coordinator, () => now)
  await archives.create(join(folder, 'A.ormeggi'), 'A')
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
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
  expect(a.version.businessName).toBe('Società')
  expect(a.version.effectiveFrom).toBeNull()
  expect(await create('SOCIETA\u0300')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  expect(await service.get({ context: queryContext(), query: { id: other.id } })).toMatchObject(
    failure('NOT_FOUND'),
  )
  await apply({
    operation: 'UPDATE_VERSION',
    agencyId: a.id,
    versionId: a.version.id,
    businessName: 'Nuova società',
    moment: null,
  })
  expect(value(await list('SOCIETA\u0300')).items[0].id).toBe(a.id)
  expect(await create('SOCIETÀ')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  await apply({ operation: 'DELETE_AGENCY', agencyId: a.id })
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
  for (const businessName of ['', ' '.repeat(3), '𐐀'.repeat(201)])
    expect(await create(businessName)).toMatchObject(failure('VALIDATION_ERROR'))
  const a = value(await create('𐐀'.repeat(200)))
  expect(a.code).toBe(1)
  expect(
    await service.create({
      context: context(),
      payload: { businessName: 'Extra', taxCode: 'no' } as { businessName: string },
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
  db().sqlite.prepare('UPDATE agency_code_counter SET last_code = ?').run(Number.MAX_SAFE_INTEGER)
  const before = context()
  expect(await create('Overflow')).toMatchObject(failure('LIMIT_EXCEEDED'))
  expect(context()).toEqual(before)
})

it('richiede configurazione iniziale, risolve gap e overlap nel backend e conserva la tupla storica', async () => {
  const a = value(await create('Iniziale'))
  expect(
    await preview({ operation: 'INSERT_VERSION', agencyId: a.id, businessName: 'Futura', moment }),
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
      query: { agencyId: a.id, moment: { localDateTime, selectedOffset } },
    })
  expect(await resolve('2026-03-29T02:30')).toMatchObject(failure('LOCAL_TIME_NOT_EXISTENT'))
  expect(value(await resolve('2026-10-25T02:30'))).toMatchObject({
    status: 'CHOICE_REQUIRED',
    choices: [{ offset: '+02:00' }, { offset: '+01:00' }],
  })
  expect(
    await preview({
      operation: 'INSERT_VERSION',
      agencyId: a.id,
      businessName: 'Ambigua',
      moment: { localDateTime: '2026-10-25T02:30', selectedOffset: null },
    }),
  ).toMatchObject(failure('LOCAL_TIME_AMBIGUOUS'))
  await apply({ operation: 'INSERT_VERSION', agencyId: a.id, businessName: 'Futura', moment })
  const saved = (await history(a.id)).versions.items[1]
  expect(saved).toMatchObject({
    phase: 'FUTURE',
    effectiveMoment: { zoneId: 'Europe/Rome', utc: '2027-01-01T09:00:00.000Z', offset: '+01:00' },
  })
  const before = context()
  now = saved.effectiveFrom!
  expect((await history(a.id)).agency.version.id).toBe(saved.id)
  expect(context()).toEqual(before)
  // Simulate a historical IANA tuple that must survive descriptive correction without re-resolution.
  db()
    .sqlite.prepare(
      'UPDATE agency_versions SET effective_utc_offset = ?, effective_from = ? WHERE id = ?',
    )
    .run('+01:00:01', '2027-01-01T08:59:59.000Z', saved.id)
  await apply({
    operation: 'UPDATE_VERSION',
    agencyId: a.id,
    versionId: saved.id,
    businessName: 'Corretta',
    moment: { localDateTime: moment.localDateTime, selectedOffset: '+01:00:01' },
  })
  expect((await history(a.id)).versions.items[1].effectiveMoment).toMatchObject({
    offset: '+01:00:01',
    utc: '2027-01-01T08:59:59.000Z',
  })
  await apply({ operation: 'DELETE_VERSION', agencyId: a.id, versionId: saved.id })
  expect(await create('Futura')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  expect(await create('Corretta')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  expect(
    await preview({ operation: 'DELETE_VERSION', agencyId: a.id, versionId: a.version.id }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await preview({
      operation: 'UPDATE_VERSION',
      agencyId: a.id,
      versionId: a.version.id,
      businessName: 'X',
      moment,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await preview({
      operation: 'INSERT_VERSION',
      agencyId: a.id,
      businessName: 'Iniziale',
      moment,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
})

it('mantiene riferimenti reali disattivando, impedisce nuove selezioni e blocca eliminazioni con FK anche CASCADE', async () => {
  const a = value(await create('Referenziata'))
  const sql = db().sqlite
  sql.exec(
    'CREATE TABLE actual_reference (id TEXT PRIMARY KEY, agency_id TEXT REFERENCES agencies(id) ON DELETE CASCADE, version_id TEXT REFERENCES agency_versions(id) ON DELETE CASCADE)',
  )
  sql.prepare('INSERT INTO actual_reference VALUES (?,?,?)').run('ref', a.id, a.version.id)
  expect(new AgencyRepository(db(), now).requireSelectable(a.id).id).toBe(a.id)
  await apply({ operation: 'DEACTIVATE_AGENCY', agencyId: a.id })
  expect(() => new AgencyRepository(db(), now).requireSelectable(a.id)).toThrow(/selezionabile/)
  expect(value(await list('', 1, 10, true)).total).toBe(0)
  expect(value(await list()).total).toBe(1)
  expect(sql.prepare('SELECT count(*) FROM actual_reference').pluck().get()).toBe(1)
  const blocked = value(await preview({ operation: 'DELETE_AGENCY', agencyId: a.id }))
  expect(blocked.status).toBe('BLOCKED')
  expect(await confirm(blocked)).toMatchObject(failure('PREVIEW_BLOCKED'))
  const correction = value(
    await preview({
      operation: 'UPDATE_VERSION',
      agencyId: a.id,
      versionId: a.version.id,
      businessName: 'Impossibile',
      moment: null,
    }),
  )
  expect(correction.status).toBe('BLOCKED')
  value(await service.reactivate({ context: context(), payload: { agencyId: a.id } }))
  expect(new AgencyRepository(db(), now).requireSelectable(a.id).id).toBe(a.id)
  sql.exec('DELETE FROM actual_reference')
  await apply({ operation: 'DELETE_AGENCY', agencyId: a.id })
})

it('rifiuta anteprime di altra tipologia, revisioni e sessioni obsolete; non consuma anteprime dopo rollback', async () => {
  const a = value(await create('Prima'))
  const p = value(
    await preview({
      operation: 'UPDATE_VERSION',
      agencyId: a.id,
      versionId: a.version.id,
      businessName: 'Seconda',
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
    "CREATE TRIGGER fail_update BEFORE UPDATE ON agency_versions BEGIN SELECT RAISE(ABORT, 'forced'); END;",
  )
  expect(await confirm(p)).toMatchObject({ ok: false })
  expect(context()).toEqual(p.context)
  expect((await history(a.id)).agency.version.businessName).toBe('Prima')
  expect(
    sql
      .prepare(
        "SELECT count(*) FROM agency_identifier_reservations WHERE normalized_business_name = 'SECONDA'",
      )
      .pluck()
      .get(),
  ).toBe(0)
  sql.exec('DROP TRIGGER fail_update')
  value(await confirm(p))
  expect(await confirm(p)).toMatchObject(failure('REVISION_CONFLICT'))
  const d = value(await preview({ operation: 'DELETE_AGENCY', agencyId: a.id }))
  sql.exec(
    "CREATE TRIGGER fail_delete BEFORE DELETE ON agencies BEGIN SELECT RAISE(ABORT, 'forced'); END;",
  )
  expect(await confirm(d)).toMatchObject({ ok: false })
  expect((await history(a.id)).versions.total).toBe(1)
  expect(await create('Prima')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  sql.exec('DROP TRIGGER fail_delete')
  value(await confirm(d))
  const prior = context()
  const stale = value(
    await preview({ operation: 'DEACTIVATE_AGENCY', agencyId: value(await create('Terza')).id }),
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
    "CREATE TRIGGER fail_reservation BEFORE INSERT ON agency_identifier_reservations BEGIN SELECT RAISE(ABORT, 'forced'); END;",
  )
  expect(await create('Prima')).toMatchObject({ ok: false })
  expect(context()).toEqual(before)
  expect(sql.prepare('SELECT count(*) FROM agencies').pluck().get()).toBe(0)
  expect(sql.prepare('SELECT count(*) FROM agency_versions').pluck().get()).toBe(0)
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
  await apply({ operation: 'INSERT_VERSION', agencyId: a.id, businessName: 'Futura', moment })
  await apply({
    operation: 'INSERT_VERSION',
    agencyId: a.id,
    businessName: 'Passata',
    moment: { localDateTime: '2025-01-01T10:00', selectedOffset: null },
  })
  await apply({
    operation: 'INSERT_VERSION',
    agencyId: a.id,
    businessName: 'Intermedia',
    moment: { localDateTime: '2026-01-01T10:00', selectedOffset: null },
  })
  expect((await history(a.id)).versions.items.map((v) => v.businessName)).toEqual([
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
      agencyId: a.id,
      businessName: 'Duplicata',
      moment,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  await apply({
    operation: 'UPDATE_VERSION',
    agencyId: a.id,
    versionId: a.version.id,
    businessName: 'Passata',
    moment: null,
  })
  expect((await history(a.id)).versions.total).toBe(4)
  const before = context()
  const noop = value(
    await preview({
      operation: 'UPDATE_VERSION',
      agencyId: a.id,
      versionId: a.version.id,
      businessName: 'Passata',
      moment: null,
    }),
  )
  value(await confirm(noop))
  expect(context()).toEqual(before)
  expect(await confirm(noop)).toMatchObject(failure('PREVIEW_EXPIRED'))
  const page = value(
    await service.history({ context: queryContext(), query: { id: a.id, page: 2, pageSize: 2 } }),
  )
  expect(page.versions.items.map((v) => v.businessName)).toEqual(['Intermedia', 'Futura'])
  const initial = value(
    await preview({
      operation: 'UPDATE_VERSION',
      agencyId: a.id,
      versionId: a.version.id,
      businessName: 'Prima',
      moment: null,
    }),
  )
  expect(
    await service.confirm({
      context: initial.context,
      payload: { previewId: initial.previewId, businessName: 'Manomessa' } as { previewId: string },
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
      query: { agencyId: a.id, moment: { localDateTime, selectedOffset: '+03:00' } },
    }),
  ).toMatchObject(failure('INVALID_OFFSET'))
  expect(
    await service.resolveVersionMoment({
      context: queryContext(),
      query: { agencyId: a.id, moment: { localDateTime, selectedOffset: null }, zoneId: 'UTC' } as {
        agencyId: string
        moment: { localDateTime: string; selectedOffset: null }
      },
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  await apply({
    operation: 'INSERT_VERSION',
    agencyId: a.id,
    businessName: 'Prima occorrenza',
    moment: { localDateTime, selectedOffset: '+02:00' },
  })
  await apply({
    operation: 'INSERT_VERSION',
    agencyId: a.id,
    businessName: 'Seconda occorrenza',
    moment: { localDateTime, selectedOffset: '+01:00' },
  })
  expect((await history(a.id)).versions.items.slice(1).map((v) => v.effectiveMoment)).toEqual([
    { localDateTime, zoneId: 'Europe/Rome', offset: '+02:00', utc: '2026-10-25T00:30:00.000Z' },
    { localDateTime, zoneId: 'Europe/Rome', offset: '+01:00', utc: '2026-10-25T01:30:00.000Z' },
  ])
})
