import { contentTypes } from '@strapi/utils';

const { hasDraftAndPublish } = contentTypes;

export default (ctx: any, config: any, { strapi }: any) => {
  const { model: modelUID } = ctx.params;

  const model = strapi.contentTypes[modelUID];

  return hasDraftAndPublish(model);
};
