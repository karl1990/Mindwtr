import { AppData, SqliteAdapter, type SqliteClient, StorageAdapter } from '@mindwtr/core';
import { Platform } from 'react-native';

import { WIDGET_DATA_KEY } from './widget-data';
import { updateAndroidWidgetFromData } from './widget-service';

const DATA_KEY = WIDGET_DATA_KEY;
const LEGACY_DATA_KEYS = ['focus-gtd-data', 'gtd-todo-data', 'gtd-data'];
const SQLITE_DB_NAME = 'mindwtr.db';

type SqliteState = {
    adapter: SqliteAdapter;
    client: SqliteClient;
};

let sqliteStatePromise: Promise<SqliteState> | null = null;

const createLegacyClient = (db: any): SqliteClient => {
    const execSql = (sql: string, params: unknown[] = []) =>
        new Promise<any>((resolve, reject) => {
            db.transaction(
                (tx: any) => {
                    tx.executeSql(
                        sql,
                        params,
                        (_: any, result: any) => resolve(result),
                        (_: any, error: any) => {
                            reject(error);
                            return true;
                        }
                    );
                },
                (error: any) => reject(error)
            );
        });

    const exec = async (sql: string) => {
        const statements = sql
            .split(';')
            .map((statement) => statement.trim())
            .filter(Boolean);
        for (const statement of statements) {
            await execSql(statement);
        }
    };

    return {
        run: async (sql: string, params: unknown[] = []) => {
            await execSql(sql, params);
        },
        all: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
            const result = await execSql(sql, params);
            const rows = result?.rows;
            if (!rows) return [] as T[];
            if (Array.isArray(rows._array)) return rows._array as T[];
            const collected: T[] = [];
            for (let i = 0; i < rows.length; i += 1) {
                collected.push(rows.item(i));
            }
            return collected;
        },
        get: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
            const result = await execSql(sql, params);
            const rows = result?.rows;
            if (!rows || rows.length === 0) return undefined;
            if (Array.isArray(rows._array)) return rows._array[0] as T;
            return rows.item(0) as T;
        },
        exec,
    };
};

const createSqliteClient = async (): Promise<SqliteClient> => {
    const SQLite = await import('expo-sqlite');
    const openDatabaseAsync = (SQLite as any).openDatabaseAsync as ((name: string) => Promise<any>) | undefined;
    if (openDatabaseAsync) {
        try {
            const db = await openDatabaseAsync(SQLITE_DB_NAME);
            if (db?.runAsync && db?.getAllAsync && db?.getFirstAsync && db?.execAsync) {
                return {
                    run: async (sql: string, params: unknown[] = []) => {
                        await db.runAsync(sql, params);
                    },
                    all: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
                        db.getAllAsync(sql, params) as Promise<T[]>,
                    get: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
                        (await db.getFirstAsync(sql, params)) as T | undefined,
                    exec: async (sql: string) => {
                        await db.execAsync(sql);
                    },
                };
            }
        } catch (error) {
            if (__DEV__) {
                console.warn('[Storage] Async SQLite open failed, falling back to legacy API', error);
            }
        }
    }

    const legacyDb = (SQLite as any).openDatabase(SQLITE_DB_NAME);
    return createLegacyClient(legacyDb);
};

const sqliteHasAnyData = async (client: SqliteClient): Promise<boolean> => {
    const count = async (table: string) => {
        const row = await client.get<{ count?: number }>(`SELECT COUNT(*) as count FROM ${table}`);
        return Number(row?.count ?? 0);
    };
    const [tasks, projects, areas, settings] = await Promise.all([
        count('tasks'),
        count('projects'),
        count('areas'),
        count('settings'),
    ]);
    return tasks > 0 || projects > 0 || areas > 0 || settings > 0;
};

const getLegacyJson = async (AsyncStorage: any): Promise<string | null> => {
    let jsonValue = await AsyncStorage.getItem(DATA_KEY);
    if (jsonValue != null) return jsonValue;
    for (const legacyKey of LEGACY_DATA_KEYS) {
        const legacyValue = await AsyncStorage.getItem(legacyKey);
        if (legacyValue != null) {
            await AsyncStorage.setItem(DATA_KEY, legacyValue);
            return legacyValue;
        }
    }
    return null;
};

