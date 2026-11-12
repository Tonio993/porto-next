CREATE TABLE tariffs (
  id TEXT PRIMARY KEY NOT NULL,
  port_id TEXT NOT NULL REFERENCES ports(id),
  effective_from TEXT NOT NULL CHECK(length(effective_from) = 24),
  effective_local_date_time TEXT NOT NULL CHECK(length(effective_local_date_time) = 16),
  effective_zone_id TEXT NOT NULL CHECK(length(effective_zone_id) BETWEEN 1 AND 200),
  effective_utc_offset TEXT NOT NULL CHECK(length(effective_utc_offset) IN (6,9))
);
CREATE TABLE tariff_configurations (
  id TEXT PRIMARY KEY NOT NULL,
  tariff_id TEXT NOT NULL REFERENCES tariffs(id),
  vessel_type_id TEXT NOT NULL REFERENCES vessel_types(id),
  extra_width INTEGER NOT NULL CHECK(typeof(extra_width) = 'integer' AND extra_width BETWEEN 1 AND 9007199254740991),
  extra_value TEXT NOT NULL CHECK(
    typeof(extra_value) = 'text' AND length(replace(extra_value,'.','')) BETWEEN 1 AND 256
    AND extra_value NOT GLOB '*[^0-9.]*'
    AND (extra_value = '0' OR substr(extra_value,1,1) BETWEEN '1' AND '9' OR substr(extra_value,1,2) = '0.')
    AND (instr(extra_value,'.') = 0 OR (length(extra_value)-length(replace(extra_value,'.','')) = 1 AND instr(extra_value,'.') > 1 AND substr(extra_value,-1) BETWEEN '1' AND '9'))
  )
);
CREATE TABLE tariff_brackets (
  id TEXT PRIMARY KEY NOT NULL,
  configuration_id TEXT NOT NULL REFERENCES tariff_configurations(id),
  upper_limit INTEGER NOT NULL CHECK(typeof(upper_limit) = 'integer' AND upper_limit BETWEEN 0 AND 9007199254740991),
  value TEXT NOT NULL CHECK(
    typeof(value) = 'text' AND length(replace(value,'.','')) BETWEEN 1 AND 256
    AND value NOT GLOB '*[^0-9.]*'
    AND (value = '0' OR substr(value,1,1) BETWEEN '1' AND '9' OR substr(value,1,2) = '0.')
    AND (instr(value,'.') = 0 OR (length(value)-length(replace(value,'.','')) = 1 AND instr(value,'.') > 1 AND substr(value,-1) BETWEEN '1' AND '9'))
  )
);

CREATE UNIQUE INDEX tariffs_effective ON tariffs(port_id, effective_from);
CREATE UNIQUE INDEX tariff_configuration_type ON tariff_configurations(tariff_id, vessel_type_id);
CREATE UNIQUE INDEX tariff_bracket_limit ON tariff_brackets(configuration_id, upper_limit);