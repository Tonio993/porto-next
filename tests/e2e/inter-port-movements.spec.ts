import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication, Page, Locator } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { OperationApi } from '../../src/shared/contracts/operations'
import type { TariffApi } from '../../src/shared/contracts/tariffs'
import {
  operationFixture,
  operationFixtureIds as ids,
  delayOperationResponse,
  operationHeld,
  releaseOperation,
} from './operations-support'
declare const window: { archives: ArchiveApi; operations: OperationApi; tariffs: TariffApi }
declare const document: { documentElement: { scrollWidth: number; clientWidth: number } }
async function vessel(page: Page, name = '1 · Stella del mare arrivo') {
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name, exact: true }).click()
}
async function start(
  page: Page,
  departure = '2026-05-03T12:00',
  arrival = '2026-05-03T11:30',
  status = 'Prevista',
) {
  await page.getByRole('button', { name: 'Nuovo spostamento', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('combobox', { name: 'Stato', exact: true }).click()
  await page.getByRole('option', { name: status, exact: true }).click()
  await modal.getByRole('combobox', { name: 'Porto di destinazione', exact: true }).click()
  await page.getByRole('option', { name: '2 · Londra', exact: true }).click()
  await modal.getByLabel('Partenza locale').fill(departure)
  await modal.getByLabel('Arrivo locale').fill(arrival)
  return modal
}
const submit = (modal: Locator) =>
  modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
async function confirm(modal: Locator) {
  await modal.getByRole('button', { name: 'Conferma modifica', exact: true }).click()
  await expect(modal).not.toBeVisible()
}
async function query(page: Page) {
  return page.evaluate(async (ids) => {
    const state = await window.archives.getState()
    if (!state.ok || !state.value.context) throw Error('state')
    const context = { sessionId: state.value.context.sessionId }
    const operations = await window.operations.list({
      context,
      query: { vesselId: ids.vesselId, page: 1, pageSize: 25 },
    })
    const stays = await window.operations.stays({
      context,
      query: { vesselId: ids.vesselId, page: 1, pageSize: 25 },
    })
    if (!operations.ok || !stays.ok) throw Error('query')
    return { operations: operations.value.items, stays: stays.value.items }
  }, ids)
}
test('P12: v12 popolato, fusi distinti, componenti autonome, contesto, identità, ricalcoli e riapertura offline', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(240_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p12-desktop-')),
    path = join(folder, 'v12.ormeggi')
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
      ...(process.env.PORTO_PACKAGED_EXE
        ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
        : { args: [resolve('out/main/index.js')] }),
      env,
    })
    const page = await app.firstWindow()
    page.setDefaultTimeout(12_000)
    await page.context().setOffline(true)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await operationFixture(app, path, 12, true)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    expect(readdirSync(folder).some((n) => n.includes('.prima-v15-'))).toBe(true)
    expect(await page.evaluate(() => window.archives.getState())).toMatchObject({
      ok: true,
      value: { active: { schemaVersion: 15 }, context: { revision: '42' } },
    })
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await vessel(page)
    let modal = await start(page, undefined, '2026-05-03T11:00')
    await submit(modal)
    await expect(modal.getByText(/strettamente successivo/)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Nuovo spostamento', exact: true })).toBeFocused()
    modal = await start(page)
    await modal.getByRole('combobox', { name: 'Banchina (facoltativa)', exact: true }).click()
    await page.getByRole('option', { name: '2 · Molo Londra', exact: true }).click()
    await modal.getByLabel('Sostituzione manuale della base').fill('0')
    await modal.getByLabel('Sostituzione manuale all’arrivo').fill('7,25')
    await submit(modal)
    await expect(modal.getByLabel('Componente EXIT', { exact: true })).toContainText(
      'Base calcolata: 230,00 €',
    )
    await expect(modal.getByLabel('Componente ENTRY', { exact: true })).toContainText(
      'Base calcolata: 200,00 €',
    )
    await expect(modal.getByText('Totale basi effettive: 7,25 €', { exact: true })).toBeVisible()
    await modal
      .getByRole('heading', { name: 'Partenza · Origine', exact: true })
      .scrollIntoViewIfNeeded()
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({
        path: testInfo.outputPath('p12-estremi-minimo.png'),
        animations: 'disabled',
      })
    await modal.getByLabel('Componente ENTRY', { exact: true }).scrollIntoViewIfNeeded()
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({
        path: testInfo.outputPath('p12-componenti-minimo.png'),
        animations: 'disabled',
      })
    await confirm(modal)
    const saved = await query(page),
      move = saved.operations[0]
    expect(move.charges.map((c) => c.chargeKind)).toEqual(['EXIT', 'ENTRY'])
    expect(move.charges[0].calculation.vesselVersionId).toBe('vv0')
    expect(move.charges[1].calculation.vesselVersionId).toBe('vv-arrival')
    expect(saved.stays[0]).toMatchObject({ id: 'voyage-p10', endedAt: null })
    expect(saved.stays[0].visits).toHaveLength(2)
    expect(saved.stays[0].visits[1]).toMatchObject({
      openingOperationId: move.id,
      portId: ids.destinationPortId,
    })
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    const consult = async (at: string) => {
      await page.getByLabel('Istante UTC', { exact: true }).fill(at)
      await page.getByRole('button', { name: 'Consulta contesto', exact: true }).click()
    }
    await consult('2026-05-03T10:00')
    await expect(page.getByLabel('Contesto operativo')).toContainText('Visita: visit-p10')
    await consult('2026-05-03T10:15')
    await expect(page.getByLabel('Contesto operativo')).toContainText(
      'nessuna visita e nessun ormeggio',
    )
    await page.getByText('Identità del contesto', { exact: true }).click()
    await expect(page.getByLabel('Contesto operativo')).toContainText('Visita: —')
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({
        path: testInfo.outputPath('p12-transito-minimo.png'),
        animations: 'disabled',
      })
    await consult('2026-05-03T10:30')
    await expect(page.getByLabel('Contesto operativo')).toContainText(saved.stays[0].visits[1].id)
    // A missed return does not create a third visit or provide a new origin.
    modal = await start(page, '2026-05-04T12:00', '2026-05-04T14:30', 'Mancata')
    await modal.getByRole('combobox', { name: 'Porto di destinazione', exact: true }).click()
    await page.getByRole('option', { name: '1 · Genova', exact: true }).click()
    await submit(modal)
    await expect(
      modal.getByText('Nessun effetto sulle permanenze.', { exact: false }),
    ).toBeVisible()
    await confirm(modal)
    expect((await query(page)).stays).toEqual(saved.stays)
    // Tariff insertion changes only arrival ENTRY, retaining both manual substitutions.
    await page.evaluate(async (ids) => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw Error('state')
      const p = await window.tariffs.previewCreate({
        context: state.value.context,
        payload: {
          portId: ids.destinationPortId,
          moment: { localDateTime: '2026-05-03T11:15', selectedOffset: null },
          configurations: ['STANDARD', 'PASSENGER', 'ADM'].map((t) => ({
            vesselTypeId: t as 'STANDARD' | 'PASSENGER' | 'ADM',
            brackets: [{ upperLimit: 1600, value: '300' }],
            extraWidth: 200,
            extraValue: '10',
          })),
        },
      })
      if (!p.ok) throw Error(p.error.message)
      const r = await window.tariffs.confirmCreate({
        context: p.context,
        payload: { previewId: p.value.previewId },
      })
      if (!r.ok) throw Error(r.error.message)
      const refresh = await window.archives.rename({
        context: r.context,
        payload: { name: 'P12 desktop' },
      })
      if (!refresh.ok) throw Error(refresh.error.message)
    }, ids)
    const recalculated = (await query(page)).operations.find((o) => o.id === move.id)!
    expect(recalculated.charges[0]).toEqual(move.charges[0])
    expect(recalculated.charges[1]).toMatchObject({
      id: move.charges[1].id,
      calculation: { base: '300.00' },
      effectiveBase: '7.25',
    })
    await page.getByRole('button', { name: 'Operazioni', exact: true }).click()
    await page.locator('.operations-rows button').filter({ hasText: '2026-05-03T12:00' }).click()
    await expect(page.getByLabel('Dettaglio operazione')).toContainText(
      'Totale basi effettive: 7,25 €',
    )
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900))
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({
        path: testInfo.outputPath('p12-dettaglio-desktop.png'),
        animations: 'disabled',
      })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
    const persisted = await query(page)
    await page.getByRole('button', { name: 'Archivi', exact: true }).click()
    await page.getByRole('button', { name: 'Chiudi archivio', exact: true }).click()
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    expect(await query(page)).toEqual(persisted)
    expect(errors).toEqual([])
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
test('P12 asincronia: arrivo in altro fuso, cambio destinazione, anteprima tardiva, revisione e Salva con nome', async ({
  playwright,
}) => {
  test.setTimeout(180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p12-async-')),
    path = join(folder, 'v12.ormeggi'),
    copy = join(folder, 'copy.ormeggi')
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  let app: ElectronApplication | undefined
  try {
    app = await playwright._electron.launch({
      ...(process.env.PORTO_PACKAGED_EXE
        ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
        : { args: [resolve('out/main/index.js')] }),
      env,
    })
    const page = await app.firstWindow()
    page.setDefaultTimeout(10_000)
    await page.context().setOffline(true)
    await operationFixture(app, path, 12, true)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await vessel(page)
    let modal = await start(page, '2026-10-25T01:30', '2026-10-25T01:30')
    await delayOperationResponse(app, 'operations:resolve-moment')
    await modal.getByRole('button', { name: 'Verifica estremi', exact: true }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await modal.getByRole('combobox', { name: 'Porto di destinazione', exact: true }).click()
    await page.getByRole('option', { name: '1 · Genova', exact: true }).click()
    await releaseOperation(app)
    await expect(modal.getByText('Scegli l’occorrenza dell’orario.', { exact: true })).toHaveCount(
      0,
    )
    await page.keyboard.press('Escape')
    modal = await start(page)
    await delayOperationResponse(app, 'operations:preview-create')
    await submit(modal)
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('state')
      const r = await window.archives.rename({
        context: s.value.context,
        payload: { name: 'P12 nuova revisione' },
      })
      if (!r.ok) throw Error(r.error.message)
    })
    await expect(modal.getByText('Bozza obsoleta', { exact: true })).toBeVisible()
    await releaseOperation(app)
    await expect(modal.getByLabel('Componente EXIT', { exact: true })).toHaveCount(0)
    await submit(modal)
    await expect(modal.getByText(/cambiati|ricarica|revisione/i).first()).toBeVisible()
    await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await submit(modal)
    await expect(modal.getByLabel('Componente ENTRY', { exact: true })).toBeVisible()
    await app.evaluate(({ dialog }, copy) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: copy })
    }, copy)
    await page.evaluate(() => window.archives.saveAs())
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    await expect(modal).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Riprendi bozza', exact: true })).toHaveCount(0)
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
