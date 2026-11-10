import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { DatabaseSession } from '../../src/backend/infrastructure/database/database-session'
import { APPLICATION_ID } from '../../src/backend/infrastructure/database/migrations'
import type { CommandRequest } from '../../src/shared/contracts/application'
import { canApplyArchiveState } from '../../src/shared/archive-state-order'
import type { ArchiveState } from '../../src/shared/contracts/archive'

let folder: string
let service: ArchiveService
const file = (name: string) => join(folder, `${name}.ormeggi`)
const context = () => service.context()!
const request = (expected = context()) => ({ context: expected, payload: null })
const change = (expected = context()) =>
  service.coordinator.command(request(expected), ({ database }) => {
    database.sqlite.prepare('UPDATE archive_metadata SET name = ?').run('Modificato')
  })

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'porto-context-tests-'))
  service = new ArchiveService()
})
afterEach(async () => {
  vi.restoreAllMocks()
  await service.close()
  rmSync(folder, { recursive: true, force: true })
})

describe('sessione e coda applicativa', () => {
  it('una copia in corso precede le scritture di dominio e il cambio file', async () => {
    await service.create(file('B'), 'B')
    await service.create(file('A'), 'A')
    const old = context()
    const sqlite = service.coordinator.requireSession().database.sqlite
    const original = sqlite.backup.bind(sqlite)
    let release!: () => void
    let started!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const entered = new Promise<void>((resolve) => {
      started = resolve
    })
    const backup = vi.spyOn(sqlite, 'backup').mockImplementation(async (destination, options) => {
      started()
      await gate
      return original(destination, options)
    })
    const copying = service.backup(file('backup'))
    const effects = vi.fn(({ database }) =>
      database.sqlite.exec("UPDATE archive_metadata SET name = 'Dopo la copia'"),
    )
    const writing = service.coordinator.command(request(old), effects)
    const opening = service.open(file('B'))
    await entered
    expect(effects).not.toHaveBeenCalled()
    release()
    await copying
    expect(await writing).toMatchObject({
      ok: true,
      context: { sessionId: old.sessionId, revision: '1' },
    })
    await opening
    backup.mockRestore()
    expect(service.current()?.name).toBe('B')
    await service.open(file('backup'))
    expect(service.current()?.name).toBe('A')
    expect(context().revision).toBe('0')
    await service.open(file('A'))
    expect(service.current()?.name).toBe('Dopo la copia')
    expect(context().revision).toBe('1')
  })
  it('ARC-01: una query e un comando accodati per A non accedono a B', async () => {
    await service.create(file('A'), 'A')
    const a = context()
    await service.create(file('B'), 'B')
    await service.open(file('A'))
    const old = context()
    const opening = service.open(file('B'))
    const read = vi.fn(() => 'dati')
    const write = vi.fn(() => 'dati')
    const query = service.coordinator.query(
      { context: { sessionId: old.sessionId }, query: null },
      read,
    )
    const command = service.coordinator.command(request(old), write)
    await opening
    expect(await query).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'ARCHIVE_SESSION_CHANGED' },
    })
    expect(await command).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'ARCHIVE_SESSION_CHANGED' },
    })
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(service.current()?.name).toBe('B')
    expect(context().sessionId).not.toBe(a.sessionId)
  })

  it('non legge neppure i metadati della nuova sessione su token errato', async () => {
    await service.create(file('A'), 'A')
    const old = context()
    await service.create(file('B'), 'B')
    const metadata = vi.spyOn(service.coordinator.requireSession().database, 'metadata')
    const result = await service.coordinator.command(request(old), () => 1)
    expect(result).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'ARCHIVE_SESSION_CHANGED' },
    })
    expect(metadata).not.toHaveBeenCalled()
  })

  it('ARC-02: Salva con nome conserva ID/revisione ma rifiuta la scrittura precedente', async () => {
    await service.create(file('A'), 'A')
    const old = context()
    const saving = service.saveAs(file('copia'))
    const stale = service.rename('Non applicare', old)
    await saving
    await expect(stale).rejects.toMatchObject({ code: 'ARCHIVE_SESSION_CHANGED' })
    expect(context()).toMatchObject({ archiveId: old.archiveId, revision: old.revision })
    expect(context().sessionId).not.toBe(old.sessionId)
    expect(service.current()?.name).toBe('A')
    await service.open(file('A'))
    expect(service.current()?.name).toBe('A')
  })

  it('ARC-03/IMP-02: rifiuta effetti calcolati prima di una scrittura', async () => {
    await service.create(file('A'), 'A')
    const previewContext = context()
    const applied = await change()
    expect(applied).toMatchObject({ ok: true, context: { revision: '1' } })
    const effects = vi.fn(() => 'vecchi effetti')
    expect(await service.coordinator.command(request(previewContext), effects)).toMatchObject({
      ok: false,
      context: { revision: '1' },
      error: { code: 'REVISION_CONFLICT' },
    })
    expect(effects).not.toHaveBeenCalled()
  })

  it('ARC-04: backup, letture, file già aperto e no-op conservano il contesto', async () => {
    await service.create(file('A'), 'A')
    const old = context()
    const info = service.current()
    await service.backup(file('backup'))
    await service.open(file('A'))
    await service.rename(' A ')
    const result = await service.coordinator.query(
      { context: { sessionId: old.sessionId }, query: null },
      ({ database }) => database.metadata().name,
    )
    expect(result).toMatchObject({ ok: true, value: 'A', context: old })
    expect(context()).toEqual(old)
    expect(service.current()).toEqual(info)
    await service.open(file('backup'))
    expect(context()).toMatchObject({ archiveId: old.archiveId, revision: '0' })
  })

  it('riaprire un file crea una nuova sessione; fallire un’apertura lascia quella attuale', async () => {
    await service.create(file('A'), 'A')
    const old = context()
    await expect(service.open(file('assente'))).rejects.toThrow()
    expect(context()).toEqual(old)
    await service.close()
    await service.open(file('A'))
    expect(context().sessionId).not.toBe(old.sessionId)
    expect(context().revision).toBe('0')
  })

  it('senza archivio restituisce NO_ARCHIVE senza contesto o effetti', async () => {
    const execute = vi.fn()
    const valid = {
      archiveId: '00000000-0000-4000-8000-000000000001',
      sessionId: '00000000-0000-4000-8000-000000000002',
      revision: '0',
    }
    expect(await service.coordinator.command(request(valid), execute)).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'NO_ARCHIVE' },
    })
    expect(execute).not.toHaveBeenCalled()
  })

  it('valida forma e revisione prima del controllo dell’archivio', async () => {
    const invalid = { context: { sessionId: 'errata' }, payload: null } as CommandRequest<null>
    expect(await service.coordinator.command(invalid, () => 1)).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'VALIDATION_ERROR' },
    })
    await service.create(file('A'), 'A')
    for (const revision of ['01', '-1', '1.0', '9223372036854775808']) {
      expect(
        await service.coordinator.command(request({ ...context(), revision }), () => 1),
      ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
    }
    const wrongId = { ...context(), archiveId: '00000000-0000-4000-8000-000000000099' }
    expect(await service.coordinator.command(request(wrongId), () => 1)).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'ARCHIVE_SESSION_CHANGED' },
    })
  })
})

