import * as Koa from 'koa';
import 'koa-body';

export interface Config {
  get<T = unknown>(key: string, defaultVal?: T): T;
}

export interface Attribute {
  type: string;
  writable?: boolean;
  relation?: string;
  [key: string]: unknown;
}

export interface RelationalAttribute extends Attribute {
  relation: string;
}

export type Kind = 'singleType' | 'collectionType';

export interface Model {
  uid?: string;
  kind: Kind;
  info: {
    singularName: string;
    pluralName: string;
  };
  options: {
    populateCreatorFields: boolean;
  };
  privateAttributes?: string[];
  attributes: Record<string, Attribute>;
}

declare module 'koa' {
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
    notImplemented: (response?: string | object) => Koa.Context;
  }
}

export interface RouteInfo {
  endpoint: string;
  controller: string;
  action: string;
  verb: string;
  plugin: string;
}

export interface Request extends Koa.Request {
  body: {
    data?: string;
  };
  route: RouteInfo;
}

export interface Context extends Koa.ExtendableContext {
  request: Request;
}
