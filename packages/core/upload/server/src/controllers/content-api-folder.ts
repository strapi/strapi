import type { Context } from 'koa';
import { omit } from 'lodash';
import type { Core } from '@strapi/types';

import { getService } from '../utils';
import { FOLDER_MODEL_UID } from '../constants';
import { findAndCountRestPage } from '../utils/rest-pagination';

const FIELDS = ['documentId', 'name', 'path', 'createdAt', 'updatedAt'];
const POPULATE = { parent: { fields: ['documentId'] } };
const MAX_INTEGER_ID = 2147483647;

type ContentApiFolder = {
  id: number;
  documentId: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  parent?: { id: number; documentId: string } | null;
  namePath?: string;
};

// The response shape is fixed, so `fields` and `populate` are ignored on both routes.
const omitShapeParams = (query: Record<string, unknown>) => omit(query, ['fields', 'populate']);

const isNumericId = (id: unknown) => /^\d+$/.test(String(id)) && Number(id) <= MAX_INTEGER_ID;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const validateQuery = async (data: Record<string, unknown>, ctx: Context) => {
    const schema = strapi.getModel(FOLDER_MODEL_UID);
    const { auth, route } = ctx.state;

    return strapi.contentAPI.validate.query(data, schema, { auth, route });
  };

  const sanitizeQuery = async (data: Record<string, unknown>, ctx: Context) => {
    const schema = strapi.getModel(FOLDER_MODEL_UID);
    const { auth, route } = ctx.state;

    return strapi.contentAPI.sanitize.query(data, schema, { auth, route });
  };

  const toResponse = async (folders: ContentApiFolder[], ctx: Context) => {
    const schema = strapi.getModel(FOLDER_MODEL_UID);
    const { auth } = ctx.state;

    const namePaths = await getService('folder').getNamePaths(folders.map(({ path }) => path));
    const sanitized = (await strapi.contentAPI.sanitize.output(folders, schema, {
      auth,
    })) as ContentApiFolder[];

    return sanitized.map((folder, index) => {
      const response = { ...folder };

      // `parent` is left out when the sanitizer removed it, so it never looks like a root folder.
      if (!folders[index].parent) {
        response.parent = null;
      }

      if ('name' in folder) {
        response.namePath = namePaths[folders[index].path];
      }

      return response;
    });
  };

  return {
    async find(ctx: Context) {
      const query = omitShapeParams(ctx.query);

      await validateQuery(query, ctx);
      const { filters, sort, pagination } = await sanitizeQuery(query, ctx);

      const { results, pagination: paginationInfo } = await findAndCountRestPage(
        strapi,
        FOLDER_MODEL_UID,
        { filters, sort, pagination, fields: FIELDS, populate: POPULATE }
      );

      ctx.body = { data: await toResponse(results, ctx), meta: { pagination: paginationInfo } };
    },

    async findOne(ctx: Context) {
      await validateQuery(omitShapeParams(ctx.query), ctx);

      const { id } = ctx.params;
      const filters = isNumericId(id) ? { id } : { documentId: id };

      const folder = await strapi.db
        .query(FOLDER_MODEL_UID)
        .findOne(
          strapi
            .get('query-params')
            .transform(FOLDER_MODEL_UID, { filters, fields: FIELDS, populate: POPULATE })
        );

      if (!folder) {
        return ctx.notFound('folder.notFound');
      }

      const [data] = await toResponse([folder], ctx);

      ctx.body = { data };
    },
  };
};
