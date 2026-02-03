/**
 * WebSocket module exports
 */

export { CollaborationServer, type ServerOptions } from './WebSocketServer.js';
export {
  type Message,
  type MessageType,
  MessageTypeCode,
  encodeMessage,
  decodeMessage,
  createPingMessage,
  createPongMessage,
  createErrorMessage,
  createSubscribeMessage,
  createUnsubscribeMessage,
  createSyncMessage,
  createAwarenessMessage,
} from './MessageHandler.js';
