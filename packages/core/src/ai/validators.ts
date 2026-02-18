import type { BreakdownResponse, ClarifyResponse, CopilotResponse, GenerateInboxTaskResponse, ReviewAction, ReviewAnalysisResponse } from './types';

const REVIEW_ACTIONS: ReviewAction[] = ['someday', 'archive', 'breakdown', 'keep'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string');

export const isClarifyResponse = (value: unknown): value is ClarifyResponse => {
    if (!isRecord(value)) return false;
    if (typeof value.question !== 'string') return false;
    if (!Array.isArray(value.options)) return false;
    if (value.options.some((option) => !isRecord(option) || typeof option.label !== 'string' || typeof option.action !== 'string')) {
        return false;
    }
    if (value.suggestedAction !== undefined) {
        if (!isRecord(value.suggestedAction)) return false;
        if (value.suggestedAction.title !== undefined && typeof value.suggestedAction.title !== 'string') return false;
        if (value.suggestedAction.context !== undefined && typeof value.suggestedAction.context !== 'string') return false;
        if (value.suggestedAction.timeEstimate !== undefined && typeof value.suggestedAction.timeEstimate !== 'string') return false;
        if (value.suggestedAction.isProject !== undefined && typeof value.suggestedAction.isProject !== 'boolean') return false;
    }
    return true;
};

export const isBreakdownResponse = (value: unknown): value is BreakdownResponse => {
    if (!isRecord(value)) return false;
    return isStringArray(value.steps);
};

export const isReviewAnalysisResponse = (value: unknown): value is ReviewAnalysisResponse => {
    if (!isRecord(value)) return false;
    if (!Array.isArray(value.suggestions)) return false;
    return value.suggestions.every((suggestion) => {
        if (!isRecord(suggestion)) return false;
        if (typeof suggestion.id !== 'string') return false;
        if (typeof suggestion.action !== 'string') return false;
        if (!REVIEW_ACTIONS.includes(suggestion.action as ReviewAction)) return false;
        if (typeof suggestion.reason !== 'string') return false;
        return true;
    });
};

const INBOX_TYPES = ['inbox', 'waiting'] as const;

export const isGenerateInboxTaskResponse = (value: unknown): value is GenerateInboxTaskResponse => {
    if (!isRecord(value)) return false;
    if (value.title !== undefined && typeof value.title !== 'string') return false;
    if (value.description !== undefined && typeof value.description !== 'string') return false;
    if (value.inboxType !== undefined) {
        if (typeof value.inboxType !== 'string') return false;
        if (!INBOX_TYPES.includes(value.inboxType as typeof INBOX_TYPES[number])) return false;
    }
    return true;
};

export const isCopilotResponse = (value: unknown): value is CopilotResponse => {
    if (!isRecord(value)) return false;
    if (value.context !== undefined && typeof value.context !== 'string') return false;
    if (value.timeEstimate !== undefined && typeof value.timeEstimate !== 'string') return false;
    if (value.tags !== undefined && !isStringArray(value.tags)) return false;
    return true;
};
