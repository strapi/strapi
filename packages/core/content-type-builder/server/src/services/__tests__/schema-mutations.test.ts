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
