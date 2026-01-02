import { describe, it, expect } from 'vitest';
import { parseQuickAdd } from './quick-add';

describe('quick-add', () => {
    it('parses status, due, note, tags, contexts', () => {
        const now = new Date('2025-01-01T10:00:00Z');
        const result = parseQuickAdd('Call mom @phone #family /next /due:tomorrow 5pm /note:ask about trip', undefined, now);

        expect(result.title).toBe('Call mom');
        expect(result.props.status).toBe('next');
        expect(result.props.contexts).toEqual(['@phone']);
        expect(result.props.tags).toEqual(['#family']);
        expect(result.props.description).toBe('ask about trip');
        const expectedLocal = new Date(2025, 0, 2, 17, 0, 0, 0).toISOString();
        expect(result.props.dueDate).toBe(expectedLocal);
    });

    it('matches project by title when provided', () => {
        const now = new Date('2025-01-01T10:00:00Z');
        const projects = [
            {
                id: 'p1',
                title: 'MyProject',
                status: 'active',
                color: '#000000',
                tagIds: [],
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            },
        ];

        const result = parseQuickAdd('Write spec +MyProject', projects as any, now);
        expect(result.title).toBe('Write spec');
        expect(result.props.projectId).toBe('p1');
    });
});
