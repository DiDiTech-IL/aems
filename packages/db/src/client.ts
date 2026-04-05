import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';

function getDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return url;
}

const client = postgres(getDatabaseUrl());

export const db = drizzle(client, { schema });

export type Db = typeof db;
