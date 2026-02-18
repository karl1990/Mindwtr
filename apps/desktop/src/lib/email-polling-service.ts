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

/** Result returned by fetchAndCreateTasks. */
export interface FetchResult {
    count: number;
    archiveWarning?: string;
}

/** Matches the Rust FetchAndArchiveResult struct (serde camelCase). */
interface RustFetchAndArchiveResult {
    emails: FetchedEmail[];
    archiveError: string | null;
}

/**
 * Core pipeline: fetch emails and archive them in a single IMAP session,
 * then create inbox tasks for each email.
 *
 * Using a single session avoids UID validity issues where UIDs from one
 * connection are invalid in a second connection (common on basic IMAP servers).
 *
 * Returns the number of tasks created and any archive warning.
 * Throws on fetch/connection errors. Archive errors are returned as warnings
 * (emails would be re-fetched next poll).
 */
export async function fetchAndCreateTasks(options: FetchAndCreateOptions): Promise<FetchResult> {
    const { invoke } = await import('@tauri-apps/api/core');

    const result = await invoke<RustFetchAndArchiveResult>('imap_fetch_and_archive', {
        params: options.params,
        folder: options.folder,
        maxCount: options.maxCount ?? 50,
        passwordKey: options.passwordKey,
        action: options.archiveAction,
        archiveFolder: options.archiveAction === 'move' ? options.archiveFolder : null,
    });

    if (result.emails.length === 0) {
        return { count: 0 };
    }

    const { addTask } = useTaskStore.getState();

    for (const email of result.emails) {
        const rawSubject = email.subject || '(no subject)';
        const title = options.titlePrefix ? `${options.titlePrefix}${rawSubject}` : rawSubject;
        await createInboxTask({
            source: `imap-${options.taskStatus === 'waiting' ? 'waiting' : 'action'}`,
            title,
            description: formatEmailDescription(email),
            inboxType: options.taskStatus === 'waiting' ? 'waiting' : 'inbox',
            tags: options.tag ? [options.tag] : [],
        }, addTask);
    }

    const archiveWarning = result.archiveError ?? undefined;
    if (archiveWarning) {
        reportError('Email archive failed', new Error(archiveWarning));
    }

    return { count: result.emails.length, archiveWarning };
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

        const actionResult = await fetchAndCreateTasks({
            ...shared,
            folder: actionFolder,
            titlePrefix: actionPrefix,
            taskStatus: 'inbox',
        });

        const waitingResult = await fetchAndCreateTasks({
            ...shared,
            folder: waitingFolder,
            titlePrefix: waitingPrefix,
            taskStatus: 'waiting',
        });

        const count = actionResult.count + waitingResult.count;
        const archiveWarning = actionResult.archiveWarning ?? waitingResult.archiveWarning;

        // Update just this account's lastPoll fields
        const freshAccounts = useTaskStore.getState().settings.emailCapture?.accounts ?? [];
        await updateSettings({
            emailCapture: {
                accounts: freshAccounts.map((a) =>
                    a.id === accountId
                        ? { ...a, lastPollAt: new Date().toISOString(), lastPollError: archiveWarning, lastPollTaskCount: count }
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
