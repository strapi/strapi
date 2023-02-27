import type { Context } from 'koa';
import type { ServerOptions } from 'ws';

import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';

import type { IPushController } from './controllers/push';
import type { TransferFlow, Step } from './flows';
import type { client, server } from '../../../types/remote/protocol';

import createPushController from './controllers/push';
import {
  ProviderTransferError,
  ProviderInitializationError,
  ProviderError,
} from '../../errors/providers';
import { TRANSFER_METHODS } from './constants';
import { createFlow, DEFAULT_TRANSFER_FLOW } from './flows';

type TransferMethod = (typeof TRANSFER_METHODS)[number];

interface ITransferState {
  transfer?: {
    id: string;
    kind: client.TransferKind;
    startedAt: number;
    flow: TransferFlow;
  };
  controller?: IPushController;
}

interface IHandlerOptions {
  verify: (ctx: Context, scope?: TransferMethod) => Promise<void>;
  server?: ServerOptions;
}

export const createTransferHandler = (options: IHandlerOptions) => {
  const { verify, server: serverOptions } = options;

  // Create the websocket server
  const wss = new WebSocket.Server({ ...serverOptions, noServer: true });

  return async (ctx: Context) => {
    const verifyAuth = (scope?: TransferMethod) => verify(ctx, scope);

    const upgradeHeader = (ctx.request.headers.upgrade || '')
      .split(',')
      .map((s) => s.trim().toLowerCase());

    if (upgradeHeader.includes('websocket')) {
      wss.handleUpgrade(ctx.req, ctx.request.socket, Buffer.alloc(0), (ws) => {
        // Create a connection between the client & the server
        wss.emit('connection', ws, ctx.req);

        const state: ITransferState = {};

        function assertValidTransfer(
          transferState: ITransferState
        ): asserts transferState is Required<ITransferState> {
          const { transfer, controller } = transferState;

          if (!controller || !transfer) {
            throw new ProviderTransferError('Invalid transfer process');
          }
        }

        /**
         * Format error & message to follow the remote transfer protocol
         */
        const sendResponse = <T = unknown>(e: Error | null = null, data?: T, uuid?: string) => {
          return new Promise<void>((resolve, reject) => {
            if (!uuid && !e) {
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
        const answer = async <T = unknown>(fn: () => T, uuid: string) => {
          try {
            const response = await fn();
            return await sendResponse(null, response, uuid);
          } catch (e) {
            if (e instanceof Error) {
              return sendResponse(e, undefined, uuid);
            }
            if (typeof e === 'string') {
              return sendResponse(new ProviderTransferError(e), undefined, uuid);
            }
            return sendResponse(
              new ProviderTransferError('Unexpected error', {
                error: e,
              }),
              undefined,
              uuid
            );
          }
        };

        const cleanup = () => {
          delete state.controller;
          delete state.transfer;
        };

        const teardown = async (): Promise<void> => {
          if (state.controller) {
            await state.controller.actions.rollback();
          }

          cleanup();
        };

        const end = async (msg: client.EndCommand): Promise<server.Payload<server.EndMessage>> => {
          await verifyAuth(state.transfer?.kind);

          if (msg.params.transferID !== state.transfer?.id) {
            throw new ProviderTransferError('Bad transfer ID provided');
          }

          cleanup();

          return { ok: true };
        };

        const init = async (
          msg: client.InitCommand
        ): Promise<server.Payload<server.InitMessage>> => {
          // TODO: For push transfer, we'll probably have to trigger a
          // maintenance mode to prevent other transfer at the same time.
          if (state.transfer || state.controller) {
            throw new ProviderInitializationError('Transfer already in progres');
          }

          const { transfer } = msg.params;

          await verifyAuth(transfer);

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
            throw new ProviderTransferError(`Transfer type not implemented: "${transfer}"`, {
              transfer,
              validTransfers: TRANSFER_METHODS,
            });
          }

          state.transfer = {
            id: randomUUID(),
            kind: transfer,
            startedAt: Date.now(),
            flow: createFlow(DEFAULT_TRANSFER_FLOW),
          };

          return { transferID: state.transfer.id };
        };

        const status = (): server.Payload<server.StatusMessage> => {
          if (state.transfer) {
            const { transfer } = state;
            const elapsed = Date.now() - transfer.startedAt;

            return {
              active: true,
              kind: transfer.kind,
              startedAt: transfer.startedAt,
              elapsed,
            };
          }

          return { active: false, kind: null, elapsed: null, startedAt: null };
        };

        /**
         * On command message (init, end, status, ...)
         */
        const onCommand = async (msg: client.CommandMessage): Promise<void> => {
          const { command, uuid } = msg;

          if (command === 'init') {
            return answer(() => init(msg), uuid);
          }

          if (command === 'end') {
            return answer(() => {
              assertValidTransfer(state);
              end(msg);
            }, uuid);
          }

          if (command === 'status') {
            return answer(status, uuid);
          }
        };

        const onTransferCommand = async (msg: client.TransferMessage): Promise<void> => {
          assertValidTransfer(state);

          const { transferID, kind, uuid } = msg;
          const { controller, transfer } = state;

          await verifyAuth(transfer.kind);

          // TODO: (re)move this check
          // It shouldn't be possible to start a pull transfer for now, so reaching
          // this code should be impossible too, but this has been added by security
          if (transfer.kind === 'pull') {
            return sendResponse(
              new ProviderTransferError('Pull transfer not implemented'),
              undefined,
              uuid
            );
          }

          if (!controller) {
            return sendResponse(
              new ProviderTransferError("The transfer hasn't been initialized"),
              undefined,
              uuid
            );
          }

          if (!transferID) {
            return sendResponse(new ProviderTransferError('Missing transfer ID'), undefined, uuid);
          }

          // Action
          if (kind === 'action') {
            const { action } = msg;

            if (!(action in controller.actions)) {
              return sendResponse(
                new ProviderTransferError(`Invalid action provided: "${action}"`, {
                  action,
                  validActions: Object.keys(controller.actions),
                }),
                undefined,
                uuid
              );
            }

            const step: Step = { kind: 'action', action };
            const isStepRegistered = transfer.flow.has(step);

            if (isStepRegistered) {
              if (transfer.flow.cannot(step)) {
                return sendResponse(
                  new ProviderTransferError(
                    `Invalid action "${action}" found for the current flow `,
                    {
                      action,
                    }
                  ),
                  undefined,
                  uuid
                );
              }

              transfer.flow.set(step);
            }

            return answer(
              () => controller.actions[action as keyof typeof controller.actions](),
              uuid
            );
          }

          // Transfer
          if (kind === 'step') {
            // We can only have push transfer message for the moment
            const message = msg as client.TransferPushMessage;

            const currentStep = transfer.flow.get();
            const step: Step = { kind: 'transfer', stage: message.step };

            // Lock the current transfer stage
            if (message.action === 'start') {
              if (currentStep?.kind === 'transfer' && currentStep.locked) {
                return sendResponse(
                  new ProviderTransferError(
                    `It's not possible to start a new transfer stage (${message.step}) while another one is in progress (${currentStep.stage})`
                  ),
                  undefined,
                  uuid
                );
              }

              if (transfer.flow.cannot(step)) {
                return sendResponse(
                  new ProviderTransferError(
                    `Invalid stage (${message.step}) provided for the current flow`,
                    { step }
                  ),
                  undefined,
                  uuid
                );
              }

              transfer?.flow.set({ ...step, locked: true });

              return sendResponse(null, { ok: true }, uuid);
            }

            // Stream operation on the current transfer stage
            if (message.action === 'stream') {
              if (currentStep?.kind === 'transfer' && !currentStep.locked) {
                return sendResponse(
                  new ProviderTransferError(
                    `You need to initialize the transfer stage (${message.step}) before starting to stream data`
                  )
                );
              }
              if (transfer?.flow.cannot(step)) {
                return sendResponse(
                  new ProviderTransferError(
                    `Invalid stage (${message.step}) provided for the current flow`,
                    { step }
                  )
                );
              }

              await answer(() => controller.transfer[message.step]?.(message.data as never), uuid);
            }

            // Unlock the current transfer stage
            if (message.action === 'end') {
              // Cannot unlock if not locked (aka: started)
              if (currentStep?.kind === 'transfer' && !currentStep.locked) {
                return sendResponse(
                  new ProviderTransferError(
                    `You need to initialize the transfer stage (${message.step}) before ending it`
                  ),
                  undefined,
                  uuid
                );
              }

              // Cannot unlock if invalid step provided
              if (transfer?.flow.cannot(step)) {
                return sendResponse(
                  new ProviderTransferError(
                    `Invalid stage (${message.step}) provided for the current flow`,
                    { step }
                  ),
                  undefined,
                  uuid
                );
              }

              transfer?.flow.set({ ...step, locked: false });

              return sendResponse(null, { ok: true }, uuid);
            }
          }
        };

        ws.on('close', async () => {
          await teardown();
        });

        ws.on('error', async (e) => {
          await teardown();
          strapi.log.error(e);
        });

        ws.on('message', async (raw) => {
          let msg: client.Message | undefined;
          try {
            msg = JSON.parse(raw.toString());
          } catch (e: unknown) {
            if (e instanceof Error) {
              return await sendResponse(e);
            }
            return await sendResponse(new ProviderTransferError('Unknown transfer parse error'));
          }

          try {
            if (!msg?.uuid) {
              return await sendResponse(new ProviderTransferError('Missing uuid in message'));
            }

            // Regular command message (init, end, status)
            if (msg.type === 'command') {
              return await onCommand(msg);
            }

            // Transfer message (the transfer must be initialized first)
            if (msg.type === 'transfer') {
              return await onTransferCommand(msg);
            }

            // Invalid messages
            return await sendResponse(new ProviderTransferError('Bad request'));
          } catch (e: unknown) {
            // Only known errors should be returned to client
            if (e instanceof ProviderError || e instanceof SyntaxError) {
              return await sendResponse(e);
            }
            // TODO: log error to server?

            // Unknown errors should not be sent to client
            return await sendResponse(new ProviderTransferError('Unknown transfer error'));
          }
        });
      });

      ctx.respond = false;
    }
  };
};
