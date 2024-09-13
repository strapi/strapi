import type * as Koa from 'koa';
import type {} from 'koa-body';

type ID = number | string;

export type Data = {
  id?: ID;
  __component?: string;
  __type?: string;
  [key: string]: string | number | ID | boolean | null | undefined | Date | Data | Data[];
};

export type Config = Record<string, unknown>;

export interface RelationOrderingOptions {
  strict?: boolean;
}

export interface Attribute {
  type: string;
  writable?: boolean;
  visible?: boolean;
  relation?: string;
  private?: boolean;
  [key: string]: any;
}

export interface RelationalAttribute extends Attribute {
  type: 'relation';
  relation: string;
  target?: string;
}
export interface ComponentAttribute extends Attribute {
  type: 'component';
  component: string;
  repeatable?: boolean;
}
export interface DynamicZoneAttribute extends Attribute {
  type: 'dynamiczone';
  components: string[];
}

export interface ScalarAttribute extends Attribute {
  type:
    | 'string'
    | 'text'
    | 'richtext'
    | 'integer'
    | 'biginteger'
    | 'float'
    | 'decimal'
    | 'date'
    | 'time'
    | 'datetime'
    | 'timestamp'
    | 'enumeration'
    | 'boolean'
    | 'json'
    | 'blocks'
    | 'uid'
    | 'password'
    | 'email'
    | 'media';
}

export type AnyAttribute =
  | ScalarAttribute
  | RelationalAttribute
  | ComponentAttribute
  | DynamicZoneAttribute;

export type Kind = 'singleType' | 'collectionType';

export interface Model {
  modelType: 'contentType' | 'component';
  uid: string;
  kind?: Kind;
  info?: {
    displayName: string;
    singularName?: string;
    pluralName?: string;
  };
  options?: {
    populateCreatorFields?: boolean;
    draftAndPublish?: boolean;
  };
  privateAttributes?: string[];
  attributes: Record<string, AnyAttribute>;
}

declare module 'koa' {
  interface Request extends Koa.BaseRequest {
    route: RouteInfo;
  }

  interface ExtendableContext {
    ok: (response?: string | object) => Koa.Context;
    created: (response?: string | object) => Koa.Context;
    noContent: (response?: string | object) => Koa.Context;
    badRequest: (response?: string | object) => Koa.Context;
    unauthorized: (response?: string | object) => Koa.Context;
    forbidden: (response?: string | object) => Koa.Context;
    notFound: (response?: string | object) => Koa.Context;
    locked: (response?: string | object) => Koa.Context;
    internalServerError: (response?: string | object) => Koa.Context;
    notImplemented: (response?: string | object, data?: Record<string, unknown>) => Koa.Context;
  }
}

export interface RouteInfo {
  endpoint: string;
  controller: string;
  action: string;
  verb: string;
  plugin: string;
}

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
