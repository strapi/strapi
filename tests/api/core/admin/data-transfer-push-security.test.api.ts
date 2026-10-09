import { randomUUID } from 'node:crypto';

import { WebSocket } from 'ws';
import { createStrapiInstance } from 'api-tests/strapi';

const RESPONSE_TIMEOUT_MS = 5_000;

type TransferResponse = {
  uuid?: string;
  data?: unknown;
  error?: { message?: string } | null;
};

const waitForResponse = (
  ws: WebSocket,
  uuid: string,
  description: string
): Promise<TransferResponse> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${description} transfer response ${uuid}`));
    }, RESPONSE_TIMEOUT_MS);

    const onMessage = (raw: WebSocket.RawData) => {
      const response = JSON.parse(raw.toString()) as TransferResponse;

      if (response.uuid !== uuid) {
        ws.once('message', onMessage);
        return;
      }

      clearTimeout(timeout);
      if (response.error) {
        reject(new Error(response.error.message ?? 'Transfer rejected'));
        return;
      }

      resolve(response);
    };

    ws.once('message', onMessage);
  });

const dispatch = async (ws: WebSocket, message: Record<string, unknown>) => {
  const uuid = randomUUID();
  const response = waitForResponse(
    ws,
    uuid,
    `${String(message.type)}:${String(message.command ?? message.action)}`
  );

  ws.send(JSON.stringify({ ...message, uuid }));

  return response;
};

const closeSocket = async (ws: WebSocket) => {
  if (ws.readyState === WebSocket.CLOSED) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, RESPONSE_TIMEOUT_MS);
    ws.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });
    ws.close();
  });
};

describe('Data transfer push security (api)', () => {
  let strapi: Awaited<ReturnType<typeof createStrapiInstance>>;

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      logLevel: 'error',
      register({ strapi: instance }) {
        instance.config.set('admin.serveAdminPanel', false);
      },
    });
  });

  afterAll(async () => {
    await strapi?.destroy();
  });

  test('rejects a protected admin entity streamed by a push-authorized WebSocket client', async () => {
    const suffix = randomUUID();
    const token = await strapi.service('admin::transfer').token.create({
      name: `cms-1198-push-${suffix}`,
      description: 'CMS-1198 isolated reproduction token',
      permissions: ['push'],
    });
    const address = strapi.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : address;
    let ws: WebSocket | undefined;

    try {
      const protectedRole = await strapi.db.query('admin::role').create({
        data: { name: `CMS 1198 ${suffix}`, code: `cms-1198-${suffix}`, description: '' },
      });
      ws = new WebSocket(`ws://127.0.0.1:${port}/admin/transfer/runner/push`, {
        headers: { Authorization: `Bearer ${token.accessKey}` },
      });
      const socket = ws;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timed out opening transfer socket')),
          RESPONSE_TIMEOUT_MS
        );
        socket.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket.once('error', reject);
      });

      const init = await dispatch(socket, {
        type: 'command',
        command: 'init',
        params: {
          transfer: 'push',
          options: {
            strategy: 'restore',
            restore: {
              assets: false,
              configuration: { coreStore: false, webhook: false },
              entities: { include: ['admin::role'] },
            },
          },
        },
      });
      const transferID = (init.data as { transferID: string }).transferID;
      await dispatch(socket, {
        type: 'transfer',
        transferID,
        kind: 'action',
        action: 'bootstrap',
      });
      await dispatch(socket, {
        type: 'transfer',
        transferID,
        kind: 'action',
        action: 'beforeTransfer',
      });

      await dispatch(socket, {
        type: 'transfer',
        transferID,
        kind: 'step',
        action: 'start',
        step: 'entities',
      });

      const ordinaryEntityPath = `/cms-1198-${suffix}`;
      await dispatch(socket, {
        type: 'transfer',
        transferID,
        kind: 'step',
        action: 'stream',
        step: 'entities',
        data: [
          {
            type: 'plugin::upload.folder',
            id: 1197,
            data: {
              name: `cms-1198-${suffix}`,
              path: ordinaryEntityPath,
            },
          },
        ],
      });

      await expect(
        dispatch(socket, {
          type: 'transfer',
          transferID,
          kind: 'step',
          action: 'stream',
          step: 'entities',
          data: [
            {
              type: 'admin::user',
              id: 1198,
              data: {
                email: `cms-1198-${suffix}@example.test`,
                firstname: 'CMS',
                lastname: '1198',
              },
            },
          ],
        })
      ).rejects.toThrow(/admin/i);

      await expect(
        strapi.db.query('admin::role').findOne({ where: { id: protectedRole.id } })
      ).resolves.toMatchObject({
        id: protectedRole.id,
      });

      await expect(
        strapi.db.query('plugin::upload.folder').findOne({ where: { path: ordinaryEntityPath } })
      ).resolves.toBeNull();

      const lifecycle = jest.fn();
      const unsubscribe = strapi.db.lifecycles.subscribe({ afterCreate: lifecycle });
      try {
        await strapi.db.query('plugin::upload.folder').create({
          data: { name: `local-${suffix}`, path: `/local-${suffix}` },
        });
        expect(lifecycle).toHaveBeenCalled();
      } finally {
        unsubscribe();
      }

      await expect(
        dispatch(socket, {
          type: 'command',
          command: 'end',
          params: { transferID },
        })
      ).rejects.toThrow(/terminated/i);
    } finally {
      if (ws) {
        await closeSocket(ws);
      }
      await strapi.service('admin::transfer').token.revoke(token.id);
    }
  });

  test('rejects a protected endpoint in a streamed link before mapping', async () => {
    const suffix = randomUUID();
    const token = await strapi.service('admin::transfer').token.create({
      name: `cms-1198-link-${suffix}`,
      description: 'CMS-1198 protected link regression token',
      permissions: ['push'],
    });
    const address = strapi.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : address;
    const ws = new WebSocket(`ws://127.0.0.1:${port}/admin/transfer/runner/push`, {
      headers: { Authorization: `Bearer ${token.accessKey}` },
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timed out opening transfer socket')),
          RESPONSE_TIMEOUT_MS
        );
        ws.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        ws.once('error', reject);
      });
      const init = await dispatch(ws, {
        type: 'command',
        command: 'init',
        params: {
          transfer: 'push',
          options: {
            strategy: 'restore',
            restore: {
              assets: false,
              configuration: { coreStore: false, webhook: false },
              entities: { include: [] },
            },
          },
        },
      });
      const transferID = (init.data as { transferID: string }).transferID;
      await dispatch(ws, {
        type: 'transfer',
        transferID,
        kind: 'action',
        action: 'bootstrap',
      });
      await dispatch(ws, {
        type: 'transfer',
        transferID,
        kind: 'action',
        action: 'beforeTransfer',
      });
      await dispatch(ws, {
        type: 'transfer',
        transferID,
        kind: 'step',
        action: 'start',
        step: 'entities',
      });
      await dispatch(ws, {
        type: 'transfer',
        transferID,
        kind: 'step',
        action: 'end',
        step: 'entities',
      });
      await dispatch(ws, {
        type: 'transfer',
        transferID,
        kind: 'step',
        action: 'start',
        step: 'links',
      });

      await expect(
        dispatch(ws, {
          type: 'transfer',
          transferID,
          kind: 'step',
          action: 'stream',
          step: 'links',
          data: [
            {
              kind: 'relation.basic',
              relation: 'oneToOne',
              left: { type: 'plugin::upload.folder', ref: 1197, field: 'parent' },
              right: { type: 'admin::role', ref: 1 },
            },
          ],
        })
      ).rejects.toThrow(/admin/i);
    } finally {
      await closeSocket(ws);
      await strapi.service('admin::transfer').token.revoke(token.id);
    }
  });

  test('rejects a raw protected owner join-column before writing an allowed entity', async () => {
    const suffix = randomUUID();
    const role = await strapi.db.query('admin::role').create({
      data: { name: `CMS 1198 owner ${suffix}`, code: `cms-1198-owner-${suffix}`, description: '' },
    });
    const creator = await strapi.db.query('admin::user').create({
      data: {
        email: `cms-1198-owner-${suffix}@example.test`,
        firstname: 'CMS',
        lastname: 'Owner',
        password: 'password',
        roles: [role.id],
        isActive: true,
      },
    });
    const token = await strapi.service('admin::transfer').token.create({
      name: `cms-1198-owner-${suffix}`,
      description: 'CMS-1198 raw owner relation regression token',
      permissions: ['push'],
    });
    const folderModel = strapi.db.metadata.get('plugin::upload.folder') as {
      attributes: Record<string, { target?: string; joinColumn?: { name?: string } }>;
    };
    const createdByColumn = folderModel.attributes.createdBy?.joinColumn?.name;
    expect(folderModel.attributes.createdBy?.target).toBe('admin::user');
    expect(createdByColumn).toEqual(expect.any(String));

    const address = strapi.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : address;
    const ws = new WebSocket(`ws://127.0.0.1:${port}/admin/transfer/runner/push`, {
      headers: { Authorization: `Bearer ${token.accessKey}` },
    });
    const path = `/cms-1198-owner-${suffix}`;

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timed out opening transfer socket')),
          RESPONSE_TIMEOUT_MS
        );
        ws.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        ws.once('error', reject);
      });
      const init = await dispatch(ws, {
        type: 'command',
        command: 'init',
        params: {
          transfer: 'push',
          options: {
            strategy: 'restore',
            restore: {
              assets: false,
              configuration: { coreStore: false, webhook: false },
              entities: { include: [] },
            },
          },
        },
      });
      const transferID = (init.data as { transferID: string }).transferID;
      for (const action of ['bootstrap', 'beforeTransfer'] as const) {
        await dispatch(ws, { type: 'transfer', transferID, kind: 'action', action });
      }
      await dispatch(ws, {
        type: 'transfer',
        transferID,
        kind: 'step',
        action: 'start',
        step: 'entities',
      });

      await expect(
        dispatch(ws, {
          type: 'transfer',
          transferID,
          kind: 'step',
          action: 'stream',
          step: 'entities',
          data: [
            {
              type: 'plugin::upload.folder',
              id: 1199,
              data: {
                name: `cms-1198-owner-${suffix}`,
                path,
                [createdByColumn as string]: creator.id,
              },
            },
          ],
        })
      ).rejects.toThrow(/admin::user/i);

      await expect(
        strapi.db.query('plugin::upload.folder').findOne({ where: { path } })
      ).resolves.toBeNull();
      await expect(
        strapi.db.query('admin::user').findOne({ where: { id: creator.id } })
      ).resolves.toMatchObject({ id: creator.id });
    } finally {
      await closeSocket(ws);
      await strapi.service('admin::transfer').token.revoke(token.id);
    }
  });
});
