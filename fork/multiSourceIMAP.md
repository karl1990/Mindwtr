# Multi-IMAP Source Support (MID00004)

## Summary

This change upgrades the email capture feature from a single IMAP account to support up to 10 independent IMAP sources. Each account has its own connection settings, folders, prefixes, archive behavior, poll interval, and tag. The UI presents accounts as tabs in the email settings page.

## Motivation

Users who have multiple email accounts (e.g. work Gmail + personal Outlook) previously had to choose one. This is a common scenario for GTD practitioners who want to funnel action items from all inboxes into a single task manager.

## Changes

### Core types (`packages/core/src/types.ts`)

- Added `EmailCaptureAccount` interface with `id`, `label`, and all per-account fields
- Replaced the flat `emailCapture` settings object with `{ accounts?: EmailCaptureAccount[] }`
- Fixed the `archiveAction` union type — removed stale `'read'` value (only `'move' | 'delete'` are valid)

### Rust backend (`apps/desktop/src-tauri/src/lib.rs`)

- Added optional `password_key` parameter to `imap_test_connection`, `imap_fetch_emails`, `imap_archive_emails`
- Added optional `key` parameter to `get_imap_password`, `set_imap_password`
- All functions fall back to the original `KEYRING_IMAP_PASSWORD` constant when no key is provided, preserving backward compatibility at the Rust layer

### Email polling service (`apps/desktop/src/lib/email-polling-service.ts`)

- Added `passwordKey` field to `FetchAndCreateOptions` and passes it through all `invoke` calls
- Exported `imapPasswordKey(username, server)` helper that builds the keyring key as `imap_password_{username}_{server}`
- Replaced single `intervalId`/`pollInFlight` globals with a `Map<string, AccountPollState>` keyed by account ID
- New per-account functions: `pollOnceForAccount()`, `scheduleNextForAccount()`, `reconcileAccounts()`
- Store subscription auto-reconciles timers when accounts are added, removed, enabled, or disabled

### Email polling tests (`apps/desktop/src/lib/email-polling-service.test.ts`)

- Updated `defaultOptions` to include `passwordKey`
- Updated invoke assertions to expect `passwordKey` in all IMAP command calls
- Added test for the `imapPasswordKey` utility function

### i18n labels (`apps/desktop/src/components/views/settings/labels.ts`)

Added 7 new label keys in both EN and ZH:
- `emailAccountLabel` / `emailAccountLabelHint` — friendly name for accounts
- `emailAddAccount` / `emailRemoveAccount` / `emailRemoveAccountConfirm` — tab management
- `emailMaxAccounts` — shown when 10-account limit reached
- `emailNoAccounts` — empty state message

### Settings hook (`apps/desktop/src/components/views/settings/useEmailSettings.ts`)

Full rewrite to manage an `accounts` array with per-account transient UI state:
- `AccountTransientState` interface holds password, test/fetch status, folders per account
- Handlers: `onAddAccount`, `onRemoveAccount`, `onUpdateAccount`, `onPasswordChange`, `onTestConnection`, `onFetchNow`
- Passwords stored in OS keyring keyed by `imap_password_{username}_{server}`
- Removing an account deletes its password from the keyring

### Settings email page (`apps/desktop/src/components/views/settings/SettingsEmailPage.tsx`)

- Extracted original form as `SettingsEmailAccountForm` component (adds label input at top, remove button at bottom)
- New `SettingsEmailPage` wrapper renders a tab bar with one tab per account, a "+" button (disabled at 10), and an empty state when no accounts exist
- Tab labels show: `account.label || account.username || account.server || "Account N"`

### Settings view (`apps/desktop/src/components/views/SettingsView.tsx`)

- Replaced the ~30-field destructuring from `useEmailSettings` with a single `emailSettings` object
- Updated the email page rendering block to pass the new multi-account props

## Edge Cases Handled

- **Same username+server on two accounts**: They share a keyring key — correct behavior since it's the same password
- **Removing an account**: Deletes password from keyring, cleans up transient state, resets active tab
- **Active tab deleted**: Index resets to 0
- **No accounts**: Shows empty state with prompt to add one

## Testing

- Core tests: 194 passed
- Desktop tests: 71 passed (24 email polling tests)
- TypeScript type-check: clean (core + desktop)
- Production build: successful (.dmg produced)
