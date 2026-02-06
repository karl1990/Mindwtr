import { describe, it, expect } from 'vitest';
import { extractChecklistFromMarkdown, stripMarkdown } from './markdown';

describe('stripMarkdown', () => {
    it('removes common markdown markers', () => {
        const input = '# Title\n\n- **Bold** and *italic* with `code`\n\n[Link](https://example.com)';
        const output = stripMarkdown(input);
        expect(output).toContain('Title');
        expect(output).toContain('Bold and italic with code');
        expect(output).toContain('Link');
        expect(output).not.toContain('**');
        expect(output).not.toContain('`');
        expect(output).not.toContain('[');
    });

    it('removes markdown checklist and list markers', () => {
        const input = '- [x] Done item\n[ ] Todo item\n+ Plain bullet';
        const output = stripMarkdown(input);
        expect(output).toContain('Done item');
        expect(output).toContain('Todo item');
        expect(output).toContain('Plain bullet');
        expect(output).not.toContain('[x]');
        expect(output).not.toContain('[ ]');
    });
});

describe('extractChecklistFromMarkdown', () => {
    it('extracts markdown task list items', () => {
        const input = '- [x] Done item\n[ ] Todo item\n+ [X] Another done\n- plain bullet';
        expect(extractChecklistFromMarkdown(input)).toEqual([
            { title: 'Done item', isCompleted: true },
            { title: 'Todo item', isCompleted: false },
            { title: 'Another done', isCompleted: true },
        ]);
    });
});
