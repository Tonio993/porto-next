import { operationCorrectionOutcome } from '../../src/renderer/src/api/operation-correction-outcome'
import { operationDeletionOutcome } from '../../src/renderer/src/api/operation-deletion-outcome'
import { afterEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'
import type { ReactNode } from 'react'
import { MasterDataListEntry } from '../../src/renderer/src/app/MasterDataListEntry'
import { PortList } from '../../src/renderer/src/app/ports/PortList'
import { PortDetail } from '../../src/renderer/src/app/ports/PortDetail'
import { OperationDetail } from '../../src/renderer/src/app/operations/OperationDetail'
import { SubjectValues } from '../../src/renderer/src/app/operations/SubjectValues'
import { ServicePreview } from '../../src/renderer/src/app/services/ServicePreview'
import { PortConfirmation, effectValue } from '../../src/renderer/src/app/ports/PortConfirmation'
import { ConfigurationDetails } from '../../src/renderer/src/app/tariffs/ConfigurationFields'
import { referenceText, CalculationReferences } from '../../src/renderer/src/app/ReferenceValues'
import { portName, vesselName, berthName } from '../../src/renderer/src/api/master-data-names'
import { effectFieldLabel, serviceFieldLabel } from '../../src/shared/description-labels'
import {
  italianNumericFormat as italian,
  englishNumericFormat as english,
} from '../../src/shared/contracts/numeric-preference'
import type { VesselOperationDto } from '../../src/shared/contracts/operations'
import type { ServiceChangePreviewDto } from '../../src/shared/contracts/services'
import type { PortDto } from '../../src/shared/contracts/ports'
import type { ChangePreviewDto, ChangeEffectDto } from '../../src/shared/contracts/master-data'
import type { VersionReferenceDto } from '../../src/shared/contracts/descriptive-references'
const id = 'dd202607-0000-4000-8000-000000000001'
const ids = Array.from({ length: 20 }, (_, i) => id.slice(0, -2) + (10 + i))
const moment = {
  localDateTime: '2026-06-01T12:00',
  zoneId: 'Europe/Rome',
  offset: '+02:00',
  utc: '2026-06-01T10:00:00.000Z',
}
const tariffMoment = {
  localDateTime: '2026-01-01T01:00',
  zoneId: 'Europe/Rome',
  offset: '+01:00',
  utc: '2026-01-01T00:00:00.000Z',
}
const version = (kind: VersionReferenceDto['kind'], name: string): VersionReferenceDto => ({
  kind,
  name,
  effectiveFrom: kind === 'TARIFF' ? tariffMoment.utc : null,
  effectiveTo: null,
  effectiveMoment: kind === 'TARIFF' ? tariffMoment : null,
})
const origin = {
  name: 'Viaggio · Aurora · Genova',
  opening: { name: 'Entrata · Aurora · Genova · Molo', moment },
  closing: null,
}
const subjects = {
  customer: {
    id: ids[1],
    versionId: ids[2],
    businessName: 'Cliente storico',
    source: { kind: 'VOYAGE' as const, id: ids[3] },
    description: { version: version('CUSTOMER', 'Cliente storico'), origin },
  },
  agency: null,
}
const calculation = {
  portId: ids[4],
  vesselId: id,
  vesselVersionId: ids[5],
  vesselName: 'Aurora storica',
  vesselTypeId: 'STANDARD' as const,
  size: 1234,
  moment,
  activity: { kind: 'OPERATION' as const, operation: 'ENTRY' as const },
  tariffId: ids[6],
  tariffEffectiveFrom: '2026-01-01T00:00:00.000Z',
  configurationId: ids[7],
  bracketId: ids[8],
  upperLimit: 5000,
  ordinaryValue: '1234.56',
  extraWidth: 100,
  extraValue: '10',
  extraCount: 0,
  tariffValue: '1234.56',
  weightSequenceId: ids[9],
  weightVersionId: ids[10],
  weight: '1',
  base: '1234.56',
  steps: ['Calcolo originale conservato'],
  references: {
    vessel: version('VESSEL', 'Aurora storica · IMO 123'),
    tariff: version('TARIFF', 'Genova'),
    weight: version('WEIGHT_VERSION', 'Entrata'),
    activity: 'Entrata',
  },
}
const op: VesselOperationDto = {
  id: ids[11],
  vesselId: id,
  vesselVersionId: ids[5],
  operationType: 'ENTRY',
  executionStatus: 'PERFORMED',
  notes: null,
  endpoint: {
    id: ids[12],
    role: 'OCCURRENCE',
    vesselVersionId: ids[5],
    moment,
    portId: ids[4],
    portVersionId: ids[13],
    portName: 'Genova storica',
    berthId: ids[14],
    berthVersionId: ids[15],
    berthName: 'Molo storico',
    references: {
      vessel: calculation.references.vessel,
      port: version('PORT', 'Genova storica · Genova · IT'),
      berth: version('BERTH', 'Molo storico · Genova storica'),
    },
  },
  arrival: null,
  charges: [
    {
      id: ids[16],
      chargeKind: 'ENTRY',
      economicEndpointRole: 'OCCURRENCE',
      calculation,
      manualOverrideAmount: null,
      effectiveBase: '1234.56',
      subjects,
    },
  ],
  totalBase: '1234.56',
}
const port: PortDto = {
  id: ids[4],
  code: 7,
  status: 'ACTIVE',
  version: {
    id: ids[13],
    effectiveFrom: null,
    name: 'Porto omonimo',
    locality: 'Genova',
    countryCode: 'IT',
  },
  initialZoneId: 'Europe/Rome',
  nextTransitionAt: null,
}
const context = { archiveId: ids[17], sessionId: ids[18], revision: '2' }
const effect: ChangeEffectDto = {
  reference: {
    kind: 'OPERATION_CHARGE',
    id: ids[16],
    label: 'Entrata · Aurora storica · Genova',
    description: { name: 'Componente Entrata · Aurora storica · Genova', moment },
  },
  versionId: null,
  action: 'UPDATE',
  changes: [
    {
      field: 'vesselVersionId',
      before: ids[5],
      after: ids[19],
      beforeReference: version('VESSEL', 'Aurora storica'),
      afterReference: {
        ...version('VESSEL', 'Aurora futura'),
        effectiveFrom: moment.utc,
        effectiveMoment: moment,
      },
    },
  ],
}
const preview: ChangePreviewDto = {
  previewId: id,
  operation: 'OPERATION_CORRECT',
  context,
  generatedAtUtc: moment.utc,
  expiresAtUtc: '2099-01-01T00:00:00.000Z',
  status: 'READY',
  summary: { created: 0, updated: 1, deleted: 0, reattributed: 0, recalculated: 0 },
  effects: { items: [effect], total: 1, page: 1, pageSize: 50 },
  warnings: [],
  blockers: [],
}
const render = (v: ReactNode) => renderToStaticMarkup(<MantineProvider>{v}</MantineProvider>)
const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
const noop = () => {}
afterEach(() => vi.restoreAllMocks())
it.each(['Molo Alfa', 'Cliente Rossi', 'Agenzia Marina', 'Aurora'])(
  'PR07 lista comune con nome principale %s e codice solo secondario',
  (name) => {
    const html = render(
      <MasterDataListEntry
        code={7}
        name={name}
        status="Attivo"
        selected={false}
        disabled={false}
        onClick={noop}
      />,
    )
    expect(html).toContain('<strong>' + name + '</strong>')
    expect(html.indexOf('<strong>')).toBeLessThan(html.indexOf('Codice 7'))
    expect(html).not.toContain('7 · ' + name)
  },
)
it('PR07 lista e titolo porto: nome accessibile descrittivo e tuple distinte indipendenti dalla pagina', () => {
  const other = { ...port, id: ids[19], code: 8, version: { ...port.version, locality: 'Livorno' } }
  expect(portName(port)).toBe('Porto omonimo · Genova · Italia')
  expect(portName(other)).toBe('Porto omonimo · Livorno · Italia')
  const html = render(
    <PortList
      page={{ items: [port], total: 2, page: 1, pageSize: 1 }}
      selected={null}
      search=""
      disabled={false}
      loading={false}
      onSearch={noop}
      onPage={noop}
      onSelect={noop}
      onCreate={noop}
    />,
  )
  expect(html).toContain('Apri porto Porto omonimo · Genova · Italia')
  expect(html).not.toContain('Apri porto 7')
  expect(
    render(
      <PortDetail
        port={port}
        disabled={false}
        onAdd={noop}
        onDeactivate={noop}
        onReactivate={noop}
        onDelete={noop}
      />,
    ),
  ).toContain('<h2>Porto omonimo</h2>')
})
it('PR07 adapter nomi: IMO e porto proprietario conservati, ID e codice separati', () => {
  const vessel = {
    id,
    code: 9,
    status: 'ACTIVE' as const,
    selectable: true,
    nextTransitionAt: null,
    version: {
      ...version('VESSEL', 'Aurora'),
      id: ids[5],
      phase: 'CURRENT' as const,
      registeredName: 'Aurora',
      imoNumber: '123',
      vesselTypeId: 'STANDARD' as const,
      size: 100,
    },
  }
  expect(vesselName(vessel)).toBe('Aurora · IMO 123')
  expect(vesselName({ ...vessel, version: { ...vessel.version, imoNumber: null } })).toBe('Aurora')
  const berth = {
    id,
    code: 10,
    portId: port.id,
    portLabel: 'Genova · Genova · IT',
    status: 'ACTIVE' as const,
    selectable: true,
    nextTransitionAt: null,
    version: { ...version('BERTH', 'Molo'), id: ids[15], phase: 'CURRENT' as const, name: 'Molo' },
  }
  expect(berthName(berth)).toBe('Molo · Genova · Genova · IT')
  expect(berth.id).toBe(id)
})
it('PR07 dettaglio espanso operazione: elementi corretti e operandi leggibili, ID ancora nei DTO', () => {
  const html = render(<OperationDetail operation={op} />)
  expect(html).not.toMatch(uuid)
  for (const text of [
    'Aurora storica',
    'Genova storica',
    'Molo storico',
    'Cliente storico',
    'Viaggio',
    'Versione iniziale',
    'Nave normale',
    'Scaglione',
    '5.000',
    '1.234,56',
    '12:00 (+02:00)',
    'Europe/Rome',
  ])
    expect(html).toContain(text)
  expect(html).not.toContain('STANDARD')
  expect(JSON.stringify(op)).toContain(ids[16])
  expect(op.charges[0].calculation.tariffId).toBe(ids[6])
})
it('PR07 soggetti: ragione sociale, versione e origine corretta anche nel dettaglio espanso', () => {
  const html = render(<SubjectValues subjects={subjects} ownLevel="SERVICE_ACTIVITY" />)
  expect(html).not.toMatch(uuid)
  expect(html).toContain('Cliente storico')
  expect(html).toContain('Ereditato')
  expect(html).toContain('Viaggio · Aurora · Genova')
  expect(html).toContain('Apertura:')
  expect(html).toContain('Chiusura: Aperta')
})
it('PR07 anteprima comune usa riferimenti proiettati anche nei titoli, preservando valori tecnici e contesto', () => {
  const html = render(
    <PortConfirmation
      preview={preview}
      disabled={false}
      revision="2"
      onConfirm={noop}
      onCancel={noop}
      onPage={noop}
    />,
  )
  expect(html).not.toMatch(uuid)
  expect(html).toContain('Componente Entrata · Aurora storica · Genova')
  expect(html).toContain('Versione nave')
  expect(html).toContain('Aurora storica')
  expect(html).toContain('Aurora futura')
  expect(html).toContain('01/06/2026 12:00 (+02:00)')
  expect(effect.changes[0].before).toBe(ids[5])
  expect(preview.context).toEqual(context)
})
it('PR07 prestazione prima/dopo: permanenza e versione applicata leggibili, etichette del contratto specifico', () => {
  const before = {
    id,
    vesselId: id,
    vesselVersionId: ids[5],
    vesselName: 'Aurora storica',
    moment,
    executionStatus: 'PLANNED' as const,
    description: 'Assistenza',
    base: '1234.56',
    notes: null,
    context: {
      status: 'IN_PORT' as const,
      voyageId: ids[3],
      portCallId: ids[4],
      berthStayId: ids[14],
      portId: ids[4],
      berthId: ids[14],
      references: {
        voyage: origin,
        visit: { ...origin, name: 'Visita · Genova' },
        stay: { ...origin, name: 'Ormeggio · Molo' },
      },
    },
    portVersionId: ids[13],
    portName: 'Genova',
    berthVersionId: ids[15],
    berthName: 'Molo',
    specified: { customerId: null, agencyId: null },
    subjects,
    category: 'FREE' as const,
    serviceTypeId: null,
    calculation: null,
    references: op.endpoint.references,
  }
  const p: ServiceChangePreviewDto = {
    previewId: id,
    operation: 'UPDATE_FREE',
    context,
    generatedAtUtc: moment.utc,
    expiresAtUtc: preview.expiresAtUtc,
    before,
    after: { ...before, notes: 'Nota aggiornata' },
    changedFields: ['notes', 'context', 'subjects', 'vesselVersionId'],
    blockers: [],
  }
  const html = render(<ServicePreview preview={p} obsolete={false} expired={false} />)
  expect(html).not.toMatch(uuid)
  for (const text of [
    'Note',
    'Permanenza',
    'Soggetti effettivi',
    'Versione nave',
    'Viaggio · Aurora',
    'Visita · Genova',
    'Ormeggio · Molo',
    'Cliente storico',
  ])
    expect(html).toContain(text)
})
it('PR07 configurazioni e riepilogo: tipologie italiane, scaglioni e quantità funzionali conservati', () => {
  const html = render(
    <ConfigurationDetails
      configurations={(['STANDARD', 'PASSENGER', 'ADM'] as const).map((vesselTypeId) => ({
        id,
        vesselTypeId,
        brackets: [{ id: ids[8], upperLimit: 5000, value: '1234.56' }],
        extraWidth: 100,
        extraValue: '10',
      }))}
    />,
  )
  expect(html).toContain('Nave normale')
  expect(html).not.toContain('STANDARD')
  expect(html).toContain('5.000')
  expect(html).toContain('1.234,56')
})
it('PR07 riferimento scaglione contestualizzato rispetta entrambe le notazioni', () => {
  const ref = {
    configuration: true as const,
    vesselTypeId: 'PASSENGER' as const,
    tariff: version('TARIFF', 'Genova'),
    upperLimit: 5000,
    value: '1234.56',
  }
  expect(referenceText(ref, italian)).toContain(
    'Nave passeggeri · Scaglione fino a 5.000 incluso · 1.234,56 EUR',
  )
  expect(referenceText(ref, english)).toContain('5,000 incluso · 1,234.56 EUR')
  expect(render(<CalculationReferences value={calculation} />)).not.toMatch(uuid)
})
it('PR07 riferimenti mancanti ed effetti inattesi restano visibili con diagnostica tecnica', () => {
  expect(referenceText(null)).toBe('Riferimento non disponibile')
  const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const change = { field: 'nuovoCampo', before: null, after: id }
  const e = { ...effect, changes: [change] }
  expect(effectFieldLabel(e.reference.kind, change.field)).toBe('Altro dato modificato')
  expect(effectFieldLabel(e.reference.kind, 'constructor')).toBe('Altro dato modificato')
  expect(effectValue(e, change, 'after', italian)).toBe('Valore non disponibile')
  expect(log).toHaveBeenCalled()
  expect(
    log.mock.calls.flatMap((c) => c).some((c) => typeof c === 'object' && c?.value === id),
  ).toBe(true)
})
it('PR07 confine PR08: oggetto opaco marcato dal produttore, effetto visibile e payload originale conservato', () => {
  const change = {
    field: 'subjects',
    before: null,
    after: JSON.stringify(subjects),
    structured: true,
  }
  const e = {
    ...effect,
    reference: { ...effect.reference, kind: 'SERVICE_ACTIVITY' as const },
    changes: [change],
  }
  expect(effectValue(e, change, 'after', italian)).toBe(
    'Dati presenti · confronto dettagliato non disponibile',
  )
  expect(change.after).toContain(ids[1])
  expect(serviceFieldLabel('subjects')).toBe('Soggetti effettivi')
  const html = render(
    <PortConfirmation
      preview={{ ...preview, effects: { ...preview.effects, items: [e] } }}
      disabled={false}
      revision="2"
      onConfirm={noop}
      onCancel={noop}
      onPage={noop}
    />,
  )
  expect(html).toContain('Soggetti effettivi')
  expect(html).toContain('confronto dettagliato non disponibile')
  expect(html).not.toMatch(uuid)
})

it('PR07 recupero PR02: proiezioni diverse o assenti non cambiano la verifica dei valori autorevoli', () => {
  const observed = {
    ...op,
    endpoint: { ...op.endpoint, references: undefined },
    charges: op.charges.map((c) => ({
      ...c,
      calculation: { ...c.calculation, references: undefined },
      subjects: {
        customer: c.subjects.customer ? { ...c.subjects.customer, description: undefined } : null,
        agency: null,
      },
    })),
  }
  expect(operationCorrectionOutcome(op, op, observed, context, context)).toBe('APPLIED')
  expect(operationDeletionOutcome(op, observed, context, context)).toBe('UNCHANGED')
  expect(
    operationDeletionOutcome(op, { ...observed, notes: 'Variazione reale' }, context, context),
  ).toBe('CONFLICT')
  expect(operationDeletionOutcome(op, observed, context, { ...context, sessionId: ids[19] })).toBe(
    'CONFLICT',
  )
})
