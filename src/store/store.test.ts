import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskStore } from './store';
import { act } from '@testing-library/react';

// Mock electronAPI
const mockSaveData = vi.fn();
const mockGetData = vi.fn().mockResolvedValue({ tasks: [], projects: [], settings: {} });

vi.stubGlobal('window', {
    electronAPI: {
        saveData: mockSaveData,
        getData: mockGetData,
    },
});

describe('TaskStore', () => {
    beforeEach(() => {
        useTaskStore.setState({ tasks: [], projects: [] });
        mockSaveData.mockClear();
        mockGetData.mockClear();
    });

    it('should add a task', () => {
        const { addTask } = useTaskStore.getState();

        act(() => {
            addTask('New Task');
        });

        const { tasks } = useTaskStore.getState();
        expect(tasks).toHaveLength(1);
        expect(tasks[0].title).toBe('New Task');
        expect(tasks[0].status).toBe('inbox');
    });

    it('should update a task', () => {
        const { addTask, updateTask } = useTaskStore.getState();

        act(() => {
            addTask('Task to Update');
        });

        const task = useTaskStore.getState().tasks[0];

        act(() => {
            updateTask(task.id, { title: 'Updated Task', status: 'next' });
        });

        const updatedTask = useTaskStore.getState().tasks[0];
        expect(updatedTask.title).toBe('Updated Task');
        expect(updatedTask.status).toBe('next');
    });

    it('should delete a task', () => {
        const { addTask, deleteTask } = useTaskStore.getState();

        act(() => {
            addTask('Task to Delete');
        });

        const task = useTaskStore.getState().tasks[0];

        act(() => {
            deleteTask(task.id);
        });

        const { tasks } = useTaskStore.getState();
        expect(tasks).toHaveLength(0);
    });

    it('should add a project', () => {
        const { addProject } = useTaskStore.getState();

        act(() => {
            addProject('New Project', '#ff0000');
        });

        const { projects } = useTaskStore.getState();
        expect(projects).toHaveLength(1);
        expect(projects[0].title).toBe('New Project');
        expect(projects[0].color).toBe('#ff0000');
    });
});
