export type TaskStatus = 'inbox' | 'todo' | 'next' | 'in-progress' | 'waiting' | 'someday' | 'done' | 'archived';

export interface Project {
    id: string;
    title: string;
    status: 'active' | 'completed' | 'archived';
    color: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string; // Soft-delete: if set, this item is considered deleted
}

export interface ChecklistItem {
    id: string;
    title: string;
    isCompleted: boolean;
}

export interface Task {
    id: string;
    title: string;
    status: TaskStatus;
    startTime?: string; // ISO date string
    dueDate?: string; // ISO date string
    recurrence?: string; // e.g., 'daily', 'weekly', 'monthly'
    tags: string[];
    contexts: string[]; // e.g., '@home', '@work'
    checklist?: ChecklistItem[]; // Subtasks/Shopping list items
    description?: string;
    location?: string;
    projectId?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string; // Soft-delete: if set, this item is considered deleted
}

export interface AppData {
    tasks: Task[];
    projects: Project[];
    settings: {
        theme?: 'light' | 'dark';
    };
}
