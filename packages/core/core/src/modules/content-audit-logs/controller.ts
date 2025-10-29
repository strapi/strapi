import { yup } from '@strapi/utils';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

const querySchema = yup
  .object({
    contentType: yup.string().trim().optional(),
    userId: yup.string().trim().optional(),
    action: yup
      .string()
      .oneOf(['create', 'update', 'delete'])
      .optional(),
    start: yup
      .date()
      .transform((value, originalValue) => {
        if (!originalValue) {
          return undefined;
        }

        const asDate = new Date(originalValue);
        return Number.isNaN(asDate.valueOf()) ? undefined : asDate;
      })
      .optional(),
    end: yup
      .date()
      .transform((value, originalValue) => {
        if (!originalValue) {
          return undefined;
        }

        const asDate = new Date(originalValue);
        return Number.isNaN(asDate.valueOf()) ? undefined : asDate;
      })
      .optional(),
    page: yup.number().integer().min(1).default(1),
    pageSize: yup.number().integer().min(1).max(100).default(20),
    sort: yup
      .string()
      .matches(/^timestamp:(asc|desc)$/)
      .default('timestamp:desc'),
  })
  .default({});

type QueryParams = yup.InferType<typeof querySchema>;

const buildWhereClause = (params: QueryParams) => {
  const filters: Record<string, unknown>[] = [];

  if (params.contentType) {
    filters.push({ contentType: params.contentType });
  }

  if (params.userId) {
    filters.push({ userId: params.userId });
  }

  if (params.action) {
    filters.push({ action: params.action });
  }

  if (params.start || params.end) {
    const range: Record<string, string> = {};

    if (params.start) {
      range.$gte = params.start.toISOString();
    }

    if (params.end) {
      range.$lte = params.end.toISOString();
    }

    filters.push({ timestamp: range });
  }

  if (filters.length === 0) {
    return {};
  }

  return { $and: filters };
};

const buildOrderBy = (sort: string) => {
  const [field, direction] = sort.split(':');

  return [
    {
      [field]: direction as 'asc' | 'desc',
    },
  ];
};

const auditLogController: Core.Controller = {
  async find(ctx: Koa.Context) {
    const params = (await querySchema.validate(ctx.query, {
      abortEarly: false,
      stripUnknown: true,
    })) as QueryParams;

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const { results, total } = await strapi
      .get('content-audit-logs')
      .find({
        where: buildWhereClause(params),
        offset,
        limit: pageSize,
        orderBy: buildOrderBy(params.sort ?? 'timestamp:desc'),
      });

    const pageCount = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

    ctx.body = {
      data: results,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount,
          total,
        },
      },
    };
  },
};

export { auditLogController };
