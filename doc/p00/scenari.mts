import type {
  ArchiveContextDto,
  ApplicationResult,
  ChangePreviewDto,
  CommandRequest,
  CreateOperationDto,
  CreateServiceDto,
  CreatePortDto,
  LocalMinute,
  ResolvedMomentDto,
  SpecifiedSubjectsDto,
} from './contratti.js'

/** Dati di specifica deterministici. Nessun dato viene inserito nell'applicazione. */
export const ids = {
  archive: '00000000-0000-4000-8000-000000000001',
  sessionA: '00000000-0000-4000-8000-000000000002',
  sessionB: '00000000-0000-4000-8000-000000000003',
  vessel: '00000000-0000-4000-8000-000000000010',
  portA: '00000000-0000-4000-8000-000000000020',
  portB: '00000000-0000-4000-8000-000000000021',
  berthA: '00000000-0000-4000-8000-000000000030',
  berthB: '00000000-0000-4000-8000-000000000031',
  customerC: '00000000-0000-4000-8000-000000000040',
  customerD: '00000000-0000-4000-8000-000000000041',
  agencyA: '00000000-0000-4000-8000-000000000050',
  agencyB: '00000000-0000-4000-8000-000000000051',
  serviceType: '00000000-0000-4000-8000-000000000060',
} as const

export const initialContext = {
  archiveId: ids.archive,
  sessionId: ids.sessionA,
  revision: '7',
} as const satisfies ArchiveContextDto

export const portInputs = [
  { name: 'Porto A', locality: 'Genova', countryCode: 'IT', initialZoneId: 'Europe/Rome' },
  { name: 'Porto B', locality: 'Savona', countryCode: 'IT', initialZoneId: 'Europe/Rome' },
] as const satisfies readonly CreatePortDto[]

export const timeline = [
  {
    operationType: 'ENTRY',
    vesselId: ids.vessel,
    executionStatus: 'PERFORMED',
    occurrence: { localDateTime: '2026-11-10T08:00', selectedOffset: null },
    destination: { portId: ids.portA, berthId: ids.berthA },
    specifiedSubjects: { customerId: null, agencyId: null },
    notes: null,
  },
  {
    operationType: 'MOVEMENT',
    vesselId: ids.vessel,
    executionStatus: 'PERFORMED',
    departure: { localDateTime: '2026-11-10T10:00', selectedOffset: null },
    arrival: { localDateTime: '2026-11-10T11:00', selectedOffset: null },
    destination: { portId: ids.portB, berthId: ids.berthB },
    interpretationPortId: null,
    specifiedSubjects: { customerId: null, agencyId: null },
    notes: null,
  },
  {
    operationType: 'EXIT',
    vesselId: ids.vessel,
    executionStatus: 'PERFORMED',
    occurrence: { localDateTime: '2026-11-10T12:00', selectedOffset: null },
    interpretationPortId: null,
    specifiedSubjects: { customerId: null, agencyId: null },
    notes: null,
  },
] as const satisfies readonly CreateOperationDto[]

export const freeService = {
  category: 'FREE',
  vesselId: ids.vessel,
  moment: { localDateTime: '2026-11-10T09:00', selectedOffset: null },
  interpretationPortId: null,
  executionStatus: 'PLANNED',
  specifiedSubjects: { customerId: null, agencyId: null },
  notes: null,
  description: 'Assistenza straordinaria',
  manualBaseAmount: '125.50',
} as const satisfies CreateServiceDto

export const catalogService = {
  category: 'CATALOG',
  vesselId: ids.vessel,
  moment: { localDateTime: '2026-11-10T09:15', selectedOffset: null },
  interpretationPortId: null,
  executionStatus: 'PERFORMED',
  specifiedSubjects: { customerId: null, agencyId: null },
  notes: null,
  serviceTypeId: ids.serviceType,
} as const satisfies CreateServiceDto

export const createServiceRequest = {
  context: initialContext,
  payload: freeService,
} as const satisfies CommandRequest<CreateServiceDto>

