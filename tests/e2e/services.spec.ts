import type { AssignmentApi } from '../../src/shared/contracts/assignments'
import type { CatalogApi } from '../../src/shared/contracts/catalog'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { ServiceApi } from '../../src/shared/contracts/services'
import type { CustomerApi } from '../../src/shared/contracts/customers'
import type { AgencyApi } from '../../src/shared/contracts/agencies'
import {
  operationFixture,
  operationFixtureIds as ids,
  delayOperationResponse,
  operationHeld,
  releaseOperation,
} from './operations-support'

declare const window: {
  archives: ArchiveApi
  assignments: AssignmentApi
  catalog: CatalogApi
  services: ServiceApi
  customers: CustomerApi
  agencies: AgencyApi
}
const options = () =>
  process.env.PORTO_PACKAGED_EXE
    ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
    : { args: [resolve('out/main/index.js')] }
async function setup(app: ElectronApplication, path: string) {
  await operationFixture(app, path, 14)
  await app.evaluate(({ app }, path) => {
    const module = process.getBuiltinModule('module') as typeof import('node:module')
    const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3'),
      db = new Database(path)
    try {
      // Actual APIs accept opaque UUIDs; normalize only the descriptive historical fixture IDs.
      db.exec(`PRAGMA foreign_keys=OFF;
        UPDATE voyages SET id='00000000-0000-4000-8000-000000000031';
        UPDATE port_calls SET id='00000000-0000-4000-8000-000000000032',voyage_id='00000000-0000-4000-8000-000000000031';
        UPDATE berth_stays SET id='00000000-0000-4000-8000-000000000033',port_call_id='00000000-0000-4000-8000-000000000032';`)
    } finally {
      db.close()
    }
  }, path)
  const page = await app.firstWindow()
  page.setDefaultTimeout(12000)
  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(path)
  await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: '1 · Stella del mare', exact: true }).click()
  return page
}
for (const scenario of ['funzionale', 'asincrono'] as const)
  test(`P14 ${scenario}: prestazioni libere, migrazione e contesto`, async ({
    playwright,
  }, testInfo) => {
    test.setTimeout(180000)
    const folder = mkdtempSync(join(tmpdir(), 'porto-p14-desktop-')),
      path = join(folder, 'a.ormeggi')
    const env = {
      ...process.env,
      PORTO_TEST_USER_DATA: join(folder, 'prefs'),
      PORTO_TEST_HIDDEN: '1',
    }
    delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
    let app: ElectronApplication | undefined
    try {
      app = await playwright._electron.launch({ ...options(), env })
      const page = await setup(app, path),
        errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      expect(readdirSync(folder).some((n) => n.includes('.prima-v16-'))).toBe(true)
      const modal = page.getByRole('dialog')
      const open = async () => {
        await page.getByRole('button', { name: 'Nuova prestazione libera', exact: true }).click()
        await expect(modal).toBeVisible()
      }
      if (scenario === 'funzionale') {
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].setSize(960, 700),
        )
        await open()
        await modal.getByLabel('Momento prestazione locale').fill('2026-05-02T13:00')
        await modal.getByRole('button', { name: 'Verifica momento e contesto' }).click()
        await expect(modal.getByText('Porto competente: Genova')).toBeVisible()
        await modal.getByLabel('Descrizione').fill('Assistenza libera P14')
        await modal.getByLabel('Importo base EUR').fill('0')
        await modal.getByRole('button', { name: 'Registra prestazione' }).click()
        await expect(modal.getByRole('alert')).toContainText('maggiore di zero')
        await modal.getByLabel('Importo base EUR').fill('123,45')
        await modal.getByLabel('Note', { exact: true }).fill('Nota libera')
        await modal.getByRole('combobox', { name: 'Stato', exact: true }).click()
        await page.getByRole('option', { name: 'Mancata', exact: true }).click()
        if (!process.env.PORTO_PACKAGED_EXE)
          await page.screenshot({
            path: testInfo.outputPath('p14-editor-minimo.png'),
            animations: 'disabled',
          })
        await modal.getByRole('button', { name: 'Chiudi', exact: true }).click()
        await expect(
          page.getByRole('button', { name: 'Nuova prestazione libera', exact: true }),
        ).toBeFocused()
        await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
        await expect(modal.getByLabel('Descrizione')).toHaveValue('Assistenza libera P14')
        await modal.getByRole('button', { name: 'Registra prestazione' }).click()
        await expect(modal).toHaveCount(0)
        const detail = page.getByRole('region', { name: 'Dettaglio prestazione' })
        await expect(detail).toContainText('Base EUR 123.45')
        await expect(detail).toContainText('Mancata')
        await expect(detail).toContainText('Banchina non specificata')
        await expect(detail).toContainText('Assente')
        await expect(
          page.getByRole('cell', { name: 'Assistenza libera P14', exact: true }),
        ).toBeVisible()
        // Una seconda registrazione nello stesso minuto mantiene il proprio stato e l'importo int64.
        await page.evaluate(async (ids) => {
          const r = await window.archives.getState()
          if (!r.ok || !r.value.context) throw Error('context')
          const created = await window.services.createFree({
            context: r.value.context,
            payload: {
              vesselId: ids.vesselId,
              interpretationPortId: null,
              moment: { localDateTime: '2026-05-02T13:00', selectedOffset: null },
              executionStatus: 'PERFORMED',
              description: 'Importo esatto',
              base: '92233720368547758.07',
              notes: null,
              specified: { customerId: null, agencyId: null },
            },
          })
          if (!created.ok) throw Error(created.error.message)
          const invalid = await window.services.createFree({
            context: created.context,
            payload: {
              vesselId: ids.vesselId,
              interpretationPortId: null,
              moment: { localDateTime: '2026-05-02T11:59', selectedOffset: null },
              executionStatus: 'MISSED',
              description: 'Senza contesto',
              base: '1.00',
              notes: null,
              specified: { customerId: null, agencyId: null },
            },
          })
          if (invalid.ok || invalid.error.code !== 'OPERATIONAL_CONTEXT_MISSING')
            throw Error('Contesto invalido accettato')
        }, ids)
        await page.getByRole('button', { name: 'Ricarica consultazione', exact: true }).click()
        await expect(
          page.getByRole('cell', { name: '92233720368547758.07', exact: true }),
        ).toBeVisible()
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].setSize(1440, 960),
        )
        await page
          .getByRole('row')
          .filter({ hasText: 'Assistenza libera P14' })
          .getByRole('button', { name: 'Apri prestazione' })
          .click()
        await expect(detail).toContainText('Nota libera')
        if (!process.env.PORTO_PACKAGED_EXE)
          await page.screenshot({
            path: testInfo.outputPath('p14-dettaglio-desktop.png'),
            animations: 'disabled',
          })
        await page.evaluate(async () => {
          const s = await window.archives.getState()
          if (!s.ok || !s.value.context) throw Error('context')
          const r = await window.archives.close({ context: s.value.context, payload: null })
          if (!r.ok) throw Error(r.error.message)
        })
        await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
        await expect(page.getByTestId('archive-path')).toHaveText(path)
        await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
        await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
        await page.getByRole('option', { name: '1 · Stella del mare', exact: true }).click()
        await expect(
          page.getByRole('cell', { name: 'Assistenza libera P14', exact: true }),
        ).toBeVisible()
      } else {
        // Risposta di risoluzione chiusa: la bozza successiva non deve riceverla.
        await open()
        await modal.getByLabel('Momento prestazione locale').fill('2026-05-02T13:00')
        await delayOperationResponse(app, 'services:resolve-moment')
        await modal.getByRole('button', { name: 'Verifica momento e contesto' }).click()
        await expect.poll(() => operationHeld(app!)).toBe(true)
        await modal.getByRole('button', { name: 'Chiudi', exact: true }).click()
        await open()
        await releaseOperation(app)
        await expect(modal.getByText('Porto competente: Genova')).toHaveCount(0)
        // Revisione diversa: preserva i valori e richiede ricaricamento esplicito.
        await modal.getByLabel('Descrizione').fill('Bozza conservata')
        await modal.getByLabel('Momento prestazione locale').fill('2026-05-02T13:00')
        await modal.getByLabel('Importo base EUR').fill('10')
        await page.evaluate(async () => {
          const s = await window.archives.getState()
          if (!s.ok || !s.value.context) throw Error('context')
          const r = await window.archives.rename({
            context: s.value.context,
            payload: { name: 'Revisione P14' },
          })
          if (!r.ok) throw Error(r.error.message)
        })
        await expect(modal.getByRole('button', { name: 'Registra prestazione' })).toBeDisabled()
        await expect(modal.getByLabel('Descrizione')).toHaveValue('Bozza conservata')
        await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
        await modal.getByRole('button', { name: 'Registra prestazione' }).click()
        await expect(modal).toHaveCount(0)
        // Risposta elenco obsoleta rispetto alla selezione della nave.
        await delayOperationResponse(app, 'services:list')
        await page.getByRole('button', { name: 'Ricarica consultazione', exact: true }).click()
        await expect.poll(() => operationHeld(app!)).toBe(true)
        await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
        await page.getByRole('option', { name: '2 · Aurora', exact: true }).click()
        await releaseOperation(app)
        await expect(
          page.getByText('Nessuna prestazione registrata.', { exact: true }),
        ).toBeVisible()
        await expect(page.getByRole('cell', { name: 'Bozza conservata', exact: true })).toHaveCount(
          0,
        )
      }
      expect(errors).toEqual([])
    } finally {
      if (app) await app.close()
      rmSync(folder, { recursive: true, force: true })
    }
  })

