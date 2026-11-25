// Prepared for K4; never executed in PR07.
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { PortApi } from '../../src/shared/contracts/ports'
import type { BerthApi } from '../../src/shared/contracts/berths'
import type { CustomerApi } from '../../src/shared/contracts/customers'
import type { AgencyApi } from '../../src/shared/contracts/agencies'
import type { OperationApi } from '../../src/shared/contracts/operations'
import type { AssignmentApi } from '../../src/shared/contracts/assignments'
import type { ServiceApi } from '../../src/shared/contracts/services'
declare const window: {
  archives: ArchiveApi
  ports: PortApi
  berths: BerthApi
  customers: CustomerApi
  agencies: AgencyApi
  operations: OperationApi
  assignments: AssignmentApi
  services: ServiceApi
}
import { test, expect, type ElectronApplication, type Page, type Locator } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { operationFixture, operationFixtureIds as ids } from './operations-support'
let app: ElectronApplication, page: Page, folder: string
const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
const navigate = (name: string) =>
  page
    .getByRole('navigation', { name: 'Navigazione principale' })
    .getByRole('button', { name, exact: true })
    .click()
async function expand(scope: Locator) {
  for (const summary of await scope.locator('details > summary').all()) {
    if (!(await summary.locator('..').getAttribute('open'))) await summary.click()
  }
}
test.beforeEach(async ({ playwright }) => {
  folder = mkdtempSync(join(tmpdir(), 'porto-pr07-desktop-'))
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
  await page.context().setOffline(true)
  await operationFixture(app, join(folder, 'pr07.ormeggi'), 17)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'pr07.ormeggi'))
  await page.evaluate(async (ids) => {
    const context = async () => {
      const r = await window.archives.getState()
      if (!r.ok || !r.value.context) throw Error('contesto')
      return r.value.context
    }
    const value = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
      if (!r.ok) throw Error(JSON.stringify(r.error))
      return r.value
    }
    const other = value(
      await window.ports.create({
        context: await context(),
        payload: {
          name: 'Genova',
          locality: 'Savona',
          countryCode: 'IT',
          initialZoneId: 'Europe/Rome',
        },
      }),
    )
    value(
      await window.berths.create({
        context: await context(),
        payload: { portId: other.id, name: 'Molo nord' },
      }),
    )
    const customer = value(
      await window.customers.create({
        context: await context(),
        payload: { businessName: 'Cliente PR07' },
      }),
    )
    value(
      await window.agencies.create({
        context: await context(),
        payload: { businessName: 'Agenzia PR07' },
      }),
    )
    const op = value(
      await window.operations.previewCreate({
        context: await context(),
        payload: {
          operationType: 'ENTRY',
          vesselId: ids.secondVesselId,
          portId: ids.portId,
          berthId: ids.berthId,
          moment: { localDateTime: '2026-05-03T12:00', selectedOffset: null },
          executionStatus: 'PERFORMED',
          notes: 'Entrata PR07',
          manualOverrideAmount: null,
        },
      }),
    )
    value(
      await window.operations.confirmCreate({
        context: op.context,
        payload: { previewId: op.previewId },
      }),
    )
    const stays = value(
      await window.operations.stays({
        context: { sessionId: (await context()).sessionId },
        query: { vesselId: ids.secondVesselId, page: 1, pageSize: 25 },
      }),
    )
    const a = value(
      await window.assignments.preview({
        context: await context(),
        payload: {
          target: { kind: 'VOYAGE', id: stays.items[0].id },
          specified: { customerId: customer.id, agencyId: null },
        },
      }),
    )
    value(
      await window.assignments.confirm({ context: a.context, payload: { previewId: a.previewId } }),
    )
    value(
      await window.services.createFree({
        context: await context(),
        payload: {
          vesselId: ids.secondVesselId,
          interpretationPortId: null,
          moment: { localDateTime: '2026-05-03T13:00', selectedOffset: null },
          executionStatus: 'PLANNED',
          description: 'Assistenza PR07',
          base: '1234.56',
          notes: null,
          specified: { customerId: null, agencyId: null },
        },
      }),
    )
    await window.archives.rename('PR07 pronto')
  }, ids)
})
test.afterEach(async () => {
  await app?.close()
  rmSync(folder, { recursive: true, force: true })
})
test('PR07 cinque liste, titoli e picker: nomi principali, omonimi e attributi secondari', async () => {
  await navigate('Anagrafiche')
  const list = page.getByRole('region', { name: 'Elenco porti' })
  await expect(
    list.getByRole('button', { name: 'Apri porto Genova · Genova · Italia', exact: true }),
  ).toBeVisible()
  await expect(
    list.getByRole('button', { name: 'Apri porto Genova · Savona · Italia', exact: true }),
  ).toBeVisible()
  await list
    .getByRole('button', { name: 'Apri porto Genova · Genova · Italia', exact: true })
    .click()
  await expect(
    page
      .getByRole('region', { name: 'Dettaglio porto' })
      .getByRole('heading', { name: 'Genova', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('region', { name: 'Banchine', exact: true })
    .getByRole('button', { name: /^Molo nord/ })
    .click()
  await expect(
    page
      .getByRole('region', { name: 'Dettaglio banchina' })
      .getByRole('heading', { name: 'Molo nord', exact: true }),
  ).toBeVisible()
  for (const [tab, name, detail] of [
    ['Clienti', 'Cliente PR07', 'Dettaglio cliente'],
    ['Agenzie', 'Agenzia PR07', 'Dettaglio agenzia'],
    ['Navi', 'Aurora', 'Dettaglio nave'],
  ]) {
    await page.getByRole('button', { name: tab, exact: true }).click()
    await page.getByRole('button', { name: new RegExp('^' + name) }).click()
    await expect(
      page.getByRole('region', { name: detail }).getByRole('heading', { name, exact: true }),
    ).toBeVisible()
  }
  await navigate('Operazioni nave')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: 'Aurora', exact: true }).click()
  await page.getByRole('button', { name: 'Nuova entrata', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nuova entrata', exact: true })
  await dialog.getByRole('combobox', { name: 'Porto', exact: true }).click()
  await expect(
    page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('option', { name: 'Genova · Savona · Italia', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
})
test('PR07 operazione, soggetti e permanenze espanse: riferimenti identificabili e nessun UUID', async () => {
  await navigate('Operazioni nave')
  await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
  await page.getByRole('option', { name: 'Aurora', exact: true }).click()
  await page.getByRole('button', { name: /Entrata.*Effettuata/ }).click()
  const detail = page.getByRole('region', { name: 'Dettaglio operazione' })
  await expand(detail)
  await expect(detail).toContainText('Aurora')
  await expect(detail).toContainText('Cliente PR07')
  await expect(detail).toContainText('Viaggio')
  await expect(detail).toContainText('Molo nord')
  await expect(detail).not.toContainText(uuid)
  await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
  const stays = page.getByRole('region', { name: 'Permanenze derivate' })
  await expand(stays)
  await expect(stays).toContainText('Aurora')
  await expect(stays).toContainText('Molo nord')
  await expect(stays).toContainText('Apertura:')
  await expect(stays).not.toContainText(uuid)
})
test('PR07 dettaglio prestazione e confronto prima/dopo, soggetti e tuple espansi', async () => {
  await navigate('Prestazioni')
  await page
    .getByRole('row')
    .filter({ hasText: 'Assistenza PR07' })
    .getByRole('button', { name: 'Apri prestazione', exact: true })
    .click()
  const detail = page.getByRole('region', { name: 'Dettaglio prestazione' })
  await expand(detail)
  await expect(detail).toContainText('Aurora')
  await expect(detail).toContainText('Cliente PR07')
  await expect(detail).toContainText('Viaggio')
  await expect(detail).not.toContainText(uuid)
  await detail.getByRole('button', { name: 'Modifica prestazione', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Descrizione', { exact: true }).fill('Assistenza PR07 corretta')
  await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
  const preview = dialog.getByRole('region', { name: 'Anteprima prestazione' })
  await expand(preview)
  await expect(preview).toContainText('Descrizione')
  await expect(preview).toContainText('Cliente PR07')
  await expect(preview).toContainText('Europe/Rome')
  await expect(preview).not.toContainText(uuid)
})
