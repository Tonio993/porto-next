-- Keep the referenced table and its identities intact. The v9 NULL-only column remains
-- as a compatibility marker; the new effective_from carries dated UTC instants.
ALTER TABLE weight_versions RENAME COLUMN effective_from TO legacy_initial_from;
DROP INDEX weight_initial_unique;
ALTER TABLE weight_versions ADD COLUMN effective_from TEXT;
ALTER TABLE weight_versions ADD COLUMN effective_local_date_time TEXT;
ALTER TABLE weight_versions ADD COLUMN effective_zone_id TEXT;
ALTER TABLE weight_versions ADD COLUMN effective_utc_offset TEXT CHECK (
  (effective_from IS NULL AND effective_local_date_time IS NULL AND effective_zone_id IS NULL AND effective_utc_offset IS NULL)
  OR (effective_from IS NOT NULL AND effective_local_date_time IS NOT NULL AND effective_zone_id IS NOT NULL AND effective_utc_offset IS NOT NULL
    AND length(effective_from)=24 AND effective_from GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
    AND substr(effective_from,1,4)<>'0000' AND length(effective_local_date_time)=16
    AND length(effective_zone_id) BETWEEN 1 AND 200 AND length(effective_utc_offset) BETWEEN 6 AND 9)
);
CREATE UNIQUE INDEX weight_initial_unique ON weight_versions(sequence_id) WHERE effective_from IS NULL;
CREATE UNIQUE INDEX weight_effective_unique ON weight_versions(sequence_id,effective_from) WHERE effective_from IS NOT NULL;
