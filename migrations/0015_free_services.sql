-- P14: prestazioni ordinarie libere, separate dalle operazioni nave.
CREATE UNIQUE INDEX service_voyage_owner ON voyages(id,vessel_id);
CREATE UNIQUE INDEX service_visit_owner ON port_calls(id,voyage_id,port_id);
CREATE UNIQUE INDEX service_stay_owner ON berth_stays(id,port_call_id,port_id);
CREATE TABLE service_activities (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL CHECK(category='FREE'),
  vessel_id TEXT NOT NULL REFERENCES vessels(id),
  vessel_version_id TEXT NOT NULL,
  execution_status TEXT NOT NULL CHECK(execution_status IN ('PLANNED','PERFORMED','MISSED')),
  description TEXT NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 1000),
  base_cents INTEGER NOT NULL CHECK(typeof(base_cents)='integer' AND base_cents>0),
  notes TEXT CHECK(notes IS NULL OR length(notes)<=10000),
  local_date_time TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  utc_offset TEXT NOT NULL,
  utc TEXT NOT NULL,
  voyage_id TEXT NOT NULL,
  port_call_id TEXT NOT NULL,
  berth_stay_id TEXT NOT NULL,
  port_id TEXT NOT NULL REFERENCES ports(id),
  port_version_id TEXT NOT NULL,
  berth_id TEXT,
  berth_version_id TEXT,
  customer_id TEXT REFERENCES customers(id),
  agency_id TEXT REFERENCES agencies(id),
  created_at TEXT NOT NULL,
  FOREIGN KEY(vessel_version_id,vessel_id) REFERENCES vessel_versions(id,vessel_id),
  FOREIGN KEY(voyage_id,vessel_id) REFERENCES voyages(id,vessel_id),
  FOREIGN KEY(port_call_id,voyage_id,port_id) REFERENCES port_calls(id,voyage_id,port_id),
  FOREIGN KEY(berth_stay_id,port_call_id,port_id) REFERENCES berth_stays(id,port_call_id,port_id),
  FOREIGN KEY(port_version_id,port_id) REFERENCES port_versions(id,port_id),
  FOREIGN KEY(berth_id,port_id) REFERENCES berths(id,port_id),
  FOREIGN KEY(berth_version_id,berth_id) REFERENCES berth_versions(id,berth_id),
  CHECK((berth_id IS NULL)=(berth_version_id IS NULL))
);
CREATE INDEX services_vessel_moment ON service_activities(vessel_id,utc,id);
CREATE INDEX services_port ON service_activities(port_id,port_version_id);
CREATE INDEX services_berth ON service_activities(berth_id,berth_version_id);
CREATE INDEX services_customer ON service_activities(customer_id);
CREATE INDEX services_agency ON service_activities(agency_id);
CREATE TABLE service_activity_subjects (
  service_id TEXT PRIMARY KEY NOT NULL REFERENCES service_activities(id),
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
  CHECK (customer_source IS NULL OR customer_source IN ('SERVICE_ACTIVITY','BERTH_STAY','PORT_CALL','VOYAGE')),
  CHECK (agency_source IS NULL OR agency_source IN ('SERVICE_ACTIVITY','BERTH_STAY','PORT_CALL','VOYAGE'))
);
CREATE INDEX service_subjects_customer ON service_activity_subjects(customer_id,customer_version_id);
CREATE INDEX service_subjects_agency ON service_activity_subjects(agency_id,agency_version_id);
