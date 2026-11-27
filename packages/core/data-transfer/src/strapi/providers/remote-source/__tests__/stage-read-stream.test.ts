import { EventEmitter } from 'node:events';
import type { Core } from '@strapi/types';
import type { WebSocket } from 'ws';

import { createRemoteStrapiSourceProvider } from '..';
import { createDispatcher } from '../../utils';

const PROCESS_ID = 'flush-process-id';
const ENTITY = { type: 'api::article.article', id: 1, data: { title: 'First' } };

/**
 * A pull server whose stage stream is ready at once: it answers the `start` step and sends its
 * first batch in the same socket read.
 */
class PullServer extends EventEmitter {
  acks: string[] = [];

  send = jest.fn((raw: string, callback?: (error?: Error) => void) => {
    callback?.();
    const message = JSON.parse(raw);

    if (message.type !== 'transfer') {
      this.acks.push(message.uuid);
      return;
    }

    setImmediate(() => {
      this.emitFrame({ uuid: message.uuid, data: { ok: true, id: PROCESS_ID }, error: null });

      if (message.action === 'start') {
        this.sendStageMessage('batch', { data: [ENTITY] });
      }
    });
  });

  sendStageMessage(uuid: string, message: { data?: unknown; ended?: boolean }) {
    this.emitFrame({
      uuid,
      data: { type: 'transfer', id: PROCESS_ID, ended: false, error: null, data: null, ...message },
    });
  }

  emitFrame(frame: unknown) {
    this.emit('message', Buffer.from(JSON.stringify(frame)));
  }
}

describe('Remote Strapi source provider — stage read stream', () => {
  test('keeps a batch that arrives in the same socket read as the start response', async () => {
    const server = new PullServer();
    const ws = server as unknown as WebSocket;
    const provider = createRemoteStrapiSourceProvider({
      url: new URL('http://localhost:1337/admin'),
      getStrapi: () => ({}) as Core.Strapi,
    });
    provider.ws = ws;
    provider.dispatcher = createDispatcher(ws);
    provider.dispatcher.setTransferProperties({ id: 'transfer-id', kind: 'pull' });

    const stream = await provider.createEntitiesReadStream();
    await new Promise(setImmediate);

    // The server sends nothing else until the client acknowledges the batch
    expect(server.acks).toEqual(['batch']);

    server.sendStageMessage('end', { ended: true });

    await expect(stream.toArray()).resolves.toEqual([ENTITY]);
  });
});
