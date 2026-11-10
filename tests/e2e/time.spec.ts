import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { TimeApi } from '../../src/shared/contracts/values'

declare const window: { archives: ArchiveApi; time: TimeApi }

test('configura il fuso per archivio e risolve gap e occorrenze offline', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(process.env.PORTO_PACKAGED_EXE ? 180_000 : 90_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-time-e2e-'))
  const launchOptions = process.env.PORTO_PACKAGED_EXE
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
    TZ: 'America/New_York',
  }
  delete (env as Record<string, string>).ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await playwright._electron.launch({ ...launchOptions, env })
    let page = await app.firstWindow()
    page.setDefaultTimeout(10_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.context().setOffline(true)
    await expect(
      page.getByRole('button', { name: 'Riferimenti temporali', exact: true }),
    ).toBeDisabled()
    const original = join(folder, 'originale.ormeggi')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, original)
    await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Archivio temporale')
    await page.getByRole('button', { name: 'Scegli posizione' }).click()
    await page.getByRole('button', { name: 'Riferimenti temporali', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Fuso IANA aziendale' })).toHaveValue(
      'Europe/Rome',
    )
    await page.getByRole('textbox', { name: 'Fuso IANA aziendale' }).fill('+01:00')
    await page.getByRole('button', { name: 'Conferma fuso iniziale' }).click()
    await expect(page.getByRole('alert')).toContainText('Scegli un fuso IANA valido')
    await page.getByRole('textbox', { name: 'Fuso IANA aziendale' }).fill('Europe/Rome')
    await page.getByRole('button', { name: 'Conferma fuso iniziale' }).click()
    await expect(page.getByText('Fuso aziendale confermato:')).toContainText('Europe/Rome')
    const date = page.getByLabel('Data e ora locale')
    await date.fill('2026-03-29T02:30')
    await page.getByRole('button', { name: 'Verifica orario' }).click()
    await expect(page.getByRole('alert')).toContainText('L’ora locale non esiste')
    await date.fill('2026-10-25T02:30')
    await page.getByRole('button', { name: 'Verifica orario' }).click()
    await expect(page.getByText('Quest’ora si presenta due volte.')).toBeVisible()
    await page.getByRole('button', { name: 'Prima occorrenza (+02:00)', exact: true }).click()
    await expect(page.getByText('UTC: 2026-10-25T00:30:00.000Z', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Verifica orario' }).click()
    await page.getByRole('button', { name: 'Seconda occorrenza (+01:00)', exact: true }).click()
    await expect(page.getByText('UTC: 2026-10-25T01:30:00.000Z', { exact: true })).toBeVisible()
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({ path: testInfo.outputPath('time-settings.png') })
    const context = await page.evaluate(async () => {
      const result = await window.archives.getState()
      if (!result.ok || !result.value.context) throw new Error('Contesto assente')
      return result.value.context
    })
    expect(context.revision).toBe('1')
    const copy = join(folder, 'copia.ormeggi')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, copy)
    await page.evaluate(() => window.archives.saveAs())
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    await page.getByRole('button', { name: 'Riferimenti temporali', exact: true }).click()
    await expect(page.getByText('Fuso aziendale confermato:')).toContainText('Europe/Rome')
    await expect(page.getByLabel('Data e ora locale')).toHaveValue('')
    expect(
      await page.evaluate(
        (old) =>
          window.time.configureCompanyZone({ context: old, payload: { zoneId: 'Asia/Tokyo' } }),
        context,
      ),
    ).toMatchObject({ ok: false, context: null, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
    expect(errors).toEqual([])
    await app.close()
    app = await playwright._electron.launch({ ...launchOptions, env })
    page = await app.firstWindow()
    page.setDefaultTimeout(10_000)
    await page.context().setOffline(true)
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
    }, original)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await page.getByRole('button', { name: 'Riferimenti temporali', exact: true }).click()
    await expect(page.getByText('Fuso aziendale confermato:')).toContainText('Europe/Rome')
    await page.getByLabel('Data e ora locale').fill('2026-11-10T09:00')
    await page.getByRole('button', { name: 'Verifica orario' }).click()
    await expect(page.getByText('UTC: 2026-11-10T08:00:00.000Z', { exact: true })).toBeVisible()
  } finally {
    await app?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
