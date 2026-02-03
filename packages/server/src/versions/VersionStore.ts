/**
 * VersionStore - Server-side version storage for document snapshots
 *
 * This module provides persistent storage for document versions with:
 * - In-memory storage with optional persistence hooks
 * - Automatic cleanup of old versions
 * - Paginated retrieval
 * - Version metadata indexing
 */

/**
 * Author information for version attribution
 */
export interface VersionAuthor {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * Stored version data
 */
export interface StoredVersion {
  /** Unique identifier for this version */
  id: string;
  /** Document ID this version belongs to */
  documentId: string;
  /** Unix timestamp when this version was created */
  timestamp: number;
  /** Author who created this version */
  author: VersionAuthor;
  /** Optional user-provided label/name for this version */
  label?: string;
  /** Serialized document state */
  snapshot: string;
  /** Number of changes since the last version */
  changeCount: number;
  /** Size of the snapshot in bytes */
  size: number;
  /** Whether this is an auto-generated snapshot */
  isAutoSnapshot: boolean;
  /** Description of what triggered this snapshot */
  trigger?: 'manual' | 'auto_time' | 'auto_changes' | 'before_operation';
}

/**
 * Version metadata (without the snapshot data)
 */
export interface VersionMetadata {
  id: string;
  documentId: string;
  timestamp: number;
  author: VersionAuthor;
  label?: string;
  changeCount: number;
  size: number;
  isAutoSnapshot: boolean;
  trigger?: string;
}

/**
 * Pagination options for listing versions
 */
export interface VersionListOptions {
  /** Maximum number of versions to return */
  limit?: number;
  /** Number of versions to skip */
  offset?: number;
  /** Include auto-snapshots (default: true) */
  includeAutoSnapshots?: boolean;
  /** Filter by author ID */
  authorId?: string;
  /** Filter by date range (start timestamp) */
  fromTimestamp?: number;
  /** Filter by date range (end timestamp) */
  toTimestamp?: number;
}

/**
 * Paginated version list result
 */
export interface VersionListResult {
  /** List of version metadata */
  versions: VersionMetadata[];
  /** Total number of versions matching the filter */
  total: number;
  /** Whether there are more versions available */
  hasMore: boolean;
  /** Current offset */
  offset: number;
  /** Current limit */
  limit: number;
}

/**
 * Cleanup configuration
 */
export interface CleanupConfig {
  /** Maximum number of versions to keep per document */
  maxVersionsPerDocument: number;
  /** Maximum age in days for auto-snapshots */
  maxAutoSnapshotAgeDays: number;
  /** Maximum age in days for manual snapshots (usually longer) */
  maxManualSnapshotAgeDays: number;
  /** Run cleanup on every save (default: false) */
  cleanupOnSave: boolean;
  /** Interval in milliseconds for background cleanup (0 to disable) */
  cleanupIntervalMs: number;
}

/**
 * Default cleanup configuration
 */
export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  maxVersionsPerDocument: 100,
  maxAutoSnapshotAgeDays: 7,
  maxManualSnapshotAgeDays: 30,
  cleanupOnSave: false,
  cleanupIntervalMs: 3600000, // 1 hour
};

/**
 * Persistence hook interface for external storage
 */
export interface PersistenceHook {
  /** Save a version to external storage */
  save(version: StoredVersion): Promise<void>;
  /** Load a version from external storage */
  load(versionId: string): Promise<StoredVersion | null>;
  /** Delete a version from external storage */
  delete(versionId: string): Promise<void>;
  /** Load all versions for a document from external storage */
  loadDocumentVersions(documentId: string): Promise<StoredVersion[]>;
  /** Clear all versions from external storage */
  clear(): Promise<void>;
}

/**
 * VersionStore options
 */
export interface VersionStoreOptions {
  /** Cleanup configuration */
  cleanupConfig?: Partial<CleanupConfig>;
  /** Optional persistence hook for external storage */
  persistenceHook?: PersistenceHook;
  /** Maximum total size in bytes (0 for unlimited) */
  maxTotalSizeBytes?: number;
}

/**
 * VersionStore - Stores and manages document versions
 */
export class VersionStore {
  private versions: Map<string, StoredVersion> = new Map();
  private documentIndex: Map<string, Set<string>> = new Map();
  private cleanupConfig: CleanupConfig;
  private persistenceHook?: PersistenceHook;
  private maxTotalSizeBytes: number;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private totalSize = 0;

  /**
   * Creates a new VersionStore
   */
  constructor(options: VersionStoreOptions = {}) {
    this.cleanupConfig = {
      ...DEFAULT_CLEANUP_CONFIG,
      ...options.cleanupConfig,
    };
    this.persistenceHook = options.persistenceHook;
    this.maxTotalSizeBytes = options.maxTotalSizeBytes ?? 0;

    // Start cleanup interval if configured
    if (this.cleanupConfig.cleanupIntervalMs > 0) {
      this.startCleanupInterval();
    }
  }

