import { errors } from '@strapi/utils';
import type { Common, Strapi } from '@strapi/types';
import { getService as getContentManagerService } from '../../utils';
import { getService } from '../utils';
import { HistoryVersions } from '../../../../shared/contracts';

const createHistoryVersionController = ({ strapi }: { strapi: Strapi }) => {
  return {
    async findMany(ctx) {
      if (!ctx.query.contentType || !ctx.query.documentId) {
        throw new errors.ForbiddenError('contentType and documentId are required');
      }

      const params = ctx.query as HistoryVersions.GetHistoryVersions.Request['query'];

      /**
       * There are no permissions specifically for history versions,
       * but we need to check that the user can read the content type
       */
      const permissionChecker = getContentManagerService('permission-checker').create({
        userAbility: ctx.state.userAbility,
        model: params.contentType,
      });

      if (permissionChecker.cannot.read()) {
        return ctx.forbidden();
      }

      const { results, pagination } = await getService(strapi, 'history').findVersionsPage(params);

      return { data: results, meta: { pagination } };
    },
  } satisfies Common.Controller;
};

export { createHistoryVersionController };
