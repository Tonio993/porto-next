import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { PortApi } from '../../src/shared/contracts/ports'
import type { BerthApi } from '../../src/shared/contracts/berths'
import type { CustomerApi } from '../../src/shared/contracts/customers'
import type { AgencyApi } from '../../src/shared/contracts/agencies'
import type { VesselApi } from '../../src/shared/contracts/vessels'
import type { CatalogApi } from '../../src/shared/contracts/catalog'

declare const window: {
  archives: ArchiveApi
  ports: PortApi
  berths: BerthApi
  customers: CustomerApi
  agencies: AgencyApi
  vessels: VesselApi
  catalog: CatalogApi
  innerHeight: number
}
declare const document: {
  documentElement: { scrollWidth: number; clientWidth: number; scrollHeight: number }
}

test('UI02: confronto anagrafiche e catalogo, liste e cronologie lunghe, notifiche ed effetti estesi', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(240_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-ui02-'))
  const env: Record<string, string> = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete env.ELECTRON_RUN_AS_NODE
  const app = await playwright._electron.launch({
    ...(process.env.PORTO_PACKAGED_EXE
      ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
      : { args: [resolve('out/main/index.js')] }),
    env,
  })
  try {
    const page = await app.firstWindow()
    await page.context().setOffline(true)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const phase = process.env.PORTO_UI02_BEFORE ? 'prima' : 'dopo'
    const shot = async (name: string) => {
      if (process.env.PORTO_PACKAGED_EXE) return
      const dialog = page.getByRole('dialog')
      if (await dialog.count()) await expect(dialog).toHaveCSS('opacity', '1')
      if (process.env.PORTO_UI02_SCREENSHOTS)
        mkdirSync(resolve('doc/ui02/schermate'), { recursive: true })
      await page.screenshot({
        path: process.env.PORTO_UI02_SCREENSHOTS
          ? resolve('doc/ui02/schermate', `${phase}-${name}.png`)
          : testInfo.outputPath(`${phase}-${name}.png`),
        animations: 'disabled',
      })
    }
    const fits = async () => {
      if (process.env.PORTO_UI02_BEFORE) return
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
            document.documentElement.scrollHeight <= window.innerHeight + 1,
        ),
      ).toBe(true)
      const bounds = await page.locator('.ports-workspace').boundingBox()
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
        await page.evaluate(() => window.innerHeight),
      )
      expect(
        await page.locator('.port-list-results').evaluate((node) => node.clientHeight),
      ).toBeGreaterThanOrEqual(100)
      expect(
        await page
          .locator('.port-inspector, .catalog-inspector')
          .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
      ).toBe(true)
    }
    await app.evaluate(
      ({ BrowserWindow, dialog }, path) => {
        BrowserWindow.getAllWindows()[0].setSize(960, 700)
        dialog.showSaveDialog = async () => ({ canceled: false, filePath: path })
      },
      join(folder, 'ui02.ormeggi'),
    )
    expect((await page.evaluate(() => window.archives.create('Consolidamento UI02'))).ok).toBe(true)
    await page.getByRole('button', { name: 'Riferimenti temporali', exact: true }).click()
    await page.getByRole('button', { name: 'Conferma fuso iniziale', exact: true }).click()
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    await expect(page.getByText('Nessun porto trovato.')).toBeVisible()
    const seeded = await page.evaluate(async () => {
      const context = async () => {
        const state = await window.archives.getState()
        if (!state.ok || !state.value.context) throw Error('Contesto assente')
        return state.value.context
      }
      const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
        if (!r.ok) throw Error(JSON.stringify(r.error))
        return r.value
      }
      const long =
        'Terminale marittimo internazionale per assistenza alle grandi navi e servizi portuali ' +
        'À'.repeat(100)
      let portId = '',
        customerId = ''
      for (let i = 1; i <= 28; i++) {
        const name = `${String(i).padStart(2, '0')} · ${i === 1 ? long : 'Servizi marittimi Liguria'}`
        const p = unwrap(
          await window.ports.create({
            context: await context(),
            payload: { name, locality: 'Genova', countryCode: 'IT', initialZoneId: 'Europe/Rome' },
          }),
        )
        if (i === 1) portId = p.id
        unwrap(await window.berths.create({ context: await context(), payload: { portId, name } }))
        const c = unwrap(
          await window.customers.create({
            context: await context(),
            payload: { businessName: name },
          }),
        )
        if (i === 1) customerId = c.id
        unwrap(
          await window.agencies.create({
            context: await context(),
            payload: { businessName: name },
          }),
        )
        unwrap(
          await window.vessels.create({
            context: await context(),
            payload: {
              registeredName: name,
              imoNumber: `00${i}`,
              vesselTypeId: 'STANDARD',
              size: 123456,
            },
          }),
        )
        unwrap(
          await window.catalog.create({
            context: await context(),
            payload: {
              description: name,
              initialWeight: i === 1 ? '1.' + '1234567890'.repeat(24) : '1',
            },
          }),
        )
      }
      // More than one history page; includes past, current and future descriptions.
      for (let i = 1; i <= 27; i++) {
        const ctx = await context()
        const preview = unwrap(
          await window.customers.preview({
            context: ctx,
            payload: {
              operation: 'INSERT_VERSION',
              customerId,
              businessName: `${long} · versione ${i}`,
              moment: {
                localDateTime: `${i === 27 ? '2099' : '2025'}-01-${String(i).padStart(2, '0')}T12:00`,
                selectedOffset: null,
              },
            },
          }),
        )
        unwrap(
          await window.customers.confirm({
            context: ctx,
            payload: { previewId: preview.previewId },
          }),
        )
      }
      return { portId, customerId }
    })
    expect(seeded.portId).toBeTruthy()
    // Direct fixture commands bypass useArchives.execute; publish their final context.
    expect((await page.evaluate(() => window.archives.rename('Fixture UI02 pronta'))).ok).toBe(true)
    await page.getByRole('button', { name: 'Archivi', exact: true }).click()
    await page.getByLabel('Nome dell’archivio').fill('Consolidamento UI02 verificato')
    await page.getByRole('button', { name: 'Aggiorna nome', exact: true }).click()
    await expect(page.getByText('Nome dell’archivio aggiornato.')).toBeVisible()
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    // An open success notification must leave the list and paging usable.
    await expect(page.getByRole('button', { name: /^Apri porto 01 · Terminale/ })).toBeVisible()
    await page.getByRole('button', { name: /^Apri porto 01 · Terminale/ }).click()
    await expect(page.getByRole('region', { name: 'Consultazione porto' })).toContainText('Genova')
    await shot('porti-minimo')
    await fits()
    const berths = page.getByRole('group', { name: 'Elenco banchine', exact: true })
    await expect(berths.getByRole('button', { name: /^01 ·/ })).toBeVisible()
    await berths.getByRole('button', { name: /^01 ·/ }).click()
    await expect(page.getByRole('region', { name: 'Dettaglio banchina' })).toBeVisible()
    await page.getByRole('region', { name: 'Dettaglio banchina' }).scrollIntoViewIfNeeded()
    await shot('banchine-minimo')
    await berths.getByRole('button', { name: 'Avanti', exact: true }).click()
    await expect(berths).toContainText('Pagina 2')
    for (const [section, noun] of [
      ['Clienti', 'cliente'],
      ['Agenzie', 'agenzia'],
      ['Navi', 'nave'],
    ] as const) {
      await page.getByRole('button', { name: section, exact: true }).click()
      const list = page.getByRole('group', { name: `Elenco ${section.toLowerCase()}`, exact: true })
      await expect(list.getByRole('button', { name: /^01 ·/ })).toBeVisible()
      await list.getByRole('button', { name: /^01 ·/ }).click()
      await expect(
        page.getByRole('region', { name: `Dettaglio ${noun}`, exact: true }),
      ).toBeVisible()
      await shot(`${section.toLowerCase()}-minimo`)
      await fits()
      if (section === 'Clienti') {
        const history = page.getByRole('group', { name: 'Cronologia cliente', exact: true })
        await history.getByRole('button', { name: 'Avanti', exact: true }).click()
        await expect(history).toContainText('Pagina 2')
        await history.getByRole('button', { name: 'Avanti', exact: true }).click()
        await expect(history).toContainText('Pagina 3')
        await expect(history).toContainText('Futura')
        await shot('cronologia-minimo')
      }
      await list.getByRole('button', { name: 'Avanti', exact: true }).click()
      await expect(list).toContainText('Pagina 2')
      const search = list.getByRole('textbox')
      await search.fill('nessuna corrispondenza')
      await expect(list).toContainText('Nessun elemento trovato')
      await search.fill('')
      const create = list.getByRole('button', { name: new RegExp(`Nuov[oa] ${noun}$`) })
      await create.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('dialog').getByRole('textbox').first()).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(create).toBeFocused()
    }
    await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
    const list = page.getByRole('region', { name: 'Elenco tipi di prestazione' })
    await list.getByRole('button', { name: /01 · Terminale/ }).click()
    const detail = page.getByRole('region', { name: 'Dettaglio catalogo' })
    await expect(detail.getByTestId('catalog-weight')).toContainText('1,1234567890')
    await shot('catalogo-minimo')
    await fits()
    await detail.getByRole('button', { name: 'Rinomina', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByLabel('Descrizione', { exact: true })
      .fill('Nuova descrizione ' + 'É'.repeat(180))
    await dialog.getByRole('button', { name: 'Mostra anteprima', exact: true }).click()
    await expect(dialog.getByText('Operazione consentita')).toBeVisible()
    await shot('effetti-minimo')
    const effects = dialog.getByLabel('Effetti della modifica', { exact: true })
    await effects.focus()
    await page.keyboard.press('ArrowDown')
    if (!process.env.PORTO_UI02_BEFORE)
      expect(await effects.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true)
    await dialog.getByRole('button', { name: 'Chiudi anteprima' }).click()
    await page.keyboard.press('Escape')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900))
    await shot('catalogo-desktop')
    await fits()
    await list.getByLabel('Stato', { exact: true }).click()
    await page.getByRole('option', { name: 'Disattivati', exact: true }).click()
    await expect(list).toContainText('Nessun tipo presente')
    await expect(detail.getByTestId('catalog-weight')).toBeVisible()
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    await page.getByRole('button', { name: /^Apri porto 01 · Terminale/ }).click()
    await expect(page.getByRole('region', { name: 'Consultazione porto' })).toContainText('Genova')
    await shot('porti-desktop')
    await fits()
    await page
      .getByRole('group', { name: 'Elenco banchine', exact: true })
      .getByRole('button', { name: /^01 ·/ })
      .click()
    await expect(page.getByRole('region', { name: 'Dettaglio banchina' })).toBeVisible()
    await page.getByRole('region', { name: 'Dettaglio banchina' }).scrollIntoViewIfNeeded()
    await shot('banchine-desktop')
    for (const [section, noun] of [
      ['Clienti', 'cliente'],
      ['Agenzie', 'agenzia'],
      ['Navi', 'nave'],
    ] as const) {
      await page.getByRole('button', { name: section, exact: true }).click()
      await page
        .getByRole('group', { name: `Elenco ${section.toLowerCase()}`, exact: true })
        .getByRole('button', { name: /^01 ·/ })
        .click()
      await expect(
        page.getByRole('region', { name: `Dettaglio ${noun}`, exact: true }),
      ).toBeVisible()
      await shot(`${section.toLowerCase()}-desktop`)
      await fits()
    }
    expect(errors).toEqual([])
  } finally {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