test('P15: migrazione v15 popolata, catalogo, spiegazione, tipo storico e FREE conservata', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(180000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p15-desktop-')),
    path = join(folder, 'v15.ormeggi')
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await playwright._electron.launch({ ...options(), env })
    await operationFixture(app, path, 15)
    await app.evaluate(({ app }, path) => {
      const module = process.getBuiltinModule('module') as typeof import('node:module')
      const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
      const db = new Database(path)
      try {
        db.exec(`INSERT INTO service_activities(id,category,vessel_id,vessel_version_id,execution_status,description,base_cents,local_date_time,zone_id,utc_offset,utc,voyage_id,port_call_id,berth_stay_id,port_id,port_version_id,created_at)
          SELECT 'free-v15','FREE',o.vessel_id,'vv0','PERFORMED','Libera storica àèìòù',9223372036854775807,'2026-05-02T13:00','Europe/Rome','+02:00','2026-05-02T11:00:00.000Z','voyage-p10','visit-p10','stay-p10',port_id,'pv','2026-05-02T11:00:00.000Z' FROM vessel_operations o JOIN operation_endpoints e ON e.operation_id=o.id WHERE o.id='00000000-0000-4000-8000-000000000016';
          INSERT INTO service_activity_subjects(service_id) VALUES('free-v15')`)
      } finally {
        db.close()
      }
    }, path)
    const page = await app.firstWindow()
    page.setDefaultTimeout(12000)
    await page.context().setOffline(true)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    expect(readdirSync(folder).some((n) => n.includes('.prima-v16-'))).toBe(true)
    await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
    await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
    await page.getByRole('option', { name: '1 · Stella del mare', exact: true }).click()
    await expect(
      page.getByRole('cell', { name: '92233720368547758.07', exact: true }),
    ).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await page.getByRole('button', { name: 'Nuova prestazione da catalogo', exact: true }).click()
    const modal = page.getByRole('dialog')
    await modal.getByLabel('Momento prestazione locale').fill('2026-05-02T13:00')
    await modal.getByRole('button', { name: 'Verifica momento e contesto' }).click()
    await expect(modal.getByText('Porto competente: Genova')).toBeVisible()
    await modal.getByRole('combobox', { name: 'Tipo di prestazione' }).click()
    await page.getByRole('option', { name: 'rinforzo ormeggio', exact: true }).click()
    await expect(modal.getByLabel('Importo base EUR')).toHaveCount(0)
    await expect(modal.getByRole('textbox', { name: 'Descrizione', exact: true })).toHaveCount(0)
    await modal.getByRole('combobox', { name: 'Stato', exact: true }).click()
    await page.getByRole('option', { name: 'Mancata', exact: true }).click()
    await modal.getByLabel('Note', { exact: true }).fill('Catalogo P15 — verifica')
    await page.screenshot({
      path: testInfo.outputPath('p15-editor-minimo.png'),
      animations: 'disabled',
    })
    await modal.getByRole('button', { name: 'Chiudi', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Nuova prestazione da catalogo', exact: true }),
    ).toBeFocused()
    await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
    await expect(modal.getByRole('combobox', { name: 'Tipo di prestazione' })).toHaveValue(
      'rinforzo ormeggio',
    )
    await modal.getByRole('button', { name: 'Registra prestazione', exact: true }).click()
    await expect(modal).toHaveCount(0)
    const detail = page.getByRole('region', { name: 'Dettaglio prestazione' })
    await expect(detail).toContainText('Catalogo · Mancata · Base EUR 115.00')
    await expect(detail).toContainText('Extra: 3 × 5 EUR')
    await expect(detail).toContainText('Peso: 1')
    await expect(detail).toContainText('Base: 115.00 × 1 = 115.00 EUR')
    await detail.locator('li').last().scrollIntoViewIfNeeded()
    await expect(detail.locator('li').last()).toBeInViewport()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 960))
    await page.screenshot({
      path: testInfo.outputPath('p15-dettaglio-desktop.png'),
      animations: 'disabled',
    })
    await page.evaluate(async () => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw Error('context')
      const list = await window.services.list({
        context: { sessionId: state.value.context.sessionId },
        query: { vesselId: '00000000-0000-4000-8000-000000000012', page: 1, pageSize: 25 },
      })
      if (!list.ok) throw Error(list.error.message)
      const saved = list.value.items.find((s) => s.category === 'CATALOG')!
      const id = saved.serviceTypeId!
      const type = await window.catalog.get({
        context: { sessionId: state.value.context.sessionId },
        query: { id },
      })
      if (!type.ok || !type.value.hasEverBeenUsed) throw Error('Utilizzo storico assente')
      let context = state.value.context
      for (const payload of [
        { operation: 'RENAME' as const, id, description: 'Tipo rinominato P15' },
        { operation: 'DEACTIVATE' as const, id },
      ]) {
        const p = await window.catalog.preview({ context, payload })
        if (!p.ok) throw Error(p.error.message)
        const c = await window.catalog.confirm({
          context: p.context,
          payload: { previewId: p.value.previewId },
        })
        if (!c.ok) throw Error(c.error.message)
        context = c.context
      }
      const query = await window.services.get({
        context: { sessionId: context.sessionId },
        query: { id: saved.id },
      })
      if (
        !query.ok ||
        query.value.description !== 'Tipo rinominato P15' ||
        query.value.base !== '115.00'
      )
        throw Error('Consultazione storica')
      const invalid = await window.services.createCatalog({
        context,
        payload: {
          vesselId: saved.vesselId,
          interpretationPortId: null,
          moment: { localDateTime: '2026-05-02T13:00', selectedOffset: null },
          serviceTypeId: id,
          executionStatus: 'MISSED',
          notes: null,
          specified: { customerId: null, agencyId: null },
        },
      })
      if (invalid.ok || invalid.error.code !== 'NOT_SELECTABLE')
        throw Error('Tipo disattivato selezionabile')
      const close = await window.archives.close({ context, payload: null })
      if (!close.ok) throw Error(close.error.message)
    })
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
    await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
    await page.getByRole('option', { name: '1 · Stella del mare', exact: true }).click()
    await expect(page.getByRole('cell', { name: 'Tipo rinominato P15', exact: true })).toBeVisible()
    await expect(
      page.getByRole('cell', { name: '92233720368547758.07', exact: true }),
    ).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})

