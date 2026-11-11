import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { CustomerApi } from '../../src/shared/contracts/customers'
import type { AgencyApi } from '../../src/shared/contracts/agencies'
import type { TimeApi } from '../../src/shared/contracts/values'

declare const window: {
  archives: ArchiveApi
  customers: CustomerApi
  agencies: AgencyApi
  time: TimeApi
}
declare const document: { documentElement: { scrollWidth: number; clientWidth: number } }

for (const [kind, plural, singular, newLabel] of [
  ['customers', 'Clienti', 'cliente', 'Nuovo cliente'],
  ['agencies', 'Agenzie', 'agenzia', 'Nuova agenzia'],
] as const) {
  test(`P06 ${plural}: migrazione, ciclo di vita, bozze, copie e riavvio offline`, async ({
    playwright,
  }, testInfo) => {
    test.setTimeout(300_000)
    const folder = mkdtempSync(join(tmpdir(), 'porto-p06-desktop-'))
    const path = join(folder, 'originale.ormeggi')
    const copy = join(folder, 'copia.ormeggi')
    const packaged = process.env.PORTO_PACKAGED_EXE
    const options = packaged
      ? { executablePath: packaged, args: [] }
      : { args: [resolve('out/main/index.js')] }
    const env = {
      ...process.env,
      PORTO_TEST_USER_DATA: join(folder, 'preferences'),
      PORTO_TEST_HIDDEN: '1',
      TZ: 'America/New_York',
    }
    delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
    let app: ElectronApplication | undefined
    try {
      app = await playwright._electron.launch({ ...options, env })
      let page = await app.firstWindow()
      page.setDefaultTimeout(10_000)
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.context().setOffline(true)
      const shot = async (name: string) => {
        if (packaged) return
        const dialog = page.getByRole('dialog')
        if (
          [
            'creazione.png',
            'anteprima.png',
            'anteprima-obsoleta.png',
            'anteprima-bloccata.png',
          ].includes(name)
        ) {
          await expect(dialog).toHaveCount(1)
          await expect(dialog).toHaveCSS('opacity', '1')
        } else await expect(dialog).toHaveCount(0)
        await page.screenshot({ path: testInfo.outputPath(name), animations: 'disabled' })
      }
      const migrations = readdirSync('migrations')
        .filter((n) => /^000[1-6]_/.test(n))
        .sort()
        .map((n) => readFileSync(join('migrations', n), 'utf8'))
      await app.evaluate(
        ({ app, dialog }, { path, migrations }) => {
          const module = process.getBuiltinModule('module') as typeof import('node:module')
          const Database = module.createRequire(app.getAppPath() + '/package.json')(
            'better-sqlite3',
          )
          const db = new Database(path)
          try {
            for (const sql of migrations) db.exec(sql)
            db.pragma('application_id = 0x504f5254')
            db.pragma('user_version = 6')
            db.exec(
              "INSERT INTO archive_metadata VALUES (1,'00000000-0000-4000-8000-000000000001','P06 v6','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z',0)",
            )
          } finally {
            db.close()
          }
          dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
        },
        { path, migrations },
      )
      await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
      await expect(page.getByTestId('archive-path')).toHaveText(path)
      expect(await page.evaluate(() => window.archives.getState())).toMatchObject({
        ok: true,
        value: { active: { schemaVersion: 7 } },
      })
      expect(readdirSync(folder).some((n) => n.includes('.prima-v7-'))).toBe(true)
      await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
      await page.getByRole('button', { name: plural, exact: true }).click()
      const creation = page.getByRole('dialog', { name: newLabel, exact: true })
      const create = page.getByRole('button', { name: newLabel, exact: true })
      const detail = page.getByRole('region', { name: `Dettaglio ${singular}`, exact: true })
      const history = page.getByRole('group', { name: `Cronologia ${singular}`, exact: true })
      const list = page.getByRole('group', { name: `Elenco ${plural.toLowerCase()}`, exact: true })
      const preview = page.getByRole('region', { name: 'Anteprima modifica' })
      const confirm = preview.getByRole('button', { name: 'Conferma modifica' })
      await expect(page.getByText(/Nessun elemento trovato/)).toBeVisible()
      if (!packaged) await shot('vuoto.png')
      await create.click()
      await expect(creation.getByLabel('Ragione sociale')).toBeFocused()
      await creation.getByLabel('Ragione sociale').fill('Società Àlfa')
      if (!packaged) await shot('creazione.png')
      await creation.getByRole('button', { name: 'Annulla inserimento' }).click()
      await expect(create).toBeFocused()
      await create.click()
      await expect(creation.getByLabel('Ragione sociale')).toHaveValue('Società Àlfa')
      // A background write must leave the original revision attached to the draft.
      await page.evaluate(() => window.archives.rename('Revisione successiva'))
      await expect(creation.getByText('Bozza da aggiornare')).toBeVisible()
      await creation.getByRole('button', { name: `Crea ${singular}`, exact: true }).click()
      await expect(creation.getByText(/dati.*cambiati|modificat|revision/i).first()).toBeVisible()
      await creation.getByRole('button', { name: 'Ricarica dati' }).click()
      await creation.getByRole('button', { name: `Crea ${singular}`, exact: true }).click()
      await expect(detail).toContainText('1 · Società Àlfa')
      await expect(create).toBeFocused()
      await create.click()
      await creation.getByLabel('Ragione sociale').fill('SOCIETA\u0300 A\u0300LFA')
      await creation.getByRole('button', { name: `Crea ${singular}`, exact: true }).click()
      await expect(
        creation.getByText('Ragione sociale già riservata in questa anagrafica.'),
      ).toBeVisible()
      await creation.getByRole('button', { name: 'Annulla inserimento' }).click()

      const add = detail.getByRole('button', { name: `Nuova versione ${singular}`, exact: true })
      const editor = page.getByRole('dialog', { name: `Nuova versione ${singular}`, exact: true })
      await add.click()
      await editor.getByLabel('Ragione sociale').fill('Futura')
      await editor.getByLabel('Decorrenza locale').fill('2090-01-01T10:00')
      await editor.getByRole('button', { name: 'Verifica decorrenza' }).click()
      await expect(editor.getByText(/Conferma prima il fuso aziendale/)).toBeVisible()
      await editor.getByRole('button', { name: 'Annulla modifica' }).click()
      await page.getByRole('button', { name: 'Riferimenti temporali', exact: true }).click()
      await page.getByRole('button', { name: 'Conferma fuso iniziale', exact: true }).click()
      await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
      await page.getByRole('button', { name: plural, exact: true }).click()
      await list.getByRole('button', { name: /Società Àlfa/ }).click()
      await add.click()
      await editor.getByLabel('Ragione sociale').fill('Futura')
      await editor.getByLabel('Decorrenza locale').fill('2026-03-29T02:30')
      await editor.getByRole('button', { name: 'Verifica decorrenza' }).click()
      await expect(editor.getByText(/non esiste/)).toBeVisible()
      await editor.getByLabel('Decorrenza locale').fill('2026-10-25T02:30')
      await editor.getByRole('button', { name: 'Verifica decorrenza' }).click()
      await expect(editor.getByText('Scegli l’occorrenza della decorrenza.')).toBeVisible()
      await editor.getByLabel('Decorrenza locale').fill('2090-01-01T10:00')
      await editor.getByRole('button', { name: 'Verifica decorrenza' }).click()
      await expect(editor.getByText('Offset scelto: +01:00')).toBeVisible()
      await editor.getByRole('button', { name: 'Anteprima versione' }).click()
      await expect(preview).toContainText('Ragione sociale')
      if (!packaged) await shot('anteprima.png')
      await confirm.click()
      await expect(add).toBeFocused()
      const future = history.getByRole('article').filter({ hasText: 'Futura' })
      await expect(future).toContainText('2090-01-01T09:00:00.000Z')
      await future.scrollIntoViewIfNeeded()
      if (!packaged) await shot('cronologia-futura.png')
      await future.getByRole('button', { name: 'Correggi versione' }).click()
      const correction = page.getByRole('dialog', { name: `Correggi versione ${singular}` })
      await correction.getByLabel('Ragione sociale').fill('Futura corretta')
      await correction.getByRole('button', { name: 'Anteprima versione' }).click()
      await page.evaluate(() => window.archives.rename('Anteprima obsoleta'))
      await expect(preview.getByText('Anteprima obsoleta')).toBeVisible()
      await expect(confirm).toBeDisabled()
      if (!packaged) await shot('anteprima-obsoleta.png')
      await preview.getByRole('button', { name: 'Chiudi anteprima' }).click()
      await expect(correction.getByLabel('Ragione sociale')).toHaveValue('Futura corretta')
      await expect(correction.getByText('Bozza precedente ai dati attuali')).toBeVisible()
      await correction.getByRole('button', { name: 'Annulla modifica' }).click()
      await future.getByRole('button', { name: 'Correggi versione' }).click()
      await correction.getByLabel('Ragione sociale').fill('Futura corretta')
      await correction.getByRole('button', { name: 'Anteprima versione' }).click()
      await confirm.click()
      await expect(future).toContainText('Futura corretta')
      await future.getByRole('button', { name: 'Elimina versione' }).click()
      await confirm.click()
      await expect(future).toHaveCount(0)
      await page.getByLabel('Cerca ragione sociale o codice').fill('futura')
      await expect(list.getByRole('button', { name: /Società Àlfa/ })).toBeVisible()
      await page.getByLabel('Cerca ragione sociale o codice').fill('nessun risultato')
      await expect(page.getByText(/Nessun elemento trovato/)).toBeVisible()
      await page.getByLabel('Cerca ragione sociale o codice').fill('')
      await detail.getByRole('button', { name: `Disattiva ${singular}`, exact: true }).click()
      await confirm.click()
      await expect(detail).toContainText('Non selezionabile per nuovi riferimenti')
      await detail.getByRole('button', { name: `Riattiva ${singular}`, exact: true }).click()
      await expect(detail).not.toContainText('Non selezionabile')

      // Fill the second page via the same guarded API, then verify UI pagination and independent roles.
      const saved = await page.evaluate(async (kind) => {
        const state = await window.archives.getState()
        if (!state.ok || !state.value.context) throw new Error('No context')
        let context = state.value.context
        const first = await window[kind].list({
          context: { sessionId: context.sessionId },
          query: { search: '', page: 1, pageSize: 10, selectableOnly: false },
        })
        if (!first.ok) throw new Error(first.error.message)
        for (let i = 0; i < 10; i++) {
          const r = await window[kind].create({
            context,
            payload: {
              businessName:
                i === 0 ? 'Società di navigazione ' + 'internazionale '.repeat(11) : 'Società ' + i,
            },
          })
          if (!r.ok) throw new Error(r.error.message)
          context = r.context
        }
        const other = await window[kind === 'customers' ? 'agencies' : 'customers'].create({
          context,
          payload: { businessName: 'Società Àlfa' },
        })
        if (!other.ok) throw new Error(other.error.message)
        await window.archives.rename('Elenco completo')
        return { id: first.value.items[0].id, context: other.context }
      }, kind)
      await list.getByRole('button', { name: 'Avanti', exact: true }).click()
      await expect(list).toContainText('Pagina 2 di 2')
      await list.getByRole('button', { name: 'Indietro', exact: true }).click()
      // Actual FK fixture: the product must prevent deletion even when SQLite would cascade.
      await app.evaluate(
        ({ app }, { path, kind, id }) => {
          const module = process.getBuiltinModule('module') as typeof import('node:module')
          const Database = module.createRequire(app.getAppPath() + '/package.json')(
            'better-sqlite3',
          )
          const db = new Database(path)
          try {
            db.pragma('foreign_keys = ON')
            db.exec(
              `CREATE TABLE actual_subject_reference (id TEXT PRIMARY KEY, subject_id TEXT REFERENCES ${kind}(id) ON DELETE CASCADE)`,
            )
            db.prepare('INSERT INTO actual_subject_reference VALUES (?,?)').run('block', id)
          } finally {
            db.close()
          }
        },
        { path, kind, id: saved.id },
      )
      await detail.getByRole('button', { name: `Elimina ${singular}`, exact: true }).click()
      await expect(preview).toContainText('Operazione bloccata')
      await expect(preview).toContainText('actual_subject_reference: 1 riferimenti')
      await expect(confirm).toBeDisabled()
      if (!packaged) await shot('anteprima-bloccata.png')
      await preview.getByRole('button', { name: 'Chiudi anteprima' }).click()
      await app.evaluate(({ app }, path) => {
        const module = process.getBuiltinModule('module') as typeof import('node:module')
        const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
        const db = new Database(path)
        try {
          db.exec('DELETE FROM actual_subject_reference')
        } finally {
          db.close()
        }
      }, path)
      if (!packaged) {
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].setSize(960, 700),
        )
        await shot('minimo.png')
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true)
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].setSize(1440, 900),
        )
        await shot('desktop.png')
      }
      await create.click()
      await creation.getByLabel('Ragione sociale').fill('Bozza da scartare')
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, copy)
      await page.evaluate(() => window.archives.saveAs())
      await expect(page.getByTestId('archive-path')).toHaveText(copy)
      expect(
        await page.evaluate(
          ({ kind, context }) =>
            window[kind].create({ context, payload: { businessName: 'Obsoleta' } }),
          { kind, context: saved.context },
        ),
      ).toMatchObject({ ok: false, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
      await page.getByRole('button', { name: 'Anagrafiche', exact: true }).click()
      await page.getByRole('button', { name: plural, exact: true }).click()
      await expect(creation).toHaveCount(0)
      await create.click()
      await expect(creation.getByLabel('Ragione sociale')).toHaveValue('')
      await creation.getByRole('button', { name: 'Annulla inserimento' }).click()
      await list.getByRole('button', { name: /Società Àlfa/ }).click()
      await detail.getByRole('button', { name: `Elimina ${singular}`, exact: true }).click()
      await confirm.click()
      await expect(create).toBeFocused()
      expect(errors).toEqual([])
      await app.close()
      app = undefined
      app = await playwright._electron.launch({ ...options, env })
      page = await app.firstWindow()
      await page.context().setOffline(true)
      await app.evaluate(({ dialog }, path) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
      }, path)
      await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
      const reopened = await page.evaluate(
        async ({ kind, id }) => {
          const state = await window.archives.getState()
          if (!state.ok || !state.value.context) throw new Error('No context')
          const context = state.value.context
          return {
            entry: await window[kind].get({
              context: { sessionId: context.sessionId },
              query: { id },
            }),
            duplicate: await window[kind].create({
              context,
              payload: { businessName: 'Futura corretta' },
            }),
          }
        },
        { kind, id: saved.id },
      )
      expect(reopened.entry).toMatchObject({
        ok: true,
        value: { code: 1, version: { businessName: 'Società Àlfa' } },
      })
      expect(reopened.duplicate).toMatchObject({
        ok: false,
        error: { code: 'DUPLICATE_IDENTIFIER' },
      })
    } finally {
      await app?.close()
      rmSync(folder, { recursive: true, force: true })
    }
  })
}
