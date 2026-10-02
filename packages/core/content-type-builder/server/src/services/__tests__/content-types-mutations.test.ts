import type { UID } from '@strapi/types';

import {
  createContentType,
  createContentTypes,
  deleteContentType,
  deleteContentTypes,
  editContentType,
} from '../content-types';

const files = {
  schemas: new Set<string>(),
  apis: new Set<string>(),
  groups: 'before',
};

const builder = {
  contentTypes: new Map<string, any>(),
  createNewComponentUIDMap: jest.fn(() => ({})),
  createContentType: jest.fn(),
  createComponent: jest.fn(),
  editComponent: jest.fn(),
  createComponentAttributes: jest.fn(),
  editContentType: jest.fn(),
  deleteContentType: jest.fn(),
  writeFiles: jest.fn(),
  rollback: jest.fn(),
};

const apiHandler = {
  backup: jest.fn(),
  clear: jest.fn(),
  rollback: jest.fn(),
  clearGenerated: jest.fn(),
  finalize: jest.fn(),
};

const contentStructure = {
  commitFromUpdate: jest.fn(),
};

jest.mock('../schema-builder', () => jest.fn(() => builder));
jest.mock('../../utils', () => ({
  getService: jest.fn((name) => (name === 'content-structure' ? contentStructure : apiHandler)),
}));
jest.mock('@strapi/generators', () => ({ generate: jest.fn() }));

const contentType: { uid: UID.ContentType; [key: string]: any } = {
  uid: 'api::article.article',
  apiName: 'article',
  kind: 'collectionType',
  info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' },
  attributes: {},
};

const pluginContentType: { uid: UID.ContentType; [key: string]: any } = {
  ...contentType,
  uid: 'plugin::example.article',
  apiName: undefined,
  plugin: 'example',
};

const secondContentType: { uid: UID.ContentType; [key: string]: any } = {
  ...contentType,
  uid: 'api::category.category',
  apiName: 'category',
};

const createInput = {
  contentType: {
    uid: contentType.uid,
    displayName: 'Article',
    singularName: 'article',
    pluralName: 'articles',
    kind: 'collectionType',
    attributes: {},
  },
  components: [],
};

