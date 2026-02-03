/**
 * CollaborationServer - WebSocket server for real-time collaboration
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager, type RoomManagerOptions } from '../rooms/RoomManager.js';
import type { RoomClient } from '../rooms/Room.js';
import {
  decodeMessage,
  encodeMessage,
  createPongMessage,
  createErrorMessage,
  type Message,
} from './MessageHandler.js';
import { type DocumentStore, MemoryDocumentStore } from '../persistence/DocumentStore.js';

/**
 * Server configuration options
 */
export interface ServerOptions {
  /** Port to listen on */
  port: number;
  /** WebSocket path (default: '/') */
  path?: string | undefined;
  /** Maximum payload size in bytes (default: 1MB) */
  maxPayload?: number | undefined;
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number | undefined;
  /** Connection timeout in milliseconds (default: 60000) */
  connectionTimeout?: number | undefined;
  /** Document store for persistence */
  documentStore?: DocumentStore | undefined;
  /** Room manager options */
  roomManagerOptions?: RoomManagerOptions | undefined;
  /** Optional host to bind to */
  host?: string | undefined;
}

/**
 * Extended WebSocket with client data
 */
interface ExtendedWebSocket extends WebSocket {
  clientData?: RoomClient | undefined;
  isAlive?: boolean | undefined;
}

/**
 * Internal options type with required fields set
 */
interface InternalOptions {
  port: number;
  path: string;
  maxPayload: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  documentStore: DocumentStore;
  host: string | undefined;
}

/**
 * CollaborationServer class for managing WebSocket connections and collaboration
 */
export class CollaborationServer {
  private wss: WebSocketServer | null = null;
  private rooms: RoomManager;
  private options: InternalOptions;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | undefined;
  private isRunning: boolean = false;

  constructor(options: ServerOptions) {
    // Set up document store
    const documentStore = options.documentStore ?? new MemoryDocumentStore();

    // Initialize options with defaults
    this.options = {
      port: options.port,
      path: options.path ?? '/',
      maxPayload: options.maxPayload ?? 1024 * 1024, // 1MB
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      connectionTimeout: options.connectionTimeout ?? 60000,
      documentStore,
      host: options.host,
    };

    // Initialize room manager
    this.rooms = new RoomManager({
      documentStore,
      clientTimeout: this.options.connectionTimeout,
      ...options.roomManagerOptions,
    });
  }

  /**
   * Start the WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        reject(new Error('Server is already running'));
        return;
      }

      try {
        const serverOptions: ConstructorParameters<typeof WebSocketServer>[0] = {
          port: this.options.port,
          path: this.options.path,
          maxPayload: this.options.maxPayload,
        };

        if (this.options.host !== undefined) {
          serverOptions.host = this.options.host;
        }

        this.wss = new WebSocketServer(serverOptions);

        this.wss.on('connection', (ws: ExtendedWebSocket, request: IncomingMessage) => {
          this.handleConnection(ws, request);
        });

        this.wss.on('error', (error: Error) => {
          console.error('WebSocket server error:', error);
        });

        this.wss.on('listening', () => {
          this.isRunning = true;
          console.log(`Collaboration server listening on port ${this.options.port}`);

          // Start heartbeat interval
          this.startHeartbeat();

          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || this.wss === null) {
      return;
    }

    // Stop heartbeat
    if (this.heartbeatIntervalId !== undefined) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = undefined;
    }

    // Close all connections
    for (const client of this.wss.clients) {
      client.close(1001, 'Server shutting down');
    }

    // Shut down room manager
    await this.rooms.shutdown();

    // Close the server
    return new Promise((resolve, reject) => {
      this.wss!.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.isRunning = false;
          this.wss = null;
          console.log('Collaboration server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: ExtendedWebSocket, request: IncomingMessage): void {
    // Generate client ID
    const clientId = uuidv4();

    // Parse connection parameters from URL
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const userId = url.searchParams.get('userId') ?? undefined;
    const userName = url.searchParams.get('userName') ?? undefined;
    const color = url.searchParams.get('color') ?? this.generateRandomColor();

    // Create client data
    const client: RoomClient = {
      id: clientId,
      ws,
      userId,
      userName,
      color,
      lastActive: Date.now(),
      subscribedRooms: new Set(),
    };

    // Attach client data to WebSocket
    ws.clientData = client;
    ws.isAlive = true;

    console.log(`Client connected: ${clientId}${userId !== undefined ? ` (user: ${userId})` : ''}`);

    // Set up event handlers
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(ws, code, reason.toString());
    });

    ws.on('error', (error: Error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });

    ws.on('pong', () => {
      ws.isAlive = true;
      if (ws.clientData !== undefined) {
        ws.clientData.lastActive = Date.now();
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(ws: ExtendedWebSocket, data: Buffer): void {
    const client = ws.clientData;
    if (client === undefined) {
      console.error('Received message from WebSocket without client data');
      return;
    }

    client.lastActive = Date.now();

    try {
      const message = decodeMessage(data);
      this.routeMessage(client, message);
    } catch (error) {
      console.error(`Error processing message from ${client.id}:`, error);
      const errorMessage = createErrorMessage(
        error instanceof Error ? error.message : 'Invalid message format'
      );
      ws.send(errorMessage);
    }
  }

  /**
   * Route a decoded message to the appropriate handler
   */
  private routeMessage(client: RoomClient, message: Message): void {
    switch (message.type) {
      case 'ping':
        this.handlePing(client);
        break;

      case 'subscribe':
        if (message.roomId !== undefined) {
          this.handleSubscribe(client, message.roomId);
        } else {
          this.sendError(client, 'Subscribe requires roomId');
        }
        break;

      case 'unsubscribe':
        if (message.roomId !== undefined) {
          this.handleUnsubscribe(client, message.roomId);
        } else {
          this.sendError(client, 'Unsubscribe requires roomId');
        }
        break;

      case 'sync':
        if (message.roomId !== undefined && message.data !== undefined) {
          this.handleSync(client, message.roomId, message.data);
        } else {
          this.sendError(client, 'Sync requires roomId and data');
        }
        break;

      case 'awareness':
        if (message.roomId !== undefined && message.data !== undefined) {
          this.handleAwareness(client, message.roomId, message.data);
        } else {
          this.sendError(client, 'Awareness requires roomId and data');
        }
        break;

      case 'pong':
        // Client responding to our ping - already handled in 'pong' event
        break;

      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle ping message
   */
  private handlePing(client: RoomClient): void {
    const pong = createPongMessage();
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(pong);
    }
  }

  /**
   * Handle subscribe message - client wants to join a room
   */
  private async handleSubscribe(client: RoomClient, roomId: string): Promise<void> {
    try {
      // Check if already subscribed
      if (client.subscribedRooms.has(roomId)) {
        return;
      }

      await this.rooms.addClientToRoom(roomId, client);
      console.log(`Client ${client.id} subscribed to room ${roomId}`);

      // Send success confirmation
      const confirmation = encodeMessage({
        type: 'subscribe',
        roomId,
      });
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(confirmation);
      }
    } catch (error) {
      console.error(`Error subscribing client ${client.id} to room ${roomId}:`, error);
      this.sendError(client, `Failed to subscribe to room: ${roomId}`, roomId);
    }
  }

