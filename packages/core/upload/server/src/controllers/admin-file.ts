import { merge } from 'lodash/fp';
import { async } from '@strapi/utils';

import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS, FILE_MODEL_UID } from '../constants';
import { findEntityAndCheckPermissions } from './utils/find-entity-and-check-permissions';

export default {
  async find(ctx: Context) {
    const {
      state: { userAbility },
    } = ctx;

    const defaultQuery = { populate: { folder: true } };

    const pm = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.read,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const pmQuery = pm.addPermissionsQueryTo(merge(defaultQuery, ctx.query));

    await pm.validateQuery(pmQuery);
    const query = await pm.sanitizeQuery(pmQuery);

    const { results: files, pagination } = await getService('upload').findPage(query);

    // Sign file urls for private providers
    const signedFiles = await async.map(files, getService('file').signFileUrls);

    const sanitizedFiles = await pm.sanitizeOutput(signedFiles);

    return { results: sanitizedFiles, pagination };
  },

  async findOne(ctx: Context) {
    const {
      state: { userAbility },
      params: { id },
    } = ctx;

    const { pm, file } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.read,
      FILE_MODEL_UID,
      id
    );

    const signedFile = await getService('file').signFileUrls(file);
    ctx.body = await pm.sanitizeOutput(signedFile);
  },

  async destroy(ctx: Context) {
    const { id } = ctx.params;
    const { userAbility } = ctx.state;

    const { pm, file } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    const [body] = await Promise.all([
      pm.sanitizeOutput(file, { action: ACTIONS.read }),
      getService('upload').remove(file),
    ]);

    ctx.body = body;
  },
};
