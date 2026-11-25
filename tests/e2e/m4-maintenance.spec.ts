import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { OperationApi } from '../../src/shared/contracts/operations'
import type { ServiceApi } from '../../src/shared/contracts/services'
import type { CatalogApi } from '../../src/shared/contracts/catalog'
import {
  operationFixture,
  operationFixtureIds as ids,
  delayOperationResponse,
  operationHeld,
  releaseOperation,
} from './operations-support'

declare function requestAnimationFrame(callback: () => void): number

declare const window: {
  archives: ArchiveApi
  operations: OperationApi
  services: ServiceApi
  catalog: CatalogApi
}
let app: ElectronApplication, page: Page, folder: string
test.beforeEach(async ({ playwright }) => {
  folder = mkdtempSync(join(tmpdir(), 'porto-m4-ui-'))
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  app = await playwright._electron.launch({
    ...(process.env.PORTO_PACKAGED_EXE
      ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
      : { args: [resolve('out/main/index.js')] }),
    env,
  })
  page = await app.firstWindow()
  page.setDefaultTimeout(12_000)
  await page.context().setOffline(true)
  await operationFixture(app, join(folder, 'm4.ormeggi'), 17, true)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'm4.ormeggi'))
})
test.afterEach(async () => {
  await app?.close()
  rmSync(folder, { recursive: true, force: true })
})
const modal = () => page.getByRole('dialog')
const button = (name: string) => modal().getByRole('button', { name, exact: true })
async function confirm() {
  await expect(modal().getByText('Operazione consentita', { exact: true })).toBeVisible()
  await button('Conferma modifica').click()
}
async function operations() {
  await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: /^Stella del mare/ }).click()
}
async function selectEntry() {
  await page.getByRole('button', { name: /^Entrata · Effettuata/ }).click()
}
async function saved(id = ids.entryId) {
  return page.evaluate(async (id) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    const r = await window.operations.get({
      context: { sessionId: s.value.context.sessionId },
      query: { id },
    })
    if (!r.ok) throw Error(r.error.message)
    return r.value
  }, id)
}
async function services() {
  const result = await page.evaluate(async (ids) => {
    let s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    const types = await window.catalog.list({
      context: { sessionId: s.value.context.sessionId },
      query: { search: '', status: 'ACTIVE', page: 1, pageSize: 25 },
    })
    if (!types.ok) throw Error('types')
    const common = {
      vesselId: ids.vesselId,
      interpretationPortId: null,
      moment: { localDateTime: '2026-05-02T14:00', selectedOffset: null },
      executionStatus: 'MISSED' as const,
      notes: null,
      specified: { customerId: null, agencyId: null },
    }
    const free = await window.services.createFree({
      context: s.value.context,
      payload: { ...common, description: 'Libera M4', base: '12.34' },
    })
    if (!free.ok) throw Error(free.error.message)
    s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    const catalog = await window.services.createCatalog({
      context: s.value.context,
      payload: { ...common, serviceTypeId: types.value.items[0].id },
    })
    if (!catalog.ok) throw Error(catalog.error.message)
    return { free: free.value, catalog: catalog.value }
  }, ids)
  await page.reload()
  return result
}
async function readService(id: string) {
  return page.evaluate(async (id) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    const r = await window.services.get({
      context: { sessionId: s.value.context.sessionId },
      query: { id },
    })
    if (!r.ok) throw Error(r.error.message)
    return r.value
  }, id)
}
async function catalog() {
  await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
}
async function tariffs() {
  await catalog()
  await page.getByRole('button', { name: 'Tariffe', exact: true }).click()
  await page.getByRole('combobox', { name: 'Porto', exact: true }).click()
  await page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }).click()
  await page.locator('.port-list-item').first().click()
}
async function lostReply(channel: string) {
  await app.evaluate(({ ipcMain }, channel) => {
    const handlers = (
      ipcMain as unknown as {
        _invokeHandlers: Map<
          string,
          (e: Electron.IpcMainInvokeEvent, input: unknown) => Promise<unknown>
        >
      }
    )._invokeHandlers
    const original = handlers.get(channel)!
    let calls = 0
    const holder = globalThis as unknown as { m4Calls?: Record<string, number> }
    const counts = (holder.m4Calls ??= {})
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, async (e, input) => {
      counts[channel] = ++calls
      const r = await original(e, input)
      if (calls === 1) throw Error('Risposta persa dopo commit M4')
      return r
    })
  }, channel)
}
async function shot(name: string) {
  if (await button('Conferma modifica').count())
    await button('Conferma modifica').scrollIntoViewIfNeeded()
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  )
  const png = await app.evaluate(async ({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win.isVisible()) throw Error('La finestra di test deve restare nascosta.')
    const captured = await win.capturePage()
    if (captured.isEmpty()) throw Error('Acquisizione della finestra vuota.')
    if (win.isVisible()) throw Error('La cattura ha mostrato la finestra di test.')
    return captured.toPNG().toString('base64')
  })
  writeFileSync(test.info().outputPath(name), Buffer.from(png, 'base64'))
}

