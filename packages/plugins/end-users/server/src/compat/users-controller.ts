import { errors } from '@strapi/utils';
import type Koa from 'koa';
import type { Core, Struct } from '@strapi/types';

import { PER_USER_CACHE_CONTROL, PLUGIN_ID, PROFILE_UID, USER_UID } from '../constants';
import type profileService from '../services/profile';
import { readCompatConfig } from './config';
import { invalidParameters, missingFieldBody } from './errors';
import { toUpRole, toUpUser, translateRoleQuery } from './shapes';
import type { UpRole, UpUser, UpUserSource } from './shapes';
import { loadUserExtras, splitUserWrites } from './user-extras';

type Plain = Record<string, unknown>;

/** What the core controller of the user type gives: the output sanitizing every action runs. */
interface CoreController {
  sanitizeOutput(data: unknown, ctx: Koa.Context): Promise<unknown>;
}

interface Documents {
  create(params: Plain): Promise<{ documentId: string }>;
  update(params: Plain): Promise<unknown>;
  delete(params: Plain): Promise<unknown>;
  count(params: Plain): Promise<number>;
}

interface UserEntries {
  find(query: Plain): Promise<{ results: Plain[] }>;
  findOne(documentId: string, query: Plain): Promise<Plain | null>;
}

type QueryAction = 'find' | 'findOne';

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A numeric id as a URL gives it; a `documentId` is never this short a run of digits. */
const NUMERIC_ID = /^\d{1,15}$/;

const NOT_FOUND = 'User not found';

export const isUsersCompat = (strapi: Core.Strapi): boolean =>
  readCompatConfig(strapi).usersPermissions;

/**
 * Runs the Users & Permissions shaped action while that mode is on, and the core one otherwise, so
 * a route answers in the shape of the mode the application is in.
 */
export const compatOr = <T>(strapi: Core.Strapi, compat: () => T, core: () => T): T =>
  isUsersCompat(strapi) ? compat() : core();

/**
 * The part of a query that asks for the user's role, which users-permissions populates and the
 * engine does not (the engine's relation is `roles`, and its output is shaped from a lookup of its
 * own). `role` alone is taken out of the populate and reported; a populate that goes below it
 * (`role.users`) is renamed with the rest of the query, and the engine answers for it.
 */
export const splitRoleQuery = (
  query: Record<string, unknown>
): { query: Record<string, unknown>; wantsRole: boolean } => {
  const { populate, ...rest } = query;
  let wantsRole = false;
  let kept: unknown = populate;

  const tokensOf = (value: string) => value.split(',').map((token) => token.trim());
  const isRole = (token: unknown) => token === 'role';
  const mentionsRole = (token: unknown) =>
    typeof token === 'string' && (token === '*' || token === 'role' || token.startsWith('role.'));

  if (typeof populate === 'string') {
    const tokens = tokensOf(populate);

    wantsRole = tokens.some(mentionsRole);
    kept = tokens.filter((token) => !isRole(token)).join(',') || undefined;
  } else if (Array.isArray(populate)) {
    const tokens = populate.flatMap((entry) =>
      typeof entry === 'string' ? tokensOf(entry) : [entry]
    );

    wantsRole = tokens.some(mentionsRole);
    kept = tokens.filter((token) => !isRole(token));

    if ((kept as unknown[]).length === 0) {
      kept = undefined;
    }
  } else if (isPlain(populate) && 'role' in populate) {
    const { role, ...others } = populate;

    wantsRole = true;
    // A nested populate stays, and is renamed to the engine's relation with the rest
    kept = isPlain(role) && 'populate' in role ? populate : others;

    if (Object.keys(kept as Plain).length === 0) {
      kept = undefined;
    }
  }

  const out: Record<string, unknown> = kept === undefined ? rest : { ...rest, populate: kept };

  return { query: translateRoleQuery(out), wantsRole };
};

/**
 * The `/api/users*` actions in the shapes Users & Permissions answered with: a bare list, a bare
 * count, a bare user with a numeric `id` next to its `documentId`, the profile's readable fields
 * merged into it, and a `role` only where one was asked for. The checks the core controller runs
 * (query, input, output, the rules of the caller's role) run here too, on the same content API
 * entry points.
 */
