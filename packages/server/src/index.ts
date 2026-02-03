/**
 * @excel/server - WebSocket collaboration server for the MS Excel Clone
 *
 * Entry point for the collaboration server
 */

import { CollaborationServer, type ServerOptions } from './websocket/WebSocketServer.js';
import { MemoryDocumentStore, type DocumentStore } from './persistence/DocumentStore.js';

// Re-export public API
export { CollaborationServer, type ServerOptions } from './websocket/WebSocketServer.js';
export { RoomManager, type RoomManagerOptions } from './rooms/RoomManager.js';
export { Room, type RoomClient } from './rooms/Room.js';
export {
  type Message,
  type MessageType,
  encodeMessage,
  decodeMessage,
  createPingMessage,
  createPongMessage,
  createErrorMessage,
  createSubscribeMessage,
  createUnsubscribeMessage,
  createSyncMessage,
  createAwarenessMessage,
} from './websocket/MessageHandler.js';
export {
  type DocumentStore,
  MemoryDocumentStore,
  createDocumentStore,
} from './persistence/DocumentStore.js';

// Version storage
export {
  VersionStore,
  createVersionStore,
  DEFAULT_CLEANUP_CONFIG,
  type StoredVersion,
  type VersionMetadata,
  type VersionAuthor,
  type VersionListOptions,
  type VersionListResult,
  type CleanupConfig,
  type PersistenceHook,
  type VersionStoreOptions,
} from './versions/VersionStore.js';

/**
 * Default server configuration
 */
const DEFAULT_PORT = 8080;

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<ServerOptions> {
  const args: Partial<ServerOptions> = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--port' || arg === '-p') {
      const portStr = process.argv[++i];
      if (portStr !== undefined) {
        const port = parseInt(portStr, 10);
        if (!isNaN(port)) {
          args.port = port;
        }
      }
    } else if (arg === '--host' || arg === '-h') {
      const host = process.argv[++i];
      if (host !== undefined) {
        args.host = host;
      }
    } else if (arg === '--path') {
      const path = process.argv[++i];
      if (path !== undefined) {
        args.path = path;
      }
    } else if (arg === '--help') {
      console.log(`
@excel/server - WebSocket collaboration server

Usage: node dist/index.js [options]

Options:
  -p, --port <number>   Port to listen on (default: ${DEFAULT_PORT})
  -h, --host <string>   Host to bind to (default: all interfaces)
      --path <string>   WebSocket path (default: /)
      --help            Show this help message
`);
      process.exit(0);
    }
  }

  return args;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = parseArgs();

  // Create document store
  const documentStore: DocumentStore = new MemoryDocumentStore();

  // Determine configuration values
  const port = args.port ?? parseInt(process.env['PORT'] ?? String(DEFAULT_PORT), 10);
  const host = args.host ?? process.env['HOST'];
  const path = args.path ?? process.env['WS_PATH'] ?? '/';

  // Create server options
  const options: ServerOptions = {
    port,
    path,
    maxPayload: 1024 * 1024, // 1MB
    heartbeatInterval: 30000, // 30 seconds
    connectionTimeout: 60000, // 60 seconds
    documentStore,
  };

  // Only add host if defined
  if (host !== undefined) {
    options.host = host;
  }

  // Create and start server
  const server = new CollaborationServer(options);

  // Handle graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    try {
      await server.stop();
      console.log('Server stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await server.start();

    // Log server stats periodically
    setInterval(() => {
      const stats = server.getStats();
      if (stats.connectedClients > 0 || stats.roomStats.roomCount > 0) {
        console.log(
          `Stats: ${stats.connectedClients} clients, ${stats.roomStats.roomCount} rooms`
        );
      }
    }, 60000); // Every minute
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
