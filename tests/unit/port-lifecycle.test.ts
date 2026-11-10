import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { APPLICATION_ID } from '../../src/backend/infrastructure/database/migrations'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { PortDto, PortPreviewDto } from '../../src/shared/contracts/ports'

let folder: string
let archives: ArchiveService
let ports: PortService
let port: PortDto
let now: string
const context = () => archives.context()!
const sql = () => archives.coordinator.requireSession().database.sqlite
const value = <T>(result: ApplicationResult<T>): T => {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
  return result.value
}
const create = async (name = 'Porto A') =>
  value(
    await ports.create({
      context: context(),
      payload: { name, locality: 'Genova', countryCode: 'IT', initialZoneId: 'Europe/Rome' },
    }),
  )
const history = async (page = 1, pageSize = 25) =>
  value(
    await ports.history({
      context: { sessionId: context().sessionId },
      query: { id: port.id, page, pageSize },
    }),
  )
const insert = (
  name: string,
  localDateTime = '2027-01-01T10:00',
  selectedOffset: string | null = null,
) =>
  ports.previewInsertVersion({
    context: context(),
    payload: {
      portId: port.id,
      name,
      locality: 'Genova',
      countryCode: 'IT',
      moment: { localDateTime, selectedOffset },
    },
  })
const confirm = async (preview: PortPreviewDto) =>
  value(
    await ports.confirmInsertVersion({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  )
const update = (
  versionId: string,
  name: string,
  moment: { localDateTime: string; selectedOffset: string | null } | null = null,
) =>
  ports.previewUpdateVersion({
    context: context(),
    payload: { portId: port.id, versionId, name, locality: 'Genova', countryCode: 'IT', moment },
  })

beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p04-'))
  archives = new ArchiveService()
  now = '2026-11-10T08:00:00.000Z'
  ports = new PortService(archives.coordinator, () => now)
  await archives.create(join(folder, 'A.ormeggi'), 'A')
  port = await create()
})
afterEach(async () => {
  vi.useRealTimers()
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})

it('anteprima senza scritture, conferma atomica, versione futura e confine incluso/escluso', async () => {
  const before = archives.current()
  const preview = value(await insert('Porto futuro'))
  expect(context().revision).toBe('1')
  expect(archives.current()).toEqual(before)
  expect(preview).toMatchObject({ status: 'READY', summary: { created: 1, updated: 1 } })
  await confirm(preview)
  expect(context().revision).toBe('2')
  let result = await history()
  expect(result.port.version.name).toBe('Porto A')
  expect(result.port.nextTransitionAt).toBe('2027-01-01T09:00:00.000Z')
  expect(result.versions.items).toMatchObject([
    { effectiveFrom: null, effectiveTo: '2027-01-01T09:00:00.000Z', phase: 'CURRENT' },
    {
      phase: 'FUTURE',
      effectiveMoment: {
        localDateTime: '2027-01-01T10:00',
        zoneId: 'Europe/Rome',
        offset: '+01:00',
        utc: '2027-01-01T09:00:00.000Z',
      },
    },
  ])
  now = '2027-01-01T09:00:00.000Z'
  result = await history()
  expect(result.port.version.name).toBe('Porto futuro')
  expect(result.port.nextTransitionAt).toBeNull()
  expect(result.versions.items.map((version) => version.phase)).toEqual(['HISTORICAL', 'CURRENT'])
  expect(context().revision).toBe('2')
  await archives.close()
  await archives.open(join(folder, 'A.ormeggi'))
  expect((await history()).versions.items).toEqual(result.versions.items)
})

