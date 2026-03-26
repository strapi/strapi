import { EventEmitter } from 'events';

import { createDispatcher } from '../utils';

describe('createDispatcher reconnect loop', () => {
  test('after connection loss, reconnects until success then completes dispatch', async () => {
    const wsFail = new EventEmitter();
    (wsFail as { send: typeof jest.fn }).send = jest.fn(
      (_payload: string, cb?: (err?: Error) => void) => {
        cb?.();
        setImmediate(() => wsFail.emit('close'));
      }
    );

    const wsOk = new EventEmitter();
    (wsOk as { send: typeof jest.fn }).send = jest.fn(
      (payload: string, cb?: (err?: Error) => void) => {
        cb?.();
        const { uuid } = JSON.parse(payload) as { uuid: string };
        setImmediate(() =>
          wsOk.emit('message', Buffer.from(JSON.stringify({ uuid, data: null, error: null })))
        );
      }
    );

    let currentWs: EventEmitter = wsFail;
    const reconnect = jest.fn(async () => {
      currentWs = wsOk;
    });

    const dispatcher = createDispatcher(
      () => currentWs as any,
      { retryMessageMaxRetries: 5, retryMessageTimeout: 10_000 },
      undefined,
      {
        reconnect,
        isEnabled: () => true,
        reconnectBackoffMs: () => 0,
      }
    );

    await expect(dispatcher.dispatchCommand({ command: 'status' })).resolves.toBeNull();
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  test('retries reconnect when reconnect() throws until it succeeds', async () => {
    const wsFail = new EventEmitter();
    (wsFail as { send: typeof jest.fn }).send = jest.fn(
      (_payload: string, cb?: (err?: Error) => void) => {
        cb?.();
        setImmediate(() => wsFail.emit('close'));
      }
    );

    const wsOk = new EventEmitter();
    (wsOk as { send: typeof jest.fn }).send = jest.fn(
      (payload: string, cb?: (err?: Error) => void) => {
        cb?.();
        const { uuid } = JSON.parse(payload) as { uuid: string };
        setImmediate(() =>
          wsOk.emit('message', Buffer.from(JSON.stringify({ uuid, data: null, error: null })))
        );
      }
    );

    let currentWs: EventEmitter = wsFail;
    let reconnectCalls = 0;
    const reconnect = jest.fn(async () => {
      reconnectCalls += 1;
      if (reconnectCalls < 2) {
        throw new Error('network down');
      }
      currentWs = wsOk;
    });

    const dispatcher = createDispatcher(
      () => currentWs as any,
      { retryMessageMaxRetries: 5, retryMessageTimeout: 10_000 },
      undefined,
      {
        reconnect,
        isEnabled: () => true,
        reconnectBackoffMs: () => 0,
      }
    );

    await expect(dispatcher.dispatchCommand({ command: 'status' })).resolves.toBeNull();
    expect(reconnect).toHaveBeenCalledTimes(2);
  });
});
