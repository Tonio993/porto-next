import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { VesselApi } from '../../src/shared/contracts/vessels'
import type { TimeApi } from '../../src/shared/contracts/values'

declare const window: {
  archives: ArchiveApi
  vessels: VesselApi
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

for (const [kind, plural, singular] of [['vessels', 'Navi', 'nave']] as const) {
  test(`P07 ${plural}: risposte tardive, cambio sessione e futuro → corrente senza scritture`, async ({
    playwright,
  }) => {
    test.setTimeout(180_000)
    const folder = mkdtempSync(join(tmpdir(), 'porto-p07-async-'))
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
      await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Risposte P07')
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
        for (const registeredName of ['Prima', 'Seconda']) {
          const result = await window[kind].create({
            context,
            payload: { registeredName, imoNumber: null, vesselTypeId: 'STANDARD', size: 0 },
          })
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
      await editor.getByLabel('Nome di registrazione').fill('Bozza precedente')
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
      await expect(editor.getByLabel('Nome di registrazione')).toHaveValue('Seconda')
      await expect(editor.getByLabel('Decorrenza locale')).toHaveValue('')
      await expect(editor.getByText(/Offset scelto/)).toHaveCount(0)
      await editor.getByRole('button', { name: 'Annulla modifica' }).click()
      await delay(app, kind + ':list')
      await page.getByLabel('Cerca nome, IMO o codice').fill('nessuno')
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
      await expect(page.getByLabel('Cerca nome, IMO o codice')).toHaveValue('')
      await expect(list.getByRole('button', { name: /Prima/ })).toBeVisible()
      await expect(list.getByRole('button', { name: /Seconda/ })).toBeVisible()
      await expect(detail).toHaveCount(0)

      await list.getByRole('button', { name: /Seconda/ }).click()
      await expect(detail).toContainText('2 · Seconda')
      // Clocks are isolated to this test's main process and renderer.
      const start = Date.parse('2027-01-01T08:59:50.000Z')
      await app.evaluate((_, time) => {
        const clock = { time }
        ;(globalThis as unknown as { vesselClock: typeof clock }).vesselClock = clock
        const OriginalDate = Date
        globalThis.Date = new Proxy(OriginalDate, {
          construct: (target, args) => Reflect.construct(target, args.length ? args : [clock.time]),
          get: (target, property) =>
            property === 'now' ? () => clock.time : Reflect.get(target, property),
        })
      }, start)
      await page.clock.install({ time: start - 60_000 })
      await page.clock.pauseAt(start)
      await page.evaluate(async (vesselId) => {
        const state = await window.archives.getState()
        if (!state.ok || !state.value.context) throw new Error('Contesto assente')
        const p = await window.vessels.preview({
          context: state.value.context,
          payload: {
            operation: 'INSERT_VERSION',
            vesselId,
            registeredName: 'Seconda futura',
            imoNumber: '000-A',
            vesselTypeId: 'ADM',
            size: 2000,
            moment: { localDateTime: '2027-01-01T10:00', selectedOffset: null },
          },
        })
        if (!p.ok) throw new Error(p.error.message)
        const r = await window.vessels.confirm({
          context: p.context,
          payload: { previewId: p.value.previewId },
        })
        if (!r.ok) throw new Error(r.error.message)
        await window.archives.rename('Futuro pronto')
      }, ids[1])
      const history = page.getByRole('group', { name: 'Cronologia nave', exact: true })
      await expect(history).toContainText('Versione con decorrenza · Futura')
      await expect(detail.getByRole('heading').first()).toContainText('2 · Seconda')
      await detail.getByRole('button', { name: 'Nuova versione nave', exact: true }).click()
      // Modal transitions also use the test clock.
      await page.clock.runFor(500)
      await expect(editor.getByLabel('Dimensione')).toHaveValue('0')
      await editor.getByLabel('Nome di registrazione').fill('Bozza conservata')
      const before = await page.evaluate(() => window.archives.getState())
      await app.evaluate(() => {
        ;(globalThis as unknown as { vesselClock: { time: number } }).vesselClock.time = Date.parse(
          '2027-01-01T09:00:01.000Z',
        )
      })
      await page.clock.fastForward(11_000)
      await expect(detail.getByRole('heading').first()).toContainText('2 · Seconda futura')
      await expect(history).toContainText('Versione con decorrenza · Corrente')
      await expect(editor.getByLabel('Nome di registrazione')).toHaveValue('Bozza conservata')
      await expect(editor.getByLabel('Dimensione')).toHaveValue('0')
      await expect(editor.getByText('Bozza precedente ai dati attuali')).toHaveCount(0)
      const after = await page.evaluate(() => window.archives.getState())
      if (!before.ok || !after.ok) throw new Error('Stato assente')
      expect(after.value.context).toEqual(before.value.context)
    } finally {
      await app?.close()
      rmSync(folder, { recursive: true, force: true })
    }
  })
}
