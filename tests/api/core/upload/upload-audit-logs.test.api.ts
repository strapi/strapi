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
  describe('media and folder create, update and delete', () => {
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

    const rowsFor = async (action: string, type: string, id: number, count = 1) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const logs = (await findLogs(action)).filter(
          (log) => log.payload.resource?.type === type && log.payload.resource?.id === id
        );
        if (logs.length >= count && logs.every((log) => log.user)) {
          return logs;
        }
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
      }
      return [];
    };

    const updateFileInfo = (id: number, fileInfo: Record<string, unknown>) =>
      rq({
        method: 'POST',
        url: `/upload?id=${id}`,
        formData: { fileInfo: JSON.stringify(fileInfo) },
      });

    const row = (
      action: string,
      resource: Record<string, unknown>,
      details?: Record<string, unknown>
    ) => ({
      action,
      date: expect.any(String),
      actor: expectedActor(),
      origin: 'admin-panel',
      resource,
      ...(details && { details }),
    });

    afterAll(async () => {
      await rq({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: { fileIds: createdFileIds, folderIds: createdFolderIds },
      });
    });

    test('records an uploaded file and a created folder as media.create', async () => {
      const created = await file(null);
      const createdFolder = await folder('audit-create-folder');

      const [fileRow] = await rowsFor('media.create', 'media', created.id);
      expect(fileRow.user.id).toBe(actingAdminId);
      expect(fileRow.payload).toEqual(
        row(
          'media.create',
          { type: 'media', id: created.id, name: created.name },
          { mime: 'image/jpeg', size: expect.any(Number) }
        )
      );

      const [folderRow] = await rowsFor('media.create', 'media-folder', createdFolder.id);
      expect(folderRow.payload).toEqual(
        row('media.create', {
          type: 'media-folder',
          id: createdFolder.id,
          name: createdFolder.name,
        })
      );

      expect(await findLogs('media-folder.create')).toHaveLength(0);
      expect(JSON.stringify(fileRow.payload)).not.toMatch(/uploads|"hash"/);
    });

    test('records the changed fields of a file, including a move to another folder', async () => {
      const destination = await folder('audit-update-destination');
      const updated = await file(null);
      await clearAuditLogs();

      const res = await updateFileInfo(updated.id, {
        alternativeText: 'An alt text',
        folder: destination.id,
      });
      expect(res.statusCode).toBe(200);

      const [updateRow] = await rowsFor('media.update', 'media', updated.id);
      expect(updateRow.payload).toEqual(
        row(
          'media.update',
          { type: 'media', id: updated.id, name: updated.name },
          {
            changes: {
              alternativeText: { before: null, after: 'An alt text' },
              folder: { before: null, after: { id: destination.id, name: destination.name } },
            },
          }
        )
      );
      // The folder the file was in comes from the read made before the update
      const back = await updateFileInfo(updated.id, { folder: null });
      expect(back.statusCode).toBe(200);

      const rows = await rowsFor('media.update', 'media', updated.id, 2);
      expect(rows[1].payload.details).toEqual({
        changes: {
          folder: { before: { id: destination.id, name: destination.name }, after: null },
        },
      });
    });

    test('writes no media.update row when nothing changed', async () => {
      const unchanged = await file(null);
      await clearAuditLogs();

      const res = await updateFileInfo(unchanged.id, { name: unchanged.name });
      expect(res.statusCode).toBe(200);

      // A later row proves the earlier update was processed
      const marker = await folder('audit-update-marker');
      await rowsFor('media.create', 'media-folder', marker.id);
      expect(
        (await findLogs('media.update')).filter((log) => log.payload.resource.id === unchanged.id)
      ).toHaveLength(0);
    });

    test('leaves the media.update webhook event as it was', async () => {
      const destination = await folder('audit-webhook-destination');
      const updated = await file(null);
      const payloads: any[] = [];
      const listener = (payload: any) => {
        payloads.push(payload);
      };
      strapi.eventHub.on('media.update', listener);

      try {
        const res = await updateFileInfo(updated.id, {
          caption: 'A caption',
          folder: destination.id,
        });
        expect(res.statusCode).toBe(200);
      } finally {
        strapi.eventHub.off('media.update', listener);
      }

      expect(payloads).toHaveLength(1);
      expect(Object.keys(payloads[0])).toEqual(['media']);
      expect(payloads[0].media).toMatchObject({ id: updated.id, caption: 'A caption' });
      expect(payloads[0].media).not.toHaveProperty('folder');
      expect(payloads[0].media).not.toHaveProperty('folderPath');
    });

    test('records a renamed folder and a folder moved to another parent', async () => {
      const parent = await folder('audit-folder-parent');
      const moved = await folder('audit-folder-moved');
      await clearAuditLogs();

      const rename = await rq({
        method: 'PUT',
        url: `/upload/folders/${moved.id}`,
        body: { name: 'audit-folder-renamed' },
      });
      expect(rename.statusCode).toBe(200);

      const [renameRow] = await rowsFor('media.update', 'media-folder', moved.id);
      expect(renameRow.payload.details).toEqual({
        changes: { name: { before: 'audit-folder-moved', after: 'audit-folder-renamed' } },
      });

      const move = await rq({
        method: 'PUT',
        url: `/upload/folders/${moved.id}`,
        body: { name: 'audit-folder-renamed', parent: parent.id },
      });
      expect(move.statusCode).toBe(200);

      const rows = await rowsFor('media.update', 'media-folder', moved.id, 2);
      expect(rows[1].payload).toEqual(
        row(
          'media.update',
          { type: 'media-folder', id: moved.id, name: 'audit-folder-renamed' },
          { changes: { parent: { before: null, after: { id: parent.id, name: parent.name } } } }
        )
      );
      expect(await findLogs('media-folder.update')).toHaveLength(0);
    });

    test('records a replaced file, which keeps its name and url', async () => {
      const replaced = await file(null);
      await clearAuditLogs();

      const res = await rq({
        method: 'POST',
        url: `/upload?id=${replaced.id}`,
        formData: {
          files: fs.createReadStream(path.join(__dirname, 'utils/strapi.png')),
          fileInfo: JSON.stringify({ name: replaced.name }),
        },
      });
      expect(res.statusCode).toBe(200);

      const [replaceRow] = await rowsFor('media.update', 'media', replaced.id);
      expect(replaceRow.payload).toEqual(
        row(
          'media.update',
          { type: 'media', id: replaced.id, name: replaced.name },
          {
            changes: {
              file: {
                before: { name: replaced.name, mime: 'image/jpeg', size: expect.any(Number) },
                after: { name: replaced.name, mime: 'image/png', size: expect.any(Number) },
              },
            },
          }
        )
      );
      expect(JSON.stringify(replaceRow.payload)).not.toMatch(/uploads|"hash"/);
    });

    test('records a deleted folder but not its subfolders, and each file inside', async () => {
      const outer = await folder('audit-delete-outer');
      const inner = await folder('audit-delete-inner', outer.id);
      const inside = await createFile(inner.id);
      await clearAuditLogs();

      const res = await rq({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: { fileIds: [], folderIds: [outer.id] },
      });
      expect(res.statusCode).toBe(200);

      const [outerRow] = await rowsFor('media.delete', 'media-folder', outer.id);
      expect(outerRow.payload).toEqual(
        row('media.delete', { type: 'media-folder', id: outer.id, name: outer.name })
      );
      const [fileRow] = await rowsFor('media.delete', 'media', inside.id);
      expect(fileRow.payload.resource).toEqual({ type: 'media', id: inside.id, name: inside.name });

      // A later row proves every delete event was processed
      const marker = await folder('audit-delete-marker');
      await rowsFor('media.create', 'media-folder', marker.id);
      const folderRows = (await findLogs('media.delete')).filter(
        (log) => log.payload.resource.type === 'media-folder'
      );
      expect(folderRows.map((log) => log.payload.resource.id)).toEqual([outer.id]);
    });

    test('records each deleted folder and the files inside it as media.delete', async () => {
      const first = await folder('audit-delete-first');
      const second = await folder('audit-delete-second');
      const inside = await createFile(first.id);
      await clearAuditLogs();

      const res = await rq({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: { fileIds: [], folderIds: [first.id, second.id] },
      });
      expect(res.statusCode).toBe(200);

      for (const deleted of [first, second]) {
        const [deleteRow] = await rowsFor('media.delete', 'media-folder', deleted.id);
        expect(deleteRow.payload).toEqual(
          row('media.delete', { type: 'media-folder', id: deleted.id, name: deleted.name })
        );
      }
      const [fileRow] = await rowsFor('media.delete', 'media', inside.id);
      expect(fileRow.payload).toEqual(
        row('media.delete', { type: 'media', id: inside.id, name: inside.name })
      );
      expect(await findLogs('media-folder.delete')).toHaveLength(0);
    });
  });
});
