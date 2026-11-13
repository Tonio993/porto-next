import { mkdtempSync, readdirSync, rmSync, mkdirSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication, Page, Locator } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { OperationApi } from '../../src/shared/contracts/operations'
import type { AssignmentApi } from '../../src/shared/contracts/assignments'
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
  operations: OperationApi
  assignments: AssignmentApi
  customers: CustomerApi
  agencies: AgencyApi
}
const options = () =>
  process.env.PORTO_PACKAGED_EXE
    ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
    : { args: [resolve('out/main/index.js')] }
async function setup(app: ElectronApplication, path: string) {
  await operationFixture(app, path, 13, true)
  await app.evaluate(({ app }, path) => {
    const module = process.getBuiltinModule('module') as typeof import('node:module')
    const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3'),
      db = new Database(path)
    // I fixture precedenti usano ID descrittivi; qui si attraversa anche l'API di assegnazione.
    db.exec(`PRAGMA foreign_keys=OFF;
      UPDATE voyages SET id='00000000-0000-4000-8000-000000000031';
      UPDATE port_calls SET id='00000000-0000-4000-8000-000000000032',voyage_id='00000000-0000-4000-8000-000000000031';
      UPDATE berth_stays SET id='00000000-0000-4000-8000-000000000033',port_call_id='00000000-0000-4000-8000-000000000032';`)
    db.close()
  }, path)
  const page = await app.firstWindow()
  page.setDefaultTimeout(12_000)
  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(path)
  const subjects = await page.evaluate(async () => {
    const state = await window.archives.getState()
    if (!state.ok || !state.value.context) throw Error('context')
    let context = state.value.context
    const result: string[] = []
    for (const [kind, businessName] of [
      ['customer', 'Cliente C'],
      ['customer', 'Cliente D'],
      ['agency', 'Agenzia A'],
      ['agency', 'Agenzia B'],
    ] as const) {
      const r =
        kind === 'customer'
          ? await window.customers.create({ context, payload: { businessName } })
          : await window.agencies.create({ context, payload: { businessName } })
      if (!r.ok) throw Error(r.error.message)
      context = r.context
      result.push(r.value.id)
    }
    await window.archives.rename({ context, payload: { name: 'P13 soggetti' } })
    return result
  })
  await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: '1 · Stella del mare arrivo', exact: true }).click()
  await expect(page.locator('.operations-rows button')).toHaveCount(1)
  return { page, subjects }
}
async function pick(page: Page, modal: Locator, label: string, name: string) {
  await modal
    .getByRole('combobox', {
      name: label + (label === 'Cliente' ? ' esplicito' : ' esplicita'),
      exact: true,
    })
    .click()
  await page.getByRole('option', { name, exact: true }).click()
}
async function commit(modal: Locator) {
  await modal.getByRole('button', { name: 'Verifica assegnazioni', exact: true }).click()
  await modal.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
  await expect(modal).not.toBeVisible()
}
async function current(page: Page) {
  return page.evaluate(async (ids) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    const r = await window.operations.list({
      context: { sessionId: s.value.context.sessionId },
      query: { vesselId: ids.vesselId, page: 1, pageSize: 25 },
    })
    if (!r.ok) throw Error(r.error.message)
    return r.value.items
  }, ids)
}
test('P13: quattro livelli, coppie autonome, rimozione, focus, migrazione v13, copie e riapertura offline', async ({
  playwright,
}) => {
  test.setTimeout(240_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p13-')),
    path = join(folder, 'a.ormeggi'),
    copy = join(folder, 'copy.ormeggi'),
    backup = join(folder, 'backup.ormeggi')
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  const app = await playwright._electron.launch({ ...options(), env })
  let closed = false
  try {
    const {
        page,
        subjects: [c, d, a, b],
      } = await setup(app, path),
      errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    expect(readdirSync(folder).some((n) => n.includes('.prima-v14-'))).toBe(true)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    const voyage = page.getByRole('button', { name: 'Assegna soggetti al viaggio', exact: true })
    await voyage.click()
    const modal = page.getByRole('dialog')
    await pick(page, modal, 'Cliente', '1 · Cliente C')
    await commit(modal)
    await page.getByRole('button', { name: 'Assegna soggetti alla visita', exact: true }).click()
    await pick(page, modal, 'Agenzia', '1 · Agenzia A')
    await commit(modal)
    const stay = page.getByRole('button', { name: 'Assegna soggetti all’ormeggio', exact: true })
    await stay.click()
    await pick(page, modal, 'Cliente', '2 · Cliente D')
    await commit(modal)
    await stay.click()
    await expect(modal.getByLabel('Soggetti effettivi')).toContainText('Cliente D')
    await page.keyboard.press('Escape')
    await expect(stay).toBeFocused()
    await page.getByRole('button', { name: 'Operazioni', exact: true }).click()
    await page.locator('.operations-rows button').click()
    const opButton = page.getByRole('button', {
      name: 'Assegna soggetti all’operazione',
      exact: true,
    })
    await opButton.click()
    await pick(page, modal, 'Agenzia', '2 · Agenzia B')
    await commit(modal)
    expect((await current(page))[0].charges[0].subjects).toMatchObject({
      customer: { id: d, source: { kind: 'BERTH_STAY' } },
      agency: { id: b, source: { kind: 'VESSEL_OPERATION' } },
    })
    await opButton.click()
    await modal.getByRole('button', { name: 'Rimuovi agenzia esplicita' }).click()
    await commit(modal)
    expect((await current(page))[0].charges[0].subjects.agency?.id).toBe(a)
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await stay.click()
    await modal.getByRole('button', { name: 'Rimuovi cliente esplicito' }).click()
    await commit(modal)
    expect((await current(page))[0].charges[0].subjects.customer?.id).toBe(c)
    // Lo spostamento usa il percorso UI P12; le assegnazioni dei nuovi elementi restano indipendenti.
    await page.getByRole('button', { name: 'Nuovo spostamento', exact: true }).click()
    await modal.getByRole('combobox', { name: 'Porto di destinazione', exact: true }).click()
    await page.getByRole('option', { name: '2 · Londra', exact: true }).click()
    await modal.getByLabel('Partenza locale').fill('2026-05-03T12:00')
    await modal.getByLabel('Arrivo locale').fill('2026-05-03T11:30')
    await modal.getByRole('button', { name: 'Verifica e mostra anteprima', exact: true }).click()
    await modal.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
    await expect(modal).not.toBeVisible()
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await page
      .getByRole('button', { name: 'Assegna soggetti alla visita', exact: true })
      .nth(1)
      .click()
    await pick(page, modal, 'Cliente', '2 · Cliente D')
    await pick(page, modal, 'Agenzia', '2 · Agenzia B')
    await commit(modal)
    const movement = (await current(page)).find((o) => o.operationType === 'MOVEMENT')!
    expect(movement.charges.map((c) => c.subjects)).toMatchObject([
      { customer: { id: c }, agency: { id: a } },
      { customer: { id: d }, agency: { id: b } },
    ])
    await page.getByRole('button', { name: 'Operazioni', exact: true }).click()
    await page.locator('.operations-rows button').first().click()
    await expect(page.getByLabel('Componente ENTRY', { exact: true })).toContainText(
      'Fonte: Visita',
    )
    await page.getByLabel('Componente ENTRY', { exact: true }).scrollIntoViewIfNeeded()
    if (!process.env.PORTO_PACKAGED_EXE) {
      mkdirSync(resolve('doc/p13/schermate'), { recursive: true })
      await page.screenshot({
        path: resolve('doc/p13/schermate/p13-componenti-minimo.png'),
        animations: 'disabled',
      })
    }
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900))
    await opButton.click()
    await expect(modal.getByLabel('Soggetti effettivi')).toHaveCount(2)
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({
        path: resolve('doc/p13/schermate/p13-assegnazioni-desktop.png'),
        animations: 'disabled',
      })
    await page.keyboard.press('Escape')
    const saved = await current(page)
    for (const [action, filePath] of [
      ['backup', backup],
      ['saveAs', copy],
    ] as const) {
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, filePath)
      expect(
        await page.evaluate(async (action) => (await window.archives[action]()).ok, action),
      ).toBe(true)
      expect(await current(page)).toEqual(saved)
    }
    await page.evaluate(() => window.archives.close())
    const transferred = join(folder, 'other-path', 'transferred.ormeggi')
    mkdirSync(join(folder, 'other-path'))
    copyFileSync(copy, transferred)
    await app.close()
    closed = true
    const other = await playwright._electron.launch({
      ...options(),
      env: { ...env, PORTO_TEST_USER_DATA: join(folder, 'other-preferences') },
    })
    try {
      const otherPage = await other.firstWindow()
      await otherPage.context().setOffline(true)
      await other.evaluate(({ dialog }, path) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
      }, transferred)
      await otherPage.getByRole('button', { name: 'Apri archivio', exact: true }).click()
      await expect(otherPage.getByTestId('archive-path')).toHaveText(transferred)
      expect(await current(otherPage)).toEqual(saved)
    } finally {
      await other.close()
    }
    expect(errors).toEqual([])
  } finally {
    if (!closed) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})

