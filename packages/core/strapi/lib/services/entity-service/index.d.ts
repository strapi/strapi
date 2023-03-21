import { Database } from '@strapi/database';
import { Strapi } from '../../';

type ID = number | string;

type EntityServiceAction =
  | 'findMany'
  | 'findPage'
  | 'findWithRelationCountsPage'
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
  uploadFiles<K extends keyof AllTypes, T extends AllTypes[K]>(uid: K, entity, files);
  wrapParams<K extends keyof AllTypes, T extends AllTypes[K]>(
    params: Params<T>,
    { uid: K, action: EntityServiceAction }
  );

  findMany<K extends keyof AllTypes, T extends AllTypes[K]>(
    uid: K,
    params: Params<T>
  ): Promise<T[]>;
  findPage<K extends keyof AllTypes, T extends AllTypes[K]>(
    uid: K,
    params: Params<T>
  ): Promise<{
    results: T[];
    pagination: PaginationInfo;
  }>;

  findWithRelationCountsPage<K extends keyof AllTypes, T extends AllTypes[K]>(
    uid: K,
    params: Params<T>
  ): Promise<{
    results: T[];
    pagination: PaginationInfo;
  }>;

  findWithRelationCounts<K extends keyof AllTypes, T extends AllTypes[K]>(
    uid: K,
    params: Params<T>
  ): Promise<T[]>;

  findOne<K extends keyof AllTypes, T extends AllTypes[K]>(
    uid: K,
    entityId: ID,
    params: Params<T>
  ): Promise<T>;

  count<K extends keyof AllTypes, T extends AllTypes[K]>(uid: K, params: Params<T>): Promise<any>;
  create<K extends keyof AllTypes, T extends AllTypes[K]>(uid: K, params: Params<T>): Promise<any>;
  update<K extends keyof AllTypes, T extends AllTypes[K]>(
    uid: K,
    entityId: ID,
    params: Params<T>
  ): Promise<any>;
  delete<K extends keyof AllTypes, T extends AllTypes[K]>(
    uid: K,
    entityId: ID,
    params: Params<T>
  ): Promise<any>;
  clone<K extends keyof AllTypes, T extends AllTypes[K]>(
    uid: K,
    cloneId: ID,
    params: Params<T>
  ): Promise<any>;
}

export default function (opts: {
  strapi: Strapi;
  db: Database;
  // TODO: define types
  eventHub: any;
  entityValidator: any;
}): EntityService;
