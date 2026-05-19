import type { Core } from '@strapi/types';
import { sendJsonRpcError } from '../utils/sendJsonRpcError';

export const createGetHandler = (): Core.MiddlewareHandler => {
  return async (ctx) => {
    ctx.set('Allow', 'POST');
    sendJsonRpcError(ctx.res, 'METHOD_NOT_ALLOWED');
  };
};
