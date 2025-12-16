import type { Context } from 'koa';

import { strings, errors } from '@strapi/utils';
import { trim } from 'lodash/fp';
import { getService } from '../utils';
import {
  Create,
  List,
  Revoke,
  Get,
  Update,
} from '../../../shared/contracts/service-account';

const { ApplicationError } = errors;

export default {
  async create(ctx: Context) {
    const { body } = ctx.request as Create.Request;
    const serviceAccountTokenService = getService('service-account-token');

    /**
     * We trim both field to avoid having issues with either:
     * - having a space at the end or start of the value.
     * - having only spaces as value;
     */
    const attributes = {
      name: trim(body.name),
      description: trim(body.description || ''),
      roles: body.roles,
      lifespan: body.lifespan,
    };

    const alreadyExists = await serviceAccountTokenService.exists({ name: attributes.name });
    if (alreadyExists) {
      throw new ApplicationError('Name already taken');
    }

    const serviceAccountToken = await serviceAccountTokenService.create(attributes);
    ctx.created({ data: serviceAccountToken } satisfies Create.Response);
  },

  async regenerate(ctx: Context) {
    const { id } = ctx.params;
    const serviceAccountTokenService = getService('service-account-token');

    const serviceAccountTokenExists = await serviceAccountTokenService.getById(id);
    if (!serviceAccountTokenExists) {
      ctx.notFound('Service Account Token not found');
      return;
    }

    const accessToken = await serviceAccountTokenService.regenerate(id);

    ctx.created({ data: accessToken });
  },

  async list(ctx: Context) {
    const serviceAccountTokenService = getService('service-account-token');
    const serviceAccountTokens = await serviceAccountTokenService.list();

    ctx.send({ data: serviceAccountTokens } satisfies List.Response);
  },

  async revoke(ctx: Context) {
    const { id } = ctx.params as Revoke.Params;
    const serviceAccountTokenService = getService('service-account-token');
    const serviceAccountToken = await serviceAccountTokenService.revoke(id);

    ctx.deleted({ data: serviceAccountToken } satisfies Revoke.Response);
  },

  async get(ctx: Context) {
    const { id } = ctx.params;
    const serviceAccountTokenService = getService('service-account-token');
    const serviceAccountToken = await serviceAccountTokenService.getById(id);

    if (!serviceAccountToken) {
      ctx.notFound('Service Account Token not found');
      return;
    }

    ctx.send({ data: serviceAccountToken } satisfies Get.Response);
  },

  async update(ctx: Context) {
    const { body } = ctx.request as Update.Request;
    const { id } = ctx.params as Update.Params;
    const serviceAccountTokenService = getService('service-account-token');

    const attributes = body;
    /**
     * We trim both field to avoid having issues with either:
     * - having a space at the end or start of the value.
     * - having only spaces as value;
     */
    if ('name' in attributes && attributes.name !== undefined) {
      attributes.name = trim(attributes.name);
    }

    if ('description' in attributes && attributes.description !== undefined) {
      attributes.description = attributes.description !== null ? trim(attributes.description) : undefined;
    }

    const serviceAccountTokenExists = await serviceAccountTokenService.getById(id);
    if (!serviceAccountTokenExists) {
      return ctx.notFound('Service Account Token not found');
    }

    if ('name' in attributes && attributes.name !== undefined) {
      const nameAlreadyTaken = await serviceAccountTokenService.getByName(attributes.name);

      /**
       * We cast the ids as string as the one coming from the ctx isn't cast
       * as a Number in case it is supposed to be an integer. It remains
       * as a string. This way we avoid issues with integers in the db.
       */
      if (!!nameAlreadyTaken && !strings.isEqual(nameAlreadyTaken.id, id)) {
        throw new ApplicationError('Name already taken');
      }
    }

    const serviceAccountToken = await serviceAccountTokenService.update(id, attributes);
    ctx.send({ data: serviceAccountToken } satisfies Update.Response);
  },
};
