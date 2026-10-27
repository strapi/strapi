import type { Schema, Struct } from '@strapi/strapi';

// What type generation writes for an application that extends `plugin::catalog.product`
// (`src/extensions`): the runtime schema, with an attribute the package does not declare. The
// application has no `plugin::catalog.tag` entry, so the package entry fills it.
export interface PluginCatalogProduct extends Struct.CollectionTypeSchema {
  collectionName: 'catalog_products';
  info: { singularName: 'product'; pluralName: 'products'; displayName: 'Product' };
  options: { draftAndPublish: true };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    price: Schema.Attribute.Decimal;
    credit: Schema.Attribute.String;
    tags: Schema.Attribute.Relation<'oneToMany', 'plugin::catalog.tag'>;
    owner: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: { singularName: 'user'; pluralName: 'users'; displayName: 'User' };
  attributes: {
    email: Schema.Attribute.Email & Schema.Attribute.Required;
  };
}

declare global {
  namespace Strapi {
    namespace Registries {
      interface AppContentTypeSchemas {
        'admin::user': AdminUser;
        'plugin::catalog.product': PluginCatalogProduct;
      }
    }
  }
}