export const readyPreviewExample = {
  previewId: '00000000-0000-4000-8000-000000000070',
  operation: 'CREATE_SERVICE',
  context: initialContext,
  generatedAtUtc: '2026-11-10T08:00:00.000Z',
  expiresAtUtc: '2026-11-10T08:15:00.000Z',
  summary: { created: 1, updated: 0, deleted: 0, reattributed: 0, recalculated: 0 },
  effects: {
    items: [
      {
        reference: {
          kind: 'SERVICE_ACTIVITY',
          id: '00000000-0000-4000-8000-000000000071',
          label: 'Assistenza straordinaria',
        },
        action: 'CREATE',
        changes: [{ field: 'manualBaseAmount', before: null, after: '125.50' }],
      },
    ],
    total: 1,
    page: 1,
    pageSize: 50,
  },
  warnings: [],
  status: 'READY',
  resolved: { category: 'FREE' },
  blockers: [],
} as const satisfies ChangePreviewDto<{ category: 'FREE' }>

export const staleSessionResponse = {
  ok: false,
  context: null,
  error: {
    code: 'ARCHIVE_SESSION_CHANGED',
    message: 'L’archivio aperto è cambiato. Ricarica la vista prima di continuare.',
    fields: [],
    conflicts: [],
  },
} as const satisfies ApplicationResult<never>

export const decimalCases = [
  { id: 'NUM-01', task: 'P02', amount: '0.01', weight: '0.5', expected: '0.01' },
  { id: 'NUM-02', task: 'P02', amount: '2.675', weight: '1', expected: '2.68' },
  { id: 'NUM-03', task: 'P02', amount: '2.674', weight: '1', expected: '2.67' },
  { id: 'NUM-04', task: 'P02', amount: '0', weight: '1.123456789012345678901', expected: '0.00' },
  {
    id: 'NUM-05',
    task: 'P02',
    amount: '100',
    weight: '1.0000000000000000000001',
    expected: '100.00',
  },
] as const

export const bracketCases = [
  {
    id: 'TAR-01',
    task: 'P09',
    size: 2100,
    lastLimit: 1600,
    extraWidth: 200,
    lastValue: '100',
    extraValue: '5',
    weight: '1.5',
    expected: { extraCount: 3, tariffValue: '115', base: '172.50' },
  },
  {
    id: 'TAR-02',
    task: 'P09',
    size: 1600,
    lastLimit: 1600,
    extraWidth: 200,
    lastValue: '100',
    extraValue: '5',
    weight: '1',
    expected: { extraCount: 0, tariffValue: '100', base: '100.00' },
  },
  {
    id: 'TAR-03',
    task: 'P09',
    size: 1601,
    lastLimit: 1600,
    extraWidth: 200,
    lastValue: '100',
    extraValue: '5',
    weight: '1',
    expected: { extraCount: 1, tariffValue: '105', base: '105.00' },
  },
  {
    id: 'TAR-04',
    task: 'P09',
    size: 9007199254740991,
    lastLimit: 0,
    extraWidth: 2,
    lastValue: '0',
    extraValue: '0.01',
    weight: '1',
    expected: {
      extraCount: 4503599627370496,
      tariffValue: '45035996273704.96',
      base: '45035996273704.96',
    },
  },
] as const

interface TimeCase {
  id: string
  task: 'P02'
  localDateTime: LocalMinute
  zoneId: string
  candidates: readonly ResolvedMomentDto[]
}

export const timeCases = [
  {
    id: 'TEM-01',
    task: 'P02',
    localDateTime: '2026-11-10T09:00',
    zoneId: 'Europe/Rome',
    candidates: [
      {
        localDateTime: '2026-11-10T09:00',
        zoneId: 'Europe/Rome',
        offset: '+01:00',
        utc: '2026-11-10T08:00:00.000Z',
      },
    ],
  },
  {
    id: 'TEM-02',
    task: 'P02',
    localDateTime: '2026-03-29T02:30',
    zoneId: 'Europe/Rome',
    candidates: [],
  },
  {
    id: 'TEM-03',
    task: 'P02',
    localDateTime: '2026-10-25T02:30',
    zoneId: 'Europe/Rome',
    candidates: [
      {
        localDateTime: '2026-10-25T02:30',
        zoneId: 'Europe/Rome',
        offset: '+02:00',
        utc: '2026-10-25T00:30:00.000Z',
      },
      {
        localDateTime: '2026-10-25T02:30',
        zoneId: 'Europe/Rome',
        offset: '+01:00',
        utc: '2026-10-25T01:30:00.000Z',
      },
    ],
  },
  {
    id: 'TEM-04',
    task: 'P02',
    localDateTime: '2026-11-10T09:00',
    zoneId: 'Asia/Kathmandu',
    candidates: [
      {
        localDateTime: '2026-11-10T09:00',
        zoneId: 'Asia/Kathmandu',
        offset: '+05:45',
        utc: '2026-11-10T03:15:00.000Z',
      },
    ],
  },
] as const satisfies readonly TimeCase[]

