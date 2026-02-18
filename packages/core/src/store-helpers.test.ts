import { describe, expect, it } from 'vitest';
import { getNextProjectOrder } from './store-helpers';
import type { Task } from './types';

const createTask = (id: string, projectId: string, orderNum: number): Task => ({
    id,
    title: `Task ${id}`,
    status: 'inbox',
    tags: [],
    contexts: [],
    projectId,
    orderNum,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('getNextProjectOrder', () => {
    it('returns deterministic next project order without mutating shared cache', () => {
        const tasks = [
            createTask('t1', 'project-1', 0),
            createTask('t2', 'project-1', 1),
        ];

        expect(getNextProjectOrder('project-1', tasks, 101)).toBe(2);
        expect(getNextProjectOrder('project-1', tasks, 101)).toBe(2);
        expect(getNextProjectOrder('project-1', tasks, 101)).toBe(2);
    });

    it('starts from zero for unseen projects on repeated calls', () => {
        const tasks = [createTask('t1', 'project-1', 0)];

        expect(getNextProjectOrder('project-2', tasks, 202)).toBe(0);
        expect(getNextProjectOrder('project-2', tasks, 202)).toBe(0);
    });
});
