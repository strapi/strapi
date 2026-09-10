import { workspaceSchemaAccessMiddleware } from '../schemaAccessMiddleware';

import { getCurrentSpaceSlug } from '../../utils/currentSpace';

jest.mock('../../utils/currentSpace', () => ({
  DEFAULT_SPACE_SLUG: 'default',
  getCurrentSpaceSlug: jest.fn(() => 'acme'),
}));

const PERMISSIONS = [
  { action: 'plugin::content-type-builder.read', subject: null },
  { action: 'plugin::content-manager.explorer.read', subject: 'api::article.article' },
  { action: 'plugin::spaces.read', subject: null },
] as never[];

const run = (permissions = PERMISSIONS) => {
  const next = jest.fn(async (result) => result);
  return workspaceSchemaAccessMiddleware({ pathname: '/content-manager' } as never)(next as never)(
    permissions
  );
};

describe('workspaceSchemaAccessMiddleware', () => {
  it('takes the schema away outside the default workspace', async () => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('acme');

    const result = (await run()) as typeof PERMISSIONS;

    expect(result.map((permission: any) => permission.action)).toEqual([
      'plugin::content-manager.explorer.read',
      'plugin::spaces.read',
    ]);
  });

  it('leaves the default workspace alone', async () => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('default');

    const result = (await run()) as typeof PERMISSIONS;

    expect(result).toHaveLength(3);
  });
});
