import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { GLOBAL_SPACE_HEADER_VALUE, type SpaceScope } from '../../../shared/constants';
import { getSpaceColumn, runUnscoped } from '../scope/context';

const { ValidationError } = errors;

const asString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`"${field}" is required.`);
  }

  return value.trim();
};

const asUidList = (value: unknown, field: string): string[] | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new ValidationError(`"${field}" must be null or an array of content type uids.`);
  }

  return value as string[];
};

/** How the admin names the scope in force: a slug, `*`, or nothing. */
const describeCurrent = (scope: SpaceScope): string | null => {
  if (scope.mode === 'space') {
    return scope.slug;
  }

  return scope.mode === 'global' ? GLOBAL_SPACE_HEADER_VALUE : null;
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    const spaces = await strapi.service('plugin::spaces.spaces').list();

    ctx.body = { data: spaces };
  },

  /**
   * The spaces the caller can actually work in, and where they are right now.
   *
   * This is what the space switcher reads, so it is deliberately available to
   * every authenticated administrator: knowing which spaces you belong to is
   * not privileged information about the project.
   */
  async mine(ctx: Context) {
    const user = ctx.state.user as { id: number } | undefined;

    if (!user) {
      ctx.body = { data: [], current: null, canAccessAll: false };
      return;
    }

    const access = strapi.service('plugin::spaces.access');
    const canAccessAll = await access.canAccessAllSpaces(user);

    const spaces = canAccessAll
      ? await strapi.service('plugin::spaces.spaces').list()
      : (await strapi.service('plugin::spaces.membership').listForUser(user.id)).map(
          (membership: { space: unknown }) => membership.space
        );

    const { scope } = await access.resolve(ctx);

    ctx.body = {
      data: spaces.filter((space: { status: string }) => space.status === 'active'),
      current: describeCurrent(scope),
      canAccessAll,
      // Present when the caller has nowhere to work, so the admin can say why
      // rather than showing an empty Content Manager.
      unavailableReason: scope.mode === 'unresolved' ? scope.reason : undefined,
    };
  },

  async create(ctx: Context) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;

    const space = await strapi.service('plugin::spaces.spaces').create({
      name: asString(body.name, 'name'),
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      description: typeof body.description === 'string' ? body.description : null,
      contentTypes: asUidList(body.contentTypes, 'contentTypes'),
    });

    ctx.body = { data: space };
  },

  async update(ctx: Context) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const id = Number(ctx.params.id);

    const space = await strapi.service('plugin::spaces.spaces').update(id, {
      // Passed through rather than dropped: the service refuses a rename, and
      // silently ignoring one would let a caller believe it had happened.
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      name: body.name === undefined ? undefined : asString(body.name, 'name'),
      description: body.description === undefined ? undefined : (body.description as string | null),
      status: body.status as 'active' | 'archived' | undefined,
      contentTypes:
        body.contentTypes === undefined ? undefined : asUidList(body.contentTypes, 'contentTypes'),
    });

    ctx.body = { data: space };
  },

  async setDefault(ctx: Context) {
    const space = await strapi.service('plugin::spaces.spaces').setDefault(Number(ctx.params.id));

    ctx.body = { data: space };
  },

  async delete(ctx: Context) {
    const result = await strapi.service('plugin::spaces.spaces').delete(Number(ctx.params.id));

    ctx.body = { data: result };
  },

  /**
   * What deleting a space would destroy, so the confirmation can say it out
   * loud instead of asking the administrator to trust a checkbox.
   */
  async deletionPreview(ctx: Context) {
    const id = Number(ctx.params.id);
    const space = await strapi.service('plugin::spaces.spaces').findById(id);

    if (!space) {
      return ctx.notFound();
    }

    const uids: string[] = strapi.service('plugin::spaces.content-types').listScopedUids();
    const entries: Record<string, number> = {};

    for (const uid of uids) {
      const column = getSpaceColumn(strapi, uid);

      if (!column) {
        continue;
      }

      const count = await runUnscoped(() =>
        strapi.db.query(uid).count({ where: { [column]: id } })
      );

      if (count > 0) {
        entries[uid] = count;
      }
    }

    const members = await strapi.service('plugin::spaces.membership').listForSpace(id);

    ctx.body = { data: { space, entries, members: members.length } };
  },

  /** The content types a space can be restricted to, and the project's limits. */
  async settings(ctx: Context) {
    ctx.body = {
      data: {
        contentTypes: strapi
          .service('plugin::spaces.content-types')
          .listSelectableUids()
          .map((uid: string) => ({
            uid,
            displayName: strapi.contentType(uid as never)?.info?.displayName ?? uid,
          })),
        maxSpaces: strapi.service('plugin::spaces.limits').getMaximum(),
        sharedRows: await strapi.service('plugin::spaces.migration').countSharedRows(),
      },
    };
  },
});
