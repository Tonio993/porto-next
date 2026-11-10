import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { ElectronApplication } from 'playwright'
import { expect, test } from '@playwright/test'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
declare const window: { archives: ArchiveApi }

async function saveDialog(app: ElectronApplication, path: string | null) {
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: !filePath, filePath: filePath ?? '' })
  }, path)
}
async function openDialog(app: ElectronApplication, path: string) {
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
  }, path)
}

test('gestisce archivi reali dalla finestra desktop e li ritrova dopo il riavvio', async ({
  playwright,
}, testInfo) => {
  const electron = playwright._electron
  const launchOptions = process.env.PORTO_PACKAGED_EXE
    ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
    : { args: [resolve('out/main/index.js')] }
  const folder = mkdtempSync(join(tmpdir(), 'porto-next-e2e-'))
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
    PORTO_TEST_USER_DATA: join(folder, 'preferences'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete env.ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await electron.launch({ ...launchOptions, env })
    const page = await app.firstWindow()
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.context().setOffline(true)
    await expect(page.getByRole('heading', { name: 'Benvenuto a bordo.' })).toBeVisible()
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({ path: testInfo.outputPath('home.png') })
    expect(
      await page.evaluate(() => typeof (window as unknown as { require?: unknown }).require),
    ).toBe('undefined')
    const original = join(folder, 'originale.ormeggi')
    const copy = join(folder, 'copia.ormeggi')
    const backup = join(folder, 'backup.ormeggi')
    await saveDialog(app, original)
    await page.getByRole('button', { name: 'Nuovo archivio' }).click()
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Società Alfa')
    await page.getByRole('button', { name: 'Scegli posizione' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByTestId('archive-name')).toHaveText('Società Alfa')
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Società Alfa aggiornata')
    await page.getByRole('button', { name: 'Aggiorna nome' }).click()
    await expect(page.getByTestId('archive-name')).toHaveText('Società Alfa aggiornata')
    await saveDialog(app, backup)
    await page.getByRole('button', { name: 'Crea copia di backup', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Copia di backup creata')
    await expect(page.getByTestId('archive-path')).toHaveText(original)
    await saveDialog(app, copy)
    await page.getByRole('button', { name: 'Salva con nome', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({ path: testInfo.outputPath('archive.png') })
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Copia indipendente')
    await page.getByRole('button', { name: 'Aggiorna nome' }).click()
    await expect(page.getByTestId('archive-name')).toHaveText('Copia indipendente')
    const invalid = join(folder, 'estraneo.ormeggi')
    writeFileSync(invalid, 'file estraneo')
    await openDialog(app, invalid)
    const invalidResult = await page.evaluate(() => window.archives.open())
    expect(invalidResult.ok).toBe(false)
    await expect(page.getByTestId('archive-name')).toHaveText('Copia indipendente')
    await saveDialog(app, null)
    await page.getByRole('button', { name: 'Salva con nome', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    await page.getByRole('button', { name: 'Chiudi archivio', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Benvenuto a bordo.' })).toBeVisible()
    await openDialog(app, original)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-name')).toHaveText('Società Alfa aggiornata')
    expect(readFileSync(backup).subarray(0, 16).toString()).toBe('SQLite format 3\0')
    expect(pageErrors).toEqual([])
    await app.close()
    app = await electron.launch({ ...launchOptions, env })
    const restarted = await app.firstWindow()
    await restarted.context().setOffline(true)
    await expect(restarted.getByRole('heading', { name: 'Benvenuto a bordo.' })).toBeVisible()
    await restarted
      .getByRole('button', { name: /Società Alfa aggiornata/ })
      .first()
      .click()
    await expect(restarted.getByTestId('archive-name')).toHaveText('Società Alfa aggiornata')
  } finally {
    await app?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
