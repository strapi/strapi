import { StrapiContentTypes } from '@strapi/strapi';
import { LifecycleProvider } from './lifecycles';
import { MigrationProvider } from './migrations';
import { SchemaProvideer } from './schema';
import { Database } from '../lib/index';
export { Database };

export type BooleanWhere<T> = {
  $and?: WhereParams<T>[];
  $or?: WhereParams<T>[];
  $not?: WhereParams<T>;
};

export type WhereParams<T> = {
  [K in keyof T]?: T[K];
} &
  BooleanWhere<T>;

export type Sortables<T> = {
  // check sortable
  [P in keyof T]: P;
}[keyof T];

export type Direction = 'asc' | 'ASC' | 'DESC' | 'desc';

export interface FindParams<T> {
  select?: (keyof T)[];
  // TODO: add nested operators & relations
  where?: WhereParams<T>;
  limit?: number;
  offset?: number;
  orderBy?:  // TODO: add relations
    | Sortables<T>
    | Sortables<T>[]
    | { [K in Sortables<T>]?: Direction }
    | { [K in Sortables<T>]?: Direction }[];
  // TODO: define nested obj
  populate?: (keyof T)[];
}

export interface CreateParams<T> {
  select?: (keyof T)[];
  populate?: (keyof T)[];
  data: T;
}

export interface UpdateParams<T> extends FindParams<T> {
  data: Omit<Partial<T>, 'id'>;
}

export interface CreateManyParams<T> {
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

export interface PopulateParams {}

export type Entity<T> = T & {
  id: string;
};

export interface EntityManager {
  findOne<K extends keyof StrapiContentTypes>(
    uid: K,
    params: FindParams<StrapiContentTypes[K]>,
    options?: {
      populate?: PopulateParams;
    }
  ): Promise<any>;
  findMany<K extends keyof StrapiContentTypes>(
    uid: K,
    params: FindParams<StrapiContentTypes[K]>
  ): Promise<any[]>;
  findPage<K extends keyof StrapiContentTypes>(
    uid: K,
    options?: {
      populate?: PopulateParams;
    }
  ): Promise<any[]>;

  create<K extends keyof StrapiContentTypes>(
    uid: K,
    params: CreateParams<StrapiContentTypes[K]>
  ): Promise<any>;
  createMany<K extends keyof StrapiContentTypes>(
    uid: K,
    params: CreateManyParams<StrapiContentTypes[K]>
  ): Promise<{ count: number }>;

  update<K extends keyof StrapiContentTypes>(uid: K, params: any): Promise<any>;
  updateMany<K extends keyof StrapiContentTypes>(uid: K, params: any): Promise<{ count: number }>;

  delete<K extends keyof StrapiContentTypes>(uid: K, params: any): Promise<any>;
  deleteMany<K extends keyof StrapiContentTypes>(uid: K, params: any): Promise<{ count: number }>;

  count<K extends keyof StrapiContentTypes>(uid: K, params: any): Promise<number>;

  attachRelations<K extends keyof StrapiContentTypes>(uid: K, id: ID, data: any): Promise<any>;
  updateRelations<K extends keyof StrapiContentTypes>(uid: K, id: ID, data: any): Promise<any>;
  deleteRelations<K extends keyof StrapiContentTypes>(uid: K, id: ID): Promise<any>;

  populate<K extends keyof StrapiContentTypes, T extends StrapiContentTypes[K]>(
    uid: K,
    entity: T,
    populate: PopulateParams
  ): Promise<T>;

  load<K extends keyof StrapiContentTypes, T extends StrapiContentTypes[K], SK extends keyof T>(
    uid: K,
    entity: T,
    field: SK,
    populate: PopulateParams
  ): Promise<T[SK]>;

  createQueryBuilder<K extends keyof StrapiContentTypes>(uid: K): QueryFromContentType<K>;

  getRepository<K extends keyof StrapiContentTypes>(uid: K): QueryFromContentType<K>;
}

export interface QueryFromContentType<T extends keyof StrapiContentTypes> {
  findOne(
    params: FindParams<Entity<StrapiContentTypes[T]>>
  ): Promise<Entity<StrapiContentTypes[T]> | undefined>;
  findMany(
    params?: FindParams<Entity<StrapiContentTypes[T]>>
  ): Promise<Entity<StrapiContentTypes[T]>[]>;
  findWithCount(
    params: FindParams<Entity<StrapiContentTypes[T]>>
  ): Promise<[Entity<StrapiContentTypes[T]>[], number]>;
  findPage(
    params?: FindParams<Entity<StrapiContentTypes[T]>>
  ): Promise<{ results: Entity<StrapiContentTypes[T]>[]; pagination: Pagination }>;

  create(params: CreateParams<StrapiContentTypes[T]>): Promise<Entity<StrapiContentTypes[T]>>;
  createMany(params: CreateManyParams<StrapiContentTypes[T]>): Promise<{ count: number }>;

  update(
    params: UpdateParams<Entity<StrapiContentTypes[T]>>
  ): Promise<Entity<StrapiContentTypes[T]>>;
  updateMany(params: UpdateParams<Entity<StrapiContentTypes[T]>>): Promise<{ count: number }>;

  delete(
    params?: FindParams<Entity<StrapiContentTypes[T]>>
  ): Promise<Entity<StrapiContentTypes[T]>>;
  deleteMany(params?: FindParams<Entity<StrapiContentTypes[T]>>): Promise<{ count: number }>;

  count(params?: FindParams<StrapiContentTypes[T]>): Promise<number>;

  attachRelations(id: string, data: any): Promise<any>;
  updateRelations(id: string, data: any): Promise<any>;
  deleteRelations(id: string): Promise<any>;

  populate<S extends StrapiContentTypes[T]>(entity: S, populate: PopulateParams): Promise<S>;

  load<S extends StrapiContentTypes[T], K extends keyof S>(
    entity: S,
    field: K,
    populate?: PopulateParams
  ): Promise<S[K]>;
}

export interface ModelConfig {
  tableName: string;
  [k: string]: any;
}

export interface ConnectionConfig {}

export interface DatabaseConfig {
  connection: ConnectionConfig;
  models: ModelConfig[];
}
// export class Database implements Database {
//   schema: SchemaProvideer;
//   lifecycles: LifecycleProvider;
//   migrations: MigrationProvider;
//   entityManager: EntityManager;

//   query<T extends keyof StrapiContentTypes>(uid: T): QueryFromContentType<T>;
//   static transformContentTypes(contentTypes: any[]): ModelConfig[];
//   static init(config: DatabaseConfig): Promise<Database>;
// }