it('inserisce versioni retroattive e intermedie, rifiuta duplicati e nuove versioni identiche', async () => {
  await confirm(value(await insert('Futura')))
  await confirm(value(await insert('Passata', '2025-01-01T00:00')))
  await confirm(value(await insert('Intermedia', '2026-01-01T00:00')))
  expect((await history()).versions.items.map((version) => version.name)).toEqual([
    'Porto A',
    'Passata',
    'Intermedia',
    'Futura',
  ])
  expect(await insert('Duplicata', '2026-01-01T00:00')).toMatchObject({
    ok: false,
    error: { code: 'VALIDATION_ERROR' },
  })
  expect(await insert('Intermedia', '2026-02-01T00:00')).toMatchObject({
    ok: false,
    error: { code: 'VALIDATION_ERROR' },
  })
  expect((await history(2, 2)).versions.items.map((version) => version.name)).toEqual([
    'Intermedia',
    'Futura',
  ])
})

it('osserva un solo istante per dettaglio e cronologia anche se il confine viene attraversato durante la lettura', async () => {
  await confirm(value(await insert('Nuova al confine')))
  let milliseconds = Date.parse('2027-01-01T08:59:59.000Z')
  const crossing = new PortService(archives.coordinator, () => {
    const observed = new Date(milliseconds).toISOString()
    milliseconds += 1000
    return observed
  })
  const result = value(
    await crossing.history({
      context: { sessionId: context().sessionId },
      query: { id: port.id, page: 1, pageSize: 25 },
    }),
  )
  expect(result.port.version.name).toBe('Porto A')
  expect(result.versions.items.find((version) => version.phase === 'CURRENT')?.id).toBe(
    result.port.version.id,
  )
  expect(result.port.nextTransitionAt).toBe('2027-01-01T09:00:00.000Z')
})

