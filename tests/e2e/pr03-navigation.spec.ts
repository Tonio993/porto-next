// Prepared for K4, on the final build and the same packaged executable. Not run in PR03.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { PortApi } from '../../src/shared/contracts/ports'
import type { BerthApi } from '../../src/shared/contracts/berths'
import type { OperationApi, CreateOperationDto } from '../../src/shared/contracts/operations'
import { operationFixture, operationFixtureIds as ids } from './operations-support'
declare const window: {
  archives: ArchiveApi
  ports: PortApi
  berths: BerthApi
  operations: OperationApi
}
let app: ElectronApplication, page: Page, folder: string
const navigate = (name: string) =>
  page
    .getByRole('navigation', { name: 'Navigazione principale' })
    .getByRole('button', { name, exact: true })
    .click()
test.beforeEach(async ({ playwright }) => {
  folder = mkdtempSync(join(tmpdir(), 'porto-pr03-'))
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
  page.setDefaultTimeout(12_000)
  await page.context().setOffline(true)
  await operationFixture(app, join(folder, 'pr03.ormeggi'), 17, true)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'pr03.ormeggi'))
})
test.afterEach(async () => {
  await app?.close()
  rmSync(folder, { recursive: true, force: true })
})

test('PR03 anagrafiche/banchine: filtri, pagine, proprietari e ritorno tra sottosezioni; backup e cambio sessione', async () => {
  test.setTimeout(180_000)
  const selected = await page.evaluate(async () => {
    const initial = await window.archives.getState()
    if (!initial.ok || !initial.value.context) throw Error('context')
    let context = initial.value.context
    let port!: { id: string; code: number }
    for (let index = 1; index <= 27; index++) {
      const result = await window.ports.create({
        context,
        payload: {
          name: 'PR03 Porto ' + String(index).padStart(2, '0'),
          locality: 'Genova',
          countryCode: 'IT',
          initialZoneId: 'Europe/Rome',
        },
      })
      if (!result.ok) throw Error(result.error.message)
      context = result.context
      port = result.value
    }
    let berthId = ''
    for (let index = 1; index <= 12; index++) {
      const result = await window.berths.create({
        context,
        payload: { portId: port.id, name: 'PR03 Banchina ' + String(index).padStart(2, '0') },
      })
      if (!result.ok) throw Error(result.error.message)
      context = result.context
      berthId = result.value.id
    }
    for (let day = 1; day <= 26; day++) {
      const preview = await window.ports.previewInsertVersion({
        context,
        payload: {
          portId: port.id,
          name: 'PR03 Porto 27',
          locality: 'Località PR03 ' + day,
          countryCode: 'IT',
          moment: {
            localDateTime: '2026-07-' + String(day).padStart(2, '0') + 'T12:00',
            selectedOffset: null,
          },
        },
      })
      if (!preview.ok) throw Error(preview.error.message)
      const result = await window.ports.confirmInsertVersion({
        context: preview.context,
        payload: { previewId: preview.value.previewId },
      })
      if (!result.ok) throw Error(result.error.message)
      context = result.context
    }
    for (let day = 1; day <= 11; day++) {
      const preview = await window.berths.preview({
        context,
        payload: {
          operation: 'INSERT_VERSION',
          berthId,
          name: 'PR03 Banchina 12 v' + day,
          moment: {
            localDateTime: '2026-07-' + String(day).padStart(2, '0') + 'T12:00',
            selectedOffset: null,
          },
        },
      })
      if (!preview.ok) throw Error(preview.error.message)
      const result = await window.berths.confirm({
        context: preview.context,
        payload: { previewId: preview.value.previewId },
      })
      if (!result.ok) throw Error(result.error.message)
      context = result.context
    }
    return { port, context }
  })
  await navigate('Anagrafiche')
  const ports = page.getByRole('region', { name: 'Elenco porti', exact: true })
  await ports.getByLabel('Cerca porto', { exact: true }).fill('PR03')
  await ports.getByRole('button', { name: 'Successiva', exact: true }).click()
  await expect(ports.getByText('Pagina 2', { exact: true })).toBeVisible()
  const chosen = ports.getByRole('button', {
    name: 'Apri porto ' + selected.port.code,
    exact: true,
  })
  await chosen.click()
  const berths = page.getByRole('region', { name: 'Banchine', exact: true })
  const list = berths.getByRole('group', { name: 'Elenco banchine', exact: true })
  await list.getByRole('button', { name: 'Avanti', exact: true }).click()
  await list.getByRole('button', { name: /PR03 Banchina 12/ }).click()
  const detail = berths.getByRole('region', { name: 'Dettaglio banchina', exact: true })
  await expect(detail.getByRole('heading', { name: /PR03 Banchina 12/ })).toBeVisible()
  const berthHistory = detail.getByRole('group', { name: 'Cronologia banchina', exact: true })
  await berthHistory.getByRole('button', { name: 'Avanti', exact: true }).click()
  const portHistory = page.getByRole('region', { name: 'Cronologia porto', exact: true })
  await portHistory.getByRole('button', { name: 'Altre versioni', exact: true }).click()
  await expect(berthHistory.getByText('Pagina 2 di 2', { exact: true })).toBeVisible()
  await expect(portHistory.getByText('Pagina 2 · 27 versioni', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clienti', exact: true }).click()
  await page.getByLabel('Cerca cliente', { exact: true }).fill('ricerca PR03')
  await navigate('Catalogo e tariffe')
  await navigate('Anagrafiche')
  await expect(page.getByLabel('Cerca cliente', { exact: true })).toHaveValue('ricerca PR03')
  await page.getByRole('button', { name: 'Porti', exact: true }).click()
  await expect(ports.getByLabel('Cerca porto', { exact: true })).toHaveValue('PR03')
  await expect(ports.getByText('Pagina 2', { exact: true })).toBeVisible()
  await expect(chosen).toHaveAttribute('aria-pressed', 'true')
  await expect(list.getByText('Pagina 2 di 2', { exact: true })).toBeVisible()
  await expect(detail.getByRole('heading', { name: /PR03 Banchina 12/ })).toBeVisible()
  await expect(berthHistory.getByText('Pagina 2 di 2', { exact: true })).toBeVisible()
  await expect(portHistory.getByText('Pagina 2 · 27 versioni', { exact: true })).toBeVisible()
  await ports.getByLabel('Cerca porto', { exact: true }).fill('Genova')
  await ports.getByRole('button', { name: 'Apri porto 1', exact: true }).click()
  await expect(list.getByRole('button', { name: /PR03 Banchina 12/ })).toHaveCount(0)
  await expect(detail).toHaveCount(0)
  await ports.getByLabel('Cerca porto', { exact: true }).fill('PR03')
  await ports.getByRole('button', { name: 'Successiva', exact: true }).click()
  await chosen.click()
  await expect(detail.getByRole('heading', { name: /PR03 Banchina 12/ })).toBeVisible()
  await expect(list.getByText('Pagina 2 di 2', { exact: true })).toBeVisible()
  // Existing selection remains consultable when no longer visible in the filtered list.
  await ports.getByLabel('Cerca porto', { exact: true }).fill('nessuna corrispondenza')
  await expect(detail.getByRole('heading', { name: /PR03 Banchina 12/ })).toBeVisible()
  await navigate('Archivi')
  const before = await page.evaluate(() => window.archives.getState())
  await app.evaluate(
    ({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path })
    },
    join(folder, 'backup.ormeggi'),
  )
  await page.getByRole('button', { name: 'Crea copia di backup', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Copia di backup creata' })).toBeVisible()
  await app.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] })
  })
  const cancelled = await page.evaluate(() => window.archives.open())
  expect(cancelled).toEqual(before)
  await navigate('Anagrafiche')
  await expect(ports.getByLabel('Cerca porto', { exact: true })).toHaveValue(
    'nessuna corrispondenza',
  )
  await expect(detail.getByRole('heading', { name: /PR03 Banchina 12/ })).toBeVisible()
  await navigate('Archivi')
  await app.evaluate(
    ({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path })
    },
    join(folder, 'saved.ormeggi'),
  )
  await page.getByRole('button', { name: 'Salva con nome', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'saved.ormeggi'))
  const after = await page.evaluate(() => window.archives.getState())
  expect(after.ok && after.value.context?.archiveId).toBe(
    before.ok && before.value.context?.archiveId,
  )
  expect(after.ok && after.value.context?.sessionId).not.toBe(
    before.ok && before.value.context?.sessionId,
  )
  await navigate('Anagrafiche')
  await expect(ports.getByLabel('Cerca porto', { exact: true })).toHaveValue('')
  await expect(ports.getByText('Pagina 1', { exact: true })).toBeVisible()
  await expect(berths).toHaveCount(0)
})

