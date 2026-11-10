import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { PortApi } from '../../src/shared/contracts/ports'

declare const window: { archives: ArchiveApi; ports: PortApi }

test('crea e consulta porti offline, li ritrova al riavvio e mantiene le copie indipendenti', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(process.env.PORTO_PACKAGED_EXE ? 180_000 : 120_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-ports-e2e-'))
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
    let page = await app.firstWindow()
    page.setDefaultTimeout(10_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.context().setOffline(true)
    await expect(page.getByRole('button', { name: 'Anagrafiche', exact: true })).toBeDisabled()
    const original = join(folder, 'originale.ormeggi')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, original)
    await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Archivio porti')
    await page.getByRole('button', { name: 'Scegli posizione' }).click()
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    await expect(page.getByText('Nessun porto trovato.')).toBeVisible()
    await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
    await expect(page.getByLabel('Fuso IANA del porto')).toHaveValue('Europe/Rome')
    await page.getByLabel('Nome del porto').fill('Porto A')
    await page.getByLabel('Località').fill('Genova')
    await page.getByLabel('Fuso IANA del porto').fill('+01:00')
    await page.getByRole('button', { name: 'Crea porto', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Scegli un fuso IANA valido')
    await page.getByLabel('Fuso IANA del porto').fill('Asia/Kathmandu')
    await page.getByRole('button', { name: 'Crea porto', exact: true }).click()
    const detail = page.getByRole('region', { name: 'Dettaglio porto' })
    await expect(detail).toContainText('Porto 1 · Porto A')
    await expect(detail).toContainText('Asia/Kathmandu')
    await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
    await page.getByLabel('Nome del porto').fill(' PORTO A ')
    await page.getByLabel('Località').fill(' GENOVA ')
    await page.getByRole('button', { name: 'Crea porto', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Esiste già un porto')
    await page.getByLabel('Località').fill('Savona')
    await page.getByRole('button', { name: 'Crea porto', exact: true }).click()
    await expect(detail).toContainText('Porto 2 · PORTO A')
    await page.getByLabel('Cerca porto').fill('genova')
    await expect(page.getByRole('button', { name: 'Apri porto 1', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Apri porto 2', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Apri porto 1', exact: true }).click()
    await expect(detail).toContainText('Genova')
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({ path: testInfo.outputPath('ports.png') })
    const old = await page.evaluate(async () => {
      const result = await window.archives.getState()
      if (!result.ok || !result.value.context) throw new Error('Contesto assente')
      return result.value.context
    })
    expect(old.revision).toBe('2')
    await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
    await page.getByLabel('Nome del porto').fill('Bozza da scartare')
    const copy = join(folder, 'copia.ormeggi')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, copy)
    await page.evaluate(() => window.archives.saveAs())
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
    await expect(page.getByLabel('Nome del porto')).toHaveValue('')
    await expect(page.getByLabel('Cerca porto')).toHaveValue('')
    await expect(page.getByRole('region', { name: 'Dettaglio porto' })).toHaveCount(0)
    expect(
      await page.evaluate(
        (context) =>
          window.ports.create({
            context,
            payload: {
              name: 'Tardivo',
              locality: 'Genova',
              countryCode: 'IT',
              initialZoneId: 'Europe/Rome',
            },
          }),
        old,
      ),
    ).toMatchObject({ ok: false, context: null, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
    await page.getByLabel('Nome del porto').fill('Solo copia')
    await page.getByLabel('Località').fill('Genova')
    await page.evaluate(() => window.archives.rename('Copia aggiornata'))
    await page.getByRole('button', { name: 'Crea porto', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('I dati sono cambiati')
    await page.getByRole('button', { name: 'Ricarica dati', exact: true }).click()
    await expect(page.getByLabel('Nome del porto')).toHaveValue('Solo copia')
    await page.getByRole('button', { name: 'Crea porto', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Dettaglio porto' })).toContainText(
      'Porto 3 · Solo copia',
    )
    expect(errors).toEqual([])
    await app.close()
    app = await playwright._electron.launch({ ...options, env })
    page = await app.firstWindow()
    page.setDefaultTimeout(10_000)
    await page.context().setOffline(true)
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
    }, original)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    await expect(page.getByText('2 porti', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Apri porto 3', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Apri porto 1', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Dettaglio porto' })).toContainText(
      'Asia/Kathmandu',
    )
  } finally {
    await app?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
