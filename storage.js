"use strict";

const { AsyncLocalStorage } = require("node:async_hooks");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync, backup } = require("node:sqlite");
const { DEFAULT_COMPANY, AppError } = require("./core");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','operator')), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS certificates (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, status TEXT NOT NULL CHECK(status IN ('draft','issued','revoked')), data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, pdf BLOB, pdf_hash TEXT, pdf_name TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, issued_at TEXT, revoked_at TEXT, revoke_reason TEXT, user_id TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, at TEXT NOT NULL, user_id TEXT, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS certificates_updated ON certificates(updated_at DESC);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE TABLE IF NOT EXISTS transfers (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), metadata TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS transfer_parts (transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE, part INTEGER NOT NULL CHECK(part>=0), data BLOB NOT NULL, PRIMARY KEY(transfer_id,part));
PRAGMA user_version=1;`;

function postgresSql(sql) {
  let index = 0;
  return sql.replace(/json_extract\(data,'\$\.([A-Za-z]+)'\)/g, "(data::jsonb->>'$1')")
    .replace(/\?/g, () => `$${++index}`);
}

function createStorage(dataDir, databaseUrl = process.env.VS_DATABASE_URL) {
  const context = new AsyncLocalStorage();
  const cloud = Boolean(databaseUrl);
  let queue = Promise.resolve();
  let db, pool, ratePool;
  const schema = process.env.VS_DATABASE_SCHEMA || "vscertificates";
  if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error("Invalid database schema");
  if (cloud) {
    const { Pool, types } = require("pg");
    types.setTypeParser(20, value => Number(value));
    const url = new URL(databaseUrl);
    if (url.search) throw new Error("Use VS_DATABASE_URL without SSL query overrides");
    pool = new Pool({ connectionString: databaseUrl, max: 3, connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 10000, maxLifetimeSeconds: 300, allowExitOnIdle: true,
      ssl: { rejectUnauthorized: true, ca: fs.readFileSync(path.join(__dirname,"cloud/supabase-ca.crt"),"utf8") } });
    pool.on("error", error => console.error("Database connection:", error.code));
    ratePool=new Pool({...pool.options,max:1});
    ratePool.on("error", error => console.error("Rate limit connection:",error.code));
    db = { prepare(sql) {
      const query = async values => {
        const state = context.getStore();
        if (!state) throw new Error("Database operation outside request context");
        return state.client.query(postgresSql(sql), values);
      };
      return { get: async (...values) => (await query(values)).rows[0],
        all: async (...values) => (await query(values)).rows,
        run: async (...values) => ({ changes:(await query(values)).rowCount }) };
    }, close: () => Promise.all([pool.end(),ratePool.end()]) };
  } else {
    fs.mkdirSync(dataDir,{recursive:true});
    db = new DatabaseSync(path.join(dataDir,"vscursos.sqlite"),{timeout:5000});
    db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;" + SCHEMA);
    db.prepare("INSERT OR IGNORE INTO settings (id,data) VALUES (1,?)").run(JSON.stringify(DEFAULT_COMPANY));
  }

  async function request(mutation, fn) {
    if (context.getStore()) return fn();
    if (!cloud) {
      const previous = queue;
      let release;
      queue = new Promise(resolve => { release = resolve; });
      await previous;
      try {
        if (mutation) db.exec("BEGIN IMMEDIATE");
        const result = await context.run({ mutation },fn);
        if (mutation) db.exec("COMMIT");
        return result;
      } catch(error) { if (mutation) db.exec("ROLLBACK"); throw error; }
      finally { release(); }
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      await client.query(`SET LOCAL search_path TO ${schema}`);
      await client.query("SET LOCAL statement_timeout='60s'");
      await client.query("SET LOCAL idle_in_transaction_session_timeout='120s'");
      // All writers share one lock, including requests from different Vercel instances.
      if (mutation) await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[schema]);
      const result = await context.run({ client, mutation },fn);
      await client.query("COMMIT");
      return result;
    } catch(error) { await client.query("ROLLBACK").catch(()=>{}); throw error; }
    finally { client.release(); }
  }

  async function throttle(key, limit) {
    if (!cloud) return false;
    const now=Date.now();
    // Separate autocommit: rejected login transactions must not undo their attempt counter.
    const result=await ratePool.query(`INSERT INTO ${schema}.rate_limits (key,count,expires) VALUES ($1,1,$2)
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires<$3 THEN 1 ELSE rate_limits.count+1 END,
      expires=CASE WHEN rate_limits.expires<$3 THEN $2 ELSE rate_limits.expires END RETURNING count`,[key,now+900000,now]);
    if(result.rows[0].count>limit) throw new AppError("Muitas tentativas. Aguarde 15 minutos.",429);
    await ratePool.query(`DELETE FROM ${schema}.rate_limits WHERE expires<$1`,[now]);
    return true;
  }

  async function snapshot(file, retain = false) {
    if (!cloud && !context.getStore()?.mutation) return backup(db,file);
    await request(false,async()=>{
      // Prevent a mixed-version snapshot while reading multiple tables.
      if(cloud) await context.getStore().client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[schema]);
      const target = new DatabaseSync(file);
      try {
        target.exec(SCHEMA);
        target.exec("BEGIN");
        for (const table of ["users","settings","certificates","audit"]) {
          const rows=await db.prepare(`SELECT * FROM ${table}`).all();
          for (const row of rows) {
            const keys=Object.keys(row);
            target.prepare(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(()=>"?").join(",")})`).run(...keys.map(key=>row[key]));
          }
        }
        target.exec("COMMIT");
      } finally { target.close(); }
      if(retain && cloud) {
        await db.prepare("INSERT INTO backups (id,created_at,data) VALUES (?,?,?)").run(path.basename(file),new Date().toISOString(),fs.readFileSync(file));
        await db.prepare("DELETE FROM backups WHERE id NOT IN (SELECT id FROM backups ORDER BY created_at DESC LIMIT 3)").run();
      }
    });
  }
  return { db, cloud, request, snapshot, throttle, transaction: fn => context.getStore()?.mutation ? fn() : request(true,fn) };
}

module.exports={createStorage,postgresSql};
