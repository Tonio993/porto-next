import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { OperationApi } from '../../src/shared/contracts/operations'
import {
  operationFixture,
  operationFixtureIds,
  delayOperationResponse,
  operationHeld,
  releaseOperation,
} from './operations-support'
declare const window: { archives: ArchiveApi; operations: OperationApi }
test('P10 asincronia: dettaglio, elenco, permanenze, risoluzione chiusa, bozza obsoleta e cambio sessione', async ({
  playwright,
}) => {
  test.setTimeout(180_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-p10-async-')),
    path = join(folder, 'a.ormeggi'),
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
    await operationFixture(app, path)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    await page.evaluate(async (ids) => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      let context = s.value.context
      for (const [index, type] of ['ENTRY', 'EXIT'].entries()) {
        const payload =
          type === 'ENTRY'
            ? {
                operationType: 'ENTRY' as const,
                vesselId: ids.vesselId,
                portId: ids.portId,
                berthId: null,
                moment: { localDateTime: '2026-05-02T12:00', selectedOffset: null },
                executionStatus: 'PLANNED' as const,
                notes: null,
                manualOverrideAmount: null,
              }
            : {
                operationType: 'EXIT' as const,
                vesselId: ids.vesselId,
                interpretationPortId: null,
                moment: { localDateTime: '2026-05-03T12:00', selectedOffset: null },
                executionStatus: 'PERFORMED' as const,
                notes: null,
                manualOverrideAmount: null,
              }
        const p = await window.operations.previewCreate({ context, payload })
        if (!p.ok) throw Error(p.error.message)
        const r = await window.operations.confirmCreate({
          context: p.context,
          payload: { previewId: p.value.previewId },
        })
        if (!r.ok) throw Error(r.error.message)
        context = r.context
        if (index === 1 && r.value.operationType !== 'EXIT') throw Error('exit')
      }
      const refresh = await window.archives.rename({ context, payload: { name: 'P10 async' } })
      if (!refresh.ok) throw Error(refresh.error.message)
    }, operationFixtureIds)
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    const choose = async (name: string) => {
      await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
      await page.getByRole('option', { name }).click()
    }
    await choose('Stella del mare')
    await expect(page.locator('.operations-rows button')).toHaveCount(2)
    await delayOperationResponse(app, 'operations:get')
    await page.locator('.operations-rows button').first().click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await page.locator('.operations-rows button').last().click()
    await expect(
      page.getByRole('heading', { name: 'Entrata · Prevista', exact: true }),
    ).toBeVisible()
    await releaseOperation(app)
    await expect(
      page.getByRole('heading', { name: 'Entrata · Prevista', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Uscita · Effettuata', exact: true }),
    ).toHaveCount(0)
    await delayOperationResponse(app, 'operations:list')
    await page.getByRole('button', { name: 'Ricarica consultazione' }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await choose('Aurora')
    await expect(page.getByText('Nessuna operazione registrata.')).toBeVisible()
    await releaseOperation(app)
    await expect(page.locator('.operations-rows button')).toHaveCount(0)
    await delayOperationResponse(app, 'operations:stays')
    await choose('Stella del mare')
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await choose('Aurora')
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await releaseOperation(app)
    await expect(page.getByText('Nessuna permanenza.', { exact: false })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Viaggio · Chiuso' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Nuova entrata', exact: true }).click()
    const modal = page.getByRole('dialog')
    await modal.getByRole('combobox', { name: 'Porto di arrivo', exact: true }).click()
    await page.getByRole('option', { name: 'Genova · Genova · Italia', exact: true }).click()
    await modal.getByLabel('Momento economico locale').fill('2026-10-25T02:30')
    await delayOperationResponse(app, 'operations:resolve-moment')
    await modal.getByRole('button', { name: 'Verifica momento', exact: true }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
    await releaseOperation(app)
    await page.getByRole('button', { name: 'Riprendi bozza' }).click()
    await expect(modal.getByText(/Scegli l’occorrenza/)).toHaveCount(0)
    await expect(modal.getByLabel('Momento economico locale')).toHaveValue('2026-10-25T02:30')
    await modal.getByRole('button', { name: 'Verifica momento', exact: true }).click()
    await expect(modal.getByText(/Scegli l’occorrenza/)).toBeVisible()
    await modal.getByRole('button', { name: /Prima occorrenza/ }).click()
    await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
    await expect(modal.getByText('Operazione consentita', { exact: true })).toBeVisible()
    await page.evaluate(async () => {
      const s = await window.archives.getState()
      if (!s.ok || !s.value.context) throw Error('context')
      await window.archives.rename({
        context: s.value.context,
        payload: { name: 'Nuova revisione' },
      })
    })
    await expect(modal.getByText('Anteprima obsoleta', { exact: true })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Conferma modifica' })).toBeDisabled()
    await modal.getByRole('button', { name: 'Chiudi anteprima' }).click()
    await expect(modal.getByRole('button', { name: 'Verifica e mostra anteprima' })).toBeDisabled()
    await expect(modal.getByText('Bozza obsoleta', { exact: true })).toBeVisible()
    await modal.getByRole('button', { name: 'Ricarica bozza' }).click()
    await modal.getByRole('button', { name: 'Verifica e mostra anteprima' }).click()
    await expect(modal.getByText('Operazione consentita', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await delayOperationResponse(app, 'operations:list')
    await page.getByRole('button', { name: 'Ricarica consultazione' }).click()
    await expect.poll(() => operationHeld(app!)).toBe(true)
    await app.evaluate(({ dialog }, copy) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: copy })
    }, copy)
    await page.getByRole('button', { name: 'Archivi', exact: true }).click()
    await page.getByRole('button', { name: 'Salva con nome', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(copy)
    await releaseOperation(app)
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await expect(page.getByText('Scegli una nave', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Riprendi bozza' })).toHaveCount(0)
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
