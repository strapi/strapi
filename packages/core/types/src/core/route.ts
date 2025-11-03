import type { z } from 'zod/v4';
import type { LiteralUnion } from '../utils/string';
import type { MiddlewareHandler } from './middleware';

export type RouteInfo = {
  apiName?: string;
  pluginName?: string;
  type?: string;
};

export type RouteConfig = {
  prefix?: string;
  middlewares?: Array<string | MiddlewareHandler>;
  policies?: Array<string | { name: string; config: unknown }>;
  auth?: false | { scope?: string[]; strategies?: string[] };
};

export type HandlerReference = string;

export type RouteInput = Omit<Route, 'info'> & { info?: Partial<RouteInfo> };

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'ALL' | 'OPTIONS' | 'HEAD';

export interface Route {
  method: HTTPMethod;
  path: string;
  handler: HandlerReference | MiddlewareHandler | MiddlewareHandler[];
  info: RouteInfo;
  config?: RouteConfig;
  request?: RouteRequest;
  response?: RouteResponse;
}

export interface SchemaReference {
  $ref: string;
}

export interface SchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, SchemaDefinitionOrReference>;
  items?: SchemaDefinitionOrReference; // for arrays
  required?: string[];
  description?: string;
}

export type SchemaDefinitionOrReference = SchemaDefinition | SchemaReference;

export interface RouteRequest {
  query?: Record<string, z.ZodType>;
  params?: Record<string, z.ZodType>;
  body?: HTTPMediaRecord;
}

export type RouteResponse = z.ZodType;

export type HTTPMediaRecord = Record<HTTPMediaType, z.ZodType>;

export type HTTPMediaType = LiteralUnion<
  | 'application/json'
  | 'application/xml'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain; charset=utf-8'
  | 'text/html'
  | 'application/pdf'
  | 'image/png'
>;
