import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { TariffApi } from '../../src/shared/contracts/tariffs'
import type { PortApi } from '../../src/shared/contracts/ports'
import type { VesselApi } from '../../src/shared/contracts/vessels'
import type { CatalogApi } from '../../src/shared/contracts/catalog'
declare const window: {
  archives: ArchiveApi
  tariffs: TariffApi
  ports: PortApi
  vessels: VesselApi
  catalog: CatalogApi
}

test('P09 tariffe: migrazione v9, tre configurazioni, copie, intervalli, calcolo storico, conflitti e riapertura offline', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(240_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p09-desktop-')),
    path = join(folder, 'tariffs.ormeggi'),
    copy = join(folder, 'copy.ormeggi')
  const packaged = process.env.PORTO_PACKAGED_EXE
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
      ...(packaged
        ? { executablePath: packaged, args: [] }
        : { args: [resolve('out/main/index.js')] }),
      env,
    })
    const page = await app.firstWindow()
    page.setDefaultTimeout(15_000)
    await page.context().setOffline(true)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const migrations = readdirSync('migrations')
      .filter((n) => /^000[1-9]_/.test(n))
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
          db.pragma('user_version = 9')
          db.exec(
            "INSERT INTO archive_metadata VALUES (1,'00000000-0000-4000-8000-000000000001','P09 v9','2026-01-01T00:00:00.000Z','2026-02-01T00:00:00.000Z',42); UPDATE weight_versions SET weight='1.234567890123456789'",
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
    expect(readdirSync(folder).some((n) => n.includes('.prima-v14-'))).toBe(true)
    expect(await page.evaluate(() => window.archives.getState())).toMatchObject({
      ok: true,
      value: { active: { schemaVersion: 14 }, context: { revision: '42' } },
    })
    const ids = await page.evaluate(async () => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw new Error('context')
      let context = state.value.context
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
          name: 'New York',
          locality: 'New York',
          countryCode: 'US',
          initialZoneId: 'America/New_York',
        },
      })
      if (!b.ok) throw new Error(b.error.message)
      context = b.context
      const v = await window.vessels.create({
        context,
        payload: {
          registeredName: 'Stella del mare',
          imoNumber: '001234',
          vesselTypeId: 'STANDARD',
          size: 2100,
        },
      })
      if (!v.ok) throw new Error(v.error.message)
      context = v.context
      const t = await window.catalog.create({
        context,
        payload: { description: 'Assistenza tariffata', initialWeight: '1.5' },
      })
      if (!t.ok) throw new Error(t.error.message)
      await window.archives.rename('Dati P09 pronti')
      return { port: a.value.id, otherPort: b.value.id, vessel: v.value.id, type: t.value.id }
    })
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
    const list = page.getByRole('region', { name: 'Elenco tariffe' }),
      detail = page.getByRole('region', { name: 'Dettaglio tariffa' }),
      dialog = page.getByRole('dialog')
    await list.getByLabel('Porto', { exact: true }).click()
    await page.getByRole('option', { name: /Genova/ }).click()
    await expect(list).toContainText('Nessuna tariffa presente')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    const shot = async (name: string) => {
      if (packaged) return
      if (await dialog.count()) await expect(dialog).toHaveCSS('opacity', '1')
      await page.screenshot({
        path: testInfo.outputPath(name),
        animations: 'disabled',
        timeout: 15_000,
      })
    }
    await list.getByRole('button', { name: 'Nuova tariffa', exact: true }).click()
    await expect(dialog.getByLabel('Decorrenza locale')).toBeFocused()
    await dialog.getByLabel('Decorrenza locale').fill('2026-03-29T02:30')
    await dialog.getByRole('button', { name: 'Verifica decorrenza', exact: true }).click()
    await expect(dialog).toContainText('L’ora locale non esiste')
    await dialog.getByLabel('Decorrenza locale').fill('2026-10-25T02:30')
    await dialog.getByRole('button', { name: 'Verifica decorrenza', exact: true }).click()
    await expect(dialog).toContainText('Scegli l’occorrenza')
    await dialog.getByLabel('Decorrenza locale').fill('2026-01-01T00:00')
    await dialog.getByRole('button', { name: 'Verifica decorrenza', exact: true }).click()
    await expect(dialog).toContainText('Europe/Rome')
    for (const type of ['STANDARD', 'PASSENGER', 'ADM']) {
      await dialog.getByRole('tab', { name: type, exact: true }).click()
      const panel = dialog.getByRole('tabpanel', { name: type, exact: true })
      await panel.getByLabel('Limite incluso 1', { exact: true }).fill('1600')
      await panel
        .getByLabel('Valore EUR 1', { exact: true })
        .fill(type === 'STANDARD' ? '100' : '0')
      await panel.getByLabel('Ampiezza extra', { exact: true }).fill('200')
      await panel.getByLabel('Valore extra EUR', { exact: true }).fill('5')
    }
    await shot('compilazione-minimo.png')
    await page.evaluate(() => window.archives.rename('Conflitto bozza P09'))
    await expect(dialog).toContainText('Bozza obsoleta')
    await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await expect(dialog).toContainText('I dati sono cambiati')
    await dialog.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await expect(dialog).toContainText('Operazione consentita')
    await page.evaluate(() => window.archives.rename('Conflitto anteprima P09'))
    await expect(dialog).toContainText('Anteprima obsoleta')
    await expect(
      dialog.getByRole('button', { name: 'Conferma modifica', exact: true }),
    ).toBeDisabled()
    await dialog.getByRole('button', { name: 'Chiudi anteprima', exact: true }).click()
    await dialog.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await dialog.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(list.getByRole('button', { name: 'Nuova tariffa', exact: true })).toBeFocused()
    await expect(detail.getByRole('region', { name: 'Configurazione STANDARD' })).toContainText(
      '100',
    )
    await shot('dettaglio-minimo.png')
    expect(
      await list.locator('.port-list-results').evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(100)
    expect(await page.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await list.getByLabel('Cerca porto', { exact: true }).fill('Nessun porto')
    await expect(list.getByLabel('Porto', { exact: true })).toHaveValue('1 · Genova')
    await list.getByLabel('Cerca porto', { exact: true }).fill('')
    const first = await page.evaluate(async (portId) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw new Error('context')
      const r = await window.tariffs.list({
        context: { sessionId: s.value.context.sessionId },
        query: { portId, page: 1, pageSize: 25 },
      })
      if (!r.ok) throw new Error(r.error.message)
      return r.value.items[0].id
    }, ids.port)
    await detail.getByRole('button', { name: 'Copia tariffa', exact: true }).click()
    await dialog.getByLabel('Decorrenza locale').fill('2099-01-01T00:00')
    await dialog.getByRole('tab', { name: 'STANDARD', exact: true }).click()
    await expect(
      dialog
        .getByRole('tabpanel', { name: 'STANDARD', exact: true })
        .getByLabel('Valore EUR 1', { exact: true }),
    ).toHaveValue('100')
    await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await expect(dialog).toContainText('1 aggiornamenti')
    await dialog.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await detail.getByRole('button', { name: 'Copia tariffa', exact: true }).click()
    await dialog.getByLabel('Decorrenza locale').fill('2026-06-01T00:00')
    await dialog.getByRole('tab', { name: 'STANDARD', exact: true }).click()
    await dialog
      .getByRole('tabpanel', { name: 'STANDARD', exact: true })
      .getByLabel('Valore EUR 1', { exact: true })
      .fill('200')
    await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await shot('anteprima-intermedia.png')
    await dialog.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(list).toContainText('3 tariffe')
    await expect(detail).toContainText('2098-12-31T23:00:00.000Z')
    await detail.getByRole('button', { name: 'Apri calcolatore', exact: true }).click()
    await dialog.getByLabel('Nave', { exact: true }).click()
    await page.getByRole('option', { name: /Stella del mare/ }).click()
    await dialog.getByLabel('Tipo di attività', { exact: true }).click()
    await page.getByRole('option', { name: 'Prestazione da catalogo', exact: true }).click()
    await dialog.getByLabel('Tipo di prestazione', { exact: true }).click()
    await page.getByRole('option', { name: 'Assistenza tariffata', exact: true }).click()
    await dialog.getByLabel('Cerca nave', { exact: true }).fill('Nessuna nave')
    await expect(dialog.getByLabel('Nave', { exact: true })).toHaveValue('1 · Stella del mare')
    await dialog.getByLabel('Cerca nave', { exact: true }).fill('')
    await dialog.getByLabel('Cerca tipo di prestazione', { exact: true }).fill('Nessun tipo')
    await expect(dialog.getByLabel('Tipo di prestazione', { exact: true })).toHaveValue(
      'Assistenza tariffata',
    )
    await dialog.getByLabel('Cerca tipo di prestazione', { exact: true }).fill('')
    await dialog.getByLabel('Momento economico locale').fill('2025-12-31T23:59')
    await dialog.getByRole('button', { name: 'Simula base', exact: true }).click()
    await expect(dialog).toContainText('Nessuna tariffa applicabile')
    await dialog.getByLabel('Momento economico locale').fill('2026-01-01T00:00')
    const before = await page.evaluate(() => window.archives.getState())
    await dialog.getByRole('button', { name: 'Simula base', exact: true }).click()
    await expect(dialog.getByTestId('calculated-base')).toHaveText('172,50 €')
    await expect(dialog).toContainText('Extra: 3 × 5 EUR')
    await expect(dialog).toContainText('115.00 × 1.5')
    expect(await page.evaluate(() => window.archives.getState())).toEqual(before)
    await dialog.getByText('Riferimenti applicati', { exact: true }).click()
    await expect(dialog).toContainText(first)
    await shot('calcolo-minimo.png')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(
      detail.getByRole('button', { name: 'Apri calcolatore', exact: true }),
    ).toBeFocused()
    await list.getByLabel('Porto', { exact: true }).click()
    await page.getByRole('option', { name: /New York/ }).click()
    await list.getByRole('button', { name: 'Nuova tariffa', exact: true }).click()
    await dialog.getByLabel('Decorrenza locale').fill('2026-01-01T00:00')
    await dialog
      .getByRole('button', { name: 'Copia configurazioni da una tariffa', exact: true })
      .click()
    await dialog.getByLabel('Porto sorgente', { exact: true }).click()
    await page.getByRole('option', { name: /Genova/ }).click()
    await dialog.getByLabel('Tariffa sorgente', { exact: true }).click()
    await page.getByRole('option', { name: /2026-01-01 00:00/ }).click()
    await dialog.getByRole('button', { name: 'Usa configurazioni sorgenti', exact: true }).click()
    await expect(dialog.getByLabel('Tariffa sorgente', { exact: true })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await dialog.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(detail).toContainText('America/New_York')
    await expect(detail).toContainText('2026-01-01T05:00:00.000Z')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900))
    await shot('dettaglio-desktop.png')
    await app.evaluate(({ dialog }, copy) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: copy })
    }, copy)
    await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw new Error('context')
      const r = await window.archives.saveAs({ context: s.value.context, payload: null })
      if (!r.ok) throw new Error(r.error.message)
    })
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
    await expect(
      page.getByRole('region', { name: 'Elenco tariffe' }).getByLabel('Porto', { exact: true }),
    ).toHaveValue('')
    await page.evaluate(
      async ({ portId, first }) => {
        const s = await window.archives.getState()
        if (!s.ok || !s.value.context) throw new Error('context')
        const r = await window.tariffs.get({
          context: { sessionId: s.value.context.sessionId },
          query: { id: first },
        })
        if (!r.ok || r.value.portId !== portId) throw new Error('copy')
        const closed = await window.archives.close({ context: s.value.context, payload: null })
        if (!closed.ok) throw new Error('close')
      },
      { portId: ids.port, first },
    )
    await app.evaluate(({ dialog }, copy) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [copy] })
    }, copy)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    const persisted = await page.evaluate(async (id) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw new Error('context')
      return window.tariffs.get({
        context: { sessionId: s.value.context.sessionId },
        query: { id },
      })
    }, first)
    expect(persisted).toMatchObject({
      ok: true,
      value: {
        id: first,
        configurations: expect.arrayContaining([
          expect.objectContaining({
            vesselTypeId: 'STANDARD',
            brackets: expect.arrayContaining([expect.objectContaining({ value: '100' })]),
          }),
        ]),
      },
    })
    expect(errors).toEqual([])
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