test('P13 asincronia: risposte tardive, bozze originali, conflitto, ricaricamento e nuova sessione', async ({
  playwright,
}) => {
  test.setTimeout(180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p13-async-')),
    path = join(folder, 'a.ormeggi')
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  const app = await playwright._electron.launch({ ...options(), env })
  try {
    const { page } = await setup(app, path)
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await delayOperationResponse(app, 'assignments:get')
    const voyage = page.getByRole('button', { name: 'Assegna soggetti al viaggio', exact: true })
    await voyage.click()
    await expect.poll(() => operationHeld(app)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(voyage).toBeFocused()
    await page.getByRole('button', { name: 'Assegna soggetti alla visita', exact: true }).click()
    const modal = page.getByRole('dialog')
    await expect(
      modal.getByRole('combobox', { name: 'Cliente esplicito', exact: true }),
    ).toBeVisible()
    await releaseOperation(app)
    await expect(modal.getByText('Assegnazioni · Visita', { exact: true })).toBeVisible()
    await pick(page, modal, 'Cliente', '1 · Cliente C')
    await delayOperationResponse(app, 'assignments:preview')
    await modal.getByRole('button', { name: 'Verifica assegnazioni', exact: true }).click()
    await expect.poll(() => operationHeld(app)).toBe(true)
    await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (s.ok && s.value.context)
        await window.archives.rename({
          context: s.value.context,
          payload: { name: 'Conflitto P13' },
        })
    })
    await releaseOperation(app)
    await expect(modal.getByText('Bozza obsoleta', { exact: true })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Conferma modifica', exact: true })).toHaveCount(
      0,
    )
    await expect(
      modal.getByRole('combobox', { name: 'Cliente esplicito', exact: true }),
    ).toHaveValue('1 · Cliente C')
    await modal.getByRole('button', { name: 'Ricarica assegnazioni', exact: true }).click()
    await expect(
      modal.getByRole('combobox', { name: 'Cliente esplicito', exact: true }),
    ).toHaveValue('')
    await pick(page, modal, 'Cliente', '2 · Cliente D')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Riprendi assegnazione', exact: true }).click()
    await expect(
      modal.getByRole('combobox', { name: 'Cliente esplicito', exact: true }),
    ).toHaveValue('2 · Cliente D')
    await page.keyboard.press('Escape')
    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      },
      join(folder, 'copy.ormeggi'),
    )
    expect((await page.evaluate(() => window.archives.saveAs())).ok).toBe(true)
    await expect(
      page.getByRole('button', { name: 'Riprendi assegnazione', exact: true }),
    ).toHaveCount(0)
  } finally {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
