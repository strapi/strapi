import type { Context } from "../../types";

export default ({ strapi }: Context) => ({
  async resolvePagination(parent: any, _: any, ctx: any) {
    const {
      args,
      resourceUID,
      total: precomputedTotal,
      skipValidation = false,
      skipSanitize = false,
    } = parent.info;

    const { start, limit } = args;
    const safeLimit = Math.max(limit, 1);
    const contentType = strapi.getModel(resourceUID);
    let total: number;

    // If total is provided externally, skip compute.
    if (typeof precomputedTotal === "number") {
      total = precomputedTotal;
    } else {
      // Run validation unless explicitly skipped.
      if (skipValidation !== true) {
        await strapi.contentAPI.validate.query(args, contentType, {
          auth: ctx?.state?.auth,
        });
      }

      // Sanitize query unless explicitly skipped.
      const sanitizedQuery = skipSanitize
        ? args
        : await strapi.contentAPI.sanitize.query(args, contentType, {
            auth: ctx?.state?.auth,
          });

      total = await strapi.documents!(resourceUID).count(sanitizedQuery);
    }

    const pageSize = limit === -1 ? total - start : safeLimit;
    const pageCount = limit === -1 ? safeLimit : Math.ceil(total / safeLimit);
    const page = limit === -1 ? safeLimit : Math.floor(start / safeLimit) + 1;

    return { total, page, pageSize, pageCount };
  },
});
