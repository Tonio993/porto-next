CREATE TABLE service_types (
  id TEXT PRIMARY KEY NOT NULL,
  description TEXT NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 200),
  normalized_description TEXT NOT NULL UNIQUE CHECK(length(normalized_description) > 0 AND normalized_description NOT IN ('ENTRATA','USCITA','SPOSTAMENTO')),
  status TEXT NOT NULL CHECK(status IN ('ACTIVE','INACTIVE')),
  has_ever_been_used INTEGER NOT NULL DEFAULT 0 CHECK(has_ever_been_used IN (0,1))
);
CREATE TABLE weight_sequences (
  id TEXT PRIMARY KEY NOT NULL,
  service_type_id TEXT UNIQUE REFERENCES service_types(id),
  operation_type TEXT UNIQUE CHECK(operation_type IN ('ENTRY','EXIT','MOVEMENT')),
  CHECK((service_type_id IS NOT NULL AND operation_type IS NULL) OR (service_type_id IS NULL AND operation_type IS NOT NULL))
);
CREATE TABLE weight_versions (
  id TEXT PRIMARY KEY NOT NULL,
  sequence_id TEXT NOT NULL REFERENCES weight_sequences(id),
  effective_from TEXT CHECK(effective_from IS NULL),
  weight TEXT NOT NULL CHECK(
    typeof(weight) = 'text' AND length(replace(weight,'.','')) BETWEEN 1 AND 256
    AND weight NOT GLOB '*[^0-9.]*' AND weight GLOB '*[1-9]*'
    AND (weight = '0' OR substr(weight,1,1) BETWEEN '1' AND '9' OR substr(weight,1,2) = '0.')
    AND (instr(weight,'.') = 0 OR (length(weight)-length(replace(weight,'.','')) = 1 AND instr(weight,'.') > 1 AND substr(weight,-1) BETWEEN '1' AND '9'))
  )
);
CREATE UNIQUE INDEX weight_initial_unique ON weight_versions(sequence_id) WHERE effective_from IS NULL;
CREATE TRIGGER service_usage_monotonic BEFORE UPDATE OF has_ever_been_used ON service_types
WHEN OLD.has_ever_been_used = 1 AND NEW.has_ever_been_used <> 1
BEGIN SELECT RAISE(ABORT, 'Historical service usage cannot be cleared'); END;
CREATE TRIGGER service_used_no_delete BEFORE DELETE ON service_types
WHEN OLD.has_ever_been_used = 1
BEGIN SELECT RAISE(ABORT, 'Used service type cannot be deleted'); END;

-- Migration-only initialization; reopening never repopulates the catalog.
INSERT INTO service_types VALUES (
  lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-8'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),
  'rinforzo ormeggio','RINFORZO ORMEGGIO','ACTIVE',0
);
INSERT INTO weight_sequences
SELECT lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-8'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))), id, NULL FROM service_types;
INSERT INTO weight_sequences
SELECT lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-8'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))), NULL, value FROM json_each('["ENTRY","EXIT","MOVEMENT"]');
INSERT INTO weight_versions
SELECT lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-8'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))), id, NULL, '1' FROM weight_sequences;
