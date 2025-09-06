-- users table (simplified)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY,
  uploader UUID REFERENCES users(id),
  filename TEXT,
  size BIGINT,
  checksum TEXT,
  mime TEXT,
  path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS upload_chunks (
  upload_id UUID REFERENCES uploads(id),
  chunk_index INT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (upload_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY,
  owner UUID REFERENCES users(id),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