describe('transazioni e revisioni int64', () => {
  it('incrementa una volta per transazione e conserva una revisione oltre 2^53', async () => {
    await service.create(file('A'), 'A')
    const sqlite = service.coordinator.requireSession().database.sqlite
    sqlite
      .prepare('UPDATE archive_metadata SET revision = ?, updated_at = ?')
      .run(9007199254740993n, '2000-01-01T00:00:00.000Z')
    expect(context().revision).toBe('9007199254740993')
    expect(
      await service.coordinator.command(request(), ({ database }) => {
        database.sqlite.exec(
          "UPDATE archive_metadata SET name = 'Prima'; UPDATE archive_metadata SET name = 'Seconda'",
        )
      }),
    ).toMatchObject({ ok: true, context: { revision: '9007199254740994' } })
    expect(service.current()?.updatedAt).not.toBe('2000-01-01T00:00:00.000Z')
    await service.close()
    await service.open(file('A'))
    expect(context().revision).toBe('9007199254740994')
  })

  it('un errore annulla dati, timestamp e revisione e non blocca la coda', async () => {
    await service.create(file('A'), 'A')
    const before = service.current()
    expect(
      await service.coordinator.command(request(), ({ database }) => {
        database.sqlite.exec("UPDATE archive_metadata SET name = 'Da annullare'")
        throw new Error('fallimento simulato')
      }),
    ).toMatchObject({ ok: false, error: { code: 'UNEXPECTED' } })
    expect(service.current()).toEqual(before)
    expect(context().revision).toBe('0')
    expect(await change()).toMatchObject({ ok: true, context: { revision: '1' } })
  })

  it('il limite int64 provoca rollback e nessun riavvolgimento', async () => {
    await service.create(file('A'), 'A')
    service.coordinator
      .requireSession()
      .database.sqlite.prepare('UPDATE archive_metadata SET revision = ?')
      .run(9223372036854775807n)
    expect(await change()).toMatchObject({ ok: false, error: { code: 'LIMIT_EXCEEDED' } })
    expect(service.current()?.name).toBe('A')
    expect(context().revision).toBe('9223372036854775807')
    // A read-only command is still valid at the limit.
    expect(await service.coordinator.command(request(), () => null)).toMatchObject({ ok: true })
  })
})

