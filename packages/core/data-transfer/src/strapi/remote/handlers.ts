// eslint-disable-next-line node/no-extraneous-import
import type { Context } from 'koa';
import type { ServerOptions } from 'ws';

import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';

import type { IPushController } from './controllers/push';

import createPushController from './controllers/push';
import type { client, server } from '../../../types/remote/protocol';

interface ITransferState {
  transfer?: { id: string; kind: client.TransferKind };
  controller?: IPushController;
}

export const createTransferHandler =
  (options: ServerOptions = {}) =>
  async (ctx: Context) => {
    const upgradeHeader = (ctx.request.headers.upgrade || '')
      .split(',')
      .map((s) => s.trim().toLowerCase());

    // Create the websocket server
    const wss = new WebSocket.Server({ ...options, noServer: true });

    if (upgradeHeader.includes('websocket')) {
      wss.handleUpgrade(ctx.req, ctx.request.socket, Buffer.alloc(0), (ws) => {
        // Create a connection between the client & the server
        wss.emit('connection', ws, ctx.req);

        const state: ITransferState = {};
        let uuid: string | undefined;

        /**
         * Format error & message to follow the remote transfer protocol
         */
        const callback = <T = unknown>(e: Error | null = null, data?: T) => {
          return new Promise<void>((resolve, reject) => {
            if (!uuid) {
              reject(new Error('Missing uuid for this message'));
              return;
            }

            const payload = JSON.stringify({
              uuid,
              data: data ?? null,
              error: e
                ? {
                    code: 'ERR',
                    message: e?.message,
                  }
                : null,
            });

            ws.send(payload, (error) => (error ? reject(error) : resolve()));
          });
        };

        /**
         * Wrap a function call to catch errors and answer the request with the correct format
         */
        const answer = async <T = unknown>(fn: () => T) => {
          try {
            const response = await fn();
            callback(null, response);
          } catch (e) {
            if (e instanceof Error) {
              callback(e);
            } else if (typeof e === 'string') {
              callback(new Error(e));
            } else {
              callback(new Error('Unexpected error'));
            }
          }
        };

        const teardown = (): server.Payload<server.EndMessage> => {
          delete state.controller;
          delete state.transfer;

          return { ok: true };
        };

        const init = (msg: client.InitCommand): server.Payload<server.InitMessage> => {
          if (state.controller) {
            throw new Error('Transfer already in progres');
          }

          const { transfer } = msg.params;

          // Push transfer
          if (transfer === 'push') {
            const { options: controllerOptions } = msg.params;

            state.controller = createPushController({
              ...controllerOptions,
              autoDestroy: false,
              getStrapi: () => strapi,
            });
          }

          // Pull or any other string
          else {
            throw new Error(`Transfer not implemented: "${transfer}"`);
          }

          state.transfer = { id: randomUUID(), kind: transfer };

          return { transferID: state.transfer.id };
        };

        /**
         * On command message (init, end, status, ...)
         */
        const onCommand = async (msg: client.CommandMessage) => {
          const { command } = msg;

          if (command === 'init') {
            await answer(() => init(msg));
          }

          if (command === 'end') {
            await answer(teardown);
          }

          if (command === 'status') {
            await callback(new Error('Command not implemented: "status"'));
          }
        };

        const onTransferCommand = async (msg: client.TransferMessage) => {
          const { transferID, kind } = msg;
          const { controller } = state;

          // TODO: (re)move this check
          // It shouldn't be possible to strart a pull transfer for now, so reaching
          // this code should be impossible too, but this has been added by security
          if (state.transfer?.kind === 'pull') {
            return callback(new Error('Pull transfer not implemented'));
          }

          if (!controller) {
            return callback(new Error("The transfer hasn't been initialized"));
          }

          if (!transferID) {
            return callback(new Error('Missing transfer ID'));
          }

          // Action
          if (kind === 'action') {
            const { action } = msg;

            if (!(action in controller.actions)) {
              return callback(new Error(`Invalid action provided: "${action}"`));
            }

            await answer(() => controller.actions[action as keyof typeof controller.actions]());
          }

          // Transfer
          else if (kind === 'step') {
            // We can only have push transfer message for the moment
            const message = msg as client.TransferPushMessage;

            // TODO: lock transfer process
            if (message.action === 'start') {
              // console.log('Starting transfer for ', message.step);
            }

            // Stream step
            else if (message.action === 'stream') {
              await answer(() => controller.transfer[message.step]?.(message.data as never));
            }

            // TODO: unlock transfer process
            else if (message.action === 'end') {
              // console.log('Ending transfer for ', message.step);
            }
          }
        };

        ws.on('close', () => {
          teardown();
        });

        ws.on('error', (e) => {
          teardown();
          console.error(e);
        });

        ws.on('message', async (raw) => {
          const msg: client.Message = JSON.parse(raw.toString());

          if (!msg.uuid) {
            throw new Error('Missing uuid in message');
          }

          uuid = msg.uuid;

          // Regular command message (init, end, status)
          if (msg.type === 'command') {
            await onCommand(msg);
          }

          // Transfer message (the transfer must be initialized first)
          else if (msg.type === 'transfer') {
            await onTransferCommand(msg);
          }

          // Invalid messages
          else {
            await callback(new Error('Bad request'));
          }
        });
      });

      ctx.respond = false;
    }
  };
