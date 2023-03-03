import type { Context } from 'koa';
import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { WebSocket, WebSocketServer, RawData } from 'ws';

import type { IHandlerOptions, TransferMethod } from './types';
import { ProviderTransferError } from '../../../errors/providers';

type WSCallback = (client: WebSocket, request: IncomingMessage) => void;

export const transformUpgradeHeader = (header = '') => {
  return header.split(',').map((s) => s.trim().toLowerCase());
};

/**
 * Make sure that the upgrade header is a valid websocket one
 */
export const assertValidHeader = (ctx: Context) => {
  const upgradeHeader = transformUpgradeHeader(ctx.headers.upgrade);

  if (!upgradeHeader.includes('websocket')) {
    throw new Error('Invalid Header');
  }
};

/**
 * Handle the upgrade to ws connection
 */
export const handleWSUpgrade = (wss: WebSocketServer, ctx: Context, callback: WSCallback) => {
  assertValidHeader(ctx);

  wss.handleUpgrade(ctx.req, ctx.request.socket, Buffer.alloc(0), (client, request) => {
    // Create a connection between the client & the server
    wss.emit('connection', client, ctx.req);

    // Invoke the ws callback
    callback(client, request);
  });

  ctx.respond = false;
};

// Protocol related functions

interface TransferState {
  id?: string;
}

export interface Handler {
  // Transfer ID
  get transferID(): TransferState['id'];
  set transferID(id: TransferState['id']);

  // Messaging utils

  /**
   * Respond to a specific message
   */
  respond<T = unknown>(uuid?: string, e?: Error | null, data?: T): Promise<void>;

  /**
   * It sends a message to the client
   */
  send<T = unknown>(message: T, cb?: (err?: Error) => void): void;

  /**
   * It sends a message to the client and waits for a confirmation
   */
  confirm<T = unknown>(message: T): Promise<void>;

  // Utils

  /**
   * Invoke a function and return its result to the client
   */
  executeAndRespond<T = unknown>(uuid: string, fn: () => T): Promise<void>;

  // Lifecycles

  /**
   * Lifecycle called on error or when the ws connection is closed
   */
  teardown(): Promise<void> | void;

  // Events
  onMessage(message: RawData, isBinary: boolean): Promise<void> | void;
  onClose(code: number, reason: Buffer): Promise<void> | void;
  onError(err: Error): Promise<void> | void;
}

export const handlerFactory = (implementation: Partial<Handler>, options: IHandlerOptions) => {
  const { verify, server: serverOptions } = options ?? {};

  const wss = new WebSocket.Server({ ...serverOptions, noServer: true });

  return async (ctx: Context) => {
    const verifyAuth = (scope?: TransferMethod) => verify(ctx, scope);

    handleWSUpgrade(wss, ctx, (ws) => {
      const state: TransferState = { id: undefined };

      const proto: Handler = {
        // Transfer ID
        get transferID() {
          return state.id;
        },

        set transferID(id) {
          state.id = id;
        },

        respond(uuid, e, data) {
          return new Promise<void>((resolve, reject) => {
            if (!uuid && !e) {
              reject(new Error('Missing uuid for this message'));
              return;
            }

            const payload = {
              uuid,
              data: data ?? null,
              error: e
                ? {
                    code: e?.name ?? 'ERR',
                    message: e?.message,
                  }
                : null,
            };

            this.send(payload, (error) => (error ? reject(error) : resolve()));
          });
        },

        send(message, cb) {
          let payload;

          try {
            payload = JSON.stringify(message);
          } catch {
            payload = message;
          }

          ws.send(payload, cb);
        },

        confirm(message) {
          return new Promise((resolve, reject) => {
            const uuid = randomUUID();

            const payload = { uuid, data: message };

            const stringifiedPayload = JSON.stringify(payload);

            ws.send(stringifiedPayload, (error) => {
              if (error) {
                reject(error);
              }
            });

            const onResponse = (raw: RawData) => {
              const response = JSON.parse(raw.toString());

              if (response.uuid === uuid) {
                if (response.error) {
                  return reject(new Error(response.error.message));
                }

                resolve(response.data ?? null);
              } else {
                ws.once('message', onResponse);
              }
            };

            ws.once('message', onResponse);
          });
        },

        async executeAndRespond(uuid, fn) {
          try {
            const response = await fn();
            this.respond(uuid, null, response);
          } catch (e) {
            if (e instanceof Error) {
              this.respond(uuid, e);
            } else if (typeof e === 'string') {
              this.respond(uuid, new ProviderTransferError(e));
            } else {
              this.respond(
                uuid,
                new ProviderTransferError('Unexpected error', {
                  error: e,
                })
              );
            }
          }
        },

        teardown() {
          this.transferID = undefined;
        },

        // Default prototype implementation for events
        onMessage() {},
        onError() {},
        onClose() {},
      };

      const handler: Handler = Object.assign(Object.create(proto), implementation);

      // Events
      ws.on('close', (...args) => handler.onClose(...args));
      ws.on('error', (...args) => handler.onError(...args));
      ws.on('message', (...args) => handler.onMessage(...args));
    });
  };
};
