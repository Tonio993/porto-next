// Prepared for K4 on the final build and the same packaged executable. Not executed in PR05.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { VesselApi } from '../../src/shared/contracts/vessels'
import type { BerthApi } from '../../src/shared/contracts/berths'
import type { CatalogApi } from '../../src/shared/contracts/catalog'
import { operationFixture, operationFixtureIds as ids } from './operations-support'
declare const window: {
  archives: ArchiveApi
  vessels: VesselApi
  berths: BerthApi
  catalog: CatalogApi
}
let app: ElectronApplication, page: Page, folder: string
const navigate = (name: string) =>
  page
    .getByRole('navigation', { name: 'Navigazione principale' })
    .getByRole('button', { name, exact: true })
    .click()
test.beforeEach(async ({ playwright }) => {
  folder = mkdtempSync(join(tmpdir(), 'porto-pr05-'))
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  app = await playwright._electron.launch({
    ...(process.env.PORTO_PACKAGED_EXE
      ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
      : { args: [resolve('out/main/index.js')] }),
    env,
  })
  page = await app.firstWindow()
  await page.context().setOffline(true)
  await operationFixture(app, join(folder, 'pr05.ormeggi'), 17, true)
  // The temporary fixture contains a historical berth reference, predating its later rename.
  await app.evaluate(
    ({ app }, { path, ids }) => {
      const module = process.getBuiltinModule('module') as typeof import('node:module')
      const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
      const db = new Database(path)
      try {
        db.pragma('foreign_keys=ON')
        db.transaction(() => {
          db.prepare(
            "UPDATE operation_endpoints SET berth_id=?, berth_version_id='bv' WHERE operation_id=?",
          ).run(ids.berthId, ids.entryId)
          db.prepare(
            "UPDATE berth_stays SET berth_id=?, berth_version_id='bv' WHERE opening_operation_id=?",
          ).run(ids.berthId, ids.entryId)
        })()
      } finally {
        db.close()
      }
    },
    { path: join(folder, 'pr05.ormeggi'), ids },
  )
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'pr05.ormeggi'))
})
test.afterEach(async () => {
  await app?.close()
  rmSync(folder, { recursive: true, force: true })
})

