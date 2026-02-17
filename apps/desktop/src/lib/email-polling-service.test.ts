import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FetchedEmail } from './email-polling-service';

// --- Mocks (vi.hoisted ensures these exist before vi.mock factories run) ---

const { mockInvoke, mockAddTask, mockReportError } = vi.hoisted(() => ({
    mockInvoke: vi.fn(),
    mockAddTask: vi.fn(),
    mockReportError: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }));

vi.mock('@mindwtr/core', () => ({
    useTaskStore: {
        getState: () => ({ addTask: mockAddTask }),
    },
}));

vi.mock('./report-error', () => ({ reportError: mockReportError }));

// --- Import after mocks are set up ---

import { fetchAndCreateTasks } from './email-polling-service';

// --- Helpers ---

const defaultOptions = {
    params: {
        server: 'imap.example.com',
        port: 993,
        useTls: true,
        username: 'user@example.com',
    },
    folder: 'INBOX',
    titlePrefix: '',
    taskStatus: 'inbox' as const,
    archiveAction: 'read' as const,
    archiveFolder: null,
};

function makeEmail(overrides: Partial<FetchedEmail> = {}): FetchedEmail {
    return {
        messageId: '<msg-1@example.com>',
        subject: 'Test Email',
        from: 'sender@example.com',
        bodyText: 'Hello world',
        date: '2026-02-16T10:00:00Z',
        uid: 1,
        ...overrides,
    };
}

// --- Tests ---

