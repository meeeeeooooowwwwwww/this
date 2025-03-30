-- ~/this/create-businesses.sql
DROP TABLE IF EXISTS businesses;
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,          -- From JSON 'key'
  name TEXT NOT NULL,           -- From JSON 'value.title'
  description TEXT,             -- From JSON 'value.description'
  address TEXT,                 -- From JSON 'value.address'
  phone TEXT,                   -- From JSON 'value.phone'
  email TEXT,                   -- From JSON 'value.email'
  website TEXT,                 -- From JSON 'value.website'
  internal_url TEXT,            -- From JSON 'value.url'
  -- Consider adding category, city, state etc. later if needed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses(name);
-- Add more indexes as needed (e.g., on category, address components) 