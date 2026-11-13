-- P13: assegnazioni indipendenti e soggetti effettivi per componente.
ALTER TABLE vessel_operations ADD COLUMN customer_id TEXT REFERENCES customers(id);
CREATE INDEX vessel_operations_customer ON vessel_operations(customer_id);
ALTER TABLE vessel_operations ADD COLUMN agency_id TEXT REFERENCES agencies(id);
CREATE INDEX vessel_operations_agency ON vessel_operations(agency_id);
ALTER TABLE voyages ADD COLUMN customer_id TEXT REFERENCES customers(id);
CREATE INDEX voyages_customer ON voyages(customer_id);
ALTER TABLE voyages ADD COLUMN agency_id TEXT REFERENCES agencies(id);
CREATE INDEX voyages_agency ON voyages(agency_id);
ALTER TABLE port_calls ADD COLUMN customer_id TEXT REFERENCES customers(id);
CREATE INDEX port_calls_customer ON port_calls(customer_id);
ALTER TABLE port_calls ADD COLUMN agency_id TEXT REFERENCES agencies(id);
CREATE INDEX port_calls_agency ON port_calls(agency_id);
ALTER TABLE berth_stays ADD COLUMN customer_id TEXT REFERENCES customers(id);
CREATE INDEX berth_stays_customer ON berth_stays(customer_id);
ALTER TABLE berth_stays ADD COLUMN agency_id TEXT REFERENCES agencies(id);
CREATE INDEX berth_stays_agency ON berth_stays(agency_id);
CREATE UNIQUE INDEX customer_versions_owner ON customer_versions(id, customer_id);
CREATE UNIQUE INDEX agency_versions_owner ON agency_versions(id, agency_id);
CREATE TABLE operation_charge_subjects (
  charge_id TEXT PRIMARY KEY NOT NULL REFERENCES operation_charges(id),
  customer_id TEXT REFERENCES customers(id),
  customer_version_id TEXT,
  customer_source TEXT,
  customer_source_id TEXT,
  agency_id TEXT REFERENCES agencies(id),
  agency_version_id TEXT,
  agency_source TEXT,
  agency_source_id TEXT,
  FOREIGN KEY (customer_version_id,customer_id) REFERENCES customer_versions(id,customer_id),
  FOREIGN KEY (agency_version_id,agency_id) REFERENCES agency_versions(id,agency_id),
  CHECK ((customer_id IS NULL AND customer_version_id IS NULL AND customer_source IS NULL AND customer_source_id IS NULL)
    OR (customer_id IS NOT NULL AND customer_version_id IS NOT NULL AND customer_source IS NOT NULL AND customer_source_id IS NOT NULL)),
  CHECK ((agency_id IS NULL AND agency_version_id IS NULL AND agency_source IS NULL AND agency_source_id IS NULL)
    OR (agency_id IS NOT NULL AND agency_version_id IS NOT NULL AND agency_source IS NOT NULL AND agency_source_id IS NOT NULL)),
  CHECK (customer_source IS NULL OR customer_source IN ('VESSEL_OPERATION','BERTH_STAY','PORT_CALL','VOYAGE')),
  CHECK (agency_source IS NULL OR agency_source IN ('VESSEL_OPERATION','BERTH_STAY','PORT_CALL','VOYAGE'))
);
CREATE INDEX charge_subjects_customer ON operation_charge_subjects(customer_id,customer_version_id);
CREATE INDEX charge_subjects_agency ON operation_charge_subjects(agency_id,agency_version_id);
INSERT INTO operation_charge_subjects (charge_id) SELECT id FROM operation_charges;
