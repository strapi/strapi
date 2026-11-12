import type { Context } from 'koa';
import { errors } from '@strapi/utils';

import adminFolderController from '../admin-folder';

jest.mock('../../utils');

describe('Admin Folder Controller - find', () => {
  const folders = [{ id: 1 }, { id: 2 }];
  const pagination = { page: 1, pageSize: 10, pageCount: 1, total: 2 };

  let findMany: jest.Mock;
  let findPage: jest.Mock;
  let transform: jest.Mock;
  let ctx: Partial<Context>;

  // `query` is what the client sent, `dbQuery` what the query transform turns
  // it into (the transform itself is covered in @strapi/utils).
  const call = (query: Record<string, unknown>, dbQuery: Record<string, unknown>) => {
    ctx = { query, state: { userAbility: {} } } as Partial<Context>;
    transform.mockReturnValue(dbQuery);

    return adminFolderController.find(ctx as Context);
  };

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue(folders);
    findPage = jest.fn().mockResolvedValue({ results: folders, pagination });
    transform = jest.fn();

    const permissionsManager = {
      validateQuery: jest.fn(),
      sanitizeQuery: jest.fn((query) => query),
      sanitizeOutput: jest.fn((data) => data),
    };

    global.strapi = {
      admin: {
        services: {
          permission: {
            createPermissionsManager: jest.fn().mockReturnValue(permissionsManager),
          },
        },
      },
      get: jest.fn().mockReturnValue({ transform }),
      db: { query: jest.fn().mockReturnValue({ findMany, findPage }) },
    } as any;
  });

  it('returns every folder without pagination metadata when no page is requested', async () => {
    await call({}, {});

    expect(findMany).toHaveBeenCalled();
    expect(findPage).not.toHaveBeenCalled();
    expect(ctx.body).toEqual({ data: folders });
  });

  it('returns one page with pagination metadata when page or pageSize is sent', async () => {
    await call({ pageSize: '10' }, { pageSize: 10 });

    expect(findPage).toHaveBeenCalledWith({ pageSize: 10 });
    expect(findMany).not.toHaveBeenCalled();
    expect(ctx.body).toEqual({ data: folders, pagination });
  });

  it('accepts values at the edge of the safe integer range', async () => {
    await call({ page: '2', pageSize: '1' }, { page: 2, pageSize: Number.MAX_SAFE_INTEGER });
    await call({ start: '1', limit: '1' }, { offset: Number.MAX_SAFE_INTEGER, limit: 1 });

    expect(findPage).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['pageSize', { pageSize: '1e20' }, { pageSize: 1e20 }],
    ['page offset', { page: '1e9', pageSize: '1e9' }, { page: 1e9, pageSize: 1e9 }],
    ['limit', { limit: '1e20' }, { limit: 1e20 }],
    ['start', { start: '1e20', limit: '1' }, { offset: 1e20, limit: 1 }],
  ])('rejects a %s past the safe integer range', async (_, query, dbQuery) => {
    await expect(call(query, dbQuery)).rejects.toBeInstanceOf(errors.PaginationError);

    expect(findMany).not.toHaveBeenCalled();
    expect(findPage).not.toHaveBeenCalled();
  });
});
