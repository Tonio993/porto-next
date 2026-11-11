import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { CustomerApi } from '../../src/shared/contracts/customers'
import type { AgencyApi } from '../../src/shared/contracts/agencies'
import type { TimeApi } from '../../src/shared/contracts/values'

declare const window: {
  archives: ArchiveApi
  customers: CustomerApi
  agencies: AgencyApi
  time: TimeApi
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
      ;(globalThis as unknown as { subjectDelay: typeof holder }).subjectDelay = holder
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
    () => (globalThis as unknown as { subjectDelay: { held: boolean } }).subjectDelay.held,
  )
const release = (app: ElectronApplication) =>
  app.evaluate(() =>
    (globalThis as unknown as { subjectDelay: { release: () => void } }).subjectDelay.release(),
  )

for (const [kind, plural, singular] of [
  ['customers', 'Clienti', 'cliente'],
  ['agencies', 'Agenzie', 'agenzia'],
] as const) {
  test(`P06 ${plural}: scarta risposte tardive di dettaglio, decorrenza e archivio precedente`, async ({
    playwright,
  }) => {
    test.setTimeout(180_000)
    const folder = mkdtempSync(join(tmpdir(), 'porto-p06-async-'))
    const options = process.env.PORTO_PACKAGED_EXE
      ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
      : { args: [resolve('out/main/index.js')] }
    const env = {
      ...process.env,
      PORTO_TEST_USER_DATA: join(folder, 'preferences'),
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
        join(folder, 'A.ormeggi'),
      )
      await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).click()
      await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Risposte P06')
      await page.getByRole('button', { name: 'Scegli posizione' }).click()
      const ids = await page.evaluate(async (kind) => {
        const state = await window.archives.getState()
        if (!state.ok || !state.value.context) throw new Error('No context')
        const zone = await window.time.configureCompanyZone({
          context: state.value.context,
          payload: { zoneId: 'Europe/Rome' },
        })
        if (!zone.ok) throw new Error(zone.error.message)
        let context = zone.context
        const ids: string[] = []
        for (const businessName of ['Prima', 'Seconda']) {
          const result = await window[kind].create({ context, payload: { businessName } })
          if (!result.ok) throw new Error(result.error.message)
          ids.push(result.value.id)
          context = result.context
        }
        await window.archives.rename('Dati pronti')
        return ids
      }, kind)
      await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
      await page.getByRole('button', { name: plural, exact: true }).click()
      const list = page.getByRole('group', { name: `Elenco ${plural.toLowerCase()}` })
      const detail = page.getByRole('region', { name: `Dettaglio ${singular}` })
      await delay(app, kind + ':history', ids[0])
      await list.getByRole('button', { name: /Prima/ }).click()
      await expect.poll(() => held(app!)).toBe(true)
      await expect(
        page.getByRole('status').filter({ hasText: `Caricamento dettaglio ${singular}` }),
      ).toBeVisible()
      await list.getByRole('button', { name: /Seconda/ }).click()
      await expect(detail).toContainText('2 · Seconda')
      await release(app)
      await page.evaluate(
        () =>
          new Promise<void>((done) =>
            window.requestAnimationFrame(() => window.requestAnimationFrame(done)),
          ),
      )
      await expect(detail).toContainText('2 · Seconda')
      await detail.getByRole('button', { name: `Nuova versione ${singular}`, exact: true }).click()
      const editor = page.getByRole('dialog', { name: `Nuova versione ${singular}` })
      await editor.getByLabel('Ragione sociale').fill('Bozza precedente')
      await editor.getByLabel('Decorrenza locale').fill('2090-01-01T10:00')
      await delay(app, kind + ':resolve-version-moment')
      await editor.getByRole('button', { name: 'Verifica decorrenza' }).click()
      await expect.poll(() => held(app!)).toBe(true)
      await editor.getByRole('button', { name: 'Annulla modifica' }).click()
      await detail.getByRole('button', { name: `Nuova versione ${singular}`, exact: true }).click()
      await release(app)
      await page.evaluate(
        () =>
          new Promise<void>((done) =>
            window.requestAnimationFrame(() => window.requestAnimationFrame(done)),
          ),
      )
      await expect(editor.getByLabel('Ragione sociale')).toHaveValue('Seconda')
      await expect(editor.getByLabel('Decorrenza locale')).toHaveValue('')
      await expect(editor.getByText(/Offset scelto/)).toHaveCount(0)
      await editor.getByRole('button', { name: 'Annulla modifica' }).click()
      await delay(app, kind + ':list')
      await page.getByLabel('Cerca ragione sociale o codice').fill('nessuno')
      await expect.poll(() => held(app!)).toBe(true)
      const copy = join(folder, 'copy.ormeggi')
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, copy)
      await page.evaluate(() => window.archives.saveAs())
      await expect(page.getByTestId('archive-path')).toHaveText(copy)
      await release(app)
      await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
      await page.getByRole('button', { name: plural, exact: true }).click()
      await expect(page.getByLabel('Cerca ragione sociale o codice')).toHaveValue('')
      await expect(list.getByRole('button', { name: /Prima/ })).toBeVisible()
      await expect(list.getByRole('button', { name: /Seconda/ })).toBeVisible()
      await expect(detail).toHaveCount(0)
    } finally {
      await app?.close()
      rmSync(folder, { recursive: true, force: true })
    }
  })
}
