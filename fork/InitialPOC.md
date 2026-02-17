# Initial code to prove the concept of the desktop app as email client polling via IMAP from gmail

```

Implement local IMAP email polling for the desktop app so emails in a
designated mailbox folder are automatically converted into inbox tasks.
This is a local-first approach — the desktop app connects directly to
the user's IMAP server, and no cloud intermediary reads their email.
The password is stored in the OS keyring (macOS Keychain), never in
synced settings.

## Rust backend (lib.rs)

- Add `imap` 2.4, `native-tls` 0.2, `mailparse` 0.15 crates
- Add `ImapOps` trait abstracting over TLS and plain IMAP sessions,
  with `list_folders()`, `fetch_unseen()`, and `archive()` methods
- Add `with_imap_session()` helper that handles TCP connection, optional
  TLS wrapping, login, closure execution, and logout in one place
- Add `imap_extract_body_text()` to pull plain text from MIME multipart
  emails (prefers text/plain, falls back to first subpart)
- Add three Tauri commands exposed to the frontend:
  - `imap_test_connection` — validates credentials, returns folder list
  - `imap_fetch_emails` — fetches unseen emails (up to 50 by default)
  - `imap_archive_emails` — marks as read, moves to folder, or deletes
- Add `get_imap_password` / `set_imap_password` keyring commands,
  following the existing pattern used by WebDAV and AI API keys

## Core types (types.ts)

- Add `emailCapture` optional settings block to `AppData.settings` with
  fields for server, port, TLS, username, folder, poll interval, archive
  action/folder, status tracking (lastPollAt/Error/TaskCount), and tag

## Frontend polling service (email-polling-service.ts)

- Add `fetchAndCreateTasks()` — core pipeline that fetches emails via
  Tauri IPC, creates one inbox task per email via `addTask()`, then
  archives the processed emails; archive errors are swallowed and logged
  so emails can be re-fetched rather than lost
- Add `startEmailPolling()` / `stopEmailPolling()` lifecycle management
  that subscribes to Zustand store changes and reschedules the polling
  interval when settings change
- Add `pollOnce()` for manual "Fetch Now" and scheduled polling, with
  automatic `lastPoll*` status updates in settings

## Settings UI

- Add `SettingsEmailPage.tsx` — three-section settings page with
  connection fields (server, port, TLS, username, password), polling
  and processing options (folder, interval, archive action, auto-tag),
  Test Connection / Fetch Now buttons, and a status display
- Add `useEmailSettings.ts` hook — manages keyring password loading,
  test connection state, manual fetch state, and settings persistence
- Wire into `SettingsView.tsx` with Mail icon sidebar entry and lazy
  import
- Add ~30 EN and ZH label strings to `labels.ts`

## App lifecycle (App.tsx)

- Call `startEmailPolling()` on app activation alongside notifications
  and file watcher; call `stopEmailPolling()` on cleanup

## Unit tests (email-polling-service.test.ts)

- Add 18 Vitest tests covering: empty inbox, task creation per email,
  subject fallback to "(no subject)", description formatting with
  From/Date/body, body truncation at 2000 chars, tag application,
  archive UID passing, archive failure swallowing, fetch error
  propagation, and connection parameter validation

## Config

- Add `minimumSystemVersion: "10.15"` to tauri.conf.json macOS bundle
  config (required by whisper-rs-sys std::filesystem usage)
- Add CLAUDE.md, .claude/, agent/ to .gitignore
```

---

## Files Created (4)

| File                                                               | Lines | Purpose                                       |
| ------------------------------------------------------------------ | ----- | --------------------------------------------- |
| `apps/desktop/src/components/views/settings/SettingsEmailPage.tsx` | 342   | Email capture settings page UI                |
| `apps/desktop/src/components/views/settings/useEmailSettings.ts`   | 168   | React hook for email settings + keyring       |
| `apps/desktop/src/lib/email-polling-service.ts`                    | 205   | Frontend polling service with shared pipeline |
| `apps/desktop/src/lib/email-polling-service.test.ts`               | 300   | Unit tests for the polling service            |

## Files Modified (9)

| File                                                   | Change                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `apps/desktop/src-tauri/Cargo.toml`                    | +3 crates: imap, native-tls, mailparse                            |
| `apps/desktop/src-tauri/Cargo.lock`                    | +219 lines (dependency resolution)                                |
| `apps/desktop/src-tauri/src/lib.rs`                    | +232 lines: IMAP structs, trait, session helper, 5 Tauri commands |
| `apps/desktop/src-tauri/tauri.conf.json`               | +minimumSystemVersion "10.15"                                     |
| `packages/core/src/types.ts`                           | +15 lines: emailCapture settings type                             |
| `apps/desktop/src/App.tsx`                             | +3 lines: start/stop email polling                                |
| `apps/desktop/src/components/views/SettingsView.tsx`   | +~60 lines: email page wiring, hook, nav entry                    |
| `apps/desktop/src/components/views/settings/labels.ts` | +56 lines: EN + ZH email labels                                   |
| `.gitignore`                                           | +3 lines: CLAUDE.md, .claude/, agent/                             |
