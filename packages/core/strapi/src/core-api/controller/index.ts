import { prop } from 'lodash/fp';
import type Koa from 'koa';
import { contentTypes as contentTypeUtils, sanitize, validate } from '@strapi/utils';
import type { CoreApi, Schema } from '@strapi/types';

import { transformResponse } from './transform';
import createSingleTypeController from './single-type';
import createCollectionTypeController from './collection-type';

const isSingleType = (contentType: Schema.ContentType): contentType is Schema.SingleType =>
  contentTypeUtils.isSingleType(contentType);

const getAuthFromKoaContext = (ctx: Koa.Context) => prop('state.auth', ctx) ?? {};

function createController<T extends Schema.SingleType | Schema.CollectionType>(opts: {
  contentType: T;
}): T extends Schema.SingleType ? CoreApi.Controller.SingleType : CoreApi.Controller.CollectionType;
function createController({
  contentType,
}: {
  contentType: Schema.SingleType | Schema.CollectionType;
}) {
  const proto: CoreApi.Controller.Base = {
    transformResponse(data, meta) {
      return transformResponse(data, meta, { contentType });
    },

    async sanitizeOutput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.output(data, contentType, { auth });
    },

    async sanitizeInput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.input(data, contentType, { auth });
    },

    async sanitizeQuery(ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.query(ctx.query, contentType, { auth });
    },

    async validateQuery(ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return validate.contentAPI.query(ctx.query, contentType, { auth });
    },

    async validateInput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return validate.contentAPI.input(data, contentType, { auth });
    },
  };

  let ctrl;

  if (isSingleType(contentType)) {
    ctrl = createSingleTypeController({ contentType });
  } else {
    ctrl = createCollectionTypeController({ contentType });
  }

  return Object.assign(Object.create(proto), ctrl);
}

export { createController };