describe('fetchAndCreateTasks', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    // -- Empty inbox --

    it('returns 0 when no emails are fetched', async () => {
        mockInvoke.mockResolvedValueOnce([]);

        const count = await fetchAndCreateTasks(defaultOptions);

        expect(count).toBe(0);
        expect(mockAddTask).not.toHaveBeenCalled();
    });

    it('does not call archive when no emails are fetched', async () => {
        mockInvoke.mockResolvedValueOnce([]);

        await fetchAndCreateTasks(defaultOptions);

        expect(mockInvoke).toHaveBeenCalledTimes(1);
        expect(mockInvoke).toHaveBeenCalledWith('imap_fetch_emails', expect.any(Object));
    });

    // -- Task creation --

    it('creates a task for each fetched email', async () => {
        mockInvoke.mockResolvedValueOnce([
            makeEmail({ uid: 1, subject: 'First' }),
            makeEmail({ uid: 2, subject: 'Second' }),
            makeEmail({ uid: 3, subject: 'Third' }),
        ]);
        mockInvoke.mockResolvedValueOnce(undefined); // archive

        const count = await fetchAndCreateTasks(defaultOptions);

        expect(count).toBe(3);
        expect(mockAddTask).toHaveBeenCalledTimes(3);
    });

    it('uses email subject as task title', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail({ subject: 'Buy groceries' })]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks(defaultOptions);

        expect(mockAddTask).toHaveBeenCalledWith('Buy groceries', expect.any(Object));
    });

    it('uses "(no subject)" when subject is empty', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail({ subject: '' })]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks(defaultOptions);

        expect(mockAddTask).toHaveBeenCalledWith('(no subject)', expect.any(Object));
    });

    // -- Description formatting --

    it('builds description with From, Date, and body', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail({
            from: 'alice@example.com',
            date: '2026-02-16T10:00:00Z',
            bodyText: 'Please review the doc',
        })]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks(defaultOptions);

        const desc: string = mockAddTask.mock.calls[0][1].description;
        expect(desc).toContain('From: alice@example.com');
        expect(desc).toContain('Date: 2026-02-16T10:00:00Z');
        expect(desc).toContain('Please review the doc');
    });

    it('omits Date line when email has no date', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail({ date: null })]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks(defaultOptions);

        const desc: string = mockAddTask.mock.calls[0][1].description;
        expect(desc).not.toContain('Date:');
    });

    it('truncates body text at 2000 characters', async () => {
        const longBody = 'x'.repeat(3000);
        mockInvoke.mockResolvedValueOnce([makeEmail({ bodyText: longBody })]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks(defaultOptions);

        const desc: string = mockAddTask.mock.calls[0][1].description;
        // Description = "From: ...\nDate: ...\n\n" + body (max 2000 chars)
        const bodyPart = desc.split('\n\n')[1];
        expect(bodyPart).toHaveLength(2000);
    });

    it('handles empty body text', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail({ bodyText: '' })]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks(defaultOptions);

        const desc: string = mockAddTask.mock.calls[0][1].description;
        expect(desc).toContain('From:');
        // Should not throw or include "undefined"
        expect(desc).not.toContain('undefined');
    });

    // -- Tagging --

    it('applies tag to created tasks when provided', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail()]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks({ ...defaultOptions, tag: 'email' });

        expect(mockAddTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ tags: ['email'] }),
        );
    });

    it('passes empty tags array when no tag provided', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail()]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks(defaultOptions);

        expect(mockAddTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ tags: [] }),
        );
    });

    // -- Archive behaviour --

    it('archives processed emails with correct UIDs', async () => {
        mockInvoke.mockResolvedValueOnce([
            makeEmail({ uid: 10 }),
            makeEmail({ uid: 20 }),
        ]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks({ ...defaultOptions, archiveAction: 'read' });

        expect(mockInvoke).toHaveBeenCalledWith('imap_archive_emails', expect.objectContaining({
            uids: [10, 20],
            action: 'read',
        }));
    });

    it('passes archive folder for move action', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail()]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks({
            ...defaultOptions,
            archiveAction: 'move',
            archiveFolder: 'Processed',
        });

        expect(mockInvoke).toHaveBeenCalledWith('imap_archive_emails', expect.objectContaining({
            action: 'move',
            archiveFolder: 'Processed',
        }));
    });

    it('passes null archive folder for non-move actions', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail()]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks({
            ...defaultOptions,
            archiveAction: 'delete',
            archiveFolder: 'ShouldBeIgnored',
        });

        expect(mockInvoke).toHaveBeenCalledWith('imap_archive_emails', expect.objectContaining({
            action: 'delete',
            archiveFolder: null,
        }));
    });

    it('does not throw when archive fails', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail()]);
        mockInvoke.mockRejectedValueOnce(new Error('Archive timeout'));

        const count = await fetchAndCreateTasks(defaultOptions);

        expect(count).toBe(1);
        expect(mockReportError).toHaveBeenCalledWith(
            'Email archive failed',
            expect.any(Error),
        );
    });

    // -- Fetch errors --

    it('throws when fetch fails', async () => {
        mockInvoke.mockRejectedValueOnce(new Error('Connection refused'));

        await expect(fetchAndCreateTasks(defaultOptions))
            .rejects.toThrow('Connection refused');
    });

    // -- Invoke arguments --

    it('passes connection params and folder to fetch command', async () => {
        mockInvoke.mockResolvedValueOnce([]);

        await fetchAndCreateTasks({
            ...defaultOptions,
            params: {
                server: 'mail.corp.com',
                port: 143,
                useTls: false,
                username: 'karl',
            },
            folder: 'Mindwtr',
        });

        expect(mockInvoke).toHaveBeenCalledWith('imap_fetch_emails', {
            params: {
                server: 'mail.corp.com',
                port: 143,
                useTls: false,
                username: 'karl',
            },
            folder: 'Mindwtr',
            maxCount: 50,
        });
    });

    it('respects custom maxCount', async () => {
        mockInvoke.mockResolvedValueOnce([]);

        await fetchAndCreateTasks({ ...defaultOptions, maxCount: 10 });

        expect(mockInvoke).toHaveBeenCalledWith('imap_fetch_emails', expect.objectContaining({
            maxCount: 10,
        }));
    });

    // -- Title prefix --

    it('prepends titlePrefix to email subject when set', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail({ subject: 'Project sync' })]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks({ ...defaultOptions, titlePrefix: 'EMAIL-TODO: ' });

        expect(mockAddTask).toHaveBeenCalledWith('EMAIL-TODO: Project sync', expect.any(Object));
    });

    it('uses raw subject when titlePrefix is empty string', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail({ subject: 'Follow up' })]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks({ ...defaultOptions, titlePrefix: '' });

        expect(mockAddTask).toHaveBeenCalledWith('Follow up', expect.any(Object));
    });

    it('prepends prefix to "(no subject)" when subject is empty', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail({ subject: '' })]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks({ ...defaultOptions, titlePrefix: 'EMAIL-TODO: ' });

        expect(mockAddTask).toHaveBeenCalledWith('EMAIL-TODO: (no subject)', expect.any(Object));
    });

    // -- Task status --

    it('creates inbox tasks by default', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail()]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks({ ...defaultOptions, taskStatus: 'inbox' });

        expect(mockAddTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ status: 'inbox' }),
        );
    });

    it('creates waiting tasks when taskStatus is waiting', async () => {
        mockInvoke.mockResolvedValueOnce([makeEmail()]);
        mockInvoke.mockResolvedValueOnce(undefined);

        await fetchAndCreateTasks({ ...defaultOptions, taskStatus: 'waiting' });

        expect(mockAddTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ status: 'waiting' }),
        );
    });
});
