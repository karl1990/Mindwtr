import { useTaskStore, type TaskStatus } from '@mindwtr/core';
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

/**
 * Core pipeline: fetch unseen emails, create inbox tasks, archive processed.
 * Returns the number of tasks created. Throws on fetch errors.
 * Archive errors are logged but do not throw (emails would be re-fetched next poll).
 */
export async function fetchAndCreateTasks(options: FetchAndCreateOptions): Promise<number> {
    const { invoke } = await import('@tauri-apps/api/core');

    const emails = await invoke<FetchedEmail[]>('imap_fetch_emails', {
        params: options.params,
        folder: options.folder,
        maxCount: options.maxCount ?? 50,
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
            });
        } catch (archiveError) {
            reportError('Email archive failed', archiveError);
        }
    }

    return emails.length;
}

// --- Polling lifecycle ---

let intervalId: number | null = null;
let started = false;
let pollInFlight = false;

/**
 * Run a single poll cycle using the shared pipeline.
 * Reads config from the store, updates lastPoll status when done.
 */
async function pollOnce(): Promise<void> {
    if (pollInFlight) return;
    pollInFlight = true;

    try {
        const { settings, updateSettings } = useTaskStore.getState();
        const ec = settings.emailCapture;
        if (!ec?.enabled || !ec.server || !ec.username) return;

        const params = {
            server: ec.server,
            port: ec.port ?? 993,
            useTls: ec.useTls !== false,
            username: ec.username,
        };
        const archiveAction = ec.archiveAction ?? 'read';
        const archiveFolder = archiveAction === 'move' ? (ec.archiveFolder ?? 'Archive') : null;
        const tag = ec.tagNewTasks || undefined;

        // Backward-compat: old `folder` field falls back for actionFolder
        const actionFolder = ec.actionFolder ?? ec.folder ?? '@ACTION';
        const waitingFolder = ec.waitingFolder ?? '@WAITINGFOR';
        const actionPrefix = ec.actionPrefix ?? 'EMAIL-TODO: ';
        const waitingPrefix = ec.waitingPrefix ?? 'EMAIL-AWAIT: ';

        const shared = { params, archiveAction, archiveFolder, tag };

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

        await updateSettings({
            emailCapture: {
                ...ec,
                lastPollAt: new Date().toISOString(),
                lastPollError: undefined,
                lastPollTaskCount: count,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        try {
            const { settings, updateSettings } = useTaskStore.getState();
            await updateSettings({
                emailCapture: {
                    ...(settings.emailCapture ?? {}),
                    lastPollAt: new Date().toISOString(),
                    lastPollError: message,
                },
            });
        } catch {
            // Ignore nested error.
        }
        reportError('Email polling failed', error);
    } finally {
        pollInFlight = false;
    }
}

function getIntervalMs(): number {
    const { settings } = useTaskStore.getState();
    const minutes = settings.emailCapture?.pollIntervalMinutes ?? 5;
    return Math.max(1, minutes) * 60 * 1000;
}

function scheduleNext() {
    if (intervalId !== null) {
        window.clearTimeout(intervalId);
    }
    const ms = getIntervalMs();
    intervalId = window.setTimeout(async () => {
        const { settings } = useTaskStore.getState();
        if (settings.emailCapture?.enabled) {
            await pollOnce();
        }
        if (started) scheduleNext();
    }, ms);
}

export function startEmailPolling(): void {
    if (!isTauriRuntime()) return;
    if (started) return;
    started = true;

    const { settings } = useTaskStore.getState();
    if (!settings.emailCapture?.enabled) {
        // Not enabled yet — just watch for setting changes.
    }

    // Watch for setting changes to start/stop/reconfigure polling.
    useTaskStore.subscribe((state, prevState) => {
        const curr = state.settings.emailCapture;
        const prev = prevState.settings.emailCapture;
        if (curr === prev) return;

        if (curr?.enabled && started) {
            // Re-schedule in case interval changed.
            scheduleNext();
        } else if (!curr?.enabled && intervalId !== null) {
            window.clearTimeout(intervalId);
            intervalId = null;
        }
    });

    // Initial schedule if enabled.
    if (settings.emailCapture?.enabled) {
        scheduleNext();
    }
}

export function stopEmailPolling(): void {
    started = false;
    if (intervalId !== null) {
        window.clearTimeout(intervalId);
        intervalId = null;
    }
}
