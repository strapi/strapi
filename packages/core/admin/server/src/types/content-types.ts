import type { Schema, Struct } from '@strapi/types';

// Each schema is the one type generation writes for an application, from the runtime schema in
// `../content-types/`. Loading a schema sets `options.draftAndPublish` to `false` when the runtime
// schema leaves it out. Names end in `Schema` because `AdminUser` and `AdminRole` are the row types
// of the admin contracts.

/** The schema of `admin::api-token` once loaded (`../content-types/api-token.ts`). */
export interface ApiTokenSchema extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    name: 'Api Token';
    singularName: 'api-token';
    pluralName: 'api-tokens';
    displayName: 'Api Token';
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
  attributes: Struct.WithSystemAttributes<
    'admin::api-token',
    {
      name: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.Unique &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      description: Schema.Attribute.String &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }> &
        Schema.Attribute.DefaultTo<''>;
      kind: Schema.Attribute.Enumeration<['content-api', 'admin']> &
        Schema.Attribute.Required &
        Schema.Attribute.DefaultTo<'content-api'>;
      // `constants.API_TOKEN_TYPE` values, in declaration order.
      type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
        Schema.Attribute.DefaultTo<'read-only'>;
      accessKey: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      encryptedKey: Schema.Attribute.Text & Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      lastUsedAt: Schema.Attribute.DateTime;
      permissions: Schema.Attribute.Relation<'oneToMany', 'admin::api-token-permission'>;
      adminPermissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
      adminUserOwner: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
      expiresAt: Schema.Attribute.DateTime;
      lifespan: Schema.Attribute.BigInteger;
    }
  >;
}

/**
 * The schema of `admin::api-token-permission` once loaded
 * (`../content-types/api-token-permission.ts`).
 */
export interface ApiTokenPermissionSchema extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    name: 'API Token Permission';
    description: '';
    singularName: 'api-token-permission';
    pluralName: 'api-token-permissions';
    displayName: 'API Token Permission';
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
  attributes: Struct.WithSystemAttributes<
    'admin::api-token-permission',
    {
      action: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    }
  >;
}

/** The schema of `admin::permission` once loaded (`../content-types/Permission.ts`). */
export interface PermissionSchema extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    name: 'Permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
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
  attributes: Struct.WithSystemAttributes<
    'admin::permission',
    {
      action: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      // The `{}` default value, as type generation writes it.
      // eslint-disable-next-line @typescript-eslint/ban-types
      actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
      subject: Schema.Attribute.String & Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      // eslint-disable-next-line @typescript-eslint/ban-types
      properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
      conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
      role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
      apiToken: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    }
  >;
}

/** The schema of `admin::role` once loaded (`../content-types/Role.ts`). */
export interface RoleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    name: 'Role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
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
  attributes: Struct.WithSystemAttributes<
    'admin::role',
    {
      name: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.Unique &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      code: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.Unique &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      description: Schema.Attribute.String;
      users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
      permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    }
  >;
}

/** The schema of `admin::session` once loaded (`../content-types/session.ts`). */
export interface SessionSchema extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    name: 'Session';
    description: 'Session Manager storage';
    singularName: 'session';
    pluralName: 'sessions';
    displayName: 'Session';
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
    i18n: {
      localized: false;
    };
  };
  attributes: Struct.WithSystemAttributes<
    'admin::session',
    {
      userId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
      sessionId: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.Private &
        Schema.Attribute.Unique;
      childId: Schema.Attribute.String & Schema.Attribute.Private;
      deviceId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
      origin: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
      expiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required & Schema.Attribute.Private;
      absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
      status: Schema.Attribute.String & Schema.Attribute.Private;
      type: Schema.Attribute.String & Schema.Attribute.Private;
      metadata: Schema.Attribute.JSON & Schema.Attribute.Private;
    }
  >;
}

/** The schema of `admin::transfer-token` once loaded (`../content-types/transfer-token.ts`). */
export interface TransferTokenSchema extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    name: 'Transfer Token';
    singularName: 'transfer-token';
    pluralName: 'transfer-tokens';
    displayName: 'Transfer Token';
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
  attributes: Struct.WithSystemAttributes<
    'admin::transfer-token',
    {
      name: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.Unique &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      description: Schema.Attribute.String &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }> &
        Schema.Attribute.DefaultTo<''>;
      accessKey: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      lastUsedAt: Schema.Attribute.DateTime;
      permissions: Schema.Attribute.Relation<'oneToMany', 'admin::transfer-token-permission'>;
      expiresAt: Schema.Attribute.DateTime;
      lifespan: Schema.Attribute.BigInteger;
    }
  >;
}

/**
 * The schema of `admin::transfer-token-permission` once loaded
 * (`../content-types/transfer-token-permission.ts`).
 */
export interface TransferTokenPermissionSchema extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    name: 'Transfer Token Permission';
    description: '';
    singularName: 'transfer-token-permission';
    pluralName: 'transfer-token-permissions';
    displayName: 'Transfer Token Permission';
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
  attributes: Struct.WithSystemAttributes<
    'admin::transfer-token-permission',
    {
      action: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    }
  >;
}

/** The schema of `admin::user` once loaded (`../content-types/User.ts`). */
export interface UserSchema extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    name: 'User';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
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
  attributes: Struct.WithSystemAttributes<
    'admin::user',
    {
      firstname: Schema.Attribute.String & Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      lastname: Schema.Attribute.String & Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      username: Schema.Attribute.String;
      email: Schema.Attribute.Email &
        Schema.Attribute.Required &
        Schema.Attribute.Private &
        Schema.Attribute.Unique &
        Schema.Attribute.SetMinMaxLength<{ minLength: 6 }>;
      password: Schema.Attribute.Password &
        Schema.Attribute.Private &
        Schema.Attribute.SetMinMaxLength<{ minLength: 6 }>;
      resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
      resetPasswordTokenExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
      registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
      isActive: Schema.Attribute.Boolean &
        Schema.Attribute.Private &
        Schema.Attribute.DefaultTo<false>;
      roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> & Schema.Attribute.Private;
      apiTokens: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
        Schema.Attribute.Private;
      blocked: Schema.Attribute.Boolean &
        Schema.Attribute.Private &
        Schema.Attribute.DefaultTo<false>;
      preferedLanguage: Schema.Attribute.String;
    }
  >;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageContentTypeSchemas {
        'admin::api-token': ApiTokenSchema;
        'admin::api-token-permission': ApiTokenPermissionSchema;
        'admin::permission': PermissionSchema;
        'admin::role': RoleSchema;
        'admin::session': SessionSchema;
        'admin::transfer-token': TransferTokenSchema;
        'admin::transfer-token-permission': TransferTokenPermissionSchema;
        'admin::user': UserSchema;
      }
    }
  }
}
