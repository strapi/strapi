import { errors } from '@strapi/utils';

import type { Context } from 'koa';

import { ACTIONS, FILE_MODEL_UID } from '../constants';
import { getService } from '../utils';

export default {
  async importFromVimeoId(ctx: Context) {
    const {
      state: { userAbility, user },
      request: { body },
    } = ctx;

    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const vimeoId = body?.vimeoId?.trim();
    const fileInfo = body?.fileInfo || {};

    if (!vimeoId || !/^\d+$/.test(vimeoId)) {
      throw new errors.ValidationError('Invalid vimeoId');
    }

    const uploadService = getService('upload');

    let file;

    try {
      file = await uploadService.importFromVimeoId({ vimeoId, fileInfo }, { user });
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : (err ?? ''));
      throw new errors.ValidationError(`Vimeo Service Error : ${msg}`);
    }

    const signedFile = await getService('file').signFileUrls(file);

    ctx.body = await pm.sanitizeOutput(signedFile, {
      action: ACTIONS.read,
    });

    ctx.status = 201;
  },
};