test('P15 asincrono: selettore catalogo ignora risposte precedenti e conserva la selezione fra ricerche', async ({
  playwright,
}) => {
  test.setTimeout(120000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p15-async-')),
    path = join(folder, 'a.ormeggi')
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await playwright._electron.launch({ ...options(), env })
    const page = await setup(app, path),
      modal = page.getByRole('dialog')
    await delayOperationResponse(app, 'catalog:list')
    await page.getByRole('button', { name: 'Nuova prestazione da catalogo', exact: true }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await modal.getByLabel('Cerca tipo di prestazione', { exact: true }).fill('inesistente')
    await releaseOperation(app)
    await modal.getByRole('combobox', { name: 'Tipo di prestazione' }).click()
    await expect(page.getByRole('option', { name: 'rinforzo ormeggio', exact: true })).toHaveCount(
      0,
    )
    await modal.getByLabel('Cerca tipo di prestazione', { exact: true }).fill('rinforzo')
    await modal.getByRole('combobox', { name: 'Tipo di prestazione' }).click()
    await page.getByRole('option', { name: 'rinforzo ormeggio', exact: true }).click()
    await modal.getByLabel('Cerca tipo di prestazione', { exact: true }).fill('inesistente')
    await expect(modal.getByRole('combobox', { name: 'Tipo di prestazione' })).toHaveValue(
      'rinforzo ormeggio',
    )
    await modal.getByRole('button', { name: 'Chiudi', exact: true }).click()
    await page.getByRole('button', { name: 'Nuova prestazione libera', exact: true }).click()
    await expect(modal.getByRole('textbox', { name: 'Descrizione', exact: true })).toBeVisible()
    await expect(modal.getByRole('combobox', { name: 'Tipo di prestazione' })).toHaveCount(0)
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})

for (const category of ['FREE', 'CATALOG'] as const)
  test(
    'P16 ' + category + ': ciclo di vita, ricerca, conflitto e riapertura',
    async ({ playwright }, testInfo) => {
      test.setTimeout(180000)
      const folder = mkdtempSync(join(tmpdir(), 'porto-p16-')),
        path = join(folder, 'p16.ormeggi')
      const env = {
        ...process.env,
        PORTO_TEST_USER_DATA: join(folder, 'prefs'),
        PORTO_TEST_HIDDEN: '1',
      }
      delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
      let app: ElectronApplication | undefined
      try {
        app = await playwright._electron.launch({ ...options(), env })
        const page = await setup(app, path),
          errors: string[] = []
        page.on('pageerror', (e) => errors.push(e.message))
        const modal = page.getByRole('dialog'),
          detail = page.getByRole('region', { name: 'Dettaglio prestazione' })
        await page
          .getByRole('button', {
            name:
              category === 'FREE' ? 'Nuova prestazione libera' : 'Nuova prestazione da catalogo',
            exact: true,
          })
          .click()
        await modal.getByLabel('Momento prestazione locale').fill('2026-05-02T13:00')
        if (category === 'FREE') {
          await modal.getByRole('textbox', { name: 'Descrizione', exact: true }).fill('Libera P16')
          await modal.getByLabel('Importo base EUR').fill('15,50')
        } else {
          await modal.getByRole('combobox', { name: 'Tipo di prestazione', exact: true }).click()
          await page.getByRole('option', { name: 'rinforzo ormeggio', exact: true }).click()
        }
        await modal.getByRole('button', { name: 'Registra prestazione', exact: true }).click()
        await expect(modal).toHaveCount(0)
        await expect(detail).toContainText('Prevista')
        await detail.getByRole('button', { name: 'Consuntiva prestazione', exact: true }).click()
        await modal.getByLabel('Momento prestazione locale').fill('2026-05-02T11:59')
        await modal.getByRole('button', { name: 'Mostra anteprima' }).click()
        await expect(modal.getByRole('alert')).toContainText('permanenza')
        await modal.getByLabel('Momento prestazione locale').fill('2026-05-02T13:30')
        await modal.getByRole('button', { name: 'Mostra anteprima' }).click()
        await expect(modal.getByRole('region', { name: 'Anteprima prestazione' })).toContainText(
          'Effettuata',
        )
        await expect(detail).toContainText('Prevista')
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].setSize(960, 700),
        )
        await modal.getByRole('button', { name: 'Conferma variazione' }).scrollIntoViewIfNeeded()
        await page.screenshot({
          path: testInfo.outputPath('p16-anteprima-minimo.png'),
          animations: 'disabled',
        })
        await modal.getByRole('button', { name: 'Conferma variazione' }).click()
        await expect(modal).toHaveCount(0)
        await expect(detail).toContainText('Effettuata')
        await expect(detail).toContainText('2026-05-02T13:30')
        await expect(page.locator(':focus')).toHaveText(
          /Modifica prestazione|Ricarica consultazione/,
        )
        await expect(detail.getByRole('button', { name: 'Consuntiva prestazione' })).toHaveCount(0)
        // Dedicated notes command, original draft context and explicit reload after conflict.
        await detail.getByRole('button', { name: 'Modifica sole note' }).click()
        await expect(modal.getByLabel('Momento prestazione locale')).toHaveCount(0)
        await modal.getByLabel('Note', { exact: true }).fill('Bozza conservata àèìòù')
        await page.evaluate(async () => {
          const s = await window.archives.getState()
          if (!s.ok || !s.value.context) throw Error('context')
          const r = await window.archives.rename({
            context: s.value.context,
            payload: { name: 'Conflitto P16' },
          })
          if (!r.ok) throw Error(r.error.message)
        })
        await expect(modal.getByRole('button', { name: 'Salva note' })).toBeDisabled()
        await expect(modal.getByLabel('Note', { exact: true })).toHaveValue(
          'Bozza conservata àèìòù',
        )
        await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
        await modal.getByLabel('Note', { exact: true }).fill('Note P16 àèìòù')
        await modal.getByLabel('Note', { exact: true }).focus()
        await page.keyboard.press('Tab')
        await expect(modal.getByRole('button', { name: 'Chiudi', exact: true })).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(modal.getByRole('button', { name: 'Salva note', exact: true })).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(modal).toHaveCount(0)
        await expect(detail).toContainText('Note P16 àèìòù')
        await expect(page.locator(':focus')).toHaveText(/Modifica sole note|Ricarica consultazione/)
        if (category === 'CATALOG') {
          await page.evaluate(async () => {
            const s = await window.archives.getState()
            if (!s.ok || !s.value.context) throw Error('context')
            const list = await window.services.list({
              context: { sessionId: s.value.context.sessionId },
              query: { page: 1, pageSize: 25 },
            })
            if (!list.ok) throw Error(list.error.message)
            const type = list.value.items[0].serviceTypeId!
            const p = await window.catalog.preview({
              context: s.value.context,
              payload: { operation: 'DEACTIVATE', id: type },
            })
            if (!p.ok) throw Error(p.error.message)
            const c = await window.catalog.confirm({
              context: p.context,
              payload: { previewId: p.value.previewId },
            })
            if (!c.ok) throw Error(c.error.message)
            const sync = await window.archives.rename({
              context: c.context,
              payload: { name: 'Tipo storico P16' },
            })
            if (!sync.ok) throw Error(sync.error.message)
          })
        }
        await detail.getByRole('button', { name: 'Modifica prestazione', exact: true }).click()
        if (category === 'CATALOG') {
          await expect(modal.getByRole('combobox', { name: 'Tipo di prestazione' })).toHaveValue(
            'rinforzo ormeggio · Disattivato',
          )
          await expect(modal.getByLabel('Importo base EUR')).toHaveCount(0)
        } else {
          await modal
            .getByRole('textbox', { name: 'Descrizione', exact: true })
            .fill('Libera corretta P16')
          await modal.getByLabel('Importo base EUR').fill('20,25')
        }
        await modal.getByRole('combobox', { name: 'Stato', exact: true }).click()
        await page.getByRole('option', { name: 'Mancata', exact: true }).click()
        await modal.getByRole('button', { name: 'Mostra anteprima' }).click()
        await expect(modal.getByRole('region', { name: 'Anteprima prestazione' })).toContainText(
          'Mancata',
        )
        // A changed revision invalidates a ready preview, preserving its input until reload.
        await page.evaluate(async () => {
          const s = await window.archives.getState()
          if (!s.ok || !s.value.context) throw Error('context')
          const r = await window.archives.rename({
            context: s.value.context,
            payload: { name: 'Anteprima obsoleta P16' },
          })
          if (!r.ok) throw Error(r.error.message)
        })
        await expect(modal.getByRole('button', { name: 'Conferma variazione' })).toBeDisabled()
        await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
        await modal.getByRole('combobox', { name: 'Stato', exact: true }).click()
        await page.getByRole('option', { name: 'Mancata', exact: true }).click()
        if (category === 'FREE') {
          await modal
            .getByRole('textbox', { name: 'Descrizione', exact: true })
            .fill('Libera corretta P16')
          await modal.getByLabel('Importo base EUR').fill('20,25')
        }
        await modal.getByRole('button', { name: 'Mostra anteprima' }).click()
        await modal.getByRole('button', { name: 'Conferma variazione' }).click()
        await expect(modal).toHaveCount(0)
        await expect(detail).toContainText('Mancata')
        await expect(detail).toContainText(
          category === 'FREE' ? 'Base EUR 20.25' : 'Base EUR 115.00',
        )
        // Combined visible filters, historical type, interval and the actual stay hierarchy.
        await page.getByText('Filtri prestazioni', { exact: true }).click()
        const filters = page
          .locator('details')
          .filter({ has: page.locator('summary').filter({ hasText: 'Filtri prestazioni' }) })
        await filters.getByRole('combobox', { name: 'Categoria', exact: true }).click()
        await page
          .getByRole('option', { name: category === 'FREE' ? 'Libera' : 'Catalogo', exact: true })
          .click()
        await filters.getByRole('combobox', { name: 'Stato prestazione', exact: true }).click()
        await page.getByRole('option', { name: 'Mancata', exact: true }).click()
        await filters.getByLabel('Periodo da (UTC, incluso)').fill('2026-05-02T11:30')
        await filters.getByLabel('Periodo a (UTC, incluso)').fill('2026-05-02T11:30')
        await filters.getByRole('combobox', { name: 'Viaggio', exact: true }).click()
        await page.getByRole('option').first().click()
        await filters.getByRole('combobox', { name: 'Visita', exact: true }).click()
        await page.getByRole('option').first().click()
        await filters.getByRole('combobox', { name: 'Ormeggio', exact: true }).click()
        await page.getByRole('option').first().click()
        if (category === 'CATALOG') {
          await filters.getByRole('combobox', { name: 'Tipo di prestazione', exact: true }).click()
          await page
            .getByRole('option', { name: 'rinforzo ormeggio · Disattivato', exact: true })
            .click()
        }
        await expect(
          page.getByRole('cell', {
            name: category === 'FREE' ? 'Libera corretta P16' : 'rinforzo ormeggio',
            exact: true,
          }),
        ).toBeVisible()
        const voyageSelection = await filters
          .getByRole('combobox', { name: 'Viaggio', exact: true })
          .inputValue()
        await page.getByText('Filtri prestazioni', { exact: true }).click()
        await page.getByText('Filtri prestazioni', { exact: true }).click()
        await expect(filters.getByRole('combobox', { name: 'Viaggio', exact: true })).toHaveValue(
          voyageSelection,
        )
        await filters.getByLabel('Periodo a (UTC, incluso)').fill('2026-05-02T11:29')
        await expect(page.getByRole('alert')).toContainText('precede')
        await filters.getByLabel('Periodo a (UTC, incluso)').fill('2026-05-02T11:30')
        await filters.getByRole('button', { name: 'Azzera filtri' }).click()
        await page.getByText('Filtri prestazioni', { exact: true }).click()
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].setSize(1440, 960),
        )
        await detail.scrollIntoViewIfNeeded()
        await page.screenshot({
          path: testInfo.outputPath('p16-dettaglio-desktop.png'),
          animations: 'disabled',
        })
        if (category === 'CATALOG') {
          await page.evaluate(async () => {
            const s = await window.archives.getState()
            if (!s.ok || !s.value.context) throw Error('context')
            const c = await window.catalog.create({
              context: s.value.context,
              payload: { description: 'Sostituzione P16', initialWeight: '2' },
            })
            if (!c.ok) throw Error(c.error.message)
            const sync = await window.archives.rename({
              context: c.context,
              payload: { name: 'Tipo sostitutivo P16' },
            })
            if (!sync.ok) throw Error(sync.error.message)
          })
          await detail.getByRole('button', { name: 'Modifica prestazione', exact: true }).click()
          const type = modal.getByRole('combobox', { name: 'Tipo di prestazione', exact: true })
          await type.click()
          await page.getByRole('option', { name: 'Sostituzione P16', exact: true }).click()
          // The original inactive association remains available while editing the replacement.
          await type.click()
          await page
            .getByRole('option', { name: 'rinforzo ormeggio · Disattivato', exact: true })
            .click()
          await type.click()
          await page.getByRole('option', { name: 'Sostituzione P16', exact: true }).click()
          await modal.getByRole('button', { name: 'Mostra anteprima' }).click()
          await expect(modal.getByRole('region', { name: 'Anteprima prestazione' })).toContainText(
            'Base EUR 230.00',
          )
          await modal.getByRole('button', { name: 'Conferma variazione' }).click()
          await expect(modal).toHaveCount(0)
          await expect(detail).toContainText('Sostituzione P16')
        }
        // Reopen the v16 archive before deletion; no schema upgrade is introduced by P16.
        await page.evaluate(async () => {
          const s = await window.archives.getState()
          if (!s.ok || !s.value.context) throw Error('context')
          const r = await window.archives.close({ context: s.value.context, payload: null })
          if (!r.ok) throw Error(r.error.message)
        })
        await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
        await expect(page.getByTestId('archive-path')).toHaveText(path)
        await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
        await page.getByRole('button', { name: 'Apri prestazione', exact: true }).click()
        await expect(detail).toContainText('Note P16 àèìòù')
        await detail.getByRole('button', { name: 'Elimina prestazione', exact: true }).click()
        await modal.getByRole('button', { name: 'Mostra anteprima' }).click()
        await expect(modal).toContainText('eliminati definitivamente')
        await modal.getByRole('button', { name: 'Conferma variazione' }).click()
        await expect(modal).toHaveCount(0)
        await expect(
          page.getByText('Nessuna prestazione registrata.', { exact: true }),
        ).toBeVisible()
        expect(errors).toEqual([])
      } finally {
        if (app) await app.close()
        rmSync(folder, { recursive: true, force: true })
      }
    },
  )

