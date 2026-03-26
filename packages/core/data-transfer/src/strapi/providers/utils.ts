import { randomUUID } from 'crypto';
import { RawData, WebSocket } from 'ws';

import type { Client, Server } from '../../../types/remote/protocol';

import {
  ProviderError,
  ProviderTransferError,
  ProviderInitializationError,
  ProviderValidationError,
  ProviderErrorDetails,
} from '../../errors/providers';
import { IDiagnosticReporter } from '../../utils/diagnostic';
import { replacerForTransferWebSocket } from '../../utils/transfer-websocket-json';

interface IDispatcherState {
  transfer?: { kind: Client.TransferKind; id: string };
}

interface IDispatchOptions {
  attachTransfer?: boolean;
}

type Dispatch<T> = Omit<T, 'transferID' | 'uuid'>;

export type WebSocketRef = WebSocket | (() => WebSocket);

export type DispatcherReconnectOptions = {
  /** Called after the socket is lost mid-request; should open a new socket and re-handshake (e.g. init + bootstrap). */
  reconnect: () => Promise<void>;
  isEnabled: () => boolean;
  /**
   * Delay (ms) before the next reconnect attempt after `reconnect()` throws (e.g. host still down).
   * Attempt is 0-based after the first failure.
   */
  reconnectBackoffMs?: (attempt: number) => number;
};

const CONNECTION_LOST_MESSAGE = 'WebSocket connection lost';

const isConnectionLossError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message === CONNECTION_LOST_MESSAGE;
};

const defaultReconnectBackoffMs = (attempt: number): number =>
  Math.min(60_000, 1000 * 2 ** Math.min(attempt, 6));

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const getWebSocketFromRef = (ref: WebSocketRef): WebSocket => {
  const ws = typeof ref === 'function' ? ref() : ref;
  if (!ws) {
    throw new Error('No websocket connection found');
  }
  return ws;
};