test('M4 operazioni: inserimento retroattivo, correzione, note e rimozione con servizi MISSED conservati', async () => {
  test.setTimeout(120_000)
  const svc = await services()
  await page.evaluate(async (vesselId) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    const p = await window.operations.previewCreate({
      context: s.value.context,
      payload: {
        vesselId,
        operationType: 'EXIT',
        interpretationPortId: null,
        moment: { localDateTime: '2026-05-02T18:00', selectedOffset: null },
        executionStatus: 'PERFORMED',
        notes: null,
        manualOverrideAmount: null,
      },
    })
    if (!p.ok) throw Error(p.error.message)
    const r = await window.operations.confirmCreate({
      context: p.context,
      payload: { previewId: p.value.previewId },
    })
    if (!r.ok) throw Error(r.error.message)
  }, ids.vesselId)
  await page.reload()
  await operations()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
  await page.getByRole('button', { name: 'Inserisci operazione retroattiva', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Spostamento retroattivo', exact: true }).click()
  await modal().getByLabel('Partenza locale').fill('2026-05-02T12:30')
  await modal().getByLabel('Arrivo locale').fill('2026-05-02T13:00')
  await modal().getByRole('combobox', { name: 'Porto di destinazione', exact: true }).click()
  await page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }).click()
  await modal()
    .getByLabel('Sostituzione manuale della base (EUR, facoltativa)', { exact: true })
    .fill('0')
  await button('Verifica e mostra anteprima').click()
  await shot('inserimento-retroattivo-minimo.png')
  await confirm()
  await expect(modal()).toHaveCount(0)
  const moved = await readService(svc.catalog.id)
  expect(moved.context.berthStayId).not.toBe(svc.catalog.context.berthStayId)
  await page.getByRole('button', { name: /^Spostamento · Prevista/ }).click()
  await page.getByRole('button', { name: 'Correggi operazione', exact: true }).click()
  await expect(modal().getByRole('combobox', { name: 'Esito', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(modal().getByRole('combobox', { name: 'Esito', exact: true })).not.toBeFocused()
  await modal().getByLabel('Arrivo locale').fill('2026-05-02T14:30')
  await button('Verifica e mostra anteprima').click()
  await expect(modal().getByText('Operazione bloccata', { exact: true })).toBeVisible()
  await expect(button('Conferma modifica')).toBeDisabled()
  await shot('correzione-orfani-minimo.png')
  await button('Chiudi anteprima').click()
  await modal().getByLabel('Arrivo locale').fill('2026-05-02T13:15')
  await button('Verifica e mostra anteprima').click()
  await confirm()
  await expect(modal()).toHaveCount(0)
  await page.getByRole('button', { name: 'Modifica solo note', exact: true }).click()
  await modal().getByLabel('Note', { exact: true }).fill('Correzione descrittiva à M4')
  await button('Salva note').click()
  await expect(modal()).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Consultazione operazione' })).toContainText(
    'Correzione descrittiva à M4',
  )
  await page.getByRole('button', { name: 'Elimina operazione', exact: true }).click()
  await button('Analizza eliminazione').click()
  await confirm()
  await expect(modal()).toHaveCount(0)
  expect(await readService(svc.free.id)).toEqual(svc.free)
  expect(await readService(svc.catalog.id)).toEqual(svc.catalog)
  await selectEntry()
  await page.getByRole('button', { name: 'Elimina operazione', exact: true }).click()
  await button('Analizza eliminazione').click()
  await expect(modal().getByText('Operazione bloccata', { exact: true })).toBeVisible()
  await expect(button('Conferma modifica')).toBeDisabled()
})

test('M4 tariffe: ricalcolo reale, conflitto e bozza, esito incerto, prima tariffa protetta', async () => {
  test.setTimeout(120_000)
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 960))
  const svc = await services()
  const original = await saved()
  await tariffs()
  await page.getByRole('button', { name: 'Correggi tariffa', exact: true }).click()
  await modal()
    .getByRole('tabpanel', { name: 'Nave normale', exact: true })
    .getByLabel('Valore EUR 1', { exact: true })
    .fill('200')
  await modal().press('Escape')
  await expect(modal()).toHaveCount(0)
  await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
  await expect(
    modal()
      .getByRole('tabpanel', { name: 'Nave normale', exact: true })
      .getByLabel('Valore EUR 1', { exact: true }),
  ).toHaveValue('200')
  await page.evaluate(() => window.archives.rename('Conflitto M4'))
  await expect(modal()).toContainText('Bozza obsoleta')
  await button('Ricarica contesto').click()
  await button('Mostra anteprima').click()
  await expect(modal().getByText('Operazione consentita', { exact: true })).toBeVisible()
  await page.evaluate(() => window.archives.rename('Conflitto anteprima tariffa M4'))
  await expect(modal().getByText('Anteprima obsoleta', { exact: true })).toBeVisible()
  await expect(button('Conferma modifica')).toBeDisabled()
  await button('Chiudi anteprima').click()
  await expect(
    modal()
      .getByRole('tabpanel', { name: 'Nave normale', exact: true })
      .getByLabel('Valore EUR 1', { exact: true }),
  ).toHaveValue('200')
  await button('Ricarica contesto').click()
  await button('Mostra anteprima').click()
  await expect(modal().getByText('Operazione consentita', { exact: true })).toBeVisible()
  await shot('tariffa-ricalcoli-desktop.png')
  await lostReply('tariffs:confirm-update')
  await confirm()
  await expect(modal()).toContainText('Esito non verificato')
  await button('Verifica esito della scrittura').click()
  await expect(modal()).toHaveCount(0)
  const actual = await saved()
  expect(actual.id).toBe(original.id)
  expect(actual.charges[0].id).toBe(original.charges[0].id)
  expect(actual.charges[0].calculation.base).toBe('215.00')
  expect((await readService(svc.catalog.id)).base).toBe('215.00')
  expect(await readService(svc.free.id)).toEqual(svc.free)
  await page.getByRole('button', { name: 'Copia tariffa', exact: true }).click()
  await modal().getByLabel('Decorrenza locale').fill('2026-05-02T13:00')
  await modal()
    .getByRole('tabpanel', { name: 'Nave normale', exact: true })
    .getByLabel('Valore EUR 1', { exact: true })
    .fill('300')
  await button('Mostra anteprima').click()
  await confirm()
  await expect(modal()).toHaveCount(0)
  expect((await readService(svc.catalog.id)).base).toBe('315.00')
  await page.getByRole('button', { name: 'Elimina tariffa', exact: true }).click()
  await button('Analizza eliminazione').click()
  await confirm()
  await expect(modal()).toHaveCount(0)
  expect((await readService(svc.catalog.id)).base).toBe('215.00')
  // PR01: tariff A01 and keyboard close use the same owner-managed feedback contract.
  await expect(page.getByText('Tariffe non disponibili', { exact: true })).toHaveCount(0)
  const feedback = page
    .getByRole('status')
    .filter({ hasText: 'Tariffa eliminata e calcoli aggiornati.' })
  const closeFeedback = feedback.getByRole('button', { name: 'Chiudi messaggio', exact: true })
  await closeFeedback.focus()
  await closeFeedback.press('Enter')
  await expect(feedback).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nuova tariffa', exact: true })).toBeFocused()
  await page.locator('.port-list-item').first().click()
  await page.getByRole('button', { name: 'Elimina tariffa', exact: true }).click()
  await button('Analizza eliminazione').click()
  await expect(modal().getByText('Operazione bloccata', { exact: true })).toBeVisible()
  await expect(button('Conferma modifica')).toBeDisabled()
  expect(
    await app.evaluate(
      () => (globalThis as unknown as { m4Calls: Record<string, number> }).m4Calls,
    ),
  ).toEqual({ 'tariffs:confirm-update': 1 })
})

