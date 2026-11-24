import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication, Page, Locator } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { TariffApi } from '../../src/shared/contracts/tariffs'
import type { OperationApi } from '../../src/shared/contracts/operations'
import {
  operationFixture,
  operationFixtureIds,
  delayOperationResponse,
  operationHeld,
  releaseOperation,
} from './operations-support'
declare const document: { documentElement: { scrollWidth: number; clientWidth: number } }
declare const window: { archives: ArchiveApi; operations: OperationApi; tariffs: TariffApi }
async function chooseVessel(page: Page, name = '1 · Stella del mare') {
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name, exact: true }).click()
}
async function start(
  page: Page,
  departure = '2026-05-03T12:00',
  arrival = '2026-05-03T13:00',
  status = 'Prevista',
) {
  if (await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Scarta bozza', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Nuovo spostamento', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('combobox', { name: 'Stato', exact: true }).click()
  await page.getByRole('option', { name: status, exact: true }).click()
  await modal.getByRole('combobox', { name: 'Porto di destinazione', exact: true }).click()
  await page.getByRole('option', { name: '1 · Genova', exact: true }).click()
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
test('P11: v11 popolato, spostamenti, MISSED, confini, banchina assente, tariffa alla partenza e persistenza offline', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(240_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p11-e2e-')),
    path = join(folder, 'v11.ormeggi')
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
    await operationFixture(app, path, 11)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    expect(readdirSync(folder).some((n) => n.includes('.prima-v17-'))).toBe(true)
    expect(await page.evaluate(() => window.archives.getState())).toMatchObject({
      ok: true,
      value: { active: { schemaVersion: 17 }, context: { revision: '42' } },
    })
    await page.evaluate(async (ids) => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw Error('state')
      const p = await window.tariffs.previewCreate({
        context: state.value.context,
        payload: {
          portId: ids.portId,
          moment: { localDateTime: '2026-05-03T12:30', selectedOffset: null },
          configurations: ['STANDARD', 'PASSENGER', 'ADM'].map((v) => ({
            vesselTypeId: v as 'STANDARD' | 'PASSENGER' | 'ADM',
            brackets: [{ upperLimit: 1600, value: '200' }],
            extraWidth: 200,
            extraValue: '5',
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
        payload: { name: 'P11 desktop' },
      })
      if (!refresh.ok) throw Error(refresh.error.message)
    }, operationFixtureIds)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await chooseVessel(page)
    await expect(page.locator('.operations-rows button')).toHaveCount(1)
    let modal = await start(page, '2026-05-03T12:00', '2026-05-03T12:00')
    await submit(modal)
    await expect(modal.getByText(/strettamente successivo/)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Riprendi bozza', exact: true })).toBeFocused()
    modal = await start(page)
    await modal.getByLabel('Sostituzione manuale della base').fill('0')
    await submit(modal)
    await expect(
      modal.getByRole('heading', { name: 'Partenza · Origine', exact: true }),
    ).toBeVisible()
    await expect(
      modal.getByRole('heading', { name: 'Arrivo · Destinazione', exact: true }),
    ).toBeVisible()
    await expect(modal.getByText('Base effettiva: 0,00 €', { exact: true })).toBeVisible()
    await expect(modal.getByText('Base calcolata: 115,00 €', { exact: false })).toBeVisible()
    await modal
      .getByRole('heading', { name: 'Partenza · Origine', exact: true })
      .scrollIntoViewIfNeeded()
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({
        path: testInfo.outputPath('spostamento-anteprima-minimo.png'),
        animations: 'disabled',
      })
    await confirm(modal)
    await expect(page.getByRole('button', { name: 'Nuovo spostamento', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await expect(
      page.getByText('Ormeggio · Banchina non specificata', { exact: true }),
    ).toHaveCount(2)
    const consult = async (at: string) => {
      await page.getByLabel('Istante UTC', { exact: true }).fill(at)
      await page.getByRole('button', { name: 'Consulta contesto', exact: true }).click()
    }
    await consult('2026-05-03T10:00')
    await expect(page.getByLabel('Contesto operativo')).toContainText('Ormeggio: stay-p10')
    await consult('2026-05-03T10:30')
    await expect(page.getByLabel('Contesto operativo')).toContainText(
      'In trasferimento: nessun ormeggio applicabile.',
    )
    await expect(page.getByLabel('Contesto operativo')).toContainText('Viaggio: voyage-p10')
    await expect(page.getByLabel('Contesto operativo')).toContainText('Visita: visit-p10')
    if (!process.env.PORTO_PACKAGED_EXE)
      await page.screenshot({
        path: testInfo.outputPath('trasferimento-minimo.png'),
        animations: 'disabled',
      })
    await consult('2026-05-03T11:00')
    await expect(page.getByLabel('Contesto operativo')).toContainText('In porto.')
    const hierarchy = await page.evaluate(async (ids) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('state')
      const r = await window.operations.stays({
        context: { sessionId: s.value.context.sessionId },
        query: { vesselId: ids.vesselId, page: 1, pageSize: 25 },
      })
      if (!r.ok) throw Error(r.error.message)
      return r.value
    }, operationFixtureIds)
    expect(hierarchy.items[0]).toMatchObject({
      id: 'voyage-p10',
      visits: [{ id: 'visit-p10', stays: [{ berthId: null }, { id: 'stay-p10' }] }],
    })
    modal = await start(page, '2026-05-03T12:30', '2026-05-03T14:00', 'Mancata')
    await submit(modal)
    await expect(modal.getByText(/trasferimento/)).toBeVisible()
    await page.keyboard.press('Escape')
    modal = await start(page, '2026-05-03T13:00', '2026-05-03T14:00', 'Mancata')
    await submit(modal)
    await expect(modal.getByText(/stesso minuto UTC/)).toBeVisible()
    await page.keyboard.press('Escape')
    modal = await start(page, '2026-05-04T12:00', '2026-05-04T13:00', 'Mancata')
    await submit(modal)
    await expect(
      modal.getByText('Nessun effetto sulle permanenze.', { exact: false }),
    ).toBeVisible()
    await confirm(modal)
    await expect(
      page.getByText('Ormeggio · Banchina non specificata', { exact: true }),
    ).toHaveCount(2)
    modal = await start(page, '2026-05-05T12:00', '2026-05-05T13:00', 'Effettuata')
    await modal.getByRole('combobox', { name: 'Banchina (facoltativa)', exact: true }).click()
    await page.getByRole('option', { name: '1 · Molo nord', exact: true }).click()
    await submit(modal)
    await confirm(modal)
    await expect(page.getByText('Ormeggio · Molo nord', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Operazioni', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Spostamento · Effettuata', exact: true }),
    ).toBeVisible()
    const workspace = await page.locator('.operations-workspace').boundingBox()
    expect(workspace!.height).toBeGreaterThanOrEqual(100)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
    if (!process.env.PORTO_PACKAGED_EXE) {
      await page.screenshot({
        path: testInfo.outputPath('spostamento-dettaglio-minimo.png'),
        animations: 'disabled',
      })
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900))
      await page.screenshot({
        path: testInfo.outputPath('spostamento-dettaglio-desktop.png'),
        animations: 'disabled',
      })
    }
    const saved = await page.evaluate(async (ids) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('state')
      const r = await window.operations.list({
        context: { sessionId: s.value.context.sessionId },
        query: { vesselId: ids.vesselId, page: 1, pageSize: 25 },
      })
      if (!r.ok) throw Error(r.error.message)
      return r.value
    }, operationFixtureIds)
    expect(saved.total).toBe(4)
    expect(saved.items[0].charges[0]).toMatchObject({
      chargeKind: 'MOVEMENT',
      economicEndpointRole: 'DEPARTURE',
      calculation: { base: '215.00' },
    })
    await page.getByRole('button', { name: 'Archivi', exact: true }).click()
    await page.getByRole('button', { name: 'Chiudi archivio', exact: true }).click()
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    expect(
      await page.evaluate(async (ids) => {
        const s = await window.archives.getState()
        if (!s.ok || !s.value.context) throw Error('state')
        const r = await window.operations.list({
          context: { sessionId: s.value.context.sessionId },
          query: { vesselId: ids.vesselId, page: 1, pageSize: 25 },
        })
        if (!r.ok) throw Error(r.error.message)
        return r.value
      }, operationFixtureIds),
    ).toEqual(saved)
    expect(errors).toEqual([])
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
test('P11 asincronia: risoluzione arrivo, query di contesto, selezione, revisione e nuova sessione', async ({
  playwright,
}) => {
  test.setTimeout(180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p11-async-')),
    path = join(folder, 'v11.ormeggi'),
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
    await operationFixture(app, path, 11)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await chooseVessel(page)
    let modal = await start(page, '2026-10-25T01:30', '2026-10-25T02:30')
    await delayOperationResponse(app, 'operations:resolve-moment')
    await modal.getByRole('button', { name: 'Verifica estremi', exact: true }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await page.keyboard.press('Escape')
    await releaseOperation(app)
    await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
    modal = page.getByRole('dialog')
    await expect(modal.getByText('Scegli l’occorrenza dell’orario.', { exact: true })).toHaveCount(
      0,
    )
    await modal.getByRole('button', { name: 'Verifica estremi', exact: true }).click()
    await expect(modal.getByText('Scegli l’occorrenza dell’orario.', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
    await modal.getByRole('button', { name: 'Scarta bozza', exact: true }).click()
    await expect(modal).toHaveCount(0)
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await page.getByLabel('Istante UTC', { exact: true }).fill('2026-05-03T10:30')
    await delayOperationResponse(app, 'operations:context-at')
    await page.getByRole('button', { name: 'Consulta contesto', exact: true }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await chooseVessel(page, '2 · Aurora')
    await releaseOperation(app)
    await expect(page.getByLabel('Contesto operativo')).toHaveCount(0)
    await page.getByRole('button', { name: 'Consulta contesto', exact: true }).click()
    await expect(page.getByLabel('Contesto operativo')).toContainText('Fuori da un viaggio.')
    await chooseVessel(page)
    modal = await start(page)
    await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('state')
      const r = await window.archives.rename({
        context: s.value.context,
        payload: { name: 'P11 nuovo nome' },
      })
      if (!r.ok) throw Error(r.error.message)
    })
    await expect(modal.getByText('Bozza obsoleta', { exact: true })).toBeVisible()
    await expect(
      modal.getByRole('button', { name: 'Verifica e mostra anteprima', exact: true }),
    ).toBeDisabled()
    await expect(modal.getByText(/cambiati|ricarica|revisione/i).first()).toBeVisible()
    await modal.getByRole('button', { name: 'Ricarica bozza', exact: true }).click()
    await submit(modal)
    await expect(
      modal.getByRole('heading', { name: 'Arrivo · Destinazione', exact: true }),
    ).toBeVisible()
    await app.evaluate(({ dialog }, copy) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: copy })
    }, copy)
    await page.evaluate(() => window.archives.saveAs())
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    await expect(modal).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Riprendi bozza', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Nuovo spostamento', exact: true }),
    ).toBeDisabled()
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