  /**
   * Saves a version to the store
   */
  async saveVersion(version: StoredVersion): Promise<void> {
    // Store in memory
    this.versions.set(version.id, version);
    this.totalSize += version.size;

    // Update document index
    let docVersions = this.documentIndex.get(version.documentId);
    if (!docVersions) {
      docVersions = new Set();
      this.documentIndex.set(version.documentId, docVersions);
    }
    docVersions.add(version.id);

    // Persist to external storage if configured
    if (this.persistenceHook) {
      await this.persistenceHook.save(version);
    }

    // Cleanup if configured
    if (this.cleanupConfig.cleanupOnSave) {
      await this.cleanupDocument(version.documentId);
    }

    // Check total size limit
    if (this.maxTotalSizeBytes > 0 && this.totalSize > this.maxTotalSizeBytes) {
      await this.evictOldestVersions();
    }
  }

  /**
   * Gets a list of versions for a document
   */
  async getVersions(
    documentId: string,
    options: VersionListOptions = {}
  ): Promise<VersionListResult> {
    const {
      limit = 20,
      offset = 0,
      includeAutoSnapshots = true,
      authorId,
      fromTimestamp,
      toTimestamp,
    } = options;

    // Get version IDs for document
    const versionIds = this.documentIndex.get(documentId);
    if (!versionIds) {
      return {
        versions: [],
        total: 0,
        hasMore: false,
        offset,
        limit,
      };
    }

    // Get all versions and apply filters
    let versions = Array.from(versionIds)
      .map((id) => this.versions.get(id))
      .filter((v): v is StoredVersion => v !== undefined);

    // Apply filters
    if (!includeAutoSnapshots) {
      versions = versions.filter((v) => !v.isAutoSnapshot);
    }

    if (authorId) {
      versions = versions.filter((v) => v.author.id === authorId);
    }

    if (fromTimestamp !== undefined) {
      versions = versions.filter((v) => v.timestamp >= fromTimestamp);
    }

    if (toTimestamp !== undefined) {
      versions = versions.filter((v) => v.timestamp <= toTimestamp);
    }

    // Sort by timestamp (most recent first)
    versions.sort((a, b) => b.timestamp - a.timestamp);

    const total = versions.length;

    // Apply pagination
    const paginatedVersions = versions.slice(offset, offset + limit);

    // Convert to metadata (exclude snapshot data)
    const metadata: VersionMetadata[] = paginatedVersions.map((v) => ({
      id: v.id,
      documentId: v.documentId,
      timestamp: v.timestamp,
      author: v.author,
      label: v.label,
      changeCount: v.changeCount,
      size: v.size,
      isAutoSnapshot: v.isAutoSnapshot,
      trigger: v.trigger,
    }));

    return {
      versions: metadata,
      total,
      hasMore: offset + limit < total,
      offset,
      limit,
    };
  }

  /**
   * Gets a single version by ID
   */
  async getVersion(versionId: string): Promise<StoredVersion | null> {
    // Try memory first
    let version = this.versions.get(versionId);

    // Try persistence hook if not in memory
    if (!version && this.persistenceHook) {
      version = await this.persistenceHook.load(versionId) ?? undefined;
      if (version) {
        // Cache in memory
        this.versions.set(version.id, version);
        this.totalSize += version.size;

        // Update index
        let docVersions = this.documentIndex.get(version.documentId);
        if (!docVersions) {
          docVersions = new Set();
          this.documentIndex.set(version.documentId, docVersions);
        }
        docVersions.add(version.id);
      }
    }

    return version ?? null;
  }

  /**
   * Deletes a version
   */
  async deleteVersion(versionId: string): Promise<boolean> {
    const version = this.versions.get(versionId);
    if (!version) {
      // Try to delete from persistence even if not in memory
      if (this.persistenceHook) {
        await this.persistenceHook.delete(versionId);
      }
      return false;
    }

    // Remove from memory
    this.versions.delete(versionId);
    this.totalSize -= version.size;

    // Update document index
    const docVersions = this.documentIndex.get(version.documentId);
    if (docVersions) {
      docVersions.delete(versionId);
      if (docVersions.size === 0) {
        this.documentIndex.delete(version.documentId);
      }
    }

    // Delete from persistence
    if (this.persistenceHook) {
      await this.persistenceHook.delete(versionId);
    }

    return true;
  }

  /**
   * Updates a version's label
   */
  async updateVersionLabel(versionId: string, label: string): Promise<boolean> {
    const version = this.versions.get(versionId);
    if (!version) {
      return false;
    }

    version.label = label;

    // Update in persistence
    if (this.persistenceHook) {
      await this.persistenceHook.save(version);
    }

    return true;
  }

  /**
   * Gets the latest version for a document
   */
  async getLatestVersion(documentId: string): Promise<StoredVersion | null> {
    const versionIds = this.documentIndex.get(documentId);
    if (!versionIds || versionIds.size === 0) {
      return null;
    }

    let latestVersion: StoredVersion | null = null;
    let latestTimestamp = 0;

    for (const id of versionIds) {
      const version = this.versions.get(id);
      if (version && version.timestamp > latestTimestamp) {
        latestTimestamp = version.timestamp;
        latestVersion = version;
      }
    }

    return latestVersion;
  }

