import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import type { Context } from 'koa';
import type { RawData, ServerOptions } from 'ws';
import { WebSocket, WebSocketServer } from 'ws';

import type { Handler, TransferState } from './abstract';
import type { Protocol } from '../../../../types';
import { ProviderError, ProviderTransferError } from '../../../errors/providers';
import { VALID_TRANSFER_COMMANDS, ValidTransferCommand } from './constants';
import { TransferMethod } from '../constants';

type WSCallback = (client: WebSocket, request: IncomingMessage) => void;

export interface HandlerOptions {
  verify: (ctx: Context, scope?: TransferMethod) => Promise<void>;
  server?: ServerOptions;
}

export const transformUpgradeHeader = (header = '') => {
  return header.split(',').map((s) => s.trim().toLowerCase());
};

/**
 * Make sure that the upgrade header is a valid websocket one
 */
export const assertValidHeader = (ctx: Context) => {
  // if it's exactly what we expect, it's fine
  if (ctx.headers.upgrade === 'websocket') {
    return;
  }

  // check if it could be an array that still includes websocket
  const upgradeHeader = transformUpgradeHeader(ctx.headers.upgrade);

  // Sanitize user input before writing it to our logs
  const logSafeUpgradeHeader = JSON.stringify(ctx.headers.upgrade)
    ?.replace(/[^a-z0-9\s.,|]/gi, '')
    .substring(0, 50);

  if (!upgradeHeader.includes('websocket')) {
    throw new Error(
      `Transfer Upgrade header expected 'websocket', found '${logSafeUpgradeHeader}'. Please ensure that your server or proxy is not modifying the Upgrade header.`
    );
  }

  /**
   * If there's more than expected but it still includes websocket, in theory it could still work
   * and could be necessary for their certain configurations, so we'll allow it to proceed but
   * log the unexpected behaviour in case it helps debug an issue
   * */
  strapi.log.info(
    `Transfer Upgrade header expected only 'websocket', found unexpected values: ${logSafeUpgradeHeader}`
  );
};

export const isDataTransferMessage = (message: unknown): message is Protocol.Client.Message => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const { uuid, type } = message as Record<string, unknown>;

  if (typeof uuid !== 'string' || typeof type !== 'string') {
    return false;
  }

  if (!['command', 'transfer'].includes(type)) {
    return false;
  }

  return true;
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

export const handlerControllerFactory =
  <T extends Partial<Handler>>(implementation: (proto: Handler) => T) =>
  (options: HandlerOptions) => {
    const { verify, server: serverOptions } = options ?? {};

    const wss = new WebSocket.Server({ ...serverOptions, noServer: true });

    return async (ctx: Context) => {
      handleWSUpgrade(wss, ctx, (ws) => {
        const state: TransferState = { id: undefined };
        const messageUUIDs = new Set<string>();

        const prototype: Handler = {
          // Transfer ID
          get transferID() {
            return state.id;
          },

          set transferID(id) {
            state.id = id;
          },

          // Started at
          get startedAt() {
            return state.startedAt;
          },

          set startedAt(timestamp) {
            state.startedAt = timestamp;
          },

          get response() {
            return state.response;
          },

          set response(response) {
            state.response = response;
          },

          addUUID(uuid) {
            messageUUIDs.add(uuid);
          },

          hasUUID(uuid) {
            return messageUUIDs.has(uuid);
          },

          isTransferStarted() {
            return this.transferID !== undefined && this.startedAt !== undefined;
          },

          assertValidTransfer() {
            const isStarted = this.isTransferStarted();

            if (!isStarted) {
              throw new Error('Invalid Transfer Process');
            }
          },

          assertValidTransferCommand(command: ValidTransferCommand) {
            const isDefined = typeof this[command] === 'function';
            const isValidTransferCommand = VALID_TRANSFER_COMMANDS.includes(command);

            if (!isDefined || !isValidTransferCommand) {
              throw new Error('Invalid transfer command');
            }
          },

          respond(uuid, e, data) {
            let details = {};
            return new Promise<void>((resolve, reject) => {
              if (!uuid && !e) {
                reject(new Error('Missing uuid for this message'));
                return;
              }

              this.response = {
                uuid,
                data,
                e,
              };

              if (e instanceof ProviderError) {
                details = e.details;
              }

              const payload = JSON.stringify({
                uuid,
                data: data ?? null,
                error: e
                  ? {
                      code: e?.name ?? 'ERR',
                      message: e?.message,
                      details,
                    }
                  : null,
              });

              this.send(payload, (error) => (error ? reject(error) : resolve()));
            });
          },

          send(message, cb) {
            ws.send(message, cb);
          },

          confirm(message) {
            return new Promise((resolve, reject) => {
              const uuid = randomUUID();

              const payload = JSON.stringify({ uuid, data: message });

              this.send(payload, (error) => {
                if (error) {
                  reject(error);
                }
              });

              const onResponse = (raw: RawData) => {
                const response = JSON.parse(raw.toString());

                if (response.uuid === uuid) {
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

          cleanup() {
            this.transferID = undefined;
            this.startedAt = undefined;
            this.response = undefined;
          },

          teardown() {
            this.cleanup();
          },

          verifyAuth(scope?: TransferMethod) {
            return verify(ctx, scope);
          },

          // Transfer commands
          init() {},
          end() {},
          status() {},

          // Default prototype implementation for events
          onMessage() {},
          onError() {},
          onClose() {},
        };

        const handler: Handler = Object.assign(Object.create(prototype), implementation(prototype));

        // Bind ws events to handler methods
        ws.on('close', (...args) => handler.onClose(...args));
        ws.on('error', (...args) => handler.onError(...args));
        ws.on('message', (...args) => handler.onMessage(...args));
      });
    };
  };
