import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { CatalogApi } from '../../src/shared/contracts/catalog'
declare const window: {
  archives: ArchiveApi
  catalog: CatalogApi
  requestAnimationFrame: (callback: () => void) => number
}
async function delay(app: ElectronApplication, channel: string, id: string | null = null) {
  await app.evaluate(
    ({ ipcMain }, { channel, id }) => {
      const handlers = (
        ipcMain as unknown as {
          _invokeHandlers: Map<
            string,
            (
              event: Electron.IpcMainInvokeEvent,
              request: { query: { id?: string } },
            ) => Promise<unknown>
          >
        }
      )._invokeHandlers
      const original = handlers.get(channel)!
      const holder: { used: boolean; held: boolean; release?: () => void } = {
        used: false,
        held: false,
      }
      ;(globalThis as unknown as { catalogDelay: typeof holder }).catalogDelay = holder
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, async (event, request) => {
        const result = await original(event, request)
        if (!holder.used && (id === null || request.query.id === id)) {
          holder.used = true
          await new Promise<void>((release) => {
            holder.release = release
            holder.held = true
          })
        }
        return result
      })
    },
    { channel, id },
  )
}
const held = (app: ElectronApplication) =>
  app.evaluate(
    () => (globalThis as unknown as { catalogDelay: { held: boolean } }).catalogDelay.held,
  )
const release = (app: ElectronApplication) =>
  app.evaluate(() =>
    (globalThis as unknown as { catalogDelay: { release: () => void } }).catalogDelay.release(),
  )

test('P08 catalogo: risposte tardive di dettaglio ed elenco, editor chiuso e cambio sessione', async ({
  playwright,
}) => {
  test.setTimeout(180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p08-async-'))
  const options = process.env.PORTO_PACKAGED_EXE
    ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
    : { args: [resolve('out/main/index.js')] }
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await playwright._electron.launch({ ...options, env })
    const page = await app.firstWindow()
    page.setDefaultTimeout(10_000)
    await page.context().setOffline(true)
    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      },
      join(folder, 'a.ormeggi'),
    )
    await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Async P08')
    await page.getByRole('button', { name: 'Scegli posizione' }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'a.ormeggi'))
    const ids = await page.evaluate(async () => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw new Error('context')
      let context = state.value.context
      const ids: string[] = []
      for (const description of ['Prima', 'Seconda']) {
        const r = await window.catalog.create({
          context,
          payload: { description, initialWeight: '1' },
        })
        if (!r.ok) throw new Error(r.error.message)
        context = r.context
        ids.push(r.value.id)
      }
      await window.archives.rename('Dati pronti')
      return ids
    })
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    const list = page.getByRole('region', { name: 'Elenco tipi di prestazione' }),
      detail = page.getByRole('region', { name: 'Dettaglio catalogo' })
    await delay(app, 'catalog:get', ids[0])
    await list.getByRole('button', { name: /Prima/ }).click()
    await expect.poll(() => held(app!)).toBe(true)
    await expect(detail.getByText('Caricamento dettaglio…')).toBeVisible()
    await list.getByRole('button', { name: /Seconda/ }).click()
    await expect(detail.getByRole('heading', { name: 'Seconda', exact: true })).toBeVisible()
    await release(app)
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          window.requestAnimationFrame(() => window.requestAnimationFrame(done)),
        ),
    )
    await expect(detail.getByRole('heading', { name: 'Seconda', exact: true })).toBeVisible()
    await detail.getByRole('button', { name: 'Rinomina', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Descrizione', { exact: true }).fill('Bozza annullata')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await detail.getByRole('button', { name: 'Rinomina', exact: true }).click()
    await expect(dialog.getByLabel('Descrizione', { exact: true })).toHaveValue('Seconda')
    await dialog.getByRole('button', { name: 'Annulla', exact: true }).click()
    await delay(app, 'catalog:list')
    await page.getByLabel('Cerca descrizione', { exact: true }).fill('nessuno')
    await expect.poll(() => held(app!)).toBe(true)
    await page.getByLabel('Cerca descrizione', { exact: true }).fill('Seconda')
    await expect(list.getByRole('button', { name: /Seconda/ })).toBeVisible()
    await release(app)
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          window.requestAnimationFrame(() => window.requestAnimationFrame(done)),
        ),
    )
    await expect(list.getByRole('button', { name: /Seconda/ })).toBeVisible()
    await expect(list.getByText('Nessun risultato. Modifica la ricerca.')).toHaveCount(0)
    await page.getByLabel('Cerca descrizione', { exact: true }).fill('')
    await list.getByRole('button', { name: /Prima/ }).click()
    await expect(detail.getByRole('heading', { name: 'Prima', exact: true })).toBeVisible()
    await delay(app, 'catalog:get', ids[1])
    await list.getByRole('button', { name: /Seconda/ }).click()
    await expect.poll(() => held(app!)).toBe(true)
    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      },
      join(folder, 'b.ormeggi'),
    )
    await page.evaluate(() => window.archives.saveAs())
    await release(app)
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    await expect(detail).toContainText('Seleziona un tipo')
    await expect(detail.getByRole('heading', { name: 'Seconda', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Nuovo tipo', exact: true }).click()
    await expect(dialog.getByLabel('Descrizione', { exact: true })).toHaveValue('')
    await expect(dialog.getByLabel('Peso iniziale', { exact: true })).toHaveValue('1')
  } finally {
    await app?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
