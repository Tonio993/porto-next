import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ArchiveApi } from '../../src/shared/contracts/archive'

declare const window: { archives: ArchiveApi }

test('M2: migrazioni cumulative v1–v13, dati conservati, backup, copie e trasferibilità v14', async ({
  playwright,
}) => {
  test.setTimeout(240_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-m1-migrations-'))
  const env: Record<string, string> = {
    ...process.env,
    PORTO_TEST_USER_DATA: join(folder, 'prefs'),
    PORTO_TEST_HIDDEN: '1',
  }
  delete env.ELECTRON_RUN_AS_NODE
  const options = process.env.PORTO_PACKAGED_EXE
    ? { executablePath: process.env.PORTO_PACKAGED_EXE, args: [] }
    : { args: [resolve('out/main/index.js')] }
  const app = await playwright._electron.launch({ ...options, env })
  try {
    const page = await app.firstWindow()
    await page.context().setOffline(true)
    await page.getByRole('button', { name: 'Nuovo archivio', exact: true }).waitFor()
    const migrations = readdirSync('migrations')
      .sort()
      .map((n) => readFileSync(join('migrations', n), 'utf8'))
    for (let version = 1; version <= 13; version++) {
      const path = join(folder, `v${version}.ormeggi`)
      const before = await app.evaluate(
        ({ app }, { path, version, migrations }) => {
          const module = process.getBuiltinModule('module') as typeof import('node:module')
          const Database = module.createRequire(app.getAppPath() + '/package.json')(
            'better-sqlite3',
          )
          const db = new Database(path)
          try {
            for (const sql of migrations.slice(0, version)) db.exec(sql)
            db.pragma('application_id = 0x504f5254')
            db.pragma(`user_version = ${version}`)
            db.exec(
              "INSERT INTO archive_metadata (singleton,id,name,created_at,updated_at) VALUES (1,'00000000-0000-4000-8000-000000000001','M1 popolato','2026-01-01T00:00:00.000Z','2026-02-01T00:00:00.000Z')",
            )
            if (version >= 2) db.exec('UPDATE archive_metadata SET revision=42')
            if (version >= 3)
              db.exec("UPDATE company_time_zone SET confirmed=1,zone_id='America/New_York'")
            if (version >= 4)
              db.exec(`INSERT INTO ports VALUES ('p',3,'INACTIVE'); UPDATE port_code_counter SET last_code=9;
            INSERT INTO port_versions (id,port_id,name,locality,country_code) VALUES ('pv','p','Porto storico','Genova','IT');
            INSERT INTO port_time_zones VALUES ('pt','p',NULL,'Europe/Rome');
            INSERT INTO port_identifier_reservations VALUES ('pr','p','PORTO STORICO','GENOVA','IT','2026-01-01T00:00:00.000Z');`)
            if (version >= 6)
              db.exec(`INSERT INTO berths VALUES ('b','p',7,'ACTIVE'); UPDATE berth_code_counter SET last_code=8;
            INSERT INTO berth_versions (id,berth_id,name) VALUES ('bv','b','Molo storico');
            INSERT INTO berth_identifier_reservations VALUES ('br','p','b','MOLO STORICO','2026-01-01T00:00:00.000Z');`)
            if (version >= 7)
              db.exec(`INSERT INTO customers VALUES ('c',2,'ACTIVE');UPDATE customer_code_counter SET last_code=5;
            INSERT INTO customer_versions (id,customer_id,business_name) VALUES ('cv','c','Cliente storico');
            INSERT INTO customer_identifier_reservations VALUES ('cr','c','CLIENTE STORICO','2026-01-01T00:00:00.000Z');
            INSERT INTO agencies VALUES ('a',4,'INACTIVE');UPDATE agency_code_counter SET last_code=6;
            INSERT INTO agency_versions (id,agency_id,business_name) VALUES ('av','a','Agenzia storica');
            INSERT INTO agency_identifier_reservations VALUES ('ar','a','AGENZIA STORICA','2026-01-01T00:00:00.000Z');`)
            if (version >= 8)
              db.exec(`INSERT INTO vessels VALUES ('v',2,'ACTIVE');UPDATE vessel_code_counter SET last_code=4;
            INSERT INTO vessel_versions (id,vessel_id,registered_name,imo_number,vessel_type_id,size) VALUES ('vv','v','Nave storica','00123','STANDARD',9007199254740991);
            INSERT INTO vessel_identifier_reservations VALUES ('vr','v','NAME','NAVE STORICA','2026-01-01T00:00:00.000Z');
            INSERT INTO vessel_identifier_reservations VALUES ('vi','v','IMO','00123','2026-01-01T00:00:00.000Z');`)
            if (version >= 10)
              db.exec(`INSERT INTO tariffs VALUES ('t','p','2025-01-01T00:00:00.000Z','2025-01-01T01:00','Europe/Rome','+01:00');
              INSERT INTO tariff_configurations VALUES ('tc','t','STANDARD',200,'5'),('tp','t','PASSENGER',200,'5'),('ta','t','ADM',200,'5');
              INSERT INTO tariff_brackets VALUES ('tb','tc',1600,'100'),('bp','tp',1600,'100'),('ba','ta',1600,'100');`)
            if (version >= 11) {
              db.exec(`INSERT INTO vessel_operations (id,vessel_id,vessel_version_id,operation_type,execution_status,notes,created_at) VALUES ('op','v','vv','ENTRY','PERFORMED','Cumulativo M2','2026-01-01T00:00:00.000Z');
                INSERT INTO operation_endpoints (id,operation_id,vessel_id,role,port_id,port_version_id,berth_id,berth_version_id,local_date_time,zone_id,utc_offset,utc${version >= 12 ? ',vessel_version_id' : ''}) VALUES ('end','op','v','OCCURRENCE','p','pv','b','bv','2026-06-01T12:00','Europe/Rome','+02:00','2026-06-01T10:00:00.000Z'${version >= 12 ? ",'vv'" : ''});
                INSERT INTO operation_charges SELECT 'charge','op','ENTRY','OCCURRENCE','t','tc','tb',s.id,w.id,'vv','STANDARD',9007199254740991,1600,'100',200,'5',45035996273703,w.weight,11500,11500,9223372036854775807,9223372036854775807,'[]' FROM weight_sequences s JOIN weight_versions w ON w.sequence_id=s.id WHERE s.operation_type='ENTRY';
                INSERT INTO voyages (id,vessel_id,vessel_version_id,opening_operation_id,started_at) VALUES ('voyage','v','vv','op','2026-06-01T10:00:00.000Z');
                INSERT INTO port_calls (id,voyage_id,port_id,port_version_id,opening_operation_id,started_at) VALUES ('call','voyage','p','pv','op','2026-06-01T10:00:00.000Z');
                INSERT INTO berth_stays (id,port_call_id,port_id,berth_id,berth_version_id,opening_operation_id,started_at) VALUES ('stay','call','p','b','bv','op','2026-06-01T10:00:00.000Z');`)
            }
            return Object.fromEntries(
              db
                .prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name")
                .all()
                .map(({ name }: { name: string }) => [
                  name,
                  db
                    .prepare(`SELECT * FROM "${name}"`)
                    .safeIntegers()
                    .all()
                    .map((row: Record<string, unknown>) =>
                      Object.fromEntries(
                        Object.entries(row).map(([key, value]) => [
                          key,
                          typeof value === 'bigint' ? value.toString() : value,
                        ]),
                      ),
                    ),
                ]),
            )
          } finally {
            db.close()
          }
        },
        { path, version, migrations },
      )
      await app.evaluate(({ dialog }, path) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
      }, path)
      const open = await page.evaluate(() => window.archives.open())
      expect(open).toMatchObject({
        ok: true,
        value: { active: { schemaVersion: 16 }, context: { revision: version === 1 ? '0' : '42' } },
      })
      const snapshot = async (path: string) =>
        app.evaluate(({ app }, path) => {
          const module = process.getBuiltinModule('module') as typeof import('node:module')
          const Database = module.createRequire(app.getAppPath() + '/package.json')(
            'better-sqlite3',
          )
          const db = new Database(path, { readonly: true })
          try {
            return {
              version: db.pragma('user_version', { simple: true }),
              integrity: db.pragma('integrity_check'),
              foreignKeys: db.pragma('foreign_key_check'),
              rows: Object.fromEntries(
                db
                  .prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name")
                  .all()
                  .map(({ name }: { name: string }) => [
                    name,
                    db
                      .prepare(`SELECT * FROM "${name}"`)
                      .safeIntegers()
                      .all()
                      .map((row: Record<string, unknown>) =>
                        Object.fromEntries(
                          Object.entries(row).map(([key, value]) => [
                            key,
                            typeof value === 'bigint' ? value.toString() : value,
                          ]),
                        ),
                      ),
                  ]),
              ),
            }
          } finally {
            db.close()
          }
        }, path)
      const after = await snapshot(path)
      expect(after.integrity).toEqual([{ integrity_check: 'ok' }])
      expect(after.foreignKeys).toEqual([])
      for (const [table, rows] of Object.entries(before))
        expect(after.rows[table]).toMatchObject(rows)
      expect(after.rows.weight_versions).toHaveLength(4)
      const backup = readdirSync(folder).find((n) =>
        n.startsWith(`v${version}.ormeggi.prima-v16-`),
      )!
      expect(backup).toBeTruthy()
      expect((await snapshot(join(folder, backup))).rows).toEqual(before)
      expect((await snapshot(join(folder, backup))).version).toBe(version)
      // Backup and Save As retain the full migrated database, including its exact revision.
      const copy = join(folder, `copy-v${version}.ormeggi`)
      const backup9 = join(folder, `backup-v${version}.ormeggi`)
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, backup9)
      expect((await page.evaluate(() => window.archives.backup())).ok).toBe(true)
      expect(await snapshot(backup9)).toEqual(after)
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, copy)
      const copied = await page.evaluate(() => window.archives.saveAs())
      expect(copied.ok).toBe(true)
      if (open.ok && copied.ok)
        expect(copied.value.context!.sessionId).not.toBe(open.value.context!.sessionId)
      expect(await snapshot(copy)).toEqual(after)
      await page.evaluate(() => window.archives.close())
      const transferred = join(folder, 'transferred', `v${version}.ormeggi`)
      await app.evaluate(
        (_, { copy, transferred }) => {
          const fs = process.getBuiltinModule('fs') as typeof import('node:fs')
          const path = process.getBuiltinModule('path') as typeof import('node:path')
          fs.mkdirSync(path.dirname(transferred), { recursive: true })
          fs.renameSync(copy, transferred)
        },
        { copy, transferred },
      )
      await app.evaluate(({ dialog }, path) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
      }, transferred)
      expect((await page.evaluate(() => window.archives.open())).ok).toBe(true)
      expect(await snapshot(transferred)).toEqual(after)
      expect(await snapshot(path)).toEqual(after)
      await page.evaluate(() => window.archives.close())
    }
    // A second process with empty preferences opens only the transferred file.
    const other = await playwright._electron.launch({
      ...options,
      env: { ...env, PORTO_TEST_USER_DATA: join(folder, 'other-installation') },
    })
    try {
      const otherPage = await other.firstWindow()
      await otherPage.context().setOffline(true)
      await otherPage.getByRole('button', { name: 'Apri archivio', exact: true }).waitFor()
      expect(await otherPage.evaluate(() => window.archives.getState())).toMatchObject({
        ok: true,
        value: { active: null, recent: [] },
      })
      await other.evaluate(
        ({ dialog }, path) => {
          dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
        },
        join(folder, 'transferred', 'v13.ormeggi'),
      )
      expect(await otherPage.evaluate(() => window.archives.open())).toMatchObject({
        ok: true,
        value: {
          active: { schemaVersion: 16, name: 'M1 popolato', updatedAt: '2026-02-01T00:00:00.000Z' },
          context: { revision: '42' },
        },
      })
    } finally {
      await other.close()
    }
  } finally {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
