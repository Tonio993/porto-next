import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { BerthService } from '../../src/backend/application/berths/berth-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { BerthRepository } from '../../src/backend/infrastructure/database/berth-repository'
import { APPLICATION_ID } from '../../src/backend/infrastructure/database/migrations'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { BerthChangeDto, BerthPreviewDto } from '../../src/shared/contracts/berths'
import type { PortDto } from '../../src/shared/contracts/ports'

let folder: string
let archives: ArchiveService
let ports: PortService
let berths: BerthService
let port: PortDto
let now: string
const context = () => archives.context()!
const session = () => archives.coordinator.requireSession().database
const queryContext = () => ({ sessionId: context().sessionId })
const value = <T>(result: ApplicationResult<T>) => {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
  return result.value
}
const failure = (code: string) => ({ ok: false, error: { code } })
const createPort = async (name: string) =>
  value(
    await ports.create({
      context: context(),
      payload: { name, locality: 'Genova', countryCode: 'IT', initialZoneId: 'Europe/Rome' },
    }),
  )
const create = (name: string, portId = port.id) =>
  berths.create({ context: context(), payload: { name, portId } })
const list = async (selectableOnly = false, portId = port.id) =>
  value(
    await berths.list({
      context: queryContext(),
      query: { portId, page: 1, pageSize: 10, selectableOnly },
    }),
  )
const history = async (id: string) =>
  value(
    await berths.history({
      context: queryContext(),
      query: { id, page: 1, pageSize: 10 },
    }),
  )
const preview = (payload: BerthChangeDto) => berths.preview({ context: context(), payload })
const confirm = (preview: BerthPreviewDto) =>
  berths.confirm({
    context: preview.context,
    payload: { previewId: preview.previewId },
  })
const apply = async (change: BerthChangeDto) => value(await confirm(value(await preview(change))))
const moment = { localDateTime: '2027-01-01T10:00', selectedOffset: null }

beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p05-'))
  archives = new ArchiveService()
  now = '2026-11-10T08:00:00.000Z'
  ports = new PortService(archives.coordinator, () => now)
  berths = new BerthService(archives.coordinator, () => now)
  await archives.create(join(folder, 'A.ormeggi'), 'A')
  port = await createPort('Porto A')
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})

