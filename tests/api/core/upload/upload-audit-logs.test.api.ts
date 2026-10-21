import fs from 'fs';
import path from 'path';

import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Media library in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;
  let initialSettings: unknown;

  const actingAdmin = {
    email: 'media-audit-actor@test.com',
    firstname: 'Media',
    lastname: 'Actor',
    password: 'Password123',
  };

  const settings = {
    sizeOptimization: true,
    responsiveDimensions: true,
    autoOrientation: false,
    aiMetadata: true,
  };

  const expectedActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'Media Actor' },
  });

  const getSettingsStore = () => strapi.store({ type: 'plugin', name: 'upload', key: 'settings' });

  const findLogs = async (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  // Move rows are written after the response. The row and its user link are written in two
  // steps, so wait for both.
  const waitForLogs = async (action: string, count: number) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const logs = await findLogs(action);
      if (logs.length >= count && logs.every((log) => log.user)) {
        return logs;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    }
    return findLogs(action);
  };

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  const createFolder = async (name: string, parent: number | null = null) => {
    const res = await rq({ method: 'POST', url: '/upload/folders', body: { name, parent } });
    expect(res.statusCode).toBe(201);
    return res.body.data as { id: number; name: string };
  };

  const createFile = async (folder: number | null = null) => {
    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: fs.createReadStream(path.join(__dirname, 'utils/rec.jpg')),
        fileInfo: JSON.stringify({ folder }),
      },
    });
    expect(res.statusCode).toBe(201);
    return res.body[0] as { id: number; name: string };
  };

  const bulkMove = (body: Record<string, unknown>) =>
    rq({ method: 'POST', url: '/upload/actions/bulk-move', body });

  const moveRow = (
    resource: { type: string; id: number; name: string },
    from: { id: number; name: string } | null,
    to: { id: number; name: string } | null
  ) => ({
    action: 'media.move',
    date: expect.any(String),
    actor: expectedActor(),
    origin: 'admin-panel',
    resource,
    details: { from, to },
  });

  const putSettings = async (body: Record<string, unknown>) => {
    const res = await rq({ url: '/upload/settings', method: 'PUT', body });
    expect(res.statusCode).toBe(200);
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();

    // Requests run as an admin of our own: with only the default super admin in the
    // database, asserting the actor would prove nothing.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;

    initialSettings = await getSettingsStore().get({});

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });
  });

  afterAll(async () => {
    await getSettingsStore().set({ value: initialSettings });
    await clearAuditLogs();
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
  });

  beforeEach(async () => {
    await getSettingsStore().set({ value: settings });
    await clearAuditLogs();
  });

  describe('upload-settings.update', () => {
    test('records the changed options', async () => {
      await putSettings({ ...settings, sizeOptimization: false, autoOrientation: true });

      const logs = await findLogs('upload-settings.update');
      expect(logs).toHaveLength(1);
      expect(logs[0].user.id).toBe(actingAdminId);
      expect(logs[0].payload).toEqual({
        action: 'upload-settings.update',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'upload-settings' },
        details: {
          changes: {
            sizeOptimization: { before: true, after: false },
            autoOrientation: { before: false, after: true },
          },
        },
      });
      expect(JSON.stringify(logs[0].payload)).not.toContain(actingAdmin.password);
    });

    test('writes no row when nothing changed', async () => {
      await putSettings(settings);

      expect(await findLogs('upload-settings.update')).toHaveLength(0);
    });

    test('writes no row for an invalid value', async () => {
      const res = await rq({
        url: '/upload/settings',
        method: 'PUT',
        body: { sizeOptimization: 'not-a-boolean', responsiveDimensions: true },
      });
      expect(res.statusCode).toBe(400);

      expect(await findLogs('upload-settings.update')).toHaveLength(0);
    });
  });

  describe('media.move', () => {
    const createdFolderIds: number[] = [];
    const createdFileIds: number[] = [];

    const folder = async (name: string, parent: number | null = null) => {
      const created = await createFolder(name, parent);
      createdFolderIds.push(created.id);
      return created;
    };

    const file = async (parent: number | null = null) => {
      const created = await createFile(parent);
      createdFileIds.push(created.id);
      return created;
    };

    const ref = (item: { id: number; name: string }) => ({ id: item.id, name: item.name });

    afterAll(async () => {
      await rq({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: { fileIds: createdFileIds, folderIds: createdFolderIds },
      });
    });

    test('writes one row per moved file and folder', async () => {
      const source = await folder('audit-move-source');
      const destination = await folder('audit-move-destination');
      const movedFolder = await folder('audit-move-folder', source.id);
      const fileInSource = await file(source.id);
      const fileAtRoot = await file(null);
      await clearAuditLogs();

      const res = await bulkMove({
        destinationFolderId: destination.id,
        fileIds: [fileInSource.id, fileAtRoot.id],
        folderIds: [movedFolder.id],
      });
      expect(res.statusCode).toBe(200);

      const logs = await waitForLogs('media.move', 3);
      expect(logs.map((log) => log.payload)).toEqual(
        expect.arrayContaining([
          moveRow(
            { type: 'media', id: fileInSource.id, name: fileInSource.name },
            ref(source),
            ref(destination)
          ),
          moveRow(
            { type: 'media', id: fileAtRoot.id, name: fileAtRoot.name },
            null,
            ref(destination)
          ),
          moveRow(
            { type: 'media-folder', id: movedFolder.id, name: movedFolder.name },
            ref(source),
            ref(destination)
          ),
        ])
      );
      expect(logs).toHaveLength(3);
      logs.forEach((log) => expect(log.user.id).toBe(actingAdminId));
    });

    test('records a move to the root as null', async () => {
      const source = await folder('audit-move-to-root');
      const movedFile = await file(source.id);
      await clearAuditLogs();

      const res = await bulkMove({
        destinationFolderId: null,
        fileIds: [movedFile.id],
        folderIds: [],
      });
      expect(res.statusCode).toBe(200);

      const logs = await waitForLogs('media.move', 1);
      expect(logs.map((log) => log.payload)).toEqual([
        moveRow({ type: 'media', id: movedFile.id, name: movedFile.name }, ref(source), null),
      ]);
    });

    test('records ids sent as strings as numbers', async () => {
      const destination = await folder('audit-move-string-ids');
      const movedFile = await file(null);
      await clearAuditLogs();

      const res = await bulkMove({
        destinationFolderId: String(destination.id),
        fileIds: [String(movedFile.id)],
        folderIds: [],
      });
      expect(res.statusCode).toBe(200);

      const logs = await waitForLogs('media.move', 1);
      expect(logs.map((log) => log.payload)).toEqual([
        moveRow({ type: 'media', id: movedFile.id, name: movedFile.name }, null, ref(destination)),
      ]);
    });

    test('writes no row for the contents of a moved folder or an item already in the destination', async () => {
      const destination = await folder('audit-move-contents-destination');
      const movedFolder = await folder('audit-move-contents');
      await folder('audit-move-contents-child', movedFolder.id);
      await file(movedFolder.id);
      const alreadyThere = await file(destination.id);
      await clearAuditLogs();

      const res = await bulkMove({
        destinationFolderId: destination.id,
        fileIds: [alreadyThere.id],
        folderIds: [movedFolder.id],
      });
      expect(res.statusCode).toBe(200);

      const logs = await waitForLogs('media.move', 1);
      expect(logs.map((log) => log.payload)).toEqual([
        moveRow(
          { type: 'media-folder', id: movedFolder.id, name: movedFolder.name },
          null,
          ref(destination)
        ),
      ]);
    });

    test('records a folder moved together with its parent folder', async () => {
      const destination = await folder('audit-move-with-parent-destination');
      const parent = await folder('audit-move-with-parent');
      const child = await folder('audit-move-with-parent-child', parent.id);
      await clearAuditLogs();

      const res = await bulkMove({
        destinationFolderId: destination.id,
        fileIds: [],
        folderIds: [parent.id, child.id],
      });
      expect(res.statusCode).toBe(200);

      const logs = await waitForLogs('media.move', 2);
      expect(logs.map((log) => log.payload)).toEqual([
        moveRow({ type: 'media-folder', id: parent.id, name: parent.name }, null, ref(destination)),
        moveRow(
          { type: 'media-folder', id: child.id, name: child.name },
          ref(parent),
          ref(destination)
        ),
      ]);
    });

    test('writes no row when the destination does not exist', async () => {
      const movedFile = await file(null);
      await clearAuditLogs();

      const res = await bulkMove({ destinationFolderId: 999999, fileIds: [movedFile.id] });
      expect(res.statusCode).toBe(400);

      expect(await findLogs('media.move')).toHaveLength(0);
    });
  });
});