export const createUsersCompat = (strapi: Core.Strapi) => {
  const core = () => strapi.controller(USER_UID as never) as unknown as CoreController;
  const profiles = () =>
    strapi.plugin(PLUGIN_ID).service('profile') as ReturnType<typeof profileService>;
  const userSchema = () => strapi.contentType(USER_UID) as Struct.ContentTypeSchema;
  const profileSchema = () => strapi.contentType(PROFILE_UID) as Struct.ContentTypeSchema;
  const documents = () => strapi.documents(USER_UID as never) as unknown as Documents;
  const entries = () => strapi.service(USER_UID as never) as unknown as UserEntries;

  /** What the core controllers hand the content API: the caller, the route and the action. */
  const options = (ctx: Koa.Context, action: string) => {
    const strictParams = strapi.config.get('api.rest.strictParams');

    return {
      auth: (ctx.state?.auth as unknown) ?? {},
      action,
      route: ctx.state?.route,
      ...(typeof strictParams === 'boolean' ? { strictParams } : {}),
    };
  };

  /** Whether a sanitized populate still asks for the engine's `roles` relation. */
  const populatesRoles = (populate: unknown): boolean => {
    if (typeof populate === 'string') {
      return populate.split(',').some((token) => /^roles(\.|$)/.test(token.trim()));
    }

    if (Array.isArray(populate)) {
      return populate.some(populatesRoles);
    }

    return isPlain(populate) && 'roles' in populate;
  };

  /**
   * The query, checked and sanitized as the core controller does. The role is asked for as the
   * engine's `roles` relation and goes through the sanitizer with the caller's auth, so a caller who
   * may not read roles has the populate dropped like any other they may not read. Only `/users/me`
   * (`ownRole`) loads the caller's own role without that check: it is no secret from them.
   */
  const readQuery = async (ctx: Koa.Context, action: QueryAction, ownRole = false) => {
    const raw = (ctx.query ?? {}) as Record<string, unknown>;
    const { query, wantsRole } = splitRoleQuery(raw);
    const opts = options(ctx, action);

    await strapi.contentAPI.validate.query(query, userSchema(), opts as never);

    const sanitized = (await strapi.contentAPI.sanitize.query(
      translateRoleQuery(raw),
      userSchema(),
      opts as never
    )) as Plain;

    return {
      query: sanitized,
      wantsRole: ownRole ? wantsRole : populatesRoles(sanitized.populate),
    };
  };

  /** The `documentId` a numeric id or a `documentId` names, or `null` when no user has it. */
  const resolve = async (id: unknown): Promise<string | null> => {
    const key = String(id ?? '');

    if (key === '') {
      return null;
    }

    if (!NUMERIC_ID.test(key)) {
      return key;
    }

    const found = (await strapi.db
      .query(USER_UID)
      .findOne({ where: { id: Number(key) }, select: ['documentId'] })) as {
      documentId: string;
    } | null;

    return found?.documentId ?? null;
  };

  /**
   * What the engine stores that the payload shows and the output rules hide: whether the email is
   * confirmed and whether the user is blocked (both private or engine-owned to the core payload),
   * and, when asked for, the first role of the user as users-permissions shows its one role.
   */
  const loadStored = async (
    documentIds: string[],
    withRoles: boolean
  ): Promise<Map<string, { emailVerified: boolean; banned: boolean; role?: UpRole | null }>> => {
    const stored = new Map<
      string,
      { emailVerified: boolean; banned: boolean; role?: UpRole | null }
    >();

    if (documentIds.length === 0) {
      return stored;
    }

    const rows = (await strapi.db.query(USER_UID).findMany({
      where: { documentId: { $in: documentIds } },
      select: ['documentId', 'emailVerified', 'banned'],
      ...(withRoles && {
        populate: {
          roles: { select: ['id', 'name', 'description', 'type'], orderBy: { id: 'asc' } },
        },
      }),
    })) as Array<{
      documentId: string;
      emailVerified: boolean;
      banned: boolean;
      roles?: Parameters<typeof toUpRole>[0];
    }>;

    for (const row of rows) {
      stored.set(row.documentId, {
        emailVerified: row.emailVerified,
        banned: row.banned,
        ...(withRoles && { role: toUpRole(row.roles ?? []) }),
      });
    }

    return stored;
  };

  /** Users as the core output rules let the caller read them, in the shape of the mode. */
  const shape = async (ctx: Koa.Context, found: Plain[], wantsRole: boolean): Promise<UpUser[]> => {
    const readable = (await core().sanitizeOutput(found, ctx)) as UpUserSource[];
    const [extras, stored] = await Promise.all([
      loadUserExtras(strapi, ctx.state?.auth, readable),
      loadStored(
        readable.map(({ documentId }) => documentId),
        wantsRole
      ),
    ]);

    return readable.map((user) => {
      const own = stored.get(user.documentId);

      return toUpUser(
        { ...user, emailVerified: own?.emailVerified ?? false, banned: own?.banned ?? false },
        {
          extras: extras.get(user.documentId),
          ...(wantsRole && { role: own?.role ?? null }),
        }
      );
    });
  };

  /** The body of a write: users-permissions' flat body, not Strapi's `{ data }`. */
  const bodyOf = (ctx: Koa.Context): Plain => {
    const body = (ctx.request as { body?: unknown }).body;

    return isPlain(body) ? body : {};
  };

  /** The writes sorted for the user and for the profile; a key the engine owns is refused. */
  const sortWrites = (body: Plain) => {
    const { user, profile, refused } = splitUserWrites(strapi, body);

    if (refused.length > 0) {
      throw new errors.ApplicationError(invalidParameters(refused));
    }

    const { password, ...rest } = user;

    return {
      user: rest,
      profile,
      password: typeof password === 'string' ? password : undefined,
    };
  };

  /**
   * The user's input as the caller's rules for `action` allow it. The password is not a field of
   * the user type, so it is set aside and handed back: the Document Service takes it from the data.
   */
  const userInput = async (
    ctx: Koa.Context,
    action: 'create' | 'update',
    data: Plain,
    documentId?: string
  ): Promise<Plain> => {
    const opts = { ...options(ctx, action), ...(documentId !== undefined && { documentId }) };

    await strapi.contentAPI.validate.input(data, userSchema(), opts as never);

    return (await strapi.contentAPI.sanitize.input(data, userSchema(), opts as never)) as Plain;
  };

  /**
   * Writes the profile keys of a body to the profile of the user, under the caller's `update` rule
   * for the profile type, in the way the profile route of `me` does.
   */
  const writeProfile = async (ctx: Koa.Context, userDocumentId: string, input: Plain) => {
    if (Object.keys(input).length === 0) {
      return;
    }

    const { contentAPI } = strapi;
    const auth = (ctx.state?.auth as unknown) ?? {};
    const own = await profiles().findForUser(userDocumentId, { fields: ['documentId'] });

    if (!own) {
      throw new errors.NotFoundError('Profile not found');
    }

    const opts = { ...options(ctx, 'update'), documentId: own.documentId };

    await contentAPI.permissions.assertEntry(auth as never, 'update', PROFILE_UID, own.documentId);
    await contentAPI.validate.input(input, profileSchema(), opts as never);

    const data = (await contentAPI.sanitize.input(input, profileSchema(), opts as never)) as Plain;

    await profiles().updateForUser(userDocumentId, { data });
    await contentAPI.permissions.assertWritten(
      auth as never,
      'update',
      PROFILE_UID,
      own.documentId,
      {}
    );
  };

  /** The user as it is stored now, shaped for the caller; `null` when it is not there. */
  const present = async (
    ctx: Koa.Context,
    documentId: string,
    query: Plain,
    wantsRole: boolean
  ): Promise<UpUser | null> => {
    const found = await entries().findOne(documentId, query);

    if (!found) {
      return null;
    }

    const [user] = await shape(ctx, [found], wantsRole);

    return user;
  };

  const requireFields = (body: Plain) => {
    for (const field of ['email', 'username', 'password']) {
      const value = body[field];

      if (typeof value !== 'string' || value === '') {
        const { error } = missingFieldBody(field);

        throw new errors.ValidationError(error.message, error.details);
      }
    }
  };

  return {
    /** A bare array of users. */
    async find(ctx: Koa.Context) {
      const { query, wantsRole } = await readQuery(ctx, 'find');
      const { results } = await entries().find(query);

      ctx.body = await shape(ctx, results, wantsRole);
    },

    /** A bare number: the users that match the filters. */
    async count(ctx: Koa.Context) {
      const { query } = await readQuery(ctx, 'find');

      ctx.body = await documents().count({
        ...(query.filters !== undefined && { filters: query.filters }),
      });
    },

    async findOne(ctx: Koa.Context) {
      const { query, wantsRole } = await readQuery(ctx, 'findOne');
      const documentId = await resolve(ctx.params?.id);
      const user = documentId && (await present(ctx, documentId, query, wantsRole));

      if (!user) {
        throw new errors.NotFoundError(NOT_FOUND);
      }

      ctx.body = user;
    },

    async create(ctx: Koa.Context) {
      const body = bodyOf(ctx);

      requireFields(body);

      const writes = sortWrites(body);
      const input = await userInput(ctx, 'create', writes.user);
      const name = (input.name ?? input.username ?? String(input.email).split('@')[0]) as string;

      const documentId = await strapi.db.transaction(async () => {
        const created = await documents().create({
          data: { ...input, name, password: writes.password },
        });

        await strapi.contentAPI.permissions.assertWritten(
          (ctx.state?.auth as never) ?? {},
          'create',
          USER_UID,
          created.documentId,
          {}
        );
        await writeProfile(ctx, created.documentId, writes.profile);

        return created.documentId;
      });

      ctx.status = 201;
      ctx.body = await present(ctx, documentId, {}, false);
    },

    async update(ctx: Koa.Context) {
      const documentId = await resolve(ctx.params?.id);

      if (!documentId || !(await entries().findOne(documentId, { fields: ['documentId'] }))) {
        throw new errors.NotFoundError(NOT_FOUND);
      }

      const body = bodyOf(ctx);
      const writes = sortWrites(body);

      if ('password' in body && !writes.password) {
        throw new errors.ValidationError('password.notNull');
      }

      const auth = (ctx.state?.auth as never) ?? {};
      const { query, wantsRole } = await readQuery(ctx, 'findOne');

      await strapi.contentAPI.permissions.assertEntry(auth, 'update', USER_UID, documentId);

      const input = await userInput(ctx, 'update', writes.user, documentId);
      const data = { ...input, ...(writes.password ? { password: writes.password } : {}) };

      await strapi.db.transaction(async () => {
        if (Object.keys(data).length > 0) {
          await documents().update({ documentId, data });
          await strapi.contentAPI.permissions.assertWritten(
            auth,
            'update',
            USER_UID,
            documentId,
            {}
          );
        }

        await writeProfile(ctx, documentId, writes.profile);
      });

      ctx.body = await present(ctx, documentId, query, wantsRole);
    },

    /** The deleted user, as it was. */
    async delete(ctx: Koa.Context) {
      const documentId = await resolve(ctx.params?.id);
      const { wantsRole } = await readQuery(ctx, 'findOne');
      const user = documentId && (await present(ctx, documentId, {}, wantsRole));

      if (!documentId || !user) {
        throw new errors.NotFoundError(NOT_FOUND);
      }

      await strapi.contentAPI.permissions.assertEntry(
        (ctx.state?.auth as never) ?? {},
        'delete',
        USER_UID,
        documentId
      );
      await documents().delete({ documentId });

      ctx.body = user;
    },

    /** The signed-in user; `role` only with `populate=role`. */
    async me(ctx: Koa.Context) {
      ctx.set('Cache-Control', PER_USER_CACHE_CONTROL);

      const { documentId } = (ctx.state?.user ?? {}) as { documentId?: unknown };

      if (typeof documentId !== 'string' || documentId === '') {
        throw new errors.UnauthorizedError();
      }

      const { query, wantsRole } = await readQuery(ctx, 'find', true);
      const user = await present(ctx, documentId, query, wantsRole);

      if (!user) {
        throw new errors.NotFoundError(NOT_FOUND);
      }

      ctx.body = user;
    },
  };
};
