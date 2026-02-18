import { describe, expect, it, vi } from 'vitest';
import { createInboxTask, type LLMResolver } from './inbox-task-creator';

// --- Helpers ---

function makeMockAddTask() {
    return vi.fn<(title: string, props?: Record<string, unknown>) => Promise<void>>()
        .mockResolvedValue(undefined);
}

// --- Tests ---

describe('createInboxTask', () => {
    // 1. Creates task with direct title, description, inboxType
    it('creates a task with direct title, description, and inboxType', async () => {
        const addTask = makeMockAddTask();

        await createInboxTask({
            source: 'test',
            title: 'Buy milk',
            description: 'From the corner shop',
            inboxType: 'inbox',
        }, addTask);

        expect(addTask).toHaveBeenCalledOnce();
        expect(addTask).toHaveBeenCalledWith('Buy milk', expect.objectContaining({
            status: 'inbox',
            description: 'From the corner shop',
        }));
    });

    // 2. Defaults inboxType to 'inbox' when not provided
    it('defaults inboxType to inbox when not provided', async () => {
        const addTask = makeMockAddTask();

        await createInboxTask({
            source: 'test',
            title: 'Something',
        }, addTask);

        expect(addTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ status: 'inbox' }),
        );
    });

    // 3. Defaults title to '(no title)' when not provided
    it('defaults title to "(no title)" when not provided', async () => {
        const addTask = makeMockAddTask();

        await createInboxTask({ source: 'test' }, addTask);

        expect(addTask).toHaveBeenCalledWith('(no title)', expect.any(Object));
    });

    // 4. Passes tags and extraProps through to addTask
    it('passes tags and extraProps through to addTask', async () => {
        const addTask = makeMockAddTask();

        await createInboxTask({
            source: 'test',
            title: 'Tagged task',
            tags: ['email', 'urgent'],
            extraProps: { dueDate: '2026-03-01' },
        }, addTask);

        expect(addTask).toHaveBeenCalledWith('Tagged task', expect.objectContaining({
            tags: ['email', 'urgent'],
            dueDate: '2026-03-01',
        }));
    });

    // 5. Calls LLM resolver when rawContent + llmFields are provided
    it('calls LLM resolver when rawContent and llmFields are provided', async () => {
        const addTask = makeMockAddTask();
        const llmResolver: LLMResolver = vi.fn().mockResolvedValue({
            title: 'LLM-generated title',
            description: 'LLM-generated desc',
            inboxType: 'waiting',
        });

        await createInboxTask({
            source: 'test',
            rawContent: 'Some raw email content',
            llmFields: ['title', 'description', 'inboxType'],
        }, addTask, llmResolver);

        expect(llmResolver).toHaveBeenCalledWith(
            'Some raw email content',
            ['title', 'description', 'inboxType'],
        );
        expect(addTask).toHaveBeenCalledWith('LLM-generated title', expect.objectContaining({
            status: 'waiting',
            description: 'LLM-generated desc',
        }));
    });

    // 6. Direct values override LLM-generated values
    it('uses direct values over LLM-generated values', async () => {
        const addTask = makeMockAddTask();
        const llmResolver: LLMResolver = vi.fn().mockResolvedValue({
            title: 'LLM title',
            description: 'LLM desc',
            inboxType: 'waiting',
        });

        await createInboxTask({
            source: 'test',
            title: 'My direct title',
            inboxType: 'inbox',
            rawContent: 'raw content',
            llmFields: ['title', 'description', 'inboxType'],
        }, addTask, llmResolver);

        // Direct title and inboxType win; LLM description used (no direct one)
        expect(addTask).toHaveBeenCalledWith('My direct title', expect.objectContaining({
            status: 'inbox',
            description: 'LLM desc',
        }));
    });

    // 7. Works without LLM resolver (direct-only mode)
    it('works without LLM resolver in direct-only mode', async () => {
        const addTask = makeMockAddTask();

        await createInboxTask({
            source: 'imap-action',
            title: 'Direct email task',
            description: 'From: alice@example.com',
            inboxType: 'inbox',
            tags: ['email'],
        }, addTask);

        expect(addTask).toHaveBeenCalledOnce();
        expect(addTask).toHaveBeenCalledWith('Direct email task', expect.objectContaining({
            status: 'inbox',
            description: 'From: alice@example.com',
            tags: ['email'],
        }));
    });

    // 8. Handles LLM resolver returning partial results
    it('handles LLM resolver returning partial results', async () => {
        const addTask = makeMockAddTask();
        const llmResolver: LLMResolver = vi.fn().mockResolvedValue({
            title: 'Partial title',
            // description and inboxType not returned
        });

        await createInboxTask({
            source: 'test',
            rawContent: 'some content',
            llmFields: ['title', 'description', 'inboxType'],
        }, addTask, llmResolver);

        expect(addTask).toHaveBeenCalledWith('Partial title', expect.objectContaining({
            status: 'inbox',       // default because LLM didn't return inboxType
            description: undefined, // not provided by either source
        }));
    });

    // 9. Sets status to 'waiting' when inboxType is 'waiting'
    it('sets status to waiting when inboxType is waiting', async () => {
        const addTask = makeMockAddTask();

        await createInboxTask({
            source: 'imap-waiting',
            title: 'Waiting for reply',
            inboxType: 'waiting',
        }, addTask);

        expect(addTask).toHaveBeenCalledWith(
            'Waiting for reply',
            expect.objectContaining({ status: 'waiting' }),
        );
    });

    // 10. Does not call LLM when rawContent is missing
    it('does not call LLM resolver when rawContent is missing', async () => {
        const addTask = makeMockAddTask();
        const llmResolver: LLMResolver = vi.fn();

        await createInboxTask({
            source: 'test',
            title: 'Direct only',
            llmFields: ['title'],
        }, addTask, llmResolver);

        expect(llmResolver).not.toHaveBeenCalled();
    });

    // 11. Does not call LLM when llmFields is empty
    it('does not call LLM resolver when llmFields is empty', async () => {
        const addTask = makeMockAddTask();
        const llmResolver: LLMResolver = vi.fn();

        await createInboxTask({
            source: 'test',
            title: 'Direct only',
            rawContent: 'some content',
            llmFields: [],
        }, addTask, llmResolver);

        expect(llmResolver).not.toHaveBeenCalled();
    });

    // 12. Uses empty tags array when tags not provided
    it('uses empty tags array when tags not provided', async () => {
        const addTask = makeMockAddTask();

        await createInboxTask({ source: 'test', title: 'No tags' }, addTask);

        expect(addTask).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ tags: [] }),
        );
    });
});
