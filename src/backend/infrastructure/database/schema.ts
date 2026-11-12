import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

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
  (table) => [uniqueIndex('tariff_configuration_type').on(table.tariffId, table.vesselTypeId)],
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
  (table) => [uniqueIndex('tariff_bracket_limit').on(table.configurationId, table.upperLimit)],
)
