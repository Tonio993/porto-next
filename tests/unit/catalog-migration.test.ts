import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { CatalogService } from '../../src/backend/application/catalog/catalog-service'
let folder: string, archives: ArchiveService
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p08-migration-'))
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
      .filter((n) => /^000[1-8]_/.test(n))
      .sort())
      db.exec(readFileSync(join('migrations', name), 'utf8'))
    db.pragma('application_id = 0x504f5254')
    db.pragma('user_version = 8')
    db.exec(`INSERT INTO archive_metadata VALUES (1,'00000000-0000-4000-8000-000000000001','V8','2026-01-01T00:00:00.000Z','2026-02-01T00:00:00.000Z',42);
      UPDATE company_time_zone SET confirmed=1, zone_id='America/New_York';
      INSERT INTO ports VALUES ('p',3,'INACTIVE'); UPDATE port_code_counter SET last_code=9;
      INSERT INTO port_versions (id,port_id,name,locality,country_code) VALUES ('pv','p','Porto','Genova','IT');
      INSERT INTO port_time_zones VALUES ('pt','p',NULL,'Europe/Rome');
      INSERT INTO port_identifier_reservations VALUES ('pr','p','PORTO','GENOVA','IT','2026-01-01T00:00:00.000Z');
      INSERT INTO berths VALUES ('b','p',7,'ACTIVE'); UPDATE berth_code_counter SET last_code=8;
      INSERT INTO berth_versions (id,berth_id,name) VALUES ('bv','b','Molo');
      INSERT INTO berth_identifier_reservations VALUES ('br','p','b','MOLO','2026-01-01T00:00:00.000Z');
      INSERT INTO customers VALUES ('c',2,'ACTIVE');UPDATE customer_code_counter SET last_code=5;
      INSERT INTO customer_versions (id,customer_id,business_name) VALUES ('cv','c','Cliente');
      INSERT INTO customer_identifier_reservations VALUES ('cr','c','CLIENTE','2026-01-01T00:00:00.000Z');
      INSERT INTO agencies VALUES ('a',4,'INACTIVE');UPDATE agency_code_counter SET last_code=6;
      INSERT INTO agency_versions (id,agency_id,business_name) VALUES ('av','a','Agenzia');
      INSERT INTO agency_identifier_reservations VALUES ('ar','a','AGENZIA','2026-01-01T00:00:00.000Z');
      INSERT INTO vessels VALUES ('v',2,'ACTIVE');UPDATE vessel_code_counter SET last_code=4;
      INSERT INTO vessel_versions (id,vessel_id,registered_name,imo_number,vessel_type_id,size) VALUES ('vv','v','Nave','00123','STANDARD',9007199254740991);
      INSERT INTO vessel_identifier_reservations VALUES ('vr','v','NAME','NAVE','2026-01-01T00:00:00.000Z');
      INSERT INTO vessel_identifier_reservations VALUES ('vi','v','IMO','00123','2026-01-01T00:00:00.000Z');`)
    if (obstructed) db.exec('CREATE TABLE weight_versions (existing TEXT)')
  } finally {
    db.close()
  }
}
function snapshot(path: string) {
  const db = new Database(path, { readonly: true })
  try {
    return {
      version: db.pragma('user_version', { simple: true }),
      rows: Object.fromEntries(
        (
          db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all() as {
            name: string
          }[]
        ).map(({ name }) => [name, db.prepare(`SELECT * FROM "${name}"`).all()]),
      ),
    }
  } finally {
    db.close()
  }
}
it('migra v8 popolato conservando tutte le righe, revisioni e backup; inizializza catalogo e pesi insieme', async () => {
  const path = join(folder, 'v8.ormeggi')
  fixture(path)
  const before = snapshot(path)
  expect(await archives.open(path)).toMatchObject({
    schemaVersion: 16,
    updatedAt: '2026-02-01T00:00:00.000Z',
  })
  expect(archives.context()?.revision).toBe('42')
  const after = snapshot(path)
  expect(after.version).toBe(16)
  for (const [table, rows] of Object.entries(before.rows)) expect(after.rows[table]).toEqual(rows)
  const backup = readdirSync(folder).find((n) => n.includes('.prima-v16-'))!
  expect(snapshot(join(folder, backup))).toEqual(before)
  expect(after.rows.service_types).toHaveLength(1)
  expect(after.rows.weight_sequences).toHaveLength(4)
  expect(after.rows.weight_versions).toHaveLength(4)
  const service = new CatalogService(archives.coordinator)
  expect(
    await service.create({
      context: archives.context()!,
      payload: { description: 'Nuovo', initialWeight: '1.234567890123456789' },
    }),
  ).toMatchObject({ ok: true, value: { initialWeight: { weight: '1.234567890123456789' } } })
  expect(archives.coordinator.requireSession().database.sqlite.pragma('foreign_key_check')).toEqual(
    [],
  )
})
it('rollback dopo creazione parziale delle tabelle conserva v8, dati e sessione attiva', async () => {
  const path = join(folder, 'failure.ormeggi')
  fixture(path, true)
  const before = snapshot(path),
    context = archives.context()
  await expect(archives.open(path)).rejects.toThrow()
  expect(snapshot(path)).toEqual(before)
  expect(archives.context()).toEqual(context)
  const backup = readdirSync(folder).find((n) => n.includes('.prima-v16-'))!
  expect(snapshot(join(folder, backup))).toEqual(before)
})
