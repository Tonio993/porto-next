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
      expect(readdirSync(folder).some((n) => n.includes('.prima-v15-'))).toBe(true)
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
