import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@monitor/db";

dotenv.config();

export const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://postgres:postgrespassword@localhost:5432/apimonitor";

// Runtime di SOLA LETTURA: espone unicamente il database (pool Postgres + Drizzle).
// Non apre Redis ne registra listener dell'event bus: il path di lettura
// (query service SSR, API di polling) resta leggero e senza side-effect di comando.
interface GlobalDbRuntime {
  pool?: any;
  db?: any;
  dbInitialized?: boolean;
}

const globalRef = globalThis as unknown as GlobalDbRuntime;

if (!useMock && !globalRef.dbInitialized) {
  const pool = new Pool({ connectionString: DATABASE_URL });
  globalRef.pool = pool;
  globalRef.db = drizzle(pool, { schema });
  globalRef.dbInitialized = true;
}

export const db = useMock ? ({} as any) : globalRef.db!;
