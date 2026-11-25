import { withoutDescriptions } from './support/without-descriptions'
import { mkdtempSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { WriteAttempt } from '../../src/renderer/src/api/write-attempt'
import { DraftGuard } from '../../src/renderer/src/api/draft-guard'
import { WriteOutcomeStore } from '../../src/main/ipc/write-outcome-store'
import { trackedRequest } from '../../src/shared/contracts/write-outcomes'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ArchiveService } from '../../src/backend/application/archives/archive-service'
import { PortService } from '../../src/backend/application/ports/port-service'
import { VesselService } from '../../src/backend/application/vessels/vessel-service'
import { BerthService } from '../../src/backend/application/berths/berth-service'
import { TariffService } from '../../src/backend/application/tariffs/tariff-service'
import { AssignmentService } from '../../src/backend/application/operations/assignment-service'
import { AssignmentRepository } from '../../src/backend/infrastructure/database/assignment-repository'
import { CustomerService } from '../../src/backend/application/customers/customer-service'
import { AgencyService } from '../../src/backend/application/agencies/agency-service'
import { TimeService } from '../../src/backend/application/time/time-service'
import { resolveSubjects } from '../../src/backend/domain/operations/subjects'
import type { AssignmentTarget, SpecifiedSubjectsDto } from '../../src/shared/contracts/assignments'
import { OperationService } from '../../src/backend/application/operations/operation-service'
import { OperationRepository } from '../../src/backend/infrastructure/database/operation-repository'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { CreateOperationDto } from '../../src/shared/contracts/operations'
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
  return withoutDescriptions(r.value)
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
const all = () => new OperationRepository(db()).all(vesselId)
const stays = () => new OperationRepository(db()).stays(vesselId, 1, 100).items
beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), 'porto-p10-'))
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

const service = () => new AssignmentService(archives.coordinator)
const customers = () => new CustomerService(archives.coordinator)
const agencies = () => new AgencyService(archives.coordinator)
const customer = async (businessName = 'Cliente C') =>
  value(await customers().create({ context: context(), payload: { businessName } })).id
const agency = async (businessName = 'Agenzia A') =>
  value(await agencies().create({ context: context(), payload: { businessName } })).id
