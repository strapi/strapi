import type { Context } from 'koa';
import { contentTypes } from '@strapi/utils';
import { Strapi, UID } from '@strapi/types';

const { hasDraftAndPublish } = contentTypes;

export default (ctx: Context, config: any, { strapi }: { strapi: Strapi }) => {
  const { model: modelUID }: { model: UID.ContentType } = ctx.params;

  const model = strapi.contentTypes[modelUID];

  return hasDraftAndPublish(model);
};
