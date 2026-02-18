import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppData, EmailCaptureAccount } from '@mindwtr/core';
import { isTauriRuntime } from '../../../lib/runtime';
import { reportError } from '../../../lib/report-error';
import { fetchAndCreateTasks, imapPasswordKey } from '../../../lib/email-polling-service';

/** Per-account transient UI state (not persisted). */
export interface AccountTransientState {
    password: string;
    passwordLoaded: boolean;
    testStatus: 'idle' | 'testing' | 'success' | 'error';
    testError: string | null;
    availableFolders: string[];
    fetchStatus: 'idle' | 'fetching' | 'success' | 'error';
    fetchError: string | null;
    fetchCount: number;
}

function defaultTransientState(): AccountTransientState {
    return {
        password: '',
        passwordLoaded: false,
        testStatus: 'idle',
        testError: null,
        availableFolders: [],
        fetchStatus: 'idle',
        fetchError: null,
        fetchCount: 0,
    };
}

type UseEmailSettingsOptions = {
    settings: AppData['settings'] | undefined;
    updateSettings: (next: Partial<AppData['settings']>) => Promise<void>;
    showSaved: () => void;
};

export function useEmailSettings({ settings, updateSettings, showSaved }: UseEmailSettingsOptions) {
    const accounts: EmailCaptureAccount[] = settings?.emailCapture?.accounts ?? [];

    // Keep a ref to the latest accounts so callbacks always see fresh data.
    // React's useCallback captures values at render time, but the user can type
    // faster than React re-renders (e.g. filling username then immediately tabbing
    // to password). Reading from this ref avoids stale-closure bugs.
    const accountsRef = useRef(accounts);
    accountsRef.current = accounts;

    // Per-account transient state, keyed by account ID.
    const [accountStates, setAccountStates] = useState<Map<string, AccountTransientState>>(new Map());

    // Track which account IDs we've already started loading passwords for.
    const loadedPasswordIds = useRef(new Set<string>());

    // Helper to get or create transient state for an account.
    const getAccountState = useCallback((accountId: string): AccountTransientState => {
        return accountStates.get(accountId) ?? defaultTransientState();
    }, [accountStates]);

    // Helper to update one account's transient state.
    const updateAccountState = useCallback((accountId: string, partial: Partial<AccountTransientState>) => {
        setAccountStates((prev) => {
            const next = new Map(prev);
            const current = next.get(accountId) ?? defaultTransientState();
            next.set(accountId, { ...current, ...partial });
            return next;
        });
    }, []);

    // Load passwords from keyring for any account that hasn't been loaded yet.
    useEffect(() => {
        if (!isTauriRuntime()) {
            // In web mode, mark all as loaded immediately.
            const newLoaded = new Set(loadedPasswordIds.current);
            let changed = false;
            for (const account of accounts) {
                if (!newLoaded.has(account.id)) {
                    newLoaded.add(account.id);
                    changed = true;
                    updateAccountState(account.id, { passwordLoaded: true });
                }
            }
            if (changed) loadedPasswordIds.current = newLoaded;
            return;
        }

        for (const account of accounts) {
            if (loadedPasswordIds.current.has(account.id)) continue;
            loadedPasswordIds.current.add(account.id);

            const key = account.username && account.server
                ? imapPasswordKey(account.username, account.server)
                : undefined;

            if (!key) {
                updateAccountState(account.id, { passwordLoaded: true });
                continue;
            }

            (async () => {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    const value = await invoke<string>('get_imap_password', { key });
                    updateAccountState(account.id, { password: value || '', passwordLoaded: true });
                } catch (error) {
                    reportError('Failed to load IMAP password', error);
                    updateAccountState(account.id, { passwordLoaded: true });
                }
            })();
        }
    }, [accounts, updateAccountState]);

    // Persist the accounts array to store.
    const persistAccounts = useCallback((nextAccounts: EmailCaptureAccount[]) => {
        updateSettings({
            emailCapture: { accounts: nextAccounts },
        })
            .then(showSaved)
            .catch((error) => reportError('Failed to update email settings', error));
    }, [showSaved, updateSettings]);

    const onAddAccount = useCallback(() => {
        const current = accountsRef.current;
        if (current.length >= 10) return;
        const id = crypto.randomUUID();
        const newAccount: EmailCaptureAccount = {
            id,
            enabled: false,
            server: '',
            port: 993,
            useTls: true,
            username: '',
            actionFolder: '@ACTION',
            actionPrefix: 'EMAIL-TODO: ',
            waitingFolder: '@WAITINGFOR',
            waitingPrefix: 'EMAIL-AWAIT: ',
            pollIntervalMinutes: 5,
            archiveAction: 'move',
            archiveFolder: '[Gmail]/All Mail',
            tagNewTasks: 'email',
        };
        updateAccountState(id, { ...defaultTransientState(), passwordLoaded: true });
        persistAccounts([...current, newAccount]);
    }, [persistAccounts, updateAccountState]);

    const onRemoveAccount = useCallback((accountId: string) => {
        const current = accountsRef.current;
        const account = current.find((a) => a.id === accountId);
        // Delete password from keyring
        if (account?.username && account?.server && isTauriRuntime()) {
            const key = imapPasswordKey(account.username, account.server);
            (async () => {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    await invoke('set_imap_password', { key, value: null });
                } catch (error) {
                    reportError('Failed to delete IMAP password', error);
                }
            })();
        }
        // Clean up transient state
        setAccountStates((prev) => {
            const next = new Map(prev);
            next.delete(accountId);
            return next;
        });
        loadedPasswordIds.current.delete(accountId);
        persistAccounts(current.filter((a) => a.id !== accountId));
    }, [persistAccounts]);

    const onUpdateAccount = useCallback((accountId: string, partial: Partial<EmailCaptureAccount>) => {
        const current = accountsRef.current;
        persistAccounts(current.map((a) =>
            a.id === accountId ? { ...a, ...partial } : a
        ));
    }, [persistAccounts]);

    const onPasswordChange = useCallback((accountId: string, value: string) => {
        updateAccountState(accountId, { password: value });
        // Read from ref to avoid stale-closure: the user may have just typed
        // username/server and tabbed here before React re-rendered.
        const account = accountsRef.current.find((a) => a.id === accountId);
        if (!account?.username || !account?.server || !isTauriRuntime()) return;
        const key = imapPasswordKey(account.username, account.server);
        (async () => {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('set_imap_password', { key, value: value || null });
            } catch (error) {
                reportError('Failed to save IMAP password', error);
            }
        })();
    }, [updateAccountState]);

    const onTestConnection = useCallback(async (accountId: string) => {
        if (!isTauriRuntime()) return;
        const account = accountsRef.current.find((a) => a.id === accountId);
        if (!account?.server || !account?.username) return;

        updateAccountState(accountId, { testStatus: 'testing', testError: null });
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const key = imapPasswordKey(account.username, account.server);
            const folders = await invoke<string[]>('imap_test_connection', {
                params: {
                    server: account.server,
                    port: account.port ?? 993,
                    useTls: account.useTls !== false,
                    username: account.username,
                },
                passwordKey: key,
            });
            updateAccountState(accountId, { availableFolders: folders, testStatus: 'success' });
            setTimeout(() => updateAccountState(accountId, { testStatus: 'idle' }), 3000);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            updateAccountState(accountId, { testError: message, testStatus: 'error' });
        }
    }, [updateAccountState]);

    const onFetchNow = useCallback(async (accountId: string) => {
        if (!isTauriRuntime()) return;
        const account = accountsRef.current.find((a) => a.id === accountId);
        if (!account?.server || !account?.username) return;

        updateAccountState(accountId, { fetchStatus: 'fetching', fetchError: null });
        try {
            const params = {
                server: account.server,
                port: account.port ?? 993,
                useTls: account.useTls !== false,
                username: account.username,
            };
            const passwordKey = imapPasswordKey(account.username, account.server);
            const archiveAction = account.archiveAction ?? 'move';
            const archiveFolder = archiveAction === 'move' ? (account.archiveFolder ?? '[Gmail]/All Mail') : null;
            const tag = account.tagNewTasks || undefined;

            const shared = { params, passwordKey, archiveAction, archiveFolder, tag };

            const actionResult = await fetchAndCreateTasks({
                ...shared,
                folder: account.actionFolder ?? '@ACTION',
                titlePrefix: account.actionPrefix ?? 'EMAIL-TODO: ',
                taskStatus: 'inbox' as const,
            });

            const waitingResult = await fetchAndCreateTasks({
                ...shared,
                folder: account.waitingFolder ?? '@WAITINGFOR',
                titlePrefix: account.waitingPrefix ?? 'EMAIL-AWAIT: ',
                taskStatus: 'waiting' as const,
            });

            const count = actionResult.count + waitingResult.count;
            const archiveWarning = actionResult.archiveWarning ?? waitingResult.archiveWarning;
            updateAccountState(accountId, { fetchCount: count, fetchStatus: 'success', fetchError: archiveWarning ?? null });
            onUpdateAccount(accountId, {
                lastPollAt: new Date().toISOString(),
                lastPollError: archiveWarning,
                lastPollTaskCount: count,
            });
            setTimeout(() => updateAccountState(accountId, { fetchStatus: 'idle' }), 3000);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            updateAccountState(accountId, { fetchError: message, fetchStatus: 'error' });
            onUpdateAccount(accountId, {
                lastPollAt: new Date().toISOString(),
                lastPollError: message,
            });
        }
    }, [updateAccountState, onUpdateAccount]);

    return {
        accounts,
        accountStates,
        getAccountState,
        onAddAccount,
        onRemoveAccount,
        onUpdateAccount,
        onPasswordChange,
        onTestConnection,
        onFetchNow,
    };
}
