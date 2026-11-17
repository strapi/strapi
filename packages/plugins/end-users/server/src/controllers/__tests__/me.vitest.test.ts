import { describe, expect, it, vi } from 'vitest';
import type Koa from 'koa';

import { PLUGIN_ID, PROFILE_UID, USER_UID } from '../../constants';
import meController from '../me';
import { createTransaction, fakeStrapi } from '../../__tests__/utils/fake-strapi';

const makeCore = (name: string) => ({
  validateQuery: vi.fn(async () => {}),
  sanitizeQuery: vi.fn(async () => ({ fields: [`${name}-field`] })),
  validateInput: vi.fn(async () => {}),
  sanitizeInput: vi.fn(async (data: object) => ({ ...data, sanitized: true })),
  sanitizeOutput: vi.fn(async (data: object) => ({ ...data, clean: true })),
  transformResponse: vi.fn((data: object) => ({ data, meta: {} })),
});

const PROFILE_SCHEMA = { uid: PROFILE_UID, modelType: 'contentType' };
const AUTH = { strategy: { name: 'end-users' }, credentials: { id: 1 } };
const ROUTE = {
  method: 'GET',
  path: '/users/me/profile',
  handler: 'plugin::end-users.me.findProfile',
};

const setup = (strictParams: unknown = undefined) => {
  const users = makeCore('user');
  const profiles = makeCore('profile');
  // What the profile routes call directly, with the options the core controllers would build
  const contentAPI = {
    validate: {
      query: vi.fn<(query: unknown, schema: unknown, options: unknown) => Promise<void>>(
        async () => {}
      ),
      input: vi.fn<(data: unknown, schema: unknown, options: unknown) => Promise<void>>(
        async () => {}
      ),
    },
    sanitize: {
      query: vi.fn<(query: unknown, schema: unknown, options: unknown) => Promise<object>>(
        async () => ({ fields: ['profile-field'] })
      ),
      input: vi.fn<(data: unknown, schema: unknown, options: unknown) => Promise<object>>(
        async (data) => ({ ...(data as object), sanitized: true })
      ),
      output: vi.fn<(data: unknown, schema: unknown, options: unknown) => Promise<object>>(
        async (data) => ({ ...(data as object), clean: true })
      ),
    },
    permissions: {
      assertEntry: vi.fn<
        (auth: unknown, action: string, uid: string, documentId: string) => Promise<void>
      >(async () => {}),
      assertWritten: vi.fn<
        (
          auth: unknown,
          action: string,
          uid: string,
          documentId: string,
          scope: object
        ) => Promise<void>
      >(async () => {}),
    },
  };
  const userService = { findMe: vi.fn(async () => ({ documentId: 'user-1', email: 'a@x.io' })) };
  const profileService = {
    findForUser: vi.fn(async () => ({ documentId: 'profile-1', company: 'Acme' })),
    updateForUser: vi.fn(async () => ({ documentId: 'profile-1', company: 'New' })),
  };

  const service = vi.fn((name: string) => (name === 'user' ? userService : profileService));
  const plugin = vi.fn(() => ({ service }));
  const controller = vi.fn((uid: string) => (uid === USER_UID ? users : profiles));
  const strapi = fakeStrapi({
    plugin,
    controller,
    contentAPI,
    contentType: vi.fn(() => PROFILE_SCHEMA),
    // Runs the callback as the real one does: a throw inside it rejects the whole write
    db: { transaction: createTransaction().transaction },
    config: {
      get: vi.fn((key: string) => (key === 'api.rest.strictParams' ? strictParams : undefined)),
    },
  });

  const me = meController({ strapi });

  const ctx = (overrides: Record<string, unknown> = {}) => {
    // Koa's `ctx.set(field, value)`, keeping what was set so a test can read the headers
    const headers: Record<string, string> = {};

    return {
      query: { populate: 'user' },
      state: { user: { documentId: 'user-1' }, auth: AUTH, route: ROUTE },
      request: { body: undefined },
      response: { headers },
      set: vi.fn((field: string, value: string) => {
        headers[field.toLowerCase()] = value;
      }),
      ...overrides,
    } as unknown as Koa.Context;
  };

  return {
    me,
    ctx,
    users,
    profiles,
    contentAPI,
    userService,
    profileService,
    plugin,
    service,
    controller,
  };
};

