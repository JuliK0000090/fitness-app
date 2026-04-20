#!/usr/bin/env node
/**
 * Startup migration script for Railway.
 * 1. Enables pgvector extension (best-effort — skips if not available)
 * 2. Runs prisma db push to create/sync tables
 */

const { Client } = require("pg");

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set — skipping migration");
    process.exit(0);
  }

  // Step 1: enable pgvector extension (ignore error if not available)
  try {
    const client = new Client({ connectionString: url });
    await client.connect();
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    await client.end();
    console.log("pgvector extension ready");
  } catch (e) {
    console.warn("pgvector not available, continuing without it:", e.message);
  }

  // Step 2: prisma db push
  const { execSync } = require("child_process");
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      env: process.env,
    });
  } catch (e) {
    console.error("prisma db push failed:", e.message);
    process.exit(1);
  }
}

run();