export const createDispatcher = (
  wsOrRef: WebSocketRef,
  retryMessageOptions = {
    retryMessageMaxRetries: 5,
    retryMessageTimeout: 30000,
  },
  reportInfo?: (message: string) => void,
  reconnectOptions?: DispatcherReconnectOptions
) => {
  const state: IDispatcherState = {};

  type DispatchMessage = Dispatch<Client.Message>;

  const dispatchOnce = async <U = null>(
    message: DispatchMessage,
    options: IDispatchOptions = {}
  ): Promise<U | null> => {
    const ws = getWebSocketFromRef(wsOrRef);

    return new Promise<U | null>((resolve, reject) => {
      const uuid = randomUUID();
      const payload = { ...message, uuid };
      let numberOfTimesMessageWasSent = 0;

      if (options.attachTransfer) {
        Object.assign(payload, { transferID: state.transfer?.id });
      }

      if (message.type === 'command') {
        reportInfo?.(
          `dispatching message command:${(message as Client.CommandMessage).command} uuid:${uuid} sent:${numberOfTimesMessageWasSent}`
        );
      } else if (message.type === 'transfer') {
        const messageToSend = message as Client.TransferMessage;
        reportInfo?.(
          `dispatching message action:${messageToSend.action} ${messageToSend.kind === 'step' ? `step:${messageToSend.step}` : ''} uuid:${uuid} sent:${numberOfTimesMessageWasSent}`
        );
      }
      const stringifiedPayload = JSON.stringify(payload, replacerForTransferWebSocket);

      const intervalHolder: { current: ReturnType<typeof setInterval> | undefined } = {
        current: undefined,
      };

      const cleanupListeners = () => {
        ws.removeListener('close', onClose);
        ws.removeListener('error', onError);
      };

      const clearRetryInterval = () => {
        if (intervalHolder.current) {
          clearInterval(intervalHolder.current);
          intervalHolder.current = undefined;
        }
      };

      const onClose = () => {
        cleanupListeners();
        clearRetryInterval();
        reject(new ProviderTransferError(CONNECTION_LOST_MESSAGE));
      };

      const onError = () => {
        cleanupListeners();
        clearRetryInterval();
        reject(new ProviderTransferError(CONNECTION_LOST_MESSAGE));
      };

      ws.once('close', onClose);
      ws.once('error', onError);

      const { retryMessageMaxRetries, retryMessageTimeout } = retryMessageOptions;
      const sendPeriodically = () => {
        const activeWs = getWebSocketFromRef(wsOrRef);
        if (numberOfTimesMessageWasSent <= retryMessageMaxRetries) {
          numberOfTimesMessageWasSent += 1;
          activeWs.send(stringifiedPayload, (error) => {
            if (error) {
              cleanupListeners();
              clearRetryInterval();
              reject(new ProviderTransferError(CONNECTION_LOST_MESSAGE));
            }
          });
        } else {
          cleanupListeners();
          clearRetryInterval();
          reject(new ProviderError('error', 'Request timed out'));
        }
      };
      intervalHolder.current = setInterval(sendPeriodically, retryMessageTimeout);

      ws.send(stringifiedPayload, (error) => {
        if (error) {
          cleanupListeners();
          clearRetryInterval();
          reject(new ProviderTransferError(CONNECTION_LOST_MESSAGE));
        }
      });

      const onResponse = (raw: RawData) => {
        const activeWs = getWebSocketFromRef(wsOrRef);
        const response: Server.Message<U> = JSON.parse(raw.toString());
        if (message.type === 'command') {
          reportInfo?.(
            `received response to message command: ${(message as Client.CommandMessage).command} uuid: ${uuid} sent: ${numberOfTimesMessageWasSent}`
          );
        } else if (message.type === 'transfer') {
          const messageToSend = message as Client.TransferMessage;
          reportInfo?.(
            `received response to message action:${messageToSend.action} ${messageToSend.kind === 'step' ? `step:${messageToSend.step}` : ''} uuid:${uuid} sent:${numberOfTimesMessageWasSent}`
          );
        }
        if (response.uuid === uuid) {
          clearRetryInterval();
          cleanupListeners();
          if (response.error) {
            const errMessage = response.error.message;
            const details = response.error.details?.details as ProviderErrorDetails;
            const step = response.error.details?.step;
            let err = new ProviderError('error', errMessage, details);
            if (step === 'transfer') {
              err = new ProviderTransferError(errMessage, details);
            } else if (step === 'validation') {
              err = new ProviderValidationError(errMessage, details);
            } else if (step === 'initialization') {
              err = new ProviderInitializationError(errMessage);
            }
            return reject(err);
          }
          resolve(response.data ?? null);
        } else {
          activeWs.once('message', onResponse);
        }
      };

      ws.once('message', onResponse);
    });
  };

  const dispatch = async <U = null>(
    message: DispatchMessage,
    options: IDispatchOptions = {}
  ): Promise<U | null> => {
    let reconnectFailureAttempt = 0;

    const reconnectUntilSuccess = async (opts: DispatcherReconnectOptions) => {
      let reconnectSucceeded = false;
      while (!reconnectSucceeded) {
        try {
          await opts.reconnect();
          reconnectFailureAttempt = 0;
          reconnectSucceeded = true;
        } catch (reconnectErr) {
          const backoff =
            opts.reconnectBackoffMs?.(reconnectFailureAttempt) ??
            defaultReconnectBackoffMs(reconnectFailureAttempt);
          reportInfo?.(
            `[Data transfer] Reconnect failed (${String(reconnectErr)}); next attempt in ${backoff}ms`
          );
          reconnectFailureAttempt += 1;
          await sleep(backoff);
        }
      }
    };

    const tryDispatchWithReconnect = async (): Promise<U | null> => {
      try {
        return await dispatchOnce<U>(message, options);
      } catch (e) {
        if (!reconnectOptions?.isEnabled() || !isConnectionLossError(e)) {
          throw e;
        }

        reportInfo?.('[Data transfer] Connection lost; attempting reconnect');
        await reconnectUntilSuccess(reconnectOptions);
        return tryDispatchWithReconnect();
      }
    };

    return tryDispatchWithReconnect();
  };

  const dispatchCommand = <U extends Client.Command>(
    payload: {
      command: U;
    } & ([Client.GetCommandParams<U>] extends [never]
      ? unknown
      : { params?: Client.GetCommandParams<U> })
  ) => {
    return dispatch({ type: 'command', ...payload } as Client.CommandMessage);
  };

  const dispatchTransferAction = async <T>(action: Client.Action['action']) => {
    const payload: Dispatch<Client.Action> = { type: 'transfer', kind: 'action', action };

    return dispatch<T>(payload, { attachTransfer: true }) ?? Promise.resolve(null);
  };

  const dispatchTransferStep = async <
    T,
    A extends Client.TransferPushMessage['action'] = Client.TransferPushMessage['action'],
    S extends Client.TransferPushStep = Client.TransferPushStep,
  >(
    payload: {
      step: S;
      action: A;
    } & (A extends 'stream' ? { data: Client.GetTransferPushStreamData<S> } : unknown)
  ) => {
    const message: Dispatch<Client.TransferPushMessage> = {
      type: 'transfer',
      kind: 'step',
      ...payload,
    };

    return dispatch<T>(message, { attachTransfer: true }) ?? Promise.resolve(null);
  };

  const setTransferProperties = (
    properties: Exclude<IDispatcherState['transfer'], undefined>
  ): void => {
    state.transfer = { ...properties };
  };

  return {
    get transferID() {
      return state.transfer?.id;
    },

    get transferKind() {
      return state.transfer?.kind;
    },

    setTransferProperties,

    dispatch,
    dispatchCommand,
    dispatchTransferAction,
    dispatchTransferStep,
  };
};

