/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Creates a successful result
 */
export function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

/**
 * Creates a failed result
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Unique identifier type
 */
export type Id = string;

/**
 * Timestamp in milliseconds since epoch
 */
export type Timestamp = number;

/**
 * Range type for numeric ranges
 */
export interface NumericRange {
  start: number;
  end: number;
}

/**
 * Deep partial type utility
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Event handler type
 */
export type EventHandler<T = void> = (event: T) => void;

/**
 * Unsubscribe function returned by event subscriptions
 */
export type Unsubscribe = () => void;
