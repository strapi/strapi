import path from 'path';
import fse from 'fs-extra';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

const WIDGET_UID = 'api::cs-widget.cs-widget';
const TEMP_UID = 'api::cs-temp.cs-temp';

const widget = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  draftAndPublish: false,
  displayName: 'CS Widget',
  singularName: 'cs-widget',
  pluralName: 'cs-widgets',
  description: '',
  collectionName: '',
};

const builder = createTestBuilder();
let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

const appRoot = () => path.dirname(process.env.ENV_PATH as string);
const groupsFilePath = () => path.join(appRoot(), 'src', 'content-structure', 'groups.json');

const readGroupsFile = async () => {
  const filePath = groupsFilePath();

  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  return fse.readJSON(filePath);
};

const removeGroupsFile = () => fse.remove(groupsFilePath());

const structureWith = (groups: unknown[]) => ({
  version: 1,
  sections: {
    collectionTypes: { groups },
    singleTypes: { groups: [] },
  },
});

const updateSchema = (data: Record<string, unknown>) => {
  return rq({
    method: 'POST',
    url: '/content-type-builder/update-schema',
    body: { data: { contentTypes: [], components: [], ...data } },
  });
};
const folderSave = (contentStructure: unknown) => {
  return updateSchema({ contentStructure });
};

const createContentTypeStandalone = (contentType: Record<string, unknown>) => {
  return rq({
    method: 'POST',
    url: '/content-type-builder/content-types',
    body: { contentType },
  });
};

const updateContentTypeStandalone = (uid: string, contentType: Record<string, unknown>) => {
  return rq({
    method: 'PUT',
    url: `/content-type-builder/content-types/${uid}`,
    body: { contentType },
  });
};

const deleteContentTypeStandalone = (uid: string) => {
  return rq({
    method: 'DELETE',
    url: `/content-type-builder/content-types/${uid}`,
  });
};

const csTempInput = {
  displayName: 'CS Temp',
  singularName: 'cs-temp',
  pluralName: 'cs-temps',
  kind: 'collectionType',
  attributes: { title: { type: 'string' } },
};