describe('migrazione da v1', () => {
  function createV1(name = 'Archivio storico') {
    const sqlite = new Database(file('v1'))
    sqlite.exec(readFileSync('migrations/0001_archive.sql', 'utf8'))
    sqlite.pragma(`application_id = ${APPLICATION_ID}`)
    sqlite.pragma('user_version = 1')
    sqlite
      .prepare('INSERT INTO archive_metadata VALUES (1, ?, ?, ?, ?)')
      .run(
        '00000000-0000-4000-8000-000000000001',
        name,
        '2020-01-01T00:00:00.000Z',
        '2021-01-01T00:00:00.000Z',
      )
    sqlite.close()
  }

  it('aggiorna a v6 conservando metadati e copia preventiva in formato v1', async () => {
    createV1()
    const info = await service.open(file('v1'))
    expect(info).toMatchObject({
      name: 'Archivio storico',
      schemaVersion: 6,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2021-01-01T00:00:00.000Z',
    })
    expect(context().revision).toBe('0')
    const backup = readdirSync(folder).find((name) => name.includes('.prima-v6-'))!
    const snapshot = new Database(join(folder, backup), { readonly: true })
    try {
      expect(snapshot.pragma('user_version', { simple: true })).toBe(1)
      expect(snapshot.prepare('SELECT * FROM archive_metadata').get()).toEqual({
        singleton: 1,
        id: info.id,
        name: info.name,
        created_at: info.createdAt,
        updated_at: info.updatedAt,
      })
    } finally {
      snapshot.close()
    }
    await service.close()
    await service.open(file('v1'))
    expect(readdirSync(folder).filter((name) => name.includes('.prima-v6-'))).toHaveLength(1)
  })

  it('una migrazione fallita non altera il v1 e conserva la sessione precedente', async () => {
    createV1()
    await service.create(file('A'), 'A')
    const old = context()
    const before = readFileSync(file('v1'))
    const original = DatabaseSession.prototype.metadata
    vi.spyOn(DatabaseSession.prototype, 'metadata').mockImplementation(function (
      this: DatabaseSession,
      version?: number,
    ) {
      if (this.path === file('v1') && version === undefined)
        throw new Error('validazione post-migrazione fallita')
      return original.call(this, version)
    })
    await expect(service.open(file('v1'))).rejects.toThrow()
    expect(readFileSync(file('v1'))).toEqual(before)
    expect(context()).toEqual(old)
  })

  it('SQLite rifiuta revisioni negative e frazionarie', async () => {
    await service.create(file('A'), 'A')
    const sqlite = service.coordinator.requireSession().database.sqlite
    expect(() => sqlite.exec('UPDATE archive_metadata SET revision = -1')).toThrow()
    expect(() => sqlite.exec('UPDATE archive_metadata SET revision = 0.5')).toThrow()
    expect(context().revision).toBe('0')
  })
})

describe('risposte React obsolete', () => {
  const state = (sessionId: string, revision: string): ArchiveState => ({
    active: null,
    recent: [],
    context: { archiveId: 'stesso-id', sessionId, revision },
  })
  it('scarta una risposta A ricevuta dopo l’evento di attivazione B', () => {
    expect(canApplyArchiveState(state('B', '0'), state('A', '9'), 0, 1)).toBe(false)
    expect(canApplyArchiveState(state('A', '0'), state('B', '0'), 1, 1)).toBe(true)
  })
  it('confronta revisioni numericamente senza perdere precisione', () => {
    expect(canApplyArchiveState(state('A', '10'), state('A', '9'), 1, 1)).toBe(false)
    expect(
      canApplyArchiveState(state('A', '9007199254740994'), state('A', '9007199254740993'), 1, 1),
    ).toBe(false)
  })
})
