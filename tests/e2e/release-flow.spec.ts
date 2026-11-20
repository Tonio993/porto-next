import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { PortApi } from '../../src/shared/contracts/ports'
import type { BerthApi } from '../../src/shared/contracts/berths'
import type { CustomerApi } from '../../src/shared/contracts/customers'
import type { AgencyApi } from '../../src/shared/contracts/agencies'
import type { VesselApi } from '../../src/shared/contracts/vessels'
import type { CatalogApi } from '../../src/shared/contracts/catalog'
import type { TariffApi } from '../../src/shared/contracts/tariffs'
import type { OperationApi, CreateOperationDto } from '../../src/shared/contracts/operations'
import type { ServiceApi } from '../../src/shared/contracts/services'

declare const window: {
  archives: ArchiveApi
  ports: PortApi
  berths: BerthApi
  customers: CustomerApi
  agencies: AgencyApi
  vessels: VesselApi
  catalog: CatalogApi
  tariffs: TariffApi
  operations: OperationApi
  services: ServiceApi
}

test('M5 S1: archivio vuoto, due porti, attività e soggetti, backup, copia e riapertura offline', async ({
  playwright,
}) => {
  const folder = mkdtempSync(join(tmpdir(), 'porto-release-'))
  const original = join(folder, 'originale.ormeggi'),
    backup = join(folder, 'backup.ormeggi'),
    copy = join(folder, 'copia.ormeggi')
  const options = process.env.PORTO_PACKAGED_EXE
    ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
    : { args: [resolve('out/main/index.js')] }
  const env = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
    TZ: 'America/New_York',
  }
  delete (env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE
  let app = await playwright._electron.launch({ ...options, env })
  try {
    let page = await app.firstWindow()
    await page.context().setOffline(true)
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, original)
    await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nome dell’archivio' }).fill('Rilascio M5 à')
    await page.getByRole('button', { name: 'Scegli posizione' }).click()
    await page.getByRole('button', { name: 'Riferimenti temporali', exact: true }).click()
    await page.getByRole('button', { name: 'Conferma fuso iniziale', exact: true }).click()
    const seeded = await page.evaluate(async () => {
      const unwrap = <T>(r: ApplicationResult<T>) => {
        if (!r.ok) throw Error(JSON.stringify(r.error))
        return r.value
      }
      const context = async () => {
        const r = await window.archives.getState()
        if (!r.ok || !r.value.context) throw Error('context')
        return r.value.context
      }
      const customer = unwrap(
        await window.customers.create({
          context: await context(),
          payload: { businessName: 'Compagnia Mediterraneo à' },
        }),
      )
      const agency = unwrap(
        await window.agencies.create({
          context: await context(),
          payload: { businessName: 'Agenzia marittima Liguria' },
        }),
      )
      const vessel = unwrap(
        await window.vessels.create({
          context: await context(),
          payload: {
            registeredName: 'Aurora del Mediterraneo',
            imoNumber: '0012345',
            vesselTypeId: 'STANDARD',
            size: 2100,
          },
        }),
      )
      const ports = []
      for (const [name, value] of [
        ['Genova', '100'],
        ['Livorno', '200'],
      ]) {
        const port = unwrap(
          await window.ports.create({
            context: await context(),
            payload: { name, locality: name, countryCode: 'IT', initialZoneId: 'Europe/Rome' },
          }),
        )
        const berth = unwrap(
          await window.berths.create({
            context: await context(),
            payload: { portId: port.id, name: 'Molo principale' },
          }),
        )
        const p = unwrap(
          await window.tariffs.previewCreate({
            context: await context(),
            payload: {
              portId: port.id,
              moment: { localDateTime: '2026-01-01T00:00', selectedOffset: null },
              configurations: (['STANDARD', 'PASSENGER', 'ADM'] as const).map((vesselTypeId) => ({
                vesselTypeId,
                brackets: [{ upperLimit: 1600, value }],
                extraWidth: 200,
                extraValue: '5',
              })),
            },
          }),
        )
        unwrap(
          await window.tariffs.confirmCreate({
            context: p.context,
            payload: { previewId: p.previewId },
          }),
        )
        ports.push({ port, berth })
      }
      const type = unwrap(
        await window.catalog.create({
          context: await context(),
          payload: { description: 'Assistenza al rilascio', initialWeight: '1.5' },
        }),
      )
      const moment = (time: string) => ({
        localDateTime: '2026-05-02T' + time,
        selectedOffset: null,
      })
      const operation = async (payload: CreateOperationDto) => {
        const p = unwrap(
          await window.operations.previewCreate({ context: await context(), payload }),
        )
        return unwrap(
          await window.operations.confirmCreate({
            context: p.context,
            payload: { previewId: p.previewId },
          }),
        )
      }
      const common = {
        vesselId: vessel.id,
        executionStatus: 'PERFORMED' as const,
        notes: null,
        manualOverrideAmount: null,
      }
      const entry = await operation({
        ...common,
        operationType: 'ENTRY',
        portId: ports[0].port.id,
        berthId: ports[0].berth.id,
        moment: moment('08:00'),
        manualOverrideAmount: '0.00',
      })
      const service = {
        vesselId: vessel.id,
        interpretationPortId: null,
        executionStatus: 'MISSED' as const,
        notes: 'Conservare importo e soggetti',
        specified: { customerId: customer.id, agencyId: agency.id },
      }
      const free = unwrap(
        await window.services.createFree({
          context: await context(),
          payload: {
            ...service,
            moment: moment('09:00'),
            description: 'Assistenza libera',
            base: '12.34',
          },
        }),
      )
      const catalog = unwrap(
        await window.services.createCatalog({
          context: await context(),
          payload: { ...service, moment: moment('09:30'), serviceTypeId: type.id },
        }),
      )
      const movement = await operation({
        ...common,
        operationType: 'MOVEMENT',
        interpretationPortId: null,
        moment: moment('10:00'),
        destinationPortId: ports[1].port.id,
        destinationBerthId: ports[1].berth.id,
        arrivalMoment: moment('11:00'),
      })
      const exit = await operation({
        ...common,
        operationType: 'EXIT',
        interpretationPortId: null,
        moment: moment('12:00'),
      })
      return {
        customer,
        agency,
        vessel,
        ports,
        type,
        entry,
        free,
        catalog,
        movement,
        exit,
        context: await context(),
      }
    })
    expect(seeded.entry.totalBase).toBe('0.00')
    expect(seeded.entry.charges[0].calculation.base).toBe('115.00')
    expect(seeded.free.base).toBe('12.34')
    expect(seeded.catalog.base).toBe('172.50')
    expect(seeded.movement.charges.map((c) => c.effectiveBase)).toEqual(['115.00', '215.00'])
    expect(seeded.exit.totalBase).toBe('215.00')
    expect(seeded.free.context).toEqual(seeded.catalog.context)
    expect(seeded.free.subjects.customer?.id).toBe(seeded.customer.id)
    expect(seeded.catalog.subjects.agency?.id).toBe(seeded.agency.id)
    const read = () =>
      page.evaluate(async (s) => {
        const state = await window.archives.getState()
        if (!state.ok || !state.value.context) throw Error('context')
        const context = { sessionId: state.value.context.sessionId }
        const result = []
        for (const id of [s.entry.id, s.movement.id, s.exit.id])
          result.push(await window.operations.get({ context, query: { id } }))
        for (const id of [s.free.id, s.catalog.id])
          result.push(await window.services.get({ context, query: { id } }))
        const stays = await window.operations.stays({
          context,
          query: { vesselId: s.vessel.id, page: 1, pageSize: 25 },
        })
        if (!stays.ok) throw Error(stays.error.message)
        return {
          values: result.map((r) => {
            if (!r.ok) throw Error(r.error.message)
            return r.value
          }),
          stays: stays.value,
        }
      }, seeded)
    const expected = await read()
    expect(expected.stays.items).toHaveLength(1)
    expect(expected.stays.items[0].visits).toHaveLength(2)
    expect(expected.stays.items[0].endedAt).toBe('2026-05-02T10:00:00.000Z')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, backup)
    expect((await page.evaluate(() => window.archives.backup())).ok).toBe(true)
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, copy)
    const copied = await page.evaluate(() => window.archives.saveAs())
    expect(copied.ok).toBe(true)
    if (!copied.ok) throw Error(copied.error.message)
    expect(copied.value.context).toMatchObject({
      archiveId: seeded.context.archiveId,
      revision: seeded.context.revision,
    })
    expect(copied.value.context!.sessionId).not.toBe(seeded.context.sessionId)
    const stale = await page.evaluate(
      (context) =>
        window.services.list({
          context: { sessionId: context.sessionId },
          query: { page: 1, pageSize: 25 },
        }),
      seeded.context,
    )
    expect(stale).toMatchObject({ ok: false, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
    expect(await read()).toEqual(expected)
    await app.close()
    app = await playwright._electron.launch({
      ...options,
      env: { ...env, PORTO_TEST_USER_DATA: join(folder, 'second-process') },
    })
    page = await app.firstWindow()
    await page.context().setOffline(true)
    await page.getByRole('button', { name: 'Apri archivio', exact: true }).waitFor()
    for (const path of [original, backup, copy]) {
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
      }, path)
      expect((await page.evaluate(() => window.archives.open())).ok).toBe(true)
      expect(await read()).toEqual(expected)
      const sqlite = await app.evaluate(({ app }, path) => {
        const module = process.getBuiltinModule('module') as typeof import('node:module')
        const require = module.createRequire(app.getAppPath() + '/package.json')
        const Database = require('better-sqlite3')
        const db = new Database(path, { readonly: true })
        try {
          return {
            integrity: db.pragma('integrity_check', { simple: true }),
            foreignKeys: db.pragma('foreign_key_check'),
            schema: db.pragma('user_version', { simple: true }),
            sqlite: db.prepare('SELECT sqlite_version() AS version').get().version,
            electron: process.versions.electron,
            node: process.versions.node,
            driver: require('better-sqlite3/package.json').version,
            architecture: process.arch,
          }
        } finally {
          db.close()
        }
      }, path)
      expect(sqlite).toMatchObject({
        integrity: 'ok',
        foreignKeys: [],
        schema: 17,
        architecture: 'x64',
      })
      await test.info().attach('runtime-sqlite-' + path.split(/[\\/]/).at(-1), {
        body: JSON.stringify(sqlite, null, 2),
        contentType: 'application/json',
      })
      expect((await page.evaluate(() => window.archives.close())).ok).toBe(true)
    }
  } finally {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