describe('Content Type Builder - Content Structure (folders)', () => {
  beforeAll(async () => {
    await builder.addContentType(widget).build();
    await removeGroupsFile();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterEach(async () => {
    await removeGroupsFile();
    await restart();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
    await removeGroupsFile();
  });

  describe('persisting through update-schema', () => {
    test('writes the content structure to groups.json on disk', async () => {
      const res = await folderSave(
        structureWith([
          {
            id: 'grp_widgets',
            name: 'Widgets',
            parent: null,
            children: [{ type: 'contentType', uid: WIDGET_UID }],
          },
        ])
      );

      expect(res.statusCode).toBe(200);

      const onDisk = await readGroupsFile();
      expect(onDisk).toMatchObject({
        version: 1,
        sections: {
          collectionTypes: {
            groups: [
              {
                id: 'grp_widgets',
                name: 'Widgets',
                parent: null,
                children: [{ type: 'contentType', uid: WIDGET_UID }],
              },
            ],
          },
          singleTypes: { groups: [] },
        },
      });
    });

    test('a folder-only save proceeds like a schema save', async () => {
      const res = await folderSave(
        structureWith([{ id: 'grp_only', name: 'Only Folders', parent: null, children: [] }])
      );

      expect(res.statusCode).toBe(200);
      expect(await readGroupsFile()).not.toBeNull();

      // The same lock a normal schema save induces is now present
      const status = await rq({
        method: 'GET',
        url: '/content-type-builder/update-schema-status',
      });
      expect(status.body.data.isUpdating).toBe(true);
    });

    test('rejects a structure that references an unknown content type', async () => {
      const res = await folderSave(
        structureWith([
          {
            id: 'grp_ghost',
            name: 'Ghost',
            parent: null,
            children: [{ type: 'contentType', uid: 'api::ghost.ghost' }],
          },
        ])
      );

      expect(res.statusCode).toBe(400);

      // Nothing should have been persisted.
      expect(await readGroupsFile()).toBeNull();
    });
  });

  describe('concurrency', () => {
    test('returns 409 when a folder save is already in progress', async () => {
      const body = {
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [],
            components: [],
            contentStructure: structureWith([
              { id: 'grp_lock', name: 'Lock', parent: null, children: [] },
            ]),
          },
        },
      };

      const [resA, resB] = await Promise.all([rq(body), rq(body)]);

      expect([resA.statusCode, resB.statusCode].sort()).toEqual([200, 409]);

      const conflict = [resA, resB].find((r) => r.statusCode === 409);
      expect(conflict.body).toMatchObject({
        error: { name: 'ConflictError', message: 'Schema update is already in progress.' },
      });
    });
  });

  describe('tolerant boot', () => {
    test('a malformed groups.json boots to an empty (flat) structure and logs the failure', async () => {
      // Raw invalid JSON - the read path should not crash, and should continue without folders.
      // It should also log the parse failure.
      await fse.outputFile(groupsFilePath(), '{ this is : not valid json');
      await restart();

      const contentStructure = strapi.get('content-structure');

      contentStructure.invalidate();
      const errorSpy = jest.spyOn(strapi.log, 'error');

      const resolved = await contentStructure.resolve();

      expect(resolved).toEqual({ collectionTypes: [], singleTypes: [] });
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Could not parse'));

      errorSpy.mockRestore();
    });
  });

  describe('content-type deletion pruning', () => {
    test('prunes references to content types deleted in the same transaction', async () => {
      const created = await updateSchema({
        contentTypes: [
          {
            action: 'create',
            uid: TEMP_UID,
            displayName: 'CS Temp',
            singularName: 'cs-temp',
            pluralName: 'cs-temps',
            kind: 'collectionType',
            draftAndPublish: false,
            attributes: [{ action: 'create', name: 'title', properties: { type: 'string' } }],
          },
        ],
      });
      expect(created.statusCode).toBe(200);

      await restart();

      // Delete the temporary contentType and - in the same transaction - send a
      // structure that still references it alongside the surviving widget.
      // The deleted uid should be pruned before the file is written.
      const res = await updateSchema({
        contentTypes: [{ action: 'delete', uid: TEMP_UID }],
        contentStructure: structureWith([
          {
            id: 'grp_mixed',
            name: 'Mixed',
            parent: null,
            children: [
              { type: 'contentType', uid: TEMP_UID },
              { type: 'contentType', uid: WIDGET_UID },
            ],
          },
        ]),
      });

      expect(res.statusCode).toBe(200);

      const onDisk = await readGroupsFile();
      const children = onDisk.sections.collectionTypes.groups[0].children;

      expect(children).toEqual([{ type: 'contentType', uid: WIDGET_UID }]);
    });
  });

  describe('standalone route reconciliation', () => {
    afterEach(async () => {
      if (strapi.contentTypes[TEMP_UID]) {
        await deleteContentTypeStandalone(TEMP_UID);
        await restart();
      }
    });

    test('a standalone delete prunes the reference, and a recreate does not resurface it', async () => {
      expect((await createContentTypeStandalone(csTempInput)).statusCode).toBe(201);
      await restart();

      const saved = await folderSave(
        structureWith([
          {
            id: 'grp_standalone',
            name: 'Standalone',
            parent: null,
            children: [
              { type: 'contentType', uid: TEMP_UID },
              { type: 'contentType', uid: WIDGET_UID },
            ],
          },
        ])
      );
      expect(saved.statusCode).toBe(200);
      await restart();

      expect((await deleteContentTypeStandalone(TEMP_UID)).statusCode).toBe(200);

      const afterDelete = await readGroupsFile();
      expect(afterDelete.sections.collectionTypes.groups[0].children).toEqual([
        { type: 'contentType', uid: WIDGET_UID },
      ]);

      await restart();

      expect((await createContentTypeStandalone(csTempInput)).statusCode).toBe(201);
      await restart();

      const afterRecreate = await readGroupsFile();
      const refs = afterRecreate.sections.collectionTypes.groups.flatMap((g: any) => g.children);
      expect(refs).not.toContainEqual({ type: 'contentType', uid: TEMP_UID });
    });

    test('a standalone kind switch prunes the now-invalid folder membership', async () => {
      expect((await createContentTypeStandalone(csTempInput)).statusCode).toBe(201);
      await restart();

      const saved = await folderSave(
        structureWith([
          {
            id: 'grp_kind',
            name: 'Kind',
            parent: null,
            children: [{ type: 'contentType', uid: TEMP_UID }],
          },
        ])
      );
      expect(saved.statusCode).toBe(200);
      await restart();

      const switched = await updateContentTypeStandalone(TEMP_UID, {
        ...csTempInput,
        kind: 'singleType',
      });
      expect(switched.statusCode).toBe(201);

      const onDisk = await readGroupsFile();
      const refs = onDisk.sections.collectionTypes.groups.flatMap((g: any) => g.children);
      expect(refs).not.toContainEqual({ type: 'contentType', uid: TEMP_UID });
    });
  });

  describe('backwards compatibility', () => {
    test('a folder-only save changes neither content-API responses nor the schema', async () => {
      // Seed an entry so there is a payload to compare.
      const create = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${WIDGET_UID}`,
        body: { name: 'Widget One' },
      });
      expect(create.statusCode).toBe(201);

      const beforeEntries = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/${WIDGET_UID}`,
      });
      expect(beforeEntries.statusCode).toBe(200);

      const beforeSchema = await rq({ method: 'GET', url: '/content-type-builder/schema' });
      expect(beforeSchema.statusCode).toBe(200);

      // Introduce a folder structure (folder-only save), then reload.
      const saved = await folderSave(
        structureWith([
          {
            id: 'grp_backcompat',
            name: 'BC',
            parent: null,
            children: [{ type: 'contentType', uid: WIDGET_UID }],
          },
        ])
      );
      expect(saved.statusCode).toBe(200);

      await restart();

      const afterEntries = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/${WIDGET_UID}`,
      });
      expect(afterEntries.statusCode).toBe(200);

      const afterSchema = await rq({ method: 'GET', url: '/content-type-builder/schema' });
      expect(afterSchema.statusCode).toBe(200);

      expect(afterEntries.body.results).toEqual(beforeEntries.body.results);
      expect(afterSchema.body.data.contentTypes).toEqual(beforeSchema.body.data.contentTypes);
      expect(afterSchema.body.data.components).toEqual(beforeSchema.body.data.components);

      // Only the contentStructure should be changed
      expect(afterSchema.body.data.contentStructure).not.toEqual(
        beforeSchema.body.data.contentStructure
      );
    });
  });
});
