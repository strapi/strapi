import type { WebSocket, RawData } from 'ws';

import type { ValidTransferCommand } from './constants';
import type { TransferMethod } from '../constants';

type BufferLike = Parameters<WebSocket['send']>[0];

export interface TransferState {
  id?: string;
  startedAt?: number;
}

export interface Handler {
  // Transfer ID
  get transferID(): TransferState['id'];
  set transferID(id: TransferState['id']);

  // Started At
  get startedAt(): TransferState['startedAt'];
  set startedAt(id: TransferState['startedAt']);

  /**
   * Returns whether a transfer is currently in progress or not
   */
  isTransferStarted(): boolean;

  /**
   * Make sure the current transfer is started and initialized
   */
  assertValidTransfer(): void;

  /**
   * Checks that the given string is a valid transfer command
   */
  assertValidTransferCommand(command: string): asserts command is ValidTransferCommand;

  // Messaging utils

  /**
   * Respond to a specific message
   */
  respond<T = unknown>(uuid?: string, e?: Error | null, data?: T): Promise<void>;

  /**
   * It sends a message to the client
   */
  send<T extends BufferLike>(message: T, cb?: (err?: Error) => void): void;

  /**
   * It sends a message to the client and waits for a confirmation
   */
  confirm<T = unknown>(message: T): Promise<void>;

  // Utils

  /**
   * Check the current auth has the permission for the given scope
   */
  verifyAuth(scope?: TransferMethod): Promise<void>;

  /**
   * Invoke a function and return its result to the client
   */
  executeAndRespond<T = unknown>(uuid: string, fn: () => T): Promise<void>;

  // Lifecycles

  /**
   * Lifecycle called on error or when the ws connection is closed
   */
  teardown(): Promise<void> | void;

  /**
   * Lifecycle called to cleanup the transfer state
   */
  cleanup(): Promise<void> | void;

  // Transfer Commands
  init(...args: unknown[]): unknown;
  end(...args: unknown[]): unknown;
  status(...args: unknown[]): unknown;

  // Events
  onMessage(message: RawData, isBinary: boolean): Promise<void> | void;
  onClose(code: number, reason: Buffer): Promise<void> | void;
  onError(err: Error): Promise<void> | void;
}
