import { UID, Common, Schema } from '@strapi/types';
import type { Context, Next } from 'koa';
import isNil from 'lodash/isNil';

interface ContentType extends Schema.ContentType {
  plugin?: string;
}

export default async (ctx: Context, next: Next) => {
  const { model }: { model: UID.ContentType } = ctx.params;

  const ct: ContentType = strapi.contentTypes[model];

  if (!ct) {
    return ctx.send({ error: 'contentType.notFound' }, 404);
  }

  let target;
  if (!ct.plugin || ct.plugin === 'admin') {
    target = strapi.admin;
  } else {
    target = strapi.plugin(ct.plugin);
  }

  const { route }: { route: Common.Route } = ctx.state;

  if (typeof route.handler !== 'string') {
    return next();
  }

  const [, action] = route.handler.split('.');

  const configPath =
    ct.plugin === 'admin'
      ? ['admin.layout', ct.modelName, 'actions', action]
      : ['plugin', ct.plugin, 'layout', ct.modelName, 'actions', action];

  // TODO
  // @ts-expect-error check input for strapi.config.get
  const actionConfig: string | undefined = strapi.config.get(configPath);

  if (!isNil(actionConfig)) {
    const [controller, action] = actionConfig.split('.');

    if (controller && action) {
      return target.controllers[controller.toLowerCase()][action](ctx, next);
    }
  }

  await next();
};
