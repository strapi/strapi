import type { Core, Schema } from '@strapi/types';

import { contentTypes, contentTypes as contentTypeUtils } from '@strapi/utils';
import * as z from 'zod/v4';
import type { QueryParam } from './validation/content-type';

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
  schema: Schema.ContentType,
  strapi: Core.Strapi
): Record<string, Partial<Core.Route>> => {
  const { uid, info } = schema;

  const validator = new CoreContentTypeRouteValidator(strapi, uid);
  const conditionalQueryParams = getConditionalQueryParams(schema);

  return {
    find: {
      method: 'GET',
      path: `/${info.singularName}`,
      handler: `${uid}.find`,
      request: {
        query: validator.queryParams(['fields', 'populate', 'filters', ...conditionalQueryParams]),
      },
      response: z.object({ data: validator.document }),
      config: {},
    },
    update: {
      method: 'PUT',
      path: `/${info.singularName}`,
      handler: `${uid}.update`,
      request: {
        query: validator.queryParams(['fields', 'populate', ...conditionalQueryParams]),
        body: { 'application/json': validator.partialBody },
      },
      response: z.object({ data: validator.document }),
      config: {},
    },
    delete: {
      method: 'DELETE',
      path: `/${info.singularName}`,
      handler: `${uid}.delete`,
      request: {
        query: validator.queryParams(['fields', 'populate', ...conditionalQueryParams]),
      },
      response: z.object({ data: validator.document }),
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
  const conditionalQueryParams = getConditionalQueryParams(schema);

  return {
    find: {
      method: 'GET',
      path: `/${info.pluralName}`,
      handler: `${uid}.find`,
      request: {
        query: validator.queryParams([
          'fields',
          'filters',
          '_q',
          'pagination',
          'sort',
          'populate',
          ...conditionalQueryParams,
        ]),
      },
      response: z.object({ data: validator.documents }),
      config: {},
    },
    findOne: {
      method: 'GET',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.findOne`,
      request: {
        params: { id: validator.documentID },
        query: validator.queryParams([
          'fields',
          'populate',
          'filters',
          'sort',
          ...conditionalQueryParams,
        ]),
      },
      response: z.object({ data: validator.document }),
    },
    create: {
      method: 'POST',
      path: `/${info.pluralName}`,
      handler: `${uid}.create`,
      request: {
        query: validator.queryParams(['fields', 'populate', ...conditionalQueryParams]),
        body: { 'application/json': validator.body },
      },
      response: z.object({ data: validator.document }),
      config: {},
    },
    update: {
      method: 'PUT',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.update`,
      request: {
        query: validator.queryParams(['fields', 'populate', ...conditionalQueryParams]),
        params: { id: validator.documentID },
        body: { 'application/json': validator.partialBody },
      },
      response: z.object({ data: validator.document }),
    },
    delete: {
      method: 'DELETE',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.delete`,
      request: {
        query: validator.queryParams(['fields', 'populate', 'filters', ...conditionalQueryParams]),
        params: { id: validator.documentID },
      },
      response: z.object({ data: validator.document }),
    },
  };
};

/**
 * Query params that are conditionally part of this route's contract (and OpenAPI spec)
 * based on the content type: e.g. locale only for localized types, status only for draft & publish.
 *
 * This is separate from the runtime allowlist used when api.rest.strictParams is on
 * (ALLOWED_QUERY_PARAM_KEYS + registerQueryParam in @strapi/utils). That allowlist is global
 * (locale and status are always allowed); validate/sanitize then pass them through and the
 * document service or i18n layer ignores them when not applicable.
 *
 * So the two can differ: a non-localized route will not declare "locale" here (OpenAPI says
 * no locale param), but the runtime allowlist still allows the key and downstream ignores it.
 * That is intentional: this drives the route contract/docs; the allowlist drives enforcement.
 */
const getConditionalQueryParams = (schema: Schema.ContentType) => {
  const isLocalized = strapi.plugin('i18n').service('content-types').isLocalizedContentType(schema);
  const hasDraftAndPublish = contentTypes.hasDraftAndPublish(schema);

  return [
    ...(isLocalized ? ['locale'] : []),
    ...(hasDraftAndPublish ? ['status', 'hasPublishedVersion'] : []),
  ] as QueryParam[];
};
