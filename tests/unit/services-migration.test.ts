import { CustomerService } from '../../src/backend/application/customers/customer-service'
import { ServiceService } from '../../src/backend/application/services/service-service'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { TariffService } from '../../src/backend/application/tariffs/tariff-service'
import { OperationService } from '../../src/backend/application/operations/operation-service'
import { OperationRepository } from '../../src/backend/infrastructure/database/operation-repository'
import type { ApplicationResult } from '../../src/shared/contracts/application'
let folder: string, archives: ArchiveService, operations: OperationService, vesselId: string
const value = <T>(r: ApplicationResult<T>): T => {
  if (!r.ok) throw Error(r.error.message)
  return r.value
}
const moment = (localDateTime: string) => ({ localDateTime, selectedOffset: null })
const sql = () => archives.coordinator.requireSession().database.sqlite
const context = () => archives.context()!
function rows(db: Database.Database) {
  return Object.fromEntries(
    (
      db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all() as {
        name: string
      }[]
    ).map(({ name }) => [
      name,
      db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).safeIntegers().all(),
    ]),
  )
}
function snapshot(path: string) {
  const db = new Database(path, { readonly: true })
  try {
    return {
      version: db.pragma('user_version', { simple: true }),
      rows: rows(db),
      schema: db.prepare('SELECT type,name,sql FROM sqlite_schema ORDER BY name').all(),
    }
  } finally {
    db.close()
  }
}
/** Export real records into the unmodified distributed DDL of the requested version. */
function previous(path: string, version = 14, obstructed = false) {
  const db = new Database(path)
  try {
    for (const name of readdirSync('migrations')
      .filter((n) => Number(n.slice(0, 4)) <= version)
      .sort())
      db.exec(readFileSync(join('migrations', name), 'utf8'))
    db.pragma('foreign_keys=OFF')
    db.exec(
      'DROP TRIGGER operation_endpoint_shape_insert; DROP TRIGGER operation_endpoint_shape_update; DROP TRIGGER operation_charge_shape_insert; DROP TRIGGER operation_charge_shape_update',
    )
    const data = Object.fromEntries(
      Object.entries(rows(sql())).filter(([table]) =>
        db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(table),
      ),
    )
    for (const table of Object.keys(data)) db.prepare(`DELETE FROM "${table}"`).run()
    for (const [table, records] of Object.entries(data)) {
      const columns = (db.pragma(`table_xinfo('${table}')`) as { name: string; hidden: number }[])
        .filter((c) => c.hidden === 0)
        .map((c) => c.name)
      const insert = db.prepare(
        `INSERT INTO "${table}" (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
      )
      for (const row of records as Record<string, unknown>[])
        insert.run(...columns.map((c) => row[c]))
    }
    const migration = readFileSync('migrations/0013_inter_port_movements.sql', 'utf8')
    db.exec(migration.slice(migration.indexOf('CREATE TRIGGER operation_endpoint_shape_insert')))
    db.pragma('application_id=0x504f5254')
    db.pragma(`user_version=${version}`)
    if (obstructed)
      db.exec(
        'CREATE TABLE charge_dependency (charge_id TEXT NOT NULL REFERENCES operation_charges(id) ON DELETE RESTRICT) STRICT; INSERT INTO charge_dependency SELECT id FROM operation_charges LIMIT 1',
      )
    expect(db.pragma('foreign_key_check')).toEqual([])
  } finally {
    db.close()
  }
}
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p12-migration-'))
  archives = new ArchiveService()
  await archives.create(join(folder, 'active.ormeggi'), 'P13 migration')
  operations = new OperationService(archives.coordinator)
  const ports = new PortService(archives.coordinator),
    vessels = new VesselService(archives.coordinator),
    tariffs = new TariffService(archives.coordinator)
  const portId = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Porto',
        locality: 'Genova',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  ).id
  vesselId = value(
    await vessels.create({
      context: context(),
      payload: { registeredName: 'Nave', imoNumber: null, vesselTypeId: 'STANDARD', size: 100 },
    }),
  ).id
  const tariff = value(
    await tariffs.previewCreate({
      context: context(),
      payload: {
        portId,
        moment: moment('2026-01-01T00:00'),
        configurations: ['STANDARD', 'PASSENGER', 'ADM'].map((t) => ({
          vesselTypeId: t as 'STANDARD' | 'PASSENGER' | 'ADM',
          brackets: [{ upperLimit: 100, value: '123.45' }],
          extraWidth: 10,
          extraValue: '2',
        })),
      },
    }),
  )
  value(
    await tariffs.confirmCreate({
      context: tariff.context,
      payload: { previewId: tariff.previewId },
    }),
  )
  for (const [index, type] of (['ENTRY', 'EXIT'] as const).entries()) {
    const p = value(
      await operations.previewCreate({
        context: context(),
        payload: {
          vesselId,
          moment: moment(`2026-06-0${index + 1}T12:00`),
          executionStatus: index ? 'PERFORMED' : 'PLANNED',
          notes: 'Traccia v14',
          manualOverrideAmount: index ? '92233720368547758.07' : null,
          ...(type === 'ENTRY'
            ? { operationType: 'ENTRY', portId, berthId: null }
            : { operationType: 'EXIT', interpretationPortId: null }),
        },
      }),
    )
    value(
      await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
    )
    if (!index) {
      const p = value(
        await operations.previewCreate({
          context: context(),
          payload: {
            operationType: 'MOVEMENT',
            vesselId,
            interpretationPortId: null,
            destinationPortId: portId,
            destinationBerthId: null,
            moment: moment('2026-06-01T13:00'),
            arrivalMoment: moment('2026-06-01T14:00'),
            executionStatus: 'PERFORMED',
            notes: 'Spostamento v14',
            manualOverrideAmount: '0.00',
          },
        }),
      )
      value(
        await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
      )
    }
  }
  const customerId = value(
    await new CustomerService(archives.coordinator).create({
      context: context(),
      payload: { businessName: 'Cliente storico v15' },
    }),
  ).id
  value(
    await new ServiceService(archives.coordinator).createFree({
      context: context(),
      payload: {
        vesselId,
        interpretationPortId: null,
        moment: moment('2026-06-01T12:30'),
        executionStatus: 'MISSED',
        description: 'Libera v15 — àèìòù',
        base: '92233720368547758.07',
        notes: 'Tupla storica',
        specified: { customerId, agencyId: null },
      },
    }),
  )
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})

it('P14: v14 popolato → v15 conserva tutte le righe, tuple, int64, revisioni e copia preventiva', async () => {
  const path = join(folder, 'v14.ormeggi')
  previous(path)
  const before = snapshot(path),
    original = new OperationRepository(archives.coordinator.requireSession().database).all()
  expect((await archives.open(path)).schemaVersion).toBe(17)
  const after = snapshot(path)
  for (const [table, records] of Object.entries(before.rows))
    expect(
      table === 'weight_versions'
        ? (after.rows[table] as Record<string, unknown>[]).map((row) =>
            Object.fromEntries(
              Object.keys((records as Record<string, unknown>[])[0] ?? {}).map((key) => [
                key,
                row[key],
              ]),
            ),
          )
        : after.rows[table],
    ).toEqual(records)
  expect(after.rows.service_activities).toEqual([])
  expect(after.rows.service_activity_subjects).toEqual([])
  expect(new OperationRepository(archives.coordinator.requireSession().database).all()).toEqual(
    original,
  )
  const backup = readdirSync(folder).find((n) => n.includes('.prima-v17-'))!
  expect(snapshot(join(folder, backup))).toEqual(before)
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(sql().pragma('integrity_check', { simple: true })).toBe('ok')
})
it('P14: errore dopo creazione delle tabelle annulla migrazione e conserva sessione, file e copia', async () => {
  const path = join(folder, 'failure.ormeggi')
  previous(path)
  const fixture = new Database(path)
  fixture.exec('CREATE INDEX service_subjects_agency ON archive_metadata(name)')
  fixture.close()
  const before = snapshot(path),
    active = context()
  await expect(archives.open(path)).rejects.toThrow()
  expect(snapshot(path)).toEqual(before)
  expect(context()).toEqual(active)
  const backup = readdirSync(folder).find((n) => n.includes('.prima-v17-'))!
  expect(snapshot(join(folder, backup))).toEqual(before)
})

it('P15: v15 popolato → v16 conserva FREE, soggetti, operazioni, revisione e copia preventiva', async () => {
  const path = join(folder, 'v15.ormeggi')
  previous(path, 15)
  const before = snapshot(path)
  const original = await new ServiceService(archives.coordinator).list({
    context: { sessionId: context().sessionId },
    query: { vesselId, page: 1, pageSize: 25 },
  })
  expect((await archives.open(path)).schemaVersion).toBe(17)
  const after = snapshot(path)
  for (const [table, records] of Object.entries(before.rows)) {
    const columns = Object.keys((records as Record<string, unknown>[])[0] ?? {})
    expect(
      (after.rows[table] as Record<string, unknown>[]).map((row) =>
        Object.fromEntries(columns.map((c) => [c, row[c]])),
      ),
    ).toEqual(records)
  }
  const actual = await new ServiceService(archives.coordinator).list({
    context: { sessionId: context().sessionId },
    query: { vesselId, page: 1, pageSize: 25 },
  })
  expect(value(actual)).toEqual(value(original))
  const backup = readdirSync(folder).find((n) => n.startsWith('v15.ormeggi.prima-v17-'))!
  expect(snapshot(join(folder, backup))).toEqual(before)
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(sql().pragma('integrity_check', { simple: true })).toBe('ok')
})
it('P15: errore dopo ricostruzione e copia dei soggetti annulla ogni effetto della migrazione v15', async () => {
  const path = join(folder, 'v15-failure.ormeggi')
  previous(path, 15)
  const fixture = new Database(path)
  fixture.exec('CREATE INDEX services_type ON archive_metadata(name)')
  fixture.close()
  const before = snapshot(path),
    active = context()
  await expect(archives.open(path)).rejects.toThrow()
  expect(snapshot(path)).toEqual(before)
  expect(context()).toEqual(active)
  const backup = readdirSync(folder).find((n) => n.startsWith('v15-failure.ormeggi.prima-v17-'))!
  expect(snapshot(join(folder, backup))).toEqual(before)
})