test('M4 pesi: iniziale protetta, versioni fisse e catalogo, confini, bozze, ricalcoli e risposta persa', async () => {
  test.setTimeout(120_000)
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 960))
  const svc = await services()
  await catalog()
  await page.getByRole('button', { name: 'Cronologia pesi entrata', exact: true }).click()
  await expect(button('Elimina versione')).toBeDisabled()
  await button('Nuova versione del peso').click()
  await modal().getByLabel('Decorrenza locale').fill('2026-05-02T12:00')
  await modal().getByLabel('Peso', { exact: true }).fill('0')
  await button('Mostra anteprima').click()
  await expect(modal().getByRole('textbox', { name: 'Peso', exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(
    modal().getByRole('textbox', { name: 'Peso', exact: true }),
  ).toHaveAccessibleDescription(/maggiore di zero/)
  await modal().getByLabel('Peso', { exact: true }).fill('2')
  await modal().press('Escape')
  await expect(modal()).toHaveCount(0)
  await page.getByRole('button', { name: 'Riprendi bozza peso', exact: true }).click()
  await expect(modal().getByLabel('Peso', { exact: true })).toHaveValue('2')
  await page.evaluate(() => window.archives.rename('Conflitto pesi M4'))
  await expect(modal()).toContainText('Bozza obsoleta')
  await button('Ricarica contesto').click()
  await button('Mostra anteprima').click()
  await expect(modal().getByText('Operazione consentita', { exact: true })).toBeVisible()
  await page.evaluate(() => window.archives.rename('Conflitto anteprima peso M4'))
  await expect(modal().getByText('Anteprima obsoleta', { exact: true })).toBeVisible()
  await expect(button('Conferma modifica')).toBeDisabled()
  await button('Chiudi anteprima').click()
  await expect(modal().getByLabel('Peso', { exact: true })).toHaveValue('2')
  await button('Ricarica contesto').click()
  await button('Mostra anteprima').click()
  await lostReply('catalog:confirm-weight')
  await confirm()
  await expect(modal()).toContainText('Esito non verificato')
  await button('Verifica esito della scrittura').click()
  await expect(button('Nuova versione del peso')).toBeVisible()
  expect((await saved()).charges[0].calculation.base).toBe('230.00')
  await expect(modal().getByText('Peso 2', { exact: true })).toBeVisible()
  await shot('pesi-cronologia-desktop.png')
  await button('Correggi peso').last().click()
  await modal().getByLabel('Peso', { exact: true }).fill('3')
  await button('Mostra anteprima').click()
  await confirm()
  await expect(button('Nuova versione del peso')).toBeVisible()
  expect((await saved()).charges[0].calculation.base).toBe('345.00')
  await expect(modal().getByText('Peso 3', { exact: true })).toBeVisible()
  await button('Elimina versione').last().click()
  await button('Mostra anteprima').click()
  await confirm()
  await expect(button('Nuova versione del peso')).toBeVisible()
  expect((await saved()).charges[0].calculation.base).toBe('115.00')
  await expect(button('Correggi peso')).toHaveCount(1)
  await button('Correggi peso').click()
  await expect(modal().getByLabel('Decorrenza locale')).toHaveCount(0)
  await modal().getByLabel('Peso', { exact: true }).fill('1,25')
  await button('Mostra anteprima').click()
  await confirm()
  await expect(button('Nuova versione del peso')).toBeVisible()
  expect((await saved()).charges[0].calculation.base).toBe('143.75')
  await modal().press('Escape')
  await page
    .getByRole('button', { name: /rinforzo ormeggio/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Cronologia pesi', exact: true }).click()
  await button('Nuova versione del peso').click()
  await modal().getByLabel('Decorrenza locale').fill('2026-05-02T14:00')
  await modal().getByLabel('Peso', { exact: true }).fill('1,5')
  await button('Mostra anteprima').click()
  await confirm()
  await expect(button('Nuova versione del peso')).toBeVisible()
  expect((await readService(svc.catalog.id)).base).toBe('172.50')
  expect(await readService(svc.free.id)).toEqual(svc.free)
})

test('M4 operazioni: bozza note e correzione, risposta tardiva scartata e recupero dopo commit', async () => {
  test.setTimeout(120_000)
  await operations()
  await selectEntry()
  const before = await saved()
  await page.getByRole('button', { name: 'Correggi operazione', exact: true }).click()
  await modal().getByLabel('Momento locale').fill('2026-05-02T11:00')
  await delayOperationResponse(app, 'operations:preview-correct')
  await button('Verifica e mostra anteprima').click()
  await expect.poll(() => operationHeld(app)).toBe(true)
  await page.evaluate(() => window.archives.rename('Revisione durante risposta M4'))
  await releaseOperation(app)
  await expect(modal()).toContainText('Bozza obsoleta')
  await expect(modal().getByText('Operazione consentita', { exact: true })).toHaveCount(0)
  await button('Ricarica bozza').click()
  await modal().getByLabel('Momento locale').fill('2026-05-02T11:30')
  await button('Verifica e mostra anteprima').click()
  await expect(modal().getByText('Operazione consentita', { exact: true })).toBeVisible()
  await page.evaluate(() => window.archives.rename('Conflitto anteprima correzione M4'))
  await expect(modal().getByText('Anteprima obsoleta', { exact: true })).toBeVisible()
  await expect(button('Conferma modifica')).toBeDisabled()
  await button('Chiudi anteprima').click()
  await expect(modal().getByLabel('Momento locale')).toHaveValue('2026-05-02T11:30')
  await button('Ricarica bozza').click()
  await modal().getByLabel('Momento locale').fill('2026-05-02T11:30')
  await button('Verifica e mostra anteprima').click()
  await lostReply('operations:confirm-correct')
  await confirm()
  await expect(modal()).toContainText('Esito non verificato')
  await button('Verifica esito della scrittura').click()
  await expect(modal()).toHaveCount(0)
  const after = await saved()
  expect(after.id).toBe(before.id)
  expect(after.charges[0].id).toBe(before.charges[0].id)
  expect(after.endpoint.moment.localDateTime).toBe('2026-05-02T11:30')
  await page.getByRole('button', { name: 'Modifica solo note', exact: true }).click()
  await modal().getByLabel('Note').fill('Bozza note conservata')
  await modal().press('Escape')
  await page.getByRole('button', { name: 'Riprendi modifica note', exact: true }).click()
  await expect(modal().getByLabel('Note')).toHaveValue('Bozza note conservata')
  await page.evaluate(() => window.archives.rename('Conflitto note M4'))
  await expect(modal()).toContainText('Bozza obsoleta')
  await button('Ricarica contesto').click()
  await lostReply('operations:update-notes')
  await button('Salva note').click()
  await expect(modal()).toContainText('Esito non verificato')
  await button('Verifica esito della scrittura').click()
  await expect(modal()).toHaveCount(0)
  expect(await saved()).toEqual({ ...after, notes: 'Bozza note conservata' })
})

test('M4 operazioni: trasformazione interno/esterno, componenti ricreate e cambio nave', async () => {
  test.setTimeout(120_000)
  await operations()
  await page.getByRole('button', { name: 'Nuovo spostamento', exact: true }).click()
  await modal().getByLabel('Partenza locale').fill('2026-05-03T12:00')
  await modal().getByLabel('Arrivo locale').fill('2026-05-03T13:00')
  await modal().getByRole('combobox', { name: 'Porto di destinazione', exact: true }).click()
  await page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }).click()
  await button('Verifica e mostra anteprima').click()
  await confirm()
  await expect(modal()).toHaveCount(0)
  const initial = await page.evaluate(async (vesselId) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    const list = await window.operations.list({
      context: { sessionId: s.value.context.sessionId },
      query: { vesselId, page: 1, pageSize: 25 },
    })
    if (!list.ok) throw Error(list.error.message)
    return list.value.items.find((o) => o.operationType === 'MOVEMENT')!
  }, ids.vesselId)
  await page.getByRole('button', { name: /^Spostamento · Prevista/ }).click()
  await page.getByRole('button', { name: 'Correggi operazione', exact: true }).click()
  await modal().getByRole('combobox', { name: 'Porto di destinazione', exact: true }).click()
  await page.getByRole('option', { name: 'Londra · Londra · Regno Unito', exact: true }).click()
  await button('Verifica e mostra anteprima').click()
  await confirm()
  await expect(modal()).toHaveCount(0)
  const external = await saved(initial.id)
  expect(external.charges.map((c) => c.chargeKind).sort()).toEqual(['ENTRY', 'EXIT'])
  expect(external.charges.every((c) => !initial.charges.some((old) => old.id === c.id))).toBe(true)
  await page.getByRole('button', { name: 'Correggi operazione', exact: true }).click()
  await modal().getByRole('combobox', { name: 'Porto di destinazione', exact: true }).click()
  await page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }).click()
  await button('Verifica e mostra anteprima').click()
  await confirm()
  await expect(modal()).toHaveCount(0)
  const internal = await saved(initial.id)
  expect(internal.charges).toHaveLength(1)
  expect(internal.charges[0].id).not.toBe(initial.charges[0].id)
  await page.getByRole('button', { name: 'Elimina operazione', exact: true }).click()
  await button('Analizza eliminazione').click()
  await confirm()
  await expect(modal()).toHaveCount(0)
  await selectEntry()
  await page.getByRole('button', { name: 'Correggi operazione', exact: true }).click()
  await modal().getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: 'Aurora', exact: true }).click()
  await button('Verifica e mostra anteprima').click()
  await confirm()
  await expect(modal()).toHaveCount(0)
  expect((await saved()).vesselId).toBe(ids.secondVesselId)
})

