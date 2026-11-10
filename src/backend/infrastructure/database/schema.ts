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
