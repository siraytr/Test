// migrate.js - runs migrations/001_init.sql against DATABASE_URL
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations','001_init.sql'), 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Migration applied');
  } finally {
    await client.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
