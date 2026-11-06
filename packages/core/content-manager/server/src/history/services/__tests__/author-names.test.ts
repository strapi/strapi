import type { Core } from '@strapi/types';

import { createAuthorNames, getAdminUserName } from '../author-names';

const findMany = jest.fn();
const strapi = { db: { query: jest.fn(() => ({ findMany })) } } as unknown as Core.Strapi;

const adminUser = (id: string | null) => ({ type: 'person' as const, model: 'admin::user', id });

describe('getAdminUserName', () => {
  it.each([
    ['the username', { username: 'kai', firstname: 'Kai', lastname: 'Doe' }, 'kai'],
    [
      'the full name without a username',
      { username: null, firstname: 'Kai', lastname: 'Doe' },
      'Kai Doe',
    ],
    [
      'the email without a username or a first name',
      { username: null, firstname: null, lastname: null },
      'kai@test.com',
    ],
  ])('names the admin user with %s', (_, names, name) => {
    expect(getAdminUserName({ id: 1, email: 'kai@test.com', ...names })).toBe(name);
  });
});

describe('createAuthorNames', () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it('finds the names of a model with one query', async () => {
    findMany.mockResolvedValueOnce([
      { id: 1, username: 'kai', firstname: null, lastname: null, email: 'kai@test.com' },
      { id: 2, username: 'john', firstname: null, lastname: null, email: 'john@test.com' },
    ]);

    const withAuthorName = await createAuthorNames({ strapi })([
      adminUser('1'),
      adminUser('2'),
      adminUser('1'),
    ]);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith({
      select: ['id', 'username', 'firstname', 'lastname', 'email'],
      where: { id: { $in: ['1', '2'] } },
    });
    expect(withAuthorName(adminUser('2'))).toEqual({ ...adminUser('2'), name: 'john' });
  });

  it('gives no id and no name to a deleted author', async () => {
    findMany.mockResolvedValueOnce([]);

    const withAuthorName = await createAuthorNames({ strapi })([adminUser(null), adminUser('3')]);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { $in: ['3'] } } })
    );
    expect(withAuthorName(adminUser(null))).toEqual({ ...adminUser(null), name: null });
    expect(withAuthorName(adminUser('3'))).toEqual({ ...adminUser(null), name: null });
  });
});