test('M4 eliminazione: esito incerto verificato senza ripetere la scrittura', async () => {
  await operations()
  await selectEntry()
  await page.getByRole('button', { name: 'Elimina operazione', exact: true }).click()
  await button('Analizza eliminazione').click()
  await lostReply('operations:confirm-delete')
  await confirm()
  await expect(modal()).toContainText('Esito non verificato')
  await lostReply('operations:get')
  await button('Verifica esito della scrittura').click()
  await expect(modal()).toContainText('Esito non verificato')
  await expect(button('Analizza eliminazione')).toBeDisabled()
  await button('Verifica esito della scrittura').click()
  await expect(modal()).toHaveCount(0)
  await expect(page.getByText('Nessuna operazione registrata.')).toBeVisible()
  await expect(page.getByText('Consultazione non disponibile', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Modifica non disponibile', { exact: true })).toHaveCount(0)
  expect(
    await app.evaluate(
      () =>
        (globalThis as unknown as { m4Calls: Record<string, number> }).m4Calls['operations:get'],
    ),
  ).toBeGreaterThanOrEqual(2)
  expect(
    await app.evaluate(
      () =>
        (globalThis as unknown as { m4Calls: Record<string, number> }).m4Calls[
          'operations:confirm-delete'
        ],
    ),
  ).toBe(1)
})

for (const flow of ['operation', 'tariff', 'weight'] as const) {
  test(`M4 sessione: ${flow}, Salva con nome scarta bozza e risposta precedente`, async () => {
    if (flow === 'operation') {
      await operations()
      await selectEntry()
      await page.getByRole('button', { name: 'Correggi operazione', exact: true }).click()
      await modal().getByLabel('Momento locale').fill('2026-05-02T11:00')
    } else if (flow === 'tariff') {
      await tariffs()
      await page.getByRole('button', { name: 'Correggi tariffa', exact: true }).click()
    } else {
      await catalog()
      await page.getByRole('button', { name: 'Cronologia pesi entrata', exact: true }).click()
      await button('Nuova versione del peso').click()
      await modal().getByLabel('Decorrenza locale').fill('2026-05-02T11:00')
    }
    await delayOperationResponse(
      app,
      flow === 'operation'
        ? 'operations:preview-correct'
        : flow === 'tariff'
          ? 'tariffs:preview-update'
          : 'catalog:preview-weight',
    )
    await button(flow === 'operation' ? 'Verifica e mostra anteprima' : 'Mostra anteprima').click()
    await expect.poll(() => operationHeld(app)).toBe(true)
    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      },
      join(folder, 'copy.ormeggi'),
    )
    expect((await page.evaluate(() => window.archives.saveAs())).ok).toBe(true)
    await expect(modal()).toHaveCount(0)
    await releaseOperation(app)
    await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'copy.ormeggi'))
    await expect(modal()).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: /Riprendi (correzione|bozza|modifica)/ }),
    ).toHaveCount(0)
  })
}

