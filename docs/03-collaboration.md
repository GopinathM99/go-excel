# 03 Collaboration (Web)

## Requirements
- Real-time multi-user editing of shared workbooks.
- Low-latency updates with minimal conflict.
- Presence indicators (user cursors, selections).
- Comments/threads with notifications.
- Version history and rollback.

## Concurrency model
- Choose one:
  - CRDT: supports offline edits and merges naturally; more complex to implement.
  - OT: simpler server model but requires careful transform logic.
- Recommendation: CRDT if offline or unstable connections are a priority.

## Collaboration architecture
- Client
  - Local optimistic state
  - Operation queue
  - Conflict resolution and merge logic
- Server
  - Realtime session manager (WebSocket)
  - Operation log and snapshot storage
  - Presence and awareness API
  - Version history snapshots

## Data model for operations
- Cell edits: {sheetId, cellRef, oldValue, newValue, timestamp, author}
- Range edits: include range metadata and transformation type
- Formatting changes: stored as style deltas
- Structural changes: insert/delete rows/cols

## Consistency approach
- Operational ordering with vector clocks or monotonic timestamps
- Eventual consistency with deterministic merge rules
- Snapshot every N operations or time window

## Security
- Access control per workbook
- Roles: owner, editor, viewer
- Audit log for changes

## Collaboration MVP scope
- Live edits with presence
- Comments
- Version history for last N revisions
