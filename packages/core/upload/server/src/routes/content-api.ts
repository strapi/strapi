import type { Core } from '@strapi/types';
import * as z from 'zod/v4';
import { createContentApiRoutesFactory } from '@strapi/utils';
import { UploadRouteValidator } from './validation';

const createRoutes = createContentApiRoutesFactory((): Core.RouterInput['routes'] => {
  const validator = new UploadRouteValidator(strapi);

  return [
    {
      method: 'POST',
      path: '/',
      handler: 'content-api.upload',
      request: {
        query: { id: validator.fileId.optional() },
        // Note: multipart/form-data is handled by Koa middleware, not Zod
      },
      response: z.union([validator.file, validator.files]),
    },
    {
      method: 'GET',
      path: '/files',
      handler: 'content-api.find',
      request: {
        query: {
          fields: validator.queryFields.optional(),
          populate: validator.queryPopulate.optional(),
          sort: validator.querySort.optional(),
          pagination: validator.pagination.optional(),
          filters: validator.filters.optional(),
        },
      },
      response: validator.files,
    },
    {
      method: 'GET',
      path: '/files/:id',
      handler: 'content-api.findOne',
      request: {
        params: { id: validator.fileId },
        query: {
          fields: validator.queryFields.optional(),
          populate: validator.queryPopulate.optional(),
        },
      },
      response: validator.file,
    },
    {
      method: 'DELETE',
      path: '/files/:id',
      handler: 'content-api.destroy',
      request: {
        params: { id: validator.fileId },
      },
      response: validator.file,
    },
  ];
});

export const routes = createRoutes;
