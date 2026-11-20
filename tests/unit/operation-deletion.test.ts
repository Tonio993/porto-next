import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { operationDeletionOutcome } from '../../src/renderer/src/api/operation-deletion-outcome'
import * as replay from '../../src/backend/application/operations/operation-replay'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { BerthService } from '../../src/backend/application/berths/berth-service'
import { TariffService } from '../../src/backend/application/tariffs/tariff-service'
import { OperationService } from '../../src/backend/application/operations/operation-service'
import { OperationRepository } from '../../src/backend/infrastructure/database/operation-repository'
import { ServiceService } from '../../src/backend/application/services/service-service'
import { ServiceRepository } from '../../src/backend/infrastructure/database/service-repository'
import { AssignmentService } from '../../src/backend/application/operations/assignment-service'
import { CustomerService } from '../../src/backend/application/customers/customer-service'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { CreateOperationDto, VesselOperationDto } from '../../src/shared/contracts/operations'
import type { TariffConfigurationInput } from '../../src/shared/contracts/tariffs'
let folder: string,
  archives: ArchiveService,
  operations: OperationService,
  ports: PortService,
  vessels: VesselService,
  berths: BerthService,
  tariffs: TariffService,
  portId: string,
  vesselId: string,
  berthId: string
const value = <T>(r: ApplicationResult<T>): T => {
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`)
  return r.value
}
const context = () => archives.context()!,
  db = () => archives.coordinator.requireSession().database,
  sql = () => db().sqlite
const moment = (localDateTime: string, selectedOffset: string | null = null) => ({
  localDateTime,
  selectedOffset,
})
const failure = (code: string) => ({ ok: false, error: { code } })
const config = (price = '100'): TariffConfigurationInput[] =>
  ['STANDARD', 'PASSENGER', 'ADM'].map((t) => ({
    vesselTypeId: t as TariffConfigurationInput['vesselTypeId'],
    brackets: [{ upperLimit: 1600, value: price }],
    extraWidth: 200,
    extraValue: '5',
  }))
async function tariff(at = '2026-01-01T00:00', price = '100', p = portId) {
  const pre = value(
    await tariffs.previewCreate({
      context: context(),
      payload: { portId: p, moment: moment(at), configurations: config(price) },
    }),
  )
  return value(
    await tariffs.confirmCreate({ context: pre.context, payload: { previewId: pre.previewId } }),
  )
}
function input(
  type: 'ENTRY' | 'EXIT' = 'ENTRY',
  at = '2026-06-01T12:00',
  status: CreateOperationDto['executionStatus'] = 'PLANNED',
): CreateOperationDto {
  const common = {
    vesselId,
    moment: moment(at),
    executionStatus: status,
    notes: null,
    manualOverrideAmount: null,
  }
  return type === 'ENTRY'
    ? { ...common, operationType: type, portId, berthId }
    : { ...common, operationType: type, interpretationPortId: null }
}
const preview = (payload = input()) => operations.previewCreate({ context: context(), payload })
async function create(payload = input()) {
  const p = value(await preview(payload))
  return value(
    await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }),
  )
}
const stays = () => new OperationRepository(db()).stays(vesselId, 1, 100).items
async function free(
  at: string,
  status: 'PLANNED' | 'PERFORMED' | 'MISSED' = 'PLANNED',
  catalog = false,
) {
  const svc = new ServiceService(archives.coordinator)
  const common = {
    vesselId,
    interpretationPortId: null,
    moment: moment(at),
    executionStatus: status,
    notes: null,
    specified: { customerId: null, agencyId: null },
  }
  if (!catalog)
    return value(
      await svc.createFree({
        context: context(),
        payload: { ...common, description: 'Servizio', base: '92233720368547758.07' },
      }),
    )
  const type = sql().prepare('SELECT id FROM service_types LIMIT 1').pluck().get() as string
  return value(
    await svc.createCatalog({ context: context(), payload: { ...common, serviceTypeId: type } }),
  )
}
async function movement(
  depart = '2026-06-02T12:00',
  arrival = '2026-06-02T13:00',
  destinationPortId = portId,
  destinationBerthId: string | null = berthId,
) {
  return create({
    vesselId,
    moment: moment(depart),
    executionStatus: 'PLANNED',
    notes: null,
    manualOverrideAmount: null,
    operationType: 'MOVEMENT',
    interpretationPortId: null,
    destinationPortId,
    destinationBerthId,
    arrivalMoment: moment(arrival),
  })
}
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p17d-'))
  archives = new ArchiveService()
  await archives.create(join(folder, 'a.ormeggi'), 'P10')
  operations = new OperationService(archives.coordinator)
  ports = new PortService(archives.coordinator)
  vessels = new VesselService(archives.coordinator)
  berths = new BerthService(archives.coordinator)
  tariffs = new TariffService(archives.coordinator)
  portId = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Genova',
        locality: 'Genova',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  ).id
  vesselId = value(
    await vessels.create({
      context: context(),
      payload: { registeredName: 'Nave', imoNumber: null, vesselTypeId: 'STANDARD', size: 2100 },
    }),
  ).id
  berthId = value(await berths.create({ context: context(), payload: { portId, name: 'Molo' } })).id
  await tariff()
})
afterEach(async () => {
  await archives.close()
  rmSync(folder, { recursive: true, force: true })
  vi.restoreAllMocks()
})

const deletion = (op: VesselOperationDto) =>
  operations.previewDelete({ context: context(), payload: { id: op.id } })
const confirm = (p: { context: ReturnType<typeof context>; previewId: string }) =>
  operations.confirmDelete({ context: p.context, payload: { previewId: p.previewId } })
const snapshot = () =>
  Object.fromEntries(
    [
      'archive_metadata',
      'vessel_operations',
      'operation_endpoints',
      'operation_charges',
      'operation_charge_subjects',
      'voyages',
      'port_calls',
      'berth_stays',
      'service_activities',
      'service_activity_subjects',
      'service_calculations',
    ]
      .filter((t) =>
        sql().prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(t),
      )
      .map((t) => [t, sql().prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]),
  )
async function remove(op: VesselOperationDto) {
  const before = db().metadata(),
    p = value(await deletion(op))
  expect(p.status).toBe('READY')
  expect(db().metadata()).toEqual(before)
  expect(value(await confirm(p))).toEqual({ id: op.id })
  expect(BigInt(context().revision)).toBe(BigInt(p.context.revision) + 1n)
  expect(sql().pragma('foreign_key_check')).toEqual([])
  expect(
    await operations.get({ context: { sessionId: context().sessionId }, query: { id: op.id } }),
  ).toMatchObject(failure('NOT_FOUND'))
  return p
}

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'elimina entrata %s con estremi, componenti e soggetti posseduti',
  async (status) => {
    const op = await create(input('ENTRY', '2026-06-01T12:00', status))
    const p = await remove(op)
    expect(p.summary.deleted).toBe(status === 'MISSED' ? 2 : 5)
    for (const table of [
      'vessel_operations',
      'operation_endpoints',
      'operation_charges',
      'operation_charge_subjects',
      'voyages',
      'port_calls',
      'berth_stays',
    ])
      expect(sql().prepare(`SELECT count(*) FROM ${table}`).pluck().get()).toBe(0)
    const replaced = await create(input('ENTRY', '2026-06-01T12:00', 'PERFORMED'))
    expect(replaced.id).not.toBe(op.id)
    expect(replaced.charges[0].id).not.toBe(op.charges[0].id)
    expect(
      await operations.confirmDelete({ context: context(), payload: { previewId: p.previewId } }),
    ).toMatchObject(failure('PREVIEW_EXPIRED'))
  },
)

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'elimina uscita %s e conserva identità e assegnazioni sopravvissute',
  async (status) => {
    await create()
    const old = stays()[0]
    const customer = value(
      await new CustomerService(archives.coordinator).create({
        context: context(),
        payload: { businessName: 'Cliente' },
      }),
    )
    const assignments = new AssignmentService(archives.coordinator)
    const a = value(
      await assignments.preview({
        context: context(),
        payload: {
          target: { kind: 'VOYAGE', id: old.id },
          specified: { customerId: customer.id, agencyId: null },
        },
      }),
    )
    value(await assignments.confirm({ context: a.context, payload: { previewId: a.previewId } }))
    const svc = await free('2026-06-01T13:00')
    const op = await create(input('EXIT', '2026-06-02T12:00', status))
    await remove(op)
    expect(stays()).toEqual([old])
    const after = new ServiceRepository(db()).get(svc.id)
    expect(after.context.voyageId).toBe(old.id)
    expect(after.subjects.customer?.source).toEqual({ kind: 'VOYAGE', id: old.id })
    expect(sql().prepare('SELECT customer_id FROM voyages WHERE id=?').pluck().get(old.id)).toBe(
      customer.id,
    )
  },
)

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'elimina movimento interno %s, riattribuisce i servizi e non riusa ormeggi rimossi',
  async (status) => {
    await create()
    const originalStay = stays()[0].visits[0].stays[0]
    const op = await create({
      vesselId,
      notes: null,
      manualOverrideAmount: null,
      operationType: 'MOVEMENT',
      interpretationPortId: null,
      destinationPortId: portId,
      destinationBerthId: berthId,
      arrivalMoment: moment('2026-06-02T13:00'),
      moment: moment('2026-06-02T12:00'),
      executionStatus: status,
    })
    const svc = await free('2026-06-02T14:00', 'MISSED')
    const removedId = stays()[0].visits[0].stays.find((b) => b.openingOperationId === op.id)?.id
    const p = await remove(op)
    expect(new ServiceRepository(db()).get(svc.id).context.berthStayId).toBe(originalStay.id)
    expect(stays()[0].visits[0].stays).toEqual([originalStay])
    expect(p.effects.items.some((e) => e.reference.kind === 'SERVICE_ACTIVITY')).toBe(
      status !== 'MISSED',
    )
    if (removedId) {
      const next = await movement()
      expect(stays()[0].visits[0].stays.find((b) => b.openingOperationId === next.id)?.id).not.toBe(
        removedId,
      )
    }
  },
)

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'blocca entrata con prestazione %s orfana anche sul confine iniziale',
  async (status) => {
    const op = await create()
    await free('2026-06-01T12:00', status)
    const before = snapshot(),
      p = value(await deletion(op))
    expect(p.status).toBe('BLOCKED')
    expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(snapshot()).toEqual(before)
  },
)

it('blocca la cancellazione di una chiusura necessaria alla successiva entrata', async () => {
  await create()
  const op = await create(input('EXIT', '2026-06-02T12:00'))
  await create(input('ENTRY', '2026-06-03T12:00'))
  const before = snapshot(),
    p = value(await deletion(op))
  expect(p.status).toBe('BLOCKED')
  expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(snapshot()).toEqual(before)
})

it('blocca il movimento se un’uscita successiva richiede la sua destinazione', async () => {
  await create()
  const b = value(
    await berths.create({ context: context(), payload: { portId, name: 'Secondo molo' } }),
  )
  const op = await movement('2026-06-02T12:00', '2026-06-02T13:00', portId, b.id)
  await create(input('EXIT', '2026-06-03T12:00'))
  const before = snapshot(),
    p = value(await deletion(op))
  expect(p.status).toBe('BLOCKED')
  expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(snapshot()).toEqual(before)
})

it('elimina movimento tra porti e le due componenti, riattribuisce FREE e CATALOG storico e ricalcola solo il catalogo', async () => {
  await create()
  const origin = stays()[0]
  const port = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Savona',
        locality: 'Savona',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  )
  await tariff('2026-01-01T00:00', '200', port.id)
  const op = await movement('2026-06-02T12:00', '2026-06-02T13:00', port.id, null)
  const manual = await free('2026-06-02T13:00', 'MISSED')
  const catalog = await free('2026-06-02T14:00', 'PERFORMED', true)
  sql().prepare("UPDATE service_types SET status='INACTIVE' WHERE id=?").run(catalog.serviceTypeId)
  const p = await remove(op)
  expect(p.summary.recalculated).toBe(1)
  expect(op.charges).toHaveLength(2)
  const afterManual = new ServiceRepository(db()).get(manual.id),
    afterCatalog = new ServiceRepository(db()).get(catalog.id)
  expect(afterManual.base).toBe(manual.base)
  expect(afterManual.moment).toEqual(manual.moment)
  expect(afterManual.context.berthStayId).toBe(origin.visits[0].stays[0].id)
  expect(afterManual.berthVersionId).toBe(origin.visits[0].stays[0].berthVersionId)
  expect(afterCatalog.serviceTypeId).toBe(catalog.serviceTypeId)
  expect(afterCatalog.calculation?.tariffId).not.toBe(catalog.calculation?.tariffId)
  expect(afterCatalog.base).not.toBe(catalog.base)
  expect(afterCatalog.moment).toEqual(catalog.moment)
})

it.each(['operation', 'endpoint', 'charge', 'subjects', 'stay', 'visit', 'voyage'] as const)(
  'blocca FK esterna CASCADE verso %s anche aggiunta dopo l’anteprima',
  async (target) => {
    const op = await create(),
      p = value(await deletion(op)),
      before = snapshot()
    const voyage = stays()[0]
    const definition = {
      operation: [
        'id TEXT, vessel TEXT, FOREIGN KEY(id,vessel) REFERENCES vessel_operations(id,vessel_id) ON DELETE CASCADE',
        [op.id, vesselId],
      ],
      endpoint: [
        'id TEXT, role TEXT, FOREIGN KEY(id,role) REFERENCES operation_endpoints(operation_id,role) ON DELETE CASCADE',
        [op.id, 'OCCURRENCE'],
      ],
      charge: ['id TEXT REFERENCES operation_charges ON DELETE CASCADE', [op.charges[0].id]],
      subjects: [
        'id TEXT REFERENCES operation_charge_subjects ON DELETE CASCADE',
        [op.charges[0].id],
      ],
      stay: [
        'id TEXT REFERENCES berth_stays(id) ON DELETE CASCADE',
        [voyage.visits[0].stays[0].id],
      ],
      visit: ['id TEXT REFERENCES port_calls(id) ON DELETE CASCADE', [voyage.visits[0].id]],
      voyage: ['id TEXT REFERENCES voyages(id) ON DELETE CASCADE', [voyage.id]],
    }[target] as [string, string[]]
    sql().exec(`CREATE TABLE external_ref(${definition[0]})`)
    sql()
      .prepare(`INSERT INTO external_ref VALUES (${definition[1].map(() => '?').join(',')})`)
      .run(...definition[1])
    expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
    expect(value(await deletion(op)).status).toBe('BLOCKED')
    expect(sql().prepare('SELECT count(*) FROM external_ref').pluck().get()).toBe(1)
    expect(snapshot()).toEqual(before)
  },
)

it('rollback dopo rimozione dei componenti e riattribuzione conserva metadati e anteprima riutilizzabile', async () => {
  await create()
  const op = await movement(),
    svc = await free('2026-06-02T14:00')
  const before = snapshot(),
    p = value(await deletion(op))
  sql().exec(
    "CREATE TRIGGER stop_delete BEFORE DELETE ON vessel_operations BEGIN SELECT RAISE(ABORT,'injected rollback'); END",
  )
  expect(await confirm(p)).toMatchObject({ ok: false })
  expect(snapshot()).toEqual(before)
  expect(new ServiceRepository(db()).get(svc.id).context.berthStayId).not.toBe(
    stays()[0].visits[0].stays[0].id,
  )
  sql().exec('DROP TRIGGER stop_delete')
  value(await confirm(p))
  expect(new ServiceRepository(db()).get(svc.id).context.berthStayId).toBe(
    stays()[0].visits[0].stays[0].id,
  )
})

it('anteprima bloccata resta tale, namespace, revisione, sessione e scadenza sono controllati', async () => {
  const op = await create(),
    p = value(await deletion(op))
  expect(
    await operations.confirmCorrect({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  expect(
    await operations.confirmDelete({
      context: { ...p.context, revision: '0' },
      payload: { previewId: p.previewId },
    }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  expect(
    await operations.confirmDelete({
      context: { ...p.context, sessionId: '00000000-0000-4000-8000-000000000000' },
      payload: { previewId: p.previewId },
    }),
  ).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(p.expiresAtUtc) + 1)
  expect(await confirm(p)).toMatchObject(failure('PREVIEW_EXPIRED'))
})

it('non sblocca una vecchia anteprima dopo rimozione esterna del riferimento', async () => {
  const op = await create()
  sql().exec('CREATE TABLE external_ref(id TEXT REFERENCES operation_charges(id))')
  sql().prepare('INSERT INTO external_ref VALUES (?)').run(op.charges[0].id)
  const p = value(await deletion(op)),
    before = snapshot()
  sql().exec('DELETE FROM external_ref')
  expect(await confirm(p)).toMatchObject(failure('PREVIEW_BLOCKED'))
  expect(snapshot()).toEqual(before)
  value(await confirm(value(await deletion(op))))
})

it.each(['PLANNED', 'PERFORMED', 'MISSED'] as const)(
  'aggiorna solo note di operazione %s, senza replay, calcoli o nuove versioni',
  async (status) => {
    const op = await create(input('ENTRY', '2026-06-01T12:00', status))
    const before = snapshot(),
      revision = BigInt(context().revision)
    const replaySpy = vi.spyOn(replay, 'operationReplay').mockImplementation(() => {
      throw Error('replay vietato')
    })
    const updated = value(
      await operations.updateNotes({
        context: context(),
        payload: { id: op.id, notes: '  Nota 🛳\nseconda riga  ' },
      }),
    )
    expect(updated).toEqual({ ...op, notes: '  Nota 🛳\nseconda riga  ' })
    expect(replaySpy).not.toHaveBeenCalled()
    const after = snapshot()
    after.archive_metadata = before.archive_metadata
    const rows = after.vessel_operations as { notes: string | null }[]
    rows[0].notes = op.notes
    expect(after).toEqual(before)
    expect(BigInt(context().revision)).toBe(revision + 1n)
    const metadata = db().metadata()
    value(
      await operations.updateNotes({
        context: context(),
        payload: { id: op.id, notes: updated.notes },
      }),
    )
    expect(db().metadata()).toEqual(metadata)
    value(await operations.updateNotes({ context: context(), payload: { id: op.id, notes: null } }))
  },
)

it('valida note per campo e rifiuta input inattesi o incompleti senza scritture', async () => {
  const op = await create(),
    before = snapshot()
  for (const payload of [
    { id: op.id },
    { id: op.id, notes: 4 },
    { id: op.id, notes: '🛳'.repeat(10001) },
    { id: op.id, notes: null, executionStatus: 'MISSED' },
  ])
    expect(
      await operations.updateNotes({ context: context(), payload: payload as never }),
    ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await operations.previewDelete({
      context: context(),
      payload: { id: op.id, cascade: true } as never,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  const p = value(await deletion(op))
  expect(
    await operations.confirmDelete({
      context: context(),
      payload: { previewId: p.previewId, id: op.id } as never,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(snapshot()).toEqual(before)
})

it('persiste eliminazioni e note dopo chiusura e riapertura archivio', async () => {
  const entry = await create(),
    exit = await create(input('EXIT', '2026-06-02T12:00'))
  await remove(exit)
  value(
    await operations.updateNotes({
      context: context(),
      payload: { id: entry.id, notes: 'Persistente' },
    }),
  )
  const before = snapshot()
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(snapshot()).toEqual(before)
})

it('recupera esito eliminazione solo da lettura persistita nella stessa sessione e revisione coerente', async () => {
  const op = await create(),
    c = context(),
    changed = { ...c, revision: String(BigInt(c.revision) + 1n) }
  expect(operationDeletionOutcome(op, op, c, c)).toBe('UNCHANGED')
  expect(operationDeletionOutcome(op, null, c, changed)).toBe('APPLIED')
  expect(operationDeletionOutcome(op, null, c, c)).toBe('CONFLICT')
  expect(operationDeletionOutcome(op, op, c, changed)).toBe('CONFLICT')
  expect(operationDeletionOutcome(op, null, c, { ...changed, sessionId: 'different' })).toBe(
    'CONFLICT',
  )
  expect(operationDeletionOutcome(op, { ...op, notes: 'Nuova' }, c, c)).toBe('CONFLICT')
})

it('le sole note restano aggiornabili con riferimenti storici disattivati e FK esterne', async () => {
  const op = await create()
  sql().exec(
    'CREATE TABLE external_ref(id TEXT REFERENCES operation_charges(id) ON DELETE CASCADE)',
  )
  sql().prepare('INSERT INTO external_ref VALUES (?)').run(op.charges[0].id)
  sql().prepare("UPDATE vessels SET status='INACTIVE' WHERE id=?").run(vesselId)
  sql().prepare("UPDATE ports SET status='INACTIVE' WHERE id=?").run(portId)
  sql().prepare("UPDATE berths SET status='INACTIVE' WHERE id=?").run(berthId)
  const notes = '🛳'.repeat(10000)
  expect(
    value(await operations.updateNotes({ context: context(), payload: { id: op.id, notes } })),
  ).toEqual({ ...op, notes })
  expect(value(await deletion(op)).status).toBe('BLOCKED')
})

it('rifiuta note obsolete, rollback completo e no-op anche al limite delle revisioni', async () => {
  const op = await create(),
    oldContext = context()
  value(
    await operations.updateNotes({ context: context(), payload: { id: op.id, notes: 'Corrente' } }),
  )
  const before = snapshot()
  expect(
    await operations.updateNotes({
      context: oldContext,
      payload: { id: op.id, notes: 'Obsoleta' },
    }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  sql().exec(
    "CREATE TRIGGER stop_notes AFTER UPDATE OF notes ON vessel_operations BEGIN SELECT RAISE(ABORT,'injected notes rollback'); END",
  )
  expect(
    await operations.updateNotes({
      context: context(),
      payload: { id: op.id, notes: 'Da annullare' },
    }),
  ).toMatchObject({ ok: false })
  expect(snapshot()).toEqual(before)
  sql().exec('DROP TRIGGER stop_notes')
  sql().prepare('UPDATE archive_metadata SET revision=?').run(9223372036854775807n)
  const max = snapshot()
  value(
    await operations.updateNotes({ context: context(), payload: { id: op.id, notes: 'Corrente' } }),
  )
  expect(snapshot()).toEqual(max)
  expect(
    await operations.updateNotes({ context: context(), payload: { id: op.id, notes: null } }),
  ).toMatchObject(failure('LIMIT_EXCEEDED'))
  expect(snapshot()).toEqual(max)
})

it('la rimozione fallita al commit conserva anteprima e tutti i riferimenti', async () => {
  const op = await create(),
    p = value(await deletion(op)),
    before = snapshot()
  sql().exec(
    "CREATE TABLE commit_guard(id TEXT REFERENCES vessels(id) DEFERRABLE INITIALLY DEFERRED); CREATE TRIGGER fail_commit AFTER DELETE ON vessel_operations BEGIN INSERT INTO commit_guard VALUES ('missing'); END",
  )
  expect(await confirm(p)).toMatchObject({ ok: false })
  expect(snapshot()).toEqual(before)
  expect(sql().prepare('SELECT count(*) FROM commit_guard').pluck().get()).toBe(0)
  sql().exec('DROP TRIGGER fail_commit')
  value(await confirm(p))
})

it('riattribuisce indipendentemente soggetti ereditati e override di prestazione senza trasferire assegnazioni rimosse', async () => {
  await create()
  const originalStay = stays()[0].visits[0].stays[0]
  const op = await movement(),
    removedStay = stays()[0].visits[0].stays[1]
  const customers = new CustomerService(archives.coordinator),
    assignments = new AssignmentService(archives.coordinator)
  const ancestor = value(
    await customers.create({ context: context(), payload: { businessName: 'Origine' } }),
  )
  const removed = value(
    await customers.create({ context: context(), payload: { businessName: 'Destinazione' } }),
  )
  const direct = value(
    await customers.create({ context: context(), payload: { businessName: 'Diretto' } }),
  )
  for (const [id, customerId] of [
    [originalStay.id, ancestor.id],
    [removedStay.id, removed.id],
  ]) {
    const p = value(
      await assignments.preview({
        context: context(),
        payload: { target: { kind: 'BERTH_STAY', id }, specified: { customerId, agencyId: null } },
      }),
    )
    value(await assignments.confirm({ context: p.context, payload: { previewId: p.previewId } }))
  }
  const inherited = await free('2026-06-02T14:00')
  const overridden = value(
    await new ServiceService(archives.coordinator).createFree({
      context: context(),
      payload: {
        vesselId,
        interpretationPortId: null,
        moment: moment('2026-06-02T14:00'),
        executionStatus: 'PLANNED',
        description: 'Override diretto',
        base: '10.00',
        notes: null,
        specified: { customerId: direct.id, agencyId: null },
      },
    }),
  )
  await remove(op)
  const services = new ServiceRepository(db())
  expect(services.get(inherited.id).subjects.customer).toMatchObject({
    id: ancestor.id,
    source: { kind: 'BERTH_STAY', id: originalStay.id },
  })
  expect(services.get(overridden.id).subjects.customer).toMatchObject({
    id: direct.id,
    source: { kind: 'SERVICE_ACTIVITY', id: overridden.id },
  })
  expect(
    sql().prepare('SELECT customer_id FROM berth_stays WHERE id=?').pluck().get(originalStay.id),
  ).toBe(ancestor.id)
})

it('Salva con nome invalida la conferma anche quando conserva l’identificativo archivio', async () => {
  const op = await create(),
    p = value(await deletion(op))
  await archives.saveAs(join(folder, 'copy.ormeggi'))
  expect(await confirm(p)).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
  expect(new OperationRepository(db()).get(op.id)).toEqual(op)
})
