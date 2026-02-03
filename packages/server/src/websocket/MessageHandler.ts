/**
 * Message handling for WebSocket communication
 * Supports both binary (Yjs sync) and JSON messages
 */

import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

/**
 * Message types for WebSocket communication
 */
export type MessageType =
  | 'sync' // Yjs sync messages (binary)
  | 'awareness' // Presence updates (binary)
  | 'subscribe' // Join a document room
  | 'unsubscribe' // Leave a document room
  | 'ping' // Heartbeat request
  | 'pong' // Heartbeat response
  | 'error'; // Error message

/**
 * Message type codes for binary encoding
 */
export const MessageTypeCode = {
  sync: 0,
  awareness: 1,
  subscribe: 2,
  unsubscribe: 3,
  ping: 4,
  pong: 5,
  error: 6,
} as const;

/**
 * Reverse mapping from code to type
 */
const codeToType: Record<number, MessageType> = {
  0: 'sync',
  1: 'awareness',
  2: 'subscribe',
  3: 'unsubscribe',
  4: 'ping',
  5: 'pong',
  6: 'error',
};

/**
 * Message structure for WebSocket communication
 */
export interface Message {
  type: MessageType;
  roomId?: string;
  data?: Uint8Array;
  error?: string;
}

/**
 * Encode a message to binary format
 * Format: [type: uint8][roomIdLength: uint32][roomId: string][dataLength: uint32][data: bytes]
 */
export function encodeMessage(message: Message): Uint8Array {
  const encoder = encoding.createEncoder();

  // Write message type
  const typeCode = MessageTypeCode[message.type];
  encoding.writeUint8(encoder, typeCode);

  // Write room ID (if present)
  if (message.roomId !== undefined) {
    encoding.writeVarString(encoder, message.roomId);
  } else {
    encoding.writeVarString(encoder, '');
  }

  // Write data (if present)
  if (message.data !== undefined) {
    encoding.writeVarUint8Array(encoder, message.data);
  } else if (message.error !== undefined) {
    // For error messages, encode the error string as data
    const errorBytes = new TextEncoder().encode(message.error);
    encoding.writeVarUint8Array(encoder, errorBytes);
  } else {
    encoding.writeVarUint8Array(encoder, new Uint8Array(0));
  }

  return encoding.toUint8Array(encoder);
}

/**
 * Decode a binary message
 */
export function decodeMessage(data: ArrayBuffer | Uint8Array): Message {
  const uint8Data = data instanceof Uint8Array ? data : new Uint8Array(data);
  const decoder = decoding.createDecoder(uint8Data);

  // Read message type
  const typeCode = decoding.readUint8(decoder);
  const type = codeToType[typeCode];

  if (type === undefined) {
    throw new Error(`Unknown message type code: ${typeCode}`);
  }

  // Read room ID
  const roomId = decoding.readVarString(decoder);

  // Read data
  const messageData = decoding.readVarUint8Array(decoder);

  const message: Message = { type };

  if (roomId !== '') {
    message.roomId = roomId;
  }

  if (messageData.length > 0) {
    if (type === 'error') {
      message.error = new TextDecoder().decode(messageData);
    } else {
      message.data = messageData;
    }
  }

  return message;
}

/**
 * Create a ping message
 */
export function createPingMessage(): Uint8Array {
  return encodeMessage({ type: 'ping' });
}

/**
 * Create a pong message
 */
export function createPongMessage(): Uint8Array {
  return encodeMessage({ type: 'pong' });
}

/**
 * Create an error message
 */
export function createErrorMessage(error: string, roomId?: string): Uint8Array {
  const message: Message = { type: 'error', error };
  if (roomId !== undefined) {
    message.roomId = roomId;
  }
  return encodeMessage(message);
}

/**
 * Create a subscribe message
 */
export function createSubscribeMessage(roomId: string): Uint8Array {
  return encodeMessage({ type: 'subscribe', roomId });
}

/**
 * Create an unsubscribe message
 */
export function createUnsubscribeMessage(roomId: string): Uint8Array {
  return encodeMessage({ type: 'unsubscribe', roomId });
}

/**
 * Create a sync message with Yjs update data
 */
export function createSyncMessage(roomId: string, data: Uint8Array): Uint8Array {
  return encodeMessage({ type: 'sync', roomId, data });
}

/**
 * Create an awareness message
 */
export function createAwarenessMessage(roomId: string, data: Uint8Array): Uint8Array {
  return encodeMessage({ type: 'awareness', roomId, data });
}
