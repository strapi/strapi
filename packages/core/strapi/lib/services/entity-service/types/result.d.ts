import type { Attribute, Common } from '@strapi/strapi';

type Pagination = { page: number; pageSize: number; pageCount: number; total: number };

export type Result<TSchemaUID extends Common.UID.Schema> = Attribute.GetValues<TSchemaUID>;

export type PaginatedResult<TSchemaUID extends Common.UID.Schema> = {
  results: Result<TSchemaUID>[];
  pagination: Pagination;
};
