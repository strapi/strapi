import { errors } from '@strapi/utils';
import type Koa from 'koa';
import type { Core, UID } from '@strapi/types';

import { PER_USER_CACHE_CONTROL, PLUGIN_ID, PROFILE_UID, USER_UID } from '../constants';
import type profileService from '../services/profile';
import type userService from '../services/user';

/**
 * What the core controllers of the user type give: the query and input checks and the output
 * sanitizing every Content API entry point runs, for the type it belongs to. The profile routes use
 * the profile type's `transformResponse` only: their checks run with the profile's own actions.
 */
interface CoreController {
  validateQuery(ctx: Koa.Context): Promise<void>;
  sanitizeQuery(ctx: Koa.Context): Promise<Record<string, unknown>>;
  validateInput(data: unknown, ctx: Koa.Context): Promise<void>;
  sanitizeInput(data: unknown, ctx: Koa.Context): Promise<Record<string, unknown>>;
  sanitizeOutput(data: unknown, ctx: Koa.Context): Promise<unknown>;
  transformResponse(data: unknown, meta?: unknown): unknown;
}

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * `GET /api/users/me`, `GET|PUT /api/users/me/profile`: the signed-in user and their own profile,
 * for a front end that does not know their `documentId`.
 *
 * The caller is whoever the strategy put on the request, and nothing the request says: not a path
 * parameter, not a filter, not a `user` in a body. The same checks as the core routes run on what
 * the request does say (query, input, output), for the type each route answers with. Every answer,
 * a refusal included, carries `Cache-Control: private, no-store`.
 */
const meController = ({ strapi }: { strapi: Core.Strapi }) => {
  const plugin = () => strapi.plugin(PLUGIN_ID);
  const core = (uid: string) =>
    strapi.controller(uid as UID.Controller) as unknown as CoreController;

  /**
   * The options the core controllers give the content API (`getContentAPIOptions`), with the
   * profile's own action: the route's handler is `findProfile`, which no row of the profile type
   * holds. `route` and `strictParams` stay, or the extra params of a route and `api.rest.strictParams`
   * would not apply to these routes.
   */
  const profileOptions = (ctx: Koa.Context, action: 'findOne' | 'update') => {
    const strictParams = strapi.config.get('api.rest.strictParams');

    return {
      auth: (ctx.state?.auth as unknown) ?? {},
      action,
      route: ctx.state?.route,
      ...(typeof strictParams === 'boolean' ? { strictParams } : {}),
    };
  };

  const profileSchema = () => strapi.contentType(PROFILE_UID);

  /**
   * For the output: the profile is found by who the caller is, in this controller's code, and not
   * through the caller's `find` filter, so nothing says it matches a conditioned `findOne` row. Each
   * conditional field group is checked against the profile itself (`unfiltered`).
   */
  const profileOutputOptions = (options: ReturnType<typeof profileOptions>) => ({
    ...options,
    action: 'findOne' as const,
    unfiltered: true,
  });

  /** A request that is not a signed-in end user (an API token, say) has no `me`. */
  const caller = (ctx: Koa.Context): string => {
    const { documentId } = (ctx.state?.user ?? {}) as { documentId?: unknown };

    if (typeof documentId !== 'string' || documentId === '') {
      throw new errors.UnauthorizedError();
    }

    return documentId;
  };

  return {
    async find(ctx: Koa.Context) {
      ctx.set('Cache-Control', PER_USER_CACHE_CONTROL);

      const userDocumentId = caller(ctx);
      const users = core(USER_UID);

      await users.validateQuery(ctx);

      const query = await users.sanitizeQuery(ctx);
      const user = await (plugin().service('user') as ReturnType<typeof userService>).findMe(
        userDocumentId,
        query
      );

      if (!user) {
        throw new errors.NotFoundError('User not found');
      }

      return users.transformResponse(await users.sanitizeOutput(user, ctx));
    },

    async findProfile(ctx: Koa.Context) {
      ctx.set('Cache-Control', PER_USER_CACHE_CONTROL);

      const userDocumentId = caller(ctx);
      const { contentAPI } = strapi;
      const schema = profileSchema();
      const options = profileOptions(ctx, 'findOne');

      await contentAPI.validate.query(ctx.query, schema, options);

      const query = await contentAPI.sanitize.query(ctx.query, schema, options);
      const profile = await (
        plugin().service('profile') as ReturnType<typeof profileService>
      ).findForUser(userDocumentId, query);

      if (!profile) {
        throw new errors.NotFoundError('Profile not found');
      }

      return core(PROFILE_UID).transformResponse(
        await contentAPI.sanitize.output(profile, schema, profileOutputOptions(options))
      );
    },

    async updateProfile(ctx: Koa.Context) {
      ctx.set('Cache-Control', PER_USER_CACHE_CONTROL);

      const userDocumentId = caller(ctx);
      const { contentAPI } = strapi;
      const schema = profileSchema();
      const options = profileOptions(ctx, 'update');
      const profiles = plugin().service('profile') as ReturnType<typeof profileService>;

      await contentAPI.validate.query(ctx.query, schema, options);

      const query = await contentAPI.sanitize.query(ctx.query, schema, options);
      const body = (ctx.request as { body?: unknown }).body;
      const data = isPlain(body) ? body.data : undefined;

      if (!isPlain(data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      // The caller's own profile, which the rules of the update must let them write: found before
      // the body is held to the update's fields, so a 400 never tells who has a profile
      const own = await profiles.findForUser(userDocumentId, { fields: ['documentId'] });

      if (!own) {
        throw new errors.NotFoundError('Profile not found');
      }

      await contentAPI.permissions.assertEntry(options.auth, 'update', PROFILE_UID, own.documentId);

      const inputOptions = { ...options, documentId: own.documentId };

      await contentAPI.validate.input(data, schema, inputOptions);

      const input = await contentAPI.sanitize.input(data, schema, inputOptions);

      // Judged as the core route is: the data written must match the caller's conditions for the
      // update, in the transaction that wrote it, so a mismatch leaves nothing behind
      const profile = await strapi.db.transaction(async () => {
        const written = await profiles.updateForUser(userDocumentId, { ...query, data: input });

        await contentAPI.permissions.assertWritten(
          options.auth,
          'update',
          PROFILE_UID,
          own.documentId,
          {}
        );

        return written;
      });

      // What the caller reads of it is the profile's `findOne` fields
      return core(PROFILE_UID).transformResponse(
        await contentAPI.sanitize.output(profile, schema, profileOutputOptions(options))
      );
    },
  };
};

export default meController;
