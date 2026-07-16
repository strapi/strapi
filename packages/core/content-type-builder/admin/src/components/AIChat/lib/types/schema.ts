import type { AnyAttribute } from '../../../../types';

export type SchemaAttribute = Omit<AnyAttribute, 'name' | 'status'> & Record<string, unknown>;

/**
 * Strapi schema, this is a simplification to make it easier to work with
 */
export type Schema = {
  action: 'create' | 'update' | 'remove';
  kind?: 'singleType' | 'collectionType' | 'component';
  uid: string;
  /** Set for plugin content-types (`plugin::…`) */
  plugin?: string;
  modelType: 'component' | 'contentType';
  category?: string; // Only for components
  description?: string;
  name: string;
  options?: {
    draftAndPublish?: boolean;
    localized?: boolean;
  };
  attributes: Record<string, SchemaAttribute>;
  sources?: unknown;
};
