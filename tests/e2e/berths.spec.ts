import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { BerthApi } from '../../src/shared/contracts/berths'

declare const window: { archives: ArchiveApi; berths: BerthApi }

test('amministra le banchine dal porto e conserva dati e contesto nel percorso Electron', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(process.env.PORTO_PACKAGED_EXE ? 300_000 : 180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p05-e2e-'))
  const packaged = process.env.PORTO_PACKAGED_EXE
  const options = packaged
    ? { executablePath: packaged, args: [] }
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
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.context().setOffline(true)
    const path = join(folder, 'originale.ormeggi')
    const migrations = readdirSync('migrations')
      .filter((name) => /^000[1-5]_/.test(name))
      .sort()
      .map((name) => readFileSync(join('migrations', name), 'utf8'))
    await app.evaluate(
      ({ app, dialog }, { path, migrations }) => {
        const module = process.getBuiltinModule('module') as typeof import('node:module')
        const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
        const db = new Database(path)
        try {
          for (const sql of migrations) db.exec(sql)
          db.pragma('application_id = 0x504f5254')
          db.pragma('user_version = 5')
          db.exec(
            "INSERT INTO archive_metadata VALUES (1, '00000000-0000-4000-8000-000000000001', 'P05 v5', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 0)",
          )
        } finally {
          db.close()
        }
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
      },
      { path, migrations },
    )
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    const opened = await page.evaluate(() => window.archives.getState())
    expect(opened).toMatchObject({
      ok: true,
      value: { active: { schemaVersion: 6, name: 'P05 v5' } },
    })
    expect(readdirSync(folder).some((name) => name.includes('.prima-v6-'))).toBe(true)
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    const portCreation = page.getByRole('region', { name: 'Creazione porto' })
    await page.getByRole('button', { name: 'Nuovo porto', exact: true }).click()
    await portCreation.getByLabel('Nome del porto').fill('Porto P05')
    await portCreation.getByLabel('Località').fill('Genova')
    await portCreation.getByRole('button', { name: 'Crea porto', exact: true }).click()

    const panel = page.getByRole('region', { name: 'Banchine', exact: true })
    const port = page.getByRole('region', { name: 'Dettaglio porto' })
    const create = panel.getByRole('button', { name: 'Nuova banchina' })
    const creation = page.getByRole('dialog', { name: 'Nuova banchina' })
    const detail = panel.getByRole('region', { name: 'Dettaglio banchina' })
    const history = detail.getByRole('group', { name: 'Cronologia banchina' })
    const preview = page.getByRole('region', { name: 'Anteprima modifica' })
    const confirm = preview.getByRole('button', { name: 'Conferma modifica' })
    const list = panel.getByRole('group', { name: 'Elenco banchine' })
    await create.click()
    await expect(creation.getByLabel('Nome banchina')).toBeFocused()
    await creation.getByLabel('Nome banchina').fill('Molo Alfa')
    await creation.getByRole('button', { name: 'Annulla inserimento' }).click()
    await expect(create).toBeFocused()
    await create.click()
    await expect(creation.getByLabel('Nome banchina')).toHaveValue('Molo Alfa')
    await creation.getByRole('button', { name: 'Crea banchina' }).click()
    await expect(create).toBeFocused()
    await expect(detail).toContainText('Banchina 1 · Molo Alfa')
    await expect(detail).toContainText('Selezionabile per nuovi riferimenti')

    await create.click()
    await creation.getByLabel('Nome banchina').fill('MOLO ALFA')
    await creation.getByRole('button', { name: 'Crea banchina' }).click()
    await expect(creation.getByText('Nome già riservato in questo porto.')).toBeVisible()
    await creation.getByRole('button', { name: 'Annulla inserimento' }).click()

    const addVersion = detail.getByRole('button', { name: 'Nuova versione banchina' })
    await addVersion.click()
    const editor = page.getByRole('dialog', { name: 'Nuova versione banchina' })
    await editor.getByLabel('Nome banchina').fill('Molo futuro')
    await editor.getByLabel('Decorrenza locale').fill('2090-01-01T10:00')
    await editor.getByRole('button', { name: 'Verifica decorrenza' }).click()
    await expect(editor.getByText('Offset scelto: +01:00')).toBeVisible()
    await editor.getByRole('button', { name: 'Anteprima versione' }).click()
    await expect(preview).toContainText('Operazione consentita')
    await confirm.click()
    await expect(addVersion).toBeFocused()
    const future = history.getByRole('article').filter({ hasText: 'Futura' })
    await expect(future).toContainText('2090-01-01T09:00:00.000Z')
    await future.getByRole('button', { name: 'Correggi versione' }).click()
    const correction = page.getByRole('dialog', { name: 'Correggi versione banchina' })
    await correction.getByLabel('Nome banchina').fill('Molo futuro corretto')
    await correction.getByRole('button', { name: 'Anteprima versione' }).click()
    await page.evaluate(() => window.archives.rename('P05 revisione successiva'))
    await expect(preview.getByText('Anteprima obsoleta')).toBeVisible()
    await expect(confirm).toBeDisabled()
    await preview.getByRole('button', { name: 'Chiudi anteprima' }).click()
    await expect(correction.getByLabel('Nome banchina')).toHaveValue('Molo futuro corretto')
    await expect(correction.getByText('Bozza precedente ai dati attuali')).toBeVisible()
    await correction.getByRole('button', { name: 'Annulla modifica' }).click()
    await future.getByRole('button', { name: 'Correggi versione' }).click()
    await correction.getByLabel('Nome banchina').fill('Molo futuro corretto')
    await correction.getByRole('button', { name: 'Anteprima versione' }).click()
    await confirm.click()
    await expect(future).toContainText('Molo futuro corretto')
    await future.getByRole('button', { name: 'Elimina versione' }).click()
    await confirm.click()
    await expect(history.getByRole('article')).toHaveCount(1)

    await port.getByRole('button', { name: 'Disattiva porto' }).click()
    await expect(preview.getByRole('row').filter({ hasText: 'Banchina 1' })).toContainText(
      'Selezionabile',
    )
    await confirm.click()
    await expect(create).toBeDisabled()
    await expect(detail).toContainText('Non selezionabile per nuovi riferimenti')
    await expect(list.getByRole('button')).toContainText('Attiva')
    await port.getByRole('button', { name: 'Riattiva porto' }).click()
    await expect(detail).not.toContainText('Non selezionabile')
    await detail.getByRole('button', { name: 'Disattiva banchina' }).click()
    await confirm.click()
    await expect(list.getByRole('button')).toContainText('Disattivata')
    await detail.getByRole('button', { name: 'Riattiva banchina' }).click()
    await expect(list.getByRole('button')).toContainText('Attiva')
    await detail.getByRole('button', { name: 'Disattiva banchina' }).click()
    await confirm.click()
    await expect(list.getByRole('button')).toContainText('Disattivata')

    await port.getByRole('button', { name: 'Elimina porto' }).click()
    await expect(preview).toContainText('La banchina appartiene a questo porto')
    await expect(confirm).toBeDisabled()
    await preview.getByRole('button', { name: 'Chiudi anteprima' }).click()

    if (!packaged)
      await page.screenshot({ path: testInfo.outputPath('banchine.png'), animations: 'disabled' })
    await detail.getByRole('button', { name: 'Elimina banchina' }).click()
    await expect(confirm).toBeEnabled()
    const previous = await page.evaluate(async () => {
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
    await expect(detail).toHaveCount(0)
    const stale = await page.evaluate(
      (context) =>
        window.berths.confirm({
          context,
          payload: { previewId: '00000000-0000-4000-8000-000000000001' },
        }),
      previous,
    )
    expect(stale).toMatchObject({ ok: false, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
    await page.getByRole('button', { name: 'Apri porto 1', exact: true }).click()
    await list.getByRole('button', { name: /Molo Alfa.*Disattivata/ }).click()
    await detail.getByRole('button', { name: 'Elimina banchina' }).click()
    await confirm.click()
    await expect(panel.getByText('Questo porto non ha banchine.')).toBeVisible()
    await expect(create).toBeFocused()
    await port.getByRole('button', { name: 'Elimina porto' }).click()
    await confirm.click()
    await expect(panel).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
