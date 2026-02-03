# Phase 7-8: Real-Time Collaboration (Web)

**Status:** ✅ Complete
**Sprints:** 7-8
**Goal:** Multi-user editing with presence awareness
**Last Updated:** 2024-01-31

---

## Tasks

### 1. Collaboration Server (Large) ✅ COMPLETE
- [x] WebSocket server for real-time sync
- [x] Session management
- [x] Room/document concept
- [x] Yjs document per room
- [x] Message encoding/decoding (binary)
- [x] Heartbeat for connection health
- [x] Broadcast updates to all clients
- [x] In-memory document persistence
- [ ] User authentication integration (deferred)

**Files Created:**
- `packages/server/package.json`
- `packages/server/src/index.ts`
- `packages/server/src/websocket/WebSocketServer.ts`
- `packages/server/src/websocket/MessageHandler.ts`
- `packages/server/src/rooms/Room.ts`
- `packages/server/src/rooms/RoomManager.ts`
- `packages/server/src/persistence/DocumentStore.ts`

### 2. CRDT Integration (Large) ✅ COMPLETE
- [x] Map spreadsheet operations to CRDT (Yjs binding)
- [x] Conflict resolution for concurrent edits
- [x] Offline support with sync on reconnect
- [x] Undo/redo with Yjs UndoManager

**Files Created:**
- `packages/core/src/collab/YjsBinding.ts`
- `packages/core/src/collab/AwarenessState.ts`
- `packages/core/src/collab/ConflictResolver.ts`

**Tests:** 45 passing tests

### 3. Presence Indicators (Medium) ✅ COMPLETE
- [x] Track user cursors (core)
- [x] Track active selections (core)
- [x] User info with colors (core)
- [x] "User is editing" state (core)
- [x] Presence UI components

**Files Created:**
- `packages/web/src/components/Presence/UserCursor.tsx`
- `packages/web/src/components/Presence/UserSelection.tsx`
- `packages/web/src/components/Presence/UserList.tsx`
- `packages/web/src/components/Presence/UserAvatar.tsx`
- `packages/web/src/components/Presence/PresenceOverlay.tsx`
- `packages/web/src/hooks/usePresence.ts`

### 4. Comments & Threads (Medium) ✅ COMPLETE
- [x] Cell-attached comments (model)
- [x] Threaded replies (model)
- [x] @mentions parsing (model)
- [x] Resolve/unresolve threads (model)
- [x] Comments UI components

**Files Created:**
- `packages/core/src/collab/Comments.ts`
- `packages/web/src/components/Comments/CommentThread.tsx`
- `packages/web/src/components/Comments/CommentInput.tsx`
- `packages/web/src/components/Comments/CommentIndicator.tsx`
- `packages/web/src/components/Comments/CommentPopover.tsx`
- `packages/web/src/components/Comments/CommentsSidebar.tsx`
- `packages/web/src/components/Comments/MentionInput.tsx`
- `packages/web/src/hooks/useComments.ts`

**Tests:** 78 passing tests

### 5. Version History (Small) ✅ COMPLETE
- [x] Automatic snapshots (time-based, change-based)
- [x] View historical versions
- [x] Restore to previous version
- [x] Diff view between versions

**Files Created:**
- `packages/core/src/collab/VersionHistory.ts`
- `packages/server/src/versions/VersionStore.ts`
- `packages/web/src/components/VersionHistory/VersionList.tsx`
- `packages/web/src/components/VersionHistory/VersionPreview.tsx`
- `packages/web/src/components/VersionHistory/VersionDiff.tsx`
- `packages/web/src/hooks/useVersionHistory.ts`

**Tests:** 52 passing tests

---

## Key Files to Create

