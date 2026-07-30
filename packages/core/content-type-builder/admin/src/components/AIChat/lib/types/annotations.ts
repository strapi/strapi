import { Schema } from './schema';

/**
 * Schema Change Annotations
 */
export type SchemaChange = {
  type: 'create' | 'update' | 'remove';
  schema: Schema;
  revisionId: string;
};

export type SchemaChangeAnnotation = {
  toolCallId: string;
  type: 'schema-change';
  changes?: SchemaChange[];
  message?: string;
};

/**
 * Combined Tool Annotation type
 */
export type ToolAnnotation = SchemaChangeAnnotation;