describe('me controller', () => {
  describe('the answers are the caller`s own', () => {
    const headersOf = (c: Koa.Context) =>
      (c.response as { headers: Record<string, string> }).headers;

    it.each(['find', 'findProfile', 'updateProfile'] as const)(
      '%s tells every cache not to keep them',
      async (name) => {
        const { me, ctx } = setup();
        const c = ctx({ request: { body: { data: { company: 'New' } } } });

        await me[name](c);

        expect(headersOf(c)['cache-control']).toBe('private, no-store');
      }
    );

    it.each(['find', 'findProfile', 'updateProfile'] as const)(
      '%s says so on a refusal too',
      async (name) => {
        const { me, ctx } = setup();
        const c = ctx({ state: {} });

        await expect(me[name](c)).rejects.toMatchObject({ name: 'UnauthorizedError' });
        expect(headersOf(c)['cache-control']).toBe('private, no-store');
      }
    );
  });

  describe('find', () => {
    it('answers the signed-in user, sanitized by the user type`s own rules', async () => {
      const { me, ctx, users, userService, controller, plugin, service } = setup();
      const c = ctx();

      const answer = await me.find(c);

      expect(controller).toHaveBeenCalledWith(USER_UID);
      expect(plugin).toHaveBeenCalledWith(PLUGIN_ID);
      expect(service).toHaveBeenCalledWith('user');
      expect(users.validateQuery).toHaveBeenCalledWith(c);
      expect(users.sanitizeQuery).toHaveBeenCalledWith(c);
      expect(userService.findMe).toHaveBeenCalledWith('user-1', { fields: ['user-field'] });
      expect(users.sanitizeOutput).toHaveBeenCalledWith(
        { documentId: 'user-1', email: 'a@x.io' },
        c
      );
      expect(answer).toEqual({
        data: { documentId: 'user-1', email: 'a@x.io', clean: true },
        meta: {},
      });
    });

    it('is the caller the strategy found, and no one a request names', async () => {
      const { me, ctx, userService } = setup();

      await me.find(ctx({ params: { id: 'someone-else' }, query: { documentId: 'someone-else' } }));

      expect(userService.findMe).toHaveBeenCalledWith('user-1', expect.anything());
    });

    it('is a 404 when the user is gone', async () => {
      const { me, ctx, userService, users } = setup();

      userService.findMe.mockResolvedValueOnce(null as never);

      await expect(me.find(ctx())).rejects.toMatchObject({ name: 'NotFoundError' });
      expect(users.sanitizeOutput).not.toHaveBeenCalled();
    });

    it.each([
      ['no user on the request, an API token for instance', {}],
      ['a user with no documentId', { user: {} }],
      ['an empty documentId', { user: { documentId: '' } }],
      ['a documentId that is not a string', { user: { documentId: 3 } }],
    ])('is a 401 for %s, and looks nothing up', async (_name, state) => {
      const { me, ctx, userService, users } = setup();

      await expect(me.find(ctx({ state }))).rejects.toMatchObject({ name: 'UnauthorizedError' });
      expect(userService.findMe).not.toHaveBeenCalled();
      expect(users.validateQuery).not.toHaveBeenCalled();
    });

    it('refuses a query the core check refuses, before looking anything up', async () => {
      const { me, ctx, users, userService } = setup();

      users.validateQuery.mockRejectedValueOnce(new Error('Invalid key populate'));

      await expect(me.find(ctx())).rejects.toThrow('Invalid key populate');
      expect(userService.findMe).not.toHaveBeenCalled();
    });
  });

  describe('findProfile', () => {
    it('answers the caller`s own profile, checked and sanitized by the profile type`s findOne rules', async () => {
      const { me, ctx, profiles, contentAPI, profileService, controller, service } = setup();
      const c = ctx();
      const options = { auth: AUTH, action: 'findOne', route: ROUTE };

      const answer = await me.findProfile(c);

      expect(controller).toHaveBeenCalledWith(PROFILE_UID);
      expect(service).toHaveBeenCalledWith('profile');
      expect(contentAPI.validate.query).toHaveBeenCalledWith(c.query, PROFILE_SCHEMA, options);
      expect(contentAPI.sanitize.query).toHaveBeenCalledWith(c.query, PROFILE_SCHEMA, options);
      expect(profileService.findForUser).toHaveBeenCalledWith('user-1', {
        fields: ['profile-field'],
      });
      // Found by who the caller is, not through their `find` filter: no group is taken as matched
      expect(contentAPI.sanitize.output).toHaveBeenCalledWith(
        { documentId: 'profile-1', company: 'Acme' },
        PROFILE_SCHEMA,
        { ...options, unfiltered: true }
      );
      expect(profiles.transformResponse).toHaveBeenCalledOnce();
      expect(answer).toEqual({
        data: { documentId: 'profile-1', company: 'Acme', clean: true },
        meta: {},
      });
    });

    it('does not take the route`s handler for the action: findProfile holds no row', async () => {
      const { me, ctx, contentAPI } = setup();

      await me.findProfile(ctx());

      for (const call of [
        contentAPI.validate.query.mock.calls[0],
        contentAPI.sanitize.query.mock.calls[0],
        contentAPI.sanitize.output.mock.calls[0],
      ]) {
        expect(call[2]).toMatchObject({ action: 'findOne' });
      }
    });

    it.each([true, false])('passes route and strictParams %s with the action', async (strict) => {
      const { me, ctx, contentAPI } = setup(strict);

      await me.findProfile(ctx());

      for (const call of [
        contentAPI.validate.query.mock.calls[0],
        contentAPI.sanitize.query.mock.calls[0],
      ]) {
        expect(call[2]).toEqual({
          auth: AUTH,
          action: 'findOne',
          route: ROUTE,
          strictParams: strict,
        });
      }

      expect(contentAPI.sanitize.output.mock.calls[0][2]).toEqual({
        auth: AUTH,
        action: 'findOne',
        route: ROUTE,
        strictParams: strict,
        unfiltered: true,
      });
    });

    it('checks the profile against each conditional field group: only its output is unfiltered', async () => {
      const { me, ctx, contentAPI } = setup();

      await me.findProfile(ctx());
      await me.updateProfile(ctx({ request: { body: { data: { company: 'New' } } } }));

      expect(contentAPI.sanitize.output.mock.calls.map(([, , options]) => options)).toEqual([
        expect.objectContaining({ action: 'findOne', unfiltered: true }),
        expect.objectContaining({ action: 'findOne', unfiltered: true }),
      ]);

      for (const [, , options] of [
        ...contentAPI.validate.query.mock.calls,
        ...contentAPI.sanitize.query.mock.calls,
        ...contentAPI.validate.input.mock.calls,
        ...contentAPI.sanitize.input.mock.calls,
      ]) {
        expect(options).not.toHaveProperty('unfiltered');
      }
    });

    it.each([undefined, 'true', 1, null])(
      'leaves strictParams out when it is %s',
      async (strict) => {
        const { me, ctx, contentAPI } = setup(strict);

        await me.findProfile(ctx());

        expect(contentAPI.validate.query.mock.calls[0][2]).not.toHaveProperty('strictParams');
      }
    );

    it('refuses a query the content API refuses, before looking anything up', async () => {
      const { me, ctx, contentAPI, profileService } = setup();

      contentAPI.validate.query.mockRejectedValueOnce(new Error('Invalid key secret'));

      await expect(me.findProfile(ctx())).rejects.toThrow('Invalid key secret');
      expect(profileService.findForUser).not.toHaveBeenCalled();
    });

    it('is a 404 when the user has no profile', async () => {
      const { me, ctx, profileService, contentAPI } = setup();

      profileService.findForUser.mockResolvedValueOnce(null as never);

      await expect(me.findProfile(ctx())).rejects.toMatchObject({ name: 'NotFoundError' });
      expect(contentAPI.sanitize.output).not.toHaveBeenCalled();
    });

    it('is a 401 without a signed-in user', async () => {
      const { me, ctx, profileService } = setup();

      await expect(me.findProfile(ctx({ state: {} }))).rejects.toMatchObject({
        name: 'UnauthorizedError',
      });
      expect(profileService.findForUser).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    const withBody = (ctx: ReturnType<typeof setup>['ctx'], body: unknown) =>
      ctx({ request: { body } });

    const UPDATE = { auth: AUTH, action: 'update', route: ROUTE };

    it('updates the caller`s own profile with the sanitized input, and answers it sanitized', async () => {
      const { me, ctx, contentAPI, profileService } = setup();
      const c = withBody(ctx, { data: { company: 'New' } });
      const options = { ...UPDATE, documentId: 'profile-1' };

      const answer = await me.updateProfile(c);

      expect(contentAPI.validate.query).toHaveBeenCalledWith(c.query, PROFILE_SCHEMA, UPDATE);
      expect(contentAPI.sanitize.query).toHaveBeenCalledWith(c.query, PROFILE_SCHEMA, UPDATE);
      expect(contentAPI.validate.input).toHaveBeenCalledWith(
        { company: 'New' },
        PROFILE_SCHEMA,
        options
      );
      expect(contentAPI.sanitize.input).toHaveBeenCalledWith(
        { company: 'New' },
        PROFILE_SCHEMA,
        options
      );
      expect(profileService.updateForUser).toHaveBeenCalledWith('user-1', {
        fields: ['profile-field'],
        data: { company: 'New', sanitized: true },
      });
      expect(answer).toEqual({
        data: { documentId: 'profile-1', company: 'New', clean: true },
        meta: {},
      });
    });

    it('passes action update and checks the caller`s profile with assertEntry', async () => {
      const { me, ctx, contentAPI, profileService } = setup();

      await me.updateProfile(withBody(ctx, { data: { company: 'New' } }));

      expect(profileService.findForUser).toHaveBeenCalledWith('user-1', { fields: ['documentId'] });
      expect(contentAPI.permissions.assertEntry).toHaveBeenCalledWith(
        AUTH,
        'update',
        PROFILE_UID,
        'profile-1'
      );
      // Before the body is held to the update's fields, and before anything is written
      expect(contentAPI.permissions.assertEntry.mock.invocationCallOrder[0]).toBeLessThan(
        contentAPI.validate.input.mock.invocationCallOrder[0]
      );
      expect(contentAPI.validate.input.mock.invocationCallOrder[0]).toBeLessThan(
        profileService.updateForUser.mock.invocationCallOrder[0]
      );
    });

    it('judges the written profile in the transaction that wrote it, and fails with the write', async () => {
      const { me, ctx, contentAPI, profileService } = setup();

      await me.updateProfile(withBody(ctx, { data: { company: 'New' } }));

      expect(contentAPI.permissions.assertWritten).toHaveBeenCalledWith(
        AUTH,
        'update',
        PROFILE_UID,
        'profile-1',
        {}
      );
      expect(profileService.updateForUser.mock.invocationCallOrder[0]).toBeLessThan(
        contentAPI.permissions.assertWritten.mock.invocationCallOrder[0]
      );

      contentAPI.permissions.assertWritten.mockRejectedValueOnce(
        Object.assign(new Error('This change is outside what your role allows.'), {
          name: 'PolicyError',
        })
      );

      await expect(
        me.updateProfile(withBody(ctx, { data: { plan: 'pro' } }))
      ).rejects.toMatchObject({ name: 'PolicyError' });
    });

    it('answers with the profile`s findOne fields', async () => {
      const { me, ctx, contentAPI } = setup();

      await me.updateProfile(withBody(ctx, { data: { company: 'New' } }));

      expect(contentAPI.sanitize.output).toHaveBeenCalledWith(
        { documentId: 'profile-1', company: 'New' },
        PROFILE_SCHEMA,
        { ...UPDATE, action: 'findOne', unfiltered: true }
      );
    });

    it('passes route and strictParams with the action', async () => {
      const { me, ctx, contentAPI } = setup(true);

      await me.updateProfile(withBody(ctx, { data: { company: 'New' } }));

      for (const call of [
        contentAPI.validate.query.mock.calls[0],
        contentAPI.sanitize.query.mock.calls[0],
        contentAPI.validate.input.mock.calls[0],
        contentAPI.sanitize.input.mock.calls[0],
        contentAPI.sanitize.output.mock.calls[0],
      ]) {
        expect(call[call.length - 1]).toMatchObject({
          auth: AUTH,
          route: ROUTE,
          strictParams: true,
        });
      }
    });

    it('is a 404 and writes nothing when the caller`s rules do not let them update the profile', async () => {
      const { me, ctx, contentAPI, profileService } = setup();

      contentAPI.permissions.assertEntry.mockRejectedValueOnce(
        Object.assign(new Error('Not Found'), { name: 'NotFoundError' })
      );

      await expect(
        me.updateProfile(withBody(ctx, { data: { newsletter: true } }))
      ).rejects.toMatchObject({ name: 'NotFoundError' });
      expect(contentAPI.validate.input).not.toHaveBeenCalled();
      expect(profileService.updateForUser).not.toHaveBeenCalled();
    });

    it('is a 404 when the user has no profile', async () => {
      const { me, ctx, profileService, contentAPI } = setup();

      profileService.findForUser.mockResolvedValueOnce(null as never);

      await expect(
        me.updateProfile(withBody(ctx, { data: { company: 'New' } }))
      ).rejects.toMatchObject({ name: 'NotFoundError' });
      expect(contentAPI.permissions.assertEntry).not.toHaveBeenCalled();
      expect(profileService.updateForUser).not.toHaveBeenCalled();
    });

    it('checks the input before it sanitizes it, and writes nothing when the check fails', async () => {
      const { me, ctx, contentAPI, profileService } = setup();

      contentAPI.validate.input.mockRejectedValueOnce(new Error('Invalid key newsletter'));

      await expect(me.updateProfile(withBody(ctx, { data: { newsletter: true } }))).rejects.toThrow(
        'Invalid key newsletter'
      );
      expect(contentAPI.sanitize.input).not.toHaveBeenCalled();
      expect(profileService.updateForUser).not.toHaveBeenCalled();
    });

    it.each([
      ['no body', undefined],
      ['a body with no data', {}],
      ['data that is not an object', { data: 'company=New' }],
      ['data that is a list', { data: [] }],
      ['a body that is not an object', 'company=New'],
    ])('refuses %s', async (_name, body) => {
      const { me, ctx, profileService } = setup();

      await expect(me.updateProfile(withBody(ctx, body))).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Missing "data" payload in the request body',
      });
      expect(profileService.updateForUser).not.toHaveBeenCalled();
    });

    it('is a 401 without a signed-in user, and reads nothing of the body', async () => {
      const { me, ctx, profileService, contentAPI } = setup();

      await expect(
        me.updateProfile(ctx({ state: {}, request: { body: { data: { company: 'x' } } } }))
      ).rejects.toMatchObject({ name: 'UnauthorizedError' });
      expect(contentAPI.validate.input).not.toHaveBeenCalled();
      expect(profileService.updateForUser).not.toHaveBeenCalled();
    });
  });
});
