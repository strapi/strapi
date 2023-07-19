import { Knex } from 'knex';
import { LifecycleProvider } from './lifecycles';
import { MigrationProvider } from './migrations';
import { SchemaProvider } from './schema';
export * as errors from './errors';

type ID = number | string;

type LogicalOperators<T> = {
  $and?: WhereParams<T>[];
  $or?: WhereParams<T>[];
  $not?: WhereParams<T>;
};

type AttributeOperators<T, K extends keyof T> = {
  $eq?: T[K] | Array<T[K]>;
  $ne?: T[K] | Array<T[K]>;
  $nei?: T[K] | Array<T[K]>;
  $in?: T[K][];
  $notIn?: T[K][];
  $lt?: T[K];
  $lte?: T[K];
  $gt?: T[K];
  $gte?: T[K];
  $between?: [T[K], T[K]];
  $contains?: T[K];
  $notContains?: T[K];
  $containsi?: T[K];
  $notContainsi?: T[K];
  $startsWith?: T[K];
  $endsWith?: T[K];
  $null?: boolean;
  $notNull?: boolean;
  $not?: WhereParams<T> | AttributeOperators<T, K>;
};

export type WhereParams<T> = {
  [K in keyof T]?: T[K] | T[K][] | AttributeOperators<T, K>;
} & LogicalOperators<T>;

type Sortables<T> = {
  // check sortable
  [P in keyof T]: P;
}[keyof T];

type Direction = 'asc' | 'ASC' | 'DESC' | 'desc';

interface FindParams<T> {
  select?: (keyof T)[];
  // TODO: add nested operators & relations
  where?: WhereParams<T>;
  limit?: number;
  offset?: number;
  orderBy?: // TODO: add relations
  | Sortables<T>
    | Sortables<T>[]
    | { [K in Sortables<T>]?: Direction }
    | { [K in Sortables<T>]?: Direction }[];
  // TODO: define nested obj
  populate?: (keyof T)[];
}

interface CreateParams<T> {
  select?: (keyof T)[];
  populate?: (keyof T)[];
  data: T[keyof T];
}

interface CreateManyParams<T> {
  select?: (keyof T)[];
  populate?: (keyof T)[];
  data: T[keyof T][];
}

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

interface PopulateParams {}
interface EntityManager {
  findOne<K extends keyof AllTypes>(uid: K, params: FindParams<AllTypes[K]>): Promise<any>;
  findMany<K extends keyof AllTypes>(uid: K, params: FindParams<AllTypes[K]>): Promise<any[]>;

  create<K extends keyof AllTypes>(uid: K, params: CreateParams<AllTypes[K]>): Promise<any>;
  createMany<K extends keyof AllTypes>(
    uid: K,
    params: CreateManyParams<AllTypes[K]>
  ): Promise<{ count: number; ids: ID[] }>;

  update<K extends keyof AllTypes>(uid: K, params: any): Promise<any>;
  updateMany<K extends keyof AllTypes>(uid: K, params: any): Promise<{ count: number }>;

  delete<K extends keyof AllTypes>(uid: K, params: any): Promise<any>;
  deleteMany<K extends keyof AllTypes>(uid: K, params: any): Promise<{ count: number }>;

  count<K extends keyof AllTypes>(uid: K, params: any): Promise<number>;

  attachRelations<K extends keyof AllTypes>(uid: K, id: ID, data: any): Promise<any>;
  updateRelations<K extends keyof AllTypes>(uid: K, id: ID, data: any): Promise<any>;
  deleteRelations<K extends keyof AllTypes>(uid: K, id: ID): Promise<any>;

  populate<K extends keyof AllTypes, T extends AllTypes[K]>(
    uid: K,
    entity: T,
    populate: PopulateParams
  ): Promise<T>;

  load<K extends keyof AllTypes, T extends AllTypes[K], SK extends keyof T>(
    uid: K,
    entity: T,
    field: SK,
    populate: PopulateParams
  ): Promise<T[SK]>;
}

export interface QueryFromContentType<T extends keyof AllTypes> {
  findOne(params?: any): Promise<any>;
  findMany(params?: any): Promise<any[]>;
  findWithCount(params?: any): Promise<[any[], number]>;
  findPage(params?: any): Promise<{ results: any[]; pagination: Pagination }>;

  create(params?: any): Promise<any>;
  createMany(params?: any): Promise<{ count: number; ids: ID[] }>;

  update(params?: any): Promise<any>;
  updateMany(params?: any): Promise<{ count: number }>;

  delete(params?: any): Promise<any>;
  deleteMany(params?: any): Promise<{ count: number }>;

  count(params?: any): Promise<number>;

  attachRelations(id: ID, data: any): Promise<any>;
  updateRelations(id: ID, data: any): Promise<any>;
  deleteRelations(id: ID): Promise<any>;

  populate<S extends AllTypes[T]>(entity: S, populate: PopulateParams): Promise<S>;
  clone<S extends AllTypes[T]>(cloneId: ID, params?: Params<S>): Promise<S>;
  load<S extends AllTypes[T], K extends string>(
    entity: S,
    field: K | K[],
    populate?: PopulateParams
  ): Promise<S[K]>;
  loadPages<S extends AllTypes[T], K extends string>(
    entity: S,
    field: K | K[],
    populate?: PopulateParams
  ): Promise<S[K]>;
}

interface ModelConfig {
  tableName: string;
  [k: string]: any;
}

interface ConnectionConfig {}

interface DatabaseConfig {
  connection: ConnectionConfig;
  models: ModelConfig[];
}
export interface Database {
  schema: SchemaProvider;
  lifecycles: LifecycleProvider;
  migrations: MigrationProvider;
  entityManager: EntityManager;
  queryBuilder: any;
  metadata: any;
  connection: Knex;
  dialect: {
    client: string;
  };

  destroy(): Promise<void>;

  getSchemaConnection: () => Knex.SchemaBuilder;

  query: <T extends keyof AllTypes>(uid: T) => QueryFromContentType<T>;
  transaction(
    cb?: (params: {
      trx: Knex.Transaction;
      rollback: () => Promise<void>;
      commit: () => Promise<void>;
      onCommit: (cb) => void;
      onRollback: (cb) => void;
    }) => Promise<unknown>
  ):
    | Promise<unknown>
    | { get: () => Knex.Transaction; rollback: () => Promise<void>; commit: () => Promise<void> };
  inTransaction: () => boolean;
}
export class Database implements Database {
  static transformContentTypes(contentTypes: any[]): ModelConfig[];
  static init(config: DatabaseConfig): Promise<Database>;
}
