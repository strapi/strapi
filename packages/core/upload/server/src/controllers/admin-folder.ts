import { defaultsDeep } from 'lodash';

import type { Context } from 'koa';

import { errors } from '@strapi/utils';

import { getService } from '../utils';
import { FOLDER_MODEL_UID } from '../constants';
import { validateCreateFolder, validateUpdateFolder } from './validation/admin/folder';

export default {
  async findOne(ctx: Context) {
    const { id } = ctx.params;

    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    await permissionsManager.validateQuery(ctx.query);
    const query = await permissionsManager.sanitizeQuery(ctx.query);

    const { results } = await strapi.db.query(FOLDER_MODEL_UID).findPage(
      strapi.get('query-params').transform(
        FOLDER_MODEL_UID,
        defaultsDeep({}, query, {
          filters: { id },
          populate: {
            children: {
              count: true,
            },
            files: {
              count: true,
            },
          },
        })
      )
    );

    if (results.length === 0) {
      return ctx.notFound('folder not found');
    }

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(results[0]),
    };
  },

  async find(ctx: Context) {
    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    await permissionsManager.validateQuery(ctx.query);
    const query = await permissionsManager.sanitizeQuery(ctx.query);

    const dbQuery = strapi.get('query-params').transform(
      FOLDER_MODEL_UID,
      defaultsDeep({}, query, {
        populate: {
          children: {
            count: true,
          },
          files: {
            count: true,
          },
        },
      })
    );

    // Pagination is opt-in: a client that sends `page` or `pageSize` gets one
    // page plus the `pagination` metadata. Without them the endpoint keeps
    // returning every matching folder, which existing callers (destination
    // selects, the legacy picker) rely on.
    if (query.page != null || query.pageSize != null) {
      // The query transform accepts any positive integer, so an oversized page
      // or pageSize would reach the database as an out-of-range LIMIT/OFFSET
      // and fail there with a 500. Reject it as a bad request instead.
      const { page = 1, pageSize = 10 } = dbQuery;

      if (!Number.isSafeInteger(page * pageSize)) {
        throw new errors.ValidationError('page and pageSize are too large');
      }

      const { results, pagination } = await strapi.db.query(FOLDER_MODEL_UID).findPage(dbQuery);

      ctx.body = {
        data: await permissionsManager.sanitizeOutput(results),
        pagination,
      };

      return;
    }

    const results = await strapi.db.query(FOLDER_MODEL_UID).findMany(dbQuery);

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(results),
    };
  },
  async create(ctx: Context) {
    const { user } = ctx.state;
    const { body } = ctx.request;

    await validateCreateFolder(body);

    const folderService = getService('folder');

    const folder = await folderService.create(body, { user });

    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    ctx.created({
      data: await permissionsManager.sanitizeOutput(folder),
    });
  },

  async update(ctx: Context) {
    const { id } = ctx.params;
    const { user } = ctx.state;
    const { body } = ctx.request;

    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    await validateUpdateFolder(id)(body);

    const folderService = getService('folder');

    const updatedFolder = await folderService.update(id, body, { user });

    if (!updatedFolder) {
      return ctx.notFound('folder not found');
    }

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(updatedFolder),
    };
  },

  async getStructure(ctx: Context) {
    const { getStructure } = getService('folder');

    const structure = await getStructure();

    ctx.body = {
      data: structure,
    };
  },
};
