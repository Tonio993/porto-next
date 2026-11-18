import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { OperationApi, CreateOperationDto } from '../../src/shared/contracts/operations'
import type { ServiceApi } from '../../src/shared/contracts/services'
import type { CatalogApi } from '../../src/shared/contracts/catalog'
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
  services: ServiceApi
  catalog: CatalogApi
}
let app: ElectronApplication, page: Page, folder: string
const moment = (localDateTime: string) => ({ localDateTime, selectedOffset: null })
const base = {
  vesselId: ids.vesselId,
  executionStatus: 'PLANNED' as const,
  notes: null,
  manualOverrideAmount: null,
}
const entry = (): CreateOperationDto => ({
  ...base,
  operationType: 'ENTRY',
  portId: ids.portId,
  berthId: null,
  moment: moment('2026-06-01T12:00'),
})
async function createOperation(payload: CreateOperationDto) {
  return page.evaluate(async (payload) => {
    const state = await window.archives.getState()
    if (!state.ok || !state.value.context) throw Error('context')
    const p = await window.operations.previewCreate({ context: state.value.context, payload })
    if (!p.ok) throw Error(p.error.message)
    const r = await window.operations.confirmCreate({
      context: p.context,
      payload: { previewId: p.value.previewId },
    })
    if (!r.ok) throw Error(r.error.message)
    return r.value
  }, payload)
}
async function current() {
  return page.evaluate(async () => {
    const r = await window.archives.getState()
    if (!r.ok || !r.value.context) throw Error('context')
    return r.value.context
  })
}
async function refreshWorkspace(vesselName = '1 · Stella del mare') {
  await page.reload()
  await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: vesselName, exact: true }).click()
}
async function selectOperation(type: string) {
  await page
    .getByRole('button', { name: new RegExp('^' + type + ' · Prevista') })
    .first()
    .click()
  await expect(
    page.getByRole('button', { name: 'Consuntiva operazione', exact: true }),
  ).toBeEnabled()
  await page.getByRole('button', { name: 'Consuntiva operazione', exact: true }).click()
}
async function lostReply(channel: string) {
  await app.evaluate(({ ipcMain }, channel) => {
    const handlers = (
      ipcMain as unknown as {
        _invokeHandlers: Map<
          string,
          (event: Electron.IpcMainInvokeEvent, input: unknown) => Promise<unknown>
        >
      }
    )._invokeHandlers
    const original = handlers.get(channel)!
    let lost = false
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, async (event, input) => {
      const result = await original(event, input)
      if (!lost) {
        lost = true
        throw Error('Risposta persa dopo esecuzione')
      }
      return result
    })
  }, channel)
}
test.beforeEach(async ({ playwright }) => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p17a-desktop-'))
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
  page.setDefaultTimeout(12000)
  await page.context().setOffline(true)
  const path = join(folder, 'a.ormeggi')
  await operationFixture(app, path, 16)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(path)
})
test.afterEach(async () => {
  if (app) await app.close()
  rmSync(folder, { recursive: true, force: true })
})

test('P17A: entrata effettuata, anteprima prima/dopo, errore per campo, focus e permanenze alla misura minima', async () => {
  const info = test.info()
  test.setTimeout(120000)
  await createOperation({
    ...base,
    operationType: 'EXIT',
    interpretationPortId: null,
    moment: moment('2026-05-03T12:00'),
    executionStatus: 'PERFORMED',
  })
  const op = await createOperation(entry())
  await refreshWorkspace()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
  const trigger = page.getByRole('button', { name: 'Consuntiva operazione', exact: true })
  await selectOperation('Entrata')
  const modal = page.getByRole('dialog')
  await expect(modal.getByRole('combobox', { name: 'Esito', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(modal.getByRole('combobox', { name: 'Esito', exact: true })).not.toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(modal.getByRole('combobox', { name: 'Esito', exact: true })).toBeFocused()
  await modal.getByLabel('Momento effettivo locale').fill('2026-06-01T13:00')
  await modal.getByLabel('Sostituzione manuale della base (EUR)', { exact: true }).fill('-1')
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await expect(modal.getByRole('alert')).toContainText('importo non negativo')
  await modal.getByLabel('Sostituzione manuale della base (EUR)', { exact: true }).fill('0')
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await expect(modal.getByText('Operazione consentita', { exact: true })).toBeVisible()
  await modal.getByRole('button', { name: 'Conferma modifica' }).scrollIntoViewIfNeeded()
  if (!process.env.PORTO_PACKAGED_EXE)
    await page.screenshot({ path: info.outputPath('anteprima-minimo.png') })
  await modal.getByRole('button', { name: 'Chiudi anteprima' }).click()
  await expect(modal.getByLabel('Momento effettivo locale')).toHaveValue('2026-06-01T13:00')
  await modal.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await modal.getByLabel('Momento effettivo locale').fill('2026-06-01T13:00')
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await modal.getByRole('button', { name: 'Conferma modifica' }).click()
  await expect(modal).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'Consultazione operazione', exact: true }),
  ).toBeFocused()
  const saved = await page.evaluate(async (id) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    return window.operations.get({
      context: { sessionId: s.value.context.sessionId },
      query: { id },
    })
  }, op.id)
  expect(saved).toMatchObject({
    ok: true,
    value: {
      executionStatus: 'PERFORMED',
      endpoint: { moment: { localDateTime: '2026-06-01T13:00' } },
    },
  })
  await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Permanenze derivate' })).toContainText(
    '2026-06-01T11:00:00.000Z',
  )
})

