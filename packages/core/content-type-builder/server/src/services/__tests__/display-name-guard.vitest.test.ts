import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UID } from '@strapi/types';

import { editContentType, generateAPI } from '../content-types';
import { updateSchema } from '../schema';
import type { Schema as CTBSchema } from '../../controllers/validation/schema';

/**
 * The core validator rejects a schema without a non-empty `info.displayName` at load time, so
 * a service that writes one leaves an app that no longer boots. The HTTP validators require
 * `displayName`; these tests cover direct service callers (plugins, app code).
 */

const uid: UID.ContentType = 'api::article.article';

const builder = vi.hoisted(() => ({
  contentTypes: new Map<string, unknown>(),
  components: new Map<string, unknown>(),
  createNewComponentUIDMap: vi.fn(() => ({})),
  createContentType: vi.fn(),
  createContentTypeAttributes: vi.fn(),
  editContentType: vi.fn(),
  createComponent: vi.fn(),
  editComponent: vi.fn(),
  writeFiles: vi.fn(),
  renameComponentRows: vi.fn(),
  rollback: vi.fn(),
}));

const apiHandler = vi.hoisted(() => ({
  backup: vi.fn(),
  clear: vi.fn(),
  rollback: vi.fn(),
  clearGenerated: vi.fn(),
  finalize: vi.fn(),
}));

const contentStructure = vi.hoisted(() => ({
  validateFromUpdate: vi.fn(),
  commitFromUpdate: vi.fn(),
}));

const generate = vi.hoisted(() => vi.fn());

vi.mock('../schema-builder', () => ({ default: vi.fn(() => builder) }));
vi.mock('../../utils', () => ({
  getService: vi.fn((name: string) => {
    if (name === 'content-structure') {
      return contentStructure;
    }
    if (name === 'content-types') {
      return { generateAPI: generate };
    }
    return apiHandler;
  }),
}));
vi.mock('@strapi/generators', () => ({ generate }));

const storedSchema = {
  kind: 'collectionType',
  info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' },
  attributes: {},
};

const editInput = (contentType: Record<string, unknown>) => ({
  contentType: { kind: 'collectionType', attributes: {}, ...contentType },
  components: [],
});

const schemaContentType = (contentType: Record<string, unknown>) =>
  ({
    contentTypes: [
      {
        uid,
        singularName: 'article',
        pluralName: 'articles',
        kind: 'collectionType',
        draftAndPublish: true,
        pluginOptions: {},
        options: {},
        attributes: [],
        ...contentType,
      },
    ],
    components: [],
  }) as unknown as CTBSchema;