// PR01: archive:state is held after the first revision update and before onApplied.
// Signals and renderer frames make the former race reproducible without timed sleeps.
test('PR01 eliminazione: revisione pubblicata prima della selezione, dettaglio tardivo e chiusura da tastiera', async () => {
  await operations()
  await selectEntry()
  await expect(page.getByRole('button', { name: 'Elimina operazione', exact: true })).toBeEnabled()
  await delayOperationResponse(app, 'operations:get')
  await page.getByRole('button', { name: 'Ricarica consultazione', exact: true }).click()
  await expect.poll(() => operationHeld(app)).toBe(true)
  await page.getByRole('button', { name: 'Elimina operazione', exact: true }).click()
  await button('Analizza eliminazione').click()
  await app.evaluate(({ ipcMain }) => {
    type Handler = (e: Electron.IpcMainInvokeEvent, input: unknown) => Promise<unknown>
    const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, Handler> })
      ._invokeHandlers
    const state = handlers.get('archive:state')!,
      deletion = handlers.get('operations:confirm-delete')!
    const get = handlers.get('operations:get')!
    const gate = {
      committed: false,
      states: 0,
      held: false,
      reads: 0,
      writes: 0,
      release: () => {},
    }
    ;(globalThis as unknown as { pr01Gate: typeof gate }).pr01Gate = gate
    ipcMain.removeHandler('operations:confirm-delete')
    ipcMain.handle('operations:confirm-delete', async (e, input) => {
      ++gate.writes
      const result = await deletion(e, input)
      gate.committed = true
      return result
    })
    ipcMain.removeHandler('operations:get')
    ipcMain.handle('operations:get', (e, input) => {
      if (gate.committed) ++gate.reads
      return get(e, input)
    })
    ipcMain.removeHandler('archive:state')
    ipcMain.handle('archive:state', async (e, input) => {
      const result = await state(e, input)
      if (gate.committed && ++gate.states === 2) {
        await new Promise<void>((resolve) => {
          gate.release = resolve
          gate.held = true
        })
      }
      return result
    })
  })
  await confirm()
  await expect
    .poll(() =>
      app.evaluate(() => (globalThis as unknown as { pr01Gate: { held: boolean } }).pr01Gate.held),
    )
    .toBe(true)
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  )
  expect(
    await app.evaluate(
      () => (globalThis as unknown as { pr01Gate: { reads: number } }).pr01Gate.reads,
    ),
  ).toBe(0)
  await expect(page.getByText('Consultazione non disponibile', { exact: true })).toHaveCount(0)
  await app.evaluate(() =>
    (globalThis as unknown as { pr01Gate: { release: () => void } }).pr01Gate.release(),
  )
  await expect(modal()).toHaveCount(0)
  await releaseOperation(app)
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  )
  await expect(page.getByText('Nessuna operazione registrata.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Elimina operazione', exact: true })).toHaveCount(0)
  await expect(page.getByText('Consultazione non disponibile', { exact: true })).toHaveCount(0)
  const feedback = page
    .getByRole('status')
    .filter({ hasText: 'Operazione eliminata: assenza verificata.' })
  const close = feedback.getByRole('button', { name: 'Chiudi messaggio', exact: true })
  await close.focus()
  await expect(close).toBeFocused()
  await close.press('Enter')
  await expect(feedback).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Ricarica consultazione', exact: true }),
  ).toBeFocused()
  expect(
    await app.evaluate(
      () => (globalThis as unknown as { pr01Gate: { writes: number } }).pr01Gate.writes,
    ),
  ).toBe(1)
})

