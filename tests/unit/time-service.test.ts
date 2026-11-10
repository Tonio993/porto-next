import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { TimeService } from '../../src/backend/application/time/time-service'
import { APPLICATION_ID } from '../../src/backend/infrastructure/database/migrations'

let folder: string
let archives: ArchiveService
let time: TimeService
const file = (name: string) => join(folder, `${name}.ormeggi`)
const context = () => archives.context()!
const query = () => ({ context: { sessionId: context().sessionId }, query: null })
const configure = (zoneId: string) =>
  time.configureCompanyZone({ context: context(), payload: { zoneId } })
const resolveTime = (selectedOffset: string | null = null) =>
  time.resolveCompanyMoment({
    context: { sessionId: context().sessionId },
    query: { localDateTime: '2026-10-25T02:30', selectedOffset },
  })

beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-time-tests-'))
  archives = new ArchiveService()
  time = new TimeService(archives.coordinator)
  await archives.create(file('A'), 'A')
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})

describe('configurazione temporale per archivio', () => {
  it('propone Roma, conferma una volta e conserva fuso e metadati alla riapertura', async () => {
    const initial = context()
    expect(await time.getCompanyZone(query())).toMatchObject({
      ok: true,
      value: { zoneId: 'Europe/Rome', confirmed: false },
      context: initial,
    })
    expect(await resolveTime()).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
    expect(await configure('Asia/Kathmandu')).toMatchObject({
      ok: true,
      value: { zoneId: 'Asia/Kathmandu', confirmed: true },
      context: { revision: '1' },
    })
    const before = archives.current()
    expect(await configure('Asia/Kathmandu')).toMatchObject({
      ok: true,
      context: { revision: '1' },
    })
    expect(await configure('Europe/Rome')).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR', fields: [{ code: 'ALREADY_CONFIGURED' }] },
    })
    expect(archives.current()).toEqual(before)
    await archives.close()
    await archives.open(file('A'))
    expect(await time.getCompanyZone(query())).toMatchObject({
      ok: true,
      value: { zoneId: 'Asia/Kathmandu', confirmed: true },
      context: { revision: '1' },
    })
  })

  it('offre entrambe le occorrenze e valida la scelta nel backend senza scrivere', async () => {
    await configure('Europe/Rome')
    const before = archives.current()
    expect(await resolveTime()).toMatchObject({
      ok: true,
      value: { status: 'CHOICE_REQUIRED', choices: [{ offset: '+02:00' }, { offset: '+01:00' }] },
    })
    expect(await resolveTime('+01:00')).toMatchObject({
      ok: true,
      value: { status: 'RESOLVED', moment: { utc: '2026-10-25T01:30:00.000Z' } },
    })
    expect(await resolveTime('+03:00')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_OFFSET' },
    })
    expect(archives.current()).toEqual(before)
    expect(context().revision).toBe('1')
  })

  it('rifiuta dati inattesi, fusi non validi e revisioni obsolete senza alterare l’archivio', async () => {
    const old = context()
    const before = archives.current()
    expect(await configure('+01:00')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TIME_ZONE' },
    })
    expect(archives.current()).toEqual(before)
    expect(
      await time.configureCompanyZone({
        context: old,
        payload: { zoneId: 'Europe/Rome', extra: true },
      } as never),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
    await archives.rename('Nome aggiornato')
    expect(
      await time.configureCompanyZone({ context: old, payload: { zoneId: 'Europe/Rome' } }),
    ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
    expect(await time.getCompanyZone(query())).toMatchObject({
      ok: true,
      value: { confirmed: false },
    })
    await configure('Europe/Rome')
    expect(
      await time.resolveCompanyMoment({
        ...query(),
        query: { localDateTime: '2026-10-25T02:30', selectedOffset: null, zoneId: 'Asia/Tokyo' },
      } as never),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
  })

  it('un errore dopo la scrittura annulla anche configurazione, revisione e timestamp', async () => {
    const before = archives.current()
    archives.coordinator
      .requireSession()
      .database.sqlite.prepare('UPDATE archive_metadata SET revision = ?')
      .run(9223372036854775807n)
    expect(await configure('Europe/London')).toMatchObject({
      ok: false,
      error: { code: 'LIMIT_EXCEEDED' },
    })
    expect(await time.getCompanyZone(query())).toMatchObject({
      ok: true,
      value: { zoneId: 'Europe/Rome', confirmed: false },
    })
    expect(archives.current()).toEqual(before)
  })

  it('copie, backup e file nuovi mantengono configurazioni indipendenti e isolano le richieste tardive', async () => {
    const old = context()
    const saving = archives.saveAs(file('copia'))
    const stale = time.configureCompanyZone({ context: old, payload: { zoneId: 'Asia/Tokyo' } })
    await saving
    expect(await stale).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'ARCHIVE_SESSION_CHANGED' },
    })
    await configure('Europe/London')
    await archives.backup(file('backup'))
    await archives.open(file('A'))
    expect(await time.getCompanyZone(query())).toMatchObject({
      ok: true,
      value: { confirmed: false },
    })
    await configure('Asia/Kathmandu')
    await archives.open(file('backup'))
    expect(await time.getCompanyZone(query())).toMatchObject({
      ok: true,
      value: { zoneId: 'Europe/London', confirmed: true },
    })
    const session = context().sessionId
    const opening = archives.create(file('B'), 'B')
    const late = time.getCompanyZone({ context: { sessionId: session }, query: null })
    await opening
    expect(await late).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'ARCHIVE_SESSION_CHANGED' },
    })
    expect(await time.getCompanyZone(query())).toMatchObject({
      ok: true,
      value: { zoneId: 'Europe/Rome', confirmed: false },
    })
    await archives.close()
    expect(
      await time.getCompanyZone({ context: { sessionId: session }, query: null }),
    ).toMatchObject({ ok: false, context: null, error: { code: 'NO_ARCHIVE' } })
  })
})