export const transferTimeCases = [
  {
    id: 'TEM-05',
    task: 'P12',
    departure: { localDateTime: '2026-01-15T10:00', zoneId: 'Europe/Rome' },
    arrival: { localDateTime: '2026-01-15T09:30', zoneId: 'Europe/London' },
    expectedUtcOrder: -1,
  },
  {
    id: 'TEM-06',
    task: 'P12',
    departure: { localDateTime: '2026-01-15T10:00', zoneId: 'Europe/Rome' },
    arrival: { localDateTime: '2026-01-15T09:00', zoneId: 'Europe/London' },
    expectedUtcOrder: 0,
  },
] as const

/** Questi casi definiscono attese future: P00 non implementa il risolutore operativo. */
export const contextCases = [
  {
    id: 'CTX-01',
    task: 'P14',
    localDateTime: '2026-11-10T07:59',
    expected: 'OPERATIONAL_CONTEXT_MISSING',
  },
  { id: 'CTX-02', task: 'P14', localDateTime: '2026-11-10T08:00', expected: ids.portA },
  { id: 'CTX-03', task: 'P14', localDateTime: '2026-11-10T10:00', expected: ids.portA },
  {
    id: 'CTX-04',
    task: 'P14',
    localDateTime: '2026-11-10T10:30',
    expected: 'OPERATIONAL_CONTEXT_MISSING',
  },
  { id: 'CTX-05', task: 'P14', localDateTime: '2026-11-10T11:00', expected: ids.portB },
  { id: 'CTX-06', task: 'P14', localDateTime: '2026-11-10T12:00', expected: ids.portB },
  {
    id: 'CTX-07',
    task: 'P14',
    localDateTime: '2026-11-10T12:01',
    expected: 'OPERATIONAL_CONTEXT_MISSING',
  },
] as const

export const assignmentCases = [
  {
    id: 'SOG-01',
    task: 'P13',
    voyage: { customerId: ids.customerC, agencyId: null },
    portCall: { customerId: null, agencyId: ids.agencyA },
    berthStay: { customerId: ids.customerD, agencyId: null },
    service: { customerId: null, agencyId: ids.agencyB },
    expected: {
      customerId: ids.customerD,
      customerSource: 'BERTH_STAY',
      agencyId: ids.agencyB,
      agencySource: 'SERVICE_ACTIVITY',
    },
  },
  {
    id: 'SOG-02',
    task: 'P13',
    voyage: { customerId: ids.customerC, agencyId: null },
    portCall: { customerId: null, agencyId: ids.agencyA },
    berthStay: { customerId: null, agencyId: null },
    service: { customerId: null, agencyId: null },
    expected: {
      customerId: ids.customerC,
      customerSource: 'VOYAGE',
      agencyId: ids.agencyA,
      agencySource: 'PORT_CALL',
    },
  },
] as const satisfies readonly {
  id: string
  task: 'P13'
  voyage: SpecifiedSubjectsDto
  portCall: SpecifiedSubjectsDto
  berthStay: SpecifiedSubjectsDto
  service: SpecifiedSubjectsDto
  expected: { customerId: string; customerSource: string; agencyId: string; agencySource: string }
}[]

export const sessionCases = [
  {
    id: 'ARC-01',
    task: 'P01',
    given: 'Richiesta nata in A; apertura di un altro file prima dell’esecuzione.',
    request: initialContext,
    active: { ...initialContext, sessionId: ids.sessionB },
    expected: 'ARCHIVE_SESSION_CHANGED',
  },
  {
    id: 'ARC-02',
    task: 'P01',
    given: 'Salva con nome conserva archivio e revisione, ma cambia sessione.',
    request: initialContext,
    active: { ...initialContext, sessionId: ids.sessionB },
    expected: 'ARCHIVE_SESSION_CHANGED',
  },
  {
    id: 'ARC-03',
    task: 'P01',
    given: 'Una scrittura è stata confermata dopo la lettura del form.',
    request: initialContext,
    active: { ...initialContext, revision: '8' },
    expected: 'REVISION_CONFLICT',
  },
] as const