  /**
   * Gets the version count for a document
   */
  getVersionCount(documentId: string): number {
    return this.documentIndex.get(documentId)?.size ?? 0;
  }

  /**
   * Gets the total size of all versions for a document
   */
  getDocumentTotalSize(documentId: string): number {
    const versionIds = this.documentIndex.get(documentId);
    if (!versionIds) {
      return 0;
    }

    let total = 0;
    for (const id of versionIds) {
      const version = this.versions.get(id);
      if (version) {
        total += version.size;
      }
    }
    return total;
  }

  /**
   * Cleans up old versions for a document
   */
  async cleanupDocument(documentId: string): Promise<number> {
    const versionIds = this.documentIndex.get(documentId);
    if (!versionIds) {
      return 0;
    }

    // Get all versions
    const versions = Array.from(versionIds)
      .map((id) => this.versions.get(id))
      .filter((v): v is StoredVersion => v !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);

    const now = Date.now();
    const maxAutoAge = this.cleanupConfig.maxAutoSnapshotAgeDays * 24 * 60 * 60 * 1000;
    const maxManualAge = this.cleanupConfig.maxManualSnapshotAgeDays * 24 * 60 * 60 * 1000;

    const toDelete: string[] = [];

    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];

      // Always keep labeled/manual snapshots longer
      if (version.label && !version.isAutoSnapshot) {
        // Check manual age limit
        if (now - version.timestamp > maxManualAge) {
          toDelete.push(version.id);
        }
        continue;
      }

      // Check auto-snapshot age limit
      if (version.isAutoSnapshot && now - version.timestamp > maxAutoAge) {
        toDelete.push(version.id);
        continue;
      }

      // Check max versions limit (keep at least a few recent ones)
      if (i >= this.cleanupConfig.maxVersionsPerDocument) {
        toDelete.push(version.id);
      }
    }

    // Delete old versions
    for (const id of toDelete) {
      await this.deleteVersion(id);
    }

    return toDelete.length;
  }

  /**
   * Cleans up all documents
   */
  async cleanupAll(): Promise<number> {
    let total = 0;
    for (const documentId of this.documentIndex.keys()) {
      total += await this.cleanupDocument(documentId);
    }
    return total;
  }

  /**
   * Clears all versions for a document
   */
  async clearDocument(documentId: string): Promise<void> {
    const versionIds = this.documentIndex.get(documentId);
    if (!versionIds) {
      return;
    }

    // Delete all versions
    for (const id of Array.from(versionIds)) {
      await this.deleteVersion(id);
    }
  }

  /**
   * Clears all data
   */
  async clear(): Promise<void> {
    this.versions.clear();
    this.documentIndex.clear();
    this.totalSize = 0;

    if (this.persistenceHook) {
      await this.persistenceHook.clear();
    }
  }

  /**
   * Gets statistics about the store
   */
  getStats(): {
    totalVersions: number;
    totalDocuments: number;
    totalSizeBytes: number;
    maxTotalSizeBytes: number;
  } {
    return {
      totalVersions: this.versions.size,
      totalDocuments: this.documentIndex.size,
      totalSizeBytes: this.totalSize,
      maxTotalSizeBytes: this.maxTotalSizeBytes,
    };
  }

  /**
   * Loads versions from persistence hook
   */
  async loadFromPersistence(documentId: string): Promise<void> {
    if (!this.persistenceHook) {
      return;
    }

    const versions = await this.persistenceHook.loadDocumentVersions(documentId);
    for (const version of versions) {
      // Only load if not already in memory
      if (!this.versions.has(version.id)) {
        this.versions.set(version.id, version);
        this.totalSize += version.size;

        let docVersions = this.documentIndex.get(version.documentId);
        if (!docVersions) {
          docVersions = new Set();
          this.documentIndex.set(version.documentId, docVersions);
        }
        docVersions.add(version.id);
      }
    }
  }

  /**
   * Stops the cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Destroys the store and cleans up resources
   */
  destroy(): void {
    this.stopCleanupInterval();
    this.versions.clear();
    this.documentIndex.clear();
  }

  // ============ Private Methods ============

  /**
   * Starts the cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupAll().catch((error) => {
        console.error('Version store cleanup error:', error);
      });
    }, this.cleanupConfig.cleanupIntervalMs);
  }

  /**
   * Evicts oldest versions when storage limit is exceeded
   */
  private async evictOldestVersions(): Promise<void> {
    if (this.maxTotalSizeBytes <= 0) {
      return;
    }

    // Get all versions sorted by timestamp (oldest first)
    const allVersions = Array.from(this.versions.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    // Evict oldest versions until under limit
    for (const version of allVersions) {
      if (this.totalSize <= this.maxTotalSizeBytes) {
        break;
      }

      // Don't evict labeled versions
      if (version.label && !version.isAutoSnapshot) {
        continue;
      }

      await this.deleteVersion(version.id);
    }
  }
}

/**
 * Creates a VersionStore with default options
 */
export function createVersionStore(
  options?: VersionStoreOptions
): VersionStore {
  return new VersionStore(options);
}
