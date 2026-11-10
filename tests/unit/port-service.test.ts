import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { TimeService } from '../../src/backend/application/time/time-service'
import { APPLICATION_ID } from '../../src/backend/infrastructure/database/migrations'
import type { CreatePortDto } from '../../src/shared/contracts/ports'

let folder: string
let archives: ArchiveService
let ports: PortService
const file = (name: string) => join(folder, `${name}.ormeggi`)
const context = () => archives.context()!
const sql = () => archives.coordinator.requireSession().database.sqlite
const input: CreatePortDto = {
  name: 'Porto A',
  locality: 'Genova',
  countryCode: 'IT',
  initialZoneId: 'Europe/Rome',
}
const create = (values: Partial<CreatePortDto> = {}) =>
  ports.create({ context: context(), payload: { ...input, ...values } })
const list = (search = '', page = 1, pageSize = 25) =>
  ports.list({ context: { sessionId: context().sessionId }, query: { page, pageSize, search } })

beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-ports-tests-'))
  archives = new ArchiveService()
  ports = new PortService(archives.coordinator)
  await archives.create(file('A'), 'A')
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})

describe('creazione e consultazione porti', () => {
  it('salva tutte le parti, incrementa una sola revisione e rilegge identità e fuso al riavvio', async () => {
    const result = await create({
      name: ' Porto A ',
      countryCode: ' it ',
      initialZoneId: 'Asia/Kathmandu',
    })
    expect(result).toMatchObject({
      ok: true,
      context: { revision: '1' },
      value: {
        code: 1,
        status: 'ACTIVE',
        initialZoneId: 'Asia/Kathmandu',
        version: { name: 'Porto A', effectiveFrom: null, countryCode: 'IT' },
      },
    })
    if (!result.ok) throw new Error('Creazione fallita')
    const metadata = archives.current()
    expect(sql().prepare('SELECT count(*) FROM port_identifier_reservations').pluck().get()).toBe(1)
    expect(sql().prepare('SELECT effective_from FROM port_time_zones').pluck().get()).toBeNull()
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/London' },
    })
    await archives.close()
    await archives.open(file('A'))
    expect(
      await ports.get({
        context: { sessionId: context().sessionId },
        query: { id: result.value.id },
      }),
    ).toMatchObject({ ok: true, value: result.value })
    expect(await list()).toMatchObject({ ok: true, value: { items: [result.value], total: 1 } })
    expect(archives.current()?.createdAt).toBe(metadata?.createdAt)
    expect(context().revision).toBe('2')
  })

  it('confronta Unicode NFC/maiuscole, conserva accenti e spazi interni e usa tutte le parti della chiave', async () => {
    expect((await create({ name: 'Café', locality: 'Genova' })).ok).toBe(true)
    expect(await create({ name: ' CAFE\u0301 ', locality: ' GENOVA ' })).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_IDENTIFIER', conflicts: [{ reference: { kind: 'PORT' } }] },
    })
    for (const values of [
      { name: 'Cafe' },
      { name: 'Café', locality: 'Savona' },
      { name: 'Café', countryCode: 'FR' },
      { name: 'Porto  A' },
      { name: 'Porto A' },
      { name: 'A|B', locality: 'C' },
      { name: 'A', locality: 'B|C' },
    ])
      expect((await create(values)).ok).toBe(true)
    expect(await list('cafe\u0301')).toMatchObject({ ok: true, value: { total: 3 } })
    expect(context().revision).toBe('8')
  })

  it('rifiuta dati mancanti, paesi e fusi invalidi, attributi inattesi e testi oltre il limite senza scrivere', async () => {
    for (const values of [
      { name: '' },
      { locality: ' ' },
      { name: '😀'.repeat(201) },
      { countryCode: 'ZZ' },
      { initialZoneId: '+01:00' },
      { initialZoneId: '' },
      { status: 'INACTIVE' },
    ]) {
      expect((await create(values)).ok).toBe(false)
    }
    expect(context().revision).toBe('0')
    expect(await list()).toMatchObject({ ok: true, value: { total: 0 } })
    expect((await create({ name: '😀'.repeat(200) })).ok).toBe(true)
  })

  it('un errore all’ultima scrittura annulla porto, contatore, versione, prenotazione, revisione e timestamp', async () => {
    const metadata = archives.current()
    sql().exec(
      "CREATE TRIGGER fail_zone BEFORE INSERT ON port_time_zones BEGIN SELECT RAISE(ABORT, 'injected'); END",
    )
    expect((await create()).ok).toBe(false)
    for (const table of [
      'ports',
      'port_versions',
      'port_identifier_reservations',
      'port_time_zones',
    ])
      expect(sql().prepare(`SELECT count(*) FROM ${table}`).pluck().get()).toBe(0)
    expect(sql().prepare('SELECT last_code FROM port_code_counter').pluck().get()).toBe(0)
    expect(archives.current()).toEqual(metadata)
    expect(context().revision).toBe('0')
    sql().exec('DROP TRIGGER fail_zone')
    expect(await create()).toMatchObject({
      ok: true,
      value: { code: 1 },
      context: { revision: '1' },
    })
  })

  it('i vincoli SQLite proteggono versione iniziale, fuso iniziale, chiave e proprietario', async () => {
    const result = await create()
    if (!result.ok) throw new Error('Creazione fallita')
    const id = result.value.id
    expect(() =>
      sql()
        .prepare(
          'INSERT INTO port_versions (id, port_id, effective_from, name, locality, country_code) VALUES (?, ?, NULL, ?, ?, ?)',
        )
        .run(randomUUID(), id, 'Altro', 'Genova', 'IT'),
    ).toThrow()
    expect(() =>
      sql()
        .prepare('INSERT INTO port_time_zones VALUES (?, ?, NULL, ?)')
        .run(randomUUID(), id, 'Europe/London'),
    ).toThrow()
    expect(() =>
      sql()
        .prepare(
          'INSERT INTO port_identifier_reservations SELECT ?, port_id, normalized_name, normalized_locality, country_code, created_at FROM port_identifier_reservations',
        )
        .run(randomUUID()),
    ).toThrow()
    expect(() =>
      sql()
        .prepare('INSERT INTO port_time_zones VALUES (?, ?, NULL, ?)')
        .run(randomUUID(), randomUUID(), 'Europe/Rome'),
    ).toThrow()
  })

  it('non riutilizza codici dopo eliminazione e rifiuta overflow senza scritture parziali', async () => {
    await create()
    // Simulate a future allowed physical deletion; no deletion API is exposed in P03.
    sql().exec(
      'DELETE FROM port_time_zones; DELETE FROM port_identifier_reservations; DELETE FROM port_versions; DELETE FROM ports',
    )
    expect(await create()).toMatchObject({ ok: true, value: { code: 2 } })
    sql().prepare('UPDATE port_code_counter SET last_code = ?').run(Number.MAX_SAFE_INTEGER)
    const previous = context()
    expect(await create({ name: 'Overflow' })).toMatchObject({
      ok: false,
      error: { code: 'LIMIT_EXCEEDED' },
    })
    expect(context()).toEqual(previous)
    expect(await list()).toMatchObject({ ok: true, value: { total: 1 } })
  })

  it('pagina e cerca letteralmente senza modificare revisione; valida query e dettaglio', async () => {
    await create({ name: 'Porto %_' })
    await create({ locality: 'Savona' })
    const before = context()
    expect(await list('', 2, 1)).toMatchObject({
      ok: true,
      value: { total: 2, items: [{ code: 2 }] },
    })
    expect(await list('%_')).toMatchObject({ ok: true, value: { total: 1 } })
    expect(await list('savona')).toMatchObject({ ok: true, value: { items: [{ code: 2 }] } })
    for (const [page, size] of [
      [0, 25],
      [1, 101],
      [1.5, 25],
      [Number.MAX_SAFE_INTEGER, 100],
    ])
      expect(await list('', page, size)).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION_ERROR' },
      })
    expect(
      await ports.get({ context: { sessionId: before.sessionId }, query: { id: randomUUID() } }),
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })
    expect(context()).toEqual(before)
  })

  it('rifiuta revisioni obsolete e richieste in coda alla copia, mantenendo file e backup indipendenti', async () => {
    const old = context()
    await create()
    expect(await ports.create({ context: old, payload: input })).toMatchObject({
      ok: false,
      error: { code: 'REVISION_CONFLICT' },
    })
    const source = context()
    const copy = archives.saveAs(file('copy'))
    const stale = ports.create({ context: source, payload: { ...input, name: 'Tardivo' } })
    const staleQuery = ports.list({
      context: { sessionId: source.sessionId },
      query: { page: 1, pageSize: 25, search: '' },
    })
    await copy
    for (const result of [await stale, await staleQuery])
      expect(result).toMatchObject({
        ok: false,
        context: null,
        error: { code: 'ARCHIVE_SESSION_CHANGED' },
      })
    expect(context().archiveId).toBe(source.archiveId)
    await create({ name: 'Solo copia' })
    await archives.backup(file('backup'))
    await archives.open(file('A'))
    expect(await list()).toMatchObject({ ok: true, value: { total: 1 } })
    await archives.open(file('backup'))
    expect(await list()).toMatchObject({ ok: true, value: { total: 2 } })
    await archives.create(file('B'), 'B')
    expect(await list()).toMatchObject({ ok: true, value: { total: 0 } })
    const final = context()
    await archives.close()
    expect(await ports.create({ context: final, payload: input })).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'NO_ARCHIVE' },
    })
  })
})