test('P16 asincrono: filtri, anteprima obsoleta e note con esito incerto richiedono rilettura', async ({
  playwright,
}) => {
  test.setTimeout(180000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p16-async-')),
    path = join(folder, 'p16.ormeggi')
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await playwright._electron.launch({ ...options(), env })
    const page = await setup(app, path),
      modal = page.getByRole('dialog'),
      detail = page.getByRole('region', { name: 'Dettaglio prestazione' })
    await page.evaluate(async (ids) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      const r = await window.services.createFree({
        context: s.value.context,
        payload: {
          vesselId: ids.vesselId,
          interpretationPortId: null,
          moment: { localDateTime: '2026-05-02T13:00', selectedOffset: null },
          executionStatus: 'PLANNED',
          description: 'Asincrona P16',
          base: '10.00',
          notes: null,
          specified: { customerId: null, agencyId: null },
        },
      })
      if (!r.ok) throw Error(r.error.message)
      const sync = await window.archives.rename({
        context: r.context,
        payload: { name: 'Fixture asincrona P16' },
      })
      if (!sync.ok) throw Error(sync.error.message)
    }, ids)
    await page.getByRole('button', { name: 'Ricarica consultazione', exact: true }).click()
    await page.getByRole('button', { name: 'Apri prestazione', exact: true }).click()
    await detail.getByRole('button', { name: 'Modifica prestazione', exact: true }).click()
    await modal
      .getByRole('textbox', { name: 'Descrizione', exact: true })
      .fill('Bozza obsoleta P16')
    await delayOperationResponse(app, 'services:preview')
    await modal.getByRole('button', { name: 'Mostra anteprima' }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      const r = await window.archives.rename({
        context: s.value.context,
        payload: { name: 'Risposta obsoleta' },
      })
      if (!r.ok) throw Error(r.error.message)
    })
    await releaseOperation(app)
    await expect(modal.getByRole('region', { name: 'Anteprima prestazione' })).toHaveCount(0)
    await expect(modal.getByRole('textbox', { name: 'Descrizione', exact: true })).toHaveValue(
      'Bozza obsoleta P16',
    )
    await expect(modal.getByRole('button', { name: 'Mostra anteprima' })).toBeDisabled()
    await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await expect(modal.getByRole('textbox', { name: 'Descrizione', exact: true })).toHaveValue(
      'Asincrona P16',
    )
    await modal.getByRole('button', { name: 'Chiudi', exact: true }).click()
    await detail.getByRole('button', { name: 'Modifica sole note' }).click()
    await modal.getByLabel('Note', { exact: true }).fill('Salvate una sola volta')
    await delayOperationResponse(app, 'services:update-notes')
    await modal.getByRole('button', { name: 'Salva note' }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      const r = await window.archives.rename({
        context: s.value.context,
        payload: { name: 'Dopo note' },
      })
      if (!r.ok) throw Error(r.error.message)
    })
    await releaseOperation(app)
    await expect(modal.getByRole('alert').filter({ hasText: 'Esito non verificato' })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Salva note' })).toBeDisabled()
    await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await expect(modal.getByLabel('Note', { exact: true })).toHaveValue('Salvate una sola volta')
    await modal.getByRole('button', { name: 'Chiudi', exact: true }).click()
    await page.getByText('Filtri prestazioni', { exact: true }).click()
    await delayOperationResponse(app, 'services:list')
    await page.getByRole('combobox', { name: 'Categoria', exact: true }).click()
    await page.getByRole('option', { name: 'Catalogo', exact: true }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await page.getByRole('combobox', { name: 'Categoria', exact: true }).click()
    await page.getByRole('option', { name: 'Libera', exact: true }).click()
    await expect(page.getByRole('cell', { name: 'Asincrona P16', exact: true })).toBeVisible()
    await releaseOperation(app)
    await expect(page.getByRole('cell', { name: 'Asincrona P16', exact: true })).toBeVisible()
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})

