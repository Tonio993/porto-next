import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { ServiceApi } from '../../src/shared/contracts/services'
import type { CustomerApi } from '../../src/shared/contracts/customers'
import type { AgencyApi } from '../../src/shared/contracts/agencies'
import type { AssignmentApi } from '../../src/shared/contracts/assignments'
import type { CatalogApi } from '../../src/shared/contracts/catalog'
import { operationFixture, operationFixtureIds as ids } from './operations-support'

declare const window: {
  archives: ArchiveApi
  services: ServiceApi
  customers: CustomerApi
  agencies: AgencyApi
  assignments: AssignmentApi
  catalog: CatalogApi
}

test('UI03: consultazione operativa con filtri, pagine, dettagli e tastiera alle due dimensioni', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-ui03-'))
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
    if (!process.env.PORTO_UI03_BEFORE) await page.clock.install()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const phase = process.env.PORTO_UI03_BEFORE ? 'prima' : 'dopo'
    const shot = async (name: string) => {
      if (process.env.PORTO_PACKAGED_EXE) return
      const directory = process.env.PORTO_UI03_SCREENSHOTS ? resolve('doc/ui03/schermate') : null
      if (directory) mkdirSync(directory, { recursive: true })
      await page.screenshot({
        path: directory
          ? join(directory, `${phase}-${name}.png`)
          : testInfo.outputPath(`${phase}-${name}.png`),
        animations: 'disabled',
      })
    }
    await operationFixture(app, join(folder, 'ui03.ormeggi'), 16)
    await app.evaluate(
      ({ app }, path) => {
        const module = process.getBuiltinModule('module') as typeof import('node:module')
        const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
        const db = new Database(path)
        try {
          db.exec(`PRAGMA foreign_keys=OFF;
        UPDATE voyages SET id='00000000-0000-4000-8000-000000000031';
        UPDATE port_calls SET id='00000000-0000-4000-8000-000000000032',voyage_id='00000000-0000-4000-8000-000000000031';
        UPDATE berth_stays SET id='00000000-0000-4000-8000-000000000033',port_call_id='00000000-0000-4000-8000-000000000032';`)
        } finally {
          db.close()
        }
      },
      join(folder, 'ui03.ormeggi'),
    )
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'ui03.ormeggi'))
    await page.evaluate(async (ids) => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw Error('context')
      let context = state.value.context
      const customer = await window.customers.create({
        context,
        payload: {
          businessName: 'Compagnia di navigazione Mediterraneo e servizi marittimi internazionali',
        },
      })
      if (!customer.ok) throw Error(customer.error.message)
      const agency = await window.agencies.create({
        context: customer.context,
        payload: { businessName: 'Agenzia marittima del porto' },
      })
      if (!agency.ok) throw Error(agency.error.message)
      const assignment = await window.assignments.preview({
        context: agency.context,
        payload: {
          target: { kind: 'VOYAGE', id: '00000000-0000-4000-8000-000000000031' },
          specified: { customerId: customer.value.id, agencyId: agency.value.id },
        },
      })
      if (!assignment.ok) throw Error(assignment.error.message)
      const assigned = await window.assignments.confirm({
        context: assignment.context,
        payload: { previewId: assignment.value.previewId },
      })
      if (!assigned.ok) throw Error(assigned.error.message)
      context = assigned.context
      for (let i = 0; i < 28; i++) {
        const result = await window.services.createFree({
          context,
          payload: {
            vesselId: ids.vesselId,
            interpretationPortId: null,
            moment: {
              localDateTime: `2026-05-02T13:${String(i).padStart(2, '0')}`,
              selectedOffset: null,
            },
            executionStatus: i % 2 ? 'PLANNED' : 'PERFORMED',
            description:
              i === 27
                ? 'Assistenza straordinaria alla nave in porto con personale aggiuntivo e attrezzature speciali · '.repeat(
                    3,
                  )
                : `Assistenza in banchina ${i + 1}`,
            base: '123.45',
            notes: 'Nota operativa per il turno successivo. '.repeat(12),
            specified: { customerId: null, agencyId: i === 27 ? agency.value.id : null },
          },
        })
        if (!result.ok) throw Error(result.error.message)
        context = result.context
      }
      const types = await window.catalog.list({
        context: { sessionId: context.sessionId },
        query: { search: '', status: 'ACTIVE', page: 1, pageSize: 25 },
      })
      if (!types.ok) throw Error(types.error.message)
      const catalog = await window.services.createCatalog({
        context,
        payload: {
          vesselId: ids.vesselId,
          interpretationPortId: null,
          moment: { localDateTime: '2026-05-02T13:28', selectedOffset: null },
          serviceTypeId: types.value.items[0].id,
          executionStatus: 'PERFORMED',
          notes: null,
          specified: { customerId: null, agencyId: null },
        },
      })
      if (!catalog.ok) throw Error(catalog.error.message)
      context = catalog.context
      const sync = await window.archives.rename({
        context,
        payload: { name: 'Revisione flussi operativi UI03' },
      })
      if (!sync.ok) throw Error(sync.error.message)
    }, ids)
    await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
    await expect(
      page.getByRole('cell', { name: 'Assistenza in banchina 27', exact: true }),
    ).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await page.getByText('Filtri prestazioni', { exact: true }).click()
    if (!process.env.PORTO_UI03_BEFORE) {
      const results = page.getByRole('region', { name: 'Elenco prestazioni' })
      expect(await results.evaluate((node) => node.clientHeight)).toBeGreaterThanOrEqual(100)
      await page.getByRole('button', { name: 'Avanti', exact: true }).click()
      await expect(page.getByText('Pagina 2 di 2', { exact: true })).toBeVisible()
      await expect(
        page.getByRole('cell', { name: 'Assistenza in banchina 1', exact: true }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Indietro', exact: true }).click()
      const filters = page.getByRole('region', { name: 'Filtri combinati' })
      await filters.getByRole('combobox', { name: 'Tipo di prestazione', exact: true }).click()
      await page.getByRole('option', { name: 'rinforzo ormeggio', exact: true }).click()
      await expect(results.getByRole('button', { name: 'Apri prestazione' })).toHaveCount(1)
      await filters
        .getByRole('button', { name: 'Rimuovi filtro tipo di prestazione', exact: true })
        .click()
      await expect(results.getByRole('button', { name: 'Apri prestazione' })).toHaveCount(25)
      await filters.getByRole('combobox', { name: 'Categoria', exact: true }).click()
      await page.getByRole('option', { name: 'Libera', exact: true }).click()
      await filters.getByRole('combobox', { name: 'Stato prestazione', exact: true }).click()
      await page.getByRole('option', { name: 'Prevista', exact: true }).click()
      await filters.getByLabel('Periodo da (UTC, incluso)').fill('2026-05-02T11:27')
      await filters.getByLabel('Periodo a (UTC, incluso)').fill('2026-05-02T11:27')
      await expect(results.getByRole('button', { name: 'Apri prestazione' })).toHaveCount(1)
      await expect(page.getByText('4 attivi · combinati', { exact: true })).toBeVisible()
      await filters.getByRole('button', { name: 'Azzera filtri' }).click()
      await filters.evaluate((node) => {
        node.scrollTop = 0
      })
    }
    await shot('prestazioni-filtri-minimo')
    await page.getByText('Filtri prestazioni', { exact: true }).click()
    await page
      .getByRole('row')
      .filter({ hasText: 'Assistenza straordinaria' })
      .getByRole('button', { name: 'Apri prestazione' })
      .click()
    const detail = page.getByRole('region', { name: 'Dettaglio prestazione' })
    await expect(detail).toContainText('Base EUR 123.45')
    if (!process.env.PORTO_UI03_BEFORE) {
      await expect(detail).toContainText('Ereditato · Fonte: Viaggio')
      await expect(detail).toContainText('Esplicita · Fonte: Prestazione')
    }
    await detail.scrollIntoViewIfNeeded()
    if (!process.env.PORTO_UI03_BEFORE) {
      const description = detail.locator('.service-complete-description')
      await description.getByText('Descrizione completa', { exact: true }).click()
      await expect(description.locator('p')).toBeVisible()
      await expect(description.locator('p')).toContainText('attrezzature speciali')
      await description.getByText('Descrizione completa', { exact: true }).click()
      await expect(description.locator('p')).not.toBeVisible()
    }
    await shot('prestazione-minimo')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 960))
    await shot('prestazione-desktop')
    if (!process.env.PORTO_UI03_BEFORE) {
      await detail.getByRole('button', { name: 'Modifica prestazione', exact: true }).click()
      const modal = page.getByRole('dialog')
      await expect(modal.getByLabel('Momento prestazione locale')).toBeFocused()
      await modal.getByLabel('Importo base EUR').fill('0')
      await modal.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
      await expect(modal.getByLabel('Importo base EUR')).toHaveAttribute('aria-invalid', 'true')
      await modal.getByLabel('Importo base EUR').fill('150,25')
      await modal.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
      await expect(modal.getByText(/Anteprima pronta/)).toBeVisible()
      await expect(modal.getByRole('region', { name: 'Valori prima' })).toContainText('123.45')
      await expect(modal.getByRole('region', { name: 'Valori dopo' })).toContainText('150.25')
      await shot('anteprima-desktop')
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
      await modal.getByRole('button', { name: 'Conferma variazione' }).scrollIntoViewIfNeeded()
      await expect(modal.getByRole('button', { name: 'Conferma variazione' })).toBeInViewport()
      await page.clock.fastForward(16 * 60_000)
      await expect(modal.getByText(/Anteprima scaduta/)).toBeVisible()
      await expect(modal.getByRole('button', { name: 'Conferma variazione' })).toBeDisabled()
      await page.keyboard.press('Escape')
      await expect(modal).toHaveCount(0)
      await expect(
        detail.getByRole('button', { name: 'Modifica prestazione', exact: true }),
      ).toBeFocused()
      await page.clock.resume()
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 960))
      await detail.getByRole('button', { name: 'Modifica sole note' }).click()
      await expect(modal.getByLabel('Note', { exact: true })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(modal.getByRole('button', { name: 'Chiudi', exact: true })).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(modal.getByLabel('Note', { exact: true })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(detail.getByRole('button', { name: 'Modifica sole note' })).toBeFocused()
      // Consult the calculated category without losing the list or its actions.
      await page
        .getByRole('row')
        .filter({ hasText: 'rinforzo ormeggio' })
        .getByRole('button', { name: 'Apri prestazione' })
        .click()
      await expect(detail.getByRole('region', { name: 'Calcolo della prestazione' })).toContainText(
        'Spiegazione del calcolo',
      )
    }
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
    await page.getByRole('option', { name: '1 · Stella del mare', exact: true }).click()
    await page.getByRole('button', { name: 'Entrata · Effettuata', exact: false }).click()
    await expect(page.getByRole('region', { name: 'Dettaglio operazione' })).toBeVisible()
    await shot('operazione-desktop')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await expect(page.getByText('Viaggio · Aperto', { exact: true })).toBeVisible()
    await shot('permanenze-minimo')
    if (!process.env.PORTO_UI03_BEFORE) {
      const stays = page.getByRole('region', { name: 'Permanenze derivate' })
      await stays.getByRole('button', { name: 'Assegna soggetti all’ormeggio' }).click()
      const modal = page.getByRole('dialog')
      await expect(modal.getByRole('textbox', { name: 'Cerca cliente', exact: true })).toBeFocused()
      await expect(modal).toContainText('Ereditato · Fonte: Viaggio')
      await page.keyboard.press('Escape')
      await expect(
        stays.getByRole('button', { name: 'Assegna soggetti all’ormeggio' }),
      ).toBeFocused()
      await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
      await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
      await page.getByRole('combobox', { name: 'Porto', exact: true }).click()
      await page.getByRole('option', { name: '1 · Genova', exact: true }).click()
      await page.getByRole('button', { name: /2026-01-01/ }).click()
      await expect(page.getByRole('region', { name: 'Dettaglio tariffa' })).toContainText(
        'Nave normale',
      )
      await shot('tariffa-minimo')
    }
    expect(errors).toEqual([])
  } finally {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