describe('migrazione porti da v3 allo schema corrente', () => {
  function createV3(collision = false) {
    const db = new Database(file('v3'))
    for (const name of [
      '0001_archive.sql',
      '0002_archive_revision.sql',
      '0003_company_time_zone.sql',
    ])
      db.exec(readFileSync(join('migrations', name), 'utf8'))
    db.prepare('INSERT INTO archive_metadata VALUES (1, ?, ?, ?, ?, ?)').run(
      randomUUID(),
      'Storico',
      '2020-01-01T00:00:00.000Z',
      '2021-01-01T00:00:00.000Z',
      9007199254740993n,
    )
    db.pragma(`application_id = ${APPLICATION_ID}`)
    db.pragma('user_version = 3')
    if (collision) db.exec('CREATE TABLE port_versions (unrelated TEXT)')
    db.close()
  }

  it('conserva metadati e copia preventiva v3 e crea porti dopo la migrazione', async () => {
    createV3()
    expect(await archives.open(file('v3'))).toMatchObject({
      schemaVersion: 6,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2021-01-01T00:00:00.000Z',
    })
    expect(context().revision).toBe('9007199254740993')
    const backup = readdirSync(folder).find((name) => name.includes('.prima-v6-'))!
    const snapshot = new Database(join(folder, backup), { readonly: true })
    try {
      expect(snapshot.pragma('user_version', { simple: true })).toBe(3)
      expect(
        snapshot.prepare("SELECT name FROM sqlite_master WHERE name = 'ports'").get(),
      ).toBeUndefined()
    } finally {
      snapshot.close()
    }
    expect(await create()).toMatchObject({
      ok: true,
      value: { code: 1 },
      context: { revision: '9007199254740994' },
    })
  })

  it('annulla una migrazione fallita dopo le prime tabelle e conserva file e sessione precedente', async () => {
    createV3(true)
    const previous = context()
    const original = readFileSync(file('v3'))
    await expect(archives.open(file('v3'))).rejects.toThrow()
    expect(context()).toEqual(previous)
    expect(readFileSync(file('v3'))).toEqual(original)
  })
})
