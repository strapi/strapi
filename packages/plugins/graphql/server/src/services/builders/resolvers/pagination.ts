import type { Context } from '../../types';

export default ({ strapi }: Context) => ({
  async resolvePagination(parent: any, _: any, ctx: any) {
    const { args, resourceUID } = parent.info;
    const { start, limit } = args;
    const safeLimit = Math.max(limit, 1);
    const contentType = strapi.getModel(resourceUID);

    await strapi.contentAPI.validate.query(args, contentType, {
      auth: ctx?.state?.auth,
    });

    const sanitizedQuery = await strapi.contentAPI.sanitize.query(args, contentType, {
      auth: ctx?.state?.auth,
    });

    const total = await strapi.documents!(resourceUID).count(sanitizedQuery);

    const pageSize = limit === -1 ? total - start : safeLimit;
    const pageCount = limit === -1 ? safeLimit : Math.ceil(total / safeLimit);
    const page = limit === -1 ? safeLimit : Math.floor(start / safeLimit) + 1;

    return { total, page, pageSize, pageCount };
  },
});
