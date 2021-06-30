import { Database } from '@strapi/database';
import { Strapi } from './Strapi';

type StrapiInstance = InstanceType<typeof Strapi>;

type ID = number | string;

interface Options<T> {
  params: Params<T>;
}

interface Params<T> {
  fields: (keyof T)[];
}

interface EntityService {
  uploadFiles<T extends keyof AllTypes>(uid: T);
  wrapOptions<T extends keyof AllTypes>(uid: T);

  find<T extends keyof AllTypes>(uid: T): Promise<AllTypes[T][]>;
  findPage<T extends keyof AllTypes>(uid: T): Promise<any>;
  findWithRelationCounts<T extends keyof AllTypes>(uid: T): Promise<any>;
  findOne<T extends keyof AllTypes>(
    uid: T,
    id: ID,
    opts: Options<AllTypes[T]>
  ): Promise<AllTypes[T]>;

  count<T extends keyof AllTypes>(uid: T): Promise<any>;
  create<T extends keyof AllTypes>(uid: T): Promise<any>;
  update<T extends keyof AllTypes>(uid: T): Promise<any>;
  delete<T extends keyof AllTypes>(uid: T): Promise<any>;
  search<T extends keyof AllTypes>(uid: T): Promise<any>;
  searchWithRelationCounts<T extends keyof AllTypes>(uid: T): Promise<any>;
  searchPage<T extends keyof AllTypes>(uid: T): Promise<any>;
  countSearch<T extends keyof AllTypes>(uid: T): Promise<any>;
}

interface StrapiInterface {
  query: Database['query'];
  entityService: EntityService;
}

type StrapiGlobal = StrapiInterface | StrapiInstance;

declare global {
  interface AllTypes {}
}

declare global {
  export interface Global {
    strapi: StrapiGlobal;
  }

  const strapi: StrapiGlobal;
}
