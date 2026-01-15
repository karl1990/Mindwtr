# Sync Algorithm (LWW + Tombstones)

Mindwtr sync is local-first and conflict-resilient.

## Model

- Each entity has `updatedAt` (ISO timestamp).
- Deletions are soft (`deletedAt`), never hard, to avoid resurrection.

## Merge rules

1. Compare `updatedAt`. Newer wins (LWW).
2. Within clock-skew threshold, prefer non-deleted.
3. Preserve tombstones across devices.

## Conflict visibility & clock skew

- Each sync records conflict counts and a small sample of conflicting IDs.
- Max observed clock skew (ms) and any timestamp corrections are tracked per sync.
- Desktop/mobile Settings → Sync shows conflicts, skew, and timestamp fixes; diagnostics logging includes a summary when enabled.

## Attachment sync

- JSON metadata sync first.
- Attachments are uploaded eagerly and downloaded lazily where possible.
- Missing local files show a download affordance.

## Fail safety

- Writes are serialized via a save queue.
- Errors surface in UI and logs; retries use backoff.
