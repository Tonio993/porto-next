import { sql } from 'drizzle-orm'
import { check, foreignKey, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const archiveMetadata = sqliteTable('archive_metadata', {
  singleton: integer('singleton').primaryKey(),
  id: text('id').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  // Read this int64 through CAST AS TEXT; Drizzle's number mapping would lose precision.
  revision: integer('revision').notNull().default(0),
})

export const companyTimeZone = sqliteTable('company_time_zone', {
  singleton: integer('singleton').primaryKey(),
  zoneId: text('zone_id').notNull(),
  effectiveFrom: text('effective_from'),
  confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(false),
})

export const portCodeCounter = sqliteTable('port_code_counter', {
  singleton: integer('singleton').primaryKey(),
  lastCode: integer('last_code').notNull(),
})

export const ports = sqliteTable('ports', {
  id: text('id').primaryKey(),
  code: integer('code').notNull().unique(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull(),
})

export const portVersions = sqliteTable(
  'port_versions',
  {
    id: text('id').primaryKey(),
    portId: text('port_id')
      .notNull()
      .references(() => ports.id),
    effectiveFrom: text('effective_from'),
    effectiveLocalDateTime: text('effective_local_date_time'),
    effectiveZoneId: text('effective_zone_id'),
    effectiveUtcOffset: text('effective_utc_offset'),
    name: text('name').notNull(),
    locality: text('locality').notNull(),
    countryCode: text('country_code').notNull(),
  },
  (table) => [
    uniqueIndex('port_versions_owner').on(table.id, table.portId),
    uniqueIndex('port_versions_initial')
      .on(table.portId)
      .where(sql`${table.effectiveFrom} IS NULL`),
    uniqueIndex('port_versions_effective')
      .on(table.portId, table.effectiveFrom)
      .where(sql`${table.effectiveFrom} IS NOT NULL`),
  ],
)

export const portIdentifierReservations = sqliteTable(
  'port_identifier_reservations',
  {
    id: text('id').primaryKey(),
    portId: text('port_id')
      .notNull()
      .references(() => ports.id),
    normalizedName: text('normalized_name').notNull(),
    normalizedLocality: text('normalized_locality').notNull(),
    countryCode: text('country_code').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('port_reservations_key').on(
      table.normalizedName,
      table.normalizedLocality,
      table.countryCode,
    ),
  ],
)

export const portTimeZones = sqliteTable(
  'port_time_zones',
  {
    id: text('id').primaryKey(),
    portId: text('port_id')
      .notNull()
      .references(() => ports.id),
    effectiveFrom: text('effective_from'),
    zoneId: text('zone_id').notNull(),
  },
  (table) => [
    uniqueIndex('port_time_zones_initial')
      .on(table.portId)
      .where(sql`${table.effectiveFrom} IS NULL`),
    uniqueIndex('port_time_zones_effective')
      .on(table.portId, table.effectiveFrom)
      .where(sql`${table.effectiveFrom} IS NOT NULL`),
  ],
)

export const customerCodeCounter = sqliteTable('customer_code_counter', {
  singleton: integer('singleton').primaryKey(),
  lastCode: integer('last_code').notNull(),
})
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  code: integer('code').notNull().unique(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull(),
})
export const customerVersions = sqliteTable(
  'customer_versions',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    businessName: text('business_name').notNull(),
    effectiveFrom: text('effective_from'),
    effectiveLocalDateTime: text('effective_local_date_time'),
    effectiveZoneId: text('effective_zone_id'),
    effectiveUtcOffset: text('effective_utc_offset'),
  },
  (table) => [
    uniqueIndex('customer_versions_initial')
      .on(table.customerId)
      .where(sql`${table.effectiveFrom} IS NULL`),
    uniqueIndex('customer_versions_effective')
      .on(table.customerId, table.effectiveFrom)
      .where(sql`${table.effectiveFrom} IS NOT NULL`),
  ],
)
export const customerIdentifierReservations = sqliteTable(
  'customer_identifier_reservations',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    normalizedBusinessName: text('normalized_business_name').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('customer_reservations_key').on(table.normalizedBusinessName)],
)

