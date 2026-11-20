import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import { operationFixture } from './operations-support'

declare function requestAnimationFrame(callback: () => void): number
declare const document: { documentElement: { scrollWidth: number } }
declare const window: { innerWidth: number }

let app: ElectronApplication, page: Page, folder: string
test.beforeEach(async ({ playwright }) => {
  folder = mkdtempSync(join(tmpdir(), 'porto-ui04-'))
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
  await operationFixture(app, join(folder, 'ui04.ormeggi'), 17, true)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'ui04.ormeggi'))
})
test.afterEach(async () => {
  await app?.close()
  rmSync(folder, { recursive: true, force: true })
})

async function size(width: number, height: number, zoom = 1) {
  await app.evaluate(
    ({ BrowserWindow }, { width, height, zoom }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win.setSize(width, height)
      win.webContents.setZoomFactor(zoom)
    },
    { width, height, zoom },
  )
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  )
}
const nav = (name: string) => page.getByRole('button', { name, exact: true })
const modal = () => page.getByRole('dialog')
async function shot(name: string) {
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  )
  const png = await app.evaluate(async ({ BrowserWindow }) =>
    (await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'),
  )
  writeFileSync(test.info().outputPath(name + '.png'), Buffer.from(png, 'base64'))
}

test('UI04: navigazione e comandi raggiungibili alle due dimensioni e zoom 125/150%', async () => {
  test.setTimeout(180_000)
  for (const [width, height, zoom] of [
    [960, 700, 1],
    [1440, 960, 1],
    [1440, 960, 1.25],
    [1440, 960, 1.5],
  ]) {
    await size(width, height, zoom)
    for (const section of [
      'Anagrafiche',
      'Catalogo e tariffe',
      'Operazioni nave',
      'Prestazioni',
      'Riferimenti temporali',
      'Archivi',
    ]) {
      await nav(section).focus()
      await page.keyboard.press('Enter')
      await expect(nav(section)).toHaveAttribute('aria-current', 'page')
      await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
      await expect(page.getByRole('button', { name: /Informazioni.*0.1.0/ })).toBeInViewport()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      await shot(`${width}-${height}-${zoom}-${section}`)
    }
  }
})

test('UI04: errore peso associato al campo e focus restituito alla bozza conservata', async () => {
  await size(960, 700)
  await nav('Catalogo e tariffe').click()
  await nav('Cronologia pesi entrata').click()
  await page.keyboard.press('Escape')
  await expect(nav('Cronologia pesi entrata')).toBeFocused()
  await page.keyboard.press('Enter')
  await modal().getByRole('button', { name: 'Correggi peso', exact: true }).click()
  const field = modal().getByRole('textbox', { name: 'Peso', exact: true })
  await expect(field).toBeFocused()
  await field.fill('0')
  await modal().getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
  await expect(modal().getByRole('alert', { name: 'Operazione non completata' })).toBeVisible()
  await shot('peso-errore-minimo')
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(field).toHaveAccessibleDescription(/maggiore di zero/)
  await page.keyboard.press('Escape')
  await expect(modal()).toHaveCount(0)
  await expect(nav('Riprendi bozza peso')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(field).toHaveValue('0')
  await field.fill('1,5')
  await modal().getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
  await expect(modal().getByText('Operazione consentita', { exact: true })).toBeVisible()
  await modal()
    .getByRole('button', { name: 'Conferma modifica', exact: true })
    .scrollIntoViewIfNeeded()
  await expect(
    modal().getByRole('button', { name: 'Conferma modifica', exact: true }),
  ).toBeInViewport()
  await shot('peso-anteprima-minimo')
  await modal().getByRole('button', { name: 'Chiudi anteprima', exact: true }).click()
  await expect(field).toBeFocused()
  await expect(field).toHaveValue('1,5')
})

test('UI04: chiusura tariffa conserva bozza e restituisce il focus da tastiera', async () => {
  await size(1440, 960)
  await nav('Catalogo e tariffe').click()
  await nav('Tariffe').click()
  await page.getByRole('combobox', { name: 'Porto', exact: true }).click()
  await page.getByRole('option', { name: '1 · Genova', exact: true }).click()
  await page.locator('.port-list-item').first().click()
  await nav('Correggi tariffa').click()
  const field = modal()
    .getByRole('tabpanel', { name: 'STANDARD', exact: true })
    .getByLabel('Valore EUR 1', { exact: true })
  await field.fill('234,56')
  await page.keyboard.press('Escape')
  await expect(modal()).toHaveCount(0)
  await expect(nav('Riprendi bozza')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(field).toHaveValue('234,56')
  await modal().getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
  await expect(modal().getByText('Operazione consentita', { exact: true })).toBeVisible()
  await shot('tariffa-anteprima-desktop')
})

test('UI04: anteprima eliminazione con tipologia e stato leggibili in italiano', async () => {
  await size(960, 700)
  await nav('Operazioni nave').click()
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: /^1 · Stella del mare/ }).click()
  await page.getByRole('button', { name: /^Entrata · Effettuata/ }).click()
  await nav('Elimina operazione').click()
  await modal().getByRole('button', { name: 'Analizza eliminazione', exact: true }).click()
  const preview = modal().getByRole('region', { name: 'Anteprima modifica' })
  await expect(
    preview
      .getByRole('row')
      .filter({ hasText: 'Stato' })
      .getByRole('cell', { name: 'Effettuata', exact: true }),
  ).toBeVisible()
  await expect(
    preview
      .getByRole('row')
      .filter({ hasText: 'Tipologia' })
      .getByRole('cell', { name: 'Entrata', exact: true }),
  ).toBeVisible()
  await preview
    .getByRole('button', { name: 'Chiudi anteprima', exact: true })
    .scrollIntoViewIfNeeded()
  await preview.getByRole('cell', { name: 'Effettuata', exact: true }).scrollIntoViewIfNeeded()
  await shot('operazione-eliminazione-minimo')
  await page.keyboard.press('Escape')
  await expect(nav('Elimina operazione')).toBeFocused()
})
