import { errors } from '@strapi/utils';
import type { Common, Strapi, UID } from '@strapi/types';
import { getService as getContentManagerService } from '../../utils';
import { getService } from '../utils';
import { HistoryVersions } from '../../../../shared/contracts';

const validatePagination = ({ page, pageSize }: { page: any; pageSize: any }) => {
  let pageNumber = 1;
  let pageSizeNumber = 10;

  if (page) {
    pageNumber = parseInt(page, 10);

    if (Number.isNaN(pageNumber) || pageNumber < 1) {
      throw new errors.PaginationError('invalid pageNumber param');
    }
  }

  if (pageSize) {
    pageSizeNumber = parseInt(pageSize, 10);

    if (Number.isNaN(pageSizeNumber) || pageSizeNumber < 1 || pageSizeNumber > 100) {
      throw new errors.PaginationError('invalid pageSize param');
    }
  }

  return { page: pageNumber, pageSize: pageSizeNumber };
};

const createHistoryVersionController = ({ strapi }: { strapi: Strapi }) => {
  return {
    async findMany(ctx) {
      const contentTypeUid = ctx.query.contentType as UID.ContentType;
      const isSingleType = strapi.getModel(contentTypeUid).kind === 'singleType';

      if (isSingleType && !contentTypeUid) {
        throw new errors.ForbiddenError('contentType is required');
      }

      if (!contentTypeUid && !ctx.query.documentId) {
        throw new errors.ForbiddenError('contentType and documentId are required');
      }

      /**
       * There are no permissions specifically for history versions,
       * but we need to check that the user can read the content type
       */
      const permissionChecker = getContentManagerService('permission-checker').create({
        userAbility: ctx.state.userAbility,
        model: ctx.query.contentType,
      });

      if (permissionChecker.cannot.read()) {
        return ctx.forbidden();
      }

      const params: HistoryVersions.GetHistoryVersions.Request['query'] =
        await permissionChecker.sanitizeQuery(ctx.query);

      const { results, pagination } = await getService(strapi, 'history').findVersionsPage({
        ...params,
        ...validatePagination({ page: params.page, pageSize: params.pageSize }),
      });

      return { data: results, meta: { pagination } };
    },
  } satisfies Common.Controller;
};

export { createHistoryVersionController };
