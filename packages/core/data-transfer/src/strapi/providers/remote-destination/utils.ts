import { v4 } from 'uuid';
import { RawData, WebSocket } from 'ws';

import type { client, server } from '../../../../types/remote/protocol';
import { ProviderError } from '../../../errors/providers';

interface IDispatcherState {
  transfer?: { kind: client.TransferKind; id: string };
}

interface IDispatchOptions {
  attachTransfer?: boolean;
}

type Dispatch<T> = Omit<T, 'transferID' | 'uuid'>;

const createDispatcher = (ws: WebSocket) => {
  const state: IDispatcherState = {};

  type DispatchMessage = Dispatch<client.Message>;

  const dispatch = async <U = null>(
    message: DispatchMessage,
    options: IDispatchOptions = {}
  ): Promise<U | null> => {
    if (!ws) {
      throw new Error('No websocket connection found');
    }

    return new Promise<U | null>((resolve, reject) => {
      const uuid = v4();
      const payload = { ...message, uuid };

      if (options.attachTransfer) {
        Object.assign(payload, { transferID: state.transfer?.id });
      }

      const stringifiedPayload = JSON.stringify(payload);

      ws.send(stringifiedPayload, (error) => {
        if (error) {
          reject(error);
        }
      });

      const onResponse = (raw: RawData) => {
        const response: server.Message<U> = JSON.parse(raw.toString());
        if (response.uuid === uuid) {
          if (response.error) {
            return reject(new ProviderError('error', response.error.message));
          }

          resolve(response.data ?? null);
        } else {
          ws.once('message', onResponse);
        }
      };

      ws.once('message', onResponse);
    });
  };

  const dispatchCommand = <U extends client.Command>(
    payload: {
      command: U;
    } & ([client.GetCommandParams<U>] extends [never]
      ? unknown
      : { params: client.GetCommandParams<U> })
  ) => {
    return dispatch({ type: 'command', ...payload } as client.CommandMessage);
  };

  const dispatchTransferAction = async <T>(action: client.Action['action']) => {
    const payload: Dispatch<client.Action> = { type: 'transfer', kind: 'action', action };

    return dispatch<T>(payload, { attachTransfer: true }) ?? Promise.resolve(null);
  };

  const dispatchTransferStep = async <
    T,
    A extends client.TransferPushMessage['action'] = client.TransferPushMessage['action'],
    S extends client.TransferPushStep = client.TransferPushStep
  >(
    payload: {
      step: S;
      action: A;
    } & (A extends 'stream' ? { data: client.GetTransferPushStreamData<S> } : unknown)
  ) => {
    const message: Dispatch<client.TransferPushMessage> = {
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

export { createDispatcher };
