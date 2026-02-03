/**
 * @excel/core/collab - Real-time collaboration module
 *
 * Provides Yjs CRDT bindings for collaborative spreadsheet editing.
 */

// Main binding class
export { YjsBinding } from './YjsBinding';
export type {
  YjsBindingOptions,
  Change,
  ChangeType,
  RemoteChangeCallback,
  ConnectionStateCallback,
} from './YjsBinding';

// Awareness state management
export { AwarenessState } from './AwarenessState';
export type {
  UserInfo,
  UserState,
  CursorPosition,
  SelectionRange,
  AwarenessUpdate,
  RemoteAwarenessCallback,
} from './AwarenessState';

// Conflict resolution
export { ConflictResolver } from './ConflictResolver';
export type {
  Conflict,
  ConflictType,
  ResolutionStrategy,
  ResolutionResult,
  ConflictCallback,
  ResolutionRequestCallback,
} from './ConflictResolver';

// Comments (existing)
export * from './Comments';

// Version History
export {
  VersionHistoryManager,
  createVersionHistoryManager,
  DEFAULT_AUTO_SNAPSHOT_CONFIG,
} from './VersionHistory';
export type {
  Author,
  Version,
  CellChange,
  SheetChange,
  VersionDiff,
  AutoSnapshotConfig,
  VersionHistoryManagerOptions,
  VersionHistoryEventType,
  VersionHistoryEvent,
  VersionHistoryEventCallback,
} from './VersionHistory';