describe('displayName guard on direct service calls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    builder.contentTypes = new Map([[uid, { uid, schema: storedSchema, plugin: undefined }]]);
    builder.editContentType.mockImplementation((infos: Record<string, unknown>) => ({
      uid,
      schema: { ...storedSchema, info: { ...storedSchema.info, displayName: infos.displayName } },
    }));
    builder.writeFiles.mockResolvedValue(true);

    (global as any).strapi = {
      contentTypes: { [uid]: { uid, kind: 'collectionType', attributes: {} } },
      components: {},
      plugins: {
        'content-type-builder': { config: (_key: string, defaultValue: unknown) => defaultValue },
      },
      plugin: (name: string) => (global as any).strapi.plugins[name],
      dirs: { app: { api: '/app/src/api', components: '/app/src/components' } },
      db: {},
      eventHub: { emit: vi.fn() },
      log: { error: vi.fn(), warn: vi.fn() },
    };
  });

  describe('editContentType', () => {
    it.each([
      { name: 'an empty string', displayName: '' },
      { name: 'null', displayName: null },
      { name: 'a number', displayName: 42 },
    ])('rejects a displayName that is $name before any write', async ({ displayName }) => {
      await expect(editContentType(uid, editInput({ displayName }))).rejects.toThrow(
        'A content type requires a displayName'
      );

      expect(builder.editContentType).not.toHaveBeenCalled();
      expect(builder.writeFiles).not.toHaveBeenCalled();
    });

    it('keeps the stored displayName when the payload omits it', async () => {
      await expect(editContentType(uid, editInput({}))).resolves.toBeDefined();

      expect(builder.editContentType).toHaveBeenCalledTimes(1);
      expect(builder.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('writes a valid displayName', async () => {
      await editContentType(uid, editInput({ displayName: 'Post' }));

      expect(builder.editContentType).toHaveBeenCalledWith(
        expect.objectContaining({ uid, displayName: 'Post' })
      );
      expect(builder.writeFiles).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSchema', () => {
    it.each([
      { name: 'is missing', displayName: undefined },
      { name: 'is an empty string', displayName: '' },
    ])(
      'rejects a created content type whose displayName $name before any write',
      async ({ displayName }) => {
        await expect(
          updateSchema(
            schemaContentType({ action: 'create', uid: 'api::probe.probe', displayName })
          )
        ).rejects.toThrow('A content type requires a displayName');

        expect(builder.createContentType).not.toHaveBeenCalled();
        expect(generate).not.toHaveBeenCalled();
        expect(builder.writeFiles).not.toHaveBeenCalled();
      }
    );

    it('rejects an updated content type with an empty displayName before any write', async () => {
      await expect(
        updateSchema(schemaContentType({ action: 'update', displayName: '' }))
      ).rejects.toThrow('A content type requires a displayName');

      expect(builder.editContentType).not.toHaveBeenCalled();
      expect(builder.writeFiles).not.toHaveBeenCalled();
    });

    it('keeps the stored displayName when an update omits it', async () => {
      await expect(
        updateSchema(schemaContentType({ action: 'update', displayName: undefined }))
      ).resolves.toBeUndefined();

      expect(builder.editContentType).toHaveBeenCalledTimes(1);
      expect(builder.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('creates a content type with a valid displayName', async () => {
      await expect(
        updateSchema(
          schemaContentType({ action: 'create', uid: 'api::probe.probe', displayName: 'Probe' })
        )
      ).resolves.toBeUndefined();

      expect(generate).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Probe' }));
      expect(builder.writeFiles).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSchema batch', () => {
    it.each([
      { name: 'null', displayName: null },
      { name: 'a number', displayName: 42 },
    ])(
      'rejects the whole batch when one updated content type has a displayName that is $name',
      async ({ displayName }) => {
        const otherUid: UID.ContentType = 'api::page.page';
        builder.contentTypes.set(otherUid, { uid: otherUid, schema: storedSchema });
        (global as any).strapi.contentTypes[otherUid] = {
          uid: otherUid,
          kind: 'collectionType',
          attributes: {},
        };

        const schema = schemaContentType({ action: 'update', displayName: 'Article' });
        schema.contentTypes.push({
          ...schema.contentTypes[0],
          uid: otherUid,
          singularName: 'page',
          pluralName: 'pages',
          displayName,
        } as unknown as CTBSchema['contentTypes'][number]);

        await expect(updateSchema(schema)).rejects.toThrow('A content type requires a displayName');

        expect(builder.editContentType).not.toHaveBeenCalled();
        expect(builder.writeFiles).not.toHaveBeenCalled();
      }
    );
  });

  describe('generateAPI', () => {
    let appRoot: string;

    beforeEach(async () => {
      appRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ctb-generate-api-'));
      (global as any).strapi.dirs.app.root = appRoot;
    });

    afterEach(async () => {
      await fs.rm(appRoot, { recursive: true, force: true });
    });

    it.each([
      { name: 'is missing', displayName: undefined },
      { name: 'is an empty string', displayName: '' },
      { name: 'is null', displayName: null },
    ])('rejects a displayName that $name before any write', ({ displayName }) => {
      expect(() =>
        generateAPI({ singularName: 'probe', pluralName: 'probes', displayName })
      ).toThrow('A content type requires a displayName');

      expect(generate).not.toHaveBeenCalled();
    });

    it('writes no file when the displayName is missing', async () => {
      expect(() => generateAPI({ singularName: 'probe', pluralName: 'probes' })).toThrow(
        'A content type requires a displayName'
      );

      await expect(fs.readdir(appRoot)).resolves.toEqual([]);
    });
  });
});
