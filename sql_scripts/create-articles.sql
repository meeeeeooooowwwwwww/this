DROP TABLE IF EXISTS articles;
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT,
  author TEXT,             -- Article author
  content TEXT,            -- Full article content
  url TEXT,               -- Source URL
  source TEXT,            -- Source website/publication
  category TEXT,          -- Article category
  tags TEXT,              -- Comma-separated tags
  image_url TEXT,         -- Featured image URL
  read_time INTEGER,      -- Estimated read time in minutes
  is_featured BOOLEAN,    -- Whether article is featured
  status TEXT,            -- e.g., 'published', 'draft'
  metadata TEXT,          -- JSON field for additional metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_articles_title ON articles(title);
CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
