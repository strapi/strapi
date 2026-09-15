import createPermissionsService from '../permissions';

/**
 * Which roles apply where.
 *
 * The failure this guards against is subtle and total: an administrator who may
 * work across every space still *lands* in one, and if landing there narrowed
 * them to the roles of a membership they do not have, they would arrive with no
 * permissions at all — including the permission to create the first space.
 */
describe('the role scope', () => {
  let installed: ((user: { id: number }) => Promise<unknown>) | null = null;

  const makeStrapi = ({
    scope,
    canAccessAll,
    roleIds = [7],
    hasRequest = true,
  }: {
    scope: Record<string, unknown>;
    canAccessAll: boolean;
    roleIds?: number[] | null;
    hasRequest?: boolean;
  }) =>
    ({
      requestContext: { get: () => (hasRequest ? { state: {} } : undefined) },
      service: (uid: string) =>
        ({
          'admin::permission': {
            setUserRolesScope(fn: typeof installed) {
              installed = fn;
            },
          },
          'plugin::spaces.access': {
            resolve: async () => ({ scope, canAccessAll }),
          },
          'plugin::spaces.membership': {
            getEffectiveRoleIds: async () => roleIds,
          },
        })[uid],
    }) as never;

  const install = (options: Parameters<typeof makeStrapi>[0]) => {
    installed = null;
    createPermissionsService({ strapi: makeStrapi(options) }).installRoleScope();

    return installed!;
  };

  it('narrows an ordinary member to the roles they hold in that space', async () => {
    const scope = install({ scope: { mode: 'space', id: 1, slug: 'fr' }, canAccessAll: false });

    await expect(scope({ id: 10 })).resolves.toEqual([7]);
  });

  it('leaves a member with no roles of their own on their usual ones', async () => {
    const scope = install({
      scope: { mode: 'space', id: 1, slug: 'fr' },
      canAccessAll: false,
      roleIds: null,
    });

    await expect(scope({ id: 10 })).resolves.toBeNull();
  });

  it('grants nothing to someone who is not a member of the space they are in', async () => {
    const scope = install({
      scope: { mode: 'space', id: 1, slug: 'fr' },
      canAccessAll: false,
      roleIds: [],
    });

    await expect(scope({ id: 10 })).resolves.toEqual([]);
  });

  it('does not narrow someone who may work across every space', async () => {
    // They land in the default space like everyone else, and they are not a
    // member of it. Narrowing here would leave the super admin unable to
    // administer the project that just installed Spaces.
    const scope = install({
      scope: { mode: 'space', id: 1, slug: 'fr' },
      canAccessAll: true,
      roleIds: [],
    });

    await expect(scope({ id: 1 })).resolves.toBeNull();
  });

  it('does not narrow outside a space', async () => {
    const scope = install({ scope: { mode: 'global' }, canAccessAll: true });

    await expect(scope({ id: 1 })).resolves.toBeNull();
  });

  it('does not narrow when there is no request at all', async () => {
    // The CLI, a migration, permission bookkeeping at boot: nobody is standing
    // in a space, so every role applies.
    const scope = install({
      scope: { mode: 'space', id: 1, slug: 'fr' },
      canAccessAll: false,
      hasRequest: false,
    });

    await expect(scope({ id: 10 })).resolves.toBeNull();
  });
});
