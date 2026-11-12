import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { TariffApi } from '../../src/shared/contracts/tariffs'
import type { PortApi } from '../../src/shared/contracts/ports'
import type { VesselApi } from '../../src/shared/contracts/vessels'
declare const window: {
  archives: ArchiveApi
  tariffs: TariffApi
  ports: PortApi
  vessels: VesselApi
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
      ;(globalThis as unknown as { tariffDelay: typeof holder }).tariffDelay = holder
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
  app.evaluate(() => (globalThis as unknown as { tariffDelay: { held: boolean } }).tariffDelay.held)
const release = (app: ElectronApplication) =>
  app.evaluate(() =>
    (globalThis as unknown as { tariffDelay: { release: () => void } }).tariffDelay.release(),
  )

test('P09 asincronia: selezioni, liste, risoluzione a editor chiuso, calcolo superato, futuro corrente e cambio sessione', async ({
  playwright,
}) => {
  test.setTimeout(180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p09-async-'))
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await playwright._electron.launch({
      ...(process.env.PORTO_PACKAGED_EXE
        ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
        : { args: [resolve('out/main/index.js')] }),
      env,
    })
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
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('P09 async')
    await page.getByRole('button', { name: 'Scegli posizione', exact: true }).click()
    const ids = await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw new Error('context')
      let context = s.value.context
      const a = await window.ports.create({
        context,
        payload: {
          name: 'Genova',
          locality: 'Genova',
          countryCode: 'IT',
          initialZoneId: 'Europe/Rome',
        },
      })
      if (!a.ok) throw new Error(a.error.message)
      context = a.context
      const b = await window.ports.create({
        context,
        payload: {
          name: 'Trieste',
          locality: 'Trieste',
          countryCode: 'IT',
          initialZoneId: 'Europe/Rome',
        },
      })
      if (!b.ok) throw new Error(b.error.message)
      context = b.context
      const v = await window.vessels.create({
        context,
        payload: {
          registeredName: 'Nave async',
          imoNumber: null,
          vesselTypeId: 'STANDARD',
          size: 0,
        },
      })
      if (!v.ok) throw new Error(v.error.message)
      context = v.context
      const tariffs: string[] = []
      for (const [localDateTime, price] of [
        ['2026-01-01T00:00', '100'],
        ['2027-01-01T10:00', '200'],
      ] as const) {
        const p = await window.tariffs.previewCreate({
          context,
          payload: {
            portId: a.value.id,
            moment: { localDateTime, selectedOffset: null },
            configurations: (['STANDARD', 'PASSENGER', 'ADM'] as const).map((vesselTypeId) => ({
              vesselTypeId,
              brackets: [{ upperLimit: 1600, value: price }],
              extraWidth: 200,
              extraValue: '5',
            })),
          },
        })
        if (!p.ok) throw new Error(p.error.message)
        const r = await window.tariffs.confirmCreate({
          context: p.context,
          payload: { previewId: p.value.previewId },
        })
        if (!r.ok) throw new Error(r.error.message)
        context = r.context
        tariffs.push(r.value.id)
      }
      await window.archives.rename('Async pronto')
      return { port: a.value.id, other: b.value.id, tariffs }
    })
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
    const list = page.getByRole('region', { name: 'Elenco tariffe' }),
      detail = page.getByRole('region', { name: 'Dettaglio tariffa' }),
      editor = page.getByRole('dialog')
    const choosePort = async (name: string) => {
      await list.getByLabel('Porto', { exact: true }).click()
      await page.getByRole('option', { name: new RegExp(name) }).click()
    }
    await choosePort('Genova')
    await delay(app, 'tariffs:get', ids.tariffs[0])
    await list.getByRole('button', { name: /2026-01-01/ }).click()
    await expect.poll(() => held(app!)).toBe(true)
    await list.getByRole('button', { name: /2027-01-01/ }).click()
    await expect(detail).toContainText('2027-01-01T09:00:00.000Z')
    await release(app)
    await expect(detail).toContainText('2027-01-01T09:00:00.000Z')
    await delay(app, 'tariffs:list')
    await choosePort('Trieste')
    await expect.poll(() => held(app!)).toBe(true)
    await choosePort('Genova')
    await expect(list).toContainText('2 tariffe')
    await release(app)
    await expect(list).toContainText('2 tariffe')
    await list.getByRole('button', { name: 'Nuova tariffa', exact: true }).click()
    await editor.getByLabel('Decorrenza locale').fill('2026-10-25T02:30')
    await delay(app, 'tariffs:resolve-moment')
    await editor.getByRole('button', { name: 'Verifica decorrenza', exact: true }).click()
    await expect.poll(() => held(app!)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(editor).toHaveCount(0)
    await list.getByRole('button', { name: 'Nuova tariffa', exact: true }).click()
    await release(app)
    await expect(editor).not.toContainText('Scegli l’occorrenza')
    await expect(editor.getByLabel('Decorrenza locale')).toHaveValue('')
    await page.keyboard.press('Escape')
    await detail.getByRole('button', { name: 'Apri calcolatore', exact: true }).click()
    await editor.getByLabel('Nave', { exact: true }).click()
    await page.getByRole('option', { name: /Nave async/ }).click()
    await editor.getByLabel('Momento economico locale').fill('2026-01-01T00:00')
    await delay(app, 'tariffs:simulate-base')
    await editor.getByRole('button', { name: 'Simula base', exact: true }).click()
    await expect.poll(() => held(app!)).toBe(true)
    await editor.getByLabel('Momento economico locale').fill('2027-01-01T10:00')
    await release(app)
    await expect(editor.getByTestId('calculated-base')).toHaveCount(0)
    await editor.getByRole('button', { name: 'Simula base', exact: true }).click()
    await expect(editor.getByTestId('calculated-base')).toHaveText('200,00 €')
    await page.keyboard.press('Escape')
    await expect(editor).toHaveCount(0)
    await expect(page.locator('.mantine-Modal-overlay')).toHaveCount(0)
    // Isolated main/renderer clocks verify read refresh without changing the draft revision.
    const start = Date.parse('2027-01-01T08:59:50.000Z')
    await app.evaluate((_, time) => {
      const clock = { time }
      ;(globalThis as unknown as { tariffClock: typeof clock }).tariffClock = clock
      const OriginalDate = Date
      globalThis.Date = new Proxy(OriginalDate, {
        construct: (target, args) => Reflect.construct(target, args.length ? args : [clock.time]),
        get: (target, key) => (key === 'now' ? () => clock.time : Reflect.get(target, key)),
      })
    }, start)
    await page.clock.install({ time: start - 60_000 })
    await page.clock.pauseAt(start)
    await list.getByRole('button', { name: /2026-01-01/ }).click()
    await list.getByRole('button', { name: /2027-01-01/ }).click()
    await expect(detail.getByText('Futura', { exact: true })).toBeVisible()
    await list.getByRole('button', { name: 'Nuova tariffa', exact: true }).click()
    await page.clock.runFor(500)
    await editor.getByLabel('Decorrenza locale').fill('2027-03-01T10:00')
    const before = await page.evaluate(() => window.archives.getState())
    await app.evaluate(() => {
      ;(globalThis as unknown as { tariffClock: { time: number } }).tariffClock.time = Date.parse(
        '2027-01-01T09:00:01.000Z',
      )
    })
    await page.clock.fastForward(11_000)
    await expect(detail.getByText('Corrente', { exact: true })).toBeVisible()
    await expect(editor.getByLabel('Decorrenza locale')).toHaveValue('2027-03-01T10:00')
    await expect(editor).not.toContainText('Bozza obsoleta')
    expect(await page.evaluate(() => window.archives.getState())).toEqual(before)
    await page.keyboard.press('Escape')
    await page.clock.runFor(500)
    await page.clock.resume()
    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      },
      join(folder, 'copy.ormeggi'),
    )
    await delay(app, 'tariffs:list')
    await choosePort('Trieste')
    await expect.poll(() => held(app!)).toBe(true)
    const oldSession = await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw new Error('context')
      const r = await window.archives.saveAs({ context: s.value.context, payload: null })
      if (!r.ok) throw new Error(r.error.message)
      return s.value.context.sessionId
    })
    await release(app)
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
    await expect(list.getByLabel('Porto', { exact: true })).toHaveValue('')
    expect(
      await page.evaluate(
        ({ sessionId, portId }) =>
          window.tariffs.list({ context: { sessionId }, query: { portId, page: 1, pageSize: 25 } }),
        { sessionId: oldSession, portId: ids.port },
      ),
    ).toMatchObject({ ok: false, context: null, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
