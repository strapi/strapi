import type { OpenAPIV3_1 } from 'openapi-types';
import type { Context } from './context';

export type DocumentContextData = Partial<OpenAPIV3_1.Document>;
export type DocumentContext = Context<DocumentContextData>;

export type OperationContextData = Partial<OpenAPIV3_1.OperationObject>;
export type OperationContext = Context<OperationContextData>;

export type PathContextData = Partial<OpenAPIV3_1.PathsObject>;
export type PathContext = Context<PathContextData>;

export type PathItemContextData = Partial<OpenAPIV3_1.PathItemObject>;
export type PathItemContext = Context<PathItemContextData>;

export interface GenerationOptions {
  type: 'admin' | 'content-api';
}
