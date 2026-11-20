import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { CatalogApi } from '../../src/shared/contracts/catalog'
declare const window: { archives: ArchiveApi; catalog: CatalogApi }
declare const document: { documentElement: { scrollWidth: number; clientWidth: number } }

test('P08 catalogo: v8 popolato, pesi esatti, ciclo di vita, conflitti, copie e riapertura offline', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(240_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p08-desktop-')),
    path = join(folder, 'catalog.ormeggi'),
    copy = join(folder, 'copy.ormeggi')
  const packaged = process.env.PORTO_PACKAGED_EXE
  const options = packaged
    ? { executablePath: packaged, args: [] }
    : { args: [resolve('out/main/index.js')] }
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await playwright._electron.launch({ ...options, env })
    let page = await app.firstWindow()
    page.setDefaultTimeout(10_000)
    await page.context().setOffline(true)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const migrations = readdirSync('migrations')
      .filter((n) => /^000[1-8]_/.test(n))
      .sort()
      .map((n) => readFileSync(join('migrations', n), 'utf8'))
    await app.evaluate(
      ({ app, dialog }, { path, migrations }) => {
        const module = process.getBuiltinModule('module') as typeof import('node:module')
        const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
        const db = new Database(path)
        try {
          for (const sql of migrations) db.exec(sql)
          db.pragma('application_id = 0x504f5254')
          db.pragma('user_version = 8')
          db.exec(
            "INSERT INTO archive_metadata VALUES (1,'00000000-0000-4000-8000-000000000001','P08 v8','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z',12); INSERT INTO vessels VALUES ('vessel',1,'ACTIVE'); INSERT INTO vessel_versions (id,vessel_id,registered_name,vessel_type_id,size,imo_number) VALUES ('version','vessel','Preesistente','STANDARD',2100,'00123'); UPDATE vessel_code_counter SET last_code=1",
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
    expect(readdirSync(folder).some((n) => n.includes('.prima-v17-'))).toBe(true)
    expect(await page.evaluate(() => window.archives.getState())).toMatchObject({
      ok: true,
      value: { active: { schemaVersion: 17 }, context: { revision: '12' } },
    })
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    const list = page.getByRole('region', { name: 'Elenco tipi di prestazione' }),
      detail = page.getByRole('region', { name: 'Dettaglio catalogo' })
    await list.getByRole('button', { name: /rinforzo ormeggio/ }).click()
    await expect(detail.getByTestId('catalog-weight')).toHaveText('1')
    await expect(detail).toContainText('entrata: 1')
    await expect(detail).toContainText('uscita: 1')
    await expect(detail).toContainText('spostamento: 1')
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setSize(960, 700)
    })
    const shot = async (name: string) => {
      if (packaged) return
      const modal = page.getByRole('dialog')
      if (name === 'creazione.png' || name === 'eliminazione-bloccata.png') {
        await expect(modal).toHaveCount(1)
        await expect(modal).toHaveCSS('opacity', '1')
      } else await expect(modal).toHaveCount(0)
      await page.screenshot({ path: testInfo.outputPath(name), animations: 'disabled' })
    }
    await shot('catalogo-minimo.png')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
    const newType = page.getByRole('button', { name: 'Nuovo tipo', exact: true })
    await newType.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Descrizione', { exact: true })).toBeFocused()
    await expect(dialog.getByLabel('Peso iniziale', { exact: true })).toHaveValue('1')
    await dialog.getByLabel('Descrizione', { exact: true }).fill('Assistenza Àlfa')
    await dialog
      .getByLabel('Peso iniziale', { exact: true })
      .fill('1,230000000000000000000000000001')
    await shot('creazione.png')
    await dialog.getByRole('button', { name: 'Annulla', exact: true }).click()
    await newType.click()
    await expect(dialog.getByLabel('Descrizione', { exact: true })).toHaveValue('Assistenza Àlfa')
    await page.evaluate(() => window.archives.rename('Revisione per bozza'))
    await expect(dialog.getByText('Bozza obsoleta')).toBeVisible()
    await dialog.getByRole('button', { name: 'Crea tipo', exact: true }).click()
    await expect(dialog.getByText(/I dati sono cambiati/).first()).toBeVisible()
    await dialog.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await dialog.getByRole('button', { name: 'Crea tipo', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(newType).toBeFocused()
    await expect(detail.getByTestId('catalog-weight')).toHaveText(
      '1,230000000000000000000000000001',
    )
    await newType.click()
    await dialog.getByLabel('Descrizione', { exact: true }).fill('ASSISTENZA A\u0300LFA')
    await dialog.getByRole('button', { name: 'Crea tipo', exact: true }).click()
    await expect(dialog.getByText('Descrizione già presente.', { exact: true })).toBeVisible()
    await dialog.getByLabel('Descrizione', { exact: true }).fill(' entrata ')
    await dialog.getByRole('button', { name: 'Crea tipo', exact: true }).click()
    await expect(dialog.getByText(/Scegli una descrizione diversa/)).toBeVisible()
    await dialog.getByLabel('Descrizione', { exact: true }).fill('Zero')
    await dialog.getByLabel('Peso iniziale', { exact: true }).fill('0')
    await dialog.getByRole('button', { name: 'Crea tipo', exact: true }).click()
    await expect(
      dialog.getByText('Il valore deve essere maggiore di zero.', { exact: true }).first(),
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'Annulla', exact: true }).click()
    await detail.getByRole('button', { name: 'Rinomina', exact: true }).click()
    await dialog.getByLabel('Descrizione', { exact: true }).fill('Assistenza nuova')
    await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await expect(dialog.getByText('Operazione consentita')).toBeVisible()
    await page.evaluate(() => window.archives.rename('Revisione per anteprima'))
    await expect(dialog.getByText('Anteprima obsoleta')).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: 'Conferma modifica', exact: true }),
    ).toBeDisabled()
    await dialog.getByRole('button', { name: 'Chiudi anteprima', exact: true }).click()
    await dialog.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await dialog.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
    await expect(
      detail.getByRole('heading', { name: 'Assistenza nuova', exact: true }),
    ).toBeVisible()
    await newType.click()
    await dialog.getByLabel('Descrizione', { exact: true }).fill('Assistenza Àlfa')
    await dialog.getByLabel('Peso iniziale', { exact: true }).fill('2')
    await expect(dialog.getByText('Bozza obsoleta')).toBeVisible()
    await dialog.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await dialog.getByRole('button', { name: 'Crea tipo', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await list.getByRole('button', { name: /Assistenza nuova/ }).click()
    await detail.getByRole('button', { name: 'Disattiva', exact: true }).click()
    await dialog.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
    await expect(detail.getByRole('button', { name: 'Riattiva', exact: true })).toBeVisible()
    await detail.getByRole('button', { name: 'Riattiva', exact: true }).click()
    await expect(detail.getByRole('button', { name: 'Disattiva', exact: true })).toBeVisible()
    await list.getByRole('button', { name: /rinforzo ormeggio/ }).click()
    await detail.getByRole('button', { name: 'Elimina tipo', exact: true }).click()
    await expect(dialog).toContainText('2 eliminazioni')
    await dialog.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
    await expect(list.getByRole('button', { name: /rinforzo ormeggio/ })).toHaveCount(0)
    const usedId = await page.evaluate(async () => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw new Error('context')
      const result = await window.catalog.list({
        context: { sessionId: state.value.context.sessionId },
        query: { search: 'Assistenza nuova', status: 'ALL', page: 1, pageSize: 25 },
      })
      if (!result.ok) throw new Error(result.error.code + ': ' + result.error.message)
      return result.value.items[0].id
    })
    await app.evaluate(
      ({ app }, { path, usedId }) => {
        const module = process.getBuiltinModule('module') as typeof import('node:module')
        const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
        const db = new Database(path)
        try {
          db.prepare('UPDATE service_types SET has_ever_been_used = 1 WHERE id = ?').run(usedId)
        } finally {
          db.close()
        }
      },
      { path, usedId },
    )
    await list.getByRole('button', { name: /Assistenza nuova/ }).click()
    await expect(detail).toContainText('Già utilizzato')
    await detail.getByRole('button', { name: 'Elimina tipo', exact: true }).click()
    await expect(dialog.getByText('Operazione bloccata')).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: 'Conferma modifica', exact: true }),
    ).toBeDisabled()
    await shot('eliminazione-bloccata.png')
    await dialog.getByRole('button', { name: 'Chiudi anteprima', exact: true }).click()
    await page.getByLabel('Cerca descrizione', { exact: true }).fill('nessuno')
    await expect(list).toContainText('Nessun risultato')
    await expect(detail).toContainText('Assistenza nuova')
    await page.getByLabel('Cerca descrizione', { exact: true }).fill('')
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setSize(1440, 900)
    })
    await shot('catalogo-desktop.png')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
    const old = await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok) throw new Error('state')
      return s.value.context!
    })
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, copy)
    await page.evaluate((context) => window.archives.saveAs({ context, payload: null }), old)
    await expect(page.getByRole('heading', { name: 'Il tuo archivio', exact: true })).toBeVisible()
    expect(
      await page.evaluate(
        (context) =>
          window.catalog.create({
            context,
            payload: { description: 'Vecchia sessione', initialWeight: '1' },
          }),
        old,
      ),
    ).toMatchObject({ ok: false, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
    await app.close()
    app = undefined
    app = await playwright._electron.launch({ ...options, env })
    page = await app.firstWindow()
    await page.context().setOffline(true)
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
    }, copy)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    const reopened = page.getByRole('region', { name: 'Elenco tipi di prestazione' })
    await expect(reopened.getByRole('button', { name: /rinforzo ormeggio/ })).toHaveCount(0)
    await reopened.getByRole('button', { name: /Assistenza nuova/ }).click()
    await expect(page.getByTestId('catalog-weight')).toHaveText('1,230000000000000000000000000001')
    await expect(page.getByRole('region', { name: 'Dettaglio catalogo' })).toContainText(
      'Già utilizzato',
    )
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    await page.getByRole('button', { name: 'Navi', exact: true }).click()
    await expect(page.getByRole('button', { name: /Preesistente/ })).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
