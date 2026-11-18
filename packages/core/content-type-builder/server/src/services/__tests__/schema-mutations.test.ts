import { updateSchema } from '../schema';

const initialSchemas = new Set([
  'api::old.old',
  'api::related.related',
  'plugin::example.plugin',
  'shared.card',
]);

const artifacts = {
  schemas: new Set<string>(),
  apis: new Set<string>(),
  groups: 'before',
};

const builder = {
  contentTypes: new Map<string, unknown>(),
  components: new Map<string, unknown>(),
  createContentType: jest.fn(),
  createComponent: jest.fn(),
  createContentTypeAttributes: jest.fn(),
  editContentType: jest.fn(),
  deleteContentType: jest.fn(),
  createComponentAttributes: jest.fn(),
  editComponent: jest.fn(),
  deleteComponent: jest.fn(),
  writeFiles: jest.fn(),
  // Like the real builder: `beforeCommit` runs inside the row transaction, and its
  // rejection propagates out of `renameComponentRows`.
  renameComponentRows: jest.fn(
    async ({ beforeCommit }: { beforeCommit?: () => Promise<unknown> } = {}) => beforeCommit?.()
  ),
  rollback: jest.fn(),
};

const apiHandler = {
  backup: jest.fn(),
  clear: jest.fn(),
  rollback: jest.fn(),
  clearGenerated: jest.fn(),
  finalize: jest.fn(),
};

const contentTypes = { generateAPI: jest.fn() };
const contentStructure = { validateFromUpdate: jest.fn(), commitFromUpdate: jest.fn() };

jest.mock('../schema-builder', () => jest.fn(() => builder));
jest.mock('../../utils', () => ({
  getService: jest.fn((name) => {
    if (name === 'api-handler') return apiHandler;
    if (name === 'content-types') return contentTypes;
    return contentStructure;
  }),
}));

describe('batch schema mutation compensation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    artifacts.schemas = new Set(initialSchemas);
    artifacts.apis = new Set(['old']);
    artifacts.groups = 'before';

    builder.createContentType.mockImplementation(() => {
      artifacts.schemas.add('api::new.new');
    });
    builder.deleteContentType.mockImplementation((uid) => {
      artifacts.schemas.delete(uid);
    });
    builder.writeFiles.mockResolvedValue(true);
    builder.rollback.mockImplementation(async () => {
      artifacts.schemas = new Set(initialSchemas);
    });
    contentTypes.generateAPI.mockImplementation(async () => {
      artifacts.apis.add('new');
    });
    apiHandler.backup.mockResolvedValue(undefined);
    apiHandler.clear.mockImplementation(async () => {
      artifacts.apis.delete('old');
    });
    apiHandler.rollback.mockImplementation(async () => {
      artifacts.apis.add('old');
    });
    apiHandler.clearGenerated.mockImplementation(async () => {
      artifacts.apis.delete('new');
    });
    apiHandler.finalize.mockResolvedValue(undefined);
    contentStructure.validateFromUpdate.mockImplementation(() => {});
    contentStructure.commitFromUpdate.mockImplementation(async () => {
      throw new Error('groups write failed');
    });

    global.strapi = {
      eventHub: { emit: jest.fn() },
      log: { error: jest.fn() },
      // `updateSchema` reads the rename-migration mode from the plugin config.
      plugins: {
        'content-type-builder': {
          config: (_key: string, defaultValue: unknown) => defaultValue,
        },
      },
    } as any;
  });

  it('restores mixed create/delete artifacts when folder reconciliation rejects', async () => {
    await expect(
      updateSchema({
        contentTypes: [
          {
            action: 'create',
            uid: 'api::new.new',
            displayName: 'New',
            singularName: 'new',
            pluralName: 'news',
            kind: 'collectionType',
            draftAndPublish: false,
            pluginOptions: {},
            options: {},
            attributes: [],
          },
          { action: 'delete', uid: 'api::old.old' },
        ],
        components: [],
      } as any)
    ).rejects.toThrow('groups write failed');

    expect(artifacts.schemas).toEqual(initialSchemas);
    expect(artifacts.apis).toEqual(new Set(['old']));
    expect(artifacts.groups).toBe('before');
    expect(strapi.eventHub.emit).not.toHaveBeenCalled();
  });
});

