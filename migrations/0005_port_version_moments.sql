ALTER TABLE port_versions ADD COLUMN effective_local_date_time TEXT;
ALTER TABLE port_versions ADD COLUMN effective_zone_id TEXT;
ALTER TABLE port_versions ADD COLUMN effective_utc_offset TEXT CHECK (
  (effective_from IS NULL AND effective_local_date_time IS NULL AND effective_zone_id IS NULL AND effective_utc_offset IS NULL)
  OR
  (effective_from IS NOT NULL AND effective_local_date_time IS NOT NULL AND effective_zone_id IS NOT NULL AND effective_utc_offset IS NOT NULL)
);
