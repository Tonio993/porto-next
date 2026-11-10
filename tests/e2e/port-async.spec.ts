import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { PortApi } from '../../src/shared/contracts/ports'
declare const window: {
  archives: ArchiveApi
  ports: PortApi
  requestAnimationFrame: (callback: () => void) => number
}

test('scarta dettagli tardivi e aggiorna la versione corrente alla decorrenza senza scrivere', async ({
  playwright,
}) => {
  test.setTimeout(process.env.PORTO_PACKAGED_EXE ? 240_000 : 180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p04-async-'))
  const options = process.env.PORTO_PACKAGED_EXE
    ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
    : { args: [resolve('out/main/index.js')] }
  const env = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
    PORTO_TEST_USER_DATA: join(folder, 'preferences'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as Record<string, string>).ELECTRON_RUN_AS_NODE
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
      join(folder, 'async.ormeggi'),
    )
    await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Richieste asincrone')
    await page.getByRole('button', { name: 'Scegli posizione' }).click()
    const ids = await page.evaluate(async () => {
      const ids: string[] = []
      for (const name of ['Porto A', 'Porto B']) {
        const state = await window.archives.getState()
        if (!state.ok || !state.value.context) throw new Error('Contesto assente')
        const result = await window.ports.create({
          context: state.value.context,
          payload: { name, locality: 'Genova', countryCode: 'IT', initialZoneId: 'Europe/Rome' },
        })
        if (!result.ok) throw new Error(result.error.message)
        ids.push(result.value.id)
      }
      await window.archives.rename('Porti pronti')
      return ids
    })
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Apri porto 2', exact: true })).toBeVisible()
    await app.evaluate(({ ipcMain }, id) => {
      const handlers = (
        ipcMain as unknown as {
          _invokeHandlers: Map<
            string,
            (
              event: Electron.IpcMainInvokeEvent,
              request: { query: { id: string } },
            ) => Promise<unknown>
          >
        }
      )._invokeHandlers
      const original = handlers.get('ports:history')!
      const holder: { release?: () => void; held: boolean; used: boolean } = {
        held: false,
        used: false,
      }
      ;(globalThis as unknown as { delayedHistory: typeof holder }).delayedHistory = holder
      ipcMain.removeHandler('ports:history')
      ipcMain.handle('ports:history', async (event, request) => {
        const result = await original(event, request)
        if (request.query.id === id && !holder.used) {
          holder.used = true
          await new Promise<void>((release) => {
            holder.release = release
            holder.held = true
          })
        }
        return result
      })
    }, ids[0])
    await page.getByRole('button', { name: 'Apri porto 1', exact: true }).click()
    await expect
      .poll(() =>
        app!.evaluate(
          () =>
            (globalThis as unknown as { delayedHistory: { held: boolean } }).delayedHistory.held,
        ),
      )
      .toBe(true)
    await page.getByRole('button', { name: 'Apri porto 2', exact: true }).click()
    const detail = page.getByRole('region', { name: 'Dettaglio porto' })
    await expect(detail).toContainText('Porto 2 · Porto B')
    await app.evaluate(() =>
      (
        globalThis as unknown as { delayedHistory: { release: () => void } }
      ).delayedHistory.release(),
    )
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => done())),
        ),
    )
    await expect(detail).toContainText('Porto 2 · Porto B')

    // Closing an editor for another action must also cancel its moment response.
    await detail.getByRole('button', { name: 'Nuova versione', exact: true }).click()
    const editor = page.getByRole('region', { name: 'Editor versione' })
    await editor.getByLabel('Nome del porto').fill('Bozza da chiudere')
    await editor.getByLabel('Decorrenza locale').fill('2027-01-01T10:00')
    await app.evaluate(({ ipcMain }) => {
      const handlers = (
        ipcMain as unknown as {
          _invokeHandlers: Map<
            string,
            (event: Electron.IpcMainInvokeEvent, request: unknown) => Promise<unknown>
          >
        }
      )._invokeHandlers
      const original = handlers.get('ports:resolve-version-moment')!
      const holder: { held: boolean; release?: () => void } = { held: false }
      ;(globalThis as unknown as { delayedMoment: typeof holder }).delayedMoment = holder
      ipcMain.removeHandler('ports:resolve-version-moment')
      ipcMain.handle('ports:resolve-version-moment', async (event, request) => {
        const result = await original(event, request)
        await new Promise<void>((release) => {
          holder.release = release
          holder.held = true
        })
        return result
      })
    })
    await editor.getByRole('button', { name: 'Verifica decorrenza', exact: true }).click()
    await expect
      .poll(() =>
        app!.evaluate(
          () => (globalThis as unknown as { delayedMoment: { held: boolean } }).delayedMoment.held,
        ),
      )
      .toBe(true)
    await detail.getByRole('button', { name: 'Elimina porto', exact: true }).click()
    const preview = page.getByRole('region', { name: 'Anteprima modifica' })
    await expect(preview).toContainText('Operazione consentita')
    await app.evaluate(() =>
      (globalThis as unknown as { delayedMoment: { release: () => void } }).delayedMoment.release(),
    )
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => done())),
        ),
    )
    await expect(editor).toHaveCount(0)
    await preview.getByRole('button', { name: 'Chiudi anteprima' }).click()

    // Test clocks stay inside this isolated Electron process and renderer.
    const start = Date.parse('2026-11-10T10:59:50.000Z')
    await app.evaluate((_, time) => {
      const clock = { time }
      ;(globalThis as unknown as { p04Clock: typeof clock }).p04Clock = clock
      const OriginalDate = Date
      globalThis.Date = new Proxy(OriginalDate, {
        construct: (target, args) => Reflect.construct(target, args.length ? args : [clock.time]),
        get: (target, property) =>
          property === 'now' ? () => clock.time : Reflect.get(target, property),
      })
    }, start)
    await page.clock.install({ time: start - 60_000 })
    await page.clock.pauseAt(start)
    await page.evaluate(async (portId) => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw new Error('Contesto assente')
      const preview = await window.ports.previewInsertVersion({
        context: state.value.context,
        payload: {
          portId,
          name: 'Porto a mezzogiorno',
          locality: 'Genova',
          countryCode: 'IT',
          moment: { localDateTime: '2026-11-10T12:00', selectedOffset: null },
        },
      })
      if (!preview.ok) throw new Error(preview.error.message)
      const confirmed = await window.ports.confirmInsertVersion({
        context: preview.context,
        payload: { previewId: preview.value.previewId },
      })
      if (!confirmed.ok) throw new Error(confirmed.error.message)
      await window.archives.rename('Versione futura pronta')
    }, ids[1])
    const history = page.getByRole('region', { name: 'Cronologia porto' })
    await expect(history).toContainText('Versione con decorrenza · Futura')
    await expect(detail).toContainText('Porto 2 · Porto B')
    const before = await page.evaluate(() => window.archives.getState())
    await app.evaluate(() => {
      ;(globalThis as unknown as { p04Clock: { time: number } }).p04Clock.time = Date.parse(
        '2026-11-10T11:00:01.000Z',
      )
    })
    await page.clock.fastForward(11_000)
    await expect(detail).toContainText('Porto 2 · Porto a mezzogiorno')
    await expect(history).toContainText('Versione con decorrenza · Corrente')
    const after = await page.evaluate(() => window.archives.getState())
    if (!before.ok || !after.ok) throw new Error('Stato assente')
    expect(after.value.context).toEqual(before.value.context)
  } finally {
    await app?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
