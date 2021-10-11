import { Database } from '@strapi/database';
import { Strapi, StrapiModels } from '@strapi/strapi';

type ID = number | string;

type EntityServiceAction =
  | 'findMany'
  | 'findPage'
  | 'findWithRelationCounts'
  | 'findOne'
  | 'count'
  | 'create'
  | 'update'
  | 'delete';

type PaginationInfo = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

type Params<T> = {
  fields?: (keyof T)[];
  filters?: any;
  _q?: string;
  populate?: any;
  sort?: any;
  start?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
  publicationState?: string;
  data?: any;
  files?: any;
};

export interface EntityService {
  uploadFiles<K extends keyof StrapiModels, T extends StrapiModels[K]>(uid: K, entity, files);
  wrapParams<K extends keyof StrapiModels, T extends StrapiModels[K]>(
    params: Params<T>,
    { uid: K, action: EntityServiceAction }
  );

  findMany<K extends keyof StrapiModels, T extends StrapiModels[K]>(
    uid: K,
    params: Params<T>
  ): Promise<T[]>;
  findPage<K extends keyof StrapiModels, T extends StrapiModels[K]>(
    uid: K,
    params: Params<T>
  ): Promise<{
    results: T[];
    pagination: PaginationInfo;
  }>;

  findWithRelationCounts<K extends keyof StrapiModels, T extends StrapiModels[K]>(
    uid: K,
    params: Params<T>
  ): Promise<{
    results: T[];
    pagination: PaginationInfo;
  }>;

  findOne<K extends keyof StrapiModels, T extends StrapiModels[K]>(
    uid: K,
    entityId: ID,
    params: Params<T>
  ): Promise<T>;

  count<K extends keyof StrapiModels, T extends StrapiModels[K]>(uid: K, params: Params<T>): Promise<any>;
  create<K extends keyof StrapiModels, T extends StrapiModels[K]>(uid: K, params: Params<T>): Promise<any>;
  update<K extends keyof StrapiModels, T extends StrapiModels[K]>(
    uid: K,
    entityId: ID,
    params: Params<T>
  ): Promise<any>;
  delete<K extends keyof StrapiModels, T extends StrapiModels[K]>(
    uid: K,
    entityId: ID,
    params: Params<T>
  ): Promise<any>;
}

export default function(opts: {
  strapi: Strapi;
  db: Database;
  // TODO: define types
  eventHub: any;
  entityValidator: any;
}): EntityService;
