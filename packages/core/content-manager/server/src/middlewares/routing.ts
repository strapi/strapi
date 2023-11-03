import { isNil } from 'lodash';

export default async (ctx: any, next: any) => {
  const { model } = ctx.params;

  const ct = strapi.contentTypes[model] as any;

  if (!ct) {
    return ctx.send({ error: 'contentType.notFound' }, 404);
  }

  const target = ct.plugin === 'admin' ? strapi.admin : strapi.plugin(ct.plugin);

  const { route } = ctx.state;

  if (typeof route.handler !== 'string') {
    return next();
  }

  const [, action] = route.handler.split('.');

  const configPath =
    ct.plugin === 'admin'
      ? ['admin.layout', ct.modelName, 'actions', action]
      : ['plugin', ct.plugin, 'layout', ct.modelName, 'actions', action];

  const actionConfig: any = strapi.config.get(configPath as any);

  if (!isNil(actionConfig)) {
    const [controller, action] = actionConfig.split('.');

    if (controller && action) {
      // @ts-ignore TODO
      return target.controllers[controller.toLowerCase()][action](ctx);
    }
  }

  await next();
};
