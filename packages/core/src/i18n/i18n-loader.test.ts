import { describe, expect, it } from 'vitest';
import { getTranslationsSync, loadTranslations } from './i18n-loader';

describe('i18n-loader sync fallback', () => {
    it('provides English translations synchronously for first render', () => {
        expect(getTranslationsSync('en')['app.name']).toBe('Mindwtr');
        expect(getTranslationsSync('zh')['nav.inbox']).toBe('Inbox');
    });

    it('loads Dutch overrides on demand', async () => {
        const nl = await loadTranslations('nl');
        expect(nl['settings.language']).toBe('Taal');
        expect(nl['app.name']).toBe('Mindwtr');
    });
});
