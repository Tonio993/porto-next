import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import type { ArchiveApi } from '../../src/shared/contracts/archive'
import type { ServiceApi } from '../../src/shared/contracts/services'

declare const window: { archives: ArchiveApi; services: ServiceApi }

// Persisted identities use the same UUID format accepted by direct IPC queries.
const fixtureIds: Record<string, string> = Object.fromEntries(
  [
    'p',
    'pv',
    'pv-future',
    'pt',
    'pr',
    'pr-future',
    'b',
    'bv',
    'br',
    'c',
    'cv',
    'cr',
    'a',
    'av',
    'ar',
    'v',
    'vv',
    'vr',
    'vi',
    't',
    'tc',
    'tp',
    'ta',
    'tb',
    'bp',
    'ba',
    'op',
    'end',
    'charge',
    'voyage',
    'call',
    'stay',
    'move',
    'move-d',
    'move-a',
    'move-charge',
    'stay2',
    'p2',
    'pv2',
    'pt2',
    'pr2',
    't2',
    'tc2',
    'tp2',
    'ta2',
    'tb2',
    'bp2',
    'ba2',
    'transfer',
    'transfer-d',
    'transfer-a',
    'transfer-exit',
    'transfer-entry',
    'call2',
    'stay3',
    'free',
    'free-planned',
    'free-missed',
    'catalog',
  ].map((id, index) => [id, '00000000-0000-4000-8000-' + String(index + 100).padStart(12, '0')]),
)