async function assign(
  target: AssignmentTarget,
  customerId: string | null = null,
  agencyId: string | null = null,
) {
  const p = value(
    await service().preview({
      context: context(),
      payload: { target, specified: { customerId, agencyId } },
    }),
  )
  return value(await service().confirm({ context: p.context, payload: { previewId: p.previewId } }))
}
const target = (kind: AssignmentTarget['kind'], id: string): AssignmentTarget => ({ kind, id })
const hierarchy = () => {
  const v = stays()[0],
    p = v.visits[0],
    b = p.stays[0]
  return { v: target('VOYAGE', v.id), p: target('PORT_CALL', p.id), b: target('BERTH_STAY', b.id) }
}
const move = (
  destinationPortId = portId,
  at = '2026-06-01T14:00',
  arrival = '2026-06-01T15:00',
  executionStatus: CreateOperationDto['executionStatus'] = 'PERFORMED',
): CreateOperationDto => ({
  operationType: 'MOVEMENT',
  vesselId,
  interpretationPortId: null,
  destinationPortId,
  destinationBerthId: null,
  moment: moment(at),
  arrivalMoment: moment(arrival),
  executionStatus,
  notes: null,
  manualOverrideAmount: null,
})
async function secondPort() {
  const id = value(
    await ports.create({
      context: context(),
      payload: {
        name: 'Livorno',
        locality: 'Livorno',
        countryCode: 'IT',
        initialZoneId: 'Europe/Rome',
      },
    }),
  ).id
  await tariff('2026-01-01T00:00', '200', id)
  return id
}
it('risoluzione pura: priorità indipendenti, null eredita, assenza ammessa', () => {
  const specified = (customerId: string | null, agencyId: string | null): SpecifiedSubjectsDto => ({
    customerId,
    agencyId,
  })
  const layers = [
    { target: target('VOYAGE', 'v'), specified: specified('C', null) },
    { target: target('PORT_CALL', 'p'), specified: specified(null, 'A') },
    { target: target('BERTH_STAY', 'b'), specified: specified('D', null) },
    { target: target('VESSEL_OPERATION', 'o'), specified: specified(null, 'B') },
  ]
  expect(resolveSubjects(layers)).toEqual({
    customer: { id: 'D', source: layers[2].target },
    agency: { id: 'B', source: layers[3].target },
  })
  layers[3].specified.agencyId = null
  layers[2].specified.customerId = null
  expect(resolveSubjects(layers)).toEqual({
    customer: { id: 'C', source: layers[0].target },
    agency: { id: 'A', source: layers[1].target },
  })
  expect(resolveSubjects([])).toEqual({ customer: null, agency: null })
})
it('quattro livelli, rimozione override, coppie indipendenti, no-op, revisione unica e persistenza', async () => {
  const entry = await create(),
    h = hierarchy(),
    c = await customer(),
    d = await customer('Cliente D'),
    a = await agency(),
    b = await agency('Agenzia B')
  expect(entry.charges[0].subjects).toEqual({ customer: null, agency: null })
  await assign(h.v, c)
  await assign(h.p, null, a)
  await assign(h.b, d)
  const o = target('VESSEL_OPERATION', entry.id)
  const original = all()[0].charges[0],
    revision = BigInt(context().revision)
  await assign(o, null, b)
  expect(BigInt(context().revision)).toBe(revision + 1n)
  expect(all()[0].charges[0]).toMatchObject({
    id: original.id,
    calculation: original.calculation,
    subjects: { customer: { id: d, source: h.b }, agency: { id: b, source: o } },
  })
  await assign(o)
  expect(all()[0].charges[0].subjects).toMatchObject({
    customer: { id: d },
    agency: { id: a, source: h.p },
  })
  await assign(h.b)
  expect(all()[0].charges[0].subjects).toMatchObject({
    customer: { id: c, source: h.v },
    agency: { id: a, source: h.p },
  })
  const metadata = db().metadata()
  await assign(h.b)
  expect(db().metadata()).toEqual(metadata)
  const saved = all()
  await archives.close()
  await archives.open(join(folder, 'a.ormeggi'))
  expect(all()).toEqual(saved)
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('spostamento esterno: coppie distinte ai due estremi, override comune, istanti e versioni autonome', async () => {
  const destination = await secondPort(),
    c = await customer(),
    d = await customer('D'),
    a = await agency(),
    b = await agency('B')
  await create()
  const h = hierarchy()
  await assign(h.v, c)
  await assign(h.p, null, a)
  const op = await create(move(destination)),
    v = stays()[0],
    dest = v.visits[0]
  await assign(target('PORT_CALL', dest.id), d, b)
  const read = () => all().find((o) => o.id === op.id)!
  expect(read().charges.map((c) => c.subjects)).toMatchObject([
    { customer: { id: c }, agency: { id: a } },
    { customer: { id: d }, agency: { id: b } },
  ])
  await assign(target('VESSEL_OPERATION', op.id), c)
  expect(read().charges.map((c) => c.subjects)).toMatchObject([
    { customer: { id: c, source: { kind: 'VESSEL_OPERATION' } }, agency: { id: a } },
    { customer: { id: c, source: { kind: 'VESSEL_OPERATION' } }, agency: { id: b } },
  ])
  await assign(target('VESSEL_OPERATION', op.id))
  const transfer = value(
    await operations.contextAt({
      context: { sessionId: context().sessionId },
      query: { vesselId, instant: '2026-06-01T12:30:00.000Z' },
    }),
  )
  expect(transfer).toMatchObject({
    status: 'IN_TRANSFER',
    voyageId: v.id,
    portCallId: null,
    berthStayId: null,
  })
  expect(read().charges[1].subjects.customer?.id).toBe(d)
})
it('interno e uscita ereditano origine; MISSED non genera elementi fittizi e conserva il viaggio', async () => {
  const destination = await secondPort(),
    c = await customer(),
    d = await customer('D'),
    a = await agency()
  const missedEntry = await create(input('ENTRY', '2026-05-01T12:00', 'MISSED'))
  expect(missedEntry.charges[0].subjects).toEqual({ customer: null, agency: null })
  await assign(target('VESSEL_OPERATION', missedEntry.id), d)
  await create()
  const h = hierarchy()
  await assign(h.v, c)
  await assign(h.p, null, a)
  await assign(h.b, d)
  const internal = await create(move()),
    stay = stays()[0].visits[0].stays[0]
  expect(internal.charges[0].subjects.customer?.id).toBe(d)
  await assign(target('BERTH_STAY', stay.id), c)
  const missed = await create(move(destination, '2026-06-01T16:00', '2026-06-03T12:00', 'MISSED'))
  expect(missed.charges.map((c) => c.subjects)).toMatchObject([
    { customer: { id: c }, agency: { id: a } },
    { customer: { id: c, source: h.v }, agency: null },
  ])
  const exit = await create(input('EXIT', '2026-06-02T12:00', 'PERFORMED'))
  expect(exit.charges[0].subjects).toMatchObject({
    customer: { id: c, source: target('BERTH_STAY', stay.id) },
    agency: { id: a },
  })
  expect(stays()[0].visits).toHaveLength(1)
  expect(stays()[0].visits[0].stays).toHaveLength(2)
})
it('una nuova permanenza riattribuisce le componenti MISSED già presenti nella stessa transazione e anteprima', async () => {
  const dest = await secondPort(),
    c = await customer(),
    d = await customer('D')
  await create()
  const h = hierarchy()
  await assign(h.v, c)
  await assign(h.b, d)
  const missed = await create(move(dest, '2026-06-01T16:00', '2026-06-01T18:00', 'MISSED'))
  expect(missed.charges[0].subjects.customer?.id).toBe(d)
  const p = value(
    await preview({
      ...move(portId, '2026-06-01T14:00', '2026-06-01T15:00'),
      operationType: 'MOVEMENT',
      destinationBerthId: berthId,
    } as CreateOperationDto),
  )
  expect(p.effects.items.some((e) => e.reference.id === missed.charges[0].id)).toBe(true)
  value(await operations.confirmCreate({ context: p.context, payload: { previewId: p.previewId } }))
  expect(all().find((o) => o.id === missed.id)!.charges[0].subjects.customer?.id).toBe(c)
})
it('disattivati conservati individualmente, nuove selezioni e ripristino dopo rimozione respinti', async () => {
  const entry = await create(),
    c = await customer(),
    a = await agency(),
    o = target('VESSEL_OPERATION', entry.id)
  await assign(o, c)
  const p = value(
    await customers().preview({
      context: context(),
      payload: { operation: 'DEACTIVATE_CUSTOMER', customerId: c },
    }),
  )
  value(await customers().confirm({ context: p.context, payload: { previewId: p.previewId } }))
  await assign(o, c, a)
  expect(all()[0].charges[0].subjects).toMatchObject({ customer: { id: c }, agency: { id: a } })
  const h = hierarchy()
  expect(
    await service().preview({
      context: context(),
      payload: { target: h.v, specified: { customerId: c, agencyId: null } },
    }),
  ).toMatchObject(failure('NOT_SELECTABLE'))
  await assign(o, null, a)
  expect(
    await service().preview({
      context: context(),
      payload: { target: o, specified: { customerId: c, agencyId: a } },
    }),
  ).toMatchObject(failure('NOT_SELECTABLE'))
})
it('versioni cliente e agenzia: istante economico, anteprime, correzione, eliminazione e riferimenti identità', async () => {
  const dest = await secondPort(),
    c = await customer(),
    a = await agency()
  await create()
  await assign(hierarchy().v, c, a)
  const op = await create(move(dest)),
    read = () => all().find((o) => o.id === op.id)!
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const cp = value(
    await customers().preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        customerId: c,
        businessName: 'C futuro',
        moment: moment('2026-06-01T14:30'),
      },
    }),
  )
  expect(cp.effects.items.some((e) => e.reference.id === op.charges[1].id)).toBe(true)
  value(await customers().confirm({ context: cp.context, payload: { previewId: cp.previewId } }))
  expect(read().charges.map((c) => c.subjects.customer?.businessName)).toEqual([
    'Cliente C',
    'C futuro',
  ])
  const ap = value(
    await agencies().preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        agencyId: a,
        businessName: 'A futuro',
        moment: moment('2026-06-01T14:30'),
      },
    }),
  )
  value(await agencies().confirm({ context: ap.context, payload: { previewId: ap.previewId } }))
  expect(read().charges.map((c) => c.subjects.agency?.businessName)).toEqual([
    'Agenzia A',
    'A futuro',
  ])
  const versionId = read().charges[1].subjects.customer!.versionId
  const correction = value(
    await customers().preview({
      context: context(),
      payload: {
        operation: 'UPDATE_VERSION',
        customerId: c,
        versionId,
        businessName: 'C corretto',
        moment: moment('2026-06-01T14:30', '+02:00'),
      },
    }),
  )
  value(
    await customers().confirm({
      context: correction.context,
      payload: { previewId: correction.previewId },
    }),
  )
  expect(read().charges[1].subjects.customer?.businessName).toBe('C corretto')
  const deletion = value(
    await customers().preview({
      context: context(),
      payload: { operation: 'DELETE_VERSION', customerId: c, versionId },
    }),
  )
  expect(deletion.status).toBe('READY')
  value(
    await customers().confirm({
      context: deletion.context,
      payload: { previewId: deletion.previewId },
    }),
  )
  expect(read().charges[1].subjects.customer?.businessName).toBe('Cliente C')
  expect(
    value(
      await customers().preview({
        context: context(),
        payload: { operation: 'DELETE_CUSTOMER', customerId: c },
      }),
    ).status,
  ).toBe('BLOCKED')
  expect(
    value(
      await agencies().preview({
        context: context(),
        payload: { operation: 'DELETE_AGENCY', agencyId: a },
      }),
    ).status,
  ).toBe('BLOCKED')
  expect(sql().pragma('foreign_key_check')).toEqual([])
})
it('rollback completo su seconda componente, anteprima riutilizzabile solo dopo rollback, metadati e no-op', async () => {
  const dest = await secondPort(),
    c = await customer()
  await create()
  await create(move(dest))
  const h = hierarchy(),
    before = all(),
    metadata = db().metadata()
  const p = value(
    await service().preview({
      context: context(),
      payload: { target: h.v, specified: { customerId: c, agencyId: null } },
    }),
  )
  const original = AssignmentRepository.prototype.saveSubjects
  let calls = 0
  vi.spyOn(AssignmentRepository.prototype, 'saveSubjects').mockImplementation(function (
    this: AssignmentRepository,
    ...args
  ) {
    if (++calls === 2) throw Error('simulated')
    return original.apply(this, args)
  })
  expect(
    await service().confirm({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual(before)
  expect(db().metadata()).toEqual(metadata)
  expect(new AssignmentRepository(db()).specified(h.v).customerId).toBeNull()
  vi.restoreAllMocks()
  value(await service().confirm({ context: p.context, payload: { previewId: p.previewId } }))
  expect(all().every((o) => o.charges.every((c) => c.subjects.customer !== null))).toBe(true)
  expect(
    await service().confirm({ context: context(), payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
})
it('IPC diretto: campi inattesi, livelli e ID, conflitto revisione, namespace e cambio sessione', async () => {
  const entry = await create(),
    o = target('VESSEL_OPERATION', entry.id),
    c = await customer(),
    payload = { target: o, specified: { customerId: c, agencyId: null } }
  expect(
    await service().preview({
      context: context(),
      payload: { ...payload, extra: true } as typeof payload,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await service().get({
      context: { sessionId: context().sessionId },
      query: { kind: ['VOYAGE'], id: entry.id } as unknown as AssignmentTarget,
    }),
  ).toMatchObject(failure('VALIDATION_ERROR'))
  expect(
    await service().get({
      context: { sessionId: context().sessionId },
      query: target('VOYAGE', entry.id),
    }),
  ).toMatchObject(failure('NOT_FOUND'))
  const p = value(await service().preview({ context: context(), payload }))
  await customer('Altro')
  expect(
    await service().confirm({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('REVISION_CONFLICT'))
  const op = value(await preview(input('EXIT', '2026-06-02T12:00')))
  expect(
    await service().confirm({ context: context(), payload: { previewId: op.previewId } }),
  ).toMatchObject(failure('PREVIEW_EXPIRED'))
  const p2 = value(await service().preview({ context: context(), payload }))
  await archives.saveAs(join(folder, 'copy.ormeggi'))
  expect(
    await service().confirm({ context: p2.context, payload: { previewId: p2.previewId } }),
  ).toMatchObject(failure('ARCHIVE_SESSION_CHANGED'))
})
it('conferma riesamina la selezionabilità indipendente dei nuovi riferimenti nella transazione', async () => {
  await create()
  const h = hierarchy(),
    c = await customer(),
    a = await agency()
  const p = value(
    await service().preview({
      context: context(),
      payload: { target: h.v, specified: { customerId: c, agencyId: a } },
    }),
  )
  sql().prepare("UPDATE agencies SET status='INACTIVE' WHERE id=?").run(a)
  const metadata = db().metadata(),
    before = all()
  expect(
    await service().confirm({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('NOT_SELECTABLE'))
  expect(all()).toEqual(before)
  expect(db().metadata()).toEqual(metadata)
  sql().prepare("UPDATE agencies SET status='ACTIVE' WHERE id=?").run(a)
  value(await service().confirm({ context: p.context, payload: { previewId: p.previewId } }))
  sql().prepare("UPDATE agencies SET status='INACTIVE' WHERE id=?").run(a)
  await assign(h.v, null, a)
  await assign(h.v)
  expect(
    await service().preview({
      context: context(),
      payload: { target: h.v, specified: { customerId: null, agencyId: a } },
    }),
  ).toMatchObject(failure('NOT_SELECTABLE'))
})
it('ricalcolo versioni anagrafiche: errore sulle componenti annulla versione e prenotazioni', async () => {
  const dest = await secondPort(),
    c = await customer()
  await create()
  await assign(hierarchy().v, c)
  await create(move(dest))
  value(
    await new TimeService(archives.coordinator).configureCompanyZone({
      context: context(),
      payload: { zoneId: 'Europe/Rome' },
    }),
  )
  const p = value(
    await customers().preview({
      context: context(),
      payload: {
        operation: 'INSERT_VERSION',
        customerId: c,
        businessName: 'Nuova ragione',
        moment: moment('2026-06-01T14:30'),
      },
    }),
  )
  const before = all(),
    metadata = db().metadata(),
    versions = sql().prepare('SELECT * FROM customer_versions').all(),
    reservations = sql().prepare('SELECT * FROM customer_identifier_reservations').all()
  vi.spyOn(AssignmentRepository.prototype, 'saveSubjects').mockImplementation(() => {
    throw Error('subjects write failure')
  })
  expect(
    await customers().confirm({ context: p.context, payload: { previewId: p.previewId } }),
  ).toMatchObject(failure('UNEXPECTED'))
  expect(all()).toEqual(before)
  expect(db().metadata()).toEqual(metadata)
  expect(sql().prepare('SELECT * FROM customer_versions').all()).toEqual(versions)
  expect(sql().prepare('SELECT * FROM customer_identifier_reservations').all()).toEqual(
    reservations,
  )
  vi.restoreAllMocks()
  value(await customers().confirm({ context: p.context, payload: { previewId: p.previewId } }))
})
it('assegnazioni mascherate restano riferimenti e impediscono eliminazione anche senza soggetti effettivi', async () => {
  const entry = await create(),
    h = hierarchy(),
    c = await customer(),
    d = await customer('Altro cliente')
  await assign(h.v, c)
  await assign(target('VESSEL_OPERATION', entry.id), d)
  expect(all()[0].charges[0].subjects.customer?.id).toBe(d)
  const p = value(
    await customers().preview({
      context: context(),
      payload: { operation: 'DELETE_CUSTOMER', customerId: c },
    }),
  )
  expect(p.status).toBe('BLOCKED')
  expect(p.blockers.some((b) => b.reference.label.includes('Viaggi'))).toBe(true)
})
it('MISSED all’arrivo eredita da una destinazione realmente esistente al proprio istante nello stesso viaggio', async () => {
  const dest = await secondPort(),
    c = await customer(),
    d = await customer('Destinazione'),
    a = await agency()
  await create()
  const h = hierarchy()
  await assign(h.v, c)
  const missed = await create(move(dest, '2026-06-01T16:00', '2026-06-02T16:00', 'MISSED'))
  expect(missed.charges[1].subjects).toMatchObject({
    customer: { id: c, source: h.v },
    agency: null,
  })
  await create(move(dest, '2026-06-02T12:00', '2026-06-02T13:00'))
  const visit = stays()[0].visits[0],
    t = target('PORT_CALL', visit.id)
  await assign(t, d, a)
  const updated = all().find((o) => o.id === missed.id)!
  expect(updated.charges[0].subjects).toMatchObject({
    customer: { id: c, source: h.v },
    agency: null,
  })
  expect(updated.charges[1].subjects).toMatchObject({
    customer: { id: d, source: t },
    agency: { id: a, source: t },
  })
  expect(stays()[0].visits).toHaveLength(2)
})
it('anteprima assegnazione paginata: conferma tutti gli effetti oltre la prima pagina', async () => {
  await create()
  const h = hierarchy(),
    c = await customer()
  for (let i = 1; i <= 52; i++)
    await create(input('EXIT', `2026-06-01T12:${String(i).padStart(2, '0')}`, 'MISSED'))
  const p = value(
    await service().preview({
      context: context(),
      payload: { target: h.v, specified: { customerId: c, agencyId: null } },
    }),
  )
  expect(p.effects.total).toBe(54)
  expect(p.effects.items).toHaveLength(50)
  expect(p.summary.reattributed).toBe(53)
  const second = value(
    await service().previewEffects({
      context: { sessionId: context().sessionId },
      query: { previewId: p.previewId, page: 2, pageSize: 50 },
    }),
  )
  expect(second.items).toHaveLength(4)
  value(await service().confirm({ context: p.context, payload: { previewId: p.previewId } }))
  expect(
    all()
      .flatMap((o) => o.charges)
      .every((s) => s.subjects.customer?.id === c),
  ).toBe(true)
}, 20000)
it('PR02 assegnazioni: risposta persa, navigazione e nuovo bersaglio bloccati fino al recupero del tentativo originale', async () => {
  const operation = await create(input('ENTRY', '2026-06-01T12:00', 'PERFORMED'))
  const customerId = await customer(),
    api = service(),
    originalTarget = target('VESSEL_OPERATION', operation.id)
  const p = value(
    await api.preview({
      context: context(),
      payload: { target: originalTarget, specified: { customerId, agencyId: null } },
    }),
  )
  const before = context(),
    store = new WriteOutcomeStore(),
    attempt = new WriteAttempt(),
    guard = new DraftGuard()
  const write = vi.fn((request: unknown) =>
    api.confirm(request as Parameters<typeof api.confirm>[0]),
  )
  const navigate = vi.fn()
  guard.register({}, () => ({
    state: attempt.busy ? 'BUSY' : attempt.uncertain ? 'UNCERTAIN' : 'DRAFT',
    discard: vi.fn(),
    recover: vi.fn(),
  }))
  await attempt.run(before, randomUUID(), async (attemptId) => {
    await store.execute(
      trackedRequest({ context: p.context, payload: { previewId: p.previewId } }, attemptId),
      write,
    )
    return null
  })
  for (const label of ['nuova assegnazione', 'altra nave', 'sottosezione']) {
    expect(guard.request({ label, run: navigate })).toBe(false)
    guard.cancel()
  }
  expect(navigate).not.toHaveBeenCalled()
  expect(
    await attempt.recover(async (attemptId, snapshot) => ({
      ok: true,
      context: context(),
      value: store.get(
        { context: { sessionId: snapshot.sessionId }, query: { attemptId } },
        context(),
      ),
    })),
  ).toBe('APPLIED')
  const actual = value(
    await api.get({ context: { sessionId: context().sessionId }, query: originalTarget }),
  )
  expect(actual.specified).toEqual({ customerId, agencyId: null })
  expect(context().revision).toBe((BigInt(before.revision) + 1n).toString())
  expect(write).toHaveBeenCalledTimes(1)
})
