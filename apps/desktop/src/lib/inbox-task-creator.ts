import type { Task } from '@mindwtr/core';

// --- Types ---

export type InboxType = 'inbox' | 'waiting';

/** What callers provide to create an inbox task. */
export interface InboxTaskInput {
    /** Source identifier for tracing/debugging (e.g. 'imap-action', 'api-webhook'). */
    source: string;

    /** Direct field values — used as-is if provided. */
    title?: string;
    description?: string;
    inboxType?: InboxType;

    /** Unprocessed text for LLM analysis (future). */
    rawContent?: string;
    /** Which fields the LLM should generate (future). */
    llmFields?: ('title' | 'description' | 'inboxType')[];

    /** Tags to apply to the created task. */
    tags?: string[];
    /** Any other Task fields (dueDate, contexts, priority, etc.). */
    extraProps?: Partial<Task>;
}

/** What the LLM resolver returns (partial — only requested fields). */
export interface InboxTaskResult {
    title?: string;
    description?: string;
    inboxType?: InboxType;
}

/** Injectable dependency for LLM calls (future). */
export type LLMResolver = (
    rawContent: string,
    fields: ('title' | 'description' | 'inboxType')[],
) => Promise<InboxTaskResult>;

// --- Core function ---

/**
 * Universal inbox task creator. Resolves each field independently:
 * 1. Direct value (from input) — highest priority
 * 2. LLM-generated value (if resolver provided + field in llmFields)
 * 3. Sensible default (title = '(no title)', inboxType = 'inbox')
 */
export async function createInboxTask(
    input: InboxTaskInput,
    addTask: (title: string, props?: Partial<Task>) => Promise<void>,
    llmResolver?: LLMResolver,
): Promise<void> {
    let resolvedTitle = input.title;
    let resolvedDescription = input.description;
    let resolvedInboxType = input.inboxType;

    // LLM resolution (future — currently falls through if no resolver)
    if (input.rawContent && input.llmFields?.length && llmResolver) {
        const llmResult = await llmResolver(input.rawContent, input.llmFields);
        // Direct values take precedence over LLM values
        resolvedTitle ??= llmResult.title;
        resolvedDescription ??= llmResult.description;
        resolvedInboxType ??= llmResult.inboxType;
    }

    // Defaults
    const title = resolvedTitle || '(no title)';
    const status = resolvedInboxType === 'waiting' ? 'waiting' : 'inbox';

    await addTask(title, {
        status,
        description: resolvedDescription,
        tags: input.tags ?? [],
        ...input.extraProps,
    });
}
