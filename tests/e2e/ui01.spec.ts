import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { PortApi } from '../../src/shared/contracts/ports'

declare const window: {
  archives: ArchiveApi
  ports: PortApi
  document: { documentElement: { scrollWidth: number } }
  innerWidth: number
  getComputedStyle: (node: unknown) => { color: string; backgroundColor: string }
}

function contrastRatio(colors: string[]) {
  const luminance = colors
    .map((color) => {
      const rgb = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((channel) => {
          const value = channel / 255
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    })
    .sort((a, b) => b - a)
  return (luminance[0] + 0.05) / (luminance[1] + 0.05)
}

test('UI01: dimensioni, tastiera, ricerca, pagine e conferme con riferimenti reali', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(240_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-ui01-'))
  const env: Record<string, string> = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'preferences'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete env.ELECTRON_RUN_AS_NODE
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
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.context().setOffline(true)
    const shot = async (name: string) => {
      const dialog = page.getByRole('dialog')
      if (await dialog.count()) {
        await expect(dialog).toHaveCount(1)
        await expect(dialog).toHaveCSS('opacity', '1')
      }
      const path = process.env.PORTO_UI01_SCREENSHOTS
        ? resolve('doc/ui01/schermate', `dopo-${name}.png`)
        : testInfo.outputPath(`${name}.png`)
      if (process.env.PORTO_UI01_SCREENSHOTS)
        mkdirSync(resolve('doc/ui01/schermate'), { recursive: true })
      await page.screenshot({ path, animations: 'disabled' })
    }
    const noHorizontalOverflow = async () =>
      expect(
        await page.evaluate(() => window.document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await shot('archivi-minimo')
    const archive = join(folder, 'revisione.ormeggi')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, archive)
    await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).click()
    await page.getByLabel('Nome dell’archivio').fill('Revisione UI01')
    await page.getByRole('button', { name: 'Scegli posizione' }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(archive)
    await shot('archivio-aperto-minimo')
    await page.getByRole('button', { name: 'Riferimenti temporali', exact: true }).click()
    await expect(page.getByLabel('Fuso IANA aziendale')).toHaveValue('Europe/Rome')
    await shot('tempo-minimo')
    await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
    await expect(page.getByText('Nessun porto trovato.')).toBeVisible()
    await shot('porti-vuoti-minimo')
    const add = page.getByRole('button', { name: 'Nuovo porto', exact: true })
    await add.focus()
    await page.keyboard.press('Enter')
    const creation = page.getByRole('region', { name: 'Creazione porto' })
    await expect(creation.getByLabel('Nome del porto')).toBeFocused()
    await creation.getByLabel('Nome del porto').fill('Bozza conservata')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(add).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(creation.getByLabel('Nome del porto')).toHaveValue('Bozza conservata')
    await creation.getByRole('button', { name: 'Crea porto', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Chiudi creazione', exact: true })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(creation.getByRole('button', { name: 'Crea porto', exact: true })).toBeFocused()
    await creation.getByLabel('Nome del porto').fill('Porto di Genova')
    await creation.getByLabel('Località').fill('Genova')
    const submit = creation.getByRole('button', { name: 'Crea porto', exact: true })
    const readButtonContrast = async () =>
      contrastRatio(
        await submit.evaluate((node) => {
          const style = window.getComputedStyle(node)
          return [style.color, style.backgroundColor]
        }),
      )
    const contrastNormal = await readButtonContrast()
    expect(contrastNormal).toBeGreaterThanOrEqual(4.5)
    await submit.hover()
    await shot('creazione-minimo')
    const contrastHover = await readButtonContrast()
    expect(contrastHover).toBeGreaterThanOrEqual(4.5)
    await testInfo.attach('contrasto-pulsante-primario', {
      body: JSON.stringify({ normal: contrastNormal, hover: contrastHover }),
      contentType: 'application/json',
    })
    await creation.getByLabel('Fuso IANA del porto').fill('+01:00')
    await creation.getByRole('button', { name: 'Crea porto', exact: true }).click()
    await expect(creation.getByLabel('Fuso IANA del porto')).toHaveAttribute('aria-invalid', 'true')
    await shot('errore-campo-minimo')
    await creation.getByLabel('Fuso IANA del porto').fill('Europe/Rome')
    await creation.getByRole('button', { name: 'Crea porto', exact: true }).click()
    const detail = page.getByRole('region', { name: 'Dettaglio porto' })
    await expect(detail).toContainText('Porto 1 · Porto di Genova')
    const portId = await page.evaluate(async () => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw new Error('Contesto assente')
      const list = await window.ports.list({
        context: { sessionId: state.value.context.sessionId },
        query: { page: 1, pageSize: 25, search: '' },
      })
      if (!list.ok) throw new Error(list.error.message)
      const id = list.value.items[0].id
      for (const [name, localDateTime] of [
        ['Porto di Genova attuale', '2026-01-01T10:00'],
        ['Porto di Genova futuro', '2027-01-01T10:00'],
      ]) {
        const current = await window.archives.getState()
        if (!current.ok || !current.value.context) throw new Error('Contesto assente')
        const preview = await window.ports.previewInsertVersion({
          context: current.value.context,
          payload: {
            portId: id,
            name,
            locality: 'Genova',
            countryCode: 'IT',
            moment: { localDateTime, selectedOffset: null },
          },
        })
        if (!preview.ok) throw new Error(preview.error.message)
        const result = await window.ports.confirmInsertVersion({
          context: preview.context,
          payload: { previewId: preview.value.previewId },
        })
        if (!result.ok) throw new Error(result.error.message)
      }
      for (let number = 2; number <= 28; number++) {
        const current = await window.archives.getState()
        if (!current.ok || !current.value.context) throw new Error('Contesto assente')
        const result = await window.ports.create({
          context: current.value.context,
          payload: {
            name:
              number === 2
                ? 'Porto con denominazione estesa per verificare la leggibilità della selezione e del dettaglio'
                : `Porto ${number}`,
            locality: 'Località di prova',
            countryCode: 'IT',
            initialZoneId: 'Europe/Rome',
          },
        })
        if (!result.ok) throw new Error(result.error.message)
      }
      await window.archives.rename('Revisione UI01 · 28 porti')
      return id
    })
    const list = page.getByRole('region', { name: 'Elenco porti' })
    await expect(list).toContainText('28 porti')
    await list.getByRole('button', { name: 'Successiva', exact: true }).click()
    await expect(list).toContainText('Pagina 2')
    await expect(list.getByRole('button', { name: 'Apri porto 28', exact: true })).toBeVisible()
    await shot('pagina2-minimo')
    await list.getByRole('button', { name: 'Precedente', exact: true }).click()
    await list.getByLabel('Cerca porto').fill('Genova')
    await expect(list).toContainText('1 porto')
    await list.getByRole('button', { name: 'Apri porto 1', exact: true }).click()
    const history = page.getByRole('region', { name: 'Cronologia porto' })
    await expect(history).toContainText('Storica')
    await expect(history).toContainText('Corrente')
    await expect(history).toContainText('Futura')
    await list.getByRole('button', { name: 'Apri porto 1', exact: true }).click()
    await expect(history).toContainText('Corrente')
    await page.getByRole('button', { name: 'Chiudi messaggio', exact: true }).click()
    await noHorizontalOverflow()
    await shot('porti-minimo')
    await history
      .getByRole('article', { name: 'Versione iniziale', exact: true })
      .scrollIntoViewIfNeeded()
    await shot('cronologia-storica-minimo')
    await history
      .getByRole('article')
      .filter({ hasText: 'Versione con decorrenza · Futura' })
      .scrollIntoViewIfNeeded()
    await shot('cronologia-minimo')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900))
    await detail.scrollIntoViewIfNeeded()
    await noHorizontalOverflow()
    await shot('porti-desktop')
    await history
      .getByRole('article')
      .filter({ hasText: 'Versione con decorrenza · Futura' })
      .scrollIntoViewIfNeeded()
    await shot('cronologia-desktop')
    await list.getByLabel('Cerca porto').fill('inesistente')
    await expect(page.getByText('Nessun porto trovato.')).toBeVisible()
    await expect(detail).toContainText('Genova attuale')
    await list.getByLabel('Cerca porto').fill('')
    await list.getByRole('button', { name: 'Apri porto 2', exact: true }).click()
    await expect(detail).toContainText('denominazione estesa')
    await noHorizontalOverflow()
    await shot('testo-lungo-desktop')
    await list.getByRole('button', { name: 'Apri porto 1', exact: true }).click()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 700))
    await detail.getByRole('button', { name: 'Nuova versione', exact: true }).click()
    const editor = page.getByRole('region', { name: 'Editor versione' })
    await editor.getByLabel('Nome del porto').fill('Porto di Genova nuova versione')
    await editor.getByLabel('Decorrenza locale').fill('2028-01-01T10:00')
    await shot('editor-minimo')
    await editor.getByRole('button', { name: 'Anteprima versione' }).click()
    const preview = page.getByRole('region', { name: 'Anteprima modifica' })
    await expect(preview).toContainText('Operazione consentita')
    await shot('anteprima-pronta-minimo')
    await page.evaluate(() => window.archives.rename('Revisione UI01 aggiornata'))
    await expect(preview).toContainText('Anteprima obsoleta')
    await expect(preview.getByRole('button', { name: 'Conferma modifica' })).toBeDisabled()
    await shot('anteprima-obsoleta-minimo')
    await preview.getByRole('button', { name: 'Chiudi anteprima' }).click()
    await expect(editor.getByLabel('Nome del porto')).toHaveValue('Porto di Genova nuova versione')
    await expect(editor.getByLabel('Nome del porto')).toBeFocused()
    await editor.getByRole('button', { name: 'Annulla modifica' }).click()
    await expect(detail.getByRole('button', { name: 'Nuova versione', exact: true })).toBeFocused()
    // A real FK in the isolated test archive exercises the production blocker analysis.
    await app.evaluate(
      (_, paths) => {
        const load = process.getBuiltinModule('module').createRequire(paths.entry)
        const Database = load('better-sqlite3') as new (path: string) => {
          exec: (sql: string) => void
          prepare: (sql: string) => { run: (id: string) => void }
          close: () => void
        }
        const db = new Database(paths.archive)
        db.exec('CREATE TABLE ui01_references (port_id TEXT REFERENCES ports(id))')
        db.prepare('INSERT INTO ui01_references(port_id) VALUES (?)').run(paths.portId)
        db.close()
      },
      { entry: resolve('package.json'), archive, portId },
    )
    await detail.getByRole('button', { name: 'Elimina porto', exact: true }).click()
    await expect(preview).toContainText('Operazione bloccata')
    await expect(preview.getByRole('button', { name: 'Conferma modifica' })).toBeDisabled()
    await shot('anteprima-bloccata-minimo')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(detail.getByRole('button', { name: 'Elimina porto', exact: true })).toBeFocused()
    await add.click()
    await creation.getByLabel('Nome del porto').fill('Bozza altra sessione')
    await page.evaluate(() => window.archives.close())
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Anagrafiche', exact: true })).toBeDisabled()
    expect(errors).toEqual([])
  } finally {
    await app?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
