import type { Core } from '@strapi/types';
import { UploadRouteValidator } from './validation';

export const routes = (): Core.RouterInput => {
  const validator = new UploadRouteValidator(strapi);

  return {
    type: 'content-api',
    routes: [
      {
        method: 'POST',
        path: '/',
        handler: 'content-api.upload',
      },
      {
        method: 'GET',
        path: '/files',
        handler: 'content-api.find',
        response: validator.files,
      },
      {
        method: 'GET',
        path: '/files/:id',
        handler: 'content-api.findOne',
        request: {
          params: { id: validator.fileId },
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
      },
    ],
  };
};