type WebsocketParams = ConstructorParameters<typeof WebSocket>;
type Address = WebsocketParams[0];
type Options = WebsocketParams[2];

/**
 * Receives diagnostics frames sent by the server on the same WebSocket as transfer messages.
 */
export const attachTransferDiagnosticsChannel = (
  ws: WebSocket,
  diagnostics?: IDiagnosticReporter
): void => {
  if (!diagnostics) {
    return;
  }

  ws.on('message', (raw: RawData) => {
    try {
      const response: Server.Message = JSON.parse(raw.toString());
      if (response.diagnostic) {
        diagnostics.report({
          ...response.diagnostic,
        });
      }
    } catch {
      // ignore non-JSON frames
    }
  });
};

export const connectToWebsocket = (
  address: Address,
  options?: Options,
  diagnostics?: IDiagnosticReporter
): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    const server = new WebSocket(address, options);
    server.once('open', () => {
      attachTransferDiagnosticsChannel(server, diagnostics);
      resolve(server);
    });

    server.on('unexpected-response', (_req, res) => {
      if (res.statusCode === 401) {
        return reject(
          new ProviderInitializationError(
            'Failed to initialize the connection: Authentication Error'
          )
        );
      }

      if (res.statusCode === 403) {
        return reject(
          new ProviderInitializationError(
            'Failed to initialize the connection: Authorization Error'
          )
        );
      }

      if (res.statusCode === 404) {
        return reject(
          new ProviderInitializationError(
            'Failed to initialize the connection: Data transfer is not enabled on the remote host'
          )
        );
      }

      return reject(
        new ProviderInitializationError(
          `Failed to initialize the connection: Unexpected server response ${res.statusCode}`
        )
      );
    });

    server.once('error', (err) => {
      reject(
        new ProviderTransferError(err.message, {
          details: {
            error: err.message,
          },
        })
      );
    });
  });
};

export const trimTrailingSlash = (input: string): string => {
  return input.replace(/\/$/, '');
};

export const wait = (ms: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const waitUntil = async (test: () => boolean, interval: number): Promise<void> => {
  while (!test()) {
    await wait(interval);
  }

  return Promise.resolve();
};
