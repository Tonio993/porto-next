import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { PortApi } from '../../src/shared/contracts/ports'

declare const window: { archives: ArchiveApi; ports: PortApi }

test('gestisce versioni, anteprime, prenotazioni, stato ed eliminazione del porto offline', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(process.env.PORTO_PACKAGED_EXE ? 300_000 : 180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p04-e2e-'))
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
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.context().setOffline(true)
    const original = join(folder, 'originale.ormeggi')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, original)
    await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('P04')
    await page.getByRole('button', { name: 'Scegli posizione' }).click()
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    const creation = page.getByRole('region', { name: 'Creazione porto' })
    await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
    await creation.getByLabel('Nome del porto').fill('Porto iniziale')
    await creation.getByLabel('Località').fill('Genova')
    await creation.getByRole('button', { name: 'Crea porto', exact: true }).click()
    const detail = page.getByRole('region', { name: 'Dettaglio porto' })
    const history = page.getByRole('region', { name: 'Cronologia porto' })
    const editor = page.getByRole('region', { name: 'Editor versione' })
    const preview = page.getByRole('region', { name: 'Anteprima modifica' })
    await expect(detail).toContainText('Porto 1 · Porto iniziale')
    await expect(
      history.getByRole('button', { name: 'Elimina versione', exact: true }),
    ).toBeDisabled()
    await detail.getByRole('button', { name: 'Nuova versione', exact: true }).click()
    await editor.getByLabel('Nome del porto').fill('Porto futuro')
    await editor.getByLabel('Decorrenza locale').fill('2027-01-01T10:00')
    await editor.getByRole('button', { name: 'Anteprima versione', exact: true }).click()
    await expect(preview).toContainText('Operazione consentita')
    await expect(detail).toContainText('Porto iniziale')
    await preview.getByRole('button', { name: 'Conferma modifica' }).click()
    await expect(editor).toHaveCount(0)
    await expect(detail.getByRole('button', { name: 'Nuova versione', exact: true })).toBeFocused()
    await expect(history).toContainText('Versione con decorrenza · Futura')
    await expect(detail).toContainText('Porto iniziale')
    await expect(history).toContainText('2027-01-01T09:00:00.000Z')

    // A draft keeps its original revision even when a native/archive command changes data.
    await history
      .getByRole('article', { name: 'Versione iniziale', exact: true })
      .getByRole('button', { name: 'Correggi versione' })
      .click()
    await editor.getByLabel('Nome del porto').fill('Nome corretto')
    await editor.getByRole('button', { name: 'Anteprima versione' }).click()
    await page.evaluate(() => window.archives.rename('Aggiornato durante anteprima'))
    await expect(preview.getByRole('button', { name: 'Conferma modifica' })).toBeDisabled()
    await preview.getByRole('button', { name: 'Chiudi anteprima' }).click()
    await editor.getByRole('button', { name: 'Anteprima versione' }).click()
    await expect(page.getByRole('alert')).toContainText('I dati sono cambiati')
    await editor.getByRole('button', { name: 'Annulla modifica' }).click()
    await history
      .getByRole('article', { name: 'Versione iniziale', exact: true })
      .getByRole('button', { name: 'Correggi versione' })
      .click()
    await editor.getByLabel('Nome del porto').fill('Nome corretto')
    await editor.getByRole('button', { name: 'Anteprima versione' }).click()
    await preview.getByRole('button', { name: 'Conferma modifica' }).click()
    await expect(detail).toContainText('Nome corretto')
    await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
    await creation.getByRole('button', { name: 'Ricarica dati' }).click()
    await creation.getByLabel('Nome del porto').fill('PORTO INIZIALE')
    await creation.getByLabel('Località').fill('Genova')
    await creation.getByRole('button', { name: 'Crea porto', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Esiste già un porto')
    await creation.getByRole('button', { name: 'Annulla inserimento' }).click()

    const future = history.getByRole('article').filter({ hasText: 'Futura' })
    await future.getByRole('button', { name: 'Correggi versione' }).click()
    await editor.getByLabel('Nome del porto').fill('Nome corretto')
    await editor.getByLabel('Decorrenza locale').fill('2026-01-01T10:00')
    await editor.getByRole('button', { name: 'Anteprima versione' }).click()
    await preview.getByRole('button', { name: 'Conferma modifica' }).click()
    await expect(history.getByRole('article')).toHaveCount(2)
    await expect(history).toContainText('Versione con decorrenza · Corrente')
    await history
      .getByRole('article')
      .filter({ hasText: 'Versione con decorrenza' })
      .getByRole('button', { name: 'Elimina versione', exact: true })
      .click()
    await preview.getByRole('button', { name: 'Conferma modifica' }).click()
    await expect(history.getByRole('article')).toHaveCount(1)
    await detail.getByRole('button', { name: 'Disattiva porto', exact: true }).click()
    await expect(preview).toContainText('I riferimenti esistenti restano validi')
    await preview.getByRole('button', { name: 'Conferma modifica' }).click()
    await expect(detail).toContainText('Stato: Disattivato')
    await detail.getByRole('button', { name: 'Riattiva porto', exact: true }).click()
    await expect(detail).toContainText('Stato: Attivo')
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({ path: testInfo.outputPath('port-history.png') })
    await detail.getByRole('button', { name: 'Elimina porto', exact: true }).click()
    await expect(preview).toContainText('L’eliminazione comprende versioni, prenotazioni e fuso')
    const stale = await page.evaluate(async () => {
      const result = await window.archives.getState()
      if (!result.ok || !result.value.context) throw new Error('Contesto assente')
      return result.value.context
    })
    const copy = join(folder, 'copia.ormeggi')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, copy)
    await page.evaluate(() => window.archives.saveAs())
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    await expect(preview).toHaveCount(0)
    await expect(editor).toHaveCount(0)
    await expect(detail).toHaveCount(0)
    expect(
      await page.evaluate(
        (context) =>
          window.ports.previewDelete({
            context,
            payload: { portId: '00000000-0000-4000-8000-000000000001' },
          }),
        stale,
      ),
    ).toMatchObject({ ok: false, context: null, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
    await page.getByRole('button', { name: 'Apri porto 1', exact: true }).click()
    await expect(detail).toContainText('Nome corretto')
    await detail.getByRole('button', { name: 'Elimina porto', exact: true }).click()
    await preview.getByRole('button', { name: 'Conferma modifica' }).click()
    await expect(detail).toHaveCount(0)
    await expect(page.getByText('Nessun porto trovato.')).toBeVisible()
    await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
    await creation.getByRole('button', { name: 'Ricarica dati' }).click()
    await creation.getByLabel('Nome del porto').fill('Porto iniziale')
    await creation.getByLabel('Località').fill('Genova')
    await creation.getByRole('button', { name: 'Crea porto', exact: true }).click()
    await expect(detail).toContainText('Porto 2 · Porto iniziale')
    expect(errors).toEqual([])
  } finally {
    await app?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
