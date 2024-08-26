import type { Internal, Schema } from '@strapi/types';

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    name: 'Permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    role: Schema.Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'admin::permission', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'admin::permission', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    name: 'User';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    username: Schema.Attribute.String;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    roles: Schema.Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    preferedLanguage: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    name: 'Role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Schema.Attribute.String;
    users: Schema.Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
    permissions: Schema.Attribute.Relation<'admin::role', 'oneToMany', 'admin::permission'>;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    name: 'Api Token';
    singularName: 'api-token';
    pluralName: 'api-tokens';
    displayName: 'Api Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'read-only'>;
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Schema.Attribute.DateTime;
    permissions: Schema.Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    expiresAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'admin::api-token', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'admin::api-token', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    name: 'API Token Permission';
    description: '';
    singularName: 'api-token-permission';
    pluralName: 'api-token-permissions';
    displayName: 'API Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Schema.Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'admin::api-token-permission', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'admin::api-token-permission', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    name: 'Transfer Token';
    singularName: 'transfer-token';
    pluralName: 'transfer-tokens';
    displayName: 'Transfer Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Schema.Attribute.DateTime;
    permissions: Schema.Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    expiresAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'admin::transfer-token', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'admin::transfer-token', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    name: 'Transfer Token Permission';
    description: '';
    singularName: 'transfer-token-permission';
    pluralName: 'transfer-token-permissions';
    displayName: 'Transfer Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Schema.Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Schema.Attribute.Private;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    singularName: 'file';
    pluralName: 'files';
    displayName: 'File';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    alternativeText: Schema.Attribute.String;
    caption: Schema.Attribute.String;
    width: Schema.Attribute.Integer;
    height: Schema.Attribute.Integer;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    ext: Schema.Attribute.String;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.String;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    related: Schema.Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    folder: Schema.Attribute.Relation<'plugin::upload.file', 'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMax<{
        min: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'plugin::upload.file', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'plugin::upload.file', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    singularName: 'folder';
    pluralName: 'folders';
    displayName: 'Folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<{
        min: 1;
      }>;
    pathId: Schema.Attribute.Integer & Schema.Attribute.Required & Schema.Attribute.Unique;
    parent: Schema.Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    children: Schema.Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    files: Schema.Attribute.Relation<'plugin::upload.folder', 'oneToMany', 'plugin::upload.file'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<{
        min: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'plugin::upload.folder', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'plugin::upload.folder', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    singularName: 'locale';
    pluralName: 'locales';
    collectionName: 'locales';
    displayName: 'Locale';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<{
        min: 1;
        max: 50;
      }>;
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'plugin::i18n.locale', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'plugin::i18n.locale', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    name: 'permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    role: Schema.Attribute.Relation<
      'plugin::users-permissions.permission',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    name: 'role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    description: Schema.Attribute.String;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    permissions: Schema.Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    users: Schema.Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsUser extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    name: 'user';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  options: {
    timestamps: true;
  };
  attributes: {
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    role: Schema.Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Schema.Attribute.Private;
  };
}

export interface ApiArticleArticle extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: {
    singularName: 'article';
    pluralName: 'articles';
    displayName: 'Article';
    description: '';
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    title: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    password: Schema.Attribute.Password &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    private: Schema.Attribute.String &
      Schema.Attribute.Private &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    comp: Schema.Attribute.Component<'article.comp'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    categories: Schema.Attribute.Relation<
      'api::article.article',
      'manyToMany',
      'api::category.category'
    >;
    dz: Schema.Attribute.DynamicZone<['article.dz-comp', 'article.dz-other-comp']> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'api::article.article', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'api::article.article', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'api::article.article',
      'oneToMany',
      'api::article.article'
    >;
    locale: Schema.Attribute.String;
    identifiers: Schema.Attribute.Component;
    repeatableIdentifiers: Schema.Attribute.Component;
  };
}

export interface ApiAuthorAuthor extends Struct.CollectionTypeSchema {
  collectionName: 'authors';
  info: {
    singularName: 'author';
    pluralName: 'authors';
    displayName: 'Author';
    description: '';
  };
  pluginOptions: {
    i18n: {
      localized: false;
    };
  };
  attributes: {
    name: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'api::author.author', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'api::author.author', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'api::author.author',
      'oneToMany',
      'api::author.author'
    >;
    locale: Schema.Attribute.String;
  };
}

export interface ApiCategoryCategory extends Struct.CollectionTypeSchema {
  collectionName: 'categories';
  info: {
    singularName: 'category';
    pluralName: 'categories';
    displayName: 'Category';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    name: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'api::category.category', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updatedBy: Schema.Attribute.Relation<'api::category.category', 'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'api::category.category',
      'oneToMany',
      'api::category.category'
    >;
    locale: Schema.Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Public {
    export module Registries {
      export interface ContentTypesSchemas {
        'admin::permission': AdminPermission;
        'admin::user': AdminUser;
        'admin::role': AdminRole;
        'admin::api-token': AdminApiToken;
        'admin::api-token-permission': AdminApiTokenPermission;
        'admin::transfer-token': AdminTransferToken;
        'admin::transfer-token-permission': AdminTransferTokenPermission;
        'plugin::upload.file': PluginUploadFile;
        'plugin::upload.folder': PluginUploadFolder;
        'plugin::i18n.locale': PluginI18NLocale;
        'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
        'plugin::users-permissions.role': PluginUsersPermissionsRole;
        'plugin::users-permissions.user': PluginUsersPermissionsUser;
        'api::article.article': ApiArticleArticle;
        'api::author.author': ApiAuthorAuthor;
        'api::category.category': ApiCategoryCategory;
      }
    }
  }
}
