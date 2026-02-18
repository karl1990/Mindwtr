import { useTaskStore, type TaskStatus, type EmailCaptureAccount } from '@mindwtr/core';
import { isTauriRuntime } from './runtime';
import { reportError } from './report-error';
import { createInboxTask } from './inbox-task-creator';

// --- Shared types ---

/** Matches the Rust FetchedEmail struct (serde camelCase). */
export interface FetchedEmail {
    messageId: string;
    subject: string;
    from: string;
    bodyText: string;
    date: string | null;
    uid: number;
}

interface FetchAndCreateOptions {
    params: {
        server: string;
        port: number;
        useTls: boolean;
        username: string;
    };
    passwordKey: string;
    folder: string;
    titlePrefix: string;
    taskStatus: TaskStatus;
    archiveAction: string;
    archiveFolder: string | null;
    tag?: string;
    maxCount?: number;
}

// --- Shared pipeline ---

function formatEmailDescription(email: FetchedEmail): string {
    const lines: string[] = [`From: ${email.from}`];
    if (email.date) lines.push(`Date: ${email.date}`);
    lines.push('');
    lines.push((email.bodyText || '').slice(0, 2000));
    return lines.join('\n');
}

/** Build the keyring key for a given account. */
export function imapPasswordKey(username: string, server: string): string {
    return `imap_password_${username}_${server}`;
}

/**
 * Core pipeline: fetch all emails from folder, create inbox tasks, archive processed.
 * Returns the number of tasks created. Throws on fetch errors.
 * Archive errors are logged but do not throw (emails would be re-fetched next poll).
 */
export async function fetchAndCreateTasks(options: FetchAndCreateOptions): Promise<number> {
    const { invoke } = await import('@tauri-apps/api/core');

    const emails = await invoke<FetchedEmail[]>('imap_fetch_emails', {
        params: options.params,
        folder: options.folder,
        maxCount: options.maxCount ?? 50,
        passwordKey: options.passwordKey,
    });

    if (emails.length === 0) {
        return 0;
    }

    const { addTask } = useTaskStore.getState();
    const uids: number[] = [];

    for (const email of emails) {
        const rawSubject = email.subject || '(no subject)';
        const title = options.titlePrefix ? `${options.titlePrefix}${rawSubject}` : rawSubject;
        await createInboxTask({
            source: `imap-${options.taskStatus === 'waiting' ? 'waiting' : 'action'}`,
            title,
            description: formatEmailDescription(email),
            inboxType: options.taskStatus === 'waiting' ? 'waiting' : 'inbox',
            tags: options.tag ? [options.tag] : [],
        }, addTask);
        uids.push(email.uid);
    }

    if (uids.length > 0) {
        try {
            await invoke('imap_archive_emails', {
                params: options.params,
                folder: options.folder,
                uids,
                action: options.archiveAction,
                archiveFolder: options.archiveAction === 'move' ? options.archiveFolder : null,
                passwordKey: options.passwordKey,
            });
        } catch (archiveError) {
            reportError('Email archive failed', archiveError);
        }
    }

    return emails.length;
}

// --- Per-account polling lifecycle ---

interface AccountPollState {
    timeoutId: number;
    pollInFlight: boolean;
}

const accountStates = new Map<string, AccountPollState>();
let started = false;
let unsubscribe: (() => void) | null = null;

/**
 * Run a single poll cycle for one account.
 * Reads config from the store, updates lastPoll status when done.
 */
