import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from '../components/TaskItem';
import { Task } from '../types';

// Mock store
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();
const mockMoveTask = vi.fn();

vi.mock('../store/store', () => ({
    useTaskStore: () => ({
        updateTask: mockUpdateTask,
        deleteTask: mockDeleteTask,
        moveTask: mockMoveTask,
        projects: [],
    }),
}));

const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    status: 'inbox',
    tags: [],
    contexts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

describe('TaskItem', () => {
    it('renders task title', () => {
        render(<TaskItem task={mockTask} />);
        expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('enters edit mode on click', () => {
        render(<TaskItem task={mockTask} />);
        fireEvent.click(screen.getByText('Test Task'));
        expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
    });

    it('calls moveTask when checkbox is clicked', () => {
        render(<TaskItem task={mockTask} />);
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        expect(mockMoveTask).toHaveBeenCalledWith('1', 'done');
    });
});
