import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import { set } from 'lodash/fp';

/**
 * A Strapi middleware function that adds support for review workflows.
 *
 * Why is it needed ?
 * For now, the admin panel cannot have anything but top-level attributes in the content-type for options.
 * But we need the CE part to be agnostics from Review Workflow (which is an EE feature).
 * CE handle the `options` object, that's why we move the reviewWorkflows boolean to the options object.
 *
 * @param {object} strapi - The Strapi instance.
 */
export function contentTypeMiddleware(strapi: Core.Strapi) {
  /**
   * A middleware function that moves the `reviewWorkflows` attribute from the top level of
   * the request body to the `options` object within the request body.
   *
   * @param {object} ctx - The Koa context object.
   */
  const moveReviewWorkflowOption = (ctx: Context) => {
    // Move reviewWorkflows to options.reviewWorkflows
    const { reviewWorkflows, ...contentType } = ctx.request.body.contentType;

    if (typeof reviewWorkflows === 'boolean') {
      ctx.request.body.contentType = set('options.reviewWorkflows', reviewWorkflows, contentType);
    }
  };
  strapi.server.router.use('/content-type-builder/content-types/:uid?', (ctx, next) => {
    if (ctx.method === 'PUT' || ctx.method === 'POST') {
      moveReviewWorkflowOption(ctx);
    }
    return next();
  });
}

export default {
  contentTypeMiddleware,
};
