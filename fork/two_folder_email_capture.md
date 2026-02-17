# Two-Folder Email Capture with Configurable Prefixes (MID00002)

Evolve the IMAP email capture feature from watching a single folder to
watching two purpose-specific folders — `@ACTION` and `@WAITINGFOR` —
each producing tasks with a different GTD status and a configurable
title prefix. This aligns the implementation with the user stories
defined in `agent/input/userstories.md`.

## What changed and why

### Problem

MID00001 delivered a working IMAP proof-of-concept that watched one
folder and created plain inbox tasks. The user stories describe a
richer model:

- Emails moved to `@ACTION` should become **inbox tasks** with the
  prefix `EMAIL-TODO: ` prepended to the subject.
- Emails moved to `@WAITINGFOR` should become **waiting-for tasks**
  with the prefix `EMAIL-AWAIT: ` prepended to the subject.
- Folder names and prefixes should be user-configurable. An empty
  prefix should be allowed to use raw email subjects.

### Solution

The polling service now calls `fetchAndCreateTasks()` twice per cycle —
once for the action folder (creating `status: 'inbox'` tasks) and once
for the waiting folder (creating `status: 'waiting'` tasks). Each call
receives a `titlePrefix` and `taskStatus` parameter. No Rust backend
changes were needed because the existing IMAP commands already accept
an arbitrary folder name.

## Files modified (7 files, +214 / -33 lines)

### `packages/core/src/types.ts`

Added four new optional fields to `emailCapture` in `AppData.settings`:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `actionFolder` | `string` | `'@ACTION'` | IMAP folder for action emails |
| `actionPrefix` | `string` | `'EMAIL-TODO: '` | Title prefix for action tasks |
| `waitingFolder` | `string` | `'@WAITINGFOR'` | IMAP folder for waiting-for emails |
| `waitingPrefix` | `string` | `'EMAIL-AWAIT: '` | Title prefix for waiting tasks |

The old `folder` field is kept (not removed) for backward compatibility.
If `actionFolder` is not yet set, the polling service falls back to
`folder ?? '@ACTION'`, so existing users are migrated gracefully.

### `apps/desktop/src/lib/email-polling-service.ts`

- **`FetchAndCreateOptions`**: Added `titlePrefix: string` and
  `taskStatus: TaskStatus` as required parameters.
- **Task creation loop**: The title is now computed as
  `prefix ? prefix + subject : subject`, and `addTask()` receives
  `{ status: taskStatus }` in its initial props. Empty prefix (falsy
  string) falls through to the raw subject.
- **`pollOnce()`**: Now calls `fetchAndCreateTasks()` twice — once
  for the action folder with `taskStatus: 'inbox'`, once for the
  waiting folder with `taskStatus: 'waiting'`. The total count is
  the sum of both.

### `apps/desktop/src/lib/email-polling-service.test.ts`

- Updated `defaultOptions` with `titlePrefix: ''` and
  `taskStatus: 'inbox'` so all 18 existing tests continue to pass
  unchanged.
- Added 5 new test cases:
  1. Prepends `titlePrefix` to email subject when set
  2. Uses raw subject when `titlePrefix` is empty string
  3. Prepends prefix to `(no subject)` fallback
  4. Creates inbox tasks when `taskStatus` is `'inbox'`
  5. Creates waiting tasks when `taskStatus` is `'waiting'`

Total test count: 23 (was 18).

### `apps/desktop/src/components/views/settings/useEmailSettings.ts`

- Reads the four new fields from `emailSettings` with backward-compat
  defaults (e.g. `actionFolder` falls back to `emailSettings.folder`
  then `'@ACTION'`).
- `handleFetchNow()` now calls `fetchAndCreateTasks()` twice (action +
  waiting) and sums the counts, matching the `pollOnce()` behavior.
- Return value exposes `actionFolder`, `actionPrefix`, `waitingFolder`,
  `waitingPrefix` instead of the old `folder`.

### `apps/desktop/src/components/views/settings/labels.ts`

Replaced the single `emailFolder` label with five new labels in both
English and Chinese:

| Key | EN | ZH |
|-----|----|----|
| `emailActionFolder` | Action folder | 动作文件夹 |
| `emailActionPrefix` | Task title prefix (action) | 任务标题前缀（动作） |
| `emailWaitingFolder` | Waiting-for folder | 等待文件夹 |
| `emailWaitingPrefix` | Task title prefix (waiting) | 任务标题前缀（等待） |
| `emailPrefixHint` | Prepended to the email subject. Leave blank for no prefix. | 添加到邮件主题前。如不需要前缀，请留空。 |

### `apps/desktop/src/components/views/settings/SettingsEmailPage.tsx`

Replaced the single "Folder to watch" selector with two subsections:

- **Action folder**: Folder selector (dropdown or free-text) +
  prefix input with placeholder `EMAIL-TODO: `
- **Waiting-for folder**: Folder selector + prefix input with
  placeholder `EMAIL-AWAIT: `

Poll interval moved to its own row below. The archive action and tag
fields remain unchanged (one global action for both folders).

### `apps/desktop/src/components/views/SettingsView.tsx`

Updated the `useEmailSettings` destructuring and `<SettingsEmailPage>`
JSX props to pass the four new fields instead of the old `folder`.

## What was NOT changed

- **Rust backend**: No changes. The existing `imap_fetch_emails` and
  `imap_archive_emails` commands already accept a folder parameter.
- **Zustand store**: `addTask()` already accepts `{ status: 'waiting' }`
  via `initialProps`. No store modification was needed.
- **Mobile app**: Email capture remains desktop-only.
- **Multi-account**: Deferred to a future milestone per user stories.

## Backward compatibility

| Scenario | Behavior |
|----------|----------|
| New user (no prior email config) | Sees `@ACTION` / `@WAITINGFOR` defaults |
| Existing user with `folder: 'INBOX'` | `actionFolder` falls back to `'INBOX'` until they change it |
| Existing user downgrades | Old `folder` field still present in storage, works as before |

## How to test

1. Configure IMAP connection in Settings → Email Capture
2. Click "Test Connection" — verify both `@ACTION` and `@WAITINGFOR`
   appear in the folder dropdowns (create them in your email client
   first)
3. Move an email into `@ACTION` in your email client
4. Click "Fetch Now" — verify an inbox task appears titled
   `EMAIL-TODO: <subject>`
5. Move an email into `@WAITINGFOR`
6. Click "Fetch Now" — verify a waiting task appears titled
   `EMAIL-AWAIT: <subject>`
7. Clear both prefix fields, fetch again — verify tasks use raw
   subjects with no prefix
8. Run `bun run --filter mindwtr test` — 23 tests pass