const initSqliteState = async (): Promise<SqliteState> => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    let client = await createSqliteClient();
    let adapter = new SqliteAdapter(client);
    try {
        await adapter.ensureSchema();
    } catch (error) {
        if (__DEV__) {
            console.warn('[Storage] SQLite schema init failed, retrying with legacy API', error);
        }
        const SQLite = await import('expo-sqlite');
        const legacyDb = (SQLite as any).openDatabase(SQLITE_DB_NAME);
        client = createLegacyClient(legacyDb);
        adapter = new SqliteAdapter(client);
        await adapter.ensureSchema();
    }
    let hasData = false;
    try {
        hasData = await sqliteHasAnyData(client);
    } catch (error) {
        if (__DEV__) {
            console.warn('[Storage] SQLite availability check failed', error);
        }
        hasData = false;
    }
    if (!hasData) {
        const jsonValue = await getLegacyJson(AsyncStorage);
        if (jsonValue != null) {
            try {
                const data = JSON.parse(jsonValue) as AppData;
                data.areas = Array.isArray(data.areas) ? data.areas : [];
                await adapter.saveData(data);
                await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
            } catch (error) {
                console.warn('[Storage] Failed to migrate JSON data to SQLite', error);
            }
        }
    }
    return { adapter, client };
};

const getSqliteState = async (): Promise<SqliteState> => {
    if (!sqliteStatePromise) {
        sqliteStatePromise = initSqliteState().catch((error) => {
            sqliteStatePromise = null;
            throw error;
        });
    }
    return sqliteStatePromise;
};

// Platform-specific storage implementation
const createStorage = (): StorageAdapter => {
    // Web platform - use localStorage
    if (Platform.OS === 'web') {
        return {
            getData: async (): Promise<AppData> => {
                if (typeof window === 'undefined') {
                    return { tasks: [], projects: [], areas: [], settings: {} };
                }
                let jsonValue = localStorage.getItem(DATA_KEY);
                if (jsonValue == null) {
                    for (const legacyKey of LEGACY_DATA_KEYS) {
                        const legacyValue = localStorage.getItem(legacyKey);
                        if (legacyValue != null) {
                            localStorage.setItem(DATA_KEY, legacyValue);
                            jsonValue = legacyValue;
                            break;
                        }
                    }
                }
                if (jsonValue == null) {
                    return { tasks: [], projects: [], areas: [], settings: {} };
                }
                try {
                    const data = JSON.parse(jsonValue) as AppData;
                    data.areas = Array.isArray(data.areas) ? data.areas : [];
                    return data;
                } catch (e) {
                    // JSON parse error - data corrupted, throw so user is notified
                    console.error('Failed to parse stored data - may be corrupted', e);
                    throw new Error('Data appears corrupted. Please restore from backup.');
                }
            },
            saveData: async (data: AppData): Promise<void> => {
                try {
                    if (typeof window !== 'undefined') {
                        const jsonValue = JSON.stringify(data);
                        localStorage.setItem(DATA_KEY, jsonValue);
                    }
                } catch (e) {
                    console.error('Failed to save data', e);
                    throw new Error('Failed to save data: ' + (e as Error).message);
                }
            },
        };
    }

    // Native platforms - use SQLite with AsyncStorage backup for widgets/rollback.
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;

    return {
        getData: async (): Promise<AppData> => {
            try {
                const { adapter } = await getSqliteState();
                const data = await adapter.getData();
                data.areas = Array.isArray(data.areas) ? data.areas : [];
                updateAndroidWidgetFromData(data).catch((error) => {
                    console.warn('[Widgets] Failed to update Android widget from storage load', error);
                });
                return data;
            } catch (e) {
                console.warn('[Storage] SQLite load failed, falling back to JSON backup', e);
                const jsonValue = await getLegacyJson(AsyncStorage);
                if (jsonValue != null) {
                    try {
                        const data = JSON.parse(jsonValue) as AppData;
                        data.areas = Array.isArray(data.areas) ? data.areas : [];
                        updateAndroidWidgetFromData(data).catch((error) => {
                            console.warn('[Widgets] Failed to update Android widget from backup', error);
                        });
                        return data;
                    } catch (parseError) {
                        console.error('Failed to parse stored data - may be corrupted', parseError);
                    }
                }
                throw new Error('Data appears corrupted. Please restore from backup.');
            }
        },
        saveData: async (data: AppData): Promise<void> => {
            try {
                const { adapter } = await getSqliteState();
                await adapter.saveData(data);
            } catch (error) {
                console.warn('[Storage] SQLite save failed, keeping JSON backup', error);
            }
            try {
                const jsonValue = JSON.stringify(data);
                await AsyncStorage.setItem(DATA_KEY, jsonValue);
                await updateAndroidWidgetFromData(data);
            } catch (e) {
                console.error('Failed to save data', e);
                throw new Error('Failed to save data: ' + (e as Error).message);
            }
        },
    };
};

export const mobileStorage = createStorage();