async function snapshot(app: ElectronApplication, path: string) {
  return app.evaluate(({ app }, path) => {
    const module = process.getBuiltinModule('module') as typeof import('node:module')
    const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
    const db = new Database(path, { readonly: true })
    try {
      return {
        applicationId: db.pragma('application_id', { simple: true }),
        version: db.pragma('user_version', { simple: true }),
        integrity: db.pragma('integrity_check'),
        foreignKeys: db.pragma('foreign_key_check'),
        schema: db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY name').all(),
        rows: Object.fromEntries(
          db
            .prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name")
            .all()
            .map(({ name }: { name: string }) => [
              name,
              db
                .prepare(`SELECT * FROM "${name}" ORDER BY rowid`)
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
}

test('M4: migrazioni cumulative v1–v16 e v17 corrente, dati, copie e trasferibilità', async ({
  playwright,
}) => {
  test.setTimeout(300_000)
  const folder = mkdtempSync(join(tmpdir(), 'porto-m4-migrations-'))
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
    const transferredSnapshots = []
    for (let version = 1; version <= 17; version++) {
      const path = join(folder, `v${version}.ormeggi`)
      await app.evaluate(
        ({ app }, { path, version, migrations, fixtureIds }) => {
          const module = process.getBuiltinModule('module') as typeof import('node:module')
          const Database = module.createRequire(app.getAppPath() + '/package.json')(
            'better-sqlite3',
          )
          const db = new Database(path)
          try {
            for (const sql of migrations.slice(0, version)) db.exec(sql)
            db.pragma('foreign_keys=ON')
            const seed = (sql: string) =>
              db.exec(
                sql.replace(/'([^']*)'/g, (literal: string, id: string) =>
                  fixtureIds[id] ? "'" + fixtureIds[id] + "'" : literal,
                ),
              )
            db.pragma('application_id = 0x504f5254')
            db.pragma(`user_version = ${version}`)
            seed(
              "INSERT INTO archive_metadata (singleton,id,name,created_at,updated_at) VALUES (1,'00000000-0000-4000-8000-000000000001','M4 popolato — società','2026-01-01T00:00:00.000Z','2026-02-01T00:00:00.000Z')",
            )
            if (version >= 2) seed('UPDATE archive_metadata SET revision=42')
            if (version >= 3)
              seed("UPDATE company_time_zone SET confirmed=1,zone_id='America/New_York'")
            if (version >= 4)
              seed(`INSERT INTO ports VALUES ('p',3,'INACTIVE'); UPDATE port_code_counter SET last_code=9;
            INSERT INTO port_versions (id,port_id,name,locality,country_code) VALUES ('pv','p','Porto storico','Genova','IT');
            INSERT INTO port_time_zones VALUES ('pt','p',NULL,'Europe/Rome');
            INSERT INTO port_identifier_reservations VALUES ('pr','p','PORTO STORICO','GENOVA','IT','2026-01-01T00:00:00.000Z');`)
            if (version >= 5)
              seed(`INSERT INTO port_versions (id,port_id,name,locality,country_code,effective_from,effective_local_date_time,effective_zone_id,effective_utc_offset) VALUES ('pv-future','p','Porto futuro','Genova','IT','2027-10-31T01:30:00.000Z','2027-10-31T02:30','Europe/Rome','+01:00');
                INSERT INTO port_identifier_reservations VALUES ('pr-future','p','PORTO FUTURO','GENOVA','IT','2026-02-01T00:00:00.000Z');`)
            if (version >= 6)
              seed(`INSERT INTO berths VALUES ('b','p',7,'ACTIVE'); UPDATE berth_code_counter SET last_code=8;
            INSERT INTO berth_versions (id,berth_id,name) VALUES ('bv','b','Molo storico');
            INSERT INTO berth_identifier_reservations VALUES ('br','p','b','MOLO STORICO','2026-01-01T00:00:00.000Z');`)
            if (version >= 7)
              seed(`INSERT INTO customers VALUES ('c',2,'ACTIVE');UPDATE customer_code_counter SET last_code=5;
            INSERT INTO customer_versions (id,customer_id,business_name) VALUES ('cv','c','Cliente storico');
            INSERT INTO customer_identifier_reservations VALUES ('cr','c','CLIENTE STORICO','2026-01-01T00:00:00.000Z');
            INSERT INTO agencies VALUES ('a',4,'INACTIVE');UPDATE agency_code_counter SET last_code=6;
            INSERT INTO agency_versions (id,agency_id,business_name) VALUES ('av','a','Agenzia storica');
            INSERT INTO agency_identifier_reservations VALUES ('ar','a','AGENZIA STORICA','2026-01-01T00:00:00.000Z');`)
            if (version >= 8)
              seed(`INSERT INTO vessels VALUES ('v',2,'ACTIVE');UPDATE vessel_code_counter SET last_code=4;
            INSERT INTO vessel_versions (id,vessel_id,registered_name,imo_number,vessel_type_id,size) VALUES ('vv','v','Nave storica','00123','STANDARD',9007199254740991);
            INSERT INTO vessel_identifier_reservations VALUES ('vr','v','NAME','NAVE STORICA','2026-01-01T00:00:00.000Z');
            INSERT INTO vessel_identifier_reservations VALUES ('vi','v','IMO','00123','2026-01-01T00:00:00.000Z');`)
            if (version >= 10)
              seed(`INSERT INTO tariffs VALUES ('t','p','2025-01-01T00:00:00.000Z','2025-01-01T01:00','Europe/Rome','+01:00');
              INSERT INTO tariff_configurations VALUES ('tc','t','STANDARD',200,'5'),('tp','t','PASSENGER',200,'5'),('ta','t','ADM',200,'5');
              INSERT INTO tariff_brackets VALUES ('tb','tc',1600,'100'),('bp','tp',1600,'100'),('ba','ta',1600,'100');`)
            if (version >= 11) {
              seed(`INSERT INTO vessel_operations (id,vessel_id,vessel_version_id,operation_type,execution_status,notes,created_at) VALUES ('op','v','vv','ENTRY','PERFORMED','Cumulativo M4','2026-01-01T00:00:00.000Z');
                INSERT INTO operation_endpoints (id,operation_id,vessel_id,role,port_id,port_version_id,berth_id,berth_version_id,local_date_time,zone_id,utc_offset,utc${version >= 12 ? ',vessel_version_id' : ''}) VALUES ('end','op','v','OCCURRENCE','p','pv','b','bv','2026-06-01T12:00','Europe/Rome','+02:00','2026-06-01T10:00:00.000Z'${version >= 12 ? ",'vv'" : ''});
                INSERT INTO operation_charges SELECT 'charge','op','ENTRY','OCCURRENCE','t','tc','tb',s.id,w.id,'vv','STANDARD',9007199254740991,1600,'100',200,'5',45035996273697,w.weight,22517998136858500,22517998136858500,9223372036854775807,9223372036854775807,'[]' FROM weight_sequences s JOIN weight_versions w ON w.sequence_id=s.id WHERE s.operation_type='ENTRY';
                INSERT INTO voyages (id,vessel_id,vessel_version_id,opening_operation_id,started_at) VALUES ('voyage','v','vv','op','2026-06-01T10:00:00.000Z');
                INSERT INTO port_calls (id,voyage_id,port_id,port_version_id,opening_operation_id,started_at) VALUES ('call','voyage','p','pv','op','2026-06-01T10:00:00.000Z');
                INSERT INTO berth_stays (id,port_call_id,port_id,berth_id,berth_version_id,opening_operation_id,started_at) VALUES ('stay','call','p','b','bv','op','2026-06-01T10:00:00.000Z');`)
            }
            if (version >= 12)
              seed(`INSERT INTO vessel_operations (id,vessel_id,vessel_version_id,operation_type,execution_status,notes,created_at) VALUES ('move','v','vv','MOVEMENT','PERFORMED','Interno','2026-01-01T00:00:00.000Z');
                INSERT INTO operation_endpoints (id,operation_id,vessel_id,role,vessel_version_id,port_id,port_version_id,berth_id,berth_version_id,local_date_time,zone_id,utc_offset,utc) VALUES
                  ('move-d','move','v','DEPARTURE','vv','p','pv','b','bv','2026-06-01T13:00','Europe/Rome','+02:00','2026-06-01T11:00:00.000Z'),
                  ('move-a','move','v','ARRIVAL','vv','p','pv',NULL,NULL,'2026-06-01T14:00','Europe/Rome','+02:00','2026-06-01T12:00:00.000Z');
                INSERT INTO operation_charges SELECT 'move-charge','move','MOVEMENT','DEPARTURE','t','tc','tb',s.id,w.id,'vv','STANDARD',9007199254740991,1600,'100',200,'5',45035996273697,w.weight,22517998136858500,22517998136858500,0,0,'["Override zero"]' FROM weight_sequences s JOIN weight_versions w ON w.sequence_id=s.id WHERE s.operation_type='MOVEMENT';
                UPDATE berth_stays SET closing_operation_id='move',ended_at='2026-06-01T11:00:00.000Z' WHERE id='stay';
                INSERT INTO berth_stays (id,port_call_id,port_id,opening_operation_id,started_at) VALUES ('stay2','call','p','move','2026-06-01T12:00:00.000Z');`)
            if (version >= 13)
              seed(`INSERT INTO ports VALUES ('p2',4,'ACTIVE');
                INSERT INTO port_versions (id,port_id,name,locality,country_code) VALUES ('pv2','p2','Porto Londra','Londra','GB');
                INSERT INTO port_time_zones VALUES ('pt2','p2',NULL,'Europe/London');
                INSERT INTO port_identifier_reservations VALUES ('pr2','p2','PORTO LONDRA','LONDRA','GB','2026-01-01T00:00:00.000Z');
                INSERT INTO tariffs VALUES ('t2','p2','2025-01-01T00:00:00.000Z','2025-01-01T00:00','Europe/London','+00:00');
                INSERT INTO tariff_configurations SELECT CASE id WHEN 'tc' THEN 'tc2' WHEN 'tp' THEN 'tp2' ELSE 'ta2' END,'t2',vessel_type_id,extra_width,extra_value FROM tariff_configurations WHERE tariff_id='t';
                INSERT INTO tariff_brackets SELECT CASE id WHEN 'tb' THEN 'tb2' WHEN 'bp' THEN 'bp2' ELSE 'ba2' END,CASE configuration_id WHEN 'tc' THEN 'tc2' WHEN 'tp' THEN 'tp2' ELSE 'ta2' END,upper_limit,value FROM tariff_brackets WHERE configuration_id IN ('tc','tp','ta');
                INSERT INTO vessel_operations (id,vessel_id,vessel_version_id,operation_type,execution_status,created_at) VALUES ('transfer','v','vv','MOVEMENT','PERFORMED','2026-01-01T00:00:00.000Z');
                INSERT INTO operation_endpoints (id,operation_id,vessel_id,role,vessel_version_id,port_id,port_version_id,local_date_time,zone_id,utc_offset,utc) VALUES
                  ('transfer-d','transfer','v','DEPARTURE','vv','p','pv','2026-06-02T12:00','Europe/Rome','+02:00','2026-06-02T10:00:00.000Z'),
                  ('transfer-a','transfer','v','ARRIVAL','vv','p2','pv2','2026-06-02T12:00','Europe/London','+01:00','2026-06-02T11:00:00.000Z');
                INSERT INTO operation_charges SELECT 'transfer-exit','transfer','EXIT','DEPARTURE','t','tc','tb',s.id,w.id,'vv','STANDARD',9007199254740991,1600,'100',200,'5',45035996273697,w.weight,22517998136858500,22517998136858500,NULL,22517998136858500,'[]' FROM weight_sequences s JOIN weight_versions w ON w.sequence_id=s.id WHERE s.operation_type='EXIT';
                INSERT INTO operation_charges SELECT 'transfer-entry','transfer','ENTRY','ARRIVAL','t2','tc2','tb2',s.id,w.id,'vv','STANDARD',9007199254740991,1600,'100',200,'5',45035996273697,w.weight,22517998136858500,22517998136858500,NULL,22517998136858500,'[]' FROM weight_sequences s JOIN weight_versions w ON w.sequence_id=s.id WHERE s.operation_type='ENTRY';
                UPDATE berth_stays SET closing_operation_id='transfer',ended_at='2026-06-02T10:00:00.000Z' WHERE id='stay2';
                UPDATE port_calls SET closing_operation_id='transfer',ended_at='2026-06-02T10:00:00.000Z' WHERE id='call';
                INSERT INTO port_calls (id,voyage_id,port_id,port_version_id,opening_operation_id,started_at) VALUES ('call2','voyage','p2','pv2','transfer','2026-06-02T11:00:00.000Z');
                INSERT INTO berth_stays (id,port_call_id,port_id,opening_operation_id,started_at) VALUES ('stay3','call2','p2','transfer','2026-06-02T11:00:00.000Z');`)
            if (version >= 14)
              seed(`UPDATE voyages SET customer_id='c'; UPDATE port_calls SET agency_id='a';
                UPDATE vessel_operations SET agency_id='a' WHERE id='op';
                INSERT INTO operation_charge_subjects (charge_id,customer_id,customer_version_id,customer_source,customer_source_id,agency_id,agency_version_id,agency_source,agency_source_id)
                  SELECT id,'c','cv','VOYAGE','voyage','a','av',CASE WHEN id='charge' THEN 'VESSEL_OPERATION' ELSE 'PORT_CALL' END,CASE WHEN id='charge' THEN 'op' WHEN id='transfer-entry' THEN 'call2' ELSE 'call' END FROM operation_charges;`)
            if (version >= 15)
              seed(`INSERT INTO service_activities (id,category,vessel_id,vessel_version_id,execution_status,description,base_cents,notes,local_date_time,zone_id,utc_offset,utc,voyage_id,port_call_id,berth_stay_id,port_id,port_version_id,berth_id,berth_version_id,customer_id,agency_id,created_at) VALUES
                ('free','FREE','v','vv','PERFORMED','Libera storica — àèìòù',9223372036854775807,'Tupla e importo esatti','2026-06-01T12:30','Europe/Rome','+02:00','2026-06-01T10:30:00.000Z','voyage','call','stay','p','pv','b','bv','c',NULL,'2026-01-01T00:00:00.000Z'),
                ('free-planned','FREE','v','vv','PLANNED','Libera prevista',9007199254740993,NULL,'2026-06-01T12:31','Europe/Rome','+02:00','2026-06-01T10:31:00.000Z','voyage','call','stay','p','pv','b','bv',NULL,NULL,'2026-01-01T00:00:00.000Z'),
                ('free-missed','FREE','v','vv','MISSED','Libera mancata',1,NULL,'2026-06-01T12:32','Europe/Rome','+02:00','2026-06-01T10:32:00.000Z','voyage','call','stay','p','pv','b','bv',NULL,NULL,'2026-01-01T00:00:00.000Z');
                INSERT INTO service_activity_subjects SELECT id,'c','cv',CASE WHEN customer_id IS NULL THEN 'VOYAGE' ELSE 'SERVICE_ACTIVITY' END,CASE WHEN customer_id IS NULL THEN 'voyage' ELSE id END,'a','av','PORT_CALL','call' FROM service_activities;`)
            if (version >= 16) {
              seed(`UPDATE service_types SET has_ever_been_used=1;
                INSERT INTO service_activities (id,category,vessel_id,vessel_version_id,execution_status,base_cents,local_date_time,zone_id,utc_offset,utc,voyage_id,port_call_id,berth_stay_id,port_id,port_version_id,berth_id,berth_version_id,service_type_id,tariff_id,configuration_id,bracket_id,weight_sequence_id,weight_version_id,calculation,created_at)
                  SELECT 'catalog','CATALOG','v','vv','PERFORMED',22517998136858500,'2026-06-01T12:33','Europe/Rome','+02:00','2026-06-01T10:33:00.000Z','voyage','call','stay','p','pv','b','bv',s.service_type_id,'t','tc','tb',s.id,w.id,
                  json_object('activity',json_object('kind','CATALOG','serviceTypeId',s.service_type_id),'portId','p','vesselId','v','vesselVersionId','vv','vesselName','Nave storica','vesselTypeId','STANDARD','size',9007199254740991,
                    'moment',json_object('localDateTime','2026-06-01T12:33','zoneId','Europe/Rome','offset','+02:00','utc','2026-06-01T10:33:00.000Z'),
                    'tariffId','t','tariffEffectiveFrom','2025-01-01T00:00:00.000Z','configurationId','tc','bracketId','tb','upperLimit',1600,'ordinaryValue','100','extraWidth',200,'extraValue','5','extraCount',45035996273697,'tariffValue','225179981368585.00','weightSequenceId',s.id,'weightVersionId',w.id,'weight',w.weight,'base','225179981368585.00','steps',json_array('Traccia catalogo conservata')),
                  '2026-01-01T00:00:00.000Z' FROM weight_sequences s JOIN weight_versions w ON w.sequence_id=s.id WHERE s.service_type_id IS NOT NULL;
                INSERT INTO service_activity_subjects VALUES ('catalog','c','cv','VOYAGE','voyage','a','av','PORT_CALL','call');`)
            }
            if (version >= 16) {
              db.exec(`CREATE TABLE external_weights (
                version_id TEXT NOT NULL, sequence_id TEXT NOT NULL, note TEXT NOT NULL,
                FOREIGN KEY(version_id, sequence_id) REFERENCES weight_versions(id, sequence_id) ON DELETE CASCADE);
                INSERT INTO external_weights SELECT id,sequence_id,'Dipendente esterno conservato' FROM weight_versions;`)
            }
            if (version === 17) {
              db.exec(`INSERT INTO weight_versions(id,sequence_id,weight,effective_from,effective_local_date_time,effective_zone_id,effective_utc_offset)
                SELECT 'dated-weight',id,'1.1234567890123456789','2027-01-01T00:00:00.000Z','2026-12-31T19:00','America/New_York','-05:00' FROM weight_sequences WHERE operation_type='ENTRY';`)
            }
          } finally {
            db.close()
          }
        },
        { path, version, migrations, fixtureIds },
      )
      const before = await snapshot(app, path)
      expect(before.integrity).toEqual([{ integrity_check: 'ok' }])
      expect(before.foreignKeys).toEqual([])
      await app.evaluate(({ dialog }, path) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
      }, path)
      const open = await page.evaluate(() => window.archives.open())
      expect(open).toMatchObject({
        ok: true,
        value: { active: { schemaVersion: 17 }, context: { revision: version === 1 ? '0' : '42' } },
      })
      if (open.ok && version >= 15) {
        const sessionId = open.value.context!.sessionId
        const free = await page.evaluate(
          ({ sessionId, id }) => window.services.get({ context: { sessionId }, query: { id } }),
          { sessionId, id: fixtureIds.free },
        )
        expect(free).toMatchObject({
          ok: true,
          value: {
            id: fixtureIds.free,
            category: 'FREE',
            base: '92233720368547758.07',
            description: 'Libera storica — àèìòù',
            moment: {
              localDateTime: '2026-06-01T12:30',
              zoneId: 'Europe/Rome',
              offset: '+02:00',
              utc: '2026-06-01T10:30:00.000Z',
            },
            context: {
              voyageId: fixtureIds.voyage,
              portCallId: fixtureIds.call,
              berthStayId: fixtureIds.stay,
            },
            specified: { customerId: fixtureIds.c, agencyId: null },
            subjects: { customer: { id: fixtureIds.c }, agency: { id: fixtureIds.a } },
          },
        })
        if (version >= 16) {
          const catalog = await page.evaluate(
            ({ sessionId, id }) => window.services.get({ context: { sessionId }, query: { id } }),
            { sessionId, id: fixtureIds.catalog },
          )
          expect(catalog).toMatchObject({
            ok: true,
            value: {
              category: 'CATALOG',
              base: '225179981368585.00',
              calculation: {
                base: '225179981368585.00',
                extraCount: 45035996273697,
                tariffId: fixtureIds.t,
                configurationId: fixtureIds.tc,
                bracketId: fixtureIds.tb,
              },
            },
          })
        }
      }
      const after = await snapshot(app, path)
      expect(after.integrity).toEqual([{ integrity_check: 'ok' }])
      expect(after.foreignKeys).toEqual([])
      expect(after.applicationId).toBe(0x504f5254)
      expect(after.version).toBe(17)
      for (const [table, rows] of Object.entries(before.rows)) {
        // Migrations may add columns, but must preserve every existing row and value.
        const columns = Object.keys(rows[0] ?? {})
        expect(
          after.rows[table].map((row: Record<string, unknown>) =>
            Object.fromEntries(
              columns.map((column) => [
                column,
                row[
                  table === 'weight_versions' && version < 17 && column === 'effective_from'
                    ? 'legacy_initial_from'
                    : column
                ],
              ]),
            ),
          ),
          'v' + version + ': ' + table,
        ).toEqual(rows)
      }
      expect(after.rows.weight_versions).toHaveLength(version === 17 ? 5 : 4)
      for (const row of after.rows.weight_versions) {
        expect(row.legacy_initial_from).toBeNull()
        if (version < 17) expect(row.effective_from).toBeNull()
      }
      const backups = readdirSync(folder).filter((n) =>
        n.startsWith('v' + version + '.ormeggi.prima-v17-'),
      )
      expect(backups).toHaveLength(version < 17 ? 1 : 0)
      if (version < 17) expect(await snapshot(app, join(folder, backups[0]))).toEqual(before)
      else expect(after).toEqual(before)
      if (version >= 11)
        expect(after.rows.operation_charges[0].effective_base_cents).toBe('9223372036854775807')
      if (version >= 15)
        expect(after.rows.service_activities[0].base_cents).toBe('9223372036854775807')
      // Backup and Save As retain the full migrated database, including its exact revision.
      const copy = join(folder, `copy-v${version}.ormeggi`)
      const archiveBackup = join(folder, `backup-v${version}.ormeggi`)
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, archiveBackup)
      expect(await page.evaluate(() => window.archives.backup())).toMatchObject({
        ok: true,
      })
      expect(await page.evaluate(() => window.archives.getState())).toMatchObject({
        ok: true,
        value: { context: open.ok ? open.value.context : null },
      })
      expect(await snapshot(app, archiveBackup)).toEqual(after)
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath })
      }, copy)
      const copied = await page.evaluate(() => window.archives.saveAs())
      expect(copied.ok).toBe(true)
      if (open.ok && copied.ok) {
        expect(copied.value.context!.sessionId).not.toBe(open.value.context!.sessionId)
        expect(copied.value.context!.archiveId).toBe(open.value.context!.archiveId)
        expect(copied.value.context!.revision).toBe(open.value.context!.revision)
      }
      expect(await snapshot(app, copy)).toEqual(after)
      expect((await page.evaluate(() => window.archives.close())).ok).toBe(true)
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
      expect(await snapshot(app, transferred)).toEqual(after)
      expect(await snapshot(app, path)).toEqual(after)
      transferredSnapshots.push({ version, path: transferred, expected: after })
      expect((await page.evaluate(() => window.archives.close())).ok).toBe(true)
    }
    // Fail after the ALTERs in 0017, while keeping an already open session usable.
    const broken = join(folder, 'rollback-v16.ormeggi')
    const future = join(folder, 'future.ormeggi')
    const activePath = transferredSnapshots.at(-1)!.path
    await app.evaluate(
      ({ app, dialog }, { folder, broken, future, activePath }) => {
        const module = process.getBuiltinModule('module') as typeof import('node:module')
        const fs = process.getBuiltinModule('fs') as typeof import('node:fs')
        const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
        const backup = fs.readdirSync(folder).find((n) => n.startsWith('v16.ormeggi.prima-v17-'))!
        fs.copyFileSync(joinPath(folder, backup), broken)
        function joinPath(a: string, b: string) {
          return a + '/' + b
        }
        const db = new Database(broken)
        db.exec('CREATE INDEX weight_effective_unique ON archive_metadata(name)')
        db.close()
        fs.copyFileSync(activePath, future)
        const f = new Database(future)
        f.pragma('user_version=18')
        f.close()
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [activePath] })
      },
      { folder, broken, future, activePath },
    )
    expect((await page.evaluate(() => window.archives.open())).ok).toBe(true)
    const active = await page.evaluate(() => window.archives.getState())
    for (const rejected of [broken, future]) {
      const before = await snapshot(app, rejected)
      const bytes = readFileSync(rejected)
      await app.evaluate(({ dialog }, path) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
      }, rejected)
      expect((await page.evaluate(() => window.archives.open())).ok).toBe(false)
      expect(await snapshot(app, rejected)).toEqual(before)
      expect(readFileSync(rejected)).toEqual(bytes)
      expect(await page.evaluate(() => window.archives.getState())).toEqual(active)
      if (rejected === broken) {
        const backup = readdirSync(folder).find((n) =>
          n.startsWith('rollback-v16.ormeggi.prima-v17-'),
        )!
        expect(await snapshot(app, join(folder, backup))).toEqual(before)
      }
    }
    expect((await page.evaluate(() => window.archives.close())).ok).toBe(true)
    // A different process, path and empty preferences on this Windows host; not a second physical machine.
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
      for (const { version, path, expected } of transferredSnapshots) {
        await other.evaluate(({ dialog }, path) => {
          dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
        }, path)
        expect(await otherPage.evaluate(() => window.archives.open())).toMatchObject({
          ok: true,
          value: {
            active: {
              schemaVersion: 17,
              name: 'M4 popolato — società',
              updatedAt: '2026-02-01T00:00:00.000Z',
            },
            context: { revision: version === 1 ? '0' : '42' },
          },
        })
        expect(await snapshot(other, path), 'v' + version + ': secondo processo').toEqual(expected)
        expect((await otherPage.evaluate(() => window.archives.close())).ok).toBe(true)
      }
      expect(readdirSync(join(folder, 'transferred')).filter((n) => n.includes('.prima-'))).toEqual(
        [],
      )
    } finally {
      await other.close()
    }
  } finally {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
