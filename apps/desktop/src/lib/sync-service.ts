
import { mergeAppDataWithStats, AppData, useTaskStore, MergeStats, cloudGetJson, cloudPutJson, webdavGetJson, webdavPutJson } from '@mindwtr/core';
import { isTauriRuntime } from './runtime';
import { webStorage } from './storage-adapter-web';

type SyncBackend = 'file' | 'webdav' | 'cloud';

const SYNC_BACKEND_KEY = 'mindwtr-sync-backend';
const WEBDAV_URL_KEY = 'mindwtr-webdav-url';
const WEBDAV_USERNAME_KEY = 'mindwtr-webdav-username';
const WEBDAV_PASSWORD_KEY = 'mindwtr-webdav-password';
const CLOUD_URL_KEY = 'mindwtr-cloud-url';
const CLOUD_TOKEN_KEY = 'mindwtr-cloud-token';

async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    const mod = await import('@tauri-apps/api/core');
    return mod.invoke<T>(command as any, args as any);
}

export class SyncService {
    static getSyncBackend(): SyncBackend {
        const raw = localStorage.getItem(SYNC_BACKEND_KEY);
        return raw === 'webdav' ? 'webdav' : raw === 'cloud' ? 'cloud' : 'file';
    }

    static setSyncBackend(backend: SyncBackend) {
        localStorage.setItem(SYNC_BACKEND_KEY, backend);
    }

    static getWebDavConfig() {
        return {
            url: localStorage.getItem(WEBDAV_URL_KEY) || '',
            username: localStorage.getItem(WEBDAV_USERNAME_KEY) || '',
            password: localStorage.getItem(WEBDAV_PASSWORD_KEY) || '',
        };
    }

    static setWebDavConfig(config: { url: string; username?: string; password?: string }) {
        localStorage.setItem(WEBDAV_URL_KEY, config.url);
        localStorage.setItem(WEBDAV_USERNAME_KEY, config.username || '');
        localStorage.setItem(WEBDAV_PASSWORD_KEY, config.password || '');
    }

    static getCloudConfig() {
        return {
            url: localStorage.getItem(CLOUD_URL_KEY) || '',
            token: localStorage.getItem(CLOUD_TOKEN_KEY) || '',
        };
    }

    static setCloudConfig(config: { url: string; token: string }) {
        localStorage.setItem(CLOUD_URL_KEY, config.url);
        localStorage.setItem(CLOUD_TOKEN_KEY, config.token);
    }

    /**
     * Get the currently configured sync path from the backend
     */
    static async getSyncPath(): Promise<string> {
        if (!isTauriRuntime()) return '';
        try {
            return await tauriInvoke<string>('get_sync_path');
        } catch (error) {
            console.error('Failed to get sync path:', error);
            return '';
        }
    }

    /**
     * Set the sync path in the backend
     */
    static async setSyncPath(path: string): Promise<{ success: boolean; path: string }> {
        if (!isTauriRuntime()) return { success: false, path: '' };
        try {
            return await tauriInvoke<{ success: boolean; path: string }>('set_sync_path', { syncPath: path });
        } catch (error) {
            console.error('Failed to set sync path:', error);
            return { success: false, path: '' };
        }
    }

    /**
     * Perform a full sync cycle:
     * 1. Read Local & Remote Data
     * 2. Merge (Last-Write-Wins)
     * 3. Write merged data back to both Local & Remote
     * 4. Refresh Core Store
     */
    static async performSync(): Promise<{ success: boolean; stats?: MergeStats; error?: string }> {
        try {
            // 1. Read Local Data
            const localData = isTauriRuntime() ? await tauriInvoke<AppData>('get_data') : await webStorage.getData();

            // 2. Read Sync Data (file or WebDAV)
            let syncData: AppData;
            const backend = SyncService.getSyncBackend();
            if (backend === 'webdav') {
                const { url, username, password } = SyncService.getWebDavConfig();
                if (!url) {
                    throw new Error('WebDAV URL not configured');
                }
                const remote = await webdavGetJson<AppData>(url, { username, password });
                syncData = remote || { tasks: [], projects: [], settings: {} };
            } else if (backend === 'cloud') {
                const { url, token } = SyncService.getCloudConfig();
                if (!url || !token) {
                    throw new Error('Cloud sync not configured');
                }
                const remote = await cloudGetJson<AppData>(url, { token });
                syncData = remote || { tasks: [], projects: [], settings: {} };
            } else {
                if (!isTauriRuntime()) {
                    throw new Error('File sync is not available in the web app.');
                }
                syncData = await tauriInvoke<AppData>('read_sync_file');
            }

            // 3. Merge Strategies
            // mergeAppData uses Last-Write-Wins (LWW) based on updatedAt
            const mergeResult = mergeAppDataWithStats(localData, syncData);
            const mergedData = mergeResult.data;
            const stats = mergeResult.stats;

            const now = new Date().toISOString();
            const finalData: AppData = {
                ...mergedData,
                settings: {
                    ...mergedData.settings,
                    lastSyncAt: now,
                    lastSyncStatus: 'success',
                    lastSyncError: undefined,
                    lastSyncStats: stats,
                },
            };

            // 4. Write back to Local
            if (isTauriRuntime()) {
                await tauriInvoke('save_data', { data: finalData });
            } else {
                await webStorage.saveData(finalData);
            }

            // 5. Write back to Sync
            if (backend === 'webdav') {
                const { url, username, password } = SyncService.getWebDavConfig();
                await webdavPutJson(url, finalData, { username, password });
            } else if (backend === 'cloud') {
                const { url, token } = SyncService.getCloudConfig();
                await cloudPutJson(url, finalData, { token });
            } else {
                await tauriInvoke('write_sync_file', { data: finalData });
            }

            // 6. Refresh UI Store
            await useTaskStore.getState().fetchData();

            return { success: true, stats };
        } catch (error) {
            console.error('Sync failed', error);
            const now = new Date().toISOString();
            try {
                await useTaskStore.getState().fetchData();
                await useTaskStore.getState().updateSettings({
                    lastSyncAt: now,
                    lastSyncStatus: 'error',
                    lastSyncError: String(error),
                });
            } catch (e) {
                console.error('Failed to persist sync error', e);
            }
            return { success: false, error: String(error) };
        }
    }
}
