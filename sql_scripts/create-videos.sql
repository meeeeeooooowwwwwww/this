DROP TABLE IF EXISTS videos;
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  thumbnail TEXT,
  uploader TEXT,
  category TEXT,
  platform TEXT,           -- e.g., 'rumble', 'youtube', etc.
  platform_id TEXT,        -- Original ID from the platform
  duration INTEGER,        -- Video duration in seconds
  views INTEGER,           -- View count
  likes INTEGER,           -- Like count
  publish_date TEXT,       -- Publication date
  tags TEXT,              -- Comma-separated tags
  source_type TEXT,       -- e.g., 'natalie', 'warroom', etc.
  transcript TEXT,        -- Video transcript if available
  metadata TEXT,          -- JSON field for additional metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_publish_date ON videos(publish_date);
CREATE INDEX IF NOT EXISTS idx_videos_uploader ON videos(uploader);
CREATE INDEX IF NOT EXISTS idx_videos_platform ON videos(platform);
