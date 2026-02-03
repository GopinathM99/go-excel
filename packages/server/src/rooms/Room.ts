/**
 * Room class for managing a single collaborative document session
 * Each room contains a Yjs document and connected clients
 */

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { WebSocket } from 'ws';
import { createSyncMessage, createAwarenessMessage } from '../websocket/MessageHandler.js';

/**
 * Represents a connected client in a room
 */
export interface RoomClient {
  /** Unique client identifier */
  id: string;
  /** WebSocket connection */
  ws: WebSocket;
  /** Optional user identifier */
  userId?: string | undefined;
  /** Display name for awareness */
  userName?: string | undefined;
  /** Color for cursor/selection display */
  color?: string | undefined;
  /** Timestamp of last activity */
  lastActive: number;
  /** Set of rooms this client is subscribed to */
  subscribedRooms: Set<string>;
}

/**
 * Room class managing a collaborative document session
 */
export class Room {
  readonly id: string;
  private clients: Map<string, RoomClient>;
  private doc: Y.Doc;
  private awareness: awarenessProtocol.Awareness;
  private createdAt: number;
  private lastActivityAt: number;

  constructor(id: string) {
    this.id = id;
    this.clients = new Map();
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();

    // Set up document update handler
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      this.lastActivityAt = Date.now();
      // Broadcast update to all clients except the origin
      const originClientId = typeof origin === 'string' ? origin : undefined;
      this.broadcastUpdate(update, originClientId);
    });

    // Set up awareness update handler
    this.awareness.on(
      'update',
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        const changedClients = added.concat(updated, removed);
        const encodedAwareness = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);
        const originClientId = typeof origin === 'string' ? origin : undefined;
        this.broadcastAwareness(encodedAwareness, originClientId);
      }
    );
  }

  /**
   * Add a client to this room
   */
  addClient(client: RoomClient): void {
    this.clients.set(client.id, client);
    client.subscribedRooms.add(this.id);
    this.lastActivityAt = Date.now();

    // Send current document state to the new client
    this.sendInitialState(client);
  }

  /**
   * Send the current document state to a newly connected client
   */
  private sendInitialState(client: RoomClient): void {
    // Create sync step 1 message (state vector)
    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(encoder, this.doc);
    const syncMessage = createSyncMessage(this.id, encoding.toUint8Array(encoder));
    this.sendToClient(client, syncMessage);

    // Send current awareness state
    const awarenessStates = this.awareness.getStates();
    if (awarenessStates.size > 0) {
      const clientIds = Array.from(awarenessStates.keys());
      const encodedAwareness = awarenessProtocol.encodeAwarenessUpdate(this.awareness, clientIds);
      const awarenessMessage = createAwarenessMessage(this.id, encodedAwareness);
      this.sendToClient(client, awarenessMessage);
    }
  }

  /**
   * Remove a client from this room
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscribedRooms.delete(this.id);

      // Remove awareness state for this client
      awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], 'client disconnected');

      this.clients.delete(clientId);
      this.lastActivityAt = Date.now();
    }
  }

  /**
   * Send a message to a specific client
   */
  private sendToClient(client: RoomClient, message: Uint8Array): void {
    if (client.ws.readyState === client.ws.OPEN) {
      client.ws.send(message);
    }
  }

  /**
   * Broadcast a message to all clients in the room
   * @param message - The message to broadcast
   * @param excludeClientId - Optional client ID to exclude from broadcast
   */
  broadcast(message: Uint8Array, excludeClientId?: string): void {
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(message);
      }
    }
  }

  /**
   * Broadcast a document update to all clients
   */
  private broadcastUpdate(update: Uint8Array, excludeClientId?: string): void {
    const message = createSyncMessage(this.id, update);
    this.broadcast(message, excludeClientId);
  }

  /**
   * Broadcast an awareness update to all clients
   */
  private broadcastAwareness(encodedAwareness: Uint8Array, excludeClientId?: string): void {
    const message = createAwarenessMessage(this.id, encodedAwareness);
    this.broadcast(message, excludeClientId);
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get all connected clients
   */
  getClients(): RoomClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Check if a client is in this room
   */
  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  /**
   * Get the Yjs document for this room
   */
  getDoc(): Y.Doc {
    return this.doc;
  }

  /**
   * Get the awareness instance for this room
   */
  getAwareness(): awarenessProtocol.Awareness {
    return this.awareness;
  }

  /**
   * Apply a Yjs update to the document
   * @param update - The Yjs update
   * @param origin - The origin of the update (typically client ID)
   */
  applyUpdate(update: Uint8Array, origin?: string): void {
    Y.applyUpdate(this.doc, update, origin);
  }

  /**
   * Apply an awareness update
   * @param update - The encoded awareness update
   * @param origin - The origin of the update
   */
  applyAwarenessUpdate(update: Uint8Array, origin?: string): void {
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, origin);
  }

  /**
   * Handle a sync message from a client
   * @returns Response encoder if there's a response to send, null otherwise
   */
  handleSyncMessage(data: Uint8Array, clientId: string): Uint8Array | null {
    const client = this.clients.get(clientId);
    if (!client) {
      return null;
    }

    client.lastActive = Date.now();
    this.lastActivityAt = Date.now();

    // Process the sync message
    const decoder = decoding.createDecoder(data);
    const encoder = encoding.createEncoder();
    const messageType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, clientId);

    // If there's a response to send
    if (encoding.length(encoder) > 0) {
      return encoding.toUint8Array(encoder);
    }

    // Return message type for logging/debugging purposes
    // 0 = SyncStep1, 1 = SyncStep2, 2 = Update
    return messageType >= 0 ? null : null;
  }

  /**
   * Get the encoded state of the document
   */
  getEncodedState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /**
   * Get room creation timestamp
   */
  getCreatedAt(): number {
    return this.createdAt;
  }

  /**
   * Get last activity timestamp
   */
  getLastActivityAt(): number {
    return this.lastActivityAt;
  }

  /**
   * Check if the room is empty
   */
  isEmpty(): boolean {
    return this.clients.size === 0;
  }

  /**
   * Clean up room resources
   */
  destroy(): void {
    // Remove all awareness states
    const clientIds = Array.from(this.awareness.getStates().keys());
    awarenessProtocol.removeAwarenessStates(this.awareness, clientIds, 'room destroyed');

    // Clear clients
    this.clients.clear();

    // Destroy the document
    this.doc.destroy();
  }
}
