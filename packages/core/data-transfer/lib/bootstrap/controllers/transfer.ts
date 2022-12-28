import type { Context } from 'koa';
import type { ServerOptions } from 'ws';

import { v4 } from 'uuid';
import { WebSocket } from 'ws';

import type { IPushController } from './push';

import { InitMessage, Message, TransferKind } from '../../../types';
import createPushController from './push';

interface ITransferState {
  kind?: TransferKind;
  transferID?: string;
  controller?: IPushController;
}

const createTransferController =
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

        const callback = <T = unknown>(e: Error | null = null, data?: T) => {
          return new Promise<void>((resolve, reject) => {
            if (!uuid) {
              reject(new Error('Missing uuid for this message'));
              return;
            }

            const payload = JSON.stringify({
              uuid,
              data: data ?? {},
              error: e?.message || 'Unknown error',
            });

            ws.send(payload, (error) => (error ? reject(error) : resolve()));
          });
        };

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

        const teardown = () => {
          delete state.kind;
          delete state.controller;
          delete state.transferID;

          return { ok: true };
        };

        const init = (msg: InitMessage) => {
          const { kind, options: controllerOptions } = msg;

          if (state.controller) {
            throw new Error('Transfer already in progres');
          }

          if (kind === 'push') {
            state.controller = createPushController({
              ...controllerOptions,
              autoDestroy: false,
              getStrapi() {
                return strapi;
              },
            });
          }

          // Pull or others
          else {
            throw new Error(`${kind} transfer not implemented`);
          }

          state.transferID = v4();

          return { transferID: state.transferID };
        };

        ws.on('close', () => {
          teardown();
        });

        ws.on('error', (e) => {
          teardown();
          console.error(e);
        });

        ws.on('message', async (raw) => {
          const msg: Message = JSON.parse(raw.toString());

          if (!msg.uuid) {
            throw new Error('Missing uuid in message');
          }

          uuid = msg.uuid;

          if (msg.type === 'init') {
            await answer(() => init(msg));
          }

          if (msg.type === 'teardown') {
            await answer(teardown);
          }

          if (msg.type === 'action') {
            await answer(() => state.controller?.actions[msg.action]?.());
          }

          if (msg.type === 'transfer') {
            await answer(() => {
              const { stage, data } = msg;

              return state.controller?.transfer[stage](data as never);
            });
          }
        });
      });

      ctx.respond = false;
    }
  };

export default createTransferController;
