# Calendar Integration (Hard + Soft Landscape)

Mindwtr supports **view-only external calendars** so you can see hard events alongside your task schedule.

- **Mobile (iOS/Android):** system calendars already synced on the device
- **Desktop/Web:** ICS subscription URLs

## Concepts

- **Hard Landscape**: Meetings/classes from external calendars.
- **Soft Landscape**: Mindwtr tasks scheduled with `startTime` and `timeEstimate`.
- The calendar is a **planning surface**, not a capture surface.

## GTD Semantics

- **`dueDate`** = Deadline (hard commitments).
- **`startTime`** = Tickler/scheduled start (soft commitments).
- **`timeEstimate`** = Suggested duration when scheduling.

## Views

- **Day view**: time grid with events + scheduled tasks.
- **Month view**: overview with markers for deadlines, scheduled tasks, and events.

## Scheduling Workflow

1. Pick an **existing** task.
2. Assign a start time (and optionally use the time estimate).
3. Adjust timing later from the task editor or day list.

## External Calendars

### Mobile: System Calendar Integration

On mobile, Mindwtr reads calendars from the device calendar database:

- **Android:** via system calendar provider (includes DAVx5, Google, Exchange, Outlook, etc. once synced on device)
- **iOS:** via EventKit-backed system calendars (iCloud, Google, Exchange, Outlook, etc. once enabled in iOS Settings)

Setup:

1. Open **Settings → Calendar**
2. Enable **System calendar**
3. Grant calendar permission
4. Choose which device calendars to display

Mindwtr stays read-only and does not perform provider OAuth for calendar sources.

### Desktop/Web: ICS URLs

1. Open **Settings → Calendar**
2. Add your **ICS URL**
3. Refresh to fetch events

Events are cached on-device and are not synced via Mindwtr sync.

### Private calendars (Google Calendar)

You **do not** need to make your calendar public. Use the private "Secret address" instead:

1. Open Google Calendar on the web → **Settings**.
2. Select the calendar in the left sidebar.
3. In **Integrate calendar**, copy **Secret address in iCal format**.
4. Paste that URL into Mindwtr.

That link acts like a password: only apps with the link can see events, while the calendar stays private.

## Notes

- Calendar does **not** create new tasks.
- External calendars are **read-only** inside Mindwtr.
- Recurring events with `RRULE:...;COUNT=...` stop after their original count. If you previously saw very old recurring events, re-import after updating to v0.4.9+.
