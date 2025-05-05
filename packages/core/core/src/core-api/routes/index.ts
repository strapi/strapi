import type { Core, Schema } from '@strapi/types';
import { contentTypes as contentTypeUtils } from '@strapi/utils';
import { z } from 'zod';
import { CoreContentTypeRouteValidator } from './validation';

export const createRoutes = ({
  strapi,
  contentType,
}: {
  strapi: Core.Strapi;
  contentType: Schema.ContentType;
}) => {
  if (contentTypeUtils.isSingleType(contentType)) {
    return getSingleTypeRoutes(contentType, strapi);
  }

  return getCollectionTypeRoutes(contentType, strapi);
};

const getSingleTypeRoutes = (
  { uid, info }: Schema.ContentType,
  strapi: Core.Strapi
): Record<string, Partial<Core.Route>> => {
  const validator = new CoreContentTypeRouteValidator(strapi, uid);

  return {
    find: {
      method: 'GET',
      path: `/${info.singularName}`,
      handler: `${uid}.find`,
      request: {
        query: validator.query(['fields', 'sort', 'populate']),
      },
      responses: {
        200: z.object({ data: validator.document }),
      },
      config: {},
    },
    update: {
      method: 'PUT',
      path: `/${info.singularName}`,
      handler: `${uid}.update`,
      request: {
        query: validator.query(['fields', 'sort', 'populate']),
      },
      responses: {
        200: z.object({ data: validator.document }),
      },
      config: {},
    },
    delete: {
      method: 'DELETE',
      path: `/${info.singularName}`,
      handler: `${uid}.delete`,
      request: {
        query: validator.query(['fields', 'sort', 'populate']),
      },
      responses: {
        200: z.object({ data: validator.document }),
      },
      config: {},
    },
  };
};

const getCollectionTypeRoutes = (
  schema: Schema.ContentType,
  strapi: Core.Strapi
): Record<string, Partial<Core.Route>> => {
  const { uid, info } = schema;

  const validator = new CoreContentTypeRouteValidator(strapi, uid);

  return {
    find: {
      method: 'GET',
      path: `/${info.pluralName}`,
      handler: `${uid}.find`,
      request: {
        query: validator.query(['fields', 'sort', 'populate']),
      },
      responses: {
        200: z.object({ data: validator.documents }),
      },
      config: {},
    },
    findOne: {
      method: 'GET',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.findOne`,
      request: {
        params: { id: validator.documentID },
        query: validator.query(['fields', 'sort', 'populate']),
      },
      responses: {
        200: z.object({ data: validator.document }),
      },
    },
    create: {
      method: 'POST',
      path: `/${info.pluralName}`,
      handler: `${uid}.create`,
      request: {
        params: { id: validator.documentID },
        query: validator.query(['fields', 'sort', 'populate']),
      },
      responses: {
        201: z.object({ data: validator.document }),
      },
      config: {},
    },
    update: {
      method: 'PUT',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.update`,
      request: {
        query: validator.query(['fields', 'sort', 'populate']),
        params: { id: validator.documentID },
      },
      responses: {
        200: z.object({ data: validator.document }),
      },
    },
    delete: {
      method: 'DELETE',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.delete`,
      request: {
        query: validator.query(['fields', 'sort', 'populate']),
        params: { id: validator.documentID },
      },
      responses: {
        200: z.object({ data: validator.document }),
      },
    },
  };
};
