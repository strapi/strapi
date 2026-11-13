import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import { validateRoutesSubject } from '../../validation/permission-layout';
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
      const subject = (await validateRoutesSubject(ctx.query.subject)) as string;

      ctx.body = { data: await layout().getRoutesFor(subject) };
    },
  };
};

export default permissionLayoutController;
