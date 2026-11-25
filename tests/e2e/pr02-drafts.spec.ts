// Prepared for K4. Requires the final build/package; do not run in intermediate PR tasks.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import {
  operationFixture,
  delayOperationResponse,
  operationHeld,
  releaseOperation,
} from './operations-support'

let app: ElectronApplication, page: Page, folder: string
declare const window: { archives: ArchiveApi }
test.beforeEach(async ({ playwright }) => {
  folder = mkdtempSync(join(tmpdir(), 'porto-pr02-'))
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
  await operationFixture(app, join(folder, 'pr02.ormeggi'), 17, true)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'pr02.ormeggi'))
})
test.afterEach(async () => {
  await app?.close()
  rmSync(folder, { recursive: true, force: true })
})
async function operations() {
  await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: /^Stella del mare/ }).click()
}
const discardDialog = () => page.getByRole('dialog', { name: 'Scartare la bozza?', exact: true })
test('PR02 operazioni: Annulla conserva, Scarta avvia una volta e ignora la risoluzione tardiva; focus e navigazione', async () => {
  await operations()
  await page.getByRole('button', { name: 'Nuova entrata', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Nuova entrata', exact: true })
  await editor.getByLabel('Note', { exact: true }).fill('Contesto originale PR02')
  await editor.getByRole('combobox', { name: 'Porto di arrivo', exact: true }).click()
  await page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }).click()
  await editor.getByLabel('Momento economico locale').fill('2026-10-25T02:30')
  await delayOperationResponse(app, 'operations:resolve-moment')
  await editor.getByRole('button', { name: 'Verifica momento', exact: true }).click()
  await expect.poll(() => operationHeld(app)).toBe(true)
  await editor.getByRole('button', { name: 'Chiudi', exact: true }).click()
  const next = page.getByRole('button', { name: 'Nuova uscita', exact: true })
  await expect(next).toBeEnabled()
  await next.click()
  await expect(discardDialog().getByRole('button', { name: 'Annulla', exact: true })).toBeFocused()
  await discardDialog().getByRole('button', { name: 'Annulla', exact: true }).press('Enter')
  await expect(next).toBeFocused()
  await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
  await expect(editor.getByLabel('Note', { exact: true })).toHaveValue('Contesto originale PR02')
  await editor.press('Escape')
  await next.click()
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).press('Space')
  const exit = page.getByRole('dialog', { name: 'Nuova uscita', exact: true })
  await expect(exit.getByLabel('Note', { exact: true })).toHaveValue('')
  await releaseOperation(app)
  await expect(exit.getByText(/Scegli l’occorrenza/)).toHaveCount(0)
  await exit.press('Escape')
  await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
  await discardDialog().press('Escape')
  await expect(page.getByRole('heading', { name: 'Cronologia nave', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Prestazioni nave', exact: true })).toBeVisible()
})
test('PR02 esito perso: chiusura, nuovo comando, navigazione e menu File non rimuovono il blocco; recupero specifico', async () => {
  await operations()
  await page.getByRole('button', { name: /^Entrata · Effettuata/ }).click()
  await page.getByRole('button', { name: 'Modifica solo note', exact: true }).click()
  const editor = page.getByRole('dialog')
  await editor.getByLabel('Note', { exact: true }).fill('Scrittura unica PR02')
  await app.evaluate(({ ipcMain }) => {
    const handlers = (
      ipcMain as unknown as {
        _invokeHandlers: Map<
          string,
          (event: Electron.IpcMainInvokeEvent, input: unknown) => Promise<unknown>
        >
      }
    )._invokeHandlers
    const original = handlers.get('operations:update-notes')!
    ;(globalThis as unknown as { pr02Writes: number }).pr02Writes = 0
    ipcMain.removeHandler('operations:update-notes')
    ipcMain.handle('operations:update-notes', async (event, input) => {
      ;(globalThis as unknown as { pr02Writes: number }).pr02Writes++
      await original(event, input)
      throw Error('Risposta persa dopo commit PR02')
    })
  })
  await editor.getByRole('button', { name: 'Salva note', exact: true }).click()
  await expect(editor).toContainText('Esito non verificato')
  await editor.press('Escape')
  for (const label of ['Nuova entrata', 'Prestazioni']) {
    await page.getByRole('button', { name: label, exact: true }).click()
    const blocked = page.getByRole('dialog', { name: 'Bozza protetta', exact: true })
    await expect(blocked.getByRole('button', { name: 'Scarta', exact: true })).toHaveCount(0)
    await blocked.getByRole('button', { name: 'Chiudi', exact: true }).click()
  }
  // Native File accelerator follows the same renderer guard.
  await page.keyboard.press('Control+o')
  const blocked = page.getByRole('dialog', { name: 'Bozza protetta', exact: true })
  await blocked.getByRole('button', { name: 'Verifica esito', exact: true }).click()
  await expect(editor.getByLabel('Note', { exact: true })).toHaveValue('Scrittura unica PR02')
  await editor.getByRole('button', { name: 'Verifica esito della scrittura', exact: true }).click()
  await expect(editor).toHaveCount(0)
  expect(
    await app.evaluate(() => (globalThis as unknown as { pr02Writes: number }).pr02Writes),
  ).toBe(1)
})
test('PR02 sottosezioni: anagrafica chiusa conserva valori, conferma prima di Catalogo/Tariffe', async () => {
  await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
  await page.getByRole('button', { name: 'Agenzie', exact: true }).click()
  await page.getByRole('button', { name: 'Nuova agenzia', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Ragione sociale', { exact: true }).fill('Bozza PR02')
  await page.getByRole('dialog').press('Escape')
  await page.getByRole('button', { name: 'Navi', exact: true }).click()
  await discardDialog().getByRole('button', { name: 'Annulla', exact: true }).click()
  await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Ragione sociale', { exact: true })).toHaveValue(
    'Bozza PR02',
  )
  await page.getByRole('dialog').press('Escape')
  await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).click()
  await page.getByRole('button', { name: 'Nuovo tipo', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Descrizione', { exact: true }).fill('Catalogo PR02')
  await page.getByRole('dialog').press('Escape')
  await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
  await discardDialog().getByRole('button', { name: 'Annulla', exact: true }).click()
  await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tariffe', exact: true })).toBeVisible()
})
test('PR02 menu Salva con nome: Annulla conserva contesto e bozza; Scarta cambia sessione senza bozze riutilizzabili', async () => {
  await operations()
  const original = await page.evaluate(() => window.archives.getState())
  if (!original.ok) throw Error('context')
  await page.getByRole('button', { name: 'Nuova uscita', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Note', { exact: true }).fill('Vecchia sessione PR02')
  await page.getByRole('dialog').press('Escape')
  await app.evaluate(
    ({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path })
    },
    join(folder, 'copy.ormeggi'),
  )
  await page.keyboard.press('Control+Shift+s')
  await discardDialog().getByRole('button', { name: 'Annulla', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Riprendi bozza', exact: true })).toBeVisible()
  const canceled = await page.evaluate(() => window.archives.getState())
  expect(canceled.ok && canceled.value.context).toEqual(original.value.context)
  await page.keyboard.press('Control+Shift+s')
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'copy.ormeggi'))
  const copied = await page.evaluate(() => window.archives.getState())
  expect(copied.ok && copied.value.context?.sessionId).not.toBe(original.value.context?.sessionId)
  await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Riprendi bozza', exact: true })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Nave', exact: true })).toHaveValue('')
})
test('PR02 stesso editor: Scarta ricrea note e tariffa sullo stesso ID; nuova versione peso resta disponibile con una bozza', async () => {
  await operations()
  await page.getByRole('button', { name: /^Entrata · Effettuata/ }).click()
  await page.getByRole('button', { name: 'Modifica solo note', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Note', { exact: true }).fill('Da scartare PR02')
  await page.getByRole('dialog').press('Escape')
  await page.getByRole('button', { name: 'Modifica solo note', exact: true }).click()
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Note', { exact: true })).toHaveValue(
    'Entrata storica P10',
  )
  await page.getByRole('dialog').press('Escape')
  await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).click()
  await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
  await page.getByRole('combobox', { name: 'Porto', exact: true }).click()
  await page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }).click()
  await page.locator('.port-list-item').first().click()
  await page.getByRole('button', { name: 'Correggi tariffa', exact: true }).click()
  const price = () =>
    page
      .getByRole('dialog')
      .getByRole('tabpanel', { name: 'Nave normale', exact: true })
      .getByLabel('Valore EUR 1', { exact: true })
  await price().fill('999')
  await page.getByRole('dialog').press('Escape')
  await page.getByRole('button', { name: 'Correggi tariffa', exact: true }).click()
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).click()
  await expect(price()).toHaveValue('100')
  await page.getByRole('dialog').press('Escape')
  await page.getByRole('button', { name: 'Tipi di prestazione e pesi', exact: true }).click()
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).click()
  await page.getByRole('button', { name: 'Cronologia pesi entrata', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Nuova versione del peso', exact: true })
    .click()
  await page.getByRole('dialog').getByLabel('Peso', { exact: true }).fill('7,5')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Torna alla cronologia', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Nuova versione del peso', exact: true })
    .click()
  await discardDialog().getByRole('button', { name: 'Annulla', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Riprendi bozza', exact: true })
    .click()
  await expect(page.getByRole('dialog').getByLabel('Peso', { exact: true })).toHaveValue('7,5')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Torna alla cronologia', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Nuova versione del peso', exact: true })
    .click()
  await discardDialog().getByRole('button', { name: 'Scarta', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Peso', { exact: true })).toHaveValue('1')
})
