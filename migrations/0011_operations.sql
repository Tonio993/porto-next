CREATE UNIQUE INDEX vessel_versions_owner ON vessel_versions(id, vessel_id);
CREATE UNIQUE INDEX port_versions_owner ON port_versions(id, port_id);
CREATE UNIQUE INDEX berth_versions_owner ON berth_versions(id, berth_id);
CREATE UNIQUE INDEX operation_berth_port ON berths(id, port_id);
CREATE UNIQUE INDEX tariff_configuration_owner ON tariff_configurations(id, tariff_id);
CREATE UNIQUE INDEX tariff_bracket_owner ON tariff_brackets(id, configuration_id);
CREATE UNIQUE INDEX weight_version_owner ON weight_versions(id, sequence_id);

CREATE TABLE vessel_operations (
  id TEXT PRIMARY KEY NOT NULL,
  vessel_id TEXT NOT NULL REFERENCES vessels(id),
  vessel_version_id TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK(operation_type IN ('ENTRY', 'EXIT')),
  execution_status TEXT NOT NULL CHECK(execution_status IN ('PLANNED', 'PERFORMED', 'MISSED')),
  notes TEXT CHECK(notes IS NULL OR length(notes) <= 10000),
  created_at TEXT NOT NULL,
  UNIQUE(id, vessel_id),
  FOREIGN KEY(vessel_version_id, vessel_id) REFERENCES vessel_versions(id, vessel_id) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE TABLE operation_endpoints (
  id TEXT PRIMARY KEY NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,
  vessel_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role = 'OCCURRENCE'),
  port_id TEXT NOT NULL REFERENCES ports(id),
  port_version_id TEXT NOT NULL,
  berth_id TEXT REFERENCES berths(id),
  berth_version_id TEXT,
  local_date_time TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  utc_offset TEXT NOT NULL,
  utc TEXT NOT NULL,
  utc_minute TEXT GENERATED ALWAYS AS (substr(utc, 1, 16)) STORED,
  UNIQUE(vessel_id, utc_minute),
  UNIQUE(operation_id, utc),
  CHECK((berth_id IS NULL) = (berth_version_id IS NULL)),
  FOREIGN KEY(operation_id, vessel_id) REFERENCES vessel_operations(id, vessel_id),
  FOREIGN KEY(port_version_id, port_id) REFERENCES port_versions(id, port_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(berth_id, port_id) REFERENCES berths(id, port_id),
  FOREIGN KEY(berth_version_id, berth_id) REFERENCES berth_versions(id, berth_id) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE TABLE operation_charges (
  id TEXT PRIMARY KEY NOT NULL,
  operation_id TEXT NOT NULL UNIQUE REFERENCES vessel_operations(id),
  charge_kind TEXT NOT NULL CHECK(charge_kind IN ('ENTRY', 'EXIT')),
  economic_endpoint_role TEXT NOT NULL CHECK(economic_endpoint_role = 'OCCURRENCE'),
  tariff_id TEXT NOT NULL REFERENCES tariffs(id),
  configuration_id TEXT NOT NULL,
  bracket_id TEXT NOT NULL,
  weight_sequence_id TEXT NOT NULL REFERENCES weight_sequences(id),
  weight_version_id TEXT NOT NULL,
  vessel_version_id TEXT NOT NULL REFERENCES vessel_versions(id) DEFERRABLE INITIALLY DEFERRED,
  vessel_type_id TEXT NOT NULL REFERENCES vessel_types(id),
  size INTEGER NOT NULL CHECK(size >= 0 AND size <= 9007199254740991),
  upper_limit INTEGER NOT NULL CHECK(upper_limit >= 0),
  ordinary_value TEXT NOT NULL,
  extra_width INTEGER NOT NULL CHECK(extra_width > 0),
  extra_value TEXT NOT NULL,
  extra_count INTEGER NOT NULL CHECK(extra_count >= 0),
  weight TEXT NOT NULL,
  tariff_value_cents INTEGER NOT NULL CHECK(tariff_value_cents >= 0),
  calculated_base_cents INTEGER NOT NULL CHECK(calculated_base_cents >= 0),
  manual_override_cents INTEGER CHECK(manual_override_cents >= 0),
  effective_base_cents INTEGER NOT NULL CHECK(effective_base_cents >= 0),
  calculation_steps TEXT NOT NULL CHECK(json_valid(calculation_steps)),
  CHECK(effective_base_cents = coalesce(manual_override_cents, calculated_base_cents)),
  FOREIGN KEY(configuration_id, tariff_id) REFERENCES tariff_configurations(id, tariff_id),
  FOREIGN KEY(bracket_id, configuration_id) REFERENCES tariff_brackets(id, configuration_id),
  FOREIGN KEY(weight_version_id, weight_sequence_id) REFERENCES weight_versions(id, sequence_id)
) STRICT;
CREATE TABLE voyages (
  id TEXT PRIMARY KEY NOT NULL,
  vessel_id TEXT NOT NULL REFERENCES vessels(id),
  vessel_version_id TEXT NOT NULL,
  opening_operation_id TEXT NOT NULL UNIQUE,
  closing_operation_id TEXT UNIQUE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  CHECK((closing_operation_id IS NULL) = (ended_at IS NULL)),
  CHECK(ended_at IS NULL OR ended_at > started_at),
  FOREIGN KEY(vessel_version_id, vessel_id) REFERENCES vessel_versions(id, vessel_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(opening_operation_id, vessel_id) REFERENCES vessel_operations(id, vessel_id),
  FOREIGN KEY(closing_operation_id, vessel_id) REFERENCES vessel_operations(id, vessel_id),
  FOREIGN KEY(opening_operation_id, started_at) REFERENCES operation_endpoints(operation_id, utc),
  FOREIGN KEY(closing_operation_id, ended_at) REFERENCES operation_endpoints(operation_id, utc)
) STRICT;
CREATE UNIQUE INDEX voyage_open ON voyages(vessel_id) WHERE ended_at IS NULL;
CREATE TABLE port_calls (
  id TEXT PRIMARY KEY NOT NULL,
  voyage_id TEXT NOT NULL REFERENCES voyages(id),
  port_id TEXT NOT NULL REFERENCES ports(id),
  port_version_id TEXT NOT NULL,
  opening_operation_id TEXT NOT NULL UNIQUE,
  closing_operation_id TEXT UNIQUE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  UNIQUE(id, port_id),
  CHECK((closing_operation_id IS NULL) = (ended_at IS NULL)),
  CHECK(ended_at IS NULL OR ended_at > started_at),
  FOREIGN KEY(port_version_id, port_id) REFERENCES port_versions(id, port_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(opening_operation_id, started_at) REFERENCES operation_endpoints(operation_id, utc),
  FOREIGN KEY(closing_operation_id, ended_at) REFERENCES operation_endpoints(operation_id, utc)
) STRICT;
CREATE UNIQUE INDEX port_call_open ON port_calls(voyage_id) WHERE ended_at IS NULL;
CREATE TABLE berth_stays (
  id TEXT PRIMARY KEY NOT NULL,
  port_call_id TEXT NOT NULL,
  port_id TEXT NOT NULL,
  berth_id TEXT REFERENCES berths(id),
  berth_version_id TEXT,
  opening_operation_id TEXT NOT NULL UNIQUE,
  closing_operation_id TEXT UNIQUE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  CHECK((berth_id IS NULL) = (berth_version_id IS NULL)),
  CHECK((closing_operation_id IS NULL) = (ended_at IS NULL)),
  CHECK(ended_at IS NULL OR ended_at > started_at),
  FOREIGN KEY(port_call_id, port_id) REFERENCES port_calls(id, port_id),
  FOREIGN KEY(berth_id, port_id) REFERENCES berths(id, port_id),
  FOREIGN KEY(berth_version_id, berth_id) REFERENCES berth_versions(id, berth_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(opening_operation_id, started_at) REFERENCES operation_endpoints(operation_id, utc),
  FOREIGN KEY(closing_operation_id, ended_at) REFERENCES operation_endpoints(operation_id, utc)
) STRICT;
CREATE UNIQUE INDEX berth_stay_open ON berth_stays(port_call_id) WHERE ended_at IS NULL;
