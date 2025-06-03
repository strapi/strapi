import { contentTypes as contentTypeUtils } from '@strapi/utils';
import type { Schema } from '@strapi/types';

export const createRoutes = ({ contentType }: { contentType: Schema.ContentType }) => {
  if (contentTypeUtils.isSingleType(contentType)) {
    return getSingleTypeRoutes(contentType);
  }

  return getCollectionTypeRoutes(contentType);
};

const getSingleTypeRoutes = ({ uid, info }: Schema.ContentType) => {
  return {
    find: {
      method: 'GET',
      path: `/${info.singularName}`,
      handler: `${uid}.find`,
      config: {},
    },
    update: {
      method: 'PUT',
      path: `/${info.singularName}`,
      handler: `${uid}.update`,
      config: {},
    },
    delete: {
      method: 'DELETE',
      path: `/${info.singularName}`,
      handler: `${uid}.delete`,
      config: {},
    },
  };
};

const getCollectionTypeRoutes = ({ uid, info }: Schema.ContentType) => {
  return {
    find: {
      method: 'GET',
      path: `/${info.pluralName}`,
      handler: `${uid}.find`,
      config: {},
    },
    findOne: {
      method: 'GET',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.findOne`,
      config: {},
    },
    create: {
      method: 'POST',
      path: `/${info.pluralName}`,
      handler: `${uid}.create`,
      config: {},
    },
    update: {
      method: 'PUT',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.update`,
      config: {},
    },
    delete: {
      method: 'DELETE',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.delete`,
      config: {},
    },
  };
};