export const agencyCodeCounter = sqliteTable('agency_code_counter', {
  singleton: integer('singleton').primaryKey(),
  lastCode: integer('last_code').notNull(),
})
export const agencies = sqliteTable('agencies', {
  id: text('id').primaryKey(),
  code: integer('code').notNull().unique(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull(),
})
export const agencyVersions = sqliteTable(
  'agency_versions',
  {
    id: text('id').primaryKey(),
    agencyId: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    businessName: text('business_name').notNull(),
    effectiveFrom: text('effective_from'),
    effectiveLocalDateTime: text('effective_local_date_time'),
    effectiveZoneId: text('effective_zone_id'),
    effectiveUtcOffset: text('effective_utc_offset'),
  },
  (table) => [
    uniqueIndex('agency_versions_initial')
      .on(table.agencyId)
      .where(sql`${table.effectiveFrom} IS NULL`),
    uniqueIndex('agency_versions_effective')
      .on(table.agencyId, table.effectiveFrom)
      .where(sql`${table.effectiveFrom} IS NOT NULL`),
  ],
)
export const agencyIdentifierReservations = sqliteTable(
  'agency_identifier_reservations',
  {
    id: text('id').primaryKey(),
    agencyId: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    normalizedBusinessName: text('normalized_business_name').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('agency_reservations_key').on(table.normalizedBusinessName)],
)

export const vesselTypes = sqliteTable('vessel_types', {
  id: text('id', { enum: ['STANDARD', 'PASSENGER', 'ADM'] }).primaryKey(),
})

export const vesselCodeCounter = sqliteTable('vessel_code_counter', {
  singleton: integer('singleton').primaryKey(),
  lastCode: integer('last_code').notNull(),
})
export const vessels = sqliteTable('vessels', {
  id: text('id').primaryKey(),
  code: integer('code').notNull().unique(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull(),
})
export const vesselVersions = sqliteTable(
  'vessel_versions',
  {
    id: text('id').primaryKey(),
    vesselId: text('vessel_id')
      .notNull()
      .references(() => vessels.id),
    registeredName: text('registered_name').notNull(),
    imoNumber: text('imo_number'),
    vesselTypeId: text('vessel_type_id', { enum: ['STANDARD', 'PASSENGER', 'ADM'] })
      .notNull()
      .references(() => vesselTypes.id),
    size: integer('size').notNull(),
    effectiveFrom: text('effective_from'),
    effectiveLocalDateTime: text('effective_local_date_time'),
    effectiveZoneId: text('effective_zone_id'),
    effectiveUtcOffset: text('effective_utc_offset'),
  },
  (table) => [
    uniqueIndex('vessel_versions_owner').on(table.id, table.vesselId),
    uniqueIndex('vessel_versions_initial')
      .on(table.vesselId)
      .where(sql`${table.effectiveFrom} IS NULL`),
    uniqueIndex('vessel_versions_effective')
      .on(table.vesselId, table.effectiveFrom)
      .where(sql`${table.effectiveFrom} IS NOT NULL`),
  ],
)
export const vesselIdentifierReservations = sqliteTable(
  'vessel_identifier_reservations',
  {
    id: text('id').primaryKey(),
    vesselId: text('vessel_id')
      .notNull()
      .references(() => vessels.id),
    kind: text('kind', { enum: ['NAME', 'IMO'] }).notNull(),
    normalizedValue: text('normalized_value').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('vessel_reservations_key').on(table.kind, table.normalizedValue)],
)

export const serviceTypes = sqliteTable('service_types', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  normalizedDescription: text('normalized_description').notNull().unique(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull(),
  hasEverBeenUsed: integer('has_ever_been_used', { mode: 'boolean' }).notNull().default(false),
})
export const weightSequences = sqliteTable('weight_sequences', {
  id: text('id').primaryKey(),
  serviceTypeId: text('service_type_id')
    .unique()
    .references(() => serviceTypes.id),
  operationType: text('operation_type', { enum: ['ENTRY', 'EXIT', 'MOVEMENT'] }).unique(),
})
export const weightVersions = sqliteTable(
  'weight_versions',
  {
    id: text('id').primaryKey(),
    sequenceId: text('sequence_id')
      .notNull()
      .references(() => weightSequences.id),
    effectiveFrom: text('effective_from'),
    weight: text('weight').notNull(),
  },
  (table) => [
    uniqueIndex('weight_version_owner').on(table.id, table.sequenceId),
    uniqueIndex('weight_initial_unique')
      .on(table.sequenceId)
      .where(sql`${table.effectiveFrom} IS NULL`),
  ],
)

export const tariffs = sqliteTable(
  'tariffs',
  {
    id: text('id').primaryKey(),
    portId: text('port_id')
      .notNull()
      .references(() => ports.id),
    effectiveFrom: text('effective_from').notNull(),
    effectiveLocalDateTime: text('effective_local_date_time').notNull(),
    effectiveZoneId: text('effective_zone_id').notNull(),
    effectiveUtcOffset: text('effective_utc_offset').notNull(),
  },
  (table) => [uniqueIndex('tariffs_effective').on(table.portId, table.effectiveFrom)],
)
export const tariffConfigurations = sqliteTable(
  'tariff_configurations',
  {
    id: text('id').primaryKey(),
    tariffId: text('tariff_id')
      .notNull()
      .references(() => tariffs.id),
    vesselTypeId: text('vessel_type_id', { enum: ['STANDARD', 'PASSENGER', 'ADM'] })
      .notNull()
      .references(() => vesselTypes.id),
    extraWidth: integer('extra_width').notNull(),
    extraValue: text('extra_value').notNull(),
  },
  (table) => [
    uniqueIndex('tariff_configuration_owner').on(table.id, table.tariffId),
    uniqueIndex('tariff_configuration_type').on(table.tariffId, table.vesselTypeId),
  ],
)
export const tariffBrackets = sqliteTable(
  'tariff_brackets',
  {
    id: text('id').primaryKey(),
    configurationId: text('configuration_id')
      .notNull()
      .references(() => tariffConfigurations.id),
    upperLimit: integer('upper_limit').notNull(),
    value: text('value').notNull(),
  },
  (table) => [
    uniqueIndex('tariff_bracket_owner').on(table.id, table.configurationId),
    uniqueIndex('tariff_bracket_limit').on(table.configurationId, table.upperLimit),
  ],
)

// P05 persisted these tables through typed repositories; operations also reference them in Drizzle.
export const berths = sqliteTable(
  'berths',
  {
    id: text('id').primaryKey(),
    portId: text('port_id')
      .notNull()
      .references(() => ports.id),
    code: integer('code').notNull().unique(),
    status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull(),
  },
  (t) => [uniqueIndex('operation_berth_port').on(t.id, t.portId)],
)
export const berthVersions = sqliteTable(
  'berth_versions',
  {
    id: text('id').primaryKey(),
    berthId: text('berth_id')
      .notNull()
      .references(() => berths.id),
    name: text('name').notNull(),
    effectiveFrom: text('effective_from'),
    effectiveLocalDateTime: text('effective_local_date_time'),
    effectiveZoneId: text('effective_zone_id'),
    effectiveUtcOffset: text('effective_utc_offset'),
  },
  (t) => [
    uniqueIndex('berth_versions_owner').on(t.id, t.berthId),
    uniqueIndex('berth_versions_initial')
      .on(t.berthId)
      .where(sql`effective_from IS NULL`),
    uniqueIndex('berth_versions_effective')
      .on(t.berthId, t.effectiveFrom)
      .where(sql`effective_from IS NOT NULL`),
  ],
)

export const vesselOperations = sqliteTable(
  'vessel_operations',
  {
    id: text('id').primaryKey().notNull(),
    vesselId: text('vessel_id')
      .notNull()
      .references(() => vessels.id),
    vesselVersionId: text('vessel_version_id').notNull(),
    operationType: text('operation_type').notNull(),
    executionStatus: text('execution_status').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    check('vessel_operations_check_0', sql`operation_type IN ('ENTRY', 'EXIT', 'MOVEMENT')`),
    check('vessel_operations_check_1', sql`execution_status IN ('PLANNED', 'PERFORMED', 'MISSED')`),
    check('vessel_operations_check_2', sql`notes IS NULL OR length(notes) <= 10000`),
    uniqueIndex('vessel_operations_unique_3').on(table.id, table.vesselId),
    foreignKey({
      columns: [table.vesselVersionId, table.vesselId],
      foreignColumns: [vesselVersions.id, vesselVersions.vesselId],
    }),
  ],
)

export const operationEndpoints = sqliteTable(
  'operation_endpoints',
  {
    id: text('id').primaryKey().notNull(),
    operationId: text('operation_id').notNull(),
    vesselVersionId: text('vessel_version_id').notNull(),
    vesselId: text('vessel_id').notNull(),
    role: text('role').notNull(),
    portId: text('port_id')
      .notNull()
      .references(() => ports.id),
    portVersionId: text('port_version_id').notNull(),
    berthId: text('berth_id').references(() => berths.id),
    berthVersionId: text('berth_version_id'),
    localDateTime: text('local_date_time').notNull(),
    zoneId: text('zone_id').notNull(),
    utcOffset: text('utc_offset').notNull(),
    utc: text('utc').notNull(),
    utcMinute: text('utc_minute').generatedAlwaysAs(sql`substr(utc,1,16)`, { mode: 'stored' }),
  },
  (table) => [
    check('operation_endpoints_check_0', sql`role IN ('OCCURRENCE', 'DEPARTURE', 'ARRIVAL')`),
    uniqueIndex('operation_endpoints_unique_1').on(table.vesselId, table.utcMinute),
    uniqueIndex('operation_endpoints_unique_2').on(table.operationId, table.utc),
    uniqueIndex('operation_endpoints_role').on(table.operationId, table.role),
    foreignKey({
      columns: [table.vesselVersionId, table.vesselId],
      foreignColumns: [vesselVersions.id, vesselVersions.vesselId],
    }),
    check('operation_endpoints_check_3', sql`(berth_id IS NULL) = (berth_version_id IS NULL)`),
    foreignKey({
      columns: [table.operationId, table.vesselId],
      foreignColumns: [vesselOperations.id, vesselOperations.vesselId],
    }),
    foreignKey({
      columns: [table.portVersionId, table.portId],
      foreignColumns: [portVersions.id, portVersions.portId],
    }),
    foreignKey({
      columns: [table.berthId, table.portId],
      foreignColumns: [berths.id, berths.portId],
    }),
    foreignKey({
      columns: [table.berthVersionId, table.berthId],
      foreignColumns: [berthVersions.id, berthVersions.berthId],
    }),
  ],
)

export const operationCharges = sqliteTable(
  'operation_charges',
  {
    id: text('id').primaryKey().notNull(),
    operationId: text('operation_id')
      .notNull()
      .unique()
      .references(() => vesselOperations.id),
    chargeKind: text('charge_kind').notNull(),
    economicEndpointRole: text('economic_endpoint_role').notNull(),
    tariffId: text('tariff_id')
      .notNull()
      .references(() => tariffs.id),
    configurationId: text('configuration_id').notNull(),
    bracketId: text('bracket_id').notNull(),
    weightSequenceId: text('weight_sequence_id')
      .notNull()
      .references(() => weightSequences.id),
    weightVersionId: text('weight_version_id').notNull(),
    vesselVersionId: text('vessel_version_id')
      .notNull()
      .references(() => vesselVersions.id),
    vesselTypeId: text('vessel_type_id')
      .notNull()
      .references(() => vesselTypes.id),
    size: integer('size').notNull(),
    upperLimit: integer('upper_limit').notNull(),
    ordinaryValue: text('ordinary_value').notNull(),
    extraWidth: integer('extra_width').notNull(),
    extraValue: text('extra_value').notNull(),
    extraCount: integer('extra_count').notNull(),
    weight: text('weight').notNull(),
    tariffValueCents: integer('tariff_value_cents').notNull(),
    calculatedBaseCents: integer('calculated_base_cents').notNull(),
    manualOverrideCents: integer('manual_override_cents'),
    effectiveBaseCents: integer('effective_base_cents').notNull(),
    calculationSteps: text('calculation_steps').notNull(),
  },
  (table) => [
    check('operation_charges_check_0', sql`charge_kind IN ('ENTRY', 'EXIT', 'MOVEMENT')`),
    check(
      'operation_charges_check_1',
      sql`(charge_kind = 'MOVEMENT' AND economic_endpoint_role = 'DEPARTURE') OR (charge_kind IN ('ENTRY','EXIT') AND economic_endpoint_role = 'OCCURRENCE')`,
    ),
    foreignKey({
      columns: [table.operationId, table.economicEndpointRole],
      foreignColumns: [operationEndpoints.operationId, operationEndpoints.role],
    }),
    check('operation_charges_check_2', sql`size >= 0 AND size <= 9007199254740991`),
    check('operation_charges_check_3', sql`upper_limit >= 0`),
    check('operation_charges_check_4', sql`extra_width > 0`),
    check('operation_charges_check_5', sql`extra_count >= 0`),
    check('operation_charges_check_6', sql`tariff_value_cents >= 0`),
    check('operation_charges_check_7', sql`calculated_base_cents >= 0`),
    check('operation_charges_check_8', sql`manual_override_cents >= 0`),
    check('operation_charges_check_9', sql`effective_base_cents >= 0`),
    check('operation_charges_check_10', sql`json_valid(calculation_steps)`),
    check(
      'operation_charges_check_11',
      sql`effective_base_cents = coalesce(manual_override_cents, calculated_base_cents)`,
    ),
    foreignKey({
      columns: [table.configurationId, table.tariffId],
      foreignColumns: [tariffConfigurations.id, tariffConfigurations.tariffId],
    }),
    foreignKey({
      columns: [table.bracketId, table.configurationId],
      foreignColumns: [tariffBrackets.id, tariffBrackets.configurationId],
    }),
    foreignKey({
      columns: [table.weightVersionId, table.weightSequenceId],
      foreignColumns: [weightVersions.id, weightVersions.sequenceId],
    }),
  ],
)

export const voyages = sqliteTable(
  'voyages',
  {
    id: text('id').primaryKey().notNull(),
    vesselId: text('vessel_id')
      .notNull()
      .references(() => vessels.id),
    vesselVersionId: text('vessel_version_id').notNull(),
    openingOperationId: text('opening_operation_id').notNull().unique(),
    closingOperationId: text('closing_operation_id').unique(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
  },
  (table) => [
    check('voyages_check_0', sql`(closing_operation_id IS NULL) = (ended_at IS NULL)`),
    check('voyages_check_1', sql`ended_at IS NULL OR ended_at > started_at`),
    foreignKey({
      columns: [table.vesselVersionId, table.vesselId],
      foreignColumns: [vesselVersions.id, vesselVersions.vesselId],
    }),
    foreignKey({
      columns: [table.openingOperationId, table.vesselId],
      foreignColumns: [vesselOperations.id, vesselOperations.vesselId],
    }),
    foreignKey({
      columns: [table.closingOperationId, table.vesselId],
      foreignColumns: [vesselOperations.id, vesselOperations.vesselId],
    }),
    foreignKey({
      columns: [table.openingOperationId, table.startedAt],
      foreignColumns: [operationEndpoints.operationId, operationEndpoints.utc],
    }),
    foreignKey({
      columns: [table.closingOperationId, table.endedAt],
      foreignColumns: [operationEndpoints.operationId, operationEndpoints.utc],
    }),
    uniqueIndex('voyage_open')
      .on(table.vesselId)
      .where(sql`ended_at IS NULL`),
  ],
)

export const portCalls = sqliteTable(
  'port_calls',
  {
    id: text('id').primaryKey().notNull(),
    voyageId: text('voyage_id')
      .notNull()
      .references(() => voyages.id),
    portId: text('port_id')
      .notNull()
      .references(() => ports.id),
    portVersionId: text('port_version_id').notNull(),
    openingOperationId: text('opening_operation_id').notNull().unique(),
    closingOperationId: text('closing_operation_id').unique(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
  },
  (table) => [
    uniqueIndex('port_calls_unique_0').on(table.id, table.portId),
    check('port_calls_check_1', sql`(closing_operation_id IS NULL) = (ended_at IS NULL)`),
    check('port_calls_check_2', sql`ended_at IS NULL OR ended_at > started_at`),
    foreignKey({
      columns: [table.portVersionId, table.portId],
      foreignColumns: [portVersions.id, portVersions.portId],
    }),
    foreignKey({
      columns: [table.openingOperationId, table.startedAt],
      foreignColumns: [operationEndpoints.operationId, operationEndpoints.utc],
    }),
    foreignKey({
      columns: [table.closingOperationId, table.endedAt],
      foreignColumns: [operationEndpoints.operationId, operationEndpoints.utc],
    }),
    uniqueIndex('port_call_open')
      .on(table.voyageId)
      .where(sql`ended_at IS NULL`),
  ],
)

export const berthStays = sqliteTable(
  'berth_stays',
  {
    id: text('id').primaryKey().notNull(),
    portCallId: text('port_call_id').notNull(),
    portId: text('port_id').notNull(),
    berthId: text('berth_id').references(() => berths.id),
    berthVersionId: text('berth_version_id'),
    openingOperationId: text('opening_operation_id').notNull().unique(),
    closingOperationId: text('closing_operation_id').unique(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
  },
  (table) => [
    check('berth_stays_check_0', sql`(berth_id IS NULL) = (berth_version_id IS NULL)`),
    check('berth_stays_check_1', sql`(closing_operation_id IS NULL) = (ended_at IS NULL)`),
    check('berth_stays_check_2', sql`ended_at IS NULL OR ended_at > started_at`),
    foreignKey({
      columns: [table.portCallId, table.portId],
      foreignColumns: [portCalls.id, portCalls.portId],
    }),
    foreignKey({
      columns: [table.berthId, table.portId],
      foreignColumns: [berths.id, berths.portId],
    }),
    foreignKey({
      columns: [table.berthVersionId, table.berthId],
      foreignColumns: [berthVersions.id, berthVersions.berthId],
    }),
    foreignKey({
      columns: [table.openingOperationId, table.startedAt],
      foreignColumns: [operationEndpoints.operationId, operationEndpoints.utc],
    }),
    foreignKey({
      columns: [table.closingOperationId, table.endedAt],
      foreignColumns: [operationEndpoints.operationId, operationEndpoints.utc],
    }),
    uniqueIndex('berth_stay_open')
      .on(table.portCallId)
      .where(sql`ended_at IS NULL`),
  ],
)
