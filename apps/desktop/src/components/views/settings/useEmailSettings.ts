import { useCallback, useEffect, useState } from 'react';
import type { AppData } from '@mindwtr/core';
import { isTauriRuntime } from '../../../lib/runtime';
import { reportError } from '../../../lib/report-error';
import { fetchAndCreateTasks } from '../../../lib/email-polling-service';

type EmailCaptureSettings = NonNullable<AppData['settings']['emailCapture']>;
type EmailSettingsUpdate = Partial<EmailCaptureSettings>;

type UseEmailSettingsOptions = {
    settings: AppData['settings'] | undefined;
    updateSettings: (next: Partial<AppData['settings']>) => Promise<void>;
    showSaved: () => void;
};

export function useEmailSettings({ settings, updateSettings, showSaved }: UseEmailSettingsOptions) {
    const [password, setPassword] = useState('');
    const [passwordLoaded, setPasswordLoaded] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testError, setTestError] = useState<string | null>(null);
    const [availableFolders, setAvailableFolders] = useState<string[]>([]);
    const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetchCount, setFetchCount] = useState(0);

    const emailSettings = settings?.emailCapture ?? {};
    const enabled = emailSettings.enabled === true;
    const server = emailSettings.server ?? '';
    const port = emailSettings.port ?? 993;
    const useTls = emailSettings.useTls !== false;
    const username = emailSettings.username ?? '';
    // Backward-compat: old `folder` field falls back for actionFolder
    const actionFolder = emailSettings.actionFolder ?? emailSettings.folder ?? '@ACTION';
    const actionPrefix = emailSettings.actionPrefix ?? 'EMAIL-TODO: ';
    const waitingFolder = emailSettings.waitingFolder ?? '@WAITINGFOR';
    const waitingPrefix = emailSettings.waitingPrefix ?? 'EMAIL-AWAIT: ';
    const pollIntervalMinutes = emailSettings.pollIntervalMinutes ?? 5;
    const archiveAction = emailSettings.archiveAction ?? 'move';
    const archiveFolder = emailSettings.archiveFolder ?? '[Gmail]/All Mail';
    const tagNewTasks = emailSettings.tagNewTasks ?? 'email';
    const lastPollAt = emailSettings.lastPollAt ?? null;
    const lastPollError = emailSettings.lastPollError ?? null;
    const lastPollTaskCount = emailSettings.lastPollTaskCount ?? 0;

    // Load password from keyring on mount.
    useEffect(() => {
        if (!isTauriRuntime()) {
            setPasswordLoaded(true);
            return;
        }
        let active = true;
        (async () => {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const value = await invoke<string>('get_imap_password');
                if (active) setPassword(value || '');
            } catch (error) {
                reportError('Failed to load IMAP password', error);
            } finally {
                if (active) setPasswordLoaded(true);
            }
        })();
        return () => { active = false; };
    }, []);

    const updateEmailSettings = useCallback((next: EmailSettingsUpdate) => {
        updateSettings({
            emailCapture: { ...(settings?.emailCapture ?? {}), ...next },
        })
            .then(showSaved)
            .catch((error) => reportError('Failed to update email settings', error));
    }, [settings?.emailCapture, showSaved, updateSettings]);

    const handlePasswordChange = useCallback((value: string) => {
        setPassword(value);
        if (!isTauriRuntime()) return;
        (async () => {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('set_imap_password', { value: value || null });
            } catch (error) {
                reportError('Failed to save IMAP password', error);
            }
        })();
    }, []);

    const getConnectParams = useCallback(() => ({
        server,
        port,
        useTls,
        username,
    }), [server, port, useTls, username]);

    const handleTestConnection = useCallback(async () => {
        if (!isTauriRuntime()) return;
        setTestStatus('testing');
        setTestError(null);
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const folders = await invoke<string[]>('imap_test_connection', {
                params: getConnectParams(),
            });
            setAvailableFolders(folders);
            setTestStatus('success');
            setTimeout(() => setTestStatus('idle'), 3000);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setTestError(message);
            setTestStatus('error');
        }
    }, [getConnectParams]);

    const handleFetchNow = useCallback(async () => {
        if (!isTauriRuntime()) return;
        setFetchStatus('fetching');
        setFetchError(null);
        try {
            const shared = {
                params: getConnectParams(),
                archiveAction,
                archiveFolder: archiveAction === 'move' ? archiveFolder : null,
                tag: tagNewTasks || undefined,
            };

            const actionCount = await fetchAndCreateTasks({
                ...shared,
                folder: actionFolder,
                titlePrefix: actionPrefix,
                taskStatus: 'inbox' as const,
            });

            const waitingCount = await fetchAndCreateTasks({
                ...shared,
                folder: waitingFolder,
                titlePrefix: waitingPrefix,
                taskStatus: 'waiting' as const,
            });

            const count = actionCount + waitingCount;
            setFetchCount(count);
            updateEmailSettings({
                lastPollAt: new Date().toISOString(),
                lastPollError: undefined,
                lastPollTaskCount: count,
            });
            setFetchStatus('success');
            setTimeout(() => setFetchStatus('idle'), 3000);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setFetchError(message);
            updateEmailSettings({
                lastPollAt: new Date().toISOString(),
                lastPollError: message,
            });
            setFetchStatus('error');
        }
    }, [getConnectParams, actionFolder, actionPrefix, waitingFolder, waitingPrefix, tagNewTasks, archiveAction, archiveFolder, updateEmailSettings]);

    return {
        enabled,
        server,
        port,
        useTls,
        username,
        password,
        passwordLoaded,
        actionFolder,
        actionPrefix,
        waitingFolder,
        waitingPrefix,
        pollIntervalMinutes,
        archiveAction,
        archiveFolder,
        tagNewTasks,
        lastPollAt,
        lastPollError,
        lastPollTaskCount,
        testStatus,
        testError,
        availableFolders,
        fetchStatus,
        fetchError,
        fetchCount,
        onUpdateEmailSettings: updateEmailSettings,
        onPasswordChange: handlePasswordChange,
        onTestConnection: handleTestConnection,
        onFetchNow: handleFetchNow,
    };
}
