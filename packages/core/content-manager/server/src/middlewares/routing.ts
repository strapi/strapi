import type { UID, Core, Struct } from '@strapi/types';
import type { Context, Next } from 'koa';
import isNil from 'lodash/isNil';

interface ContentType extends Struct.ContentTypeSchema {
  plugin?: string;
}

export default async (ctx: Context, next: Next) => {
  const { model }: { model: UID.ContentType } = ctx.params;

  const ct: ContentType = strapi.contentTypes[model];

  if (!ct) {
    return ctx.send({ error: 'contentType.notFound' }, 404);
  }

  let controllers;
  if (!ct.plugin || ct.plugin === 'admin') {
    controllers = strapi.admin.controllers;
  } else {
    controllers = strapi.plugin(ct.plugin).controllers;
  }

  const { route }: { route: Core.Route } = ctx.state;

  if (typeof route.handler !== 'string') {
    return next();
  }

  const [, action] = route.handler.split('.');

  let actionConfig: any;
  if (!ct.plugin || ct.plugin === 'admin') {
    actionConfig = strapi.config.get(`admin.layout.${ct.modelName}.actions.${action}`);
  } else {
    actionConfig = strapi.plugin(ct.plugin).config(`layout.${ct.modelName}.actions.${action}`);
  }

  if (!isNil(actionConfig)) {
    const [controller, action] = actionConfig.split('.');

    if (controller && action) {
      return controllers[controller.toLowerCase()][action](ctx, next);
    }
  }

  await next();
};
