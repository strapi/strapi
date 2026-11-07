import { errors } from '@strapi/utils';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import type permissionLayoutService from '../../services/permission-layout';

/**
 * `/end-users/permissions`. Answers are `{ data }`, as every admin route's
 * are. Named `permission-layout`: the Content API already has a `permissions` controller.
 */
const permissionLayoutController = ({ strapi }: { strapi: Core.Strapi }) => {
  const layout = () =>
    strapi.plugin(PLUGIN_ID).service('permission-layout') as ReturnType<
      typeof permissionLayoutService
    >;

  return {
    async layout(ctx: Koa.Context) {
      ctx.body = { data: await layout().getLayout() };
    },

    /** `?subject=<content type uid or route group id>`: one string, never a list */
    async routes(ctx: Koa.Context) {
      const { subject } = ctx.query;

      if (typeof subject !== 'string') {
        throw new errors.ValidationError(
          'subject is one string: a content type uid or a route group id'
        );
      }

      ctx.body = { data: await layout().getRoutesFor(subject) };
    },
  };
};

export default permissionLayoutController;
