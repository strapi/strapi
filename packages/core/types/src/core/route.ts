import type { MiddlewareHandler } from './middleware';
import type { z } from 'zod';

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
  responses?: RouteResponses;
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
  query?: Record<string, z.Schema>;
  params?: Record<string, z.Schema>;
  body?: SchemaDefinitionOrReference;
}

// TODO: Change this to allow multiple kind of content (json, html, text, ...)
export interface RouteResponses {
  [key: number]: z.Schema;
}