test('PR01 chiudere il feedback conserva incertezza, blocco e recupero', async () => {
  await operations()
  await selectEntry()
  await page.getByRole('button', { name: 'Modifica solo note', exact: true }).click()
  await modal().getByRole('textbox', { name: 'Note', exact: true }).fill('Feedback precedente PR01')
  await button('Salva note').click()
  await expect(modal()).toHaveCount(0)
  await expect(page.getByText('Note aggiornate: esito verificato.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Elimina operazione', exact: true }).click()
  await button('Analizza eliminazione').click()
  await lostReply('operations:confirm-delete')
  await confirm()
  await expect(modal()).toContainText('Esito non verificato')
  await modal().press('Escape')
  await expect(modal()).toHaveCount(0)
  const close = page
    .getByRole('status')
    .filter({ hasText: 'Note aggiornate: esito verificato.' })
    .getByRole('button', { name: 'Chiudi messaggio', exact: true })
  await close.focus()
  await close.press('Space')
  await expect(page.getByText('Note aggiornate: esito verificato.', { exact: true })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Scarta bozza della modifica', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Riprendi eliminazione', exact: true }).click()
  await expect(modal()).toContainText('Esito non verificato')
  await expect(button('Analizza eliminazione')).toBeDisabled()
  await expect(button('Verifica esito della scrittura')).toBeEnabled()
  await button('Verifica esito della scrittura').click()
  await expect(modal()).toHaveCount(0)
  expect(
    await app.evaluate(
      () =>
        (globalThis as unknown as { m4Calls: Record<string, number> }).m4Calls[
          'operations:confirm-delete'
        ],
    ),
  ).toBe(1)
})