it('conserva prenotazioni Unicode per porto, appartenenza e progressivi globali dopo riapertura', async () => {
  const other = await createPort('Porto B')
  const a = value(await create('  Mòlo  '))
  const b = value(await create('MO\u0300LO', other.id))
  expect([a.code, b.code]).toEqual([1, 2])
  expect(a.version.name).toBe('Mòlo')
  expect(await create('MO\u0300LO')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  expect(() =>
    session().sqlite.prepare('UPDATE berths SET port_id = ? WHERE id = ?').run(other.id, a.id),
  ).toThrow('berth port is immutable')
  expect(() =>
    session()
      .sqlite.prepare('UPDATE berth_identifier_reservations SET port_id = ? WHERE berth_id = ?')
      .run(other.id, a.id),
  ).toThrow(/constraint/i)
  expect(
    await berths.preview({
      context: context(),
      payload: {
        operation: 'UPDATE_VERSION',
        berthId: a.id,
        versionId: a.version.id,
        name: 'Cambiata',
        moment: null,
        portId: other.id,
      } as BerthChangeDto,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  await apply({
    operation: 'UPDATE_VERSION',
    berthId: a.id,
    versionId: a.version.id,
    name: 'Cambiata',
    moment: null,
  })
  await apply({ operation: 'INSERT_VERSION', berthId: a.id, name: 'Temporanea', moment })
  const future = (await history(a.id)).versions.items[1]
  await apply({ operation: 'DELETE_VERSION', berthId: a.id, versionId: future.id })
  expect(await create('Temporanea')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  expect(await create('MÒLO')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  await apply({
    operation: 'UPDATE_VERSION',
    berthId: a.id,
    versionId: a.version.id,
    name: 'Mòlo',
    moment: null,
  })
  await apply({ operation: 'DELETE_BERTH', berthId: a.id })
  await archives.close()
  await archives.open(join(folder, 'A.ormeggi'))
  expect(value(await create('Temporanea')).code).toBe(3)
  expect((await list(false, other.id)).items[0]).toMatchObject({
    id: b.id,
    portId: other.id,
    code: 2,
  })
})

it('deriva la selezionabilità e mostra le banchine reali negli effetti e nei blocchi P04', async () => {
  const a = value(await create('Prima'))
  const b = value(await create('Seconda'))
  const other = await createPort('Porto B')
  await apply({ operation: 'DEACTIVATE_BERTH', berthId: b.id })
  const deactivate = value(
    await ports.previewDeactivate({ context: context(), payload: { portId: port.id } }),
  )
  expect(deactivate.effects.items.map(({ reference }) => reference.id)).toEqual([port.id, a.id])
  expect(deactivate.effects.items[1].changes).toEqual([
    { field: 'selectable', before: 'Sì', after: 'No' },
  ])
  expect((await list(true)).items.map(({ id }) => id)).toEqual([a.id])
  expect(() => new BerthRepository(session(), now).requireSelectable(other.id, a.id)).toThrow(
    /selezionabile/,
  )
  value(
    await ports.confirmDeactivate({
      context: deactivate.context,
      payload: { previewId: deactivate.previewId },
    }),
  )
  expect(await create('Terza')).toMatchObject(failure('NOT_SELECTABLE'))
  expect((await list(true)).total).toBe(0)
  expect((await list()).items).toMatchObject([
    { status: 'ACTIVE', selectable: false },
    { status: 'INACTIVE', selectable: false },
  ])
  expect(() => new BerthRepository(session(), now).requireSelectable(port.id, a.id)).toThrow(
    /selezionabile/,
  )
  value(await berths.reactivate({ context: context(), payload: { berthId: b.id } }))
  expect((await history(b.id)).berth).toMatchObject({ status: 'ACTIVE', selectable: false })
  await apply({ operation: 'DEACTIVATE_BERTH', berthId: b.id })
  value(await ports.reactivate({ context: context(), payload: { portId: port.id } }))
  expect(new BerthRepository(session(), now).requireSelectable(port.id, a.id).id).toBe(a.id)
  expect((await list(true)).items.map(({ id }) => id)).toEqual([a.id])
  await apply({ operation: 'DELETE_BERTH', berthId: a.id })
  const blocked = value(
    await ports.previewDelete({ context: context(), payload: { portId: port.id } }),
  )
  expect(blocked).toMatchObject({
    status: 'BLOCKED',
    blockers: [{ reference: { kind: 'BERTH', id: b.id } }],
  })
  expect(
    await ports.confirmDelete({
      context: blocked.context,
      payload: { previewId: blocked.previewId },
    }),
  ).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(() => session().sqlite.prepare('DELETE FROM ports WHERE id = ?').run(port.id)).toThrow(
    /foreign key/i,
  )
  await apply({ operation: 'DELETE_BERTH', berthId: b.id })
  const allowed = value(
    await ports.previewDelete({ context: context(), payload: { portId: port.id } }),
  )
  value(
    await ports.confirmDelete({
      context: allowed.context,
      payload: { previewId: allowed.previewId },
    }),
  )
})

it('risolve versioni nel fuso del porto, aggiorna al confine e rifiuta anteprime di revisione o tipo errati', async () => {
  const a = value(await create('Prima'))
  const initial = a.version.id
  expect(
    await preview({ operation: 'DELETE_VERSION', berthId: a.id, versionId: initial }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await preview({
      operation: 'UPDATE_VERSION',
      berthId: a.id,
      versionId: initial,
      name: 'Corretta',
      moment,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await preview({
      operation: 'INSERT_VERSION',
      berthId: a.id,
      name: 'Ambigua',
      moment: { ...moment, localDateTime: '2026-10-25T02:30' },
    }),
  ).toMatchObject(failure('LOCAL_TIME_AMBIGUOUS'))
  const start = context()
  const insertion = value(
    await preview({ operation: 'INSERT_VERSION', berthId: a.id, name: 'Futura', moment }),
  )
  expect(context()).toEqual(start)
  expect((await history(a.id)).versions.total).toBe(1)
  expect(
    await ports.confirmDelete({ context: start, payload: { previewId: insertion.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  value(await confirm(insertion))
  expect(await confirm(insertion)).toMatchObject(failure('REVISION_CONFLICT'))
  const planned = (await history(a.id)).versions.items[1]
  expect(planned).toMatchObject({
    phase: 'FUTURE',
    effectiveMoment: { zoneId: 'Europe/Rome', offset: '+01:00', utc: '2027-01-01T09:00:00.000Z' },
  })
  expect((await list()).items[0].version.id).toBe(initial)
  now = '2027-01-01T09:00:00.000Z'
  expect((await list()).items[0].version.id).toBe(planned.id)
  const correction = value(
    await preview({
      operation: 'UPDATE_VERSION',
      berthId: a.id,
      versionId: planned.id,
      name: 'Corretta',
      moment: { ...moment, selectedOffset: '+01:00' },
    }),
  )
  value(await confirm(correction))
  expect((await history(a.id)).berth.version).toMatchObject({
    id: planned.id,
    name: 'Corretta',
    effectiveMoment: planned.effectiveMoment,
  })
})

it('impedisce la cascata su riferimenti esterni e annulla scritture, prenotazioni e contatore in caso di errore', async () => {
  const a = value(await create('Prima'))
  const b = value(await create('Seconda'))
  const sql = session().sqlite
  sql.exec(`CREATE TABLE berth_use (
    port_id TEXT, berth_id TEXT, FOREIGN KEY (port_id, berth_id) REFERENCES BERTHS(port_id, id) ON DELETE CASCADE
  );
  CREATE TABLE berth_version_use (id TEXT REFERENCES berth_versions(id) ON DELETE CASCADE);`)
  sql.prepare('INSERT INTO berth_use VALUES (?, ?)').run(port.id, a.id)
  sql.prepare('INSERT INTO berth_version_use VALUES (?)').run(a.version.id)
  const blocked = value(await preview({ operation: 'DELETE_BERTH', berthId: a.id }))
  expect(blocked.blockers).toHaveLength(2)
  expect(await confirm(blocked)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(
    value(
      await preview({
        operation: 'UPDATE_VERSION',
        berthId: a.id,
        versionId: a.version.id,
        name: 'Correzione',
        moment: null,
      }),
    ).status,
  ).toBe('BLOCKED')
  await apply({ operation: 'DEACTIVATE_BERTH', berthId: a.id })
  expect(sql.prepare('SELECT count(*) FROM berth_use').pluck().get()).toBe(1)
  const before = context()
  sql.exec(
    "CREATE TRIGGER fail_berth_version BEFORE INSERT ON berth_versions BEGIN SELECT RAISE(ABORT, 'forced'); END;",
  )
  expect(await create('Terza')).toMatchObject({ ok: false })
  expect(context()).toEqual(before)
  expect((await list()).total).toBe(2)
  expect(sql.prepare('SELECT last_code FROM berth_code_counter').pluck().get()).toBe(2)
  sql.exec(
    "DROP TRIGGER fail_berth_version; CREATE TRIGGER fail_berth_update BEFORE UPDATE ON berth_versions BEGIN SELECT RAISE(ABORT, 'forced'); END;",
  )
  const correction = value(
    await preview({
      operation: 'UPDATE_VERSION',
      berthId: b.id,
      versionId: b.version.id,
      name: 'Terza',
      moment: null,
    }),
  )
  expect(await confirm(correction)).toMatchObject({ ok: false })
  expect(context()).toEqual(before)
  expect((await history(b.id)).berth.version.name).toBe('Seconda')
  expect(
    sql
      .prepare("SELECT count(*) FROM berth_identifier_reservations WHERE normalized_name = 'TERZA'")
      .pluck()
      .get(),
  ).toBe(0)
  sql.exec('DROP TRIGGER fail_berth_update')
  value(await confirm(correction))
  const deletion = value(await preview({ operation: 'DELETE_BERTH', berthId: b.id }))
  expect(deletion.status).toBe('READY')
  sql.exec(
    "CREATE TRIGGER fail_berth_delete BEFORE DELETE ON berths BEGIN SELECT RAISE(ABORT, 'forced'); END;",
  )
  expect(await confirm(deletion)).toMatchObject({ ok: false })
  expect((await history(b.id)).berth.version.name).toBe('Terza')
  expect(await create('Seconda')).toMatchObject(failure('DUPLICATE_IDENTIFIER'))
  sql.exec('DROP TRIGGER fail_berth_delete')
  value(await confirm(deletion))
})

function v5(path: string, obstructed = false) {
  const db = new Database(path)
  try {
    for (const name of readdirSync('migrations')
      .filter((name) => /^000[1-5]_/.test(name))
      .sort())
      db.exec(readFileSync(join('migrations', name), 'utf8'))
    db.pragma(`application_id = ${APPLICATION_ID}`)
    db.pragma('user_version = 5')
    db.exec(`INSERT INTO archive_metadata (singleton,id,name,created_at,updated_at,revision) VALUES
      (1,'00000000-0000-4000-8000-000000000001','V5','2026-01-01T00:00:00.000Z','2026-01-02T00:00:00.000Z',12);
      INSERT INTO ports VALUES ('00000000-0000-4000-8000-000000000002',3,'ACTIVE');
      UPDATE port_code_counter SET last_code = 3;
      INSERT INTO port_versions (id,port_id,name,locality,country_code) VALUES ('initial','00000000-0000-4000-8000-000000000002','V5 Porto','Genova','IT');
      INSERT INTO port_versions (id,port_id,name,locality,country_code,effective_from,effective_local_date_time,effective_zone_id,effective_utc_offset)
        VALUES ('future','00000000-0000-4000-8000-000000000002','V5 Porto futuro','Genova','IT','2027-01-01T09:00:00.000Z','2027-01-01T10:00','Europe/Rome','+01:00');
      INSERT INTO port_identifier_reservations VALUES ('reservation','00000000-0000-4000-8000-000000000002','V5 PORTO','GENOVA','IT','2026-01-01T00:00:00.000Z');
      INSERT INTO port_time_zones VALUES ('zone','00000000-0000-4000-8000-000000000002',NULL,'Europe/Rome');`)
    if (obstructed) db.exec('CREATE TABLE berth_versions (existing TEXT)')
  } finally {
    db.close()
  }
}

it('migra v5 con copia preventiva e mantiene dati, metadati e contatori distinti', async () => {
  const path = join(folder, 'v5.ormeggi')
  v5(path)
  await archives.close()
  const opened = await archives.open(path)
  expect(opened).toMatchObject({ schemaVersion: 17, updatedAt: '2026-01-02T00:00:00.000Z' })
  expect(context().revision).toBe('12')
  const parent = '00000000-0000-4000-8000-000000000002'
  expect(value(await ports.get({ context: queryContext(), query: { id: parent } })).code).toBe(3)
  const migrated = value(
    await ports.history({
      context: queryContext(),
      query: { id: parent, page: 1, pageSize: 10 },
    }),
  )
  expect(migrated.versions.items).toMatchObject([
    { id: 'initial', phase: 'CURRENT' },
    { id: 'future', phase: 'FUTURE', effectiveMoment: { zoneId: 'Europe/Rome', offset: '+01:00' } },
  ])
  expect(
    session()
      .sqlite.prepare('SELECT normalized_name FROM port_identifier_reservations')
      .pluck()
      .get(),
  ).toBe('V5 PORTO')
  expect((await list(false, parent)).total).toBe(0)
  expect(value(await create('Prima v6', parent)).code).toBe(1)
  const copy = readdirSync(folder).find((name) => name.includes('.prima-v17-'))
  expect(copy).toBeDefined()
  const snapshot = new Database(join(folder, copy!), { readonly: true })
  try {
    expect(snapshot.pragma('user_version', { simple: true })).toBe(5)
    expect(
      snapshot.prepare("SELECT name FROM sqlite_schema WHERE name = 'berths'").get(),
    ).toBeUndefined()
  } finally {
    snapshot.close()
  }
})

it('ripristina v5 quando la migrazione fallisce dopo le prime istruzioni', async () => {
  const path = join(folder, 'rollback.ormeggi')
  v5(path, true)
  const original = context()
  await expect(archives.open(path)).rejects.toThrow()
  expect(context()).toEqual(original)
  const db = new Database(path, { readonly: true })
  try {
    expect(db.pragma('user_version', { simple: true })).toBe(5)
    expect(
      db
        .prepare("SELECT name FROM sqlite_schema WHERE name IN ('berths', 'berth_code_counter')")
        .all(),
    ).toEqual([])
    expect(db.prepare('SELECT revision FROM archive_metadata').pluck().get()).toBe(12)
  } finally {
    db.close()
  }
})

it('PR05 ricerca backend globale: 26 banchine, pagine e ricerca letterale Unicode per porto senza scritture', async () => {
  const other = await createPort('Altro porto PR05')
  const items = []
  for (let index = 1; index <= 26; index++)
    items.push(value(await create('PR05 Molo ' + String(index).padStart(2, '0'))))
  const special = value(await create('Mòlo 100%_Speciale'))
  value(await create('Mòlo 100%_Speciale', other.id))
  const before = { ...context() }
  const query = (search: string, page = 1, portId = port.id) =>
    berths.list({
      context: queryContext(),
      query: { portId, search, page, pageSize: 25, selectableOnly: false },
    })
  const first = value(await query('pr05'))
  const second = value(await query('PR05', 2))
  expect(first).toMatchObject({ total: 26, page: 1, pageSize: 25 })
  expect(first.items).toHaveLength(25)
  expect(second.items.map((v) => v.id)).toEqual([items[25].id])
  expect(second.total).toBe(26)
  expect(value(await query('molo 26')).items.map((v) => v.id)).toEqual([items[25].id])
  expect(value(await query('mo\u0300lo 100%_')).items.map((v) => v.id)).toEqual([special.id])
  expect(value(await query('100%X')).total).toBe(0)
  expect(value(await query('100%_', 1, other.id)).items).toHaveLength(1)
  expect(value(await query('inesistente'))).toMatchObject({ total: 0, items: [] })
  expect(context()).toEqual(before)
})

it('PR05 ricerca banchine per nomi storici prenotati, stato e porto disattivato; compatibilità query senza ricerca', async () => {
  const berth = value(await create('Nome originale PR05'))
  await apply({
    operation: 'UPDATE_VERSION',
    berthId: berth.id,
    versionId: berth.version.id,
    name: 'Nome corrente PR05',
    moment: null,
  })
  const query = (search: string, selectableOnly = false) =>
    berths.list({
      context: queryContext(),
      query: { portId: port.id, search, page: 1, pageSize: 25, selectableOnly },
    })
  expect(value(await query('originale')).items[0].version.name).toBe('Nome corrente PR05')
  expect(value(await query('corrente')).items).toHaveLength(1)
  await apply({ operation: 'DEACTIVATE_BERTH', berthId: berth.id })
  expect(value(await query('originale', true)).total).toBe(0)
  expect(value(await query('originale')).items[0].selectable).toBe(false)
  expect((await list()).items.map((v) => v.id)).toEqual([berth.id])
  const active = value(await create('Ancora attiva'))
  const p = value(
    await ports.previewDeactivate({ context: context(), payload: { portId: port.id } }),
  )
  value(await ports.confirmDeactivate({ context: p.context, payload: { previewId: p.previewId } }))
  expect(value(await query('attiva', true)).total).toBe(0)
  expect(value(await query('attiva')).items[0]).toMatchObject({ id: active.id, selectable: false })
})

it('PR05 ricerca banchine: validazione diretta di forma, limiti, contesto e tipi senza revisioni nuove', async () => {
  const query = { portId: port.id, search: '', page: 1, pageSize: 25, selectableOnly: false }
  const before = { ...context() }
  for (const patch of [
    { search: null },
    { search: 3 },
    { search: '😀'.repeat(201) },
    { extra: true },
    { page: 0 },
    { pageSize: 101 },
    { portId: 'wrong' },
    { selectableOnly: null },
  ]) {
    expect(
      await berths.list({ context: queryContext(), query: { ...query, ...patch } as typeof query }),
    ).toMatchObject(failure('VALIDATION_ERROR'))
  }
  expect(
    value(
      await berths.list({ context: queryContext(), query: { ...query, search: '😀'.repeat(200) } }),
    ).total,
  ).toBe(0)
  expect(
    await berths.list({ context: { sessionId: '00000000-0000-4000-8000-000000000000' }, query }),
  ).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  expect(
    await berths.list({
      context: { ...queryContext(), extra: true } as ReturnType<typeof queryContext>,
      query,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(context()).toEqual(before)
})
