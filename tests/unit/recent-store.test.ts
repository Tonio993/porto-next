import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { RecentStore } from '../../src/backend/infrastructure/preferences/recent-store'

const folder = mkdtempSync(join(tmpdir(), 'porto-next-recents-'))
afterEach(() => {
  rmSync(folder, { recursive: true, force: true })
})

it('recupera da preferenze non valide e conserva solo gli otto percorsi più recenti', () => {
  const path = join(folder, 'recent.json')
  writeFileSync(path, '{non valido')
  const store = new RecentStore(path)
  expect(store.list()).toEqual([])
  for (let index = 0; index < 10; index++)
    store.remember({
      path: join(folder, `${index}.ormeggi`),
      name: `Archivio ${index}`,
      id: String(index),
      schemaVersion: 1,
      createdAt: '',
      updatedAt: '',
    })
  expect(store.list()).toHaveLength(8)
  const first = store.list()[0]
  store.remember({
    ...first,
    name: 'Aggiornato',
    id: '9',
    schemaVersion: 1,
    createdAt: '',
    updatedAt: '',
  })
  expect(new RecentStore(path).list()[0].name).toBe('Aggiornato')
  expect(store.list()).toHaveLength(8)
})
