import { describe, expect, test } from 'bun:test';
import { __cloudTestUtils } from './server';

describe('cloud server utils', () => {
    test('parses bearer token and hashes it', () => {
        const req = new Request('http://localhost/v1/data', {
            headers: { Authorization: 'Bearer demo-token' },
        });
        const token = __cloudTestUtils.getToken(req);
        expect(token).toBe('demo-token');
        expect(__cloudTestUtils.tokenToKey(token!)).toHaveLength(64);
    });

    test('parses optional auth token allowlist', () => {
        expect(__cloudTestUtils.parseAllowedAuthTokens('')).toBeNull();
        const tokens = __cloudTestUtils.parseAllowedAuthTokens('alpha, beta ,gamma');
        expect(tokens?.size).toBe(3);
        expect(__cloudTestUtils.isAuthorizedToken('beta', tokens || null)).toBe(true);
        expect(__cloudTestUtils.isAuthorizedToken('delta', tokens || null)).toBe(false);
        expect(__cloudTestUtils.isAuthorizedToken('any', null)).toBe(true);
    });

    test('rejects invalid app data payload', () => {
        const result = __cloudTestUtils.validateAppData({ tasks: 'invalid', projects: [] });
        expect(result.ok).toBe(false);
    });

    test('rejects invalid task status and timestamps in app data', () => {
        const invalidStatus = __cloudTestUtils.validateAppData({
            tasks: [{
                id: 't1',
                title: 'Task 1',
                status: 'todo',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            }],
            projects: [],
        });
        expect(invalidStatus.ok).toBe(false);

        const invalidTimestamp = __cloudTestUtils.validateAppData({
            tasks: [{
                id: 't1',
                title: 'Task 1',
                status: 'inbox',
                createdAt: 'invalid',
                updatedAt: '2024-01-01T00:00:00.000Z',
            }],
            projects: [],
        });
        expect(invalidTimestamp.ok).toBe(false);
    });

    test('accepts only core task statuses', () => {
        expect(__cloudTestUtils.asStatus('reference')).toBe('reference');
        expect(__cloudTestUtils.asStatus('todo')).toBeNull();
        expect(__cloudTestUtils.asStatus('in-progress')).toBeNull();
    });

    test('normalizes rate limit routes for task item endpoints', () => {
        expect(__cloudTestUtils.toRateLimitRoute('/v1/tasks/abc')).toBe('/v1/tasks/:id');
        expect(__cloudTestUtils.toRateLimitRoute('/v1/tasks/abc/complete')).toBe('/v1/tasks/:id/:action');
        expect(__cloudTestUtils.toRateLimitRoute('/v1/tasks')).toBe('/v1/tasks');
    });

    test('enforces JSON body size limit', async () => {
        const body = JSON.stringify({ tasks: [], projects: [] });
        const req = new Request('http://localhost/v1/data', {
            method: 'PUT',
            headers: { 'content-length': String(body.length) },
            body,
        });
        const parsed = await __cloudTestUtils.readJsonBody(req, 10, new TextEncoder());
        expect(parsed.__mindwtrError.message).toBe('Payload too large');
        expect(parsed.__mindwtrError.status).toBe(413);
    });

    test('normalizes attachment paths with allowlist and segment checks', () => {
        expect(__cloudTestUtils.normalizeAttachmentRelativePath('folder/file.txt')).toBe('folder/file.txt');
        expect(__cloudTestUtils.normalizeAttachmentRelativePath('/folder/file.txt/')).toBe('folder/file.txt');
        expect(__cloudTestUtils.normalizeAttachmentRelativePath('%252e%252e/secret')).toBeNull();
        expect(__cloudTestUtils.normalizeAttachmentRelativePath('../secret')).toBeNull();
        expect(__cloudTestUtils.normalizeAttachmentRelativePath('folder\\\\file.txt')).toBeNull();
        expect(__cloudTestUtils.normalizeAttachmentRelativePath('folder/file?.txt')).toBeNull();
    });

    test('checks whether resolved path stays inside root directory', () => {
        expect(__cloudTestUtils.isPathWithinRoot('/data/ns/attachments/file.txt', '/data/ns/attachments')).toBe(true);
        expect(__cloudTestUtils.isPathWithinRoot('/data/ns/attachments', '/data/ns/attachments')).toBe(true);
        expect(__cloudTestUtils.isPathWithinRoot('/data/ns/attachments-evil/file.txt', '/data/ns/attachments')).toBe(false);
    });
});
