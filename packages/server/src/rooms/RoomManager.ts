/**
 * RoomManager - Manages all active rooms and client connections
 */

import { Room, type RoomClient } from './Room.js';
import type { DocumentStore } from '../persistence/DocumentStore.js';
import * as Y from 'yjs';

/**
 * Configuration options for RoomManager
 */
export interface RoomManagerOptions {
  /** Document store for persistence */
  documentStore?: DocumentStore | undefined;
  /** Interval for cleaning up empty rooms (ms), 0 to disable */
  cleanupInterval?: number | undefined;
  /** Time after which an inactive client is considered stale (ms) */
  clientTimeout?: number | undefined;
  /** Time after which an empty room is removed (ms) */
  emptyRoomTimeout?: number | undefined;
}

/**
 * RoomManager class for managing collaborative rooms
 */
export class RoomManager {
  private rooms: Map<string, Room>;
  private documentStore: DocumentStore | undefined;
  private cleanupIntervalId: ReturnType<typeof setInterval> | undefined;
  private clientTimeout: number;
  private emptyRoomTimeout: number;

  constructor(options: RoomManagerOptions = {}) {
    this.rooms = new Map();
    this.documentStore = options.documentStore;
    this.clientTimeout = options.clientTimeout ?? 30000; // 30 seconds
    this.emptyRoomTimeout = options.emptyRoomTimeout ?? 300000; // 5 minutes

    // Start cleanup interval if configured
    const cleanupInterval = options.cleanupInterval ?? 60000; // 1 minute default
    if (cleanupInterval > 0) {
      this.cleanupIntervalId = setInterval(() => {
        this.cleanupEmptyRooms();
        this.cleanupInactiveClients(this.clientTimeout);
      }, cleanupInterval);
    }
  }

  /**
   * Get an existing room or create a new one
   */
  async getOrCreateRoom(roomId: string): Promise<Room> {
    let room = this.rooms.get(roomId);

    if (room === undefined) {
      room = new Room(roomId);

      // Try to load persisted state if available
      if (this.documentStore !== undefined) {
        const savedState = await this.documentStore.loadDocument(roomId);
        if (savedState !== null) {
          Y.applyUpdate(room.getDoc(), savedState);
        }
      }

      // Set up persistence on document updates
      if (this.documentStore !== undefined) {
        const documentStore = this.documentStore;
        const currentRoom = room;
        currentRoom.getDoc().on('update', () => {
          // Debounce persistence to avoid excessive writes
          this.scheduleDocumentPersistence(roomId, currentRoom, documentStore);
        });
      }

      this.rooms.set(roomId, room);
    }

    return room;
  }

  // Track pending persistence operations
  private persistenceTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Schedule document persistence with debouncing
   */
  private scheduleDocumentPersistence(roomId: string, room: Room, documentStore: DocumentStore): void {
    // Clear any existing timeout
    const existingTimeout = this.persistenceTimeouts.get(roomId);
    if (existingTimeout !== undefined) {
      clearTimeout(existingTimeout);
    }

    // Schedule new persistence
    const timeout = setTimeout(async () => {
      this.persistenceTimeouts.delete(roomId);
      if (this.rooms.has(roomId)) {
        try {
          const state = room.getEncodedState();
          await documentStore.saveDocument(roomId, state);
        } catch (error) {
          console.error(`Failed to persist document ${roomId}:`, error);
        }
      }
    }, 1000); // 1 second debounce

    this.persistenceTimeouts.set(roomId, timeout);
  }

  /**
   * Get an existing room
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Remove a room and optionally persist its state
   */
  async removeRoom(roomId: string, persist: boolean = true): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room === undefined) {
      return;
    }

    // Persist final state if requested
    if (persist && this.documentStore !== undefined) {
      try {
        const state = room.getEncodedState();
        await this.documentStore.saveDocument(roomId, state);
      } catch (error) {
        console.error(`Failed to persist document ${roomId} on removal:`, error);
      }
    }

    // Clear any pending persistence
    const pendingTimeout = this.persistenceTimeouts.get(roomId);
    if (pendingTimeout !== undefined) {
      clearTimeout(pendingTimeout);
      this.persistenceTimeouts.delete(roomId);
    }

    // Destroy the room
    room.destroy();
    this.rooms.delete(roomId);
  }

  /**
   * Add a client to a room
   */
  async addClientToRoom(roomId: string, client: RoomClient): Promise<Room> {
    const room = await this.getOrCreateRoom(roomId);
    room.addClient(client);
    return room;
  }

  /**
   * Remove a client from a room
   */
  removeClientFromRoom(roomId: string, clientId: string): void {
    const room = this.rooms.get(roomId);
    if (room !== undefined) {
      room.removeClient(clientId);
    }
  }

  /**
   * Remove a client from all rooms they're subscribed to
   */
  removeClientFromAllRooms(client: RoomClient): void {
    for (const roomId of client.subscribedRooms) {
      this.removeClientFromRoom(roomId, client.id);
    }
    client.subscribedRooms.clear();
  }

  /**
   * Clean up empty rooms that have been inactive for too long
   */
  cleanupEmptyRooms(): void {
    const now = Date.now();

    for (const [roomId, room] of this.rooms) {
      if (room.isEmpty()) {
        const inactiveTime = now - room.getLastActivityAt();
        if (inactiveTime > this.emptyRoomTimeout) {
          // Remove room asynchronously
          this.removeRoom(roomId).catch((error) => {
            console.error(`Error removing empty room ${roomId}:`, error);
          });
        }
      }
    }
  }

  /**
   * Clean up inactive clients based on their last activity time
   * @param timeout - Time in milliseconds after which a client is considered inactive
   */
  cleanupInactiveClients(timeout: number): void {
    const now = Date.now();

    for (const room of this.rooms.values()) {
      const clients = room.getClients();
      for (const client of clients) {
        if (now - client.lastActive > timeout) {
          // Close the WebSocket connection
          try {
            client.ws.close(4000, 'Connection timeout');
          } catch {
            // Ignore errors when closing
          }
          room.removeClient(client.id);
        }
      }
    }
  }

  /**
   * Get all active room IDs
   */
  getRoomIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * Get the total number of active rooms
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Get the total number of connected clients across all rooms
   */
  getTotalClientCount(): number {
    let total = 0;
    for (const room of this.rooms.values()) {
      total += room.getClientCount();
    }
    return total;
  }

  /**
   * Get statistics about the room manager
   */
  getStats(): {
    roomCount: number;
    totalClients: number;
    rooms: Array<{ id: string; clientCount: number; lastActivity: number }>;
  } {
    const rooms = [];
    for (const [id, room] of this.rooms) {
      rooms.push({
        id,
        clientCount: room.getClientCount(),
        lastActivity: room.getLastActivityAt(),
      });
    }

    return {
      roomCount: this.rooms.size,
      totalClients: this.getTotalClientCount(),
      rooms,
    };
  }

  /**
   * Shut down the room manager
   */
  async shutdown(): Promise<void> {
    // Stop cleanup interval
    if (this.cleanupIntervalId !== undefined) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }

    // Clear all pending persistence timeouts
    for (const timeout of this.persistenceTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.persistenceTimeouts.clear();

    // Persist and remove all rooms
    const roomIds = Array.from(this.rooms.keys());
    await Promise.all(roomIds.map((roomId) => this.removeRoom(roomId, true)));
  }
}