describe('migrazione da v2 allo schema corrente', () => {
  function createV2(collidingTable = false) {
    const sqlite = new Database(file('v2'))
    sqlite.exec(readFileSync('migrations/0001_archive.sql', 'utf8'))
    sqlite.exec(readFileSync('migrations/0002_archive_revision.sql', 'utf8'))
    sqlite.pragma(`application_id = ${APPLICATION_ID}`)
    sqlite.pragma('user_version = 2')
    sqlite
      .prepare('INSERT INTO archive_metadata VALUES (1, ?, ?, ?, ?, ?)')
      .run(
        '00000000-0000-4000-8000-000000000001',
        'Storico',
        '2020-01-01T00:00:00.000Z',
        '2021-01-01T00:00:00.000Z',
        9007199254740993n,
      )
    if (collidingTable) sqlite.exec('CREATE TABLE company_time_zone (unrelated TEXT)')
    sqlite.close()
  }

  it('inizializza la versione senza decorrenza conservando metadati, revisione e copia v2', async () => {
    createV2()
    expect(await archives.open(file('v2'))).toMatchObject({
      schemaVersion: 5,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2021-01-01T00:00:00.000Z',
    })
    expect(context().revision).toBe('9007199254740993')
    expect(await time.getCompanyZone(query())).toMatchObject({
      ok: true,
      value: { zoneId: 'Europe/Rome', confirmed: false },
    })
    expect(
      archives.coordinator
        .requireSession()
        .database.sqlite.prepare('SELECT effective_from FROM company_time_zone')
        .pluck()
        .get(),
    ).toBeNull()
    const backup = readdirSync(folder).find((name) => name.includes('.prima-v5-'))!
    const snapshot = new Database(join(folder, backup), { readonly: true })
    try {
      expect(snapshot.pragma('user_version', { simple: true })).toBe(2)
      expect(
        snapshot.prepare("SELECT name FROM sqlite_master WHERE name = 'company_time_zone'").get(),
      ).toBeUndefined()
    } finally {
      snapshot.close()
    }
  })

  it('un fallimento SQL conserva v2 e la sessione attiva', async () => {
    createV2(true)
    const previous = context()
    const original = readFileSync(file('v2'))
    await expect(archives.open(file('v2'))).rejects.toThrow()
    expect(context()).toEqual(previous)
    expect(readFileSync(file('v2'))).toEqual(original)
  })

  it('un archivio con fuso alterato viene rifiutato senza sostituire la sessione corrente', async () => {
    await archives.create(file('corrotto'), 'Corrotto')
    archives.coordinator
      .requireSession()
      .database.sqlite.exec("UPDATE company_time_zone SET zone_id = 'Inesistente'")
    await archives.close()
    await archives.open(file('A'))
    const previous = context()
    await expect(archives.open(file('corrotto'))).rejects.toMatchObject({ code: 'INVALID_ARCHIVE' })
    expect(context()).toEqual(previous)
  })
})