  /**
   * Handle unsubscribe message - client wants to leave a room
   */
  private handleUnsubscribe(client: RoomClient, roomId: string): void {
    this.rooms.removeClientFromRoom(roomId, client.id);
    console.log(`Client ${client.id} unsubscribed from room ${roomId}`);

    // Send confirmation
    const confirmation = encodeMessage({
      type: 'unsubscribe',
      roomId,
    });
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(confirmation);
    }
  }

  /**
   * Handle sync message - Yjs document update
   */
  private handleSync(client: RoomClient, roomId: string, data: Uint8Array): void {
    const room = this.rooms.getRoom(roomId);
    if (room === undefined) {
      this.sendError(client, `Not subscribed to room: ${roomId}`, roomId);
      return;
    }

    if (!room.hasClient(client.id)) {
      this.sendError(client, `Not a member of room: ${roomId}`, roomId);
      return;
    }

    // Apply the update to the room's document
    room.applyUpdate(data, client.id);
  }

  /**
   * Handle awareness message - presence update
   */
  private handleAwareness(client: RoomClient, roomId: string, data: Uint8Array): void {
    const room = this.rooms.getRoom(roomId);
    if (room === undefined) {
      this.sendError(client, `Not subscribed to room: ${roomId}`, roomId);
      return;
    }

    if (!room.hasClient(client.id)) {
      this.sendError(client, `Not a member of room: ${roomId}`, roomId);
      return;
    }

    // Apply the awareness update
    room.applyAwarenessUpdate(data, client.id);
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: ExtendedWebSocket, code: number, reason: string): void {
    const client = ws.clientData;
    if (client === undefined) {
      return;
    }

    console.log(`Client disconnected: ${client.id} (code: ${code}, reason: ${reason || 'none'})`);

    // Remove client from all rooms
    this.rooms.removeClientFromAllRooms(client);
  }

  /**
   * Send an error message to a client
   */
  private sendError(client: RoomClient, error: string, roomId?: string): void {
    const errorMessage = createErrorMessage(error, roomId);
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(errorMessage);
    }
  }

  /**
   * Start heartbeat interval for connection health checks
   */
  private startHeartbeat(): void {
    this.heartbeatIntervalId = setInterval(() => {
      if (this.wss === null) {
        return;
      }

      for (const ws of this.wss.clients) {
        const extWs = ws as ExtendedWebSocket;

        if (extWs.isAlive === false) {
          // Connection is dead, terminate it
          const client = extWs.clientData;
          if (client !== undefined) {
            console.log(`Terminating dead connection: ${client.id}`);
            this.rooms.removeClientFromAllRooms(client);
          }
          extWs.terminate();
          continue;
        }

        // Mark as not alive and send ping
        extWs.isAlive = false;
        extWs.ping();
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Generate a random color for client identification
   */
  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E9',
    ];
    return colors[Math.floor(Math.random() * colors.length)]!;
  }

  /**
   * Get the room manager instance
   */
  getRoomManager(): RoomManager {
    return this.rooms;
  }

  /**
   * Get server statistics
   */
  getStats(): {
    isRunning: boolean;
    connectedClients: number;
    roomStats: ReturnType<RoomManager['getStats']>;
  } {
    return {
      isRunning: this.isRunning,
      connectedClients: this.wss?.clients.size ?? 0,
      roomStats: this.rooms.getStats(),
    };
  }

  /**
   * Check if server is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}