test('PR05 ricerca server, pagina oltre 25, Enter/frecce/Escape/Tab, ritorno sezione, banchina e clear', async () => {
  await page.evaluate(async (portId) => {
    const initial = await window.archives.getState()
    if (!initial.ok || !initial.value.context) throw Error('context')
    let context = initial.value.context
    for (let index = 1; index <= 26; index++) {
      const suffix = String(index).padStart(2, '0')
      const vessel = await window.vessels.create({
        context,
        payload: {
          registeredName: 'PR05 Nave ' + suffix,
          imoNumber: null,
          vesselTypeId: 'STANDARD',
          size: 100,
        },
      })
      if (!vessel.ok) throw Error(vessel.error.message)
      context = vessel.context
      const berth = await window.berths.create({
        context,
        payload: { portId, name: 'PR05 Molo ' + suffix },
      })
      if (!berth.ok) throw Error(berth.error.message)
      context = berth.context
    }
  }, ids.portId)
  await navigate('Operazioni nave')
  const vessel = page.getByRole('combobox', { name: 'Nave', exact: true })
  await vessel.fill('PR05 Nave')
  await expect(page.getByText('Pagina 1 di 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: /PR05 Nave/ })).toHaveCount(25)
  await vessel.press('Tab')
  await expect(page.getByRole('button', { name: 'Avanti', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(vessel).toBeFocused()
  await vessel.press('Tab')
  await expect(page.getByRole('button', { name: 'Avanti', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(vessel).toBeFocused()
  await expect(page.getByRole('option', { name: /PR05 Nave 26/ })).toBeVisible()
  await vessel.press('ArrowDown')
  await vessel.press('Enter')
  await expect(vessel).toHaveValue(/PR05 Nave 26/)
  await vessel.click()
  await vessel.fill('nessun risultato PR05')
  await expect(page.getByText('Nessun risultato', { exact: true })).toBeVisible()
  await expect(
    page.locator('.paged-picker').filter({ has: vessel }).getByRole('status'),
  ).toContainText('0 risultati')
  await expect(page.getByRole('status')).toContainText('Selezionato fuori dai risultati')
  await vessel.press('Escape')
  await expect(vessel).toHaveValue(/PR05 Nave 26/)
  await navigate('Anagrafiche')
  await navigate('Operazioni nave')
  await expect(vessel).toHaveValue(/PR05 Nave 26/)
  await vessel.click()
  await expect(vessel).toHaveValue('nessun risultato PR05')
  await vessel.fill('PR05 Nave 01')
  await expect(page.getByRole('option', { name: /PR05 Nave 01/ })).toBeVisible()
  await vessel.press('ArrowUp')
  await vessel.press('Enter')
  // Arrow navigation never commits before Enter; the selected ID remains a backend reference.
  await vessel.click()
  await vessel.fill('PR05 Nave 01')
  await page.getByRole('option', { name: /PR05 Nave 01/ }).click()
  await expect(vessel).toHaveValue(/PR05 Nave 01/)
  await page.getByRole('button', { name: 'Nuova entrata', exact: true }).click()
  const modal = page.getByRole('dialog'),
    port = modal.getByRole('combobox', { name: 'Porto di arrivo', exact: true })
  await port.fill('Genova')
  await page.getByRole('option', { name: /Genova/ }).click()
  const berth = modal.getByRole('combobox', { name: 'Banchina (facoltativa)', exact: true })
  await berth.fill('PR05 Molo')
  await modal.getByRole('button', { name: 'Avanti', exact: true }).click()
  await page.getByRole('option', { name: /PR05 Molo 26/ }).click()
  await expect(berth).toHaveValue(/PR05 Molo 26/)
  await berth.press('Tab')
  await expect(
    modal.getByRole('button', { name: 'Rimuovi banchina (facoltativa)', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(berth).toHaveValue('')
  await expect(berth).toBeFocused()
  await berth.press('Escape')
  await expect(berth).toHaveAttribute('placeholder', 'Non specificata')
})

test('PR05 filtro catalogo storico disattivato fuori pagina, ripristino e clear; nuovo riferimento vietato', async () => {
  await page.evaluate(async () => {
    const initial = await window.archives.getState()
    if (!initial.ok || !initial.value.context) throw Error('context')
    let context = initial.value.context,
      last = ''
    for (let index = 1; index <= 26; index++) {
      const r = await window.catalog.create({
        context,
        payload: { description: 'PR05 Tipo ' + String(index).padStart(2, '0'), initialWeight: '1' },
      })
      if (!r.ok) throw Error(r.error.message)
      context = r.context
      last = r.value.id
    }
    const preview = await window.catalog.preview({
      context,
      payload: { operation: 'DEACTIVATE', id: last },
    })
    if (!preview.ok) throw Error(preview.error.message)
    const r = await window.catalog.confirm({
      context: preview.context,
      payload: { previewId: preview.value.previewId },
    })
    if (!r.ok) throw Error(r.error.message)
  })
  await navigate('Prestazioni')
  await page.getByText('Filtri prestazioni', { exact: true }).click()
  const filters = page.getByRole('region', { name: 'Filtri combinati', exact: true })
  const type = filters.getByRole('combobox', { name: 'Tipo di prestazione', exact: true })
  await type.fill('PR05 Tipo')
  await filters.getByRole('button', { name: 'Avanti', exact: true }).click()
  await page.getByRole('option', { name: 'PR05 Tipo 26 · Disattivato', exact: true }).click()
  await expect(type).toHaveValue('PR05 Tipo 26 · Disattivato')
  await type.click()
  await type.fill('PR05 Tipo 01')
  await expect(page.getByText('Selezionato fuori dai risultati', { exact: false })).toBeVisible()
  await type.press('Escape')
  await navigate('Anagrafiche')
  await navigate('Prestazioni')
  await expect(type).toHaveValue('PR05 Tipo 26 · Disattivato')
  await type.click()
  await expect(type).toHaveValue('PR05 Tipo 01')
  await type.press('Escape')
  await filters
    .getByRole('button', { name: 'Rimuovi filtro tipo di prestazione', exact: true })
    .click()
  await expect(type).toHaveValue('')
  await expect(type).toHaveAttribute('placeholder', 'Tutti i tipi')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).fill('Stella')
  await page.getByRole('option', { name: /Stella del mare/ }).click()
  await page.getByRole('button', { name: 'Nuova prestazione da catalogo', exact: true }).click()
  const fresh = page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Tipo di prestazione', exact: true })
  await fresh.fill('PR05 Tipo 26')
  await expect(page.getByText('Nessun risultato', { exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: /PR05 Tipo 26/ })).toHaveCount(0)
})

test('PR05 correzione: il retained mantiene il nome storico della banchina rinominata e disattivata', async () => {
  await page.evaluate(async (berthId) => {
    const initial = await window.archives.getState()
    if (!initial.ok || !initial.value.context) throw Error('context')
    const inserted = await window.berths.preview({
      context: initial.value.context,
      payload: {
        operation: 'INSERT_VERSION',
        berthId,
        name: 'PR05 Nome corrente',
        moment: { localDateTime: '2026-07-01T12:00', selectedOffset: null },
      },
    })
    if (!inserted.ok) throw Error(inserted.error.message)
    const confirmed = await window.berths.confirm({
      context: inserted.context,
      payload: { previewId: inserted.value.previewId },
    })
    if (!confirmed.ok) throw Error(confirmed.error.message)
    const preview = await window.berths.preview({
      context: confirmed.context,
      payload: { operation: 'DEACTIVATE_BERTH', berthId },
    })
    if (!preview.ok) throw Error(preview.error.message)
    const deactivated = await window.berths.confirm({
      context: preview.context,
      payload: { previewId: preview.value.previewId },
    })
    if (!deactivated.ok) throw Error(deactivated.error.message)
    const history = await window.berths.history({
      context: { sessionId: deactivated.context.sessionId },
      query: { id: berthId, page: 1, pageSize: 25 },
    })
    if (!history.ok || history.value.berth.version.name !== 'PR05 Nome corrente')
      throw Error('nome corrente')
  }, ids.berthId)
  await navigate('Operazioni nave')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).fill('Stella')
  await page.getByRole('option', { name: /Stella del mare/ }).click()
  await page.locator('.operations-rows button').first().click()
  await page.getByRole('button', { name: 'Correggi operazione', exact: true }).click()
  const modal = page.getByRole('dialog'),
    berth = modal.getByRole('combobox', { name: 'Banchina (facoltativa)', exact: true })
  await expect(berth).toHaveValue('Molo nord')
  await berth.fill('nessuna banchina PR05')
  const original = page.getByRole('option', { name: 'Molo nord', exact: true })
  await expect(original).toBeVisible()
  await expect(original).not.toHaveAttribute('data-combobox-disabled', 'true')
  await berth.press('Escape')
  await expect(berth).toHaveValue('Molo nord')
})