test('PR03 operazioni/permanenze: pagine e dettaglio fuori pagina, nave distinta e navigazione annullata', async () => {
  test.setTimeout(180_000)
  await page.evaluate(async (ids) => {
    const initial = await window.archives.getState()
    if (!initial.ok || !initial.value.context) throw Error('context')
    let context = initial.value.context
    const create = async (payload: CreateOperationDto) => {
      const p = await window.operations.previewCreate({ context, payload })
      if (!p.ok) throw Error(p.error.message)
      const r = await window.operations.confirmCreate({
        context: p.context,
        payload: { previewId: p.value.previewId },
      })
      if (!r.ok) throw Error(r.error.message)
      context = r.context
    }
    const common = {
      vesselId: ids.vesselId,
      executionStatus: 'PERFORMED' as const,
      notes: null,
      manualOverrideAmount: null,
    }
    await create({
      ...common,
      operationType: 'EXIT',
      interpretationPortId: null,
      moment: { localDateTime: '2026-05-03T12:00', selectedOffset: null },
    })
    for (let day = 1; day <= 26; day++) {
      const date = '2026-06-' + String(day).padStart(2, '0')
      await create({
        ...common,
        operationType: 'ENTRY',
        portId: ids.portId,
        berthId: ids.berthId,
        moment: { localDateTime: date + 'T12:00', selectedOffset: null },
      })
      await create({
        ...common,
        operationType: 'EXIT',
        interpretationPortId: null,
        moment: { localDateTime: date + 'T13:00', selectedOffset: null },
      })
    }
  }, ids)
  await navigate('Operazioni nave')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).fill('Stella')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: /Stella del mare/ }).click()
  await page.locator('.operations-rows button').first().click()
  const detail = page.getByLabel('Dettaglio operazione', { exact: true })
  await expect(detail).toBeVisible()
  const text = await detail.innerText()
  await page
    .locator('.operations-list')
    .getByRole('button', { name: 'Avanti', exact: true })
    .click()
  await expect(detail).toHaveText(text)
  await navigate('Anagrafiche')
  await navigate('Operazioni nave')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Nave', exact: true })).toHaveValue('Stella')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).press('Escape')
  await expect(
    page.locator('.operations-list').getByText('Pagina 2 di 3', { exact: true }),
  ).toBeVisible()
  await expect(detail).toHaveText(text)
  await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
  await page
    .locator('.operations-page')
    .getByRole('button', { name: 'Avanti', exact: true })
    .click()
  await expect(page.getByText('Pagina 2 di 2', { exact: true })).toBeVisible()
  const oldest = await page.locator('.operation-voyage').first().innerText()
  await navigate('Prestazioni')
  await navigate('Operazioni nave')
  await expect(page.getByRole('button', { name: 'Permanenze', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('Pagina 2 di 2', { exact: true })).toBeVisible()
  await expect(page.locator('.operation-voyage').first()).toHaveText(oldest)
  await page.getByRole('combobox', { name: 'Nave', exact: true }).fill('')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: /Aurora/ }).click()
  await expect(page.getByRole('button', { name: 'Operazioni', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: /Stella del mare/ }).click()
  await expect(page.getByRole('button', { name: 'Permanenze', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('Pagina 2 di 2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nuova entrata', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Nuova entrata', exact: true })
  await editor.getByLabel('Note', { exact: true }).fill('Bozza PR03')
  await editor.getByRole('button', { name: 'Chiudi', exact: true }).click()
  await navigate('Anagrafiche')
  await page
    .getByRole('dialog', { name: 'Scartare la bozza?', exact: true })
    .getByRole('button', { name: 'Annulla', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Permanenze', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
  await expect(editor.getByLabel('Note', { exact: true })).toHaveValue('Bozza PR03')
})
