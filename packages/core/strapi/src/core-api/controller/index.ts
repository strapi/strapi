import { getOr } from 'lodash/fp';

import { contentTypes, sanitize } from '@strapi/utils';
import type { Schema } from '@strapi/strapi';

import { transformResponse } from './transform';
import createSingleTypeController from './single-type';
import createCollectionTypeController from './collection-type';

const getAuthFromKoaContext = getOr({}, 'state.auth');

export const createController = ({ contentType }: { contentType: Schema.ContentType }) => {
  const ctx = { contentType };

  const proto = {
    transformResponse(data, meta) {
      return transformResponse(data, meta, { contentType });
    },

    async sanitizeOutput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.output(data, contentType, { auth });
    },

    sanitizeInput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.input(data, contentType, { auth });
    },

    sanitizeQuery(ctx) {
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
