ALTER TABLE archive_metadata ADD COLUMN revision INTEGER NOT NULL DEFAULT 0
  CHECK (typeof(revision) = 'integer' AND revision >= 0);
