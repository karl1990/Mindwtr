/**
 * Utility functions for task operations
 */

/**
 * Calculate the age of a task in days
 */
export function getTaskAgeDays(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get a human-readable age string for a task
 * Returns null for tasks < 1 day old (to avoid clutter)
 */
export function getTaskAgeLabel(createdAt: string): string | null {
    const days = getTaskAgeDays(createdAt);

    if (days < 1) return null;
    if (days === 1) return '1 day old';
    if (days < 7) return `${days} days old`;
    if (days < 14) return '1 week old';
    if (days < 30) return `${Math.floor(days / 7)} weeks old`;
    if (days < 60) return '1 month old';
    return `${Math.floor(days / 30)} months old`;
}

/**
 * Get the staleness level of a task (for color coding)
 * Returns: 'fresh' | 'aging' | 'stale' | 'very-stale'
 */
export function getTaskStaleness(createdAt: string): 'fresh' | 'aging' | 'stale' | 'very-stale' {
    const days = getTaskAgeDays(createdAt);

    if (days < 7) return 'fresh';
    if (days < 14) return 'aging';
    if (days < 30) return 'stale';
    return 'very-stale';
}