describe('content type mutation compensation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    files.schemas = new Set([contentType.uid, secondContentType.uid, pluginContentType.uid]);
    files.apis = new Set(['article']);
    files.groups = 'before';

    builder.contentTypes = new Map([
      [contentType.uid, { schema: contentType }],
      [secondContentType.uid, { schema: secondContentType }],
      [pluginContentType.uid, { schema: pluginContentType }],
    ]);
    builder.createContentType.mockImplementation(() => ({
      uid: contentType.uid,
      schema: contentType,
    }));
    builder.editContentType.mockImplementation(() => ({
      uid: contentType.uid,
      schema: { ...contentType, kind: 'singleType' },
    }));
    builder.deleteContentType.mockImplementation((uid) => {
      files.schemas.delete(uid);
      return { uid };
    });
    builder.writeFiles.mockResolvedValue(true);
    builder.rollback.mockImplementation(async () => {
      files.schemas = new Set([contentType.uid, secondContentType.uid, pluginContentType.uid]);
    });
    apiHandler.backup.mockResolvedValue(undefined);
    apiHandler.clear.mockImplementation(async (uid) => {
      const apiName = uid === contentType.uid ? 'article' : undefined;
      if (apiName) files.apis.delete(apiName);
    });
    apiHandler.rollback.mockImplementation(async (uid) => {
      if (uid === contentType.uid) files.apis.add('article');
    });
    apiHandler.clearGenerated.mockImplementation(async (apiName) => {
      files.apis.delete(apiName);
    });
    apiHandler.finalize.mockResolvedValue(undefined);
    contentStructure.commitFromUpdate.mockImplementation(async () => {
      files.groups = 'after';
      return true;
    });

    jest.requireMock('@strapi/generators').generate.mockImplementation(async () => {
      files.apis.add('article');
    });

    global.strapi = {
      components: {},
      contentTypes: {
        [contentType.uid]: contentType,
        [pluginContentType.uid]: pluginContentType,
      },
      dirs: { app: { root: '/app' } },
      plugins: {
        'content-type-builder': { services: { 'api-handler': apiHandler } },
      },
      eventHub: { emit: jest.fn() },
      db: { query: jest.fn(() => ({ count: jest.fn().mockResolvedValue(0) })) },
      log: { error: jest.fn() },
    } as any;
  });

  it('removes a generated API skeleton when standalone schema creation fails', async () => {
    files.schemas.delete(contentType.uid);
    files.apis.clear();
    builder.rollback.mockImplementationOnce(async () => {
      files.schemas = new Set([pluginContentType.uid]);
    });
    builder.writeFiles.mockRejectedValueOnce(new Error('schema write failed'));

    await expect(createContentType(createInput)).rejects.toThrow('schema write failed');

    expect(files.schemas).not.toContain(contentType.uid);
    expect(files.apis).not.toContain('article');
    expect(files.groups).toBe('before');
  });

  it('removes a partial standalone skeleton when generation fails before any schema directory exists', async () => {
    files.schemas.delete(contentType.uid);
    files.apis.clear();
    builder.rollback.mockRejectedValueOnce(new Error('schema directory does not exist'));
    jest.requireMock('@strapi/generators').generate.mockImplementationOnce(async () => {
      files.apis.add('article');
      throw new Error('generator failed');
    });

    await expect(createContentType(createInput)).rejects.toThrow('schema directory does not exist');

    expect(files.schemas).not.toContain(contentType.uid);
    expect(files.apis).not.toContain('article');
    expect(files.groups).toBe('before');
  });

  it('removes every generated skeleton and defers create events when a batch schema write fails', async () => {
    files.schemas.clear();
    files.apis.clear();
    builder.rollback.mockImplementationOnce(async () => {
      files.schemas = new Set();
    });
    builder.writeFiles.mockRejectedValueOnce(new Error('batch schema write failed'));

    await expect(createContentTypes([createInput])).rejects.toThrow('batch schema write failed');

    expect(files.schemas).toEqual(new Set());
    expect(files.apis).toEqual(new Set());
    expect(strapi.eventHub.emit).not.toHaveBeenCalled();
  });

  it('restores schema and API files and rejects when a kind switch cannot reconcile folders', async () => {
    builder.editContentType.mockImplementation(() => {
      files.schemas.delete(contentType.uid);
      files.schemas.add(`${contentType.uid}:singleType`);
      return { uid: contentType.uid, schema: { ...contentType, kind: 'singleType' } };
    });
    contentStructure.commitFromUpdate.mockRejectedValueOnce(new Error('groups write failed'));

    await expect(
      editContentType(contentType.uid, {
        contentType: { ...contentType, kind: 'singleType', attributes: {} },
      })
    ).rejects.toThrow('groups write failed');

    expect(files.schemas).toEqual(
      new Set([contentType.uid, secondContentType.uid, pluginContentType.uid])
    );
    expect(files.apis).toEqual(new Set(['article']));
    expect(files.groups).toBe('before');
  });

  it('rejects a crafted protected plugin deletion before it mutates schema or API files', async () => {
    await expect(deleteContentType(pluginContentType.uid)).rejects.toThrow(/not managed by CTB/);

    expect(files.schemas).toEqual(
      new Set([contentType.uid, secondContentType.uid, pluginContentType.uid])
    );
    expect(files.apis).toEqual(new Set(['article']));
    expect(apiHandler.backup).not.toHaveBeenCalled();
    expect(builder.deleteContentType).not.toHaveBeenCalled();
    expect(files.groups).toBe('before');
  });

  it('does not generate an app API skeleton while switching a plugin extension kind', async () => {
    builder.contentTypes.set(pluginContentType.uid, {
      schema: pluginContentType,
      plugin: 'example',
    });

    await editContentType(pluginContentType.uid, {
      contentType: { ...pluginContentType, kind: 'singleType', attributes: {} },
    });

    expect(jest.requireMock('@strapi/generators').generate).not.toHaveBeenCalled();
    expect(files.apis).toEqual(new Set(['article']));
    expect(files.groups).toBe('after');
  });

  it('restores all schemas and APIs and rejects when bulk folder reconciliation fails', async () => {
    contentStructure.commitFromUpdate.mockRejectedValueOnce(new Error('groups write failed'));

    await expect(deleteContentTypes([contentType.uid, secondContentType.uid])).rejects.toThrow(
      'groups write failed'
    );

    expect(files.schemas).toEqual(
      new Set([contentType.uid, secondContentType.uid, pluginContentType.uid])
    );
    expect(files.apis).toEqual(new Set(['article']));
    expect(files.groups).toBe('before');
  });

  it('only restores backups that completed when bulk backup fails partway through', async () => {
    apiHandler.backup
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('backup failed'));

    await expect(deleteContentTypes([contentType.uid, secondContentType.uid])).rejects.toThrow(
      'backup failed'
    );

    expect(files.schemas).toEqual(
      new Set([contentType.uid, secondContentType.uid, pluginContentType.uid])
    );
    expect(files.apis).toEqual(new Set(['article']));
    expect(apiHandler.rollback).toHaveBeenCalledWith(contentType.uid);
    expect(apiHandler.rollback).not.toHaveBeenCalledWith(secondContentType.uid);
    expect(files.groups).toBe('before');
  });

  it('reports a committed deletion and emits its event when backup cleanup alone fails', async () => {
    apiHandler.finalize.mockRejectedValueOnce(new Error('backup cleanup failed'));

    await expect(deleteContentTypes([contentType.uid])).resolves.toBeUndefined();

    expect(files.schemas).toEqual(new Set([secondContentType.uid, pluginContentType.uid]));
    expect(files.apis).toEqual(new Set());
    expect(files.groups).toBe('after');
    expect(strapi.eventHub.emit).toHaveBeenCalledWith('content-type.delete', {
      contentType: { uid: contentType.uid },
    });
  });
});
