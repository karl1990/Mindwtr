import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../../contexts/language-context';
import { KeybindingProvider } from '../../contexts/keybinding-context';
import { ListView } from './ListView';

describe('ListView', () => {
  it('renders the view title', () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <KeybindingProvider currentView="inbox" onNavigate={() => {}}>
          <ListView title="Inbox" statusFilter="inbox" />
        </KeybindingProvider>
      </LanguageProvider>
    );
    expect(html).toContain('Inbox');
  });
});
