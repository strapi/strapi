import type { Schema, Struct } from '@strapi/strapi';

// The form a package uses to declare the schemas of its own content types, next to its other
// contracts. A declaration file: `skipLibCheck: false` checks it against generated entries.
export interface CatalogProductSchema extends Struct.CollectionTypeSchema {
  collectionName: 'catalog_products';
  info: { singularName: 'product'; pluralName: 'products'; displayName: 'Product' };
  options: { draftAndPublish: true };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    price: Schema.Attribute.Decimal;
    tags: Schema.Attribute.Relation<'oneToMany', 'plugin::catalog.tag'>;
    owner: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
  };
}

export interface CatalogTagSchema extends Struct.CollectionTypeSchema {
  collectionName: 'catalog_tags';
  info: { singularName: 'tag'; pluralName: 'tags'; displayName: 'Tag' };
  options: { draftAndPublish: false };
  attributes: {
    label: Schema.Attribute.String;
  };
}

declare global {
  namespace Strapi {
    namespace Registries {
      interface PackageContentTypeSchemas {
        'plugin::catalog.product': CatalogProductSchema;
        'plugin::catalog.tag': CatalogTagSchema;
      }
    }
  }
}
