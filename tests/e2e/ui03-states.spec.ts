import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import {
  operationFixture,
  delayOperationResponse,
  operationHeld,
  releaseOperation,
} from './operations-support'

declare const window: { archives: ArchiveApi }

test('UI03: vuoto, errore per campo, anteprima bloccata e obsoleta, caricamento e nuova sessione', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(120_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-ui03-states-'))
  const path = join(folder, 'stati.ormeggi')
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  const app = await playwright._electron.launch({
    ...(process.env.PORTO_PACKAGED_EXE
      ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
      : { args: [resolve('out/main/index.js')] }),
    env,
  })
  try {
    const page = await app.firstWindow()
    page.setDefaultTimeout(12_000)
    await page.context().setOffline(true)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await operationFixture(app, path, 16)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
    await expect(page.getByText('Nessuna prestazione registrata.', { exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
    await page.getByRole('option', { name: '1 · Stella del mare', exact: true }).click()
    await page.getByRole('button', { name: 'Nuova prestazione libera', exact: true }).click()
    const modal = page.getByRole('dialog')
    await expect(modal.getByLabel('Momento prestazione locale')).toBeFocused()
    await modal.getByLabel('Momento prestazione locale').fill('2026-05-02T13:00')
    await modal.getByLabel('Importo base EUR').fill('12,34')
    await modal.getByRole('button', { name: 'Registra prestazione' }).click()
    await expect(modal.getByLabel('Descrizione')).toHaveAttribute('aria-invalid', 'true')
    await modal.getByLabel('Descrizione').fill('Assistenza verifica stati UI03')
    await modal.getByRole('button', { name: 'Registra prestazione' }).click()
    await expect(modal).toHaveCount(0)
    const detail = page.getByRole('region', { name: 'Dettaglio prestazione' })
    await expect(detail).toContainText('Base EUR 12,34')
    // An actual external FK blocks deletion; no simulated application response.
    await app.evaluate(({ app }, path) => {
      const module = process.getBuiltinModule('module') as typeof import('node:module')
      const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
      const db = new Database(path)
      try {
        db.pragma('foreign_keys=ON')
        db.exec(
          'CREATE TABLE ui03_references (service_id TEXT REFERENCES service_activities(id)); INSERT INTO ui03_references SELECT id FROM service_activities;',
        )
      } finally {
        db.close()
      }
    }, path)
    await detail.getByRole('button', { name: 'Elimina prestazione', exact: true }).click()
    await expect(modal.getByRole('button', { name: 'Chiudi', exact: true })).toBeFocused()
    await modal.getByRole('button', { name: 'Mostra anteprima' }).click()
    await expect(modal.getByText(/Anteprima bloccata/)).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Conferma variazione' })).toBeDisabled()
    await modal.getByRole('button', { name: 'Conferma variazione' }).scrollIntoViewIfNeeded()
    if (!process.env.PORTO_PACKAGED_EXE) {
      if (process.env.PORTO_UI03_SCREENSHOTS)
        mkdirSync(resolve('doc/ui03/schermate'), { recursive: true })
      await page.screenshot({
        path: process.env.PORTO_UI03_SCREENSHOTS
          ? resolve('doc/ui03/schermate/dopo-anteprima-bloccata-minimo.png')
          : testInfo.outputPath('anteprima-bloccata-minimo.png'),
        animations: 'disabled',
      })
    }
    await page.keyboard.press('Escape')
    await expect(
      detail.getByRole('button', { name: 'Elimina prestazione', exact: true }),
    ).toBeFocused()
    await detail.getByRole('button', { name: 'Modifica prestazione', exact: true }).click()
    await modal.getByLabel('Descrizione').fill('Bozza conservata UI03')
    await modal.getByRole('button', { name: 'Mostra anteprima' }).click()
    await expect(modal.getByText(/Anteprima pronta/)).toBeVisible()
    await page.evaluate(async () => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw Error('context')
      const result = await window.archives.rename({
        context: state.value.context,
        payload: { name: 'Nuova revisione UI03' },
      })
      if (!result.ok) throw Error(result.error.message)
    })
    await expect(modal.getByText(/Anteprima obsoleta/)).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Conferma variazione' })).toBeDisabled()
    await modal.getByRole('button', { name: 'Torna ai dati' }).click()
    await expect(modal.getByLabel('Descrizione')).toHaveValue('Bozza conservata UI03')
    await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await expect(modal.getByLabel('Descrizione')).toHaveValue('Assistenza verifica stati UI03')
    await page.keyboard.press('Escape')
    await delayOperationResponse(app, 'services:list')
    await page.getByRole('button', { name: 'Ricarica consultazione', exact: true }).click()
    await expect.poll(() => operationHeld(app)).toBe(true)
    await expect(page.getByText('Caricamento prestazioni…', { exact: true })).toBeVisible()
    await releaseOperation(app)
    await expect(
      page.getByRole('cell', { name: 'Assistenza verifica stati UI03', exact: true }),
    ).toBeVisible()
    await delayOperationResponse(app, 'services:get')
    await page.getByRole('button', { name: 'Apri prestazione', exact: true }).click()
    await expect.poll(() => operationHeld(app)).toBe(true)
    await expect(
      page.getByText('Caricamento dettaglio prestazione…', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Seleziona una prestazione', { exact: true })).toHaveCount(0)
    await releaseOperation(app)
    await expect(detail).toContainText('Base EUR 12,34')
    await detail.getByRole('button', { name: 'Modifica sole note' }).click()
    await modal.getByLabel('Note', { exact: true }).fill('Bozza della sessione precedente')
    await app.evaluate(
      ({ dialog }, path) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath: path })
      },
      join(folder, 'nuova-sessione.ormeggi'),
    )
    await page.evaluate(async () => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw Error('context')
      const result = await window.archives.saveAs({ context: state.value.context, payload: null })
      if (!result.ok) throw Error(result.error.message)
    })
    await expect(modal).toHaveCount(0)
    await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Riprendi bozza', exact: true })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Dettaglio prestazione' })).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