async function pollOnceForAccount(accountId: string): Promise<void> {
    const state = accountStates.get(accountId);
    if (!state || state.pollInFlight) return;
    state.pollInFlight = true;

    try {
        const { settings, updateSettings } = useTaskStore.getState();
        const accounts = settings.emailCapture?.accounts ?? [];
        const account = accounts.find((a) => a.id === accountId);
        if (!account?.enabled || !account.server || !account.username) return;

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

        const actionFolder = account.actionFolder ?? '@ACTION';
        const waitingFolder = account.waitingFolder ?? '@WAITINGFOR';
        const actionPrefix = account.actionPrefix ?? 'EMAIL-TODO: ';
        const waitingPrefix = account.waitingPrefix ?? 'EMAIL-AWAIT: ';

        const shared = { params, passwordKey, archiveAction, archiveFolder, tag };

        const actionCount = await fetchAndCreateTasks({
            ...shared,
            folder: actionFolder,
            titlePrefix: actionPrefix,
            taskStatus: 'inbox',
        });

        const waitingCount = await fetchAndCreateTasks({
            ...shared,
            folder: waitingFolder,
            titlePrefix: waitingPrefix,
            taskStatus: 'waiting',
        });

        const count = actionCount + waitingCount;

        // Update just this account's lastPoll fields
        const freshAccounts = useTaskStore.getState().settings.emailCapture?.accounts ?? [];
        await updateSettings({
            emailCapture: {
                accounts: freshAccounts.map((a) =>
                    a.id === accountId
                        ? { ...a, lastPollAt: new Date().toISOString(), lastPollError: undefined, lastPollTaskCount: count }
                        : a
                ),
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        try {
            const { settings, updateSettings } = useTaskStore.getState();
            const freshAccounts = settings.emailCapture?.accounts ?? [];
            await updateSettings({
                emailCapture: {
                    accounts: freshAccounts.map((a) =>
                        a.id === accountId
                            ? { ...a, lastPollAt: new Date().toISOString(), lastPollError: message }
                            : a
                    ),
                },
            });
        } catch {
            // Ignore nested error.
        }
        reportError('Email polling failed', error);
    } finally {
        if (state) state.pollInFlight = false;
    }
}

function getIntervalMsForAccount(account: EmailCaptureAccount): number {
    const minutes = account.pollIntervalMinutes ?? 5;
    return Math.max(1, minutes) * 60 * 1000;
}

function scheduleNextForAccount(accountId: string) {
    const existing = accountStates.get(accountId);
    if (existing) {
        window.clearTimeout(existing.timeoutId);
    }

    const { settings } = useTaskStore.getState();
    const account = (settings.emailCapture?.accounts ?? []).find((a) => a.id === accountId);
    if (!account?.enabled) return;

    const ms = getIntervalMsForAccount(account);
    const timeoutId = window.setTimeout(async () => {
        const { settings: freshSettings } = useTaskStore.getState();
        const freshAccount = (freshSettings.emailCapture?.accounts ?? []).find((a) => a.id === accountId);
        if (freshAccount?.enabled) {
            await pollOnceForAccount(accountId);
        }
        if (started && accountStates.has(accountId)) {
            scheduleNextForAccount(accountId);
        }
    }, ms);

    const state = accountStates.get(accountId);
    if (state) {
        state.timeoutId = timeoutId;
    } else {
        accountStates.set(accountId, { timeoutId, pollInFlight: false });
    }
}

function stopAccountTimer(accountId: string) {
    const state = accountStates.get(accountId);
    if (state) {
        window.clearTimeout(state.timeoutId);
        accountStates.delete(accountId);
    }
}

/** Reconcile running timers with the current account list. */
function reconcileAccounts() {
    const { settings } = useTaskStore.getState();
    const accounts = settings.emailCapture?.accounts ?? [];
    const enabledIds = new Set(accounts.filter((a) => a.enabled).map((a) => a.id));

    // Stop timers for accounts that were removed or disabled
    for (const id of accountStates.keys()) {
        if (!enabledIds.has(id)) {
            stopAccountTimer(id);
        }
    }

    // Start/reschedule timers for enabled accounts
    for (const id of enabledIds) {
        scheduleNextForAccount(id);
    }
}

export function startEmailPolling(): void {
    if (!isTauriRuntime()) return;
    if (started) return;
    started = true;

    // Watch for setting changes to start/stop/reconfigure polling.
    unsubscribe = useTaskStore.subscribe((state, prevState) => {
        const curr = state.settings.emailCapture;
        const prev = prevState.settings.emailCapture;
        if (curr === prev) return;
        reconcileAccounts();
    });

    // Initial schedule for all enabled accounts.
    reconcileAccounts();
}

export function stopEmailPolling(): void {
    started = false;
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    for (const id of [...accountStates.keys()]) {
        stopAccountTimer(id);
    }
}
