import { ACTIONS } from '../../../../shared/constants';
import admin from '../admin';

type Route = (typeof admin.routes)[number];

const routeFor = (method: string, path: string): Route => {
  const route = admin.routes.find((entry) => entry.method === method && entry.path === path);

  if (!route) {
    throw new Error(`No ${method} ${path} route.`);
  }

  return route;
};

const actionsOf = (route: Route): string[] => {
  const policy = route.config.policies.find(
    (entry): entry is { name: string; config: { actions: string[] } } =>
      typeof entry === 'object' && entry.name === 'admin::hasPermissions'
  );

  return policy?.config.actions ?? [];
};

describe('the admin routes', () => {
  it('all require an authenticated administrator', () => {
    // Not one of these is reachable without a session.
    for (const route of admin.routes) {
      expect(route.config.policies[0]).toBe('admin::isAuthenticatedAdmin');
    }
  });

  it('are all under the admin type, so they never join the content API', () => {
    expect(admin.type).toBe('admin');
  });

  describe('knowing where you may work', () => {
    it('needs only a session, because it answers from your own memberships', () => {
      const route = routeFor('GET', '/mine');

      expect(route.config.policies).toEqual(['admin::isAuthenticatedAdmin']);
    });
  });

  describe('reading the spaces of the project', () => {
    it.each([
      ['GET', '/spaces'],
      ['GET', '/settings'],
    ])('needs the read permission (%s %s)', (method, path) => {
      expect(actionsOf(routeFor(method, path))).toEqual([ACTIONS.read]);
    });
  });

  describe('changing a space', () => {
    it.each([
      ['POST', '/spaces'],
      ['PUT', '/spaces/:id'],
      ['PUT', '/spaces/:id/default'],
      ['DELETE', '/spaces/:id'],
      ['GET', '/spaces/:id/deletion-preview'],
    ])('needs the manage permission (%s %s)', (method, path) => {
      expect(actionsOf(routeFor(method, path))).toEqual([ACTIONS.manage]);
    });
  });

  describe('membership', () => {
    it.each([
      ['GET', '/spaces/:spaceId/members'],
      ['POST', '/spaces/:spaceId/members'],
      ['DELETE', '/spaces/:spaceId/members/:userId'],
    ])('needs the members permission (%s %s)', (method, path) => {
      expect(actionsOf(routeFor(method, path))).toEqual([ACTIONS.manageMembers]);
    });

    it('listing candidates needs permission over users as well', () => {
      // It reads the platform's identities, not just this space.
      expect(actionsOf(routeFor('GET', '/spaces/:spaceId/members/candidates'))).toEqual([
        ACTIONS.manageMembers,
        'admin::users.read',
      ]);
    });
  });

  describe('reading which space owns what', () => {
    it('needs permission to see across spaces', () => {
      // It deliberately reads past the caller's own space.
      expect(actionsOf(routeFor('GET', '/ownership'))).toEqual([ACTIONS.accessAll]);
    });
  });

  it('leaves no route behind a session alone except /mine', () => {
    const sessionOnly = admin.routes
      .filter((route) => actionsOf(route).length === 0)
      .map((route) => route.path);

    expect(sessionOnly).toEqual(['/mine']);
  });
});
