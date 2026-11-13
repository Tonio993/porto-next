import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ElectronApplication } from 'playwright'
export const operationFixtureIds = {
  portId: '00000000-0000-4000-8000-000000000011',
  vesselId: '00000000-0000-4000-8000-000000000012',
  secondVesselId: '00000000-0000-4000-8000-000000000013',
  berthId: '00000000-0000-4000-8000-000000000014',
  tariffId: '00000000-0000-4000-8000-000000000015',
  entryId: '00000000-0000-4000-8000-000000000016',
}
export async function operationFixture(app: ElectronApplication, path: string, version = 10) {
  const migrations = readdirSync('migrations')
    .filter((n) => Number(n.slice(0, 4)) <= version)
    .sort()
    .map((n) => readFileSync(join('migrations', n), 'utf8'))
  await app.evaluate(
    ({ app, dialog }, { path, migrations, ids, version }) => {
      const module = process.getBuiltinModule('module') as typeof import('node:module')
      const Database = module.createRequire(app.getAppPath() + '/package.json')('better-sqlite3')
      const db = new Database(path)
      try {
        for (const sql of migrations) db.exec(sql)
        db.pragma('application_id=0x504f5254')
        db.pragma(`user_version=${version}`)
        db.exec(
          "INSERT INTO archive_metadata VALUES (1,'00000000-0000-4000-8000-000000000001','P10 v10','2026-01-01T00:00:00.000Z','2026-02-01T00:00:00.000Z',42)",
        )
        db.prepare("INSERT INTO ports VALUES (?,1,'ACTIVE')").run(ids.portId)
        db.prepare(
          "INSERT INTO port_versions (id,port_id,name,locality,country_code) VALUES (?,?, 'Genova','Genova','IT')",
        ).run('pv', ids.portId)
        db.prepare("INSERT INTO port_time_zones VALUES ('pt',?,NULL,'Europe/Rome')").run(ids.portId)
        db.prepare(
          "INSERT INTO port_identifier_reservations VALUES ('pr',?,'GENOVA','GENOVA','IT','2026-01-01T00:00:00.000Z')",
        ).run(ids.portId)
        db.prepare("INSERT INTO berths VALUES (?,?,1,'ACTIVE')").run(ids.berthId, ids.portId)
        db.prepare("INSERT INTO berth_versions (id,berth_id,name) VALUES ('bv',?,'Molo nord')").run(
          ids.berthId,
        )
        db.prepare(
          "INSERT INTO berth_identifier_reservations VALUES ('br',?,?,'MOLO NORD','2026-01-01T00:00:00.000Z')",
        ).run(ids.portId, ids.berthId)
        db.exec('UPDATE berth_code_counter SET last_code=1')
        for (const [index, id] of [ids.vesselId, ids.secondVesselId].entries()) {
          const name = index ? 'Aurora' : 'Stella del mare'
          db.prepare("INSERT INTO vessels VALUES (?,?,'ACTIVE')").run(id, index + 1)
          db.prepare(
            "INSERT INTO vessel_versions (id,vessel_id,registered_name,vessel_type_id,size) VALUES (?,?,?,'STANDARD',2100)",
          ).run('vv' + index, id, name)
          db.prepare(
            "INSERT INTO vessel_identifier_reservations VALUES (?,?,'NAME',?,'2026-01-01T00:00:00.000Z')",
          ).run('vr' + index, id, name.toUpperCase())
        }
        db.exec(
          'UPDATE port_code_counter SET last_code=1; UPDATE vessel_code_counter SET last_code=2; UPDATE company_time_zone SET confirmed=1',
        )
        db.prepare(
          "INSERT INTO tariffs VALUES (?,?,'2025-12-31T23:00:00.000Z','2026-01-01T00:00','Europe/Rome','+01:00')",
        ).run(ids.tariffId, ids.portId)
        for (const type of ['STANDARD', 'PASSENGER', 'ADM']) {
          db.prepare("INSERT INTO tariff_configurations VALUES (?,?,?,200,'5')").run(
            'c' + type,
            ids.tariffId,
            type,
          )
          db.prepare("INSERT INTO tariff_brackets VALUES (?,?,1600,'100')").run(
            'b' + type,
            'c' + type,
          )
        }
        if (version === 11) {
          const utc = '2026-05-02T10:00:00.000Z'
          db.prepare(
            "INSERT INTO vessel_operations VALUES (?,?,?,'ENTRY','PERFORMED','Entrata storica P10',?)",
          ).run(ids.entryId, ids.vesselId, 'vv0', utc)
          db.prepare(
            "INSERT INTO operation_endpoints (id,operation_id,vessel_id,role,port_id,port_version_id,berth_id,berth_version_id,local_date_time,zone_id,utc_offset,utc) VALUES ('endpoint-p10',?,?,'OCCURRENCE',?,'pv',NULL,NULL,'2026-05-02T12:00','Europe/Rome','+02:00',?)",
          ).run(ids.entryId, ids.vesselId, ids.portId, utc)
          db.prepare(
            "INSERT INTO operation_charges SELECT 'charge-p10',?,'ENTRY','OCCURRENCE',?,'cSTANDARD','bSTANDARD',s.id,w.id,'vv0','STANDARD',2100,1600,'100',200,'5',3,w.weight,11500,11500,NULL,11500,'[]' FROM weight_sequences s JOIN weight_versions w ON w.sequence_id=s.id WHERE s.operation_type='ENTRY'",
          ).run(ids.entryId, ids.tariffId)
          db.prepare(
            "INSERT INTO voyages (id,vessel_id,vessel_version_id,opening_operation_id,started_at) VALUES ('voyage-p10',?,'vv0',?,?)",
          ).run(ids.vesselId, ids.entryId, utc)
          db.prepare(
            "INSERT INTO port_calls (id,voyage_id,port_id,port_version_id,opening_operation_id,started_at) VALUES ('visit-p10','voyage-p10',?,'pv',?,?)",
          ).run(ids.portId, ids.entryId, utc)
          db.prepare(
            "INSERT INTO berth_stays (id,port_call_id,port_id,berth_id,berth_version_id,opening_operation_id,started_at) VALUES ('stay-p10','visit-p10',?,NULL,NULL,?,?)",
          ).run(ids.portId, ids.entryId, utc)
        }
      } finally {
        db.close()
      }
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
    },
    { path, migrations, ids: operationFixtureIds, version },
  )
}
export async function delayOperationResponse(app: ElectronApplication, channel: string) {
  await app.evaluate(({ ipcMain }, channel) => {
    const handlers = (
      ipcMain as unknown as {
        _invokeHandlers: Map<
          string,
          (event: Electron.IpcMainInvokeEvent, input: unknown) => Promise<unknown>
        >
      }
    )._invokeHandlers
    const original = handlers.get(channel)!
    const holder: { used: boolean; held: boolean; release?: () => void } = {
      used: false,
      held: false,
    }
    ;(globalThis as unknown as { operationDelay: typeof holder }).operationDelay = holder
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, async (event, input) => {
      const result = await original(event, input)
      if (!holder.used) {
        holder.used = true
        await new Promise<void>((resolve) => {
          holder.release = resolve
          holder.held = true
        })
      }
      return result
    })
  }, channel)
}
export const operationHeld = (app: ElectronApplication) =>
  app.evaluate(
    () => (globalThis as unknown as { operationDelay: { held: boolean } }).operationDelay.held,
  )
export const releaseOperation = (app: ElectronApplication) =>
  app.evaluate(() =>
    (globalThis as unknown as { operationDelay: { release: () => void } }).operationDelay.release(),
  )
