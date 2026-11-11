import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'

let folder: string
let archives: ArchiveService
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p07-migration-'))
  archives = new ArchiveService()
  await archives.create(join(folder, 'active.ormeggi'), 'Active')
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
})

function fixture(path: string, obstructed = false) {
  const db = new Database(path)
  try {
    for (const name of readdirSync('migrations')
      .filter((n) => /^000[1-7]_/.test(n))
      .sort())
      db.exec(readFileSync(join('migrations', name), 'utf8'))
    db.pragma('application_id = 0x504f5254')
    db.pragma('user_version = 7')
    db.exec(`
      INSERT INTO archive_metadata VALUES (1,'00000000-0000-4000-8000-000000000001','V7','2026-01-01T00:00:00.000Z','2026-02-01T00:00:00.000Z',42);
      UPDATE company_time_zone SET confirmed = 1, zone_id = 'America/New_York';
      INSERT INTO ports VALUES ('port',4,'INACTIVE');
      UPDATE port_code_counter SET last_code = 4;
      INSERT INTO port_versions (id,port_id,name,locality,country_code) VALUES ('pv','port','Porto','Genova','IT');
      INSERT INTO port_versions VALUES ('pf','port','2090-01-01T09:00:00.000Z','Futuro','Genova','IT','2090-01-01T10:00','Europe/Rome','+01:00');
      INSERT INTO port_identifier_reservations VALUES ('pr','port','PORTO','GENOVA','IT','2026-01-01T00:00:00.000Z');
      INSERT INTO port_time_zones VALUES ('pt','port',NULL,'Europe/Rome');
      INSERT INTO berths VALUES ('berth','port',7,'INACTIVE');
      UPDATE berth_code_counter SET last_code = 9;
      INSERT INTO berth_versions (id,berth_id,name) VALUES ('bv','berth','Molo');
      INSERT INTO berth_identifier_reservations VALUES ('br','port','berth','MOLO','2026-01-01T00:00:00.000Z');
    `)
    db.exec(
      "INSERT INTO customers VALUES ('customer',3,'ACTIVE'); UPDATE customer_code_counter SET last_code = 5; INSERT INTO customer_versions (id,customer_id,business_name) VALUES ('cv','customer','Cliente'); INSERT INTO customer_identifier_reservations VALUES ('cr','customer','CLIENTE','2026-01-01T00:00:00.000Z'); INSERT INTO agencies VALUES ('agency',2,'INACTIVE'); UPDATE agency_code_counter SET last_code = 2; INSERT INTO agency_versions (id,agency_id,business_name) VALUES ('av','agency','Agenzia'); INSERT INTO agency_identifier_reservations VALUES ('ar','agency','AGENZIA','2026-01-01T00:00:00.000Z');",
    )
    if (obstructed) db.exec('CREATE TABLE vessel_identifier_reservations (existing TEXT)')
  } finally {
    db.close()
  }
}

function rows(path: string) {
  const db = new Database(path, { readonly: true })
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[]
    return Object.fromEntries(
      tables.map(({ name }) => [name, db.prepare(`SELECT * FROM "${name}"`).all()]),
    )
  } finally {
    db.close()
  }
}

it('migra v7 con copia preventiva, conserva tutte le righe e inizializza tipologie e contatore Navi', async () => {
  const path = join(folder, 'v7.ormeggi')
  fixture(path)
  const before = rows(path)
  expect(await archives.open(path)).toMatchObject({
    schemaVersion: 8,
    updatedAt: '2026-02-01T00:00:00.000Z',
  })
  expect(archives.context()?.revision).toBe('42')
  const after = rows(path)
  for (const [table, contents] of Object.entries(before)) expect(after[table]).toEqual(contents)
  const backup = readdirSync(folder).find((n) => n.includes('.prima-v8-'))!
  expect(rows(join(folder, backup))).toEqual(before)
  const snapshot = new Database(join(folder, backup), { readonly: true })
  try {
    expect(snapshot.pragma('user_version', { simple: true })).toBe(7)
  } finally {
    snapshot.close()
  }
  const vessel = await new VesselService(archives.coordinator).create({
    context: archives.context()!,
    payload: { registeredName: 'Nave', imoNumber: null, vesselTypeId: 'STANDARD', size: 0 },
  })
  expect(vessel).toMatchObject({ ok: true, value: { code: 1 } })
  expect(after.vessel_types).toEqual([{ id: 'STANDARD' }, { id: 'PASSENGER' }, { id: 'ADM' }])
  expect(archives.coordinator.requireSession().database.sqlite.pragma('foreign_key_check')).toEqual(
    [],
  )
})

it('annulla l’intera migrazione se fallisce l’ultima tabella e conserva sessione e archivio v7', async () => {
  const path = join(folder, 'obstructed.ormeggi')
  fixture(path, true)
  const before = rows(path)
  const active = archives.context()
  await expect(archives.open(path)).rejects.toThrow()
  expect(archives.context()).toEqual(active)
  expect(rows(path)).toEqual(before)
  const db = new Database(path, { readonly: true })
  try {
    expect(db.pragma('user_version', { simple: true })).toBe(7)
  } finally {
    db.close()
  }
})
