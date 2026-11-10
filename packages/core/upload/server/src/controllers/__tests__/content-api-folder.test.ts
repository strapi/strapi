import type { Context } from 'koa';
import { omit } from 'lodash';

import contentApiFolderController from '../content-api-folder';
import { getService } from '../../utils';

jest.mock('../../utils');

const mockGetService = getService as jest.MockedFunction<typeof getService>;

const rootFolder = {
  id: 1,
  documentId: 'root',
  name: 'Clients',
  path: '/1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  parent: null,
};

const nestedFolder = {
  ...rootFolder,
  id: 2,
  documentId: 'nested',
  name: 'Acme',
  path: '/1/2',
  parent: { id: 1, documentId: 'root' },
};

type Folder = typeof rootFolder | typeof nestedFolder;

const createController = (folder: Folder, sanitize: (folder: Folder) => object = (f) => f) => {
  const strapi = {
    getModel: jest.fn(() => ({})),
    contentAPI: {
      validate: { query: jest.fn() },
      sanitize: {
        query: jest.fn((query) => query),
        output: jest.fn(async (folders: Folder[]) => folders.map(sanitize)),
      },
    },
    db: { query: jest.fn(() => ({ findOne: jest.fn(async () => folder) })) },
    get: jest.fn(() => ({ transform: (_uid: string, params: object) => params })),
  };

  return contentApiFolderController({ strapi: strapi as any });
};

const findOne = async (controller: ReturnType<typeof createController>) => {
  const ctx = {
    params: { id: '1' },
    query: {},
    state: { auth: {}, route: {} },
  } as unknown as Context;

  await controller.findOne(ctx);

  return (ctx.body as { data: Record<string, unknown> }).data;
};

describe('Content API Folder Controller - findOne', () => {
  beforeEach(() => {
    mockGetService.mockImplementation(
      () =>
        ({
          getNamePaths: jest.fn(async () => ({ '/1': '/Clients', '/1/2': '/Clients/Acme' })),
        }) as any
    );
  });

  test('returns `parent: null` for a root folder', async () => {
    const data = await findOne(createController(rootFolder));

    expect(data.parent).toBeNull();
    expect(data.namePath).toBe('/Clients');
  });

  test.each([
    ['root', rootFolder],
    ['nested', nestedFolder],
  ])('leaves `parent` out of a %s folder when the sanitizer removed it', async (_, folder) => {
    const data = await findOne(createController(folder, (f) => omit(f, 'parent')));

    expect(data).not.toHaveProperty('parent');
  });

  test('leaves `namePath` out when the sanitizer removed `name`', async () => {
    const data = await findOne(createController(nestedFolder, (f) => omit(f, 'name')));

    expect(data).not.toHaveProperty('namePath');
    expect(data.parent).toEqual({ id: 1, documentId: 'root' });
  });

  test('leaves `namePath` out of a folder without a path', async () => {
    const folder = { ...rootFolder, path: null } as unknown as Folder;

    const data = await findOne(createController(folder));

    expect(data.path).toBeNull();
    expect(data).not.toHaveProperty('namePath');
  });
});