test('P17A: mancata bloccata da prestazione, poi spostamento mancato con riattribuzione FREE/CATALOG e conferma', async () => {
  const info = test.info()
  test.setTimeout(120000)
  const move = await createOperation({
    ...base,
    operationType: 'MOVEMENT',
    interpretationPortId: null,
    moment: moment('2026-06-01T12:00'),
    arrivalMoment: moment('2026-06-01T13:00'),
    destinationPortId: ids.portId,
    destinationBerthId: ids.berthId,
  })
  await page.evaluate(async (ids) => {
    let s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    const common = {
      vesselId: ids.vesselId,
      interpretationPortId: null,
      moment: { localDateTime: '2026-06-02T12:00', selectedOffset: null },
      executionStatus: 'MISSED' as const,
      notes: null,
      specified: { customerId: null, agencyId: null },
    }
    const free = await window.services.createFree({
      context: s.value.context,
      payload: { ...common, description: 'FREE da riattribuire', base: '12.34' },
    })
    if (!free.ok) throw Error(free.error.message)
    s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    const types = await window.catalog.list({
      context: { sessionId: s.value.context.sessionId },
      query: { search: '', status: 'ACTIVE', page: 1, pageSize: 25 },
    })
    if (!types.ok || !types.value.items.length) throw Error('catalog')
    const catalog = await window.services.createCatalog({
      context: s.value.context,
      payload: { ...common, serviceTypeId: types.value.items[0].id },
    })
    if (!catalog.ok) throw Error(catalog.error.message)
  }, ids)
  await refreshWorkspace()
  await selectOperation('Spostamento')
  const modal = page.getByRole('dialog')
  await modal.getByRole('combobox', { name: 'Esito', exact: true }).click()
  await page.getByRole('option', { name: 'Mancata', exact: true }).click()
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await expect(modal.getByText('Operazione consentita', { exact: true })).toBeVisible()
  await modal.getByRole('button', { name: 'Conferma modifica' }).click()
  await expect(modal).toHaveCount(0)
  expect(
    await page.evaluate(async (id) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      return window.operations.get({
        context: { sessionId: s.value.context.sessionId },
        query: { id },
      })
    }, move.id),
  ).toMatchObject({ ok: true, value: { executionStatus: 'MISSED' } })
  const exit = await createOperation({
    ...base,
    operationType: 'EXIT',
    interpretationPortId: null,
    moment: moment('2026-06-03T12:00'),
  })
  await refreshWorkspace()
  await selectOperation('Uscita')
  await modal.getByLabel('Momento effettivo locale').fill('2026-06-01T15:00')
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await expect(modal.getByText('Operazione bloccata', { exact: true })).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Conferma modifica' })).toBeDisabled()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 960))
  if (!process.env.PORTO_PACKAGED_EXE)
    await page.screenshot({ path: info.outputPath('orfana-bloccata-desktop.png') })
  await modal.getByRole('button', { name: 'Chiudi anteprima' }).click()
  await modal.getByRole('combobox', { name: 'Esito', exact: true }).click()
  await page.getByRole('option', { name: 'Mancata', exact: true }).click()
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await modal.getByRole('button', { name: 'Conferma modifica' }).click()
  await expect(modal).toHaveCount(0)
  expect(exit.executionStatus).toBe('PLANNED')
})

