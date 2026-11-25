// Prepared for K4 on the final build and on PORTO_PACKAGED_EXE. Never run in PR06.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { TimeApi } from '../../src/shared/contracts/values'
import { operationFixture } from './operations-support'

declare const window: { archives: ArchiveApi; time: TimeApi }
let app: ElectronApplication, page: Page, folder: string
const nav = (label: string) =>
  page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click()
test.beforeEach(async ({ playwright }) => {
  folder = mkdtempSync(join(tmpdir(), 'porto-pr06-'))
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
    TZ: 'America/New_York',
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
})
test.afterEach(async () => {
  await app?.close()
  rmSync(folder, { recursive: true, force: true })
})
async function newArchive() {
  await app.evaluate(
    ({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    },
    join(folder, 'pr06.ormeggi'),
  )
  await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).click()
  await page.getByLabel('Nome dell’archivio').fill('PR06 offline')
  await page.getByRole('button', { name: 'Scegli posizione', exact: true }).click()
}
async function country(code: string) {
  await page.getByRole('combobox', { name: 'Paese', exact: true }).click()
  await page.getByRole('option', { name: new RegExp('\\(' + code + '\\)$') }).click()
}

test('PR06 dataset offline, scelta multipla, cambio paese e tastiera/focus; vale anche per la risorsa nel pacchetto', async () => {
  await newArchive()
  await nav('Riferimenti temporali')
  const company = page.getByRole('combobox', { name: 'Fuso IANA aziendale' })
  await company.fill('Europe/Rome')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(company).toBeFocused()
  await expect(company).toHaveValue('Europe/Rome')
  await page.getByRole('button', { name: 'Conferma fuso iniziale', exact: true }).click()
  await nav('Anagrafiche')
  await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
  const zone = page.getByRole('combobox', { name: 'Fuso IANA del porto' })
  await expect(zone).toHaveValue('Europe/Rome')
  await country('US')
  await expect(zone).toHaveValue('')
  await zone.fill('America/')
  await expect.poll(() => page.getByRole('option').count()).toBeGreaterThan(10)
  await zone.fill('America/New_York')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(zone).toHaveValue('America/New_York')
  await expect(zone).toBeFocused()
  await zone.click()
  await page.keyboard.press('Escape')
  await expect(zone).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(zone).not.toBeFocused()
  await country('IT')
  await expect(zone).toHaveValue('Europe/Rome')
  await country('BV')
  await expect(zone).toBeDisabled()
  await expect(page.getByText(/Nessun fuso supportato associato/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crea porto', exact: true })).toBeDisabled()
  await country('US')
  await expect(zone).toHaveValue('')
  await zone.fill('America/Chicago')
  await page.getByRole('option', { name: 'America/Chicago', exact: true }).click()
  await page.getByLabel('Nome del porto').fill('Chicago')
  await page.getByLabel('Località').fill('Chicago')
  await page.getByRole('button', { name: 'Crea porto', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Dettaglio porto' })).toContainText(
    'America/Chicago',
  )
})
test('PR06 alias aziendale compatibile e UTC disponibili offline, configurazione confermata protetta', async () => {
  await newArchive()
  await nav('Riferimenti temporali')
  const company = page.getByRole('combobox', { name: 'Fuso IANA aziendale' })
  await company.fill('UTC')
  await expect(page.getByRole('option', { name: 'UTC', exact: true })).toBeVisible()
  await company.fill('US/Eastern')
  await page.getByRole('option', { name: 'US/Eastern', exact: true }).click()
  await page.getByRole('button', { name: 'Conferma fuso iniziale', exact: true }).click()
  await expect(page.getByText('Fuso aziendale confermato:')).toContainText('US/Eastern')
  await expect(company).toHaveCount(0)
  await nav('Anagrafiche')
  await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
  await country('US')
  await expect(page.getByLabel('Fuso IANA del porto')).toHaveValue('America/New_York')
  await country('IT')
  await expect(page.getByLabel('Fuso IANA del porto')).toHaveValue('Europe/Rome')
})
test('PR06 visualizzazioni rappresentative e tuple permanenze dal backend con renderer offline e TZ diverso', async () => {
  await operationFixture(app, join(folder, 'fixture.ormeggi'), 17, true)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByText('01/01/2026 00:00 (+00:00) · UTC', { exact: true })).toBeVisible()
  const before = await page.evaluate(() => window.archives.getState())
  await nav('Operazioni nave')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: 'Stella del mare arrivo', exact: true }).click()
  await page
    .locator('.operations-rows button')
    .filter({ hasText: '02/05/2026 12:00 (+02:00)' })
    .click()
  await expect(page.getByLabel('Dettaglio operazione', { exact: true })).toContainText(
    '02/05/2026 12:00 (+02:00)',
  )
  await expect(page.getByLabel('Dettaglio operazione', { exact: true })).toContainText(
    'Europe/Rome',
  )
  await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
  const voyage = page.locator('article.operation-voyage').first()
  await expect(voyage).toContainText('02/05/2026 12:00 (+02:00)')
  await expect(voyage).toContainText('Fine: Aperta')
  const after = await page.evaluate(() => window.archives.getState())
  expect(after).toEqual(before)
})
