import type { RenameHop } from '../../../../types';

/**
 * Strapi schema, this is a simplification to make it easier to work with
 */
export type Schema = {
  action: 'create' | 'update' | 'remove';
  kind?: 'singleType' | 'collectionType';
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
  /**
   * Optional ordered rename hops for this schema. The AI server does not emit
   * this today, but the CTB admin transform accepts it for forward compatibility.
   */
  renames?: RenameHop[];
  attributes: Record<string, { type: string; [key: string]: any }>;
};
