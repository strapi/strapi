import _ from 'lodash';
import type { Core, Struct } from '@strapi/types';
import { getGlobalId } from '../domain/content-type';

export default async function loadAdmin(strapi: Core.Strapi) {
  // strapi.admin = require('@strapi/admin/strapi-server');

  strapi.get('services').add(`admin::`, strapi.admin?.services);
  strapi.get('controllers').add(`admin::`, strapi.admin?.controllers);
  strapi.get('content-types').add(`admin::`, formatContentTypes(strapi.admin?.contentTypes ?? {}));
  strapi.get('policies').add(`admin::`, strapi.admin?.policies);
  strapi.get('middlewares').add(`admin::`, strapi.admin?.middlewares);

  const userAdminConfig = strapi.config.get('admin');
  strapi.get('config').set('admin', _.merge(strapi.admin?.config, userAdminConfig));
}

const formatContentTypes = (contentTypes: Record<string, { schema: Struct.ContentTypeSchema }>) => {
  Object.values(contentTypes).forEach((definition) => {
    const { schema } = definition;

    Object.assign(schema, {
      plugin: 'admin',
      globalId: getGlobalId(schema, 'admin'),
    });
  });

  return contentTypes;
};
