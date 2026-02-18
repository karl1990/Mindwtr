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
    passwordKey: 'imap_password_user@example.com_imap.example.com',
    folder: 'INBOX',
    titlePrefix: '',
    taskStatus: 'inbox' as const,
    archiveAction: 'move' as const,
    archiveFolder: '[Gmail]/All Mail',
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

/** Helper to mock the combined fetch-and-archive Rust command. */
function mockFetchAndArchive(emails: FetchedEmail[], archiveError: string | null = null) {
    mockInvoke.mockResolvedValueOnce({ emails, archiveError });
}

// --- Tests ---

describe('fetchAndCreateTasks', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    // -- Empty inbox --

    it('returns count 0 when no emails are fetched', async () => {
        mockFetchAndArchive([]);

        const result = await fetchAndCreateTasks(defaultOptions);

        expect(result.count).toBe(0);
        expect(result.archiveWarning).toBeUndefined();
        expect(mockAddTask).not.toHaveBeenCalled();
    });

    // -- Task creation --

    it('creates a task for each fetched email', async () => {
        mockFetchAndArchive([
            makeEmail({ uid: 1, subject: 'First' }),
            makeEmail({ uid: 2, subject: 'Second' }),
            makeEmail({ uid: 3, subject: 'Third' }),
        ]);

        const result = await fetchAndCreateTasks(defaultOptions);

        expect(result.count).toBe(3);
        expect(mockAddTask).toHaveBeenCalledTimes(3);
    });

    it('uses email subject as task title', async () => {
        mockFetchAndArchive([makeEmail({ subject: 'Buy groceries' })]);

        await fetchAndCreateTasks(defaultOptions);

        expect(mockAddTask).toHaveBeenCalledWith('Buy groceries', expect.any(Object));
    });

    it('uses "(no subject)" when subject is empty', async () => {
        mockFetchAndArchive([makeEmail({ subject: '' })]);

        await fetchAndCreateTasks(defaultOptions);

        expect(mockAddTask).toHaveBeenCalledWith('(no subject)', expect.any(Object));
    });

    // -- Description formatting --

    it('builds description with From, Date, and body', async () => {
        mockFetchAndArchive([makeEmail({
            from: 'alice@example.com',
            date: '2026-02-16T10:00:00Z',
            bodyText: 'Please review the doc',
        })]);

        await fetchAndCreateTasks(defaultOptions);

        const desc: string = mockAddTask.mock.calls[0][1].description;
        expect(desc).toContain('From: alice@example.com');
        expect(desc).toContain('Date: 2026-02-16T10:00:00Z');
        expect(desc).toContain('Please review the doc');
    });

    it('omits Date line when email has no date', async () => {
        mockFetchAndArchive([makeEmail({ date: null })]);

        await fetchAndCreateTasks(defaultOptions);

        const desc: string = mockAddTask.mock.calls[0][1].description;
        expect(desc).not.toContain('Date:');
    });

    it('truncates body text at 2000 characters', async () => {
        const longBody = 'x'.repeat(3000);
        mockFetchAndArchive([makeEmail({ bodyText: longBody })]);

        await fetchAndCreateTasks(defaultOptions);

        const desc: string = mockAddTask.mock.calls[0][1].description;
        const bodyPart = desc.split('\n\n')[1];
        expect(bodyPart).toHaveLength(2000);
    });

    it('handles empty body text', async () => {
        mockFetchAndArchive([makeEmail({ bodyText: '' })]);

        await fetchAndCreateTasks(defaultOptions);

        const desc: string = mockAddTask.mock.calls[0][1].description;
        expect(desc).toContain('From:');
        expect(desc).not.toContain('undefined');
    });

    // -- Tagging --

    it('applies tag to created tasks when provided', async () => {
        mockFetchAndArchive([makeEmail()]);

        await fetchAndCreateTasks({ ...defaultOptions, tag: 'email' });

        expect(mockAddTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ tags: ['email'] }),
        );
    });

    it('passes empty tags array when no tag provided', async () => {
        mockFetchAndArchive([makeEmail()]);

        await fetchAndCreateTasks(defaultOptions);

        expect(mockAddTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ tags: [] }),
        );
    });

    // -- Archive behaviour --

    it('passes archive action and folder to combined command', async () => {
        mockFetchAndArchive([]);

        await fetchAndCreateTasks({
            ...defaultOptions,
            archiveAction: 'move',
            archiveFolder: 'Processed',
        });

        expect(mockInvoke).toHaveBeenCalledWith('imap_fetch_and_archive', expect.objectContaining({
            action: 'move',
            archiveFolder: 'Processed',
        }));
    });

    it('passes null archive folder for non-move actions', async () => {
        mockFetchAndArchive([]);

        await fetchAndCreateTasks({
            ...defaultOptions,
            archiveAction: 'delete',
            archiveFolder: 'ShouldBeIgnored',
        });

        expect(mockInvoke).toHaveBeenCalledWith('imap_fetch_and_archive', expect.objectContaining({
            action: 'delete',
            archiveFolder: null,
        }));
    });

    it('returns archive warning when archive fails', async () => {
        mockFetchAndArchive([makeEmail()], 'Expunge failed: permission denied');

        const result = await fetchAndCreateTasks(defaultOptions);

        expect(result.count).toBe(1);
        expect(result.archiveWarning).toBe('Expunge failed: permission denied');
        expect(mockReportError).toHaveBeenCalledWith(
            'Email archive failed',
            expect.any(Error),
        );
    });

    it('creates tasks even when archive fails', async () => {
        mockFetchAndArchive([makeEmail({ subject: 'Important' })], 'Delete flag failed');

        const result = await fetchAndCreateTasks(defaultOptions);

        expect(result.count).toBe(1);
        expect(mockAddTask).toHaveBeenCalledWith('Important', expect.any(Object));
    });

    // -- Fetch errors --

    it('throws when fetch fails', async () => {
        mockInvoke.mockRejectedValueOnce(new Error('Connection refused'));

        await expect(fetchAndCreateTasks(defaultOptions))
            .rejects.toThrow('Connection refused');
    });

    // -- Invoke arguments --

    it('passes all params to combined fetch-and-archive command', async () => {
        mockFetchAndArchive([]);

        await fetchAndCreateTasks({
            ...defaultOptions,
            params: {
                server: 'mail.corp.com',
                port: 143,
                useTls: false,
                username: 'karl',
            },
            passwordKey: 'imap_password_karl_mail.corp.com',
            folder: 'Mindwtr',
        });

        expect(mockInvoke).toHaveBeenCalledWith('imap_fetch_and_archive', {
            params: {
                server: 'mail.corp.com',
                port: 143,
                useTls: false,
                username: 'karl',
            },
            folder: 'Mindwtr',
            maxCount: 50,
            passwordKey: 'imap_password_karl_mail.corp.com',
            action: 'move',
            archiveFolder: '[Gmail]/All Mail',
        });
    });

    it('respects custom maxCount', async () => {
        mockFetchAndArchive([]);

        await fetchAndCreateTasks({ ...defaultOptions, maxCount: 10 });

        expect(mockInvoke).toHaveBeenCalledWith('imap_fetch_and_archive', expect.objectContaining({
            maxCount: 10,
        }));
    });

    // -- Title prefix --

    it('prepends titlePrefix to email subject when set', async () => {
        mockFetchAndArchive([makeEmail({ subject: 'Project sync' })]);

        await fetchAndCreateTasks({ ...defaultOptions, titlePrefix: 'EMAIL-TODO: ' });

        expect(mockAddTask).toHaveBeenCalledWith('EMAIL-TODO: Project sync', expect.any(Object));
    });

    it('uses raw subject when titlePrefix is empty string', async () => {
        mockFetchAndArchive([makeEmail({ subject: 'Follow up' })]);

        await fetchAndCreateTasks({ ...defaultOptions, titlePrefix: '' });

        expect(mockAddTask).toHaveBeenCalledWith('Follow up', expect.any(Object));
    });

    it('prepends prefix to "(no subject)" when subject is empty', async () => {
        mockFetchAndArchive([makeEmail({ subject: '' })]);

        await fetchAndCreateTasks({ ...defaultOptions, titlePrefix: 'EMAIL-TODO: ' });

        expect(mockAddTask).toHaveBeenCalledWith('EMAIL-TODO: (no subject)', expect.any(Object));
    });

    // -- Task status --

    it('creates inbox tasks by default', async () => {
        mockFetchAndArchive([makeEmail()]);

        await fetchAndCreateTasks({ ...defaultOptions, taskStatus: 'inbox' });

        expect(mockAddTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ status: 'inbox' }),
        );
    });

    it('creates waiting tasks when taskStatus is waiting', async () => {
        mockFetchAndArchive([makeEmail()]);

        await fetchAndCreateTasks({ ...defaultOptions, taskStatus: 'waiting' });

        expect(mockAddTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ status: 'waiting' }),
        );
    });

    // -- passwordKey helper --

    it('exports imapPasswordKey utility', async () => {
        const { imapPasswordKey } = await import('./email-polling-service');
        expect(imapPasswordKey('user@gmail.com', 'imap.gmail.com')).toBe('imap_password_user@gmail.com_imap.gmail.com');
    });

    // -- Single session --

    it('uses single imap_fetch_and_archive command (not separate fetch + archive)', async () => {
        mockFetchAndArchive([makeEmail()]);

        await fetchAndCreateTasks(defaultOptions);

        expect(mockInvoke).toHaveBeenCalledTimes(1);
        expect(mockInvoke).toHaveBeenCalledWith('imap_fetch_and_archive', expect.any(Object));
    });
});
