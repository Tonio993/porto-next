import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import {
  APPLICATION_ID,
  SCHEMA_VERSION,
} from '../../src/backend/infrastructure/database/migrations'

let folder: string
let service: ArchiveService
const file = (name: string) => join(folder, `${name}.ormeggi`)

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'porto-next-tests-'))
  service = new ArchiveService()
})
afterEach(async () => {
  await service.close()
  rmSync(folder, { recursive: true, force: true })
})

describe('archivi locali indipendenti', () => {
  it('crea un file SQLite completo e lo riapre dopo la chiusura', async () => {
    const created = await service.create(file('alfa'), 'Società Alfa')
    expect(created.name).toBe('Società Alfa')
    expect(created.schemaVersion).toBe(SCHEMA_VERSION)
    await service.close()
    expect(service.current()).toBeNull()
    expect(readFileSync(file('alfa')).subarray(0, 16).toString()).toBe('SQLite format 3\0')
    expect(readdirSync(folder)).toEqual(['alfa.ormeggi'])
    expect(await service.open(file('alfa'))).toEqual(created)
  })

  it('cambia archivio senza mescolare i dati', async () => {
    const alfa = await service.create(file('alfa'), 'Alfa')
    const beta = await service.create(file('beta'), 'Beta')
    expect(alfa.id).not.toBe(beta.id)
    await service.rename('Beta aggiornata')
    expect((await service.open(file('alfa'))).name).toBe('Alfa')
    expect((await service.open(file('beta'))).name).toBe('Beta aggiornata')
  })

  it('salva con nome, apre la copia e conserva invariato l’originale', async () => {
    await service.create(file('origine'), 'Originale')
    const copy = await service.saveAs(file('copia'))
    expect(copy.path).toBe(file('copia'))
    await service.rename('Copia modificata')
    expect((await service.open(file('origine'))).name).toBe('Originale')
    expect((await service.open(file('copia'))).name).toBe('Copia modificata')
  })

  it('crea un backup coerente senza cambiare l’archivio attivo', async () => {
    await service.create(file('origine'), 'Originale')
    const original = service.current()
    await service.backup(file('backup'))
    expect(service.current()).toEqual(original)
    await service.rename('Dopo il backup')
    expect((await service.open(file('backup'))).name).toBe('Originale')
  })

  it('non sovrascrive file esistenti durante creazione, copia o backup', async () => {
    await service.create(file('origine'), 'Originale')
    writeFileSync(file('esistente'), 'contenuto da conservare')
    await expect(service.create(file('esistente'), 'Nuovo')).rejects.toMatchObject({
      code: 'EEXIST',
    })
    await expect(service.saveAs(file('esistente'))).rejects.toMatchObject({ code: 'EEXIST' })
    await expect(service.backup(file('origine'))).rejects.toMatchObject({ code: 'EEXIST' })
    expect(readFileSync(file('esistente'), 'utf8')).toBe('contenuto da conservare')
    expect(service.current()?.name).toBe('Originale')
  })

  it('rifiuta file estranei e conserva l’archivio attivo', async () => {
    const original = await service.create(file('origine'), 'Originale')
    writeFileSync(file('estraneo'), 'Questo non è un database')
    await expect(service.open(file('estraneo'))).rejects.toThrow()
    expect(service.current()).toEqual(original)
    const foreign = new Database(file('sqlite-estraneo'))
    foreign.exec('CREATE TABLE unrelated (id INTEGER)')
    foreign.close()
    await expect(service.open(file('sqlite-estraneo'))).rejects.toMatchObject({
      code: 'INVALID_ARCHIVE',
    })
    expect(service.current()).toEqual(original)
  })

  it('rifiuta schemi più recenti senza modificarli', async () => {
    await service.create(file('futuro'), 'Futuro')
    await service.close()
    const future = new Database(file('futuro'))
    future.pragma('user_version = 999')
    future.close()
    const bytes = readFileSync(file('futuro'))
    const original = await service.create(file('origine'), 'Originale')
    await expect(service.open(file('futuro'))).rejects.toMatchObject({ code: 'NEWER_SCHEMA' })
    expect(readFileSync(file('futuro'))).toEqual(bytes)
    expect(service.current()).toEqual(original)
  })

  it('rifiuta un file con identificativo corretto ma schema incompleto', async () => {
    const invalid = new Database(file('incompleto'))
    invalid.pragma(`application_id = ${APPLICATION_ID}`)
    invalid.pragma('user_version = 1')
    invalid.close()
    await expect(service.open(file('incompleto'))).rejects.toMatchObject({
      code: 'INVALID_ARCHIVE',
    })
    expect(service.current()).toBeNull()
  })

  it('un’apertura fallita non crea un database vuoto', async () => {
    await expect(service.open(file('inesistente'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(readdirSync(folder)).toEqual([])
  })

  it('un errore nel percorso di destinazione lascia utilizzabile la sessione', async () => {
    await service.create(file('origine'), 'Originale')
    await expect(
      service.saveAs(join(folder, 'cartella-assente', 'copia.ormeggi')),
    ).rejects.toThrow()
    expect((await service.rename('Ancora aperto')).name).toBe('Ancora aperto')
  })

  it('valida i nomi e richiede una sessione per le modifiche', async () => {
    await expect(service.rename('Nome')).rejects.toMatchObject({ code: 'NO_ARCHIVE' })
    await expect(service.create(file('vuoto'), '   ')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })
    await service.create(file('origine'), '  Originale  ')
    expect(service.current()?.name).toBe('Originale')
    await expect(service.rename('x'.repeat(121))).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('serializza un backup e un cambio archivio concorrenti', async () => {
    await service.create(file('alfa'), 'Alfa')
    await service.create(file('beta'), 'Beta')
    await service.open(file('alfa'))
    await Promise.all([service.backup(file('backup')), service.open(file('beta'))])
    expect(service.current()?.name).toBe('Beta')
    expect((await service.open(file('backup'))).name).toBe('Alfa')
  })
})