describe('component uid change in a batch schema mutation', () => {
  const moveCard = {
    contentTypes: [{ action: 'delete', uid: 'api::old.old' }],
    components: [
      {
        action: 'update',
        uid: 'shared.card',
        category: 'blocks',
        displayName: 'Card',
        icon: 'star',
        attributes: [],
      },
    ],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    builder.writeFiles.mockResolvedValue(true);
    builder.rollback.mockResolvedValue(undefined);
    apiHandler.backup.mockResolvedValue(undefined);
    apiHandler.clear.mockResolvedValue(undefined);
    apiHandler.rollback.mockResolvedValue(undefined);
    contentStructure.validateFromUpdate.mockImplementation(() => {});
    contentStructure.commitFromUpdate.mockResolvedValue(false);

    global.strapi = {
      eventHub: { emit: jest.fn() },
      log: { error: jest.fn() },
      plugins: {
        'content-type-builder': {
          config: (_key: string, defaultValue: unknown) => defaultValue,
        },
      },
    } as any;
  });

  it('writes the files without the rows, then commits the folders inside the row rewrite', async () => {
    await updateSchema(moveCard);

    expect(builder.writeFiles).toHaveBeenCalledWith({ renameComponentRows: false });
    expect(builder.renameComponentRows).toHaveBeenCalledTimes(1);
    expect(builder.renameComponentRows).toHaveBeenCalledWith({
      beforeCommit: expect.any(Function),
    });
    expect(contentStructure.commitFromUpdate).toHaveBeenCalledTimes(1);

    const [clearOrder] = apiHandler.clear.mock.invocationCallOrder;
    const [renameOrder] = builder.renameComponentRows.mock.invocationCallOrder;
    const [commitOrder] = contentStructure.commitFromUpdate.mock.invocationCallOrder;

    expect(clearOrder).toBeLessThan(renameOrder);
    expect(renameOrder).toBeLessThan(commitOrder);
    expect(builder.rollback).not.toHaveBeenCalled();
  });

  it('rolls the rows back with the files when the folder commit fails', async () => {
    contentStructure.commitFromUpdate.mockRejectedValueOnce(new Error('EACCES'));

    await expect(updateSchema(moveCard)).rejects.toThrow('EACCES');

    // The rejection came out of `renameComponentRows`, i.e. out of the row transaction.
    await expect(builder.renameComponentRows.mock.results[0].value).rejects.toThrow('EACCES');
    expect(builder.rollback).toHaveBeenCalledTimes(1);
    expect(apiHandler.rollback).toHaveBeenCalledWith('api::old.old');
  });

  it('leaves the rows on the old uid and restores the files when an API clear fails', async () => {
    apiHandler.clear.mockRejectedValueOnce(new Error('clear failed'));

    await expect(updateSchema(moveCard)).rejects.toThrow('clear failed');

    expect(builder.renameComponentRows).not.toHaveBeenCalled();
    expect(builder.rollback).toHaveBeenCalledTimes(1);
    expect(apiHandler.rollback).toHaveBeenCalledWith('api::old.old');
    expect(contentStructure.commitFromUpdate).not.toHaveBeenCalled();
  });

  it('restores the files and skips the folder commit when the row rewrite fails', async () => {
    builder.renameComponentRows.mockRejectedValueOnce(new Error('rows failed'));

    await expect(updateSchema(moveCard)).rejects.toThrow('rows failed');

    expect(builder.rollback).toHaveBeenCalledTimes(1);
    expect(apiHandler.rollback).toHaveBeenCalledWith('api::old.old');
    expect(contentStructure.commitFromUpdate).not.toHaveBeenCalled();
  });
});
