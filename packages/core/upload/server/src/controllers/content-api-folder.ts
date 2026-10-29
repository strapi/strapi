import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import { getService } from '../utils';
import { FOLDER_MODEL_UID } from '../constants';
import { findAndCountRestPage } from '../utils/rest-pagination';

import type { Folder } from '../types';

const FIELDS = ['documentId', 'name', 'path', 'createdAt', 'updatedAt'];
const POPULATE = { parent: { fields: ['documentId'] } };

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

  const toResponse = async (folders: Folder[], ctx: Context) => {
    const schema = strapi.getModel(FOLDER_MODEL_UID);
    const { auth } = ctx.state;

    const namePaths = await getService('folder').getNamePaths(folders.map(({ path }) => path));
    const sanitized = (await strapi.contentAPI.sanitize.output(folders, schema, {
      auth,
    })) as Folder[];

    return sanitized.map((folder) => ({
      ...folder,
      namePath: namePaths[folder.path],
      parent: folder.parent ?? null,
    }));
  };

  return {
    async find(ctx: Context) {
      await validateQuery(ctx.query, ctx);
      const { filters, sort, pagination } = await sanitizeQuery(ctx.query, ctx);

      const { results, pagination: paginationInfo } = await findAndCountRestPage(
        strapi,
        FOLDER_MODEL_UID,
        { filters, sort, pagination, fields: FIELDS, populate: POPULATE }
      );

      ctx.body = { data: await toResponse(results, ctx), meta: { pagination: paginationInfo } };
    },

    async findOne(ctx: Context) {
      const { id } = ctx.params;
      const filters = /^\d+$/.test(String(id)) ? { id } : { documentId: id };

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