test('P17A: bozze obsolete, risposta ritardata e conferma persa con rilettura fallita/ritardata senza duplicazioni', async () => {
  test.setTimeout(180000)
  const exit = await createOperation({
    ...base,
    operationType: 'EXIT',
    interpretationPortId: null,
    moment: moment('2026-06-03T12:00'),
  })
  await refreshWorkspace()
  await selectOperation('Uscita')
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Note effettive').fill('Bozza conservata')
  await delayOperationResponse(app, 'operations:preview-complete')
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await expect.poll(() => operationHeld(app)).toBe(true)
  const dependency = await page.evaluate(async () => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    return window.services.createFree({
      context: s.value.context,
      payload: {
        vesselId: '00000000-0000-4000-8000-000000000012',
        interpretationPortId: null,
        moment: { localDateTime: '2026-06-01T12:00', selectedOffset: null },
        executionStatus: 'PLANNED',
        notes: null,
        description: 'Rende obsoleta',
        base: '10.00',
        specified: { customerId: null, agencyId: null },
      },
    })
  })
  await releaseOperation(app)
  await expect(modal.getByLabel('Note effettive')).toHaveValue('Bozza conservata')
  await expect(modal.getByText('Bozza obsoleta', { exact: true })).toBeVisible()
  await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
  await expect(modal.getByLabel('Note effettive')).toHaveValue('')
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await expect(modal.getByText('Operazione consentita', { exact: true })).toBeVisible()
  if (!dependency.ok) throw Error(dependency.error.message)
  const bumped = await page.evaluate(async (id) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    return window.services.updateNotes({
      context: s.value.context,
      payload: { id, notes: 'Conflitto diretto' },
    })
  }, dependency.value.id)
  expect(bumped.ok).toBe(true)
  await modal.getByRole('button', { name: 'Conferma modifica' }).click()
  await expect(modal.getByText('Bozza obsoleta', { exact: true })).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Conferma modifica' })).toBeDisabled()
  await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await expect(modal.getByText('Operazione consentita', { exact: true })).toBeVisible()
  const before = await current()
  await lostReply('operations:confirm-complete')
  await modal.getByRole('button', { name: 'Conferma modifica' }).click()
  await expect(modal.getByText('Esito non verificato', { exact: true })).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Verifica e mostra anteprima' })).toBeDisabled()
  await lostReply('operations:get')
  await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
  await expect(modal.getByRole('button', { name: 'Verifica e mostra anteprima' })).toBeDisabled()
  await delayOperationResponse(app, 'operations:get')
  await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
  await expect.poll(() => operationHeld(app)).toBe(true)
  await expect(modal.getByRole('button', { name: 'Verifica e mostra anteprima' })).toBeDisabled()
  await releaseOperation(app)
  await expect(modal).toHaveCount(0)
  const after = await current()
  expect(BigInt(after.revision)).toBe(BigInt(before.revision) + 1n)
  expect(
    await page.evaluate(async (id) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      return window.operations.get({
        context: { sessionId: s.value.context.sessionId },
        query: { id },
      })
    }, exit.id),
  ).toMatchObject({ ok: true, value: { executionStatus: 'PERFORMED' } })
  await expect(
    page.getByRole('button', { name: 'Consuntiva operazione', exact: true }),
  ).toHaveCount(0)
})

test('P17A: spostamento esterno effettuato, fusi distinti, due componenti e identità fra anteprima e conferma', async () => {
  test.setTimeout(120000)
  const path = join(folder, 'esterno.ormeggi')
  await operationFixture(app, path, 16, true)
  await page.getByRole('button', { name: 'Chiudi archivio', exact: true }).click()
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(path)
  const op = await createOperation({
    ...base,
    operationType: 'MOVEMENT',
    interpretationPortId: null,
    moment: moment('2026-06-01T12:00'),
    arrivalMoment: moment('2026-06-01T13:00'),
    destinationPortId: ids.destinationPortId,
    destinationBerthId: ids.destinationBerthId,
  })
  await refreshWorkspace('1 · Stella del mare arrivo')
  const before = await page.evaluate(async (vesselId) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    return window.operations.stays({
      context: { sessionId: s.value.context.sessionId },
      query: { vesselId, page: 1, pageSize: 25 },
    })
  }, ids.vesselId)
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 960))
  await selectOperation('Spostamento')
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Partenza effettiva locale').fill('2026-06-01T12:30')
  await modal.getByLabel('Arrivo effettivo locale').fill('2026-06-01T14:00')
  await modal.getByLabel('Sostituzione manuale della base (EUR)', { exact: true }).fill('0')
  await modal.getByLabel('Sostituzione manuale all’arrivo (EUR)', { exact: true }).fill('12,34')
  await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
  await expect(modal.getByText('Operazione consentita', { exact: true })).toBeVisible()
  await expect(modal.getByLabel('Dopo la consuntivazione')).toContainText('Europe/London')
  if (!process.env.PORTO_PACKAGED_EXE)
    await page.screenshot({ path: test.info().outputPath('esterno-prima-dopo-desktop.png') })
  await modal.getByRole('button', { name: 'Conferma modifica' }).click()
  await expect(modal).toHaveCount(0)
  const saved = await page.evaluate(async (id) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    return window.operations.get({
      context: { sessionId: s.value.context.sessionId },
      query: { id },
    })
  }, op.id)
  expect(saved).toMatchObject({
    ok: true,
    value: {
      executionStatus: 'PERFORMED',
      totalBase: '12.34',
      endpoint: { moment: { utc: '2026-06-01T10:30:00.000Z' } },
      arrival: { moment: { utc: '2026-06-01T13:00:00.000Z' } },
    },
  })
  if (!saved.ok) throw Error(saved.error.message)
  expect(saved.value.charges.map((c) => c.id)).toEqual(op.charges.map((c) => c.id))
  const after = await page.evaluate(async (vesselId) => {
    const s = await window.archives.getState()
    if (!s.ok || !s.value.context) throw Error('context')
    return window.operations.stays({
      context: { sessionId: s.value.context.sessionId },
      query: { vesselId, page: 1, pageSize: 25 },
    })
  }, ids.vesselId)
  if (!before.ok || !after.ok) throw Error('stays')
  expect(after.value.items[0].visits.map((p) => p.id)).toEqual(
    before.value.items[0].visits.map((p) => p.id),
  )
  expect(after.value.items[0].visits[1].stays[0].id).toBe(
    before.value.items[0].visits[1].stays[0].id,
  )
})
