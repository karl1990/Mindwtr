import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock store
vi.mock('../store/store', () => ({
    useTaskStore: () => ({
        tasks: [],
        projects: [],
        addProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        addTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        moveTask: vi.fn(),
    }),
}));

// Mock Layout
vi.mock('./components/Layout', () => ({
    Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

// Mock electronAPI
vi.stubGlobal('window', {
    electronAPI: {
        saveData: vi.fn(),
        getData: vi.fn().mockResolvedValue({ tasks: [], projects: [], settings: {} }),
    },
});

describe.skip('App', () => {
    it('renders Inbox by default', () => {
        render(<App />);
        expect(screen.getByText('Inbox')).toBeInTheDocument();
    });

    it('renders Sidebar navigation', () => {
        render(<App />);
        expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
});
