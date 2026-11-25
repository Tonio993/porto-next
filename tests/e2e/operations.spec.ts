import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { OperationApi } from '../../src/shared/contracts/operations'
import type { TariffApi } from '../../src/shared/contracts/tariffs'
import { operationFixture, operationFixtureIds } from './operations-support'
declare const window: { archives: ArchiveApi; operations: OperationApi; tariffs: TariffApi }
test('P10: migrazione v10, registrazione, MISSED, permanenze, tariffa intermedia, copie e riapertura offline', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(240_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p10-desktop-')),
    path = join(folder, 'a.ormeggi'),
    copy = join(folder, 'copy.ormeggi')
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
    TZ: 'America/New_York',
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
    page.setDefaultTimeout(12_000)
    await page.context().setOffline(true)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await operationFixture(app, path)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    expect(readdirSync(folder).some((n) => n.includes('.prima-v17-'))).toBe(true)
    expect(await page.evaluate(() => window.archives.getState())).toMatchObject({
      ok: true,
      value: { active: { schemaVersion: 17 }, context: { revision: '42' } },
    })
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
    await page.getByRole('option', { name: 'Stella del mare' }).click()
    await expect(page.getByText('Nessuna operazione registrata.')).toBeVisible()
    const modal = page.getByRole('dialog')
    const start = async (
      type: 'entrata' | 'uscita',
      at: string,
      status = 'Prevista',
      override = '',
    ) => {
      if (await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).isVisible()) {
        await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
        await modal.getByRole('button', { name: 'Scarta bozza', exact: true }).click()
        await page
          .getByRole('dialog', { name: 'Scartare la bozza?', exact: true })
          .getByRole('button', { name: 'Scarta', exact: true })
          .click()
        await expect(modal).toHaveCount(0)
      }
      await page.getByRole('button', { name: `Nuova ${type}`, exact: true }).click()
      await modal.getByRole('combobox', { name: 'Stato', exact: true }).click()
      await page.getByRole('option', { name: status, exact: true }).click()
      if (type === 'entrata') {
        await modal.getByRole('combobox', { name: 'Porto di arrivo', exact: true }).click()
        await page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }).click()
      }
      await modal.getByLabel('Momento economico locale').fill(at)
      if (override) await modal.getByLabel('Sostituzione manuale della base').fill(override)
    }
    const submit = () => modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
    const confirm = async () => {
      await modal.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
      await expect(modal).not.toBeVisible()
    }
    await start('entrata', '2025-12-31T23:59', 'Mancata', '0')
    await submit()
    await expect(modal.getByText(/Non esiste una tariffa|Nessuna tariffa/)).toBeVisible()
    await page.keyboard.press('Escape')
    await start('entrata', '2026-03-29T02:30')
    await modal.getByRole('button', { name: 'Verifica momento', exact: true }).click()
    await expect(modal.getByText(/non esiste|inesistente/)).toBeVisible()
    await page.keyboard.press('Escape')
    await start('entrata', '2026-05-01T12:00', 'Mancata')
    await submit()
    await expect(
      modal.getByText('Nessun effetto sulle permanenze.', { exact: false }),
    ).toBeVisible()
    await confirm()
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await expect(page.getByText('Nessuna permanenza.', { exact: false })).toBeVisible()
    await start('entrata', '2026-05-02T12:00', 'Prevista', '0')
    await modal.getByRole('combobox', { name: 'Banchina (facoltativa)', exact: true }).click()
    await page
      .getByRole('option', { name: 'Molo nord · Genova · Genova · IT', exact: true })
      .click()
    await submit()
    await expect(modal.getByText('Base effettiva: 0,00 €', { exact: true })).toBeVisible()
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({
        animations: 'disabled',
        timeout: 8000,
        path: testInfo.outputPath('anteprima-minimo.png'),
      })
    await confirm()
    await expect(page.getByRole('button', { name: 'Nuova entrata', exact: true })).toBeFocused()
    await start('entrata', '2026-05-02T12:00', 'Mancata')
    await submit()
    await expect(modal.getByText(/stesso minuto UTC/)).toBeVisible()
    await page.keyboard.press('Escape')
    await start('uscita', '2026-05-03T12:00', 'Mancata')
    await submit()
    await confirm()
    await start('uscita', '2026-05-04T12:00', 'Effettuata')
    await submit()
    await confirm()
    await start('entrata', '2026-05-05T12:00', 'Effettuata')
    await submit()
    await confirm()
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Viaggio · Aperto', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Viaggio · Chiuso', exact: true })).toBeVisible()
    await expect(
      page.getByText('Ormeggio · Banchina non specificata', { exact: true }),
    ).toHaveCount(1)
    await expect(page.getByText('Ormeggio · Molo nord', { exact: true })).toBeVisible()
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({
        animations: 'disabled',
        timeout: 8000,
        path: testInfo.outputPath('permanenze-minimo.png'),
      })
    const saved = await page.evaluate(async (id) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      return window.operations.list({
        context: { sessionId: s.value.context.sessionId },
        query: { vesselId: id, page: 1, pageSize: 25 },
      })
    }, operationFixtureIds.vesselId)
    expect(saved.ok && saved.value.total).toBe(5)
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
    await page.getByRole('combobox', { name: 'Porto', exact: true }).click()
    await page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }).click()
    await page.locator('.port-list-item').first().click()
    await page.getByRole('button', { name: 'Copia tariffa', exact: true }).click()
    await modal.getByLabel('Decorrenza locale').fill('2026-05-03T00:00')
    await modal.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await expect(modal.getByText(/Ricalcoli: 3/)).toBeVisible()
    await modal.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
    await expect(modal).not.toBeVisible()
    // Same values still change the applied tariff references, including MISSED; zero override survives.
    const recalculated = await page.evaluate(async (id) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      return window.operations.list({
        context: { sessionId: s.value.context.sessionId },
        query: { vesselId: id, page: 1, pageSize: 25 },
      })
    }, operationFixtureIds.vesselId)
    expect(
      recalculated.ok &&
        recalculated.value.items.filter(
          (o) => o.charges[0].calculation.tariffId !== operationFixtureIds.tariffId,
        ),
    ).toHaveLength(3)
    expect(
      recalculated.ok &&
        recalculated.value.items.find((o) => o.executionStatus === 'PLANNED')?.charges[0]
          .effectiveBase,
    ).toBe('0.00')
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
    await page.getByRole('option', { name: 'Stella del mare' }).click()
    await page.locator('.operations-rows button').first().click()
    await expect(page.getByRole('region', { name: 'Dettaglio operazione' })).toBeVisible()
    if (!process.env.PORTO_PACKAGED_EXE) {
      await page.screenshot({
        animations: 'disabled',
        timeout: 8000,
        path: testInfo.outputPath('dettaglio-minimo.png'),
      })
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900))
      await page.screenshot({
        animations: 'disabled',
        timeout: 8000,
        path: testInfo.outputPath('dettaglio-desktop.png'),
      })
    }
    const stale = await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      return s.value.context
    })
    await app.evaluate(({ dialog }, copy) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: copy })
    }, copy)
    await page.getByRole('button', { name: 'Archivi', exact: true }).click()
    await page.getByRole('button', { name: 'Salva con nome', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    expect(
      await page.evaluate(
        ({ context, id }) =>
          window.operations.list({
            context: { sessionId: context.sessionId },
            query: { vesselId: id, page: 1, pageSize: 25 },
          }),
        { context: stale, id: operationFixtureIds.vesselId },
      ),
    ).toMatchObject({ ok: false, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await expect(page.getByText('Scegli una nave', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Riprendi bozza' })).toHaveCount(0)
    await app.close()
    app = undefined
    app = await playwright._electron.launch({
      ...(process.env.PORTO_PACKAGED_EXE
        ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
        : { args: [resolve('out/main/index.js')] }),
      env,
    })
    const reopened = await app.firstWindow()
    await reopened.context().setOffline(true)
    await app.evaluate(({ dialog }, copy) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [copy] })
    }, copy)
    await reopened.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(reopened.getByTestId('archive-path')).toHaveText(copy)
    const persisted = await reopened.evaluate(async (id) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      return window.operations.list({
        context: { sessionId: s.value.context.sessionId },
        query: { vesselId: id, page: 1, pageSize: 25 },
      })
    }, operationFixtureIds.vesselId)
    expect(persisted.ok && persisted.value).toEqual(recalculated.ok && recalculated.value)
    expect(errors).toEqual([])
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
