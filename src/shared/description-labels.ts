import type { EntityKind } from './contracts/application'
import type { BaseCalculationDto } from './contracts/tariffs'
import type { ServiceActivityDto } from './contracts/services'
import type { AssignmentLevel } from './contracts/assignments'
import type { VesselTypeId } from './contracts/vessels'
import type { ExecutionStatus, OperationEndpointDto } from './contracts/operations'
export const operationLabels = {
  ENTRY: 'Entrata',
  EXIT: 'Uscita',
  MOVEMENT: 'Spostamento',
} satisfies Record<import('./contracts/catalog').OperationType, string>
export const vesselTypeLabels = {
  STANDARD: 'Nave normale',
  PASSENGER: 'Nave passeggeri',
  ADM: 'Nave ADM',
} satisfies Record<VesselTypeId, string>
export const executionLabels = {
  PLANNED: 'Prevista',
  PERFORMED: 'Effettuata',
  MISSED: 'Mancata',
} satisfies Record<ExecutionStatus, string>
export const endpointLabels = {
  OCCURRENCE: 'Evento',
  DEPARTURE: 'Partenza',
  ARRIVAL: 'Arrivo',
} satisfies Record<OperationEndpointDto['role'], string>
export const assignmentLabels = {
  SERVICE_ACTIVITY: 'Prestazione',
  VOYAGE: 'Viaggio',
  PORT_CALL: 'Visita',
  BERTH_STAY: 'Ormeggio',
  VESSEL_OPERATION: 'Operazione',
} satisfies Record<AssignmentLevel, string>
export const entityLabels = {
  PORT: 'Porto',
  BERTH: 'Banchina',
  CUSTOMER: 'Cliente',
  AGENCY: 'Agenzia',
  VESSEL: 'Nave',
  SERVICE_TYPE: 'Tipo di prestazione',
  TARIFF: 'Tariffa',
  WEIGHT_VERSION: 'Peso',
  VESSEL_OPERATION: 'Operazione',
  OPERATION_CHARGE: 'Componente',
  VOYAGE: 'Viaggio',
  PORT_CALL: 'Visita',
  BERTH_STAY: 'Ormeggio',
  SERVICE_ACTIVITY: 'Prestazione',
} satisfies Record<EntityKind, string>
const interval = {
  effectiveFrom: 'Inizio (UTC)',
  effectiveTo: 'Fine esclusa (UTC)',
  effectiveMoment: 'Decorrenza locale, fuso e offset',
}
const lifecycle = { status: 'Stato', selectable: 'Selezionabile' }
const subjects = {
  customerId: 'Cliente esplicito',
  agencyId: 'Agenzia esplicita',
  customer: 'Cliente effettivo e fonte',
  agency: 'Agenzia effettiva e fonte',
}
export const calculationFieldLabels = {
  portId: 'Porto economico',
  vesselId: 'Nave',
  vesselVersionId: 'Versione nave',
  vesselName: 'Nome nave',
  vesselTypeId: 'Tipologia nave',
  size: 'Dimensione',
  moment: 'Momento',
  activity: 'Attività tariffata',
  tariffId: 'Tariffa applicata',
  tariffEffectiveFrom: 'Decorrenza tariffa (UTC)',
  configurationId: 'Configurazione tariffaria',
  bracketId: 'Scaglione',
  upperLimit: 'Limite ordinario',
  ordinaryValue: 'Valore ordinario (EUR)',
  extraWidth: 'Ampiezza extra',
  extraValue: 'Valore extra (EUR)',
  extraCount: 'Numero extra',
  tariffValue: 'Valore tariffario (EUR)',
  weightSequenceId: 'Sequenza peso',
  weightVersionId: 'Versione peso',
  weight: 'Peso',
  base: 'Base calcolata (EUR)',
  steps: 'Traccia di calcolo',
} satisfies Record<Exclude<keyof BaseCalculationDto, 'references'>, string>
export const serviceFieldLabels = {
  id: 'Prestazione',
  category: 'Categoria',
  vesselId: 'Nave',
  vesselVersionId: 'Versione nave',
  vesselName: 'Nome nave',
  moment: 'Momento',
  executionStatus: 'Stato',
  description: 'Descrizione',
  base: 'Importo base (EUR)',
  notes: 'Note',
  context: 'Permanenza',
  portVersionId: 'Versione porto',
  portName: 'Porto',
  berthVersionId: 'Versione banchina',
  berthName: 'Banchina',
  specified: 'Soggetti espliciti',
  subjects: 'Soggetti effettivi',
  serviceTypeId: 'Tipo di prestazione',
  calculation: 'Calcolo teorico e riferimenti',
} satisfies Record<Exclude<keyof ServiceActivityDto, 'references'>, string>
const replayFields = {
  Identità: 'Identità',
  Nave: 'Nave',
  Viaggio: 'Viaggio',
  Visita: 'Visita',
  Ormeggio: 'Ormeggio',
  Porto: 'Porto',
  Banchina: 'Banchina',
  'Operazione di apertura': 'Operazione di apertura',
  'Operazione di chiusura': 'Operazione di chiusura',
  'Banchina di destinazione': 'Banchina di destinazione',
  'Cliente effettivo e fonte': 'Cliente effettivo e fonte',
  'Agenzia effettiva e fonte': 'Agenzia effettiva e fonte',
}
const operationFields = {
  ...replayFields,
  ...calculationFieldLabels,
  ...subjects,
  status: 'Stato',
  executionStatus: 'Stato',
  moment: 'Momento (UTC)',
  startedAt: 'Inizio (UTC)',
  endedAt: 'Fine (UTC)',
  calculatedBase: 'Base calcolata (EUR)',
  manualOverride: 'Sostituzione manuale (EUR)',
  effectiveBase: 'Base effettiva (EUR)',
  manualOverrideAmount: 'Sostituzione manuale (EUR)',
  versionId: 'Versione applicata',
  portVersionId: 'Versione porto',
  berthVersionId: 'Versione banchina',
  port: 'Porto',
  berth: 'Banchina',
  arrival: 'Arrivo',
  destinationPort: 'Porto di destinazione',
  destinationBerth: 'Banchina di destinazione',
  Tipologia: 'Tipologia operazione',
  Arrivo: 'Arrivo',
  'Porto di destinazione': 'Porto di destinazione',
  Note: 'Note',
  notes: 'Note',
  openingOperationId: 'Operazione di apertura',
  closingOperationId: 'Operazione di chiusura',
  voyageId: 'Viaggio',
  portCallId: 'Visita',
  berthStayId: 'Ormeggio',
}
const fields = {
  PORT: {
    ...interval,
    ...lifecycle,
    name: 'Nome',
    locality: 'Località',
    countryCode: 'Paese',
    port: 'Porto',
  },
  BERTH: { ...interval, ...lifecycle, name: 'Nome', berth: 'Banchina' },
  CUSTOMER: { ...interval, ...lifecycle, businessName: 'Ragione sociale', customer: 'Cliente' },
  AGENCY: { ...interval, ...lifecycle, businessName: 'Ragione sociale', agency: 'Agenzia' },
  VESSEL: {
    ...interval,
    ...lifecycle,
    registeredName: 'Nome di registrazione',
    imoNumber: 'IMO',
    vesselTypeId: 'Tipologia nave',
    size: 'Dimensione',
    vessel: 'Nave',
  },
  SERVICE_TYPE: { ...lifecycle, description: 'Descrizione' },
  TARIFF: { ...interval, configurations: 'Configurazioni tariffarie' },
  WEIGHT_VERSION: { ...interval, weight: 'Peso' },
  VESSEL_OPERATION: operationFields,
  OPERATION_CHARGE: operationFields,
  VOYAGE: { ...operationFields, name: 'Nome' },
  PORT_CALL: { ...operationFields, name: 'Nome' },
  BERTH_STAY: { ...operationFields, name: 'Nome' },
  SERVICE_ACTIVITY: { ...serviceFieldLabels, ...replayFields, port: 'Porto', berth: 'Banchina' },
} satisfies Record<EntityKind, Record<string, string>>
export function effectFieldLabel(kind: EntityKind, field: string): string {
  const label = Object.hasOwn(fields[kind], field)
    ? (fields[kind] as Record<string, string>)[field]
    : undefined
  if (label) return label
  console.warn('Campo di anteprima inatteso', { kind, field })
  return 'Altro dato modificato'
}
export function serviceFieldLabel(field: string): string {
  if (field === 'deleted') return 'Eliminazione definitiva'
  return effectFieldLabel('SERVICE_ACTIVITY', field)
}

export function knownEffectField(kind: EntityKind, field: string): boolean {
  return Object.hasOwn(fields[kind], field)
}
