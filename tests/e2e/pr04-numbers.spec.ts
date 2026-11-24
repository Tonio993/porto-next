// Prepared for K4 on the final build and the same package. Not executed in PR04.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import { operationFixture } from './operations-support'

declare const window: { archives: ArchiveApi }
let app: ElectronApplication, page: Page, folder: string
const launchOptions = () => {
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  return {
    ...(process.env.PORTO_PACKAGED_EXE
      ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
      : { args: [resolve('out/main/index.js')] }),
    env,
  }
}
test.beforeEach(async ({ playwright }) => {
  folder = mkdtempSync(join(tmpdir(), 'porto-pr04-desktop-'))
  app = await playwright._electron.launch(launchOptions())
  page = await app.firstWindow()
  await page.context().setOffline(true)
  await operationFixture(app, join(folder, 'numbers.ormeggi'), 17, true)
  await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
  await expect(page.getByTestId('archive-path')).toHaveText(join(folder, 'numbers.ormeggi'))
})
test.afterEach(async () => {
  await app?.close()
  rmSync(folder, { recursive: true, force: true })
})
async function settings(
  opener: Locator = page.getByRole('button', { name: 'Notazione numerica', exact: true }),
) {
  await opener.click()
  return page.getByRole('dialog', { name: 'Notazione numerica', exact: true })
}
async function profile(dialog: Locator, english: boolean, grouping = true) {
  await dialog.getByRole('combobox', { name: 'Separatore decimale', exact: true }).click()
  await page
    .getByRole('option', {
      name: english ? 'Punto — anglosassone' : 'Virgola — italiano',
      exact: true,
    })
    .click()
  await dialog
    .getByRole('checkbox', { name: 'Raggruppa le migliaia', exact: true })
    .setChecked(grouping)
  await expect(dialog.locator('output')).toHaveText(
    english ? (grouping ? '1,234.56' : '1234.56') : grouping ? '1.234,56' : '1234,56',
  )
  await dialog.getByRole('button', { name: 'Salva notazione', exact: true }).click()
  await expect(dialog.getByRole('status')).toHaveText('Notazione numerica salvata.')
}
async function paste(field: Locator, text: string) {
  await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), text)
  await field.focus()
  await field.press('Control+a')
  await field.press('Control+v')
}
const caret = (field: Locator) =>
  field.evaluate((element) => {
    const input = element as unknown as { selectionStart: number; selectionEnd: number }
    return [input.selectionStart, input.selectionEnd]
  })

