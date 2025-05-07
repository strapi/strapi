import { Core } from '@strapi/types';
import { z } from 'zod';

const formattedContentTypeSchema = z.any();
const formattedComponentSchema = z.any();

const ctUIDRegexp = /^((strapi|admin)::[\w-]+|(api|plugin)::[\w-]+\.[\w-]+)$/;
const componentUIDRegexp = /^[\w-]+\.[\w-]+$/;

export default (() => {
  return {
    type: 'content-api',
    routes: [
      {
        method: 'GET',
        path: '/content-types',
        handler: 'content-types.getContentTypes',
        request: {
          query: { kind: z.enum(['collectionType', 'singleType']) },
        },
        responses: {
          200: { 'application/json': z.object({ data: z.array(formattedContentTypeSchema) }) },
        },
      },
      {
        method: 'GET',
        path: '/content-types/:uid',
        handler: 'content-types.getContentType',
        request: {
          params: {
            uid: z.string().regex(ctUIDRegexp),
          },
        },
      },
      {
        method: 'GET',
        path: '/components',
        handler: 'components.getComponents',
        responses: {
          200: { 'application/json': z.object({ data: z.array(formattedComponentSchema) }) },
        },
      },
      {
        method: 'GET',
        path: '/components/:uid',
        handler: 'components.getComponent',
        request: {
          params: {
            uid: z.string().regex(componentUIDRegexp),
          },
        },
        responses: {
          200: { 'application/json': z.object({ data: formattedComponentSchema }) },
        },
      },
    ],
  };
}) satisfies Core.RouterConfig;
