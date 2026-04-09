CREATE TABLE IF NOT EXISTS wedding_wishes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wedding_wishes_created_at
ON wedding_wishes(created_at DESC);