it('corregge e rimuove versioni conservando identità, fuso e tutte le prenotazioni storiche', async () => {
  await confirm(value(await insert('Vecchio nome')))
  let versions = (await history()).versions.items
  const future = versions[1]
  const preview = value(
    await update(future.id, 'Corretto', {
      localDateTime: '2026-12-01T10:00',
      selectedOffset: '+01:00',
    }),
  )
  value(
    await ports.confirmUpdateVersion({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  )
  versions = (await history()).versions.items
  expect(versions[1]).toMatchObject({
    id: future.id,
    name: 'Corretto',
    effectiveFrom: '2026-12-01T09:00:00.000Z',
  })
  const removed = value(
    await ports.previewDeleteVersion({
      context: context(),
      payload: { portId: port.id, versionId: future.id },
    }),
  )
  value(
    await ports.confirmDeleteVersion({
      context: removed.context,
      payload: { previewId: removed.previewId },
    }),
  )
  expect((await history()).versions.items).toHaveLength(1)
  for (const name of ['Vecchio nome', 'Corretto'])
    expect(
      await ports.create({
        context: context(),
        payload: { name, locality: 'GENOVA', countryCode: 'IT', initialZoneId: 'Europe/Rome' },
      }),
    ).toMatchObject({ ok: false, error: { code: 'DUPLICATE_IDENTIFIER' } })
  expect((await history()).port.initialZoneId).toBe('Europe/Rome')
  const own = value(await update(versions[0].id, 'Vecchio nome'))
  value(
    await ports.confirmUpdateVersion({
      context: own.context,
      payload: { previewId: own.previewId },
    }),
  )
  expect((await history()).port.version.name).toBe('Vecchio nome')
})

it('protegge la versione iniziale, conserva versioni adiacenti identiche e non scrive sui no-op', async () => {
  const initial = (await history()).versions.items[0]
  expect(
    await ports.previewDeleteVersion({
      context: context(),
      payload: { portId: port.id, versionId: initial.id },
    }),
  ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
  expect(
    await update(initial.id, 'Altro', { localDateTime: '2025-01-01T00:00', selectedOffset: null }),
  ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
  await confirm(value(await insert('Seconda')))
  const corrected = value(await update(initial.id, 'Seconda'))
  value(
    await ports.confirmUpdateVersion({
      context: corrected.context,
      payload: { previewId: corrected.previewId },
    }),
  )
  expect((await history()).versions.total).toBe(2)
  const before = context()
  const noOp = value(await update(initial.id, 'Seconda'))
  value(
    await ports.confirmUpdateVersion({
      context: noOp.context,
      payload: { previewId: noOp.previewId },
    }),
  )
  expect(context()).toEqual(before)
  expect(
    await ports.confirmUpdateVersion({ context: before, payload: { previewId: noOp.previewId } }),
  ).toMatchObject({ ok: false, error: { code: 'PREVIEW_EXPIRED' } })
})

it('usa il fuso del porto e distingue ore inesistenti e le due occorrenze ambigue', async () => {
  expect(await insert('Gap', '2026-03-29T02:30')).toMatchObject({
    ok: false,
    error: { code: 'LOCAL_TIME_NOT_EXISTENT' },
  })
  expect(await insert('Ambigua', '2026-10-25T02:30')).toMatchObject({
    ok: false,
    error: { code: 'LOCAL_TIME_AMBIGUOUS' },
  })
  expect(
    await ports.resolveVersionMoment({
      context: { sessionId: context().sessionId },
      query: {
        portId: port.id,
        moment: { localDateTime: '2026-10-25T02:30', selectedOffset: null },
      },
    }),
  ).toMatchObject({ ok: true, value: { status: 'CHOICE_REQUIRED' } })
  await confirm(value(await insert('Prima', '2026-10-25T02:30', '+02:00')))
  await confirm(value(await insert('Seconda', '2026-10-25T02:30', '+01:00')))
  expect((await history()).versions.items.slice(1).map((version) => version.effectiveFrom)).toEqual(
    ['2026-10-25T00:30:00.000Z', '2026-10-25T01:30:00.000Z'],
  )
})

it('rifiuta conferme obsolete, conferme del metodo errato, payload alterati e sessioni precedenti', async () => {
  const preview = value(await insert('Futura'))
  expect(
    await ports.confirmDelete({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  ).toMatchObject({ ok: false, error: { code: 'PREVIEW_EXPIRED' } })
  expect(
    await ports.confirmInsertVersion({
      context: preview.context,
      payload: { previewId: preview.previewId, name: 'Alterato' },
    } as never),
  ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
  await confirm(preview)
  const stale = value(await insert('Obsoleta', '2028-01-01T00:00'))
  await archives.rename('Aggiornato')
  for (const expected of [stale.context, context()])
    expect(
      await ports.confirmInsertVersion({
        context: expected,
        payload: { previewId: stale.previewId },
      }),
    ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
  const pending = value(await insert('Altra', '2029-01-01T00:00'))
  await archives.saveAs(join(folder, 'copia.ormeggi'))
  expect(
    await ports.confirmInsertVersion({
      context: pending.context,
      payload: { previewId: pending.previewId },
    }),
  ).toMatchObject({ ok: false, context: null, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
  expect(
    await ports.confirmInsertVersion({
      context: context(),
      payload: { previewId: pending.previewId },
    }),
  ).toMatchObject({ ok: false, error: { code: 'PREVIEW_EXPIRED' } })
})

it('un errore SQL dopo la prenotazione annulla chiave, dati, revisione e timestamp e consente una nuova conferma', async () => {
  const id = (await history()).versions.items[0].id
  const preview = value(await update(id, 'Mai prenotato'))
  const before = archives.current()
  sql().exec(
    "CREATE TRIGGER fail_version BEFORE UPDATE ON port_versions BEGIN SELECT RAISE(ABORT, 'injected'); END",
  )
  expect(
    await ports.confirmUpdateVersion({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  ).toMatchObject({ ok: false })
  expect(archives.current()).toEqual(before)
  expect(context()).toEqual(preview.context)
  expect(
    sql()
      .prepare(
        "SELECT count(*) FROM port_identifier_reservations WHERE normalized_name = 'MAI PRENOTATO'",
      )
      .pluck()
      .get(),
  ).toBe(0)
  sql().exec('DROP TRIGGER fail_version')
  value(
    await ports.confirmUpdateVersion({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  )
  expect((await history()).port.version.name).toBe('Mai prenotato')
})

it('analizza riferimenti reali, permette disattivazione e riattivazione e blocca eliminazione senza cascade', async () => {
  sql().exec(
    'CREATE TABLE linked_ports (id INTEGER PRIMARY KEY, port_id TEXT REFERENCES ports(id));',
  )
  sql().prepare('INSERT INTO linked_ports VALUES (1, ?)').run(port.id)
  const blocked = value(
    await ports.previewDelete({ context: context(), payload: { portId: port.id } }),
  )
  expect(blocked.status).toBe('BLOCKED')
  expect(blocked.blockers[0].reference.label).toContain('linked_ports')
  expect(
    await ports.confirmDelete({
      context: blocked.context,
      payload: { previewId: blocked.previewId },
    }),
  ).toMatchObject({ ok: false, error: { code: 'PREVIEW_BLOCKED' } })
  const deactivate = value(
    await ports.previewDeactivate({ context: context(), payload: { portId: port.id } }),
  )
  value(
    await ports.confirmDeactivate({
      context: deactivate.context,
      payload: { previewId: deactivate.previewId },
    }),
  )
  expect((await history()).port.status).toBe('INACTIVE')
  expect(sql().prepare('SELECT count(*) FROM linked_ports').pluck().get()).toBe(1)
  value(await ports.reactivate({ context: context(), payload: { portId: port.id } }))
  expect((await history()).port.status).toBe('ACTIVE')
  const initial = (await history()).versions.items[0]
  sql().exec(
    'CREATE TABLE linked_versions (id INTEGER PRIMARY KEY, version_id TEXT REFERENCES port_versions(id))',
  )
  sql().prepare('INSERT INTO linked_versions VALUES (1, ?)').run(initial.id)
  expect(value(await update(initial.id, 'Modifica referenziata')).status).toBe('BLOCKED')
})

it('elimina atomicamente il porto e libera le chiavi senza riutilizzare il progressivo', async () => {
  await confirm(value(await insert('Storico')))
  const preview = value(
    await ports.previewDelete({ context: context(), payload: { portId: port.id } }),
  )
  value(
    await ports.confirmDelete({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  )
  for (const table of ['ports', 'port_versions', 'port_time_zones', 'port_identifier_reservations'])
    expect(sql().prepare(`SELECT count(*) FROM ${table}`).pluck().get()).toBe(0)
  expect((await create('Storico')).code).toBe(2)
})

it('rifiuta anteprime scadute, anche senza scritture', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-10T08:00:00Z'))
  const preview = value(await insert('Scaduta'))
  vi.setSystemTime(new Date('2026-11-10T08:15:00Z'))
  expect(
    await ports.confirmInsertVersion({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  ).toMatchObject({ ok: false, error: { code: 'PREVIEW_EXPIRED' } })
  expect(context().revision).toBe('1')
})

it('mantiene la tupla storica nelle correzioni descrittive senza reinterpretarla con le regole IANA correnti', async () => {
  await confirm(value(await insert('Versione storica', '2025-01-01T00:00')))
  const version = (await history()).versions.items[1]
  sql()
    .prepare('UPDATE port_versions SET effective_from = ?, effective_utc_offset = ? WHERE id = ?')
    .run('2024-12-31T23:15:00.000Z', '+00:45', version.id)
  const preview = value(
    await update(version.id, 'Descrizione corretta', {
      localDateTime: '2025-01-01T00:00',
      selectedOffset: '+00:45',
    }),
  )
  value(
    await ports.confirmUpdateVersion({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  )
  expect((await history()).versions.items[1].effectiveMoment).toEqual({
    localDateTime: '2025-01-01T00:00',
    zoneId: 'Europe/Rome',
    offset: '+00:45',
    utc: '2024-12-31T23:15:00.000Z',
  })
})

it('pagine degli effetti e riepilogo riguardano tutti gli elementi e la conferma applica anche quelli non visibili', async () => {
  for (let day = 1; day <= 52; ++day)
    await confirm(
      value(
        await insert(
          `Versione ${day}`,
          new Date(Date.UTC(2025, 0, day)).toISOString().slice(0, 16),
        ),
      ),
    )
  const preview = value(
    await ports.previewDelete({ context: context(), payload: { portId: port.id } }),
  )
  expect(preview.summary.deleted).toBe(54)
  expect(preview.effects.items).toHaveLength(50)
  expect(preview.effects.total).toBe(54)
  const second = value(
    await ports.previewEffects({
      context: { sessionId: context().sessionId },
      query: { previewId: preview.previewId, page: 2, pageSize: 50 },
    }),
  )
  expect(second.items).toHaveLength(4)
  value(
    await ports.confirmDelete({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  )
  expect(sql().prepare('SELECT count(*) FROM port_versions').pluck().get()).toBe(0)
})

it('un errore sull’eliminazione della radice ripristina tutte le righe dipendenti e le prenotazioni', async () => {
  await confirm(value(await insert('Futura')))
  const preview = value(
    await ports.previewDelete({ context: context(), payload: { portId: port.id } }),
  )
  const before = await history()
  sql().exec(
    "CREATE TRIGGER fail_delete BEFORE DELETE ON ports BEGIN SELECT RAISE(ABORT, 'injected'); END",
  )
  expect(
    await ports.confirmDelete({
      context: preview.context,
      payload: { previewId: preview.previewId },
    }),
  ).toMatchObject({ ok: false })
  expect(await history()).toEqual(before)
  expect(sql().prepare('SELECT count(*) FROM port_identifier_reservations').pluck().get()).toBe(2)
  expect(sql().prepare('SELECT count(*) FROM port_time_zones').pluck().get()).toBe(1)
  expect(context()).toEqual(preview.context)
})

it('migra un v4 reale con porto iniziale conservando metadati, copia preventiva e vincoli della tupla', async () => {
  const file = join(folder, 'v4.ormeggi')
  const db = new Database(file)
  for (const migration of [
    '0001_archive.sql',
    '0002_archive_revision.sql',
    '0003_company_time_zone.sql',
    '0004_ports.sql',
  ])
    db.exec(readFileSync(join('migrations', migration), 'utf8'))
  db.prepare('INSERT INTO archive_metadata VALUES (1, ?, ?, ?, ?, ?)').run(
    randomUUID(),
    'Storico',
    '2020-01-01T00:00:00.000Z',
    '2021-01-01T00:00:00.000Z',
    20,
  )
  db.prepare("INSERT INTO ports VALUES (?, 1, 'ACTIVE')").run(port.id)
  db.prepare('INSERT INTO port_versions VALUES (?, ?, NULL, ?, ?, ?)').run(
    randomUUID(),
    port.id,
    'Porto precedente',
    'Genova',
    'IT',
  )
  db.prepare('INSERT INTO port_time_zones VALUES (?, ?, NULL, ?)').run(
    randomUUID(),
    port.id,
    'Europe/Rome',
  )
  db.exec('UPDATE port_code_counter SET last_code = 1')
  db.pragma(`application_id = ${APPLICATION_ID}`)
  db.pragma('user_version = 4')
  db.close()
  const opened = await archives.open(file)
  expect(opened).toMatchObject({ schemaVersion: 5, updatedAt: '2021-01-01T00:00:00.000Z' })
  expect(context().revision).toBe('20')
  expect((await history()).versions.items[0].effectiveMoment).toBeNull()
  expect(() =>
    sql().prepare('UPDATE port_versions SET effective_from = ?').run('2025-01-01T00:00:00.000Z'),
  ).toThrow()
  expect(readdirSync(folder).some((name) => name.includes('.prima-v5-'))).toBe(true)
})
