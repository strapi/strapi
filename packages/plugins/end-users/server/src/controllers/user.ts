import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type Koa from 'koa';

import { USER_UID } from '../constants';
import { compatOr, createUsersCompat } from '../compat/users-controller';

/**
 * The core controller of the end-user type behind `/api/users` (`find`, `findOne`, `create`,
 * `update`, `delete`). Permissions, field rules, sanitizing and populate treat it like any other
 * content type, and no role is granted any of it by default: whoever needs it is granted it in the
 * role editor.
 *
 * With the Users & Permissions compatibility mode on, each action answers in the shapes that plugin
 * had (a bare list, a bare user, numeric ids accepted), and `count` is a route. With it off, the core
 * answers are untouched and there is no `count`.
 */
export default factories.createCoreController(USER_UID, ({ strapi }) => {
  const compat = createUsersCompat(strapi);

  return {
    find(ctx: Koa.Context) {
      return compatOr(
        strapi,
        () => compat.find(ctx),
        () => super.find(ctx)
      );
    },

    findOne(ctx: Koa.Context) {
      return compatOr(
        strapi,
        () => compat.findOne(ctx),
        () => super.findOne(ctx)
      );
    },

    create(ctx: Koa.Context) {
      return compatOr(
        strapi,
        () => compat.create(ctx),
        () => super.create(ctx)
      );
    },

    update(ctx: Koa.Context) {
      return compatOr(
        strapi,
        () => compat.update(ctx),
        () => super.update(ctx)
      );
    },

    delete(ctx: Koa.Context) {
      return compatOr(
        strapi,
        () => compat.delete(ctx),
        () => super.delete(ctx)
      );
    },

    count(ctx: Koa.Context) {
      return compatOr(
        strapi,
        () => compat.count(ctx),
        () => Promise.reject(new errors.NotFoundError())
      );
    },
  };
});
