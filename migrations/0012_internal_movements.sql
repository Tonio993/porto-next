-- Preserve all P10 identities and traces while extending the owned operation graph.
CREATE TABLE vessel_operations_p11 (
  id TEXT PRIMARY KEY NOT NULL,
  vessel_id TEXT NOT NULL REFERENCES vessels(id),
  vessel_version_id TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK(operation_type IN ('ENTRY', 'EXIT', 'MOVEMENT')),
  execution_status TEXT NOT NULL CHECK(execution_status IN ('PLANNED', 'PERFORMED', 'MISSED')),
  notes TEXT CHECK(notes IS NULL OR length(notes) <= 10000),
  created_at TEXT NOT NULL,
  UNIQUE(id, vessel_id),
  FOREIGN KEY(vessel_version_id, vessel_id) REFERENCES vessel_versions(id, vessel_id) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE TABLE operation_endpoints_p11 (
  id TEXT PRIMARY KEY NOT NULL,
  operation_id TEXT NOT NULL,
  vessel_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('OCCURRENCE', 'DEPARTURE', 'ARRIVAL')),
  vessel_version_id TEXT NOT NULL,
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
  UNIQUE(operation_id, role),
  CHECK((berth_id IS NULL) = (berth_version_id IS NULL)),
  FOREIGN KEY(operation_id, vessel_id) REFERENCES vessel_operations_p11(id, vessel_id),
  FOREIGN KEY(vessel_version_id, vessel_id) REFERENCES vessel_versions(id, vessel_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(port_version_id, port_id) REFERENCES port_versions(id, port_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(berth_id, port_id) REFERENCES berths(id, port_id),
  FOREIGN KEY(berth_version_id, berth_id) REFERENCES berth_versions(id, berth_id) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE TABLE operation_charges_p11 (
  id TEXT PRIMARY KEY NOT NULL,
  operation_id TEXT NOT NULL UNIQUE REFERENCES vessel_operations_p11(id),
  charge_kind TEXT NOT NULL CHECK(charge_kind IN ('ENTRY', 'EXIT', 'MOVEMENT')),
  economic_endpoint_role TEXT NOT NULL CHECK(economic_endpoint_role IN ('OCCURRENCE', 'DEPARTURE')),
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
  CHECK((charge_kind = 'MOVEMENT' AND economic_endpoint_role = 'DEPARTURE') OR (charge_kind IN ('ENTRY','EXIT') AND economic_endpoint_role = 'OCCURRENCE')),
  FOREIGN KEY(operation_id, economic_endpoint_role) REFERENCES operation_endpoints_p11(operation_id, role),
  CHECK(effective_base_cents = coalesce(manual_override_cents, calculated_base_cents)),
  FOREIGN KEY(configuration_id, tariff_id) REFERENCES tariff_configurations(id, tariff_id),
  FOREIGN KEY(bracket_id, configuration_id) REFERENCES tariff_brackets(id, configuration_id),
  FOREIGN KEY(weight_version_id, weight_sequence_id) REFERENCES weight_versions(id, sequence_id)
) STRICT;
CREATE TABLE voyages_p11 (
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
  FOREIGN KEY(opening_operation_id, vessel_id) REFERENCES vessel_operations_p11(id, vessel_id),
  FOREIGN KEY(closing_operation_id, vessel_id) REFERENCES vessel_operations_p11(id, vessel_id),
  FOREIGN KEY(opening_operation_id, started_at) REFERENCES operation_endpoints_p11(operation_id, utc),
  FOREIGN KEY(closing_operation_id, ended_at) REFERENCES operation_endpoints_p11(operation_id, utc)
) STRICT;
CREATE TABLE port_calls_p11 (
  id TEXT PRIMARY KEY NOT NULL,
  voyage_id TEXT NOT NULL REFERENCES voyages_p11(id),
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
  FOREIGN KEY(opening_operation_id, started_at) REFERENCES operation_endpoints_p11(operation_id, utc),
  FOREIGN KEY(closing_operation_id, ended_at) REFERENCES operation_endpoints_p11(operation_id, utc)
) STRICT;
CREATE TABLE berth_stays_p11 (
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
  FOREIGN KEY(port_call_id, port_id) REFERENCES port_calls_p11(id, port_id),
  FOREIGN KEY(berth_id, port_id) REFERENCES berths(id, port_id),
  FOREIGN KEY(berth_version_id, berth_id) REFERENCES berth_versions(id, berth_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(opening_operation_id, started_at) REFERENCES operation_endpoints_p11(operation_id, utc),
  FOREIGN KEY(closing_operation_id, ended_at) REFERENCES operation_endpoints_p11(operation_id, utc)
) STRICT;

INSERT INTO vessel_operations_p11 SELECT * FROM vessel_operations;
INSERT INTO operation_endpoints_p11 (id,operation_id,vessel_id,role,port_id,port_version_id,berth_id,berth_version_id,local_date_time,zone_id,utc_offset,utc,vessel_version_id) SELECT e.id,e.operation_id,e.vessel_id,e.role,e.port_id,e.port_version_id,e.berth_id,e.berth_version_id,e.local_date_time,e.zone_id,e.utc_offset,e.utc,o.vessel_version_id FROM operation_endpoints e JOIN vessel_operations o ON o.id=e.operation_id;
INSERT INTO operation_charges_p11 SELECT * FROM operation_charges;
INSERT INTO voyages_p11 SELECT * FROM voyages;
INSERT INTO port_calls_p11 SELECT * FROM port_calls;
INSERT INTO berth_stays_p11 SELECT * FROM berth_stays;
DROP TABLE berth_stays;
DROP TABLE port_calls;
DROP TABLE voyages;
DROP TABLE operation_charges;
DROP TABLE operation_endpoints;
DROP TABLE vessel_operations;
ALTER TABLE vessel_operations_p11 RENAME TO vessel_operations;
ALTER TABLE operation_endpoints_p11 RENAME TO operation_endpoints;
ALTER TABLE operation_charges_p11 RENAME TO operation_charges;
ALTER TABLE voyages_p11 RENAME TO voyages;
ALTER TABLE port_calls_p11 RENAME TO port_calls;
ALTER TABLE berth_stays_p11 RENAME TO berth_stays;
CREATE UNIQUE INDEX voyage_open ON voyages(vessel_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX port_call_open ON port_calls(voyage_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX berth_stay_open ON berth_stays(port_call_id) WHERE ended_at IS NULL;
CREATE TRIGGER operation_endpoint_shape_insert BEFORE INSERT ON operation_endpoints BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM vessel_operations o WHERE o.id=NEW.operation_id AND o.vessel_id=NEW.vessel_id AND ((o.operation_type='MOVEMENT' AND NEW.role IN ('DEPARTURE','ARRIVAL')) OR (o.operation_type IN ('ENTRY','EXIT') AND NEW.role='OCCURRENCE'))) THEN RAISE(ABORT,'invalid endpoint role') END;
 SELECT CASE WHEN NEW.role='ARRIVAL' AND NOT EXISTS (SELECT 1 FROM operation_endpoints d WHERE d.operation_id=NEW.operation_id AND d.role='DEPARTURE' AND d.port_id=NEW.port_id AND d.utc<NEW.utc) THEN RAISE(ABORT,'invalid internal arrival') END;
 SELECT CASE WHEN NEW.role='DEPARTURE' AND EXISTS (SELECT 1 FROM operation_endpoints a WHERE a.operation_id=NEW.operation_id AND a.role='ARRIVAL' AND (a.port_id<>NEW.port_id OR a.utc<=NEW.utc)) THEN RAISE(ABORT,'invalid internal departure') END;
END;
CREATE TRIGGER operation_endpoint_shape_update BEFORE UPDATE ON operation_endpoints BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM vessel_operations o WHERE o.id=NEW.operation_id AND o.vessel_id=NEW.vessel_id AND ((o.operation_type='MOVEMENT' AND NEW.role IN ('DEPARTURE','ARRIVAL')) OR (o.operation_type IN ('ENTRY','EXIT') AND NEW.role='OCCURRENCE'))) THEN RAISE(ABORT,'invalid endpoint role') END;
 SELECT CASE WHEN NEW.role='ARRIVAL' AND NOT EXISTS (SELECT 1 FROM operation_endpoints d WHERE d.operation_id=NEW.operation_id AND d.role='DEPARTURE' AND d.port_id=NEW.port_id AND d.utc<NEW.utc) THEN RAISE(ABORT,'invalid internal arrival') END;
 SELECT CASE WHEN NEW.role='DEPARTURE' AND EXISTS (SELECT 1 FROM operation_endpoints a WHERE a.operation_id=NEW.operation_id AND a.role='ARRIVAL' AND (a.port_id<>NEW.port_id OR a.utc<=NEW.utc)) THEN RAISE(ABORT,'invalid internal departure') END;
END;
