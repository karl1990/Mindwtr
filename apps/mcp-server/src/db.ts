import { resolveMindwtrDbPath } from './paths.js';

export type DbOptions = {
  dbPath?: string;
  readonly?: boolean;
};

export type DbClient = {
  prepare: (sql: string) => {
    all: (...args: any[]) => any[];
    get: (...args: any[]) => any;
    run: (...args: any[]) => { changes?: number };
  };
  pragma?: (sql: string) => void;
  close: () => void;
};

export async function openMindwtrDb(options: DbOptions = {}) {
  const path = resolveMindwtrDbPath(options.dbPath);
  const isBun = typeof (globalThis as any).Bun !== 'undefined';

  let db: DbClient;
  if (isBun) {
    const mod = await import('bun:sqlite');
    db = new mod.Database(path, { readonly: options.readonly ?? false });
  } else {
    const mod = await import('better-sqlite3');
    const Database = mod.default;
    db = new Database(path, {
      readonly: options.readonly ?? false,
      fileMustExist: true,
    });
  }

  db.pragma?.('journal_mode = WAL');
  db.pragma?.('foreign_keys = ON');
  db.pragma?.('busy_timeout = 5000');

  return { db, path };
}

export function closeDb(db: DbClient) {
  try {
    db.close();
  } catch {
    // ignore close errors
  }
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
