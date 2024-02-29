export const metadata = [
  [
    'admin::permission',
    {
      uid: 'admin::permission',
      singularName: 'permission',
      tableName: 'admin_permissions',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        action: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: true,
          columnName: 'action',
        },
        actionParameters: {
          type: 'json',
          configurable: false,
          required: false,
          default: {},
          columnName: 'action_parameters',
        },
        subject: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: false,
          columnName: 'subject',
        },
        properties: {
          type: 'json',
          configurable: false,
          required: false,
          default: {},
          columnName: 'properties',
        },
        conditions: {
          type: 'json',
          configurable: false,
          required: false,
          default: [],
          columnName: 'conditions',
        },
        role: {
          configurable: false,
          type: 'relation',
          relation: 'manyToOne',
          inversedBy: 'permissions',
          target: 'admin::role',
          joinTable: {
            name: 'admin_permissions_role_links',
            joinColumn: {
              name: 'permission_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['permission_id', 'role_id'],
            inverseOrderColumnName: 'permission_order',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'admin::permission',
          joinTable: {
            name: 'admin_permissions_localizations_links',
            joinColumn: {
              name: 'permission_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_permission_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['permission_id', 'inv_permission_id'],
            orderColumnName: 'permission_order',
            orderBy: {
              permission_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        action: 'action',
        action_parameters: 'actionParameters',
        subject: 'subject',
        properties: 'properties',
        conditions: 'conditions',
        role: 'role',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'admin::user',
    {
      uid: 'admin::user',
      singularName: 'user',
      tableName: 'admin_users',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        firstname: {
          type: 'string',
          unique: false,
          minLength: 1,
          configurable: false,
          required: false,
          columnName: 'firstname',
        },
        lastname: {
          type: 'string',
          unique: false,
          minLength: 1,
          configurable: false,
          required: false,
          columnName: 'lastname',
        },
        username: {
          type: 'string',
          unique: false,
          configurable: false,
          required: false,
          columnName: 'username',
        },
        email: {
          type: 'email',
          minLength: 6,
          configurable: false,
          required: true,
          unique: true,
          private: true,
          columnName: 'email',
        },
        password: {
          type: 'password',
          minLength: 6,
          configurable: false,
          required: false,
          private: true,
          searchable: false,
          columnName: 'password',
        },
        resetPasswordToken: {
          type: 'string',
          configurable: false,
          private: true,
          searchable: false,
          columnName: 'reset_password_token',
        },
        registrationToken: {
          type: 'string',
          configurable: false,
          private: true,
          searchable: false,
          columnName: 'registration_token',
        },
        isActive: {
          type: 'boolean',
          default: false,
          configurable: false,
          private: true,
          columnName: 'is_active',
        },
        roles: {
          configurable: false,
          private: true,
          type: 'relation',
          relation: 'manyToMany',
          inversedBy: 'users',
          target: 'admin::role',
          collectionName: 'strapi_users_roles',
          joinTable: {
            name: 'admin_users_roles_links',
            joinColumn: {
              name: 'user_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['user_id', 'role_id'],
            orderColumnName: 'role_order',
            orderBy: {
              role_order: 'asc',
            },
            inverseOrderColumnName: 'user_order',
          },
        },
        blocked: {
          type: 'boolean',
          default: false,
          configurable: false,
          private: true,
          columnName: 'blocked',
        },
        preferedLanguage: {
          type: 'string',
          configurable: false,
          required: false,
          searchable: false,
          columnName: 'prefered_language',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'admin::user',
          joinTable: {
            name: 'admin_users_localizations_links',
            joinColumn: {
              name: 'user_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_user_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['user_id', 'inv_user_id'],
            orderColumnName: 'user_order',
            orderBy: {
              user_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        firstname: 'firstname',
        lastname: 'lastname',
        username: 'username',
        email: 'email',
        password: 'password',
        reset_password_token: 'resetPasswordToken',
        registration_token: 'registrationToken',
        is_active: 'isActive',
        roles: 'roles',
        blocked: 'blocked',
        prefered_language: 'preferedLanguage',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'admin::role',
    {
      uid: 'admin::role',
      singularName: 'role',
      tableName: 'admin_roles',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          minLength: 1,
          unique: true,
          configurable: false,
          required: true,
          columnName: 'name',
        },
        code: {
          type: 'string',
          minLength: 1,
          unique: true,
          configurable: false,
          required: true,
          columnName: 'code',
        },
        description: {
          type: 'string',
          configurable: false,
          columnName: 'description',
        },
        users: {
          configurable: false,
          type: 'relation',
          relation: 'manyToMany',
          mappedBy: 'roles',
          target: 'admin::user',
          joinTable: {
            name: 'admin_users_roles_links',
            joinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'user_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['user_id', 'role_id'],
            orderColumnName: 'user_order',
            orderBy: {
              user_order: 'asc',
            },
            inverseOrderColumnName: 'role_order',
          },
        },
        permissions: {
          configurable: false,
          type: 'relation',
          relation: 'oneToMany',
          mappedBy: 'role',
          target: 'admin::permission',
          joinTable: {
            name: 'admin_permissions_role_links',
            joinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'permission_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['permission_id', 'role_id'],
            orderColumnName: 'permission_order',
            orderBy: {
              permission_order: 'asc',
            },
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'admin::role',
          joinTable: {
            name: 'admin_roles_localizations_links',
            joinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_role_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['role_id', 'inv_role_id'],
            orderColumnName: 'role_order',
            orderBy: {
              role_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        code: 'code',
        description: 'description',
        users: 'users',
        permissions: 'permissions',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'admin::api-token',
    {
      uid: 'admin::api-token',
      singularName: 'api-token',
      tableName: 'strapi_api_tokens',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: true,
          unique: true,
          columnName: 'name',
        },
        description: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: false,
          default: '',
          columnName: 'description',
        },
        type: {
          type: 'enumeration',
          enum: ['read-only', 'full-access', 'custom'],
          configurable: false,
          required: true,
          default: 'read-only',
          columnName: 'type',
        },
        accessKey: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: true,
          searchable: false,
          columnName: 'access_key',
        },
        lastUsedAt: {
          type: 'datetime',
          configurable: false,
          required: false,
          columnName: 'last_used_at',
        },
        permissions: {
          type: 'relation',
          target: 'admin::api-token-permission',
          relation: 'oneToMany',
          mappedBy: 'token',
          configurable: false,
          required: false,
          joinTable: {
            name: 'strapi_api_token_permissions_token_links',
            joinColumn: {
              name: 'api_token_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'api_token_permission_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['api_token_permission_id', 'api_token_id'],
            orderColumnName: 'api_token_permission_order',
            orderBy: {
              api_token_permission_order: 'asc',
            },
          },
        },
        expiresAt: {
          type: 'datetime',
          configurable: false,
          required: false,
          columnName: 'expires_at',
        },
        lifespan: {
          type: 'biginteger',
          configurable: false,
          required: false,
          columnName: 'lifespan',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'admin::api-token',
          joinTable: {
            name: 'strapi_api_tokens_localizations_links',
            joinColumn: {
              name: 'api_token_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_api_token_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['api_token_id', 'inv_api_token_id'],
            orderColumnName: 'api_token_order',
            orderBy: {
              api_token_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        description: 'description',
        type: 'type',
        access_key: 'accessKey',
        last_used_at: 'lastUsedAt',
        permissions: 'permissions',
        expires_at: 'expiresAt',
        lifespan: 'lifespan',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'admin::api-token-permission',
    {
      uid: 'admin::api-token-permission',
      singularName: 'api-token-permission',
      tableName: 'strapi_api_token_permissions',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        action: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: true,
          columnName: 'action',
        },
        token: {
          configurable: false,
          type: 'relation',
          relation: 'manyToOne',
          inversedBy: 'permissions',
          target: 'admin::api-token',
          joinTable: {
            name: 'strapi_api_token_permissions_token_links',
            joinColumn: {
              name: 'api_token_permission_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'api_token_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['api_token_permission_id', 'api_token_id'],
            inverseOrderColumnName: 'api_token_permission_order',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'admin::api-token-permission',
          joinTable: {
            name: 'strapi_api_token_permissions_localizations_links',
            joinColumn: {
              name: 'api_token_permission_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_api_token_permission_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['api_token_permission_id', 'inv_api_token_permission_id'],
            orderColumnName: 'api_token_permission_order',
            orderBy: {
              api_token_permission_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        action: 'action',
        token: 'token',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'admin::transfer-token',
    {
      uid: 'admin::transfer-token',
      singularName: 'transfer-token',
      tableName: 'strapi_transfer_tokens',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: true,
          unique: true,
          columnName: 'name',
        },
        description: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: false,
          default: '',
          columnName: 'description',
        },
        accessKey: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: true,
          columnName: 'access_key',
        },
        lastUsedAt: {
          type: 'datetime',
          configurable: false,
          required: false,
          columnName: 'last_used_at',
        },
        permissions: {
          type: 'relation',
          target: 'admin::transfer-token-permission',
          relation: 'oneToMany',
          mappedBy: 'token',
          configurable: false,
          required: false,
          joinTable: {
            name: 'strapi_transfer_token_permissions_token_links',
            joinColumn: {
              name: 'transfer_token_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'transfer_token_permission_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['transfer_token_permission_id', 'transfer_token_id'],
            orderColumnName: 'transfer_token_permission_order',
            orderBy: {
              transfer_token_permission_order: 'asc',
            },
          },
        },
        expiresAt: {
          type: 'datetime',
          configurable: false,
          required: false,
          columnName: 'expires_at',
        },
        lifespan: {
          type: 'biginteger',
          configurable: false,
          required: false,
          columnName: 'lifespan',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'admin::transfer-token',
          joinTable: {
            name: 'strapi_transfer_tokens_localizations_links',
            joinColumn: {
              name: 'transfer_token_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_transfer_token_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['transfer_token_id', 'inv_transfer_token_id'],
            orderColumnName: 'transfer_token_order',
            orderBy: {
              transfer_token_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        description: 'description',
        access_key: 'accessKey',
        last_used_at: 'lastUsedAt',
        permissions: 'permissions',
        expires_at: 'expiresAt',
        lifespan: 'lifespan',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'admin::transfer-token-permission',
    {
      uid: 'admin::transfer-token-permission',
      singularName: 'transfer-token-permission',
      tableName: 'strapi_transfer_token_permissions',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        action: {
          type: 'string',
          minLength: 1,
          configurable: false,
          required: true,
          columnName: 'action',
        },
        token: {
          configurable: false,
          type: 'relation',
          relation: 'manyToOne',
          inversedBy: 'permissions',
          target: 'admin::transfer-token',
          joinTable: {
            name: 'strapi_transfer_token_permissions_token_links',
            joinColumn: {
              name: 'transfer_token_permission_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'transfer_token_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['transfer_token_permission_id', 'transfer_token_id'],
            inverseOrderColumnName: 'transfer_token_permission_order',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'admin::transfer-token-permission',
          joinTable: {
            name: 'strapi_transfer_token_permissions_localizations_links',
            joinColumn: {
              name: 'transfer_token_permission_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_transfer_token_permission_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['transfer_token_permission_id', 'inv_transfer_token_permission_id'],
            orderColumnName: 'transfer_token_permission_order',
            orderBy: {
              transfer_token_permission_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        action: 'action',
        token: 'token',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'plugin::upload.file',
    {
      uid: 'plugin::upload.file',
      singularName: 'file',
      tableName: 'files',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          configurable: false,
          required: true,
          columnName: 'name',
        },
        alternativeText: {
          type: 'string',
          configurable: false,
          columnName: 'alternative_text',
        },
        caption: {
          type: 'string',
          configurable: false,
          columnName: 'caption',
        },
        width: {
          type: 'integer',
          configurable: false,
          columnName: 'width',
        },
        height: {
          type: 'integer',
          configurable: false,
          columnName: 'height',
        },
        formats: {
          type: 'json',
          configurable: false,
          columnName: 'formats',
        },
        hash: {
          type: 'string',
          configurable: false,
          required: true,
          columnName: 'hash',
        },
        ext: {
          type: 'string',
          configurable: false,
          columnName: 'ext',
        },
        mime: {
          type: 'string',
          configurable: false,
          required: true,
          columnName: 'mime',
        },
        size: {
          type: 'decimal',
          configurable: false,
          required: true,
          columnName: 'size',
        },
        url: {
          type: 'string',
          configurable: false,
          required: true,
          columnName: 'url',
        },
        previewUrl: {
          type: 'string',
          configurable: false,
          columnName: 'preview_url',
        },
        provider: {
          type: 'string',
          configurable: false,
          required: true,
          columnName: 'provider',
        },
        provider_metadata: {
          type: 'json',
          configurable: false,
          columnName: 'provider_metadata',
        },
        related: {
          type: 'relation',
          relation: 'morphToMany',
          configurable: false,
          joinTable: {
            name: 'files_related_morphs',
            joinColumn: {
              name: 'file_id',
              referencedColumn: 'id',
            },
            morphColumn: {
              typeColumn: {
                name: 'related_type',
              },
              idColumn: {
                name: 'related_id',
                referencedColumn: 'id',
              },
            },
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['file_id', 'related_type', 'related_id'],
          },
        },
        folder: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'plugin::upload.folder',
          inversedBy: 'files',
          private: true,
          joinTable: {
            name: 'files_folder_links',
            joinColumn: {
              name: 'file_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'folder_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['file_id', 'folder_id'],
            inverseOrderColumnName: 'file_order',
          },
        },
        folderPath: {
          type: 'string',
          min: 1,
          required: true,
          private: true,
          searchable: false,
          columnName: 'folder_path',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::upload.file',
          joinTable: {
            name: 'files_localizations_links',
            joinColumn: {
              name: 'file_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_file_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['file_id', 'inv_file_id'],
            orderColumnName: 'file_order',
            orderBy: {
              file_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        alternative_text: 'alternativeText',
        caption: 'caption',
        width: 'width',
        height: 'height',
        formats: 'formats',
        hash: 'hash',
        ext: 'ext',
        mime: 'mime',
        size: 'size',
        url: 'url',
        preview_url: 'previewUrl',
        provider: 'provider',
        provider_metadata: 'provider_metadata',
        related: 'related',
        folder: 'folder',
        folder_path: 'folderPath',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'plugin::upload.folder',
    {
      uid: 'plugin::upload.folder',
      singularName: 'folder',
      tableName: 'upload_folders',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          min: 1,
          required: true,
          columnName: 'name',
        },
        pathId: {
          type: 'integer',
          unique: true,
          required: true,
          columnName: 'path_id',
        },
        parent: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'plugin::upload.folder',
          inversedBy: 'children',
          joinTable: {
            name: 'upload_folders_parent_links',
            joinColumn: {
              name: 'folder_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_folder_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['folder_id', 'inv_folder_id'],
            inverseOrderColumnName: 'folder_order',
          },
        },
        children: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::upload.folder',
          mappedBy: 'parent',
          joinTable: {
            name: 'upload_folders_parent_links',
            joinColumn: {
              name: 'inv_folder_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'folder_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['folder_id', 'inv_folder_id'],
            orderColumnName: 'folder_order',
            orderBy: {
              folder_order: 'asc',
            },
          },
        },
        files: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::upload.file',
          mappedBy: 'folder',
          joinTable: {
            name: 'files_folder_links',
            joinColumn: {
              name: 'folder_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'file_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['file_id', 'folder_id'],
            orderColumnName: 'file_order',
            orderBy: {
              file_order: 'asc',
            },
          },
        },
        path: {
          type: 'string',
          min: 1,
          required: true,
          columnName: 'path',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::upload.folder',
          joinTable: {
            name: 'upload_folders_localizations_links',
            joinColumn: {
              name: 'folder_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_folder_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['folder_id', 'inv_folder_id'],
            orderColumnName: 'folder_order',
            orderBy: {
              folder_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        path_id: 'pathId',
        parent: 'parent',
        children: 'children',
        files: 'files',
        path: 'path',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'plugin::content-releases.release',
    {
      uid: 'plugin::content-releases.release',
      singularName: 'release',
      tableName: 'strapi_releases',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          required: true,
          columnName: 'name',
        },
        releasedAt: {
          type: 'datetime',
          columnName: 'released_at',
        },
        scheduledAt: {
          type: 'datetime',
          columnName: 'scheduled_at',
        },
        actions: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::content-releases.release-action',
          mappedBy: 'release',
          joinTable: {
            name: 'strapi_release_actions_release_links',
            joinColumn: {
              name: 'release_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'release_action_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['release_action_id', 'release_id'],
            orderColumnName: 'release_action_order',
            orderBy: {
              release_action_order: 'asc',
            },
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::content-releases.release',
          joinTable: {
            name: 'strapi_releases_localizations_links',
            joinColumn: {
              name: 'release_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_release_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['release_id', 'inv_release_id'],
            orderColumnName: 'release_order',
            orderBy: {
              release_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        released_at: 'releasedAt',
        scheduled_at: 'scheduledAt',
        actions: 'actions',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'plugin::content-releases.release-action',
    {
      uid: 'plugin::content-releases.release-action',
      singularName: 'release-action',
      tableName: 'strapi_release_actions',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        type: {
          type: 'enumeration',
          enum: ['publish', 'unpublish'],
          required: true,
          columnName: 'type',
        },
        entry: {
          type: 'relation',
          relation: 'morphToOne',
          configurable: false,
          owner: true,
          morphColumn: {
            typeColumn: {
              name: 'target_type',
            },
            idColumn: {
              name: 'target_id',
              referencedColumn: 'id',
            },
          },
        },
        contentType: {
          type: 'string',
          required: true,
          columnName: 'content_type',
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
        release: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'plugin::content-releases.release',
          inversedBy: 'actions',
          joinTable: {
            name: 'strapi_release_actions_release_links',
            joinColumn: {
              name: 'release_action_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'release_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['release_action_id', 'release_id'],
            inverseOrderColumnName: 'release_action_order',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::content-releases.release-action',
          joinTable: {
            name: 'strapi_release_actions_localizations_links',
            joinColumn: {
              name: 'release_action_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_release_action_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['release_action_id', 'inv_release_action_id'],
            orderColumnName: 'release_action_order',
            orderBy: {
              release_action_order: 'asc',
            },
          },
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        type: 'type',
        entry: 'entry',
        content_type: 'contentType',
        locale: 'locale',
        release: 'release',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
      },
    },
  ],
  [
    'plugin::myplugin.test',
    {
      uid: 'plugin::myplugin.test',
      singularName: 'test',
      tableName: 'myplugin_test',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        type: {
          type: 'string',
          required: true,
          unique: true,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'type',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::myplugin.test',
          joinTable: {
            name: 'myplugin_test_localizations_links',
            joinColumn: {
              name: 'test_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_test_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['test_id', 'inv_test_id'],
            orderColumnName: 'test_order',
            orderBy: {
              test_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        type: 'type',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'plugin::i18n.locale',
    {
      uid: 'plugin::i18n.locale',
      singularName: 'locale',
      tableName: 'i18n_locale',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          min: 1,
          max: 50,
          configurable: false,
          columnName: 'name',
        },
        code: {
          type: 'string',
          unique: true,
          configurable: false,
          columnName: 'code',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::i18n.locale',
          joinTable: {
            name: 'i_18_n_locale_localizations_links',
            joinColumn: {
              name: 'locale_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_locale_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['locale_id', 'inv_locale_id'],
            orderColumnName: 'locale_order',
            orderBy: {
              locale_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        code: 'code',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'plugin::users-permissions.permission',
    {
      uid: 'plugin::users-permissions.permission',
      singularName: 'permission',
      tableName: 'up_permissions',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        action: {
          type: 'string',
          required: true,
          configurable: false,
          columnName: 'action',
        },
        role: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'plugin::users-permissions.role',
          inversedBy: 'permissions',
          configurable: false,
          joinTable: {
            name: 'up_permissions_role_links',
            joinColumn: {
              name: 'permission_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['permission_id', 'role_id'],
            inverseOrderColumnName: 'permission_order',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::users-permissions.permission',
          joinTable: {
            name: 'up_permissions_localizations_links',
            joinColumn: {
              name: 'permission_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_permission_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['permission_id', 'inv_permission_id'],
            orderColumnName: 'permission_order',
            orderBy: {
              permission_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        action: 'action',
        role: 'role',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'plugin::users-permissions.role',
    {
      uid: 'plugin::users-permissions.role',
      singularName: 'role',
      tableName: 'up_roles',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          minLength: 3,
          required: true,
          configurable: false,
          columnName: 'name',
        },
        description: {
          type: 'string',
          configurable: false,
          columnName: 'description',
        },
        type: {
          type: 'string',
          unique: true,
          configurable: false,
          columnName: 'type',
        },
        permissions: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::users-permissions.permission',
          mappedBy: 'role',
          configurable: false,
          joinTable: {
            name: 'up_permissions_role_links',
            joinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'permission_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['permission_id', 'role_id'],
            orderColumnName: 'permission_order',
            orderBy: {
              permission_order: 'asc',
            },
          },
        },
        users: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::users-permissions.user',
          mappedBy: 'role',
          configurable: false,
          joinTable: {
            name: 'up_users_role_links',
            joinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'user_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['user_id', 'role_id'],
            orderColumnName: 'user_order',
            orderBy: {
              user_order: 'asc',
            },
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::users-permissions.role',
          joinTable: {
            name: 'up_roles_localizations_links',
            joinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_role_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['role_id', 'inv_role_id'],
            orderColumnName: 'role_order',
            orderBy: {
              role_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        description: 'description',
        type: 'type',
        permissions: 'permissions',
        users: 'users',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'plugin::users-permissions.user',
    {
      uid: 'plugin::users-permissions.user',
      singularName: 'user',
      tableName: 'up_users',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        username: {
          type: 'string',
          minLength: 3,
          unique: true,
          configurable: false,
          required: true,
          columnName: 'username',
        },
        email: {
          type: 'email',
          minLength: 6,
          configurable: false,
          required: true,
          columnName: 'email',
        },
        provider: {
          type: 'string',
          configurable: false,
          columnName: 'provider',
        },
        password: {
          type: 'password',
          minLength: 6,
          configurable: false,
          private: true,
          searchable: false,
          columnName: 'password',
        },
        resetPasswordToken: {
          type: 'string',
          configurable: false,
          private: true,
          searchable: false,
          columnName: 'reset_password_token',
        },
        confirmationToken: {
          type: 'string',
          configurable: false,
          private: true,
          searchable: false,
          columnName: 'confirmation_token',
        },
        confirmed: {
          type: 'boolean',
          default: false,
          configurable: false,
          columnName: 'confirmed',
        },
        blocked: {
          type: 'boolean',
          default: false,
          configurable: false,
          columnName: 'blocked',
        },
        role: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'plugin::users-permissions.role',
          inversedBy: 'users',
          configurable: false,
          joinTable: {
            name: 'up_users_role_links',
            joinColumn: {
              name: 'user_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'role_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['user_id', 'role_id'],
            inverseOrderColumnName: 'user_order',
          },
        },
        picture: {
          type: 'relation',
          relation: 'morphOne',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'plugin::users-permissions.user',
          joinTable: {
            name: 'up_users_localizations_links',
            joinColumn: {
              name: 'user_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_user_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['user_id', 'inv_user_id'],
            orderColumnName: 'user_order',
            orderBy: {
              user_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        username: 'username',
        email: 'email',
        provider: 'provider',
        password: 'password',
        reset_password_token: 'resetPasswordToken',
        confirmation_token: 'confirmationToken',
        confirmed: 'confirmed',
        blocked: 'blocked',
        role: 'role',
        picture: 'picture',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'addresses_components',
    {
      singularName: 'addresses_components',
      uid: 'addresses_components',
      tableName: 'addresses_components',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        entity_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'entity_id',
        },
        component_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'component_id',
        },
        component_type: {
          type: 'string',
          columnName: 'component_type',
        },
        field: {
          type: 'string',
          columnName: 'field',
        },
        order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'order',
        },
      },
      indexes: [
        {
          name: 'addresses_field_index',
          columns: ['field'],
        },
        {
          name: 'addresses_component_type_index',
          columns: ['component_type'],
        },
        {
          name: 'addresses_entity_fk',
          columns: ['entity_id'],
        },
        {
          name: 'addresses_unique',
          columns: ['entity_id', 'component_id', 'field', 'component_type'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'addresses_entity_fk',
          columns: ['entity_id'],
          referencedColumns: ['id'],
          referencedTable: 'addresses',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        entity_id: 'entity_id',
        component_id: 'component_id',
        component_type: 'component_type',
        field: 'field',
        order: 'order',
      },
    },
  ],
  [
    'api::address.address',
    {
      uid: 'api::address.address',
      singularName: 'address',
      tableName: 'addresses',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        postal_code: {
          type: 'string',
          pluginOptions: {},
          maxLength: 2,
          columnName: 'postal_code',
        },
        categories: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::category.category',
          inversedBy: 'addresses',
          joinTable: {
            name: 'addresses_categories_links',
            joinColumn: {
              name: 'address_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['address_id', 'category_id'],
            orderColumnName: 'category_order',
            orderBy: {
              category_order: 'asc',
            },
            inverseOrderColumnName: 'address_order',
          },
        },
        cover: {
          type: 'relation',
          relation: 'morphOne',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        images: {
          type: 'relation',
          relation: 'morphMany',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        city: {
          type: 'string',
          required: true,
          maxLength: 200,
          pluginOptions: {},
          columnName: 'city',
        },
        json: {
          type: 'json',
          pluginOptions: {},
          columnName: 'json',
        },
        slug: {
          type: 'uid',
          columnName: 'slug',
        },
        notrepeat_req: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'blog.test-como',
          joinTable: {
            name: 'addresses_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'notrepeat_req',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        repeat_req: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'blog.test-como',
          joinTable: {
            name: 'addresses_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'repeat_req',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        repeat_req_min: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'blog.test-como',
          joinTable: {
            name: 'addresses_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'repeat_req_min',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        bidirectionalTemps: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::temp.temp',
          mappedBy: 'bidirectionalAddress',
          joinColumn: {
            name: 'id',
            referencedColumn: 'bidirectional_address_id',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::address.address',
          joinTable: {
            name: 'addresses_localizations_links',
            joinColumn: {
              name: 'address_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_address_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['address_id', 'inv_address_id'],
            orderColumnName: 'address_order',
            orderBy: {
              address_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        postal_code: 'postal_code',
        categories: 'categories',
        cover: 'cover',
        images: 'images',
        city: 'city',
        json: 'json',
        slug: 'slug',
        notrepeat_req: 'notrepeat_req',
        repeat_req: 'repeat_req',
        repeat_req_min: 'repeat_req_min',
        bidirectionalTemps: 'bidirectionalTemps',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'api::category.category',
    {
      uid: 'api::category.category',
      singularName: 'category',
      tableName: 'categories',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'name',
        },
        addresses: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::address.address',
          mappedBy: 'categories',
          joinTable: {
            name: 'addresses_categories_links',
            joinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'address_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['address_id', 'category_id'],
            orderColumnName: 'address_order',
            orderBy: {
              address_order: 'asc',
            },
            inverseOrderColumnName: 'category_order',
          },
        },
        temps: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::temp.temp',
          mappedBy: 'categories',
          joinTable: {
            name: 'temps_categories_links',
            joinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'temp_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['temp_id', 'category_id'],
            orderColumnName: 'temp_order',
            orderBy: {
              temp_order: 'asc',
            },
            inverseOrderColumnName: 'category_order',
          },
        },
        datetime: {
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          type: 'datetime',
          columnName: 'datetime',
        },
        date: {
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          type: 'date',
          columnName: 'date',
        },
        relation_locales: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::relation-locale.relation-locale',
          mappedBy: 'categories',
          joinTable: {
            name: 'relation_locales_categories_links',
            joinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'relation_locale_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['relation_locale_id', 'category_id'],
            orderColumnName: 'relation_locale_order',
            orderBy: {
              relation_locale_order: 'asc',
            },
            inverseOrderColumnName: 'category_order',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::category.category',
          joinTable: {
            name: 'categories_localizations_links',
            joinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_category_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['category_id', 'inv_category_id'],
            orderColumnName: 'category_order',
            orderBy: {
              category_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        addresses: 'addresses',
        temps: 'temps',
        datetime: 'datetime',
        date: 'date',
        relation_locales: 'relation_locales',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'api::country.country',
    {
      uid: 'api::country.country',
      singularName: 'country',
      tableName: 'countries',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          required: true,
          minLength: 3,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'name',
        },
        code: {
          type: 'string',
          maxLength: 3,
          unique: true,
          minLength: 2,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'code',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::country.country',
          joinTable: {
            name: 'countries_localizations_links',
            joinColumn: {
              name: 'country_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_country_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['country_id', 'inv_country_id'],
            orderColumnName: 'country_order',
            orderBy: {
              country_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        code: 'code',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'api::homepage.homepage',
    {
      uid: 'api::homepage.homepage',
      singularName: 'homepage',
      tableName: 'homepages',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        title: {
          type: 'string',
          required: true,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'title',
        },
        slug: {
          type: 'uid',
          targetField: 'title',
          required: true,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'slug',
        },
        single: {
          type: 'relation',
          relation: 'morphOne',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        multiple: {
          type: 'relation',
          relation: 'morphMany',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::homepage.homepage',
          joinTable: {
            name: 'homepages_localizations_links',
            joinColumn: {
              name: 'homepage_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_homepage_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['homepage_id', 'inv_homepage_id'],
            orderColumnName: 'homepage_order',
            orderBy: {
              homepage_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        title: 'title',
        slug: 'slug',
        single: 'single',
        multiple: 'multiple',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'kitchensinks_components',
    {
      singularName: 'kitchensinks_components',
      uid: 'kitchensinks_components',
      tableName: 'kitchensinks_components',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        entity_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'entity_id',
        },
        component_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'component_id',
        },
        component_type: {
          type: 'string',
          columnName: 'component_type',
        },
        field: {
          type: 'string',
          columnName: 'field',
        },
        order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'order',
        },
      },
      indexes: [
        {
          name: 'kitchensinks_field_index',
          columns: ['field'],
        },
        {
          name: 'kitchensinks_component_type_index',
          columns: ['component_type'],
        },
        {
          name: 'kitchensinks_entity_fk',
          columns: ['entity_id'],
        },
        {
          name: 'kitchensinks_unique',
          columns: ['entity_id', 'component_id', 'field', 'component_type'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'kitchensinks_entity_fk',
          columns: ['entity_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        entity_id: 'entity_id',
        component_id: 'component_id',
        component_type: 'component_type',
        field: 'field',
        order: 'order',
      },
    },
  ],
  [
    'api::kitchensink.kitchensink',
    {
      uid: 'api::kitchensink.kitchensink',
      singularName: 'kitchensink',
      tableName: 'kitchensinks',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        short_text: {
          type: 'string',
          columnName: 'short_text',
        },
        long_text: {
          type: 'text',
          columnName: 'long_text',
        },
        rich_text: {
          type: 'richtext',
          columnName: 'rich_text',
        },
        blocks: {
          type: 'blocks',
          columnName: 'blocks',
        },
        integer: {
          type: 'integer',
          columnName: 'integer',
        },
        biginteger: {
          type: 'biginteger',
          columnName: 'biginteger',
        },
        decimal: {
          type: 'decimal',
          columnName: 'decimal',
        },
        float: {
          type: 'float',
          columnName: 'float',
        },
        date: {
          type: 'date',
          columnName: 'date',
        },
        datetime: {
          type: 'datetime',
          columnName: 'datetime',
        },
        time: {
          type: 'time',
          columnName: 'time',
        },
        timestamp: {
          type: 'timestamp',
          columnName: 'timestamp',
        },
        boolean: {
          type: 'boolean',
          columnName: 'boolean',
        },
        email: {
          type: 'email',
          columnName: 'email',
        },
        password: {
          type: 'password',
          columnName: 'password',
        },
        enumeration: {
          type: 'enumeration',
          enum: ['A', 'B', 'C', 'D', 'E'],
          columnName: 'enumeration',
        },
        single_media: {
          type: 'relation',
          relation: 'morphOne',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        multiple_media: {
          type: 'relation',
          relation: 'morphMany',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        json: {
          type: 'json',
          columnName: 'json',
        },
        single_compo: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'basic.simple',
          joinTable: {
            name: 'kitchensinks_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'single_compo',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        repeatable_compo: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'basic.simple',
          joinTable: {
            name: 'kitchensinks_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'repeatable_compo',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        dynamiczone: {
          type: 'relation',
          relation: 'morphToMany',
          joinTable: {
            name: 'kitchensinks_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            morphColumn: {
              idColumn: {
                name: 'component_id',
                referencedColumn: 'id',
              },
              typeColumn: {
                name: 'component_type',
              },
              typeField: '__component',
            },
            on: {
              field: 'dynamiczone',
            },
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        one_way_tag: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::tag.tag',
          joinTable: {
            name: 'kitchensinks_one_way_tag_links',
            joinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['kitchensink_id', 'tag_id'],
          },
        },
        one_to_one_tag: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::tag.tag',
          private: true,
          inversedBy: 'one_to_one_kitchensink',
          joinTable: {
            name: 'kitchensinks_one_to_one_tag_links',
            joinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['kitchensink_id', 'tag_id'],
          },
        },
        one_to_many_tags: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::tag.tag',
          mappedBy: 'many_to_one_kitchensink',
          joinTable: {
            name: 'tags_many_to_one_kitchensink_links',
            joinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['tag_id', 'kitchensink_id'],
            orderColumnName: 'tag_order',
            orderBy: {
              tag_order: 'asc',
            },
          },
        },
        many_to_one_tag: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::tag.tag',
          inversedBy: 'one_to_many_kitchensinks',
          joinTable: {
            name: 'kitchensinks_many_to_one_tag_links',
            joinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['kitchensink_id', 'tag_id'],
            inverseOrderColumnName: 'kitchensink_order',
          },
        },
        many_to_many_tags: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::tag.tag',
          inversedBy: 'many_to_many_kitchensinks',
          joinTable: {
            name: 'kitchensinks_many_to_many_tags_links',
            joinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['kitchensink_id', 'tag_id'],
            orderColumnName: 'tag_order',
            orderBy: {
              tag_order: 'asc',
            },
            inverseOrderColumnName: 'kitchensink_order',
          },
        },
        many_way_tags: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::tag.tag',
          joinTable: {
            name: 'kitchensinks_many_way_tags_links',
            joinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['kitchensink_id', 'tag_id'],
            orderColumnName: 'tag_order',
            orderBy: {
              tag_order: 'asc',
            },
          },
        },
        morph_to_one: {
          type: 'relation',
          relation: 'morphToOne',
          owner: true,
          morphColumn: {
            typeColumn: {
              name: 'target_type',
            },
            idColumn: {
              name: 'target_id',
              referencedColumn: 'id',
            },
          },
        },
        morph_to_many: {
          type: 'relation',
          relation: 'morphToMany',
          joinTable: {
            name: 'kitchensinks_morph_to_many_morphs',
            joinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            morphColumn: {
              typeColumn: {
                name: 'morph_to_many_type',
              },
              idColumn: {
                name: 'morph_to_many_id',
                referencedColumn: 'id',
              },
            },
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['kitchensink_id', 'morph_to_many_type', 'morph_to_many_id'],
          },
        },
        custom_field: {
          type: 'string',
          customField: 'plugin::color-picker.color',
          columnName: 'custom_field',
        },
        custom_field_with_default_options: {
          type: 'string',
          regex: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
          customField: 'plugin::color-picker.color',
          columnName: 'custom_field_with_default_options',
        },
        cats: {
          type: 'relation',
          relation: 'morphToMany',
          joinTable: {
            name: 'kitchensinks_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            morphColumn: {
              idColumn: {
                name: 'component_id',
                referencedColumn: 'id',
              },
              typeColumn: {
                name: 'component_type',
              },
              typeField: '__component',
            },
            on: {
              field: 'cats',
            },
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::kitchensink.kitchensink',
          joinTable: {
            name: 'kitchensinks_localizations_links',
            joinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_kitchensink_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['kitchensink_id', 'inv_kitchensink_id'],
            orderColumnName: 'kitchensink_order',
            orderBy: {
              kitchensink_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        short_text: 'short_text',
        long_text: 'long_text',
        rich_text: 'rich_text',
        blocks: 'blocks',
        integer: 'integer',
        biginteger: 'biginteger',
        decimal: 'decimal',
        float: 'float',
        date: 'date',
        datetime: 'datetime',
        time: 'time',
        timestamp: 'timestamp',
        boolean: 'boolean',
        email: 'email',
        password: 'password',
        enumeration: 'enumeration',
        single_media: 'single_media',
        multiple_media: 'multiple_media',
        json: 'json',
        single_compo: 'single_compo',
        repeatable_compo: 'repeatable_compo',
        dynamiczone: 'dynamiczone',
        one_way_tag: 'one_way_tag',
        one_to_one_tag: 'one_to_one_tag',
        one_to_many_tags: 'one_to_many_tags',
        many_to_one_tag: 'many_to_one_tag',
        many_to_many_tags: 'many_to_many_tags',
        many_way_tags: 'many_way_tags',
        morph_to_one: 'morph_to_one',
        morph_to_many: 'morph_to_many',
        custom_field: 'custom_field',
        custom_field_with_default_options: 'custom_field_with_default_options',
        cats: 'cats',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'api::like.like',
    {
      uid: 'api::like.like',
      singularName: 'like',
      tableName: 'likes',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        author: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'plugin::users-permissions.user',
          joinTable: {
            name: 'likes_author_links',
            joinColumn: {
              name: 'like_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'user_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['like_id', 'user_id'],
          },
        },
        review: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::review.review',
          inversedBy: 'likes',
          joinTable: {
            name: 'likes_review_links',
            joinColumn: {
              name: 'like_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'review_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['like_id', 'review_id'],
            inverseOrderColumnName: 'like_order',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::like.like',
          joinTable: {
            name: 'likes_localizations_links',
            joinColumn: {
              name: 'like_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_like_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['like_id', 'inv_like_id'],
            orderColumnName: 'like_order',
            orderBy: {
              like_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        author: 'author',
        review: 'review',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'api::menu.menu',
    {
      uid: 'api::menu.menu',
      singularName: 'menu',
      tableName: 'menus',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        description: {
          type: 'text',
          columnName: 'description',
        },
        menusections: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::menusection.menusection',
          mappedBy: 'menu',
          joinTable: {
            name: 'menusections_menu_links',
            joinColumn: {
              name: 'menu_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'menusection_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['menusection_id', 'menu_id'],
            orderColumnName: 'menusection_order',
            orderBy: {
              menusection_order: 'asc',
            },
          },
        },
        restaurant: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::restaurant.restaurant',
          mappedBy: 'menu',
          joinTable: {
            name: 'restaurants_menu_links',
            joinColumn: {
              name: 'menu_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'restaurant_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['restaurant_id', 'menu_id'],
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::menu.menu',
          joinTable: {
            name: 'menus_localizations_links',
            joinColumn: {
              name: 'menu_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_menu_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['menu_id', 'inv_menu_id'],
            orderColumnName: 'menu_order',
            orderBy: {
              menu_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        description: 'description',
        menusections: 'menusections',
        restaurant: 'restaurant',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'menusections_components',
    {
      singularName: 'menusections_components',
      uid: 'menusections_components',
      tableName: 'menusections_components',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        entity_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'entity_id',
        },
        component_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'component_id',
        },
        component_type: {
          type: 'string',
          columnName: 'component_type',
        },
        field: {
          type: 'string',
          columnName: 'field',
        },
        order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'order',
        },
      },
      indexes: [
        {
          name: 'menusections_field_index',
          columns: ['field'],
        },
        {
          name: 'menusections_component_type_index',
          columns: ['component_type'],
        },
        {
          name: 'menusections_entity_fk',
          columns: ['entity_id'],
        },
        {
          name: 'menusections_unique',
          columns: ['entity_id', 'component_id', 'field', 'component_type'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'menusections_entity_fk',
          columns: ['entity_id'],
          referencedColumns: ['id'],
          referencedTable: 'menusections',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        entity_id: 'entity_id',
        component_id: 'component_id',
        component_type: 'component_type',
        field: 'field',
        order: 'order',
      },
    },
  ],
  [
    'api::menusection.menusection',
    {
      uid: 'api::menusection.menusection',
      singularName: 'menusection',
      tableName: 'menusections',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          required: true,
          minLength: 6,
          columnName: 'name',
        },
        dishes: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'default.dish',
          joinTable: {
            name: 'menusections_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'dishes',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        menu: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::menu.menu',
          inversedBy: 'menusections',
          joinTable: {
            name: 'menusections_menu_links',
            joinColumn: {
              name: 'menusection_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'menu_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['menusection_id', 'menu_id'],
            inverseOrderColumnName: 'menusection_order',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::menusection.menusection',
          joinTable: {
            name: 'menusections_localizations_links',
            joinColumn: {
              name: 'menusection_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_menusection_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['menusection_id', 'inv_menusection_id'],
            orderColumnName: 'menusection_order',
            orderBy: {
              menusection_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        dishes: 'dishes',
        menu: 'menu',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'relation_locales_components',
    {
      singularName: 'relation_locales_components',
      uid: 'relation_locales_components',
      tableName: 'relation_locales_components',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        entity_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'entity_id',
        },
        component_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'component_id',
        },
        component_type: {
          type: 'string',
          columnName: 'component_type',
        },
        field: {
          type: 'string',
          columnName: 'field',
        },
        order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'order',
        },
      },
      indexes: [
        {
          name: 'relation_locales_field_index',
          columns: ['field'],
        },
        {
          name: 'relation_locales_component_type_index',
          columns: ['component_type'],
        },
        {
          name: 'relation_locales_entity_fk',
          columns: ['entity_id'],
        },
        {
          name: 'relation_locales_unique',
          columns: ['entity_id', 'component_id', 'field', 'component_type'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'relation_locales_entity_fk',
          columns: ['entity_id'],
          referencedColumns: ['id'],
          referencedTable: 'relation_locales',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        entity_id: 'entity_id',
        component_id: 'component_id',
        component_type: 'component_type',
        field: 'field',
        order: 'order',
      },
    },
  ],
  [
    'api::relation-locale.relation-locale',
    {
      uid: 'api::relation-locale.relation-locale',
      singularName: 'relation-locale',
      tableName: 'relation_locales',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        categories: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::category.category',
          inversedBy: 'relation_locales',
          joinTable: {
            name: 'relation_locales_categories_links',
            joinColumn: {
              name: 'relation_locale_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['relation_locale_id', 'category_id'],
            orderColumnName: 'category_order',
            orderBy: {
              category_order: 'asc',
            },
            inverseOrderColumnName: 'relation_locale_order',
          },
        },
        title: {
          type: 'string',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'title',
        },
        repeatable_relations: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'basic.relation',
          joinTable: {
            name: 'relation_locales_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'repeatable_relations',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        dynamic_relations: {
          type: 'relation',
          relation: 'morphToMany',
          joinTable: {
            name: 'relation_locales_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            morphColumn: {
              idColumn: {
                name: 'component_id',
                referencedColumn: 'id',
              },
              typeColumn: {
                name: 'component_type',
              },
              typeField: '__component',
            },
            on: {
              field: 'dynamic_relations',
            },
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        single_relation: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'basic.relation',
          joinTable: {
            name: 'relation_locales_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'single_relation',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        require_single_relation: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'basic.relation',
          joinTable: {
            name: 'relation_locales_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'require_single_relation',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::relation-locale.relation-locale',
          joinTable: {
            name: 'relation_locales_localizations_links',
            joinColumn: {
              name: 'relation_locale_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_relation_locale_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['relation_locale_id', 'inv_relation_locale_id'],
            orderColumnName: 'relation_locale_order',
            orderBy: {
              relation_locale_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        categories: 'categories',
        title: 'title',
        repeatable_relations: 'repeatable_relations',
        dynamic_relations: 'dynamic_relations',
        single_relation: 'single_relation',
        require_single_relation: 'require_single_relation',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'restaurants_components',
    {
      singularName: 'restaurants_components',
      uid: 'restaurants_components',
      tableName: 'restaurants_components',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        entity_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'entity_id',
        },
        component_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'component_id',
        },
        component_type: {
          type: 'string',
          columnName: 'component_type',
        },
        field: {
          type: 'string',
          columnName: 'field',
        },
        order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'order',
        },
      },
      indexes: [
        {
          name: 'restaurants_field_index',
          columns: ['field'],
        },
        {
          name: 'restaurants_component_type_index',
          columns: ['component_type'],
        },
        {
          name: 'restaurants_entity_fk',
          columns: ['entity_id'],
        },
        {
          name: 'restaurants_unique',
          columns: ['entity_id', 'component_id', 'field', 'component_type'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'restaurants_entity_fk',
          columns: ['entity_id'],
          referencedColumns: ['id'],
          referencedTable: 'restaurants',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        entity_id: 'entity_id',
        component_id: 'component_id',
        component_type: 'component_type',
        field: 'field',
        order: 'order',
      },
    },
  ],
  [
    'api::restaurant.restaurant',
    {
      uid: 'api::restaurant.restaurant',
      singularName: 'restaurant',
      tableName: 'restaurants',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          maxLength: 50,
          required: true,
          minLength: 5,
          type: 'string',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'name',
        },
        slug: {
          type: 'uid',
          targetField: 'name',
          pluginOptions: {},
          columnName: 'slug',
        },
        priceRange: {
          enum: ['very_cheap', 'cheap', 'average', 'expensive', 'very_expensive'],
          type: 'enumeration',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'price_range',
        },
        closingPeriod: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'default.closingperiod',
          joinTable: {
            name: 'restaurants_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'closingPeriod',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        contactEmail: {
          type: 'email',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'contact_email',
        },
        stars: {
          required: true,
          type: 'integer',
          min: 0,
          max: 3,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'stars',
        },
        averagePrice: {
          type: 'float',
          min: 0,
          max: 35.12,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'average_price',
        },
        address: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::address.address',
          joinTable: {
            name: 'restaurants_address_links',
            joinColumn: {
              name: 'restaurant_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'address_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['restaurant_id', 'address_id'],
          },
        },
        cover: {
          type: 'relation',
          relation: 'morphOne',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        timestamp: {
          type: 'timestamp',
          columnName: 'timestamp',
        },
        images: {
          type: 'relation',
          relation: 'morphMany',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        shortDescription: {
          type: 'text',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'short_description',
        },
        since: {
          type: 'date',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'since',
        },
        categories: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::category.category',
          joinTable: {
            name: 'restaurants_categories_links',
            joinColumn: {
              name: 'restaurant_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['restaurant_id', 'category_id'],
            orderColumnName: 'category_order',
            orderBy: {
              category_order: 'asc',
            },
          },
        },
        description: {
          type: 'richtext',
          required: true,
          minLength: 10,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          columnName: 'description',
        },
        services: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'default.restaurantservice',
          joinTable: {
            name: 'restaurants_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'services',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        menu: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::menu.menu',
          inversedBy: 'restaurant',
          joinTable: {
            name: 'restaurants_menu_links',
            joinColumn: {
              name: 'restaurant_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'menu_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['restaurant_id', 'menu_id'],
          },
        },
        openingTimes: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'default.openingtimes',
          joinTable: {
            name: 'restaurants_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'openingTimes',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        dz: {
          type: 'relation',
          relation: 'morphToMany',
          joinTable: {
            name: 'restaurants_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            morphColumn: {
              idColumn: {
                name: 'component_id',
                referencedColumn: 'id',
              },
              typeColumn: {
                name: 'component_type',
              },
              typeField: '__component',
            },
            on: {
              field: 'dz',
            },
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: false,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: false,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::restaurant.restaurant',
          joinTable: {
            name: 'restaurants_localizations_links',
            joinColumn: {
              name: 'restaurant_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_restaurant_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['restaurant_id', 'inv_restaurant_id'],
            orderColumnName: 'restaurant_order',
            orderBy: {
              restaurant_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        slug: 'slug',
        price_range: 'priceRange',
        closingPeriod: 'closingPeriod',
        contact_email: 'contactEmail',
        stars: 'stars',
        average_price: 'averagePrice',
        address: 'address',
        cover: 'cover',
        timestamp: 'timestamp',
        images: 'images',
        short_description: 'shortDescription',
        since: 'since',
        categories: 'categories',
        description: 'description',
        services: 'services',
        menu: 'menu',
        openingTimes: 'openingTimes',
        dz: 'dz',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'api::review.review',
    {
      uid: 'api::review.review',
      singularName: 'review',
      tableName: 'reviews',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        comment: {
          type: 'text',
          required: true,
          columnName: 'comment',
        },
        rating: {
          type: 'integer',
          required: true,
          min: 1,
          max: 5,
          columnName: 'rating',
        },
        likes: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::like.like',
          mappedBy: 'review',
          joinTable: {
            name: 'likes_review_links',
            joinColumn: {
              name: 'review_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'like_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['like_id', 'review_id'],
            orderColumnName: 'like_order',
            orderBy: {
              like_order: 'asc',
            },
          },
        },
        author: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'plugin::users-permissions.user',
          joinTable: {
            name: 'reviews_author_links',
            joinColumn: {
              name: 'review_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'user_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['review_id', 'user_id'],
          },
        },
        restaurant: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::restaurant.restaurant',
          joinTable: {
            name: 'reviews_restaurant_links',
            joinColumn: {
              name: 'review_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'restaurant_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['review_id', 'restaurant_id'],
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::review.review',
          joinTable: {
            name: 'reviews_localizations_links',
            joinColumn: {
              name: 'review_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_review_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['review_id', 'inv_review_id'],
            orderColumnName: 'review_order',
            orderBy: {
              review_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        comment: 'comment',
        rating: 'rating',
        likes: 'likes',
        author: 'author',
        restaurant: 'restaurant',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'api::tag.tag',
    {
      uid: 'api::tag.tag',
      singularName: 'tag',
      tableName: 'tags',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          columnName: 'name',
        },
        many_to_one_kitchensink: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::kitchensink.kitchensink',
          inversedBy: 'one_to_many_tags',
          joinTable: {
            name: 'tags_many_to_one_kitchensink_links',
            joinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['tag_id', 'kitchensink_id'],
            inverseOrderColumnName: 'tag_order',
          },
        },
        one_to_many_kitchensinks: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::kitchensink.kitchensink',
          mappedBy: 'many_to_one_tag',
          joinTable: {
            name: 'kitchensinks_many_to_one_tag_links',
            joinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['kitchensink_id', 'tag_id'],
            orderColumnName: 'kitchensink_order',
            orderBy: {
              kitchensink_order: 'asc',
            },
          },
        },
        many_to_many_kitchensinks: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::kitchensink.kitchensink',
          mappedBy: 'many_to_many_tags',
          joinTable: {
            name: 'kitchensinks_many_to_many_tags_links',
            joinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['kitchensink_id', 'tag_id'],
            orderColumnName: 'kitchensink_order',
            orderBy: {
              kitchensink_order: 'asc',
            },
            inverseOrderColumnName: 'tag_order',
          },
        },
        one_to_one_kitchensink: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::kitchensink.kitchensink',
          mappedBy: 'one_to_one_tag',
          joinTable: {
            name: 'kitchensinks_one_to_one_tag_links',
            joinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'kitchensink_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['kitchensink_id', 'tag_id'],
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::tag.tag',
          joinTable: {
            name: 'tags_localizations_links',
            joinColumn: {
              name: 'tag_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_tag_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['tag_id', 'inv_tag_id'],
            orderColumnName: 'tag_order',
            orderBy: {
              tag_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        many_to_one_kitchensink: 'many_to_one_kitchensink',
        one_to_many_kitchensinks: 'one_to_many_kitchensinks',
        many_to_many_kitchensinks: 'many_to_many_kitchensinks',
        one_to_one_kitchensink: 'one_to_one_kitchensink',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'api::temp.temp',
    {
      uid: 'api::temp.temp',
      singularName: 'temp',
      tableName: 'temps',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        documentId: {
          type: 'string',
          columnName: 'document_id',
        },
        name: {
          type: 'string',
          pluginOptions: {},
          columnName: 'name',
        },
        category: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::category.category',
          joinTable: {
            name: 'temps_category_links',
            joinColumn: {
              name: 'temp_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['temp_id', 'category_id'],
          },
        },
        categories: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::category.category',
          inversedBy: 'temps',
          joinTable: {
            name: 'temps_categories_links',
            joinColumn: {
              name: 'temp_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['temp_id', 'category_id'],
            orderColumnName: 'category_order',
            orderBy: {
              category_order: 'asc',
            },
            inverseOrderColumnName: 'temp_order',
          },
        },
        selfManyToMany: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::temp.temp',
          inversedBy: 'selfManyToManyInv',
          joinTable: {
            name: 'temps_self_many_to_many_links',
            joinColumn: {
              name: 'temp_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_temp_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['temp_id', 'inv_temp_id'],
            orderColumnName: 'temp_order',
            orderBy: {
              temp_order: 'asc',
            },
            inverseOrderColumnName: 'inv_temp_order',
          },
        },
        selfManyToManyInv: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::temp.temp',
          inversedBy: 'selfManyToMany',
          joinTable: {
            name: 'temps_self_many_to_many_links',
            joinColumn: {
              name: 'inv_temp_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'temp_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['temp_id', 'inv_temp_id'],
            orderColumnName: 'inv_temp_order',
            orderBy: {
              inv_temp_order: 'asc',
            },
            inverseOrderColumnName: 'temp_order',
          },
        },
        bidirectionalAddress: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::address.address',
          inversedBy: 'bidirectionalTemps',
          useJoinTable: false,
          owner: true,
          joinColumn: {
            name: 'bidirectional_address_id',
            referencedColumn: 'id',
            referencedTable: 'addresses',
          },
        },
        createdAt: {
          type: 'datetime',
          columnName: 'created_at',
        },
        updatedAt: {
          type: 'datetime',
          columnName: 'updated_at',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
          columnName: 'published_at',
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'created_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
          owner: true,
          joinColumn: {
            name: 'updated_by_id',
            referencedColumn: 'id',
            referencedTable: 'admin_users',
          },
        },
        localizations: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::temp.temp',
          joinTable: {
            name: 'temps_localizations_links',
            joinColumn: {
              name: 'temp_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'inv_temp_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['temp_id', 'inv_temp_id'],
            orderColumnName: 'temp_order',
            orderBy: {
              temp_order: 'asc',
            },
          },
        },
        locale: {
          writable: true,
          private: false,
          configurable: false,
          visible: false,
          type: 'string',
          columnName: 'locale',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        document_id: 'documentId',
        name: 'name',
        category: 'category',
        categories: 'categories',
        selfManyToMany: 'selfManyToMany',
        selfManyToManyInv: 'selfManyToManyInv',
        bidirectionalAddress: 'bidirectionalAddress',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        published_at: 'publishedAt',
        createdBy: 'createdBy',
        updatedBy: 'updatedBy',
        localizations: 'localizations',
        locale: 'locale',
      },
    },
  ],
  [
    'default.temp',
    {
      uid: 'default.temp',
      singularName: 'temp',
      tableName: 'components_default_temps',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        name: {
          type: 'string',
          required: true,
          columnName: 'name',
        },
        url: {
          type: 'string',
          columnName: 'url',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        name: 'name',
        url: 'url',
      },
    },
  ],
  [
    'default.restaurantservice',
    {
      uid: 'default.restaurantservice',
      singularName: 'restaurantservice',
      tableName: 'components_restaurantservices',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        name: {
          type: 'string',
          required: true,
          default: 'something',
          columnName: 'name',
        },
        media: {
          type: 'relation',
          relation: 'morphOne',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        is_available: {
          type: 'boolean',
          required: true,
          default: true,
          columnName: 'is_available',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        name: 'name',
        media: 'media',
        is_available: 'is_available',
      },
    },
  ],
  [
    'components_openingtimes_components',
    {
      singularName: 'components_openingtimes_components',
      uid: 'components_openingtimes_components',
      tableName: 'components_openingtimes_components',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        entity_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'entity_id',
        },
        component_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'component_id',
        },
        component_type: {
          type: 'string',
          columnName: 'component_type',
        },
        field: {
          type: 'string',
          columnName: 'field',
        },
        order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'order',
        },
      },
      indexes: [
        {
          name: 'components_openingtimes_field_index',
          columns: ['field'],
        },
        {
          name: 'components_openingtimes_component_type_index',
          columns: ['component_type'],
        },
        {
          name: 'components_openingtimes_entity_fk',
          columns: ['entity_id'],
        },
        {
          name: 'components_openingtimes_unique',
          columns: ['entity_id', 'component_id', 'field', 'component_type'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'components_openingtimes_entity_fk',
          columns: ['entity_id'],
          referencedColumns: ['id'],
          referencedTable: 'components_openingtimes',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        entity_id: 'entity_id',
        component_id: 'component_id',
        component_type: 'component_type',
        field: 'field',
        order: 'order',
      },
    },
  ],
  [
    'default.openingtimes',
    {
      uid: 'default.openingtimes',
      singularName: 'openingtimes',
      tableName: 'components_openingtimes',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        label: {
          type: 'string',
          required: true,
          default: 'something',
          columnName: 'label',
        },
        time: {
          type: 'string',
          columnName: 'time',
        },
        dishrep: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'default.dish',
          joinTable: {
            name: 'components_openingtimes_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'dishrep',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        label: 'label',
        time: 'time',
        dishrep: 'dishrep',
      },
    },
  ],
  [
    'default.dish',
    {
      uid: 'default.dish',
      singularName: 'dish',
      tableName: 'components_dishes',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        name: {
          type: 'string',
          required: false,
          default: 'My super dish',
          columnName: 'name',
        },
        description: {
          type: 'text',
          columnName: 'description',
        },
        price: {
          type: 'float',
          columnName: 'price',
        },
        picture: {
          type: 'relation',
          relation: 'morphOne',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        very_long_description: {
          type: 'richtext',
          columnName: 'very_long_description',
        },
        categories: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::category.category',
          joinTable: {
            name: 'components_dishes_categories_links',
            joinColumn: {
              name: 'dish_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['dish_id', 'category_id'],
          },
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        name: 'name',
        description: 'description',
        price: 'price',
        picture: 'picture',
        very_long_description: 'very_long_description',
        categories: 'categories',
      },
    },
  ],
  [
    'components_closingperiods_components',
    {
      singularName: 'components_closingperiods_components',
      uid: 'components_closingperiods_components',
      tableName: 'components_closingperiods_components',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        entity_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'entity_id',
        },
        component_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'component_id',
        },
        component_type: {
          type: 'string',
          columnName: 'component_type',
        },
        field: {
          type: 'string',
          columnName: 'field',
        },
        order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'order',
        },
      },
      indexes: [
        {
          name: 'components_closingperiods_field_index',
          columns: ['field'],
        },
        {
          name: 'components_closingperiods_component_type_index',
          columns: ['component_type'],
        },
        {
          name: 'components_closingperiods_entity_fk',
          columns: ['entity_id'],
        },
        {
          name: 'components_closingperiods_unique',
          columns: ['entity_id', 'component_id', 'field', 'component_type'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'components_closingperiods_entity_fk',
          columns: ['entity_id'],
          referencedColumns: ['id'],
          referencedTable: 'components_closingperiods',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        entity_id: 'entity_id',
        component_id: 'component_id',
        component_type: 'component_type',
        field: 'field',
        order: 'order',
      },
    },
  ],
  [
    'default.closingperiod',
    {
      uid: 'default.closingperiod',
      singularName: 'closingperiod',
      tableName: 'components_closingperiods',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        label: {
          type: 'string',
          default: 'toto',
          columnName: 'label',
        },
        start_date: {
          type: 'date',
          required: true,
          columnName: 'start_date',
        },
        end_date: {
          type: 'date',
          required: true,
          columnName: 'end_date',
        },
        media: {
          type: 'relation',
          relation: 'morphOne',
          target: 'plugin::upload.file',
          morphBy: 'related',
        },
        dish: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'default.dish',
          joinTable: {
            name: 'components_closingperiods_components',
            joinColumn: {
              name: 'entity_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            on: {
              field: 'dish',
            },
            orderColumnName: 'order',
            orderBy: {
              order: 'asc',
            },
            pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
          },
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        label: 'label',
        start_date: 'start_date',
        end_date: 'end_date',
        media: 'media',
        dish: 'dish',
      },
    },
  ],
  [
    'default.car',
    {
      uid: 'default.car',
      singularName: 'car',
      tableName: 'components_default_cars',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        name: {
          type: 'string',
          columnName: 'name',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        name: 'name',
      },
    },
  ],
  [
    'default.apple',
    {
      uid: 'default.apple',
      singularName: 'apple',
      tableName: 'components_default_apples',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        name: {
          type: 'string',
          required: true,
          columnName: 'name',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        name: 'name',
      },
    },
  ],
  [
    'blog.test-como',
    {
      uid: 'blog.test-como',
      singularName: 'test-como',
      tableName: 'components_blog_test_comos',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        name: {
          type: 'string',
          default: 'toto',
          columnName: 'name',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        name: 'name',
      },
    },
  ],
  [
    'basic.simple',
    {
      uid: 'basic.simple',
      singularName: 'simple',
      tableName: 'components_basic_simples',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        name: {
          type: 'string',
          required: true,
          columnName: 'name',
        },
        test: {
          type: 'string',
          columnName: 'test',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        name: 'name',
        test: 'test',
      },
    },
  ],
  [
    'basic.relation',
    {
      uid: 'basic.relation',
      singularName: 'relation',
      tableName: 'components_basic_relations',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        categories: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::category.category',
          joinTable: {
            name: 'components_basic_relations_categories_links',
            joinColumn: {
              name: 'relation_id',
              referencedColumn: 'id',
            },
            inverseJoinColumn: {
              name: 'category_id',
              referencedColumn: 'id',
            },
            pivotColumns: ['relation_id', 'category_id'],
            orderColumnName: 'category_order',
            orderBy: {
              category_order: 'asc',
            },
          },
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        categories: 'categories',
      },
    },
  ],
  [
    'strapi::core-store',
    {
      uid: 'strapi::core-store',
      singularName: 'strapi_core_store_settings',
      tableName: 'strapi_core_store_settings',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        key: {
          type: 'string',
          columnName: 'key',
        },
        value: {
          type: 'text',
          columnName: 'value',
        },
        type: {
          type: 'string',
          columnName: 'type',
        },
        environment: {
          type: 'string',
          columnName: 'environment',
        },
        tag: {
          type: 'string',
          columnName: 'tag',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        key: 'key',
        value: 'value',
        type: 'type',
        environment: 'environment',
        tag: 'tag',
      },
    },
  ],
  [
    'strapi::webhook',
    {
      uid: 'strapi::webhook',
      singularName: 'strapi_webhooks',
      tableName: 'strapi_webhooks',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        name: {
          type: 'string',
          columnName: 'name',
        },
        url: {
          type: 'text',
          columnName: 'url',
        },
        headers: {
          type: 'json',
          columnName: 'headers',
        },
        events: {
          type: 'json',
          columnName: 'events',
        },
        enabled: {
          type: 'boolean',
          columnName: 'enabled',
        },
      },
      lifecycles: {},
      indexes: [],
      foreignKeys: [],
      columnToAttribute: {
        id: 'id',
        name: 'name',
        url: 'url',
        headers: 'headers',
        events: 'events',
        enabled: 'enabled',
      },
    },
  ],
  [
    'admin_permissions_role_links',
    {
      singularName: 'admin_permissions_role_links',
      uid: 'admin_permissions_role_links',
      tableName: 'admin_permissions_role_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'permission_id',
        },
        role_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'role_id',
        },
        permission_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'permission_order',
        },
      },
      indexes: [
        {
          name: 'admin_permissions_role_links_fk',
          columns: ['permission_id'],
        },
        {
          name: 'admin_permissions_role_links_inv_fk',
          columns: ['role_id'],
        },
        {
          name: 'admin_permissions_role_links_unique',
          columns: ['permission_id', 'role_id'],
          type: 'unique',
        },
        {
          name: 'admin_permissions_role_links_order_inv_fk',
          columns: ['permission_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'admin_permissions_role_links_fk',
          columns: ['permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_permissions',
          onDelete: 'CASCADE',
        },
        {
          name: 'admin_permissions_role_links_inv_fk',
          columns: ['role_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_roles',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        permission_id: 'permission_id',
        role_id: 'role_id',
        permission_order: 'permission_order',
      },
    },
  ],
  [
    'admin_permissions_localizations_links',
    {
      singularName: 'admin_permissions_localizations_links',
      uid: 'admin_permissions_localizations_links',
      tableName: 'admin_permissions_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'permission_id',
        },
        inv_permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_permission_id',
        },
        permission_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'permission_order',
        },
      },
      indexes: [
        {
          name: 'admin_permissions_localizations_links_fk',
          columns: ['permission_id'],
        },
        {
          name: 'admin_permissions_localizations_links_inv_fk',
          columns: ['inv_permission_id'],
        },
        {
          name: 'admin_permissions_localizations_links_unique',
          columns: ['permission_id', 'inv_permission_id'],
          type: 'unique',
        },
        {
          name: 'admin_permissions_localizations_links_order_fk',
          columns: ['permission_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'admin_permissions_localizations_links_fk',
          columns: ['permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_permissions',
          onDelete: 'CASCADE',
        },
        {
          name: 'admin_permissions_localizations_links_inv_fk',
          columns: ['inv_permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_permissions',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        permission_id: 'permission_id',
        inv_permission_id: 'inv_permission_id',
        permission_order: 'permission_order',
      },
    },
  ],
  [
    'admin_users_roles_links',
    {
      singularName: 'admin_users_roles_links',
      uid: 'admin_users_roles_links',
      tableName: 'admin_users_roles_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        user_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'user_id',
        },
        role_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'role_id',
        },
        role_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'role_order',
        },
        user_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'user_order',
        },
      },
      indexes: [
        {
          name: 'admin_users_roles_links_fk',
          columns: ['user_id'],
        },
        {
          name: 'admin_users_roles_links_inv_fk',
          columns: ['role_id'],
        },
        {
          name: 'admin_users_roles_links_unique',
          columns: ['user_id', 'role_id'],
          type: 'unique',
        },
        {
          name: 'admin_users_roles_links_order_fk',
          columns: ['role_order'],
        },
        {
          name: 'admin_users_roles_links_order_inv_fk',
          columns: ['user_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'admin_users_roles_links_fk',
          columns: ['user_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_users',
          onDelete: 'CASCADE',
        },
        {
          name: 'admin_users_roles_links_inv_fk',
          columns: ['role_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_roles',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        user_id: 'user_id',
        role_id: 'role_id',
        role_order: 'role_order',
        user_order: 'user_order',
      },
    },
  ],
  [
    'admin_users_localizations_links',
    {
      singularName: 'admin_users_localizations_links',
      uid: 'admin_users_localizations_links',
      tableName: 'admin_users_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        user_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'user_id',
        },
        inv_user_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_user_id',
        },
        user_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'user_order',
        },
      },
      indexes: [
        {
          name: 'admin_users_localizations_links_fk',
          columns: ['user_id'],
        },
        {
          name: 'admin_users_localizations_links_inv_fk',
          columns: ['inv_user_id'],
        },
        {
          name: 'admin_users_localizations_links_unique',
          columns: ['user_id', 'inv_user_id'],
          type: 'unique',
        },
        {
          name: 'admin_users_localizations_links_order_fk',
          columns: ['user_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'admin_users_localizations_links_fk',
          columns: ['user_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_users',
          onDelete: 'CASCADE',
        },
        {
          name: 'admin_users_localizations_links_inv_fk',
          columns: ['inv_user_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_users',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        user_id: 'user_id',
        inv_user_id: 'inv_user_id',
        user_order: 'user_order',
      },
    },
  ],
  [
    'admin_roles_localizations_links',
    {
      singularName: 'admin_roles_localizations_links',
      uid: 'admin_roles_localizations_links',
      tableName: 'admin_roles_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        role_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'role_id',
        },
        inv_role_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_role_id',
        },
        role_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'role_order',
        },
      },
      indexes: [
        {
          name: 'admin_roles_localizations_links_fk',
          columns: ['role_id'],
        },
        {
          name: 'admin_roles_localizations_links_inv_fk',
          columns: ['inv_role_id'],
        },
        {
          name: 'admin_roles_localizations_links_unique',
          columns: ['role_id', 'inv_role_id'],
          type: 'unique',
        },
        {
          name: 'admin_roles_localizations_links_order_fk',
          columns: ['role_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'admin_roles_localizations_links_fk',
          columns: ['role_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_roles',
          onDelete: 'CASCADE',
        },
        {
          name: 'admin_roles_localizations_links_inv_fk',
          columns: ['inv_role_id'],
          referencedColumns: ['id'],
          referencedTable: 'admin_roles',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        role_id: 'role_id',
        inv_role_id: 'inv_role_id',
        role_order: 'role_order',
      },
    },
  ],
  [
    'strapi_api_tokens_localizations_links',
    {
      singularName: 'strapi_api_tokens_localizations_links',
      uid: 'strapi_api_tokens_localizations_links',
      tableName: 'strapi_api_tokens_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        api_token_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'api_token_id',
        },
        inv_api_token_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_api_token_id',
        },
        api_token_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'api_token_order',
        },
      },
      indexes: [
        {
          name: 'strapi_api_tokens_localizations_links_fk',
          columns: ['api_token_id'],
        },
        {
          name: 'strapi_api_tokens_localizations_links_inv_fk',
          columns: ['inv_api_token_id'],
        },
        {
          name: 'strapi_api_tokens_localizations_links_unique',
          columns: ['api_token_id', 'inv_api_token_id'],
          type: 'unique',
        },
        {
          name: 'strapi_api_tokens_localizations_links_order_fk',
          columns: ['api_token_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'strapi_api_tokens_localizations_links_fk',
          columns: ['api_token_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_api_tokens',
          onDelete: 'CASCADE',
        },
        {
          name: 'strapi_api_tokens_localizations_links_inv_fk',
          columns: ['inv_api_token_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_api_tokens',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        api_token_id: 'api_token_id',
        inv_api_token_id: 'inv_api_token_id',
        api_token_order: 'api_token_order',
      },
    },
  ],
  [
    'strapi_api_token_permissions_token_links',
    {
      singularName: 'strapi_api_token_permissions_token_links',
      uid: 'strapi_api_token_permissions_token_links',
      tableName: 'strapi_api_token_permissions_token_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        api_token_permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'api_token_permission_id',
        },
        api_token_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'api_token_id',
        },
        api_token_permission_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'api_token_permission_order',
        },
      },
      indexes: [
        {
          name: 'strapi_api_token_permissions_token_links_fk',
          columns: ['api_token_permission_id'],
        },
        {
          name: 'strapi_api_token_permissions_token_links_inv_fk',
          columns: ['api_token_id'],
        },
        {
          name: 'strapi_api_token_permissions_token_links_unique',
          columns: ['api_token_permission_id', 'api_token_id'],
          type: 'unique',
        },
        {
          name: 'strapi_api_token_permissions_token_links_order_inv_fk',
          columns: ['api_token_permission_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'strapi_api_token_permissions_token_links_fk',
          columns: ['api_token_permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_api_token_permissions',
          onDelete: 'CASCADE',
        },
        {
          name: 'strapi_api_token_permissions_token_links_inv_fk',
          columns: ['api_token_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_api_tokens',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        api_token_permission_id: 'api_token_permission_id',
        api_token_id: 'api_token_id',
        api_token_permission_order: 'api_token_permission_order',
      },
    },
  ],
  [
    'strapi_api_token_permissions_localizations_links',
    {
      singularName: 'strapi_api_token_permissions_localizations_links',
      uid: 'strapi_api_token_permissions_localizations_links',
      tableName: 'strapi_api_token_permissions_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        api_token_permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'api_token_permission_id',
        },
        inv_api_token_permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_api_token_permission_id',
        },
        api_token_permission_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'api_token_permission_order',
        },
      },
      indexes: [
        {
          name: 'strapi_api_token_permissions_localizations_links_fk',
          columns: ['api_token_permission_id'],
        },
        {
          name: 'strapi_api_token_permissions_localizations_links_inv_fk',
          columns: ['inv_api_token_permission_id'],
        },
        {
          name: 'strapi_api_token_permissions_localizations_links_unique',
          columns: ['api_token_permission_id', 'inv_api_token_permission_id'],
          type: 'unique',
        },
        {
          name: 'strapi_api_token_permissions_localizations_links_order_fk',
          columns: ['api_token_permission_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'strapi_api_token_permissions_localizations_links_fk',
          columns: ['api_token_permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_api_token_permissions',
          onDelete: 'CASCADE',
        },
        {
          name: 'strapi_api_token_permissions_localizations_links_inv_fk',
          columns: ['inv_api_token_permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_api_token_permissions',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        api_token_permission_id: 'api_token_permission_id',
        inv_api_token_permission_id: 'inv_api_token_permission_id',
        api_token_permission_order: 'api_token_permission_order',
      },
    },
  ],
  [
    'strapi_transfer_tokens_localizations_links',
    {
      singularName: 'strapi_transfer_tokens_localizations_links',
      uid: 'strapi_transfer_tokens_localizations_links',
      tableName: 'strapi_transfer_tokens_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        transfer_token_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'transfer_token_id',
        },
        inv_transfer_token_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_transfer_token_id',
        },
        transfer_token_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'transfer_token_order',
        },
      },
      indexes: [
        {
          name: 'strapi_transfer_tokens_localizations_links_fk',
          columns: ['transfer_token_id'],
        },
        {
          name: 'strapi_transfer_tokens_localizations_links_inv_fk',
          columns: ['inv_transfer_token_id'],
        },
        {
          name: 'strapi_transfer_tokens_localizations_links_unique',
          columns: ['transfer_token_id', 'inv_transfer_token_id'],
          type: 'unique',
        },
        {
          name: 'strapi_transfer_tokens_localizations_links_order_fk',
          columns: ['transfer_token_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'strapi_transfer_tokens_localizations_links_fk',
          columns: ['transfer_token_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_transfer_tokens',
          onDelete: 'CASCADE',
        },
        {
          name: 'strapi_transfer_tokens_localizations_links_inv_fk',
          columns: ['inv_transfer_token_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_transfer_tokens',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        transfer_token_id: 'transfer_token_id',
        inv_transfer_token_id: 'inv_transfer_token_id',
        transfer_token_order: 'transfer_token_order',
      },
    },
  ],
  [
    'strapi_transfer_token_permissions_token_links',
    {
      singularName: 'strapi_transfer_token_permissions_token_links',
      uid: 'strapi_transfer_token_permissions_token_links',
      tableName: 'strapi_transfer_token_permissions_token_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        transfer_token_permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'transfer_token_permission_id',
        },
        transfer_token_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'transfer_token_id',
        },
        transfer_token_permission_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'transfer_token_permission_order',
        },
      },
      indexes: [
        {
          name: 'strapi_transfer_token_permissions_token_links_fk',
          columns: ['transfer_token_permission_id'],
        },
        {
          name: 'strapi_transfer_token_permissions_token_links_inv_fk',
          columns: ['transfer_token_id'],
        },
        {
          name: 'strapi_transfer_token_permissions_token_links_unique',
          columns: ['transfer_token_permission_id', 'transfer_token_id'],
          type: 'unique',
        },
        {
          name: 'strapi_transfer_token_permissions_token_links_order_inv_fk',
          columns: ['transfer_token_permission_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'strapi_transfer_token_permissions_token_links_fk',
          columns: ['transfer_token_permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_transfer_token_permissions',
          onDelete: 'CASCADE',
        },
        {
          name: 'strapi_transfer_token_permissions_token_links_inv_fk',
          columns: ['transfer_token_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_transfer_tokens',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        transfer_token_permission_id: 'transfer_token_permission_id',
        transfer_token_id: 'transfer_token_id',
        transfer_token_permission_order: 'transfer_token_permission_order',
      },
    },
  ],
  [
    'strapi_transfer_token_permissions_localizations_links',
    {
      singularName: 'strapi_transfer_token_permissions_localizations_links',
      uid: 'strapi_transfer_token_permissions_localizations_links',
      tableName: 'strapi_transfer_token_permissions_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        transfer_token_permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'transfer_token_permission_id',
        },
        inv_transfer_token_permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_transfer_token_permission_id',
        },
        transfer_token_permission_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'transfer_token_permission_order',
        },
      },
      indexes: [
        {
          name: 'strapi_transfer_token_permissions_localizations_links_fk',
          columns: ['transfer_token_permission_id'],
        },
        {
          name: 'strapi_transfer_token_permissions_localizations_links_inv_fk',
          columns: ['inv_transfer_token_permission_id'],
        },
        {
          name: 'strapi_transfer_token_permissions_localizations_links_unique',
          columns: ['transfer_token_permission_id', 'inv_transfer_token_permission_id'],
          type: 'unique',
        },
        {
          name: 'strapi_transfer_token_permissions_localizations_links_order_fk',
          columns: ['transfer_token_permission_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'strapi_transfer_token_permissions_localizations_links_fk',
          columns: ['transfer_token_permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_transfer_token_permissions',
          onDelete: 'CASCADE',
        },
        {
          name: 'strapi_transfer_token_permissions_localizations_links_inv_fk',
          columns: ['inv_transfer_token_permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_transfer_token_permissions',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        transfer_token_permission_id: 'transfer_token_permission_id',
        inv_transfer_token_permission_id: 'inv_transfer_token_permission_id',
        transfer_token_permission_order: 'transfer_token_permission_order',
      },
    },
  ],
  [
    'files_related_morphs',
    {
      singularName: 'files_related_morphs',
      uid: 'files_related_morphs',
      tableName: 'files_related_morphs',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        file_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'file_id',
        },
        related_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'related_id',
        },
        related_type: {
          type: 'string',
          columnName: 'related_type',
        },
        field: {
          type: 'string',
          columnName: 'field',
        },
        order: {
          type: 'float',
          column: {
            unsigned: true,
          },
          columnName: 'order',
        },
      },
      indexes: [
        {
          name: 'files_related_morphs_fk',
          columns: ['file_id'],
        },
        {
          name: 'files_related_morphs_order_index',
          columns: ['order'],
        },
        {
          name: 'files_related_morphs_id_column_index',
          columns: ['related_id'],
        },
      ],
      foreignKeys: [
        {
          name: 'files_related_morphs_fk',
          columns: ['file_id'],
          referencedColumns: ['id'],
          referencedTable: 'files',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        file_id: 'file_id',
        related_id: 'related_id',
        related_type: 'related_type',
        field: 'field',
        order: 'order',
      },
    },
  ],
  [
    'files_folder_links',
    {
      singularName: 'files_folder_links',
      uid: 'files_folder_links',
      tableName: 'files_folder_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        file_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'file_id',
        },
        folder_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'folder_id',
        },
        file_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'file_order',
        },
      },
      indexes: [
        {
          name: 'files_folder_links_fk',
          columns: ['file_id'],
        },
        {
          name: 'files_folder_links_inv_fk',
          columns: ['folder_id'],
        },
        {
          name: 'files_folder_links_unique',
          columns: ['file_id', 'folder_id'],
          type: 'unique',
        },
        {
          name: 'files_folder_links_order_inv_fk',
          columns: ['file_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'files_folder_links_fk',
          columns: ['file_id'],
          referencedColumns: ['id'],
          referencedTable: 'files',
          onDelete: 'CASCADE',
        },
        {
          name: 'files_folder_links_inv_fk',
          columns: ['folder_id'],
          referencedColumns: ['id'],
          referencedTable: 'upload_folders',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        file_id: 'file_id',
        folder_id: 'folder_id',
        file_order: 'file_order',
      },
    },
  ],
  [
    'files_localizations_links',
    {
      singularName: 'files_localizations_links',
      uid: 'files_localizations_links',
      tableName: 'files_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        file_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'file_id',
        },
        inv_file_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_file_id',
        },
        file_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'file_order',
        },
      },
      indexes: [
        {
          name: 'files_localizations_links_fk',
          columns: ['file_id'],
        },
        {
          name: 'files_localizations_links_inv_fk',
          columns: ['inv_file_id'],
        },
        {
          name: 'files_localizations_links_unique',
          columns: ['file_id', 'inv_file_id'],
          type: 'unique',
        },
        {
          name: 'files_localizations_links_order_fk',
          columns: ['file_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'files_localizations_links_fk',
          columns: ['file_id'],
          referencedColumns: ['id'],
          referencedTable: 'files',
          onDelete: 'CASCADE',
        },
        {
          name: 'files_localizations_links_inv_fk',
          columns: ['inv_file_id'],
          referencedColumns: ['id'],
          referencedTable: 'files',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        file_id: 'file_id',
        inv_file_id: 'inv_file_id',
        file_order: 'file_order',
      },
    },
  ],
  [
    'upload_folders_parent_links',
    {
      singularName: 'upload_folders_parent_links',
      uid: 'upload_folders_parent_links',
      tableName: 'upload_folders_parent_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        folder_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'folder_id',
        },
        inv_folder_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_folder_id',
        },
        folder_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'folder_order',
        },
      },
      indexes: [
        {
          name: 'upload_folders_parent_links_fk',
          columns: ['folder_id'],
        },
        {
          name: 'upload_folders_parent_links_inv_fk',
          columns: ['inv_folder_id'],
        },
        {
          name: 'upload_folders_parent_links_unique',
          columns: ['folder_id', 'inv_folder_id'],
          type: 'unique',
        },
        {
          name: 'upload_folders_parent_links_order_inv_fk',
          columns: ['folder_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'upload_folders_parent_links_fk',
          columns: ['folder_id'],
          referencedColumns: ['id'],
          referencedTable: 'upload_folders',
          onDelete: 'CASCADE',
        },
        {
          name: 'upload_folders_parent_links_inv_fk',
          columns: ['inv_folder_id'],
          referencedColumns: ['id'],
          referencedTable: 'upload_folders',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        folder_id: 'folder_id',
        inv_folder_id: 'inv_folder_id',
        folder_order: 'folder_order',
      },
    },
  ],
  [
    'upload_folders_localizations_links',
    {
      singularName: 'upload_folders_localizations_links',
      uid: 'upload_folders_localizations_links',
      tableName: 'upload_folders_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        folder_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'folder_id',
        },
        inv_folder_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_folder_id',
        },
        folder_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'folder_order',
        },
      },
      indexes: [
        {
          name: 'upload_folders_localizations_links_fk',
          columns: ['folder_id'],
        },
        {
          name: 'upload_folders_localizations_links_inv_fk',
          columns: ['inv_folder_id'],
        },
        {
          name: 'upload_folders_localizations_links_unique',
          columns: ['folder_id', 'inv_folder_id'],
          type: 'unique',
        },
        {
          name: 'upload_folders_localizations_links_order_fk',
          columns: ['folder_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'upload_folders_localizations_links_fk',
          columns: ['folder_id'],
          referencedColumns: ['id'],
          referencedTable: 'upload_folders',
          onDelete: 'CASCADE',
        },
        {
          name: 'upload_folders_localizations_links_inv_fk',
          columns: ['inv_folder_id'],
          referencedColumns: ['id'],
          referencedTable: 'upload_folders',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        folder_id: 'folder_id',
        inv_folder_id: 'inv_folder_id',
        folder_order: 'folder_order',
      },
    },
  ],
  [
    'strapi_releases_localizations_links',
    {
      singularName: 'strapi_releases_localizations_links',
      uid: 'strapi_releases_localizations_links',
      tableName: 'strapi_releases_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        release_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'release_id',
        },
        inv_release_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_release_id',
        },
        release_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'release_order',
        },
      },
      indexes: [
        {
          name: 'strapi_releases_localizations_links_fk',
          columns: ['release_id'],
        },
        {
          name: 'strapi_releases_localizations_links_inv_fk',
          columns: ['inv_release_id'],
        },
        {
          name: 'strapi_releases_localizations_links_unique',
          columns: ['release_id', 'inv_release_id'],
          type: 'unique',
        },
        {
          name: 'strapi_releases_localizations_links_order_fk',
          columns: ['release_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'strapi_releases_localizations_links_fk',
          columns: ['release_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_releases',
          onDelete: 'CASCADE',
        },
        {
          name: 'strapi_releases_localizations_links_inv_fk',
          columns: ['inv_release_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_releases',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        release_id: 'release_id',
        inv_release_id: 'inv_release_id',
        release_order: 'release_order',
      },
    },
  ],
  [
    'strapi_release_actions_release_links',
    {
      singularName: 'strapi_release_actions_release_links',
      uid: 'strapi_release_actions_release_links',
      tableName: 'strapi_release_actions_release_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        release_action_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'release_action_id',
        },
        release_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'release_id',
        },
        release_action_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'release_action_order',
        },
      },
      indexes: [
        {
          name: 'strapi_release_actions_release_links_fk',
          columns: ['release_action_id'],
        },
        {
          name: 'strapi_release_actions_release_links_inv_fk',
          columns: ['release_id'],
        },
        {
          name: 'strapi_release_actions_release_links_unique',
          columns: ['release_action_id', 'release_id'],
          type: 'unique',
        },
        {
          name: 'strapi_release_actions_release_links_order_inv_fk',
          columns: ['release_action_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'strapi_release_actions_release_links_fk',
          columns: ['release_action_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_release_actions',
          onDelete: 'CASCADE',
        },
        {
          name: 'strapi_release_actions_release_links_inv_fk',
          columns: ['release_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_releases',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        release_action_id: 'release_action_id',
        release_id: 'release_id',
        release_action_order: 'release_action_order',
      },
    },
  ],
  [
    'strapi_release_actions_localizations_links',
    {
      singularName: 'strapi_release_actions_localizations_links',
      uid: 'strapi_release_actions_localizations_links',
      tableName: 'strapi_release_actions_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        release_action_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'release_action_id',
        },
        inv_release_action_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_release_action_id',
        },
        release_action_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'release_action_order',
        },
      },
      indexes: [
        {
          name: 'strapi_release_actions_localizations_links_fk',
          columns: ['release_action_id'],
        },
        {
          name: 'strapi_release_actions_localizations_links_inv_fk',
          columns: ['inv_release_action_id'],
        },
        {
          name: 'strapi_release_actions_localizations_links_unique',
          columns: ['release_action_id', 'inv_release_action_id'],
          type: 'unique',
        },
        {
          name: 'strapi_release_actions_localizations_links_order_fk',
          columns: ['release_action_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'strapi_release_actions_localizations_links_fk',
          columns: ['release_action_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_release_actions',
          onDelete: 'CASCADE',
        },
        {
          name: 'strapi_release_actions_localizations_links_inv_fk',
          columns: ['inv_release_action_id'],
          referencedColumns: ['id'],
          referencedTable: 'strapi_release_actions',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        release_action_id: 'release_action_id',
        inv_release_action_id: 'inv_release_action_id',
        release_action_order: 'release_action_order',
      },
    },
  ],
  [
    'myplugin_test_localizations_links',
    {
      singularName: 'myplugin_test_localizations_links',
      uid: 'myplugin_test_localizations_links',
      tableName: 'myplugin_test_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        test_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'test_id',
        },
        inv_test_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_test_id',
        },
        test_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'test_order',
        },
      },
      indexes: [
        {
          name: 'myplugin_test_localizations_links_fk',
          columns: ['test_id'],
        },
        {
          name: 'myplugin_test_localizations_links_inv_fk',
          columns: ['inv_test_id'],
        },
        {
          name: 'myplugin_test_localizations_links_unique',
          columns: ['test_id', 'inv_test_id'],
          type: 'unique',
        },
        {
          name: 'myplugin_test_localizations_links_order_fk',
          columns: ['test_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'myplugin_test_localizations_links_fk',
          columns: ['test_id'],
          referencedColumns: ['id'],
          referencedTable: 'myplugin_test',
          onDelete: 'CASCADE',
        },
        {
          name: 'myplugin_test_localizations_links_inv_fk',
          columns: ['inv_test_id'],
          referencedColumns: ['id'],
          referencedTable: 'myplugin_test',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        test_id: 'test_id',
        inv_test_id: 'inv_test_id',
        test_order: 'test_order',
      },
    },
  ],
  [
    'i_18_n_locale_localizations_links',
    {
      singularName: 'i_18_n_locale_localizations_links',
      uid: 'i_18_n_locale_localizations_links',
      tableName: 'i_18_n_locale_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        locale_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'locale_id',
        },
        inv_locale_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_locale_id',
        },
        locale_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'locale_order',
        },
      },
      indexes: [
        {
          name: 'i_18_n_locale_localizations_links_fk',
          columns: ['locale_id'],
        },
        {
          name: 'i_18_n_locale_localizations_links_inv_fk',
          columns: ['inv_locale_id'],
        },
        {
          name: 'i_18_n_locale_localizations_links_unique',
          columns: ['locale_id', 'inv_locale_id'],
          type: 'unique',
        },
        {
          name: 'i_18_n_locale_localizations_links_order_fk',
          columns: ['locale_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'i_18_n_locale_localizations_links_fk',
          columns: ['locale_id'],
          referencedColumns: ['id'],
          referencedTable: 'i18n_locale',
          onDelete: 'CASCADE',
        },
        {
          name: 'i_18_n_locale_localizations_links_inv_fk',
          columns: ['inv_locale_id'],
          referencedColumns: ['id'],
          referencedTable: 'i18n_locale',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        locale_id: 'locale_id',
        inv_locale_id: 'inv_locale_id',
        locale_order: 'locale_order',
      },
    },
  ],
  [
    'up_permissions_role_links',
    {
      singularName: 'up_permissions_role_links',
      uid: 'up_permissions_role_links',
      tableName: 'up_permissions_role_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'permission_id',
        },
        role_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'role_id',
        },
        permission_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'permission_order',
        },
      },
      indexes: [
        {
          name: 'up_permissions_role_links_fk',
          columns: ['permission_id'],
        },
        {
          name: 'up_permissions_role_links_inv_fk',
          columns: ['role_id'],
        },
        {
          name: 'up_permissions_role_links_unique',
          columns: ['permission_id', 'role_id'],
          type: 'unique',
        },
        {
          name: 'up_permissions_role_links_order_inv_fk',
          columns: ['permission_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'up_permissions_role_links_fk',
          columns: ['permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_permissions',
          onDelete: 'CASCADE',
        },
        {
          name: 'up_permissions_role_links_inv_fk',
          columns: ['role_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_roles',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        permission_id: 'permission_id',
        role_id: 'role_id',
        permission_order: 'permission_order',
      },
    },
  ],
  [
    'up_permissions_localizations_links',
    {
      singularName: 'up_permissions_localizations_links',
      uid: 'up_permissions_localizations_links',
      tableName: 'up_permissions_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'permission_id',
        },
        inv_permission_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_permission_id',
        },
        permission_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'permission_order',
        },
      },
      indexes: [
        {
          name: 'up_permissions_localizations_links_fk',
          columns: ['permission_id'],
        },
        {
          name: 'up_permissions_localizations_links_inv_fk',
          columns: ['inv_permission_id'],
        },
        {
          name: 'up_permissions_localizations_links_unique',
          columns: ['permission_id', 'inv_permission_id'],
          type: 'unique',
        },
        {
          name: 'up_permissions_localizations_links_order_fk',
          columns: ['permission_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'up_permissions_localizations_links_fk',
          columns: ['permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_permissions',
          onDelete: 'CASCADE',
        },
        {
          name: 'up_permissions_localizations_links_inv_fk',
          columns: ['inv_permission_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_permissions',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        permission_id: 'permission_id',
        inv_permission_id: 'inv_permission_id',
        permission_order: 'permission_order',
      },
    },
  ],
  [
    'up_roles_localizations_links',
    {
      singularName: 'up_roles_localizations_links',
      uid: 'up_roles_localizations_links',
      tableName: 'up_roles_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        role_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'role_id',
        },
        inv_role_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_role_id',
        },
        role_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'role_order',
        },
      },
      indexes: [
        {
          name: 'up_roles_localizations_links_fk',
          columns: ['role_id'],
        },
        {
          name: 'up_roles_localizations_links_inv_fk',
          columns: ['inv_role_id'],
        },
        {
          name: 'up_roles_localizations_links_unique',
          columns: ['role_id', 'inv_role_id'],
          type: 'unique',
        },
        {
          name: 'up_roles_localizations_links_order_fk',
          columns: ['role_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'up_roles_localizations_links_fk',
          columns: ['role_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_roles',
          onDelete: 'CASCADE',
        },
        {
          name: 'up_roles_localizations_links_inv_fk',
          columns: ['inv_role_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_roles',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        role_id: 'role_id',
        inv_role_id: 'inv_role_id',
        role_order: 'role_order',
      },
    },
  ],
  [
    'up_users_role_links',
    {
      singularName: 'up_users_role_links',
      uid: 'up_users_role_links',
      tableName: 'up_users_role_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        user_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'user_id',
        },
        role_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'role_id',
        },
        user_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'user_order',
        },
      },
      indexes: [
        {
          name: 'up_users_role_links_fk',
          columns: ['user_id'],
        },
        {
          name: 'up_users_role_links_inv_fk',
          columns: ['role_id'],
        },
        {
          name: 'up_users_role_links_unique',
          columns: ['user_id', 'role_id'],
          type: 'unique',
        },
        {
          name: 'up_users_role_links_order_inv_fk',
          columns: ['user_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'up_users_role_links_fk',
          columns: ['user_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_users',
          onDelete: 'CASCADE',
        },
        {
          name: 'up_users_role_links_inv_fk',
          columns: ['role_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_roles',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        user_id: 'user_id',
        role_id: 'role_id',
        user_order: 'user_order',
      },
    },
  ],
  [
    'up_users_localizations_links',
    {
      singularName: 'up_users_localizations_links',
      uid: 'up_users_localizations_links',
      tableName: 'up_users_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        user_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'user_id',
        },
        inv_user_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_user_id',
        },
        user_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'user_order',
        },
      },
      indexes: [
        {
          name: 'up_users_localizations_links_fk',
          columns: ['user_id'],
        },
        {
          name: 'up_users_localizations_links_inv_fk',
          columns: ['inv_user_id'],
        },
        {
          name: 'up_users_localizations_links_unique',
          columns: ['user_id', 'inv_user_id'],
          type: 'unique',
        },
        {
          name: 'up_users_localizations_links_order_fk',
          columns: ['user_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'up_users_localizations_links_fk',
          columns: ['user_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_users',
          onDelete: 'CASCADE',
        },
        {
          name: 'up_users_localizations_links_inv_fk',
          columns: ['inv_user_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_users',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        user_id: 'user_id',
        inv_user_id: 'inv_user_id',
        user_order: 'user_order',
      },
    },
  ],
  [
    'addresses_categories_links',
    {
      singularName: 'addresses_categories_links',
      uid: 'addresses_categories_links',
      tableName: 'addresses_categories_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        address_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'address_id',
        },
        category_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'category_id',
        },
        category_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'category_order',
        },
        address_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'address_order',
        },
      },
      indexes: [
        {
          name: 'addresses_categories_links_fk',
          columns: ['address_id'],
        },
        {
          name: 'addresses_categories_links_inv_fk',
          columns: ['category_id'],
        },
        {
          name: 'addresses_categories_links_unique',
          columns: ['address_id', 'category_id'],
          type: 'unique',
        },
        {
          name: 'addresses_categories_links_order_fk',
          columns: ['category_order'],
        },
        {
          name: 'addresses_categories_links_order_inv_fk',
          columns: ['address_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'addresses_categories_links_fk',
          columns: ['address_id'],
          referencedColumns: ['id'],
          referencedTable: 'addresses',
          onDelete: 'CASCADE',
        },
        {
          name: 'addresses_categories_links_inv_fk',
          columns: ['category_id'],
          referencedColumns: ['id'],
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        address_id: 'address_id',
        category_id: 'category_id',
        category_order: 'category_order',
        address_order: 'address_order',
      },
    },
  ],
  [
    'addresses_localizations_links',
    {
      singularName: 'addresses_localizations_links',
      uid: 'addresses_localizations_links',
      tableName: 'addresses_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        address_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'address_id',
        },
        inv_address_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_address_id',
        },
        address_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'address_order',
        },
      },
      indexes: [
        {
          name: 'addresses_localizations_links_fk',
          columns: ['address_id'],
        },
        {
          name: 'addresses_localizations_links_inv_fk',
          columns: ['inv_address_id'],
        },
        {
          name: 'addresses_localizations_links_unique',
          columns: ['address_id', 'inv_address_id'],
          type: 'unique',
        },
        {
          name: 'addresses_localizations_links_order_fk',
          columns: ['address_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'addresses_localizations_links_fk',
          columns: ['address_id'],
          referencedColumns: ['id'],
          referencedTable: 'addresses',
          onDelete: 'CASCADE',
        },
        {
          name: 'addresses_localizations_links_inv_fk',
          columns: ['inv_address_id'],
          referencedColumns: ['id'],
          referencedTable: 'addresses',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        address_id: 'address_id',
        inv_address_id: 'inv_address_id',
        address_order: 'address_order',
      },
    },
  ],
  [
    'categories_localizations_links',
    {
      singularName: 'categories_localizations_links',
      uid: 'categories_localizations_links',
      tableName: 'categories_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        category_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'category_id',
        },
        inv_category_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_category_id',
        },
        category_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'category_order',
        },
      },
      indexes: [
        {
          name: 'categories_localizations_links_fk',
          columns: ['category_id'],
        },
        {
          name: 'categories_localizations_links_inv_fk',
          columns: ['inv_category_id'],
        },
        {
          name: 'categories_localizations_links_unique',
          columns: ['category_id', 'inv_category_id'],
          type: 'unique',
        },
        {
          name: 'categories_localizations_links_order_fk',
          columns: ['category_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'categories_localizations_links_fk',
          columns: ['category_id'],
          referencedColumns: ['id'],
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
        {
          name: 'categories_localizations_links_inv_fk',
          columns: ['inv_category_id'],
          referencedColumns: ['id'],
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        category_id: 'category_id',
        inv_category_id: 'inv_category_id',
        category_order: 'category_order',
      },
    },
  ],
  [
    'countries_localizations_links',
    {
      singularName: 'countries_localizations_links',
      uid: 'countries_localizations_links',
      tableName: 'countries_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        country_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'country_id',
        },
        inv_country_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_country_id',
        },
        country_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'country_order',
        },
      },
      indexes: [
        {
          name: 'countries_localizations_links_fk',
          columns: ['country_id'],
        },
        {
          name: 'countries_localizations_links_inv_fk',
          columns: ['inv_country_id'],
        },
        {
          name: 'countries_localizations_links_unique',
          columns: ['country_id', 'inv_country_id'],
          type: 'unique',
        },
        {
          name: 'countries_localizations_links_order_fk',
          columns: ['country_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'countries_localizations_links_fk',
          columns: ['country_id'],
          referencedColumns: ['id'],
          referencedTable: 'countries',
          onDelete: 'CASCADE',
        },
        {
          name: 'countries_localizations_links_inv_fk',
          columns: ['inv_country_id'],
          referencedColumns: ['id'],
          referencedTable: 'countries',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        country_id: 'country_id',
        inv_country_id: 'inv_country_id',
        country_order: 'country_order',
      },
    },
  ],
  [
    'homepages_localizations_links',
    {
      singularName: 'homepages_localizations_links',
      uid: 'homepages_localizations_links',
      tableName: 'homepages_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        homepage_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'homepage_id',
        },
        inv_homepage_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_homepage_id',
        },
        homepage_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'homepage_order',
        },
      },
      indexes: [
        {
          name: 'homepages_localizations_links_fk',
          columns: ['homepage_id'],
        },
        {
          name: 'homepages_localizations_links_inv_fk',
          columns: ['inv_homepage_id'],
        },
        {
          name: 'homepages_localizations_links_unique',
          columns: ['homepage_id', 'inv_homepage_id'],
          type: 'unique',
        },
        {
          name: 'homepages_localizations_links_order_fk',
          columns: ['homepage_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'homepages_localizations_links_fk',
          columns: ['homepage_id'],
          referencedColumns: ['id'],
          referencedTable: 'homepages',
          onDelete: 'CASCADE',
        },
        {
          name: 'homepages_localizations_links_inv_fk',
          columns: ['inv_homepage_id'],
          referencedColumns: ['id'],
          referencedTable: 'homepages',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        homepage_id: 'homepage_id',
        inv_homepage_id: 'inv_homepage_id',
        homepage_order: 'homepage_order',
      },
    },
  ],
  [
    'kitchensinks_one_way_tag_links',
    {
      singularName: 'kitchensinks_one_way_tag_links',
      uid: 'kitchensinks_one_way_tag_links',
      tableName: 'kitchensinks_one_way_tag_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        kitchensink_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'kitchensink_id',
        },
        tag_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'tag_id',
        },
      },
      indexes: [
        {
          name: 'kitchensinks_one_way_tag_links_fk',
          columns: ['kitchensink_id'],
        },
        {
          name: 'kitchensinks_one_way_tag_links_inv_fk',
          columns: ['tag_id'],
        },
        {
          name: 'kitchensinks_one_way_tag_links_unique',
          columns: ['kitchensink_id', 'tag_id'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'kitchensinks_one_way_tag_links_fk',
          columns: ['kitchensink_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
        {
          name: 'kitchensinks_one_way_tag_links_inv_fk',
          columns: ['tag_id'],
          referencedColumns: ['id'],
          referencedTable: 'tags',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        kitchensink_id: 'kitchensink_id',
        tag_id: 'tag_id',
      },
    },
  ],
  [
    'kitchensinks_one_to_one_tag_links',
    {
      singularName: 'kitchensinks_one_to_one_tag_links',
      uid: 'kitchensinks_one_to_one_tag_links',
      tableName: 'kitchensinks_one_to_one_tag_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        kitchensink_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'kitchensink_id',
        },
        tag_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'tag_id',
        },
      },
      indexes: [
        {
          name: 'kitchensinks_one_to_one_tag_links_fk',
          columns: ['kitchensink_id'],
        },
        {
          name: 'kitchensinks_one_to_one_tag_links_inv_fk',
          columns: ['tag_id'],
        },
        {
          name: 'kitchensinks_one_to_one_tag_links_unique',
          columns: ['kitchensink_id', 'tag_id'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'kitchensinks_one_to_one_tag_links_fk',
          columns: ['kitchensink_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
        {
          name: 'kitchensinks_one_to_one_tag_links_inv_fk',
          columns: ['tag_id'],
          referencedColumns: ['id'],
          referencedTable: 'tags',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        kitchensink_id: 'kitchensink_id',
        tag_id: 'tag_id',
      },
    },
  ],
  [
    'kitchensinks_many_to_one_tag_links',
    {
      singularName: 'kitchensinks_many_to_one_tag_links',
      uid: 'kitchensinks_many_to_one_tag_links',
      tableName: 'kitchensinks_many_to_one_tag_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        kitchensink_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'kitchensink_id',
        },
        tag_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'tag_id',
        },
        kitchensink_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'kitchensink_order',
        },
      },
      indexes: [
        {
          name: 'kitchensinks_many_to_one_tag_links_fk',
          columns: ['kitchensink_id'],
        },
        {
          name: 'kitchensinks_many_to_one_tag_links_inv_fk',
          columns: ['tag_id'],
        },
        {
          name: 'kitchensinks_many_to_one_tag_links_unique',
          columns: ['kitchensink_id', 'tag_id'],
          type: 'unique',
        },
        {
          name: 'kitchensinks_many_to_one_tag_links_order_inv_fk',
          columns: ['kitchensink_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'kitchensinks_many_to_one_tag_links_fk',
          columns: ['kitchensink_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
        {
          name: 'kitchensinks_many_to_one_tag_links_inv_fk',
          columns: ['tag_id'],
          referencedColumns: ['id'],
          referencedTable: 'tags',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        kitchensink_id: 'kitchensink_id',
        tag_id: 'tag_id',
        kitchensink_order: 'kitchensink_order',
      },
    },
  ],
  [
    'kitchensinks_many_to_many_tags_links',
    {
      singularName: 'kitchensinks_many_to_many_tags_links',
      uid: 'kitchensinks_many_to_many_tags_links',
      tableName: 'kitchensinks_many_to_many_tags_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        kitchensink_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'kitchensink_id',
        },
        tag_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'tag_id',
        },
        tag_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'tag_order',
        },
        kitchensink_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'kitchensink_order',
        },
      },
      indexes: [
        {
          name: 'kitchensinks_many_to_many_tags_links_fk',
          columns: ['kitchensink_id'],
        },
        {
          name: 'kitchensinks_many_to_many_tags_links_inv_fk',
          columns: ['tag_id'],
        },
        {
          name: 'kitchensinks_many_to_many_tags_links_unique',
          columns: ['kitchensink_id', 'tag_id'],
          type: 'unique',
        },
        {
          name: 'kitchensinks_many_to_many_tags_links_order_fk',
          columns: ['tag_order'],
        },
        {
          name: 'kitchensinks_many_to_many_tags_links_order_inv_fk',
          columns: ['kitchensink_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'kitchensinks_many_to_many_tags_links_fk',
          columns: ['kitchensink_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
        {
          name: 'kitchensinks_many_to_many_tags_links_inv_fk',
          columns: ['tag_id'],
          referencedColumns: ['id'],
          referencedTable: 'tags',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        kitchensink_id: 'kitchensink_id',
        tag_id: 'tag_id',
        tag_order: 'tag_order',
        kitchensink_order: 'kitchensink_order',
      },
    },
  ],
  [
    'kitchensinks_many_way_tags_links',
    {
      singularName: 'kitchensinks_many_way_tags_links',
      uid: 'kitchensinks_many_way_tags_links',
      tableName: 'kitchensinks_many_way_tags_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        kitchensink_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'kitchensink_id',
        },
        tag_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'tag_id',
        },
        tag_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'tag_order',
        },
      },
      indexes: [
        {
          name: 'kitchensinks_many_way_tags_links_fk',
          columns: ['kitchensink_id'],
        },
        {
          name: 'kitchensinks_many_way_tags_links_inv_fk',
          columns: ['tag_id'],
        },
        {
          name: 'kitchensinks_many_way_tags_links_unique',
          columns: ['kitchensink_id', 'tag_id'],
          type: 'unique',
        },
        {
          name: 'kitchensinks_many_way_tags_links_order_fk',
          columns: ['tag_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'kitchensinks_many_way_tags_links_fk',
          columns: ['kitchensink_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
        {
          name: 'kitchensinks_many_way_tags_links_inv_fk',
          columns: ['tag_id'],
          referencedColumns: ['id'],
          referencedTable: 'tags',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        kitchensink_id: 'kitchensink_id',
        tag_id: 'tag_id',
        tag_order: 'tag_order',
      },
    },
  ],
  [
    'kitchensinks_morph_to_many_morphs',
    {
      singularName: 'kitchensinks_morph_to_many_morphs',
      uid: 'kitchensinks_morph_to_many_morphs',
      tableName: 'kitchensinks_morph_to_many_morphs',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        kitchensink_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'kitchensink_id',
        },
        morph_to_many_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'morph_to_many_id',
        },
        morph_to_many_type: {
          type: 'string',
          columnName: 'morph_to_many_type',
        },
        field: {
          type: 'string',
          columnName: 'field',
        },
        order: {
          type: 'float',
          column: {
            unsigned: true,
          },
          columnName: 'order',
        },
      },
      indexes: [
        {
          name: 'kitchensinks_morph_to_many_morphs_fk',
          columns: ['kitchensink_id'],
        },
        {
          name: 'kitchensinks_morph_to_many_morphs_order_index',
          columns: ['order'],
        },
        {
          name: 'kitchensinks_morph_to_many_morphs_id_column_index',
          columns: ['morph_to_many_id'],
        },
      ],
      foreignKeys: [
        {
          name: 'kitchensinks_morph_to_many_morphs_fk',
          columns: ['kitchensink_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        kitchensink_id: 'kitchensink_id',
        morph_to_many_id: 'morph_to_many_id',
        morph_to_many_type: 'morph_to_many_type',
        field: 'field',
        order: 'order',
      },
    },
  ],
  [
    'kitchensinks_localizations_links',
    {
      singularName: 'kitchensinks_localizations_links',
      uid: 'kitchensinks_localizations_links',
      tableName: 'kitchensinks_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        kitchensink_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'kitchensink_id',
        },
        inv_kitchensink_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_kitchensink_id',
        },
        kitchensink_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'kitchensink_order',
        },
      },
      indexes: [
        {
          name: 'kitchensinks_localizations_links_fk',
          columns: ['kitchensink_id'],
        },
        {
          name: 'kitchensinks_localizations_links_inv_fk',
          columns: ['inv_kitchensink_id'],
        },
        {
          name: 'kitchensinks_localizations_links_unique',
          columns: ['kitchensink_id', 'inv_kitchensink_id'],
          type: 'unique',
        },
        {
          name: 'kitchensinks_localizations_links_order_fk',
          columns: ['kitchensink_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'kitchensinks_localizations_links_fk',
          columns: ['kitchensink_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
        {
          name: 'kitchensinks_localizations_links_inv_fk',
          columns: ['inv_kitchensink_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        kitchensink_id: 'kitchensink_id',
        inv_kitchensink_id: 'inv_kitchensink_id',
        kitchensink_order: 'kitchensink_order',
      },
    },
  ],
  [
    'likes_author_links',
    {
      singularName: 'likes_author_links',
      uid: 'likes_author_links',
      tableName: 'likes_author_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        like_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'like_id',
        },
        user_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'user_id',
        },
      },
      indexes: [
        {
          name: 'likes_author_links_fk',
          columns: ['like_id'],
        },
        {
          name: 'likes_author_links_inv_fk',
          columns: ['user_id'],
        },
        {
          name: 'likes_author_links_unique',
          columns: ['like_id', 'user_id'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'likes_author_links_fk',
          columns: ['like_id'],
          referencedColumns: ['id'],
          referencedTable: 'likes',
          onDelete: 'CASCADE',
        },
        {
          name: 'likes_author_links_inv_fk',
          columns: ['user_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_users',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        like_id: 'like_id',
        user_id: 'user_id',
      },
    },
  ],
  [
    'likes_review_links',
    {
      singularName: 'likes_review_links',
      uid: 'likes_review_links',
      tableName: 'likes_review_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        like_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'like_id',
        },
        review_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'review_id',
        },
        like_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'like_order',
        },
      },
      indexes: [
        {
          name: 'likes_review_links_fk',
          columns: ['like_id'],
        },
        {
          name: 'likes_review_links_inv_fk',
          columns: ['review_id'],
        },
        {
          name: 'likes_review_links_unique',
          columns: ['like_id', 'review_id'],
          type: 'unique',
        },
        {
          name: 'likes_review_links_order_inv_fk',
          columns: ['like_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'likes_review_links_fk',
          columns: ['like_id'],
          referencedColumns: ['id'],
          referencedTable: 'likes',
          onDelete: 'CASCADE',
        },
        {
          name: 'likes_review_links_inv_fk',
          columns: ['review_id'],
          referencedColumns: ['id'],
          referencedTable: 'reviews',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        like_id: 'like_id',
        review_id: 'review_id',
        like_order: 'like_order',
      },
    },
  ],
  [
    'likes_localizations_links',
    {
      singularName: 'likes_localizations_links',
      uid: 'likes_localizations_links',
      tableName: 'likes_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        like_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'like_id',
        },
        inv_like_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_like_id',
        },
        like_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'like_order',
        },
      },
      indexes: [
        {
          name: 'likes_localizations_links_fk',
          columns: ['like_id'],
        },
        {
          name: 'likes_localizations_links_inv_fk',
          columns: ['inv_like_id'],
        },
        {
          name: 'likes_localizations_links_unique',
          columns: ['like_id', 'inv_like_id'],
          type: 'unique',
        },
        {
          name: 'likes_localizations_links_order_fk',
          columns: ['like_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'likes_localizations_links_fk',
          columns: ['like_id'],
          referencedColumns: ['id'],
          referencedTable: 'likes',
          onDelete: 'CASCADE',
        },
        {
          name: 'likes_localizations_links_inv_fk',
          columns: ['inv_like_id'],
          referencedColumns: ['id'],
          referencedTable: 'likes',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        like_id: 'like_id',
        inv_like_id: 'inv_like_id',
        like_order: 'like_order',
      },
    },
  ],
  [
    'menus_localizations_links',
    {
      singularName: 'menus_localizations_links',
      uid: 'menus_localizations_links',
      tableName: 'menus_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        menu_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'menu_id',
        },
        inv_menu_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_menu_id',
        },
        menu_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'menu_order',
        },
      },
      indexes: [
        {
          name: 'menus_localizations_links_fk',
          columns: ['menu_id'],
        },
        {
          name: 'menus_localizations_links_inv_fk',
          columns: ['inv_menu_id'],
        },
        {
          name: 'menus_localizations_links_unique',
          columns: ['menu_id', 'inv_menu_id'],
          type: 'unique',
        },
        {
          name: 'menus_localizations_links_order_fk',
          columns: ['menu_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'menus_localizations_links_fk',
          columns: ['menu_id'],
          referencedColumns: ['id'],
          referencedTable: 'menus',
          onDelete: 'CASCADE',
        },
        {
          name: 'menus_localizations_links_inv_fk',
          columns: ['inv_menu_id'],
          referencedColumns: ['id'],
          referencedTable: 'menus',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        menu_id: 'menu_id',
        inv_menu_id: 'inv_menu_id',
        menu_order: 'menu_order',
      },
    },
  ],
  [
    'menusections_menu_links',
    {
      singularName: 'menusections_menu_links',
      uid: 'menusections_menu_links',
      tableName: 'menusections_menu_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        menusection_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'menusection_id',
        },
        menu_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'menu_id',
        },
        menusection_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'menusection_order',
        },
      },
      indexes: [
        {
          name: 'menusections_menu_links_fk',
          columns: ['menusection_id'],
        },
        {
          name: 'menusections_menu_links_inv_fk',
          columns: ['menu_id'],
        },
        {
          name: 'menusections_menu_links_unique',
          columns: ['menusection_id', 'menu_id'],
          type: 'unique',
        },
        {
          name: 'menusections_menu_links_order_inv_fk',
          columns: ['menusection_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'menusections_menu_links_fk',
          columns: ['menusection_id'],
          referencedColumns: ['id'],
          referencedTable: 'menusections',
          onDelete: 'CASCADE',
        },
        {
          name: 'menusections_menu_links_inv_fk',
          columns: ['menu_id'],
          referencedColumns: ['id'],
          referencedTable: 'menus',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        menusection_id: 'menusection_id',
        menu_id: 'menu_id',
        menusection_order: 'menusection_order',
      },
    },
  ],
  [
    'menusections_localizations_links',
    {
      singularName: 'menusections_localizations_links',
      uid: 'menusections_localizations_links',
      tableName: 'menusections_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        menusection_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'menusection_id',
        },
        inv_menusection_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_menusection_id',
        },
        menusection_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'menusection_order',
        },
      },
      indexes: [
        {
          name: 'menusections_localizations_links_fk',
          columns: ['menusection_id'],
        },
        {
          name: 'menusections_localizations_links_inv_fk',
          columns: ['inv_menusection_id'],
        },
        {
          name: 'menusections_localizations_links_unique',
          columns: ['menusection_id', 'inv_menusection_id'],
          type: 'unique',
        },
        {
          name: 'menusections_localizations_links_order_fk',
          columns: ['menusection_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'menusections_localizations_links_fk',
          columns: ['menusection_id'],
          referencedColumns: ['id'],
          referencedTable: 'menusections',
          onDelete: 'CASCADE',
        },
        {
          name: 'menusections_localizations_links_inv_fk',
          columns: ['inv_menusection_id'],
          referencedColumns: ['id'],
          referencedTable: 'menusections',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        menusection_id: 'menusection_id',
        inv_menusection_id: 'inv_menusection_id',
        menusection_order: 'menusection_order',
      },
    },
  ],
  [
    'relation_locales_categories_links',
    {
      singularName: 'relation_locales_categories_links',
      uid: 'relation_locales_categories_links',
      tableName: 'relation_locales_categories_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        relation_locale_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'relation_locale_id',
        },
        category_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'category_id',
        },
        category_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'category_order',
        },
        relation_locale_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'relation_locale_order',
        },
      },
      indexes: [
        {
          name: 'relation_locales_categories_links_fk',
          columns: ['relation_locale_id'],
        },
        {
          name: 'relation_locales_categories_links_inv_fk',
          columns: ['category_id'],
        },
        {
          name: 'relation_locales_categories_links_unique',
          columns: ['relation_locale_id', 'category_id'],
          type: 'unique',
        },
        {
          name: 'relation_locales_categories_links_order_fk',
          columns: ['category_order'],
        },
        {
          name: 'relation_locales_categories_links_order_inv_fk',
          columns: ['relation_locale_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'relation_locales_categories_links_fk',
          columns: ['relation_locale_id'],
          referencedColumns: ['id'],
          referencedTable: 'relation_locales',
          onDelete: 'CASCADE',
        },
        {
          name: 'relation_locales_categories_links_inv_fk',
          columns: ['category_id'],
          referencedColumns: ['id'],
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        relation_locale_id: 'relation_locale_id',
        category_id: 'category_id',
        category_order: 'category_order',
        relation_locale_order: 'relation_locale_order',
      },
    },
  ],
  [
    'relation_locales_localizations_links',
    {
      singularName: 'relation_locales_localizations_links',
      uid: 'relation_locales_localizations_links',
      tableName: 'relation_locales_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        relation_locale_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'relation_locale_id',
        },
        inv_relation_locale_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_relation_locale_id',
        },
        relation_locale_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'relation_locale_order',
        },
      },
      indexes: [
        {
          name: 'relation_locales_localizations_links_fk',
          columns: ['relation_locale_id'],
        },
        {
          name: 'relation_locales_localizations_links_inv_fk',
          columns: ['inv_relation_locale_id'],
        },
        {
          name: 'relation_locales_localizations_links_unique',
          columns: ['relation_locale_id', 'inv_relation_locale_id'],
          type: 'unique',
        },
        {
          name: 'relation_locales_localizations_links_order_fk',
          columns: ['relation_locale_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'relation_locales_localizations_links_fk',
          columns: ['relation_locale_id'],
          referencedColumns: ['id'],
          referencedTable: 'relation_locales',
          onDelete: 'CASCADE',
        },
        {
          name: 'relation_locales_localizations_links_inv_fk',
          columns: ['inv_relation_locale_id'],
          referencedColumns: ['id'],
          referencedTable: 'relation_locales',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        relation_locale_id: 'relation_locale_id',
        inv_relation_locale_id: 'inv_relation_locale_id',
        relation_locale_order: 'relation_locale_order',
      },
    },
  ],
  [
    'restaurants_address_links',
    {
      singularName: 'restaurants_address_links',
      uid: 'restaurants_address_links',
      tableName: 'restaurants_address_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        restaurant_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'restaurant_id',
        },
        address_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'address_id',
        },
      },
      indexes: [
        {
          name: 'restaurants_address_links_fk',
          columns: ['restaurant_id'],
        },
        {
          name: 'restaurants_address_links_inv_fk',
          columns: ['address_id'],
        },
        {
          name: 'restaurants_address_links_unique',
          columns: ['restaurant_id', 'address_id'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'restaurants_address_links_fk',
          columns: ['restaurant_id'],
          referencedColumns: ['id'],
          referencedTable: 'restaurants',
          onDelete: 'CASCADE',
        },
        {
          name: 'restaurants_address_links_inv_fk',
          columns: ['address_id'],
          referencedColumns: ['id'],
          referencedTable: 'addresses',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        restaurant_id: 'restaurant_id',
        address_id: 'address_id',
      },
    },
  ],
  [
    'restaurants_categories_links',
    {
      singularName: 'restaurants_categories_links',
      uid: 'restaurants_categories_links',
      tableName: 'restaurants_categories_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        restaurant_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'restaurant_id',
        },
        category_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'category_id',
        },
        category_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'category_order',
        },
      },
      indexes: [
        {
          name: 'restaurants_categories_links_fk',
          columns: ['restaurant_id'],
        },
        {
          name: 'restaurants_categories_links_inv_fk',
          columns: ['category_id'],
        },
        {
          name: 'restaurants_categories_links_unique',
          columns: ['restaurant_id', 'category_id'],
          type: 'unique',
        },
        {
          name: 'restaurants_categories_links_order_fk',
          columns: ['category_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'restaurants_categories_links_fk',
          columns: ['restaurant_id'],
          referencedColumns: ['id'],
          referencedTable: 'restaurants',
          onDelete: 'CASCADE',
        },
        {
          name: 'restaurants_categories_links_inv_fk',
          columns: ['category_id'],
          referencedColumns: ['id'],
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        restaurant_id: 'restaurant_id',
        category_id: 'category_id',
        category_order: 'category_order',
      },
    },
  ],
  [
    'restaurants_menu_links',
    {
      singularName: 'restaurants_menu_links',
      uid: 'restaurants_menu_links',
      tableName: 'restaurants_menu_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        restaurant_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'restaurant_id',
        },
        menu_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'menu_id',
        },
      },
      indexes: [
        {
          name: 'restaurants_menu_links_fk',
          columns: ['restaurant_id'],
        },
        {
          name: 'restaurants_menu_links_inv_fk',
          columns: ['menu_id'],
        },
        {
          name: 'restaurants_menu_links_unique',
          columns: ['restaurant_id', 'menu_id'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'restaurants_menu_links_fk',
          columns: ['restaurant_id'],
          referencedColumns: ['id'],
          referencedTable: 'restaurants',
          onDelete: 'CASCADE',
        },
        {
          name: 'restaurants_menu_links_inv_fk',
          columns: ['menu_id'],
          referencedColumns: ['id'],
          referencedTable: 'menus',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        restaurant_id: 'restaurant_id',
        menu_id: 'menu_id',
      },
    },
  ],
  [
    'restaurants_localizations_links',
    {
      singularName: 'restaurants_localizations_links',
      uid: 'restaurants_localizations_links',
      tableName: 'restaurants_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        restaurant_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'restaurant_id',
        },
        inv_restaurant_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_restaurant_id',
        },
        restaurant_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'restaurant_order',
        },
      },
      indexes: [
        {
          name: 'restaurants_localizations_links_fk',
          columns: ['restaurant_id'],
        },
        {
          name: 'restaurants_localizations_links_inv_fk',
          columns: ['inv_restaurant_id'],
        },
        {
          name: 'restaurants_localizations_links_unique',
          columns: ['restaurant_id', 'inv_restaurant_id'],
          type: 'unique',
        },
        {
          name: 'restaurants_localizations_links_order_fk',
          columns: ['restaurant_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'restaurants_localizations_links_fk',
          columns: ['restaurant_id'],
          referencedColumns: ['id'],
          referencedTable: 'restaurants',
          onDelete: 'CASCADE',
        },
        {
          name: 'restaurants_localizations_links_inv_fk',
          columns: ['inv_restaurant_id'],
          referencedColumns: ['id'],
          referencedTable: 'restaurants',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        restaurant_id: 'restaurant_id',
        inv_restaurant_id: 'inv_restaurant_id',
        restaurant_order: 'restaurant_order',
      },
    },
  ],
  [
    'reviews_author_links',
    {
      singularName: 'reviews_author_links',
      uid: 'reviews_author_links',
      tableName: 'reviews_author_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        review_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'review_id',
        },
        user_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'user_id',
        },
      },
      indexes: [
        {
          name: 'reviews_author_links_fk',
          columns: ['review_id'],
        },
        {
          name: 'reviews_author_links_inv_fk',
          columns: ['user_id'],
        },
        {
          name: 'reviews_author_links_unique',
          columns: ['review_id', 'user_id'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'reviews_author_links_fk',
          columns: ['review_id'],
          referencedColumns: ['id'],
          referencedTable: 'reviews',
          onDelete: 'CASCADE',
        },
        {
          name: 'reviews_author_links_inv_fk',
          columns: ['user_id'],
          referencedColumns: ['id'],
          referencedTable: 'up_users',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        review_id: 'review_id',
        user_id: 'user_id',
      },
    },
  ],
  [
    'reviews_restaurant_links',
    {
      singularName: 'reviews_restaurant_links',
      uid: 'reviews_restaurant_links',
      tableName: 'reviews_restaurant_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        review_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'review_id',
        },
        restaurant_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'restaurant_id',
        },
      },
      indexes: [
        {
          name: 'reviews_restaurant_links_fk',
          columns: ['review_id'],
        },
        {
          name: 'reviews_restaurant_links_inv_fk',
          columns: ['restaurant_id'],
        },
        {
          name: 'reviews_restaurant_links_unique',
          columns: ['review_id', 'restaurant_id'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'reviews_restaurant_links_fk',
          columns: ['review_id'],
          referencedColumns: ['id'],
          referencedTable: 'reviews',
          onDelete: 'CASCADE',
        },
        {
          name: 'reviews_restaurant_links_inv_fk',
          columns: ['restaurant_id'],
          referencedColumns: ['id'],
          referencedTable: 'restaurants',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        review_id: 'review_id',
        restaurant_id: 'restaurant_id',
      },
    },
  ],
  [
    'reviews_localizations_links',
    {
      singularName: 'reviews_localizations_links',
      uid: 'reviews_localizations_links',
      tableName: 'reviews_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        review_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'review_id',
        },
        inv_review_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_review_id',
        },
        review_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'review_order',
        },
      },
      indexes: [
        {
          name: 'reviews_localizations_links_fk',
          columns: ['review_id'],
        },
        {
          name: 'reviews_localizations_links_inv_fk',
          columns: ['inv_review_id'],
        },
        {
          name: 'reviews_localizations_links_unique',
          columns: ['review_id', 'inv_review_id'],
          type: 'unique',
        },
        {
          name: 'reviews_localizations_links_order_fk',
          columns: ['review_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'reviews_localizations_links_fk',
          columns: ['review_id'],
          referencedColumns: ['id'],
          referencedTable: 'reviews',
          onDelete: 'CASCADE',
        },
        {
          name: 'reviews_localizations_links_inv_fk',
          columns: ['inv_review_id'],
          referencedColumns: ['id'],
          referencedTable: 'reviews',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        review_id: 'review_id',
        inv_review_id: 'inv_review_id',
        review_order: 'review_order',
      },
    },
  ],
  [
    'tags_many_to_one_kitchensink_links',
    {
      singularName: 'tags_many_to_one_kitchensink_links',
      uid: 'tags_many_to_one_kitchensink_links',
      tableName: 'tags_many_to_one_kitchensink_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        tag_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'tag_id',
        },
        kitchensink_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'kitchensink_id',
        },
        tag_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'tag_order',
        },
      },
      indexes: [
        {
          name: 'tags_many_to_one_kitchensink_links_fk',
          columns: ['tag_id'],
        },
        {
          name: 'tags_many_to_one_kitchensink_links_inv_fk',
          columns: ['kitchensink_id'],
        },
        {
          name: 'tags_many_to_one_kitchensink_links_unique',
          columns: ['tag_id', 'kitchensink_id'],
          type: 'unique',
        },
        {
          name: 'tags_many_to_one_kitchensink_links_order_inv_fk',
          columns: ['tag_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'tags_many_to_one_kitchensink_links_fk',
          columns: ['tag_id'],
          referencedColumns: ['id'],
          referencedTable: 'tags',
          onDelete: 'CASCADE',
        },
        {
          name: 'tags_many_to_one_kitchensink_links_inv_fk',
          columns: ['kitchensink_id'],
          referencedColumns: ['id'],
          referencedTable: 'kitchensinks',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        tag_id: 'tag_id',
        kitchensink_id: 'kitchensink_id',
        tag_order: 'tag_order',
      },
    },
  ],
  [
    'tags_localizations_links',
    {
      singularName: 'tags_localizations_links',
      uid: 'tags_localizations_links',
      tableName: 'tags_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        tag_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'tag_id',
        },
        inv_tag_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_tag_id',
        },
        tag_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'tag_order',
        },
      },
      indexes: [
        {
          name: 'tags_localizations_links_fk',
          columns: ['tag_id'],
        },
        {
          name: 'tags_localizations_links_inv_fk',
          columns: ['inv_tag_id'],
        },
        {
          name: 'tags_localizations_links_unique',
          columns: ['tag_id', 'inv_tag_id'],
          type: 'unique',
        },
        {
          name: 'tags_localizations_links_order_fk',
          columns: ['tag_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'tags_localizations_links_fk',
          columns: ['tag_id'],
          referencedColumns: ['id'],
          referencedTable: 'tags',
          onDelete: 'CASCADE',
        },
        {
          name: 'tags_localizations_links_inv_fk',
          columns: ['inv_tag_id'],
          referencedColumns: ['id'],
          referencedTable: 'tags',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        tag_id: 'tag_id',
        inv_tag_id: 'inv_tag_id',
        tag_order: 'tag_order',
      },
    },
  ],
  [
    'temps_category_links',
    {
      singularName: 'temps_category_links',
      uid: 'temps_category_links',
      tableName: 'temps_category_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        temp_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'temp_id',
        },
        category_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'category_id',
        },
      },
      indexes: [
        {
          name: 'temps_category_links_fk',
          columns: ['temp_id'],
        },
        {
          name: 'temps_category_links_inv_fk',
          columns: ['category_id'],
        },
        {
          name: 'temps_category_links_unique',
          columns: ['temp_id', 'category_id'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'temps_category_links_fk',
          columns: ['temp_id'],
          referencedColumns: ['id'],
          referencedTable: 'temps',
          onDelete: 'CASCADE',
        },
        {
          name: 'temps_category_links_inv_fk',
          columns: ['category_id'],
          referencedColumns: ['id'],
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        temp_id: 'temp_id',
        category_id: 'category_id',
      },
    },
  ],
  [
    'temps_categories_links',
    {
      singularName: 'temps_categories_links',
      uid: 'temps_categories_links',
      tableName: 'temps_categories_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        temp_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'temp_id',
        },
        category_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'category_id',
        },
        category_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'category_order',
        },
        temp_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'temp_order',
        },
      },
      indexes: [
        {
          name: 'temps_categories_links_fk',
          columns: ['temp_id'],
        },
        {
          name: 'temps_categories_links_inv_fk',
          columns: ['category_id'],
        },
        {
          name: 'temps_categories_links_unique',
          columns: ['temp_id', 'category_id'],
          type: 'unique',
        },
        {
          name: 'temps_categories_links_order_fk',
          columns: ['category_order'],
        },
        {
          name: 'temps_categories_links_order_inv_fk',
          columns: ['temp_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'temps_categories_links_fk',
          columns: ['temp_id'],
          referencedColumns: ['id'],
          referencedTable: 'temps',
          onDelete: 'CASCADE',
        },
        {
          name: 'temps_categories_links_inv_fk',
          columns: ['category_id'],
          referencedColumns: ['id'],
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        temp_id: 'temp_id',
        category_id: 'category_id',
        category_order: 'category_order',
        temp_order: 'temp_order',
      },
    },
  ],
  [
    'temps_self_many_to_many_links',
    {
      singularName: 'temps_self_many_to_many_links',
      uid: 'temps_self_many_to_many_links',
      tableName: 'temps_self_many_to_many_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        temp_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'temp_id',
        },
        inv_temp_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_temp_id',
        },
        temp_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'temp_order',
        },
        inv_temp_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'inv_temp_order',
        },
      },
      indexes: [
        {
          name: 'temps_self_many_to_many_links_fk',
          columns: ['temp_id'],
        },
        {
          name: 'temps_self_many_to_many_links_inv_fk',
          columns: ['inv_temp_id'],
        },
        {
          name: 'temps_self_many_to_many_links_unique',
          columns: ['temp_id', 'inv_temp_id'],
          type: 'unique',
        },
        {
          name: 'temps_self_many_to_many_links_order_fk',
          columns: ['temp_order'],
        },
        {
          name: 'temps_self_many_to_many_links_order_inv_fk',
          columns: ['inv_temp_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'temps_self_many_to_many_links_fk',
          columns: ['temp_id'],
          referencedColumns: ['id'],
          referencedTable: 'temps',
          onDelete: 'CASCADE',
        },
        {
          name: 'temps_self_many_to_many_links_inv_fk',
          columns: ['inv_temp_id'],
          referencedColumns: ['id'],
          referencedTable: 'temps',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        temp_id: 'temp_id',
        inv_temp_id: 'inv_temp_id',
        temp_order: 'temp_order',
        inv_temp_order: 'inv_temp_order',
      },
    },
  ],
  [
    'temps_localizations_links',
    {
      singularName: 'temps_localizations_links',
      uid: 'temps_localizations_links',
      tableName: 'temps_localizations_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        temp_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'temp_id',
        },
        inv_temp_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'inv_temp_id',
        },
        temp_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'temp_order',
        },
      },
      indexes: [
        {
          name: 'temps_localizations_links_fk',
          columns: ['temp_id'],
        },
        {
          name: 'temps_localizations_links_inv_fk',
          columns: ['inv_temp_id'],
        },
        {
          name: 'temps_localizations_links_unique',
          columns: ['temp_id', 'inv_temp_id'],
          type: 'unique',
        },
        {
          name: 'temps_localizations_links_order_fk',
          columns: ['temp_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'temps_localizations_links_fk',
          columns: ['temp_id'],
          referencedColumns: ['id'],
          referencedTable: 'temps',
          onDelete: 'CASCADE',
        },
        {
          name: 'temps_localizations_links_inv_fk',
          columns: ['inv_temp_id'],
          referencedColumns: ['id'],
          referencedTable: 'temps',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        temp_id: 'temp_id',
        inv_temp_id: 'inv_temp_id',
        temp_order: 'temp_order',
      },
    },
  ],
  [
    'components_dishes_categories_links',
    {
      singularName: 'components_dishes_categories_links',
      uid: 'components_dishes_categories_links',
      tableName: 'components_dishes_categories_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        dish_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'dish_id',
        },
        category_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'category_id',
        },
      },
      indexes: [
        {
          name: 'components_dishes_categories_links_fk',
          columns: ['dish_id'],
        },
        {
          name: 'components_dishes_categories_links_inv_fk',
          columns: ['category_id'],
        },
        {
          name: 'components_dishes_categories_links_unique',
          columns: ['dish_id', 'category_id'],
          type: 'unique',
        },
      ],
      foreignKeys: [
        {
          name: 'components_dishes_categories_links_fk',
          columns: ['dish_id'],
          referencedColumns: ['id'],
          referencedTable: 'components_dishes',
          onDelete: 'CASCADE',
        },
        {
          name: 'components_dishes_categories_links_inv_fk',
          columns: ['category_id'],
          referencedColumns: ['id'],
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        dish_id: 'dish_id',
        category_id: 'category_id',
      },
    },
  ],
  [
    'components_basic_relations_categories_links',
    {
      singularName: 'components_basic_relations_categories_links',
      uid: 'components_basic_relations_categories_links',
      tableName: 'components_basic_relations_categories_links',
      attributes: {
        id: {
          type: 'increments',
          columnName: 'id',
        },
        relation_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'relation_id',
        },
        category_id: {
          type: 'integer',
          column: {
            unsigned: true,
          },
          columnName: 'category_id',
        },
        category_order: {
          type: 'float',
          column: {
            unsigned: true,
            defaultTo: null,
          },
          columnName: 'category_order',
        },
      },
      indexes: [
        {
          name: 'components_basic_relations_categories_links_fk',
          columns: ['relation_id'],
        },
        {
          name: 'components_basic_relations_categories_links_inv_fk',
          columns: ['category_id'],
        },
        {
          name: 'components_basic_relations_categories_links_unique',
          columns: ['relation_id', 'category_id'],
          type: 'unique',
        },
        {
          name: 'components_basic_relations_categories_links_order_fk',
          columns: ['category_order'],
        },
      ],
      foreignKeys: [
        {
          name: 'components_basic_relations_categories_links_fk',
          columns: ['relation_id'],
          referencedColumns: ['id'],
          referencedTable: 'components_basic_relations',
          onDelete: 'CASCADE',
        },
        {
          name: 'components_basic_relations_categories_links_inv_fk',
          columns: ['category_id'],
          referencedColumns: ['id'],
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
      ],
      lifecycles: {},
      columnToAttribute: {
        id: 'id',
        relation_id: 'relation_id',
        category_id: 'category_id',
        category_order: 'category_order',
      },
    },
  ],
];
