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

    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.read,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    // validate the incoming user query params
    await pm.validateQuery(ctx.query);

    const query = await async.pipe(
      // Start by sanitizing the incoming query
      (q) => pm.sanitizeQuery(q),
      // Add the default query which should not be validated or sanitized
      (q) => merge(defaultQuery, q),
      // Add the dynamic filters based on permissions' conditions
      (q) => pm.addPermissionsQueryTo(q)
    )(ctx.query);

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