test('P16 ricerca: soggetti ereditati, porto e banchina, filtri vuoti e ispezione minima', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(180000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p16-search-')),
    path = join(folder, 'ricerca.ormeggi')
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await playwright._electron.launch({ ...options(), env })
    const page = await setup(app, path)
    const saved = await page.evaluate(async (ids) => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw Error('context')
      const c = await window.customers.create({
        context: state.value.context,
        payload: { businessName: 'Cliente ricerca P16' },
      })
      if (!c.ok) throw Error(c.error.message)
      const a = await window.agencies.create({
        context: c.context,
        payload: { businessName: 'Agenzia ricerca P16' },
      })
      if (!a.ok) throw Error(a.error.message)
      const pre = await window.assignments.preview({
        context: a.context,
        payload: {
          target: { kind: 'VOYAGE', id: '00000000-0000-4000-8000-000000000031' },
          specified: { customerId: c.value.id, agencyId: a.value.id },
        },
      })
      if (!pre.ok) throw Error(pre.error.message)
      const assignment = await window.assignments.confirm({
        context: pre.context,
        payload: { previewId: pre.value.previewId },
      })
      if (!assignment.ok) throw Error(assignment.error.message)
      const types = await window.catalog.list({
        context: { sessionId: assignment.context.sessionId },
        query: { search: '', status: 'ACTIVE', page: 1, pageSize: 25 },
      })
      if (!types.ok) throw Error(types.error.message)
      const service = await window.services.createCatalog({
        context: assignment.context,
        payload: {
          vesselId: ids.vesselId,
          interpretationPortId: null,
          moment: { localDateTime: '2026-05-02T13:00', selectedOffset: null },
          executionStatus: 'PLANNED',
          notes: null,
          specified: { customerId: null, agencyId: null },
          serviceTypeId: types.value.items[0].id,
        },
      })
      if (!service.ok) throw Error(service.error.message)
      const sync = await window.archives.rename({
        context: service.context,
        payload: { name: 'Ricerca soggetti ereditati P16' },
      })
      if (!sync.ok) throw Error(sync.error.message)
      return service.value
    }, ids)
    expect(saved.specified).toEqual({ customerId: null, agencyId: null })
    expect(saved.subjects.customer?.source.kind).toBe('VOYAGE')
    expect(saved.subjects.agency?.source.kind).toBe('VOYAGE')
    const cell = page.getByRole('cell', { name: 'rinforzo ormeggio', exact: true })
    await expect(cell).toBeVisible()
    await page.getByText('Filtri prestazioni', { exact: true }).click()
    const filters = page
      .locator('details')
      .filter({ has: page.locator('summary').filter({ hasText: 'Filtri prestazioni' }) })
    const pick = async (label: string, option: string | RegExp) => {
      await filters.getByRole('combobox', { name: label, exact: true }).click()
      await page.getByRole('option', { name: option, exact: typeof option === 'string' }).click()
    }
    await pick('Porto', '1 · Genova')
    await pick('Banchina (facoltativa)', '1 · Molo nord')
    await expect(page.getByText('Nessuna prestazione registrata.', { exact: true })).toBeVisible()
    await filters.getByRole('button', { name: 'Azzera filtri' }).click()
    await expect(cell).toBeVisible()
    await pick('Categoria', 'Catalogo')
    await pick('Stato prestazione', 'Prevista')
    await pick('Porto', '1 · Genova')
    await pick('Cliente effettivo', /Cliente ricerca P16$/)
    await pick('Agenzia effettiva', /Agenzia ricerca P16$/)
    await expect(cell).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await filters
      .getByRole('combobox', { name: 'Cliente effettivo', exact: true })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath('p16-filtri-minimo.png'),
      animations: 'disabled',
    })
    await pick('Categoria', 'Libera')
    await expect(page.getByText('Nessuna prestazione registrata.', { exact: true })).toBeVisible()
    await pick('Categoria', 'Catalogo')
    await expect(cell).toBeVisible()
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
