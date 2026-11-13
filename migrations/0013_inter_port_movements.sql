-- Preserve v12 operations, endpoints, stays, identities, overrides and exact traces.
CREATE TABLE operation_charges_p12 (
  id TEXT PRIMARY KEY NOT NULL,
  operation_id TEXT NOT NULL REFERENCES vessel_operations(id),
  charge_kind TEXT NOT NULL CHECK(charge_kind IN ('ENTRY', 'EXIT', 'MOVEMENT')),
  economic_endpoint_role TEXT NOT NULL CHECK(economic_endpoint_role IN ('OCCURRENCE', 'DEPARTURE', 'ARRIVAL')),
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
  CHECK((charge_kind = 'MOVEMENT' AND economic_endpoint_role = 'DEPARTURE') OR (charge_kind = 'EXIT' AND economic_endpoint_role IN ('OCCURRENCE','DEPARTURE')) OR (charge_kind = 'ENTRY' AND economic_endpoint_role IN ('OCCURRENCE','ARRIVAL'))),
  UNIQUE(operation_id, economic_endpoint_role),
  UNIQUE(operation_id, charge_kind),
  FOREIGN KEY(operation_id, economic_endpoint_role) REFERENCES operation_endpoints(operation_id, role),
  CHECK(effective_base_cents = coalesce(manual_override_cents, calculated_base_cents)),
  FOREIGN KEY(configuration_id, tariff_id) REFERENCES tariff_configurations(id, tariff_id),
  FOREIGN KEY(bracket_id, configuration_id) REFERENCES tariff_brackets(id, configuration_id),
  FOREIGN KEY(weight_version_id, weight_sequence_id) REFERENCES weight_versions(id, sequence_id)
) STRICT;

INSERT INTO operation_charges_p12 SELECT * FROM operation_charges;
DROP TABLE operation_charges;
ALTER TABLE operation_charges_p12 RENAME TO operation_charges;
DROP TRIGGER operation_endpoint_shape_insert;
DROP TRIGGER operation_endpoint_shape_update;
CREATE TRIGGER operation_endpoint_shape_insert BEFORE INSERT ON operation_endpoints BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM vessel_operations o WHERE o.id=NEW.operation_id AND o.vessel_id=NEW.vessel_id AND ((o.operation_type='MOVEMENT' AND NEW.role IN ('DEPARTURE','ARRIVAL')) OR (o.operation_type IN ('ENTRY','EXIT') AND NEW.role='OCCURRENCE'))) THEN RAISE(ABORT,'invalid endpoint role') END;
 SELECT CASE WHEN NEW.role='ARRIVAL' AND NOT EXISTS (SELECT 1 FROM operation_endpoints d WHERE d.operation_id=NEW.operation_id AND d.role='DEPARTURE' AND d.utc<NEW.utc) THEN RAISE(ABORT,'invalid movement arrival') END;
 SELECT CASE WHEN NEW.role='DEPARTURE' AND EXISTS (SELECT 1 FROM operation_endpoints a WHERE a.operation_id=NEW.operation_id AND a.role='ARRIVAL' AND a.utc<=NEW.utc) THEN RAISE(ABORT,'invalid movement departure') END;
END;
CREATE TRIGGER operation_endpoint_shape_update BEFORE UPDATE ON operation_endpoints BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM vessel_operations o WHERE o.id=NEW.operation_id AND o.vessel_id=NEW.vessel_id AND ((o.operation_type='MOVEMENT' AND NEW.role IN ('DEPARTURE','ARRIVAL')) OR (o.operation_type IN ('ENTRY','EXIT') AND NEW.role='OCCURRENCE'))) THEN RAISE(ABORT,'invalid endpoint role') END;
 SELECT CASE WHEN NEW.role='ARRIVAL' AND NOT EXISTS (SELECT 1 FROM operation_endpoints d WHERE d.operation_id=NEW.operation_id AND d.role='DEPARTURE' AND d.utc<NEW.utc) THEN RAISE(ABORT,'invalid movement arrival') END;
 SELECT CASE WHEN NEW.role='DEPARTURE' AND EXISTS (SELECT 1 FROM operation_endpoints a WHERE a.operation_id=NEW.operation_id AND a.role='ARRIVAL' AND a.utc<=NEW.utc) THEN RAISE(ABORT,'invalid movement departure') END;
END;

CREATE TRIGGER operation_charge_shape_insert BEFORE INSERT ON operation_charges BEGIN
 SELECT CASE WHEN NOT EXISTS (
   SELECT 1 FROM vessel_operations o JOIN operation_endpoints e ON e.operation_id=o.id AND e.role=NEW.economic_endpoint_role
   JOIN tariffs t ON t.id=NEW.tariff_id AND t.port_id=e.port_id
   JOIN vessel_versions v ON v.id=NEW.vessel_version_id AND v.vessel_id=o.vessel_id
   JOIN weight_sequences w ON w.id=NEW.weight_sequence_id AND w.operation_type=NEW.charge_kind
   WHERE o.id=NEW.operation_id AND (
     (o.operation_type IN ('ENTRY','EXIT') AND NEW.charge_kind=o.operation_type AND NEW.economic_endpoint_role='OCCURRENCE')
     OR (o.operation_type='MOVEMENT' AND EXISTS (
       SELECT 1 FROM operation_endpoints d JOIN operation_endpoints a ON a.operation_id=d.operation_id AND a.role='ARRIVAL'
       WHERE d.operation_id=o.id AND d.role='DEPARTURE' AND (
         (d.port_id=a.port_id AND NEW.charge_kind='MOVEMENT' AND NEW.economic_endpoint_role='DEPARTURE')
         OR (d.port_id<>a.port_id AND ((NEW.charge_kind='EXIT' AND NEW.economic_endpoint_role='DEPARTURE') OR (NEW.charge_kind='ENTRY' AND NEW.economic_endpoint_role='ARRIVAL')))
       )
     ))
   )
 ) THEN RAISE(ABORT,'invalid charge context') END;
END;

CREATE TRIGGER operation_charge_shape_update BEFORE UPDATE ON operation_charges BEGIN
 SELECT CASE WHEN NOT EXISTS (
   SELECT 1 FROM vessel_operations o JOIN operation_endpoints e ON e.operation_id=o.id AND e.role=NEW.economic_endpoint_role
   JOIN tariffs t ON t.id=NEW.tariff_id AND t.port_id=e.port_id
   JOIN vessel_versions v ON v.id=NEW.vessel_version_id AND v.vessel_id=o.vessel_id
   JOIN weight_sequences w ON w.id=NEW.weight_sequence_id AND w.operation_type=NEW.charge_kind
   WHERE o.id=NEW.operation_id AND (
     (o.operation_type IN ('ENTRY','EXIT') AND NEW.charge_kind=o.operation_type AND NEW.economic_endpoint_role='OCCURRENCE')
     OR (o.operation_type='MOVEMENT' AND EXISTS (
       SELECT 1 FROM operation_endpoints d JOIN operation_endpoints a ON a.operation_id=d.operation_id AND a.role='ARRIVAL'
       WHERE d.operation_id=o.id AND d.role='DEPARTURE' AND (
         (d.port_id=a.port_id AND NEW.charge_kind='MOVEMENT' AND NEW.economic_endpoint_role='DEPARTURE')
         OR (d.port_id<>a.port_id AND ((NEW.charge_kind='EXIT' AND NEW.economic_endpoint_role='DEPARTURE') OR (NEW.charge_kind='ENTRY' AND NEW.economic_endpoint_role='ARRIVAL')))
       )
     ))
   )
 ) THEN RAISE(ABORT,'invalid charge context') END;
END;