```
packages/server/                    # New package
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    # Server entry point
    ├── websocket/
    │   ├── index.ts
    │   ├── WebSocketServer.ts
    │   └── MessageHandler.ts
    ├── rooms/
    │   ├── index.ts
    │   ├── RoomManager.ts
    │   └── Room.ts
    ├── auth/
    │   ├── index.ts
    │   └── AuthMiddleware.ts
    └── persistence/
        ├── index.ts
        └── DocumentStore.ts

packages/core/src/
├── collab/
│   ├── index.ts
│   ├── YjsBinding.ts               # Yjs <-> Spreadsheet binding
│   ├── AwarenessState.ts           # User presence state
│   └── ConflictResolver.ts

packages/web/src/
├── components/
│   ├── Presence/
│   │   ├── index.tsx
│   │   ├── UserCursor.tsx
│   │   ├── UserSelection.tsx
│   │   └── UserList.tsx
│   ├── Comments/
│   │   ├── index.tsx
│   │   ├── CommentThread.tsx
│   │   ├── CommentInput.tsx
│   │   └── CommentIndicator.tsx
│   └── VersionHistory/
│       ├── index.tsx
│       ├── VersionList.tsx
│       └── VersionDiff.tsx
├── hooks/
│   ├── useCollaboration.ts
│   ├── usePresence.ts
│   └── useVersionHistory.ts
```

---

## Technical Implementation

### Yjs Integration
```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Create Yjs document
const ydoc = new Y.Doc();

// Shared types for spreadsheet data
const ysheets = ydoc.getMap('sheets');
const ycells = ydoc.getMap('cells');  // key: "sheetId:row,col"
const ymetadata = ydoc.getMap('metadata');

// Awareness for presence
const provider = new WebsocketProvider('wss://server/collab', 'doc-id', ydoc);
const awareness = provider.awareness;

awareness.setLocalState({
  user: { name: 'User', color: '#ff0000' },
  cursor: { sheet: 'sheet1', row: 0, col: 0 },
  selection: null,
});
```

### Cell Operations as CRDT Operations
```typescript
// Setting a cell value
function setCellValue(sheetId: string, row: number, col: number, value: string) {
  const key = `${sheetId}:${row},${col}`;
  ycells.set(key, {
    value,
    formula: value.startsWith('=') ? value : null,
    timestamp: Date.now(),
    userId: currentUserId,
  });
}

// Observing changes
ycells.observe(event => {
  event.changes.keys.forEach((change, key) => {
    if (change.action === 'add' || change.action === 'update') {
      const cellData = ycells.get(key);
      // Update local state
    }
  });
});
```

### Presence State
```typescript
interface AwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
  };
  cursor: {
    sheet: string;
    row: number;
    col: number;
  } | null;
  selection: {
    sheet: string;
    range: CellRange;
  } | null;
  isEditing: boolean;
  lastActive: number;
}
```

### Comment Model
```typescript
interface Comment {
  id: string;
  cellAddress: CellAddress;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  text: string;
  createdAt: number;
  updatedAt: number;
  resolved: boolean;
  replies: CommentReply[];
  mentions: string[];  // User IDs
}

interface CommentReply {
  id: string;
  author: { id: string; name: string; };
  text: string;
  createdAt: number;
}
```

### Dependencies to Add
```json
{
  "dependencies": {
    "yjs": "^13.6.0",
    "y-websocket": "^1.5.0",
    "y-indexeddb": "^9.0.0",
    "lib0": "^0.2.0"
  }
}

// Server
{
  "dependencies": {
    "ws": "^8.16.0",
    "y-websocket": "^1.5.0"
  }
}
```

---

## WebSocket Protocol

### Message Types
```typescript
type Message =
  | { type: 'sync'; data: Uint8Array }           // Yjs sync
  | { type: 'awareness'; data: Uint8Array }      // Presence update
  | { type: 'comment'; action: 'add' | 'update' | 'delete'; comment: Comment }
  | { type: 'version'; action: 'snapshot' | 'list' | 'restore'; data: any };
```

---

## Verification

- [ ] Two users edit simultaneously
- [ ] Verify sync (< 200ms latency)
- [ ] Test offline/online transitions
- [ ] Cursors visible in real-time
- [ ] Comments persist correctly
- [ ] Version history works
