/**
 * Strapi schema, this is a simplification to make it easier to work with
 */
export type Schema = {
  action: 'create' | 'update' | 'remove';
  kind?: 'singleType' | 'collectionType';
  uid: string;
  modelType: 'component' | 'contentType';
  category?: string; // Only for components
  description?: string;
  name: string;
  options?: {
    draftAndPublish?: boolean;
    localized?: boolean;
  };
  attributes: Record<string, { type: string; [key: string]: any }>;
};