test('PR04 preferenza locale: configurazione senza archivio, raggruppamento disattivato e rilettura al riavvio', async ({
  playwright,
}) => {
  const before = await page.evaluate(() => window.archives.getState())
  const dialog = await settings()
  await profile(dialog, true, false)
  await dialog.press('Escape')
  expect(await page.evaluate(() => window.archives.getState())).toEqual(before)
  await app.close()
  app = await playwright._electron.launch(launchOptions())
  page = await app.firstWindow()
  await page.context().setOffline(true)
  const restored = await settings()
  await expect(
    restored.getByRole('combobox', { name: 'Separatore decimale', exact: true }),
  ).toHaveValue('Punto — anglosassone')
  await expect(
    restored.getByRole('checkbox', { name: 'Raggruppa le migliaia', exact: true }),
  ).not.toBeChecked()
  await expect(restored.locator('output')).toHaveText('1234.56')
  await profile(restored, false)
})
for (const english of [false, true])
  test(`PR04 importo ${english ? 'anglosassone' : 'italiano'}: cursore, incolla, IME, undo/redo, unità fissa e bozza aperta`, async () => {
    const decimal = english ? '.' : ',',
      group = english ? ',' : '.'
    let dialog = await settings()
    await profile(dialog, english)
    await dialog.press('Escape')
    await page.getByRole('button', { name: 'Prestazioni', exact: true }).click()
    await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
    await page.getByRole('option', { name: /^1 · Stella del mare/ }).click()
    await page.getByRole('button', { name: 'Nuova prestazione libera', exact: true }).click()
    const editor = page.getByRole('dialog', { name: /prestazione libera/i })
    const amount = editor.getByLabel('Importo base EUR', { exact: true })
    await amount.fill('100')
    await amount.press('End')
    await amount.press('0')
    await expect(amount).toHaveValue(`1${group}000`)
    expect(await caret(amount)).toEqual([5, 5])
    await amount.press('Backspace')
    await expect(amount).toHaveValue('100')
    await amount.fill('1234')
    await amount.press('Home')
    await amount.press('ArrowRight')
    await amount.press('ArrowRight')
    await amount.press('9')
    await expect(amount).toHaveValue(`19${group}234`)
    expect(await caret(amount)).toEqual([2, 2])
    await amount.press('Control+z')
    await expect(amount).toHaveValue(`1${group}234`)
    await amount.press('Control+y')
    await expect(amount).toHaveValue(`19${group}234`)
    await paste(amount, `9${group}876${decimal}50`)
    await expect(amount).toHaveValue(`9${group}876${decimal}50`)
    await paste(amount, `98${group}76`)
    await expect(amount).toHaveAttribute('aria-invalid', 'true')
    await paste(amount, '-1')
    await expect(amount).toHaveAttribute('aria-invalid', 'true')
    await paste(amount, '1e3')
    await expect(amount).toHaveAttribute('aria-invalid', 'true')
    await amount.fill('')
    await amount.focus()
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.imeSetComposition', {
      text: `1234${decimal}50`,
      selectionStart: 7,
      selectionEnd: 7,
    })
    await cdp.send('Input.insertText', { text: `1234${decimal}50` })
    await expect(amount).toHaveValue(`1${group}234${decimal}50`)
    await amount.press('Control+z')
    await expect(amount).toHaveValue('')
    await amount.press('Control+y')
    await expect(amount).toHaveValue(`1${group}234${decimal}50`)
    await expect(editor.getByLabel('Unità EUR', { exact: true })).toHaveText('EUR')
    expect(await amount.inputValue()).not.toContain('EUR')
    await amount.fill(`1234${decimal}`)
    dialog = await settings(editor.getByRole('button', { name: 'Notazione numerica', exact: true }))
    await profile(dialog, !english)
    await dialog.press('Escape')
    await expect(amount).toHaveValue(`1${group}234${decimal}`)
    await expect(editor).toContainText('preferenza precedente')
    await editor.getByRole('button', { name: 'Chiudi', exact: true }).click()
    await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click()
    await expect(amount).toHaveValue(`1${group}234${decimal}`)
    await amount.focus()
    await expect(amount).toBeFocused()
    await amount.press('Shift+Tab')
    await expect(
      editor.getByRole('button', { name: 'Notazione numerica', exact: true }),
    ).toBeFocused()
  })

test('PR04 peso e intero: 256 cifre, selezioni, nessuna unità sulla nave e nessuna modifica di IMO', async () => {
  await page.getByRole('button', { name: 'Catalogo e tariffe', exact: true }).click()
  await page.getByRole('button', { name: 'Nuovo tipo', exact: true }).click()
  let editor = page.getByRole('dialog')
  const weight = editor.getByLabel('Peso iniziale', { exact: true })
  await paste(weight, `0,${'1'.repeat(255)}`)
  await expect(weight).toHaveValue(`0,${'1'.repeat(255)}`)
  await paste(weight, '1.234,5678901234567890123456789')
  await expect(weight).toHaveValue('1.234,5678901234567890123456789')
  await weight.press('Home')
  await weight.press('Shift+ArrowRight')
  await weight.press('Shift+ArrowRight')
  await weight.press('Delete')
  await expect(weight).toHaveValue('234,5678901234567890123456789')
  await weight.press('Control+z')
  await expect(weight).toHaveValue('1.234,5678901234567890123456789')
  await editor.getByRole('button', { name: 'Annulla', exact: true }).click()
  await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Scartare la bozza?', exact: true })
    .getByRole('button', { name: 'Scarta', exact: true })
    .click()
  await page.getByRole('button', { name: 'Navi', exact: true }).click()
  await page.getByRole('button', { name: 'Nuova nave', exact: true }).click()
  editor = page.getByRole('dialog')
  const size = editor.getByLabel('Dimensione', { exact: true })
  await size.fill('100')
  await size.press('End')
  await size.press('0')
  await expect(size).toHaveValue('1.000')
  await size.press('Backspace')
  await expect(size).toHaveValue('100')
  await paste(size, '9.007.199.254.740.991')
  await expect(size).toHaveValue('9.007.199.254.740.991')
  await expect(size).toHaveAttribute('inputmode', 'numeric')
  await expect(editor.getByLabel('Unità EUR', { exact: true })).toHaveCount(0)
  await editor.getByLabel('IMO', { exact: true }).fill('1.234')
  await expect(editor.getByLabel('IMO', { exact: true })).toHaveValue('1.234')
})
