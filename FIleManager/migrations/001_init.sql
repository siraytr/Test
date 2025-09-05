-- create tables for a Postgres backend
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  name text,
  message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS albums (
  id uuid PRIMARY KEY,
  name text,
  zip_path text,
  created_at timestamptz DEFAULT now()
);
