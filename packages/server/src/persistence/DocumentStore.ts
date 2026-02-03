/**
 * Document persistence interface and implementations
 * Handles saving and loading Yjs document state
 */

/**
 * Interface for document storage backends
 */
export interface DocumentStore {
  /**
   * Save a document update
   * @param roomId - The room/document identifier
   * @param update - The Yjs document update as binary data
   */
  saveDocument(roomId: string, update: Uint8Array): Promise<void>;

  /**
   * Load a document's stored state
   * @param roomId - The room/document identifier
   * @returns The stored document state, or null if not found
   */
  loadDocument(roomId: string): Promise<Uint8Array | null>;

  /**
   * Delete a document from storage
   * @param roomId - The room/document identifier
   */
  deleteDocument(roomId: string): Promise<void>;

  /**
   * List all stored documents
   * @returns Array of room/document identifiers
   */
  listDocuments(): Promise<string[]>;

  /**
   * Check if a document exists in storage
   * @param roomId - The room/document identifier
   */
  hasDocument(roomId: string): Promise<boolean>;
}

/**
 * In-memory document store implementation
 * Suitable for development and testing
 */
export class MemoryDocumentStore implements DocumentStore {
  private documents: Map<string, Uint8Array>;
  private maxDocuments: number;

  constructor(options: { maxDocuments?: number } = {}) {
    this.documents = new Map();
    this.maxDocuments = options.maxDocuments ?? 1000;
  }

  async saveDocument(roomId: string, update: Uint8Array): Promise<void> {
    // Check if we're at capacity and this is a new document
    if (!this.documents.has(roomId) && this.documents.size >= this.maxDocuments) {
      // Remove the oldest document (first in map iteration order)
      const oldestKey = this.documents.keys().next().value;
      if (oldestKey !== undefined) {
        this.documents.delete(oldestKey);
      }
    }

    // Store a copy of the update to prevent external mutation
    const copy = new Uint8Array(update.length);
    copy.set(update);
    this.documents.set(roomId, copy);
  }

  async loadDocument(roomId: string): Promise<Uint8Array | null> {
    const data = this.documents.get(roomId);
    if (data === undefined) {
      return null;
    }

    // Return a copy to prevent external mutation
    const copy = new Uint8Array(data.length);
    copy.set(data);
    return copy;
  }

  async deleteDocument(roomId: string): Promise<void> {
    this.documents.delete(roomId);
  }

  async listDocuments(): Promise<string[]> {
    return Array.from(this.documents.keys());
  }

  async hasDocument(roomId: string): Promise<boolean> {
    return this.documents.has(roomId);
  }

  /**
   * Get the number of stored documents
   */
  getDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Clear all stored documents
   */
  clear(): void {
    this.documents.clear();
  }

  /**
   * Get the total size of all stored documents in bytes
   */
  getTotalSize(): number {
    let total = 0;
    for (const data of this.documents.values()) {
      total += data.length;
    }
    return total;
  }
}

/**
 * Create a document store based on configuration
 */
export function createDocumentStore(
  type: 'memory' = 'memory',
  options: Record<string, unknown> = {}
): DocumentStore {
  switch (type) {
    case 'memory':
      return new MemoryDocumentStore(options as { maxDocuments?: number });
    default:
      throw new Error(`Unknown document store type: ${type}`);
  }
}
