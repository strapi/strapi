import type { OpenAPIV3 } from 'openapi-types';
import type { Context } from './context';

export type DocumentContextData = Partial<OpenAPIV3.Document>;
export type DocumentContext = Context<DocumentContextData>;

export type OperationContextData = Partial<OpenAPIV3.OperationObject>;
export type OperationContext = Context<OperationContextData>;

export type PathContextData = Partial<OpenAPIV3.PathsObject>;
export type PathContext = Context<PathContextData>;

export type PathItemContextData = Partial<OpenAPIV3.PathItemObject>;
export type PathItemContext = Context<PathItemContextData>;