interface FutureScenario {
  id: string
  task: string
  source: string
  given: string
  when: string
  then: string
}

export const futureScenarios = [
  {
    id: 'ANA-01',
    task: 'P04',
    source: 'CU-ANA-04…06',
    given: 'Porto con versione iniziale e una futura.',
    when: 'Consulto prima e al minuto della decorrenza.',
    then: 'Prima vale l’iniziale, al confine vale la nuova; iniziale non eliminabile.',
  },
  {
    id: 'ANA-02',
    task: 'P04',
    source: 'Modello 3.10.8',
    given: 'Nome Porto A già usato, poi corretto nella stessa versione.',
    when: 'Creo un’altra identità con quel nome nella stessa località e paese.',
    then: 'DUPLICATE_IDENTIFIER: la prenotazione storica rimane.',
  },
  {
    id: 'ANA-03',
    task: 'P05',
    source: 'CU-ANA-10',
    given: 'Porto A contiene una banchina; Porto B non ne contiene.',
    when: 'Sposto la banchina in B oppure elimino A.',
    then: 'Appartenenza immutabile; eliminazione porto bloccata senza cascade.',
  },
  {
    id: 'ANA-04',
    task: 'P06',
    source: 'CU-ANA-07…08',
    given: 'Cliente disattivato già usato da una prestazione.',
    when: 'Modifico altri dati e poi tento di creare un nuovo riferimento.',
    then: 'Riferimento precedente conservabile; nuovo riferimento NOT_SELECTABLE.',
  },
  {
    id: 'ANA-05',
    task: 'P07',
    source: 'Modello 3.10.8',
    given: 'IMO storico di Nave A successivamente sostituito.',
    when: 'Assegno lo stesso IMO a Nave B.',
    then: 'DUPLICATE_IDENTIFIER finché esiste l’identità Nave A.',
  },
  {
    id: 'ANA-06',
    task: 'P04',
    source: 'Modello 3.9.6',
    given: 'Anagrafica con ultimo progressivo 8, senza riferimenti.',
    when: 'La elimino e ne creo un’altra.',
    then: 'Il nuovo progressivo è 9; il valore 8 non viene riutilizzato.',
  },
  {
    id: 'CAT-01',
    task: 'P08',
    source: 'CU-PRE-03…06',
    given: 'Catalogo vuoto dopo eliminazione legittima del tipo iniziale.',
    when: 'Riapro il file.',
    then: 'Il rinforzo ormeggio non viene ricreato dal bootstrap.',
  },
  {
    id: 'CAT-02',
    task: 'P15',
    source: 'CU-PRE-06',
    given: 'Tipo usato da una prestazione poi eliminata.',
    when: 'Elimino il tipo.',
    then: 'REFERENCE_IN_USE: hasEverBeenUsed resta true.',
  },
  {
    id: 'CAT-03',
    task: 'P08',
    source: 'CU-PRE-03…04',
    given: 'Tipo con descrizione Rinforzo.',
    when: 'Lo rinomino Assistenza e creo un tipo Rinforzo.',
    then: 'Consentito; le descrizioni liberate del catalogo non restano prenotate.',
  },
  {
    id: 'OPN-01',
    task: 'P10',
    source: 'CU-OPN-02',
    given: 'Nave fuori da un viaggio, tariffa valida.',
    when: 'Registro entrata MISSED.',
    then: 'Componente economica registrata, nessun viaggio/visita/ormeggio aperto.',
  },
  {
    id: 'OPN-02',
    task: 'P12',
    source: 'Modello 3.12.12',
    given: 'Nave nel Porto A, destinazione Porto B.',
    when: 'Registro uno spostamento valido.',
    then: 'Stesso viaggio, nuova visita, due componenti EXIT/ENTRY con contesti e calcoli autonomi.',
  },
  {
    id: 'OPN-03',
    task: 'P11',
    source: 'Modello 3.12.8',
    given: 'Un estremo operativo della nave occupa il minuto UTC X.',
    when: 'Registro un secondo estremo MISSED allo stesso minuto UTC.',
    then: 'OPERATION_MINUTE_CONFLICT; nessun nuovo dato persistito.',
  },
  {
    id: 'PRE-01',
    task: 'P14',
    source: 'CU-PRE-08',
    given: 'Contesto valido con banchina non specificata.',
    when: 'Registro FREE con base 0.00 oppure senza descrizione.',
    then: 'VALIDATION_ERROR; una FREE valida con base positiva è ammessa anche senza soggetti.',
  },
  {
    id: 'PRE-02',
    task: 'P15',
    source: 'CU-PRE-07',
    given: 'Tipo attivo ma nessuna tariffa applicabile.',
    when: 'Registro CATALOG.',
    then: 'TARIFF_NOT_FOUND; nessuna prestazione o calcolo parziale.',
  },
  {
    id: 'PRE-03',
    task: 'P16',
    source: 'CU-PRE-09',
    given: 'Prestazione PLANNED e relativa data già trascorsa.',
    when: 'Riapro il file senza consuntivarla.',
    then: 'Rimane PLANNED; il tempo non cambia lo stato.',
  },
  {
    id: 'PRE-04',
    task: 'P16',
    source: 'CU-PRE-10',
    given: 'Prestazione FREE esistente.',
    when: 'Invio una sostituzione CATALOG mantenendo lo stesso ID.',
    then: 'VALIDATION_ERROR; categoria immutabile.',
  },
  {
    id: 'PRE-05',
    task: 'P16',
    source: 'CU-PRE-12',
    given: 'Prestazione con contesto e calcolo già salvati.',
    when: 'Modifico soltanto le note.',
    then: 'Note e timestamp/revisione aggiornati; nessun ricalcolo o riattribuzione.',
  },
  {
    id: 'PRE-06',
    task: 'P16',
    source: 'Requisiti 2.15, prestazioni mancate',
    given: 'Base 100.00 e nessuna regola dinamica configurabile nel rilascio.',
    when: 'La prestazione diventa MISSED.',
    then: 'La base rimane 100.00, senza azzeramenti automatici o importo finale di fattura inventato.',
  },
  {
    id: 'IMP-01',
    task: 'P17A',
    source: 'CU-PER-08',
    given: 'Entrata che fornisce il contesto a una prestazione.',
    when: 'Consuntivo l’entrata come MISSED.',
    then: 'Anteprima BLOCKED; nessuna modifica se la prestazione resterebbe orfana.',
  },
  {
    id: 'IMP-02',
    task: 'P01',
    source: 'Decisione P00-D04',
    given: 'Anteprima READY generata alla revisione 7.',
    when: 'Confermo dopo una scrittura che porta la revisione a 8.',
    then: 'REVISION_CONFLICT; nessuna applicazione dei vecchi effetti.',
  },
  {
    id: 'IMP-03',
    task: 'P17B',
    source: 'CU-OPN-08',
    given: 'Cronologia e prestazioni coerenti.',
    when: 'Un ricalcolo fallisce dopo l’inserimento retroattivo di un’operazione.',
    then: 'Rollback di operazione, gerarchia, attribuzioni, soggetti, importi e revisione.',
  },
  {
    id: 'TAR-05',
    task: 'P18',
    source: 'CU-TAR-04',
    given: 'Prima tariffa già necessaria a un’operazione.',
    when: 'La elimino lasciando l’operazione senza tariffa.',
    then: 'Anteprima BLOCKED e nessuna modifica.',
  },
  {
    id: 'PES-01',
    task: 'P19',
    source: 'CU-TAR-08',
    given: 'Peso iniziale 1 e nuovo peso 2 dalla decorrenza X.',
    when: 'Ricalcolo attività prima e al minuto X.',
    then: 'Prima vale 1, a X vale 2; basi FREE e override espliciti restano invariati.',
  },
  {
    id: 'ARC-04',
    task: 'P01',
    source: 'Decisione P00-D04',
    given: 'Copia di backup completata senza modificare i dati.',
    when: 'Rileggo contesto e revisione.',
    then: 'Sessione e revisione invariate; la copia non è attivata.',
  },
  {
    id: 'ARC-05',
    task: 'P20',
    source: 'Scenario S8 del piano',
    given: 'Archivio v1 valido e archivio con schema futuro.',
    when: 'Apro i due file con la nuova applicazione.',
    then: 'V1 migrato con copia preventiva; futuro rifiutato senza alterazioni.',
  },
] as const satisfies readonly FutureScenario[]
