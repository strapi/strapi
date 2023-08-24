import { prop } from 'lodash/fp';
import type Koa from 'koa';
import { contentTypes, sanitize } from '@strapi/utils';
import type { Schema } from '../../types';

import { transformResponse } from './transform';
import createSingleTypeController from './single-type';
import createCollectionTypeController from './collection-type';

const getAuthFromKoaContext = (ctx: Koa.Context) => prop('state.auth', ctx) ?? {};

export const createController = ({ contentType }: { contentType: Schema.ContentType }) => {
  const ctx = { contentType };

  const proto = {
    transformResponse(data: unknown, meta: unknown) {
      return transformResponse(data, meta, { contentType });
    },

    async sanitizeOutput(data: unknown, ctx: Koa.Context) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.output(data, contentType, { auth });
    },

    sanitizeInput(data: unknown, ctx: Koa.Context) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.input(data, contentType, { auth });
    },

    sanitizeQuery(ctx: Koa.Context) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.query(ctx.query, contentType, { auth });
    },
  };

  let ctrl;

  if (contentTypes.isSingleType(contentType)) {
    ctrl = createSingleTypeController(ctx);
  } else {
    ctrl = createCollectionTypeController(ctx);
  }

  return Object.assign(Object.create(proto), ctrl);
};
