import { formatHistoricalMoment } from '../../src/renderer/src/api/date-display'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { CreateOperationDto, OperationApi } from '../../src/shared/contracts/operations'
import { operationFixture, operationFixtureIds as ids } from './operations-support'

declare const window: { archives: ArchiveApi; operations: OperationApi }

// Prepared for K4. Unit tests cannot attest DOM order, focus or navigation in Electron.
test('PR11: permanenze recenti a ogni livello e azioni sul viaggio corretto, offline', async ({
  playwright,
}, testInfo) => {
  test.setTimeout(120_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-pr11-'))
  const path = join(folder, 'stays.ormeggi')
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
    page.setDefaultTimeout(12_000)
    await page.context().setOffline(true)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await operationFixture(app, path, 13, true)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).click()
    await expect(page.getByTestId('archive-path')).toHaveText(path)
    const saved = await page.evaluate(async (ids) => {
      const state = await window.archives.getState()
      if (!state.ok || !state.value.context) throw Error('context')
      let context = state.value.context
      const moment = (localDateTime: string) => ({ localDateTime, selectedOffset: null })
      const common = {
        vesselId: ids.vesselId,
        executionStatus: 'PERFORMED' as const,
        notes: null,
        manualOverrideAmount: null,
      }
      const create = async (payload: CreateOperationDto) => {
        const p = await window.operations.previewCreate({ context, payload })
        if (!p.ok) throw Error(p.error.message)
        const r = await window.operations.confirmCreate({
          context: p.context,
          payload: { previewId: p.value.previewId },
        })
        if (!r.ok) throw Error(r.error.message)
        context = r.context
        return r.value
      }
      const exit = await create({
        ...common,
        operationType: 'EXIT',
        interpretationPortId: null,
        moment: moment('2026-05-03T12:00'),
      })
      const entry = await create({
        ...common,
        operationType: 'ENTRY',
        portId: ids.portId,
        berthId: ids.berthId,
        moment: moment('2026-05-04T12:00'),
      })
      const moved = await create({
        ...common,
        operationType: 'MOVEMENT',
        interpretationPortId: null,
        destinationPortId: ids.destinationPortId,
        destinationBerthId: ids.destinationBerthId,
        moment: moment('2026-05-05T12:00'),
        arrivalMoment: moment('2026-05-05T11:30'),
      })
      const internal = await create({
        ...common,
        operationType: 'MOVEMENT',
        interpretationPortId: null,
        destinationPortId: ids.destinationPortId,
        destinationBerthId: null,
        moment: moment('2026-05-06T12:00'),
        arrivalMoment: moment('2026-05-06T13:00'),
      })
      const stays = await window.operations.stays({
        context: { sessionId: context.sessionId },
        query: { vesselId: ids.vesselId, page: 1, pageSize: 25 },
      })
      if (!stays.ok) throw Error(stays.error.message)
      return { stays: stays.value, entry, exit, moved, internal, context }
    }, ids)
    expect(saved.stays.total).toBe(2)
    const [recent, old] = saved.stays.items
    expect([recent.openingOperationId, old.openingOperationId]).toEqual([
      saved.entry.id,
      ids.entryId,
    ])
    expect(recent.visits.map((v) => v.openingOperationId)).toEqual([saved.moved.id, saved.entry.id])
    expect(recent.visits[0].stays.map((b) => b.openingOperationId)).toEqual([
      saved.internal.id,
      saved.moved.id,
    ])
    await page.getByRole('button', { name: 'Operazioni nave', exact: true }).click()
    await page.getByRole('combobox', { name: 'Nave', exact: true }).click()
    await page.getByRole('option', { name: 'Stella del mare arrivo', exact: true }).click()
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    const voyages = page.locator('article.operation-voyage')
    await expect(voyages).toHaveCount(2)
    for (const [index, voyage] of saved.stays.items.entries()) {
      const article = voyages.nth(index)
      await expect(article.locator(':scope > p')).toContainText(
        formatHistoricalMoment(voyage.openingMoment),
      )
      await expect(article.locator('h3')).toHaveText(
        `Viaggio · ${voyage.endedAt ? 'Chiuso' : 'Aperto'}`,
      )
      const visits = article.locator(':scope > section')
      await expect(visits).toHaveCount(voyage.visits.length)
      for (const [i, visit] of voyage.visits.entries()) {
        const section = visits.nth(i)
        await expect(section.locator(':scope > p')).toContainText(
          formatHistoricalMoment(visit.openingMoment),
        )
        await expect(section.locator('h4')).toHaveText(`Visita · ${visit.portName}`)
        const stays = section.locator(':scope > div')
        await expect(stays).toHaveCount(visit.stays.length)
        for (const [j, stay] of visit.stays.entries()) {
          const berth = stays.nth(j)
          await expect(berth).toContainText(formatHistoricalMoment(stay.openingMoment))
          await expect(berth).toContainText(`Apertura: ${stay.openingOperationId}`)
          await expect(berth).toContainText(`Chiusura: ${stay.closingOperationId ?? '—'}`)
          await expect(
            berth.getByRole('button', { name: 'Assegna soggetti all’ormeggio' }),
          ).toBeEnabled()
        }
        await expect(
          section.getByRole('button', { name: 'Assegna soggetti alla visita' }),
        ).toBeEnabled()
      }
      await expect(
        article.getByRole('button', { name: 'Assegna soggetti al viaggio' }),
      ).toBeEnabled()
    }
    for (const [width, height] of [
      [960, 700],
      [1440, 960],
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(size[0], size[1]),
        [width, height],
      )
      if (!process.env.PORTO_PACKAGED_EXE)
        await page.screenshot({
          path: testInfo.outputPath(`pr11-${width}.png`),
          animations: 'disabled',
        })
    }
    await voyages.nth(0).getByRole('button', { name: 'Consulta entrata', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Dettaglio operazione', { exact: true })).toContainText(
      formatHistoricalMoment(saved.entry.endpoint.moment),
    )
    await page.getByRole('button', { name: 'Permanenze', exact: true }).click()
    await voyages.nth(1).getByRole('button', { name: 'Consulta uscita', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(page.getByLabel('Dettaglio operazione', { exact: true })).toContainText(
      formatHistoricalMoment(saved.exit.endpoint.moment),
    )
    const state = await page.evaluate(() => window.archives.getState())
    expect(state.ok && state.value.context).toEqual(saved.context)
    expect(errors).toEqual([])
  } finally {
    if (app) await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
