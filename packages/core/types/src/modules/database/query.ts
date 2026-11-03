import type { Readable } from 'node:stream';
import type { Knex } from 'knex';

/** @internal Public through `@strapi/database` only. */
export interface Join {
  method?: 'leftJoin' | 'innerJoin';
  alias: string;
  referencedTable: string;
  referencedColumn: string;
  rootColumn: string;
  rootTable?: string;
  on?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/** @internal Public through `@strapi/database` only. */
export interface QueryBuilderState {
  type: 'select' | 'insert' | 'update' | 'delete' | 'count' | 'max' | 'min' | 'truncate';
  select: Array<string | Knex.Raw>;
  count: string | null;
  max: string | null;
  min: string | null;
  first: boolean;
  data: Record<string, unknown> | (null | Record<string, unknown>)[] | null;
  where: Record<string, unknown>[];
  joins: Join[];
  populate: object | null;
  limit: number | null;
  offset: number | null;
  transaction: any;
  forUpdate: boolean;
  onConflict: any;
  merge: any;
  ignore: boolean;
  orderBy: any[];
  groupBy: any[];
  increments: any[];
  decrements: any[];
  aliasCounter: number;
  filters: any;
  search: string;
  processed: boolean;
}

/** @internal Public through `@strapi/database` only. */
export interface QueryBuilder {
  alias: string;
  state: QueryBuilderState;
  raw: Knex.RawBuilder;

  getAlias(): string;

  clone(): QueryBuilder;

  select(args: string | Array<string | Knex.Raw>): QueryBuilder;

  addSelect(args: string | string[]): QueryBuilder;

  insert<TData extends Record<string, unknown> | Record<string, unknown>[]>(
    data: TData
  ): QueryBuilder;

  onConflict(args: any): QueryBuilder;

  merge(args: any): QueryBuilder;

  ignore(): QueryBuilder;

  delete(): QueryBuilder;

  ref(name: string): any;

  update<TData extends Record<string, unknown>>(data: TData): QueryBuilder;

  increment(column: string, amount?: number): QueryBuilder;

  decrement(column: string, amount?: number): QueryBuilder;

  count(count?: string): QueryBuilder;

  max(column: string): QueryBuilder;

  min(column: string): QueryBuilder;

  where(where?: object): QueryBuilder;

  limit(limit: number): QueryBuilder;

  offset(offset: number): QueryBuilder;

  orderBy(orderBy: any): QueryBuilder;

  groupBy(groupBy: any): QueryBuilder;

  populate(populate: any): QueryBuilder;

  search(query: string): QueryBuilder;

  transacting(transaction: any): QueryBuilder;

  forUpdate(): QueryBuilder;

  init(params?: any): QueryBuilder;

  filters(filters: any): void;

  first(): QueryBuilder;

  join(join: any): QueryBuilder;

  mustUseAlias(): boolean;

  aliasColumn(key: any, alias?: string): any;

  shouldUseSubQuery(): boolean;

  runSubQuery(): any;

  processState(): void;

  ensurePaginationOrderStability(): void;

  shouldUseDistinct(): boolean;

  shouldUseDeepSort(): boolean;

  processSelect(): void;

  getKnexQuery(): Knex.QueryBuilder;

  execute<T>(options?: { mapResults?: boolean }): Promise<T>;

  stream(options?: { mapResults?: boolean }): Readable;
}
