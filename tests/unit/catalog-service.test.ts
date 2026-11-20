import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { CatalogService } from '../../src/backend/application/catalog/catalog-service'
import { CatalogRepository } from '../../src/backend/infrastructure/database/catalog-repository'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { CatalogChange } from '../../src/shared/contracts/catalog'
let folder: string, archives: ArchiveService, service: CatalogService
const context = () => archives.context()!
const database = () => archives.coordinator.requireSession().database
const sql = () => database().sqlite
const repository = () => new CatalogRepository(database())
const value = <T>(result: ApplicationResult<T>): T => {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}
const fail = (code: string) => ({ ok: false, error: { code } })
const create = (description: string, initialWeight = '1') =>
  service.create({ context: context(), payload: { description, initialWeight } })
const list = (
  search = '',
  page = 1,
  pageSize = 25,
  status: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL',
) =>
  service.list({
    context: { sessionId: context().sessionId },
    query: { search, page, pageSize, status },
  })
const preview = (payload: CatalogChange) => service.preview({ context: context(), payload })
const apply = async (change: CatalogChange) => {
  const p = value(await preview(change))
  return service.confirm({ context: p.context, payload: { previewId: p.previewId } })
}
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p08-'))
  archives = new ArchiveService()
  service = new CatalogService(archives.coordinator)
  await archives.create(join(folder, 'a.ormeggi'), 'P08')
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})
it('inizializza quattro sequenze autonome con peso 1, UUIDv4 e nessuna decorrenza; non ricrea il tipo eliminato (CAT-01)', async () => {
  const types = value(await list()).items
  expect(types).toHaveLength(1)
  expect(types[0]).toMatchObject({
    description: 'rinforzo ormeggio',
    status: 'ACTIVE',
    hasEverBeenUsed: false,
    initialWeight: { effectiveFrom: null, weight: '1' },
  })
  const fixed = value(
    await service.fixedWeights({ context: { sessionId: context().sessionId }, query: null }),
  )
  expect(fixed.map((x) => x.operation)).toEqual(['ENTRY', 'EXIT', 'MOVEMENT'])
  const weights = [types[0].initialWeight, ...fixed.map((x) => x.initialWeight)]
  expect(new Set(weights.map((x) => x.sequenceId)).size).toBe(4)
  for (const row of weights) {
    expect(row.weight).toBe('1')
    expect(row.id).toMatch(/^[a-f0-9-]{14}4[a-f0-9]{3}-[89ab]/)
    expect(row.effectiveFrom).toBeNull()
  }
  expect((await apply({ operation: 'DELETE', id: types[0].id })).ok).toBe(true)
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(value(await list()).total).toBe(0)
  expect(repository().fixedWeights()).toEqual(fixed)
})
it('normalizza Unicode, limita a 200 punti di codice, riserva operazioni fisse e libera la descrizione rinominata (CAT-03)', async () => {
  const a = value(await create('  Café  '))
  expect(a.description).toBe('Café')
  expect(await create('cafe\u0301')).toMatchObject(fail('DUPLICATE_IDENTIFIER'))
  for (const name of [' entrata ', 'USCITA', 'Spostamento'])
    expect(await create(name)).toMatchObject(fail('VALIDATION_ERROR'))
  expect(await create('😀'.repeat(200))).toMatchObject({ ok: true })
  expect(await create('😀'.repeat(201))).toMatchObject(fail('VALIDATION_ERROR'))
  expect(await create('  ')).toMatchObject(fail('VALIDATION_ERROR'))
  expect((await apply({ operation: 'RENAME', id: a.id, description: 'Assistenza' })).ok).toBe(true)
  expect(await create('Café')).toMatchObject({ ok: true })
  expect(repository().get(a.id).description).toBe('Assistenza')
  expect(await preview({ operation: 'RENAME', id: a.id, description: 'uscita' })).toMatchObject(
    fail('VALIDATION_ERROR'),
  )
})
it('conserva decimali esatti fino a 256 cifre senza esponenti, arrotondamenti o REAL', async () => {
  const a = value(await create('Esatto', '0001.23000000000000000000000000000100'))
  expect(a.initialWeight.weight).toBe('1.230000000000000000000000000001')
  expect(value(await create('Minimo', '0.' + '0'.repeat(254) + '1')).initialWeight.weight).toBe(
    '0.' + '0'.repeat(254) + '1',
  )
  expect(await create('Massimo', '9'.repeat(256))).toMatchObject({ ok: true })
  for (const weight of ['0', '0.000', '-1', '1e2', '1,2', ' 1', '9'.repeat(257), 'NaN', 'Infinity'])
    expect(await create('Invalid', weight)).toMatchObject(fail('VALIDATION_ERROR'))
  expect(
    sql().prepare('SELECT DISTINCT typeof(weight) AS type FROM weight_versions').all(),
  ).toEqual([{ type: 'text' }])
  for (const weight of ['0', '-1', '1e2', '1.', '01', '1.00', '.1', '1..1', '9'.repeat(257)])
    expect(() =>
      sql()
        .prepare('UPDATE weight_versions SET weight = ? WHERE id = ?')
        .run(weight, a.initialWeight.id),
    ).toThrow()
  expect(() =>
    sql()
      .prepare(
        'INSERT INTO weight_versions (id,sequence_id,effective_from,weight) VALUES (?, ?, NULL, ?)',
      )
      .run('duplicate', a.initialWeight.sequenceId, '1'),
  ).toThrow()
  expect(() =>
    sql().prepare('UPDATE weight_versions SET effective_from = ?').run('2026-01-01'),
  ).toThrow()
})
it('ricerca letterale e paginazione; stato e selezionabilità distinti da consultazione e utilizzo', async () => {
  const a = value(await create('A_%')),
    b = value(await create('B'))
  expect(value(await list('_%')).items.map((x) => x.id)).toEqual([a.id])
  expect(value(await list('', 1, 1)).total).toBe(3)
  expect(value(await list('', 2, 1)).items).toHaveLength(1)
  expect(await list('', 0)).toMatchObject(fail('VALIDATION_ERROR'))
  expect((await apply({ operation: 'DEACTIVATE', id: a.id })).ok).toBe(true)
  expect(repository().get(a.id).status).toBe('INACTIVE')
  expect(() => repository().requireSelectable(a.id)).toThrow()
  expect(value(await list('', 1, 25, 'INACTIVE')).items.map((x) => x.id)).toEqual([a.id])
  expect(repository().requireSelectable(b.id).id).toBe(b.id)
  const before = context()
  await apply({ operation: 'DEACTIVATE', id: a.id })
  expect(context()).toEqual(before)
  expect(await service.reactivate({ context: context(), payload: { id: a.id } })).toMatchObject({
    ok: true,
    value: { status: 'ACTIVE' },
  })
  const again = context()
  await service.reactivate({ context: context(), payload: { id: a.id } })
  expect(context()).toEqual(again)
})
it('registra utilizzo monotono nella transazione futura P15, resiste a cancellazione della prestazione e rollback', async () => {
  const a = value(await create('Usato')),
    b = value(await create('Rollback'))
  expect(() => repository().markUsed(a.id)).toThrow()
  sql().exec(
    'CREATE TABLE activities_test (id TEXT PRIMARY KEY, type_id TEXT REFERENCES service_types(id))',
  )
  archives.coordinator.write(context(), () => {
    repository().markUsed(a.id)
    sql().prepare('INSERT INTO activities_test VALUES (?,?)').run('activity', a.id)
  })
  sql().exec('DELETE FROM activities_test')
  expect(repository().get(a.id).hasEverBeenUsed).toBe(true)
  expect(() =>
    sql().prepare('UPDATE service_types SET has_ever_been_used = 0 WHERE id = ?').run(a.id),
  ).toThrow()
  expect(() => sql().prepare('DELETE FROM service_types WHERE id = ?').run(a.id)).toThrow()
  expect(value(await preview({ operation: 'DELETE', id: a.id })).status).toBe('BLOCKED')
  expect(await apply({ operation: 'DELETE', id: a.id })).toMatchObject(fail('PREVIEW_BLOCKED'))
  const before = context()
  expect(() =>
    archives.coordinator.write(context(), () => {
      repository().markUsed(b.id)
      throw new Error('fail activity')
    }),
  ).toThrow()
  expect(repository().get(b.id).hasEverBeenUsed).toBe(false)
  expect(context()).toEqual(before)
  archives.coordinator.write(context(), () => repository().markUsed(a.id))
  expect(context()).toEqual(before)
  await apply({ operation: 'RENAME', id: a.id, description: 'Usato rinominato' })
  await apply({ operation: 'DEACTIVATE', id: a.id })
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(repository().get(a.id).hasEverBeenUsed).toBe(true)
})
it('crea atomicamente tipo e peso e annulla metadati in caso di errore', async () => {
  const before = context(),
    total = value(await list()).total
  sql().exec(
    "CREATE TRIGGER fail_weight BEFORE INSERT ON weight_versions BEGIN SELECT RAISE(ABORT,'failure'); END",
  )
  expect((await create('Rollback')).ok).toBe(false)
  expect(context()).toEqual(before)
  expect(value(await list()).total).toBe(total)
  expect(sql().prepare('SELECT count(*) FROM weight_sequences').pluck().get()).toBe(4)
  sql().exec('DROP TRIGGER fail_weight')
  expect(await create('Rollback')).toMatchObject({ ok: true })
  expect(BigInt(context().revision)).toBe(BigInt(before.revision) + 1n)
})
it('anteprime non scrivono, paginano tutti gli effetti, controllano namespace, sessione, revisione e consumo dopo commit', async () => {
  const a = value(await create('Anteprime')),
    before = context()
  const p = value(await preview({ operation: 'DELETE', id: a.id }))
  expect(context()).toEqual(before)
  expect(p.summary.deleted).toBe(2)
  const page = value(
    await service.previewEffects({
      context: { sessionId: context().sessionId },
      query: { previewId: p.previewId, page: 2, pageSize: 1 },
    }),
  )
  expect(page.effects.total).toBe(2)
  expect(page).not.toHaveProperty('input')
  expect(page.effects.items[0].reference.kind).toBe('WEIGHT_VERSION')
  sql().exec(
    "CREATE TRIGGER fail_delete BEFORE DELETE ON service_types BEGIN SELECT RAISE(ABORT,'failure'); END",
  )
  expect(
    (await service.confirm({ context: p.context, payload: { previewId: p.previewId } })).ok,
  ).toBe(false)
  expect(context()).toEqual(before)
  expect(repository().get(a.id)).toEqual(a)
  sql().exec('DROP TRIGGER fail_delete')
  expect(
    (await service.confirm({ context: p.context, payload: { previewId: p.previewId } })).ok,
  ).toBe(true)
  expect(
    await service.confirm({ context: context(), payload: { previewId: p.previewId } }),
  ).toMatchObject(fail('PREVIEW_EXPIRED'))
  const b = value(await create('B')),
    q = value(await preview({ operation: 'DEACTIVATE', id: b.id }))
  await create('C')
  expect(
    await service.confirm({ context: q.context, payload: { previewId: q.previewId } }),
  ).toMatchObject(fail('REVISION_CONFLICT'))
  const foreign = archives.coordinator.requireSession().previews.put('OTHER', context(), {})
  expect(
    await service.confirm({ context: context(), payload: { previewId: foreign.previewId } }),
  ).toMatchObject(fail('PREVIEW_EXPIRED'))
  const old = context()
  await archives.saveAs(join(folder, 'b.ormeggi'))
  expect(
    await service.create({
      context: old,
      payload: { description: 'Wrong session', initialWeight: '1' },
    }),
  ).toMatchObject(fail('ARCHIVE_SESSION_CHANGED'))
  expect(
    await service.get({ context: { sessionId: old.sessionId }, query: { id: b.id } }),
  ).toMatchObject(fail('ARCHIVE_SESSION_CHANGED'))
})
it('riesamina FK esterne reali anche CASCADE verso identità, sequenza e peso alla conferma', async () => {
  for (const target of ['service_types', 'weight_sequences', 'weight_versions']) {
    const a = value(await create(target)),
      p = value(await preview({ operation: 'DELETE', id: a.id }))
    const id =
      target === 'service_types'
        ? a.id
        : target === 'weight_sequences'
          ? a.initialWeight.sequenceId
          : a.initialWeight.id
    sql().exec(`CREATE TABLE external_test (id TEXT REFERENCES ${target}(id) ON DELETE CASCADE)`)
    sql().prepare('INSERT INTO external_test VALUES (?)').run(id)
    expect(
      await service.confirm({ context: p.context, payload: { previewId: p.previewId } }),
    ).toMatchObject(fail('PREVIEW_BLOCKED'))
    expect(repository().get(a.id)).toEqual(a)
    sql().exec('DROP TABLE external_test')
    expect(
      (await service.confirm({ context: p.context, payload: { previewId: p.previewId } })).ok,
    ).toBe(true)
  }
})
it('rifiuta campi inattesi, ID e filtri non validi anche via chiamate dirette', async () => {
  expect(
    await service.create({
      context: context(),
      payload: { description: 'Test', initialWeight: '1', extra: true } as never,
    }),
  ).toMatchObject(fail('VALIDATION_ERROR'))
  expect(
    await service.get({ context: { sessionId: context().sessionId }, query: { id: 'bad' } }),
  ).toMatchObject(fail('VALIDATION_ERROR'))
  expect(
    await service.fixedWeights({ context: { sessionId: context().sessionId }, query: {} as never }),
  ).toMatchObject(fail('VALIDATION_ERROR'))
  expect(await preview({ operation: 'INVALID', id: 'bad' } as never)).toMatchObject(
    fail('VALIDATION_ERROR'),
  )
  const a = value(await create('No-op')),
    before = context()
  await apply({ operation: 'RENAME', id: a.id, description: a.description })
  expect(context()).toEqual(before)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
