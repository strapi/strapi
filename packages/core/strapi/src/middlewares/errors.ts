import { errors } from '@strapi/utils';
import type { Common } from '@strapi/types';

import { formatApplicationError, formatHttpError, formatInternalError } from '../services/errors';

export type Config = {
  log: boolean;
};

const defaults: Config = {
  log: true,
};

const errorMiddleware: Common.MiddlewareFactory = (config: Config, { strapi }) => {
  const { log } = {
    ...defaults,
    ...config,
  };

  return async (ctx, next) => {
    try {
      await next();

      if (!ctx.response._explicitStatus) {
        return ctx.notFound();
      }
    } catch (error) {
      if (error instanceof errors.ApplicationError) {
        const { status, body } = formatApplicationError(error);
        ctx.status = status;
        ctx.body = body;
        return;
      }

      if (error instanceof errors.HttpError) {
        const { status, body } = formatHttpError(error);
        ctx.status = status;
        ctx.body = body;
        return;
      }

      if (log === true) {
        strapi.log.error(error);
      }

      const { status, body } = formatInternalError(error);
      ctx.status = status;
      ctx.body = body;
    }
  };
};

export { errorMiddleware as errors };
