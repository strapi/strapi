export const models = [
  {
    uid: 'admin::permission',
    singularName: 'permission',
    tableName: 'admin_permissions',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      action: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: true,
      },
      actionParameters: {
        type: 'json',
        configurable: false,
        required: false,
        default: {},
      },
      subject: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: false,
      },
      properties: {
        type: 'json',
        configurable: false,
        required: false,
        default: {},
      },
      conditions: {
        type: 'json',
        configurable: false,
        required: false,
        default: [],
      },
      role: {
        configurable: false,
        type: 'relation',
        relation: 'manyToOne',
        inversedBy: 'permissions',
        target: 'admin::role',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'admin::permission',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'admin::user',
    singularName: 'user',
    tableName: 'admin_users',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      firstname: {
        type: 'string',
        unique: false,
        minLength: 1,
        configurable: false,
        required: false,
      },
      lastname: {
        type: 'string',
        unique: false,
        minLength: 1,
        configurable: false,
        required: false,
      },
      username: {
        type: 'string',
        unique: false,
        configurable: false,
        required: false,
      },
      email: {
        type: 'email',
        minLength: 6,
        configurable: false,
        required: true,
        unique: true,
        private: true,
      },
      password: {
        type: 'password',
        minLength: 6,
        configurable: false,
        required: false,
        private: true,
        searchable: false,
      },
      resetPasswordToken: {
        type: 'string',
        configurable: false,
        private: true,
        searchable: false,
      },
      registrationToken: {
        type: 'string',
        configurable: false,
        private: true,
        searchable: false,
      },
      isActive: {
        type: 'boolean',
        default: false,
        configurable: false,
        private: true,
      },
      roles: {
        configurable: false,
        private: true,
        type: 'relation',
        relation: 'manyToMany',
        inversedBy: 'users',
        target: 'admin::role',
        collectionName: 'strapi_users_roles',
      },
      blocked: {
        type: 'boolean',
        default: false,
        configurable: false,
        private: true,
      },
      preferedLanguage: {
        type: 'string',
        configurable: false,
        required: false,
        searchable: false,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'admin::user',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'admin::role',
    singularName: 'role',
    tableName: 'admin_roles',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        minLength: 1,
        unique: true,
        configurable: false,
        required: true,
      },
      code: {
        type: 'string',
        minLength: 1,
        unique: true,
        configurable: false,
        required: true,
      },
      description: {
        type: 'string',
        configurable: false,
      },
      users: {
        configurable: false,
        type: 'relation',
        relation: 'manyToMany',
        mappedBy: 'roles',
        target: 'admin::user',
      },
      permissions: {
        configurable: false,
        type: 'relation',
        relation: 'oneToMany',
        mappedBy: 'role',
        target: 'admin::permission',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'admin::role',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'admin::api-token',
    singularName: 'api-token',
    tableName: 'strapi_api_tokens',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: true,
        unique: true,
      },
      description: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: false,
        default: '',
      },
      type: {
        type: 'enumeration',
        enum: ['read-only', 'full-access', 'custom'],
        configurable: false,
        required: true,
        default: 'read-only',
      },
      accessKey: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: true,
        searchable: false,
      },
      lastUsedAt: {
        type: 'datetime',
        configurable: false,
        required: false,
      },
      permissions: {
        type: 'relation',
        target: 'admin::api-token-permission',
        relation: 'oneToMany',
        mappedBy: 'token',
        configurable: false,
        required: false,
      },
      expiresAt: {
        type: 'datetime',
        configurable: false,
        required: false,
      },
      lifespan: {
        type: 'biginteger',
        configurable: false,
        required: false,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'admin::api-token',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'admin::api-token-permission',
    singularName: 'api-token-permission',
    tableName: 'strapi_api_token_permissions',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      action: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: true,
      },
      token: {
        configurable: false,
        type: 'relation',
        relation: 'manyToOne',
        inversedBy: 'permissions',
        target: 'admin::api-token',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'admin::api-token-permission',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'admin::transfer-token',
    singularName: 'transfer-token',
    tableName: 'strapi_transfer_tokens',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: true,
        unique: true,
      },
      description: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: false,
        default: '',
      },
      accessKey: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: true,
      },
      lastUsedAt: {
        type: 'datetime',
        configurable: false,
        required: false,
      },
      permissions: {
        type: 'relation',
        target: 'admin::transfer-token-permission',
        relation: 'oneToMany',
        mappedBy: 'token',
        configurable: false,
        required: false,
      },
      expiresAt: {
        type: 'datetime',
        configurable: false,
        required: false,
      },
      lifespan: {
        type: 'biginteger',
        configurable: false,
        required: false,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'admin::transfer-token',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'admin::transfer-token-permission',
    singularName: 'transfer-token-permission',
    tableName: 'strapi_transfer_token_permissions',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      action: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: true,
      },
      token: {
        configurable: false,
        type: 'relation',
        relation: 'manyToOne',
        inversedBy: 'permissions',
        target: 'admin::transfer-token',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'admin::transfer-token-permission',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'plugin::upload.file',
    singularName: 'file',
    tableName: 'files',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        configurable: false,
        required: true,
      },
      alternativeText: {
        type: 'string',
        configurable: false,
      },
      caption: {
        type: 'string',
        configurable: false,
      },
      width: {
        type: 'integer',
        configurable: false,
      },
      height: {
        type: 'integer',
        configurable: false,
      },
      formats: {
        type: 'json',
        configurable: false,
      },
      hash: {
        type: 'string',
        configurable: false,
        required: true,
      },
      ext: {
        type: 'string',
        configurable: false,
      },
      mime: {
        type: 'string',
        configurable: false,
        required: true,
      },
      size: {
        type: 'decimal',
        configurable: false,
        required: true,
      },
      url: {
        type: 'string',
        configurable: false,
        required: true,
      },
      previewUrl: {
        type: 'string',
        configurable: false,
      },
      provider: {
        type: 'string',
        configurable: false,
        required: true,
      },
      provider_metadata: {
        type: 'json',
        configurable: false,
      },
      related: {
        type: 'relation',
        relation: 'morphToMany',
        configurable: false,
      },
      folder: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'plugin::upload.folder',
        inversedBy: 'files',
        private: true,
      },
      folderPath: {
        type: 'string',
        min: 1,
        required: true,
        private: true,
        searchable: false,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::upload.file',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'plugin::upload.folder',
    singularName: 'folder',
    tableName: 'upload_folders',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        min: 1,
        required: true,
      },
      pathId: {
        type: 'integer',
        unique: true,
        required: true,
      },
      parent: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'plugin::upload.folder',
        inversedBy: 'children',
      },
      children: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::upload.folder',
        mappedBy: 'parent',
      },
      files: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::upload.file',
        mappedBy: 'folder',
      },
      path: {
        type: 'string',
        min: 1,
        required: true,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::upload.folder',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'plugin::content-releases.release',
    singularName: 'release',
    tableName: 'strapi_releases',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        required: true,
      },
      releasedAt: {
        type: 'datetime',
      },
      scheduledAt: {
        type: 'datetime',
      },
      actions: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::content-releases.release-action',
        mappedBy: 'release',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::content-releases.release',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'plugin::content-releases.release-action',
    singularName: 'release-action',
    tableName: 'strapi_release_actions',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      type: {
        type: 'enumeration',
        enum: ['publish', 'unpublish'],
        required: true,
      },
      entry: {
        type: 'relation',
        relation: 'morphToOne',
        configurable: false,
      },
      contentType: {
        type: 'string',
        required: true,
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
      release: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'plugin::content-releases.release',
        inversedBy: 'actions',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::content-releases.release-action',
      },
    },
  },
  {
    uid: 'plugin::myplugin.test',
    singularName: 'test',
    tableName: 'myplugin_test',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
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
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::myplugin.test',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'plugin::i18n.locale',
    singularName: 'locale',
    tableName: 'i18n_locale',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        min: 1,
        max: 50,
        configurable: false,
      },
      code: {
        type: 'string',
        unique: true,
        configurable: false,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::i18n.locale',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'plugin::users-permissions.permission',
    singularName: 'permission',
    tableName: 'up_permissions',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      action: {
        type: 'string',
        required: true,
        configurable: false,
      },
      role: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'plugin::users-permissions.role',
        inversedBy: 'permissions',
        configurable: false,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::users-permissions.permission',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'plugin::users-permissions.role',
    singularName: 'role',
    tableName: 'up_roles',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        minLength: 3,
        required: true,
        configurable: false,
      },
      description: {
        type: 'string',
        configurable: false,
      },
      type: {
        type: 'string',
        unique: true,
        configurable: false,
      },
      permissions: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::users-permissions.permission',
        mappedBy: 'role',
        configurable: false,
      },
      users: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::users-permissions.user',
        mappedBy: 'role',
        configurable: false,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::users-permissions.role',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'plugin::users-permissions.user',
    singularName: 'user',
    tableName: 'up_users',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      username: {
        type: 'string',
        minLength: 3,
        unique: true,
        configurable: false,
        required: true,
      },
      email: {
        type: 'email',
        minLength: 6,
        configurable: false,
        required: true,
      },
      provider: {
        type: 'string',
        configurable: false,
      },
      password: {
        type: 'password',
        minLength: 6,
        configurable: false,
        private: true,
        searchable: false,
      },
      resetPasswordToken: {
        type: 'string',
        configurable: false,
        private: true,
        searchable: false,
      },
      confirmationToken: {
        type: 'string',
        configurable: false,
        private: true,
        searchable: false,
      },
      confirmed: {
        type: 'boolean',
        default: false,
        configurable: false,
      },
      blocked: {
        type: 'boolean',
        default: false,
        configurable: false,
      },
      role: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'plugin::users-permissions.role',
        inversedBy: 'users',
        configurable: false,
      },
      picture: {
        type: 'relation',
        relation: 'morphOne',
        target: 'plugin::upload.file',
        morphBy: 'related',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::users-permissions.user',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    singularName: 'addresses_components',
    uid: 'addresses_components',
    tableName: 'addresses_components',
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
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
  },
  {
    uid: 'api::address.address',
    singularName: 'address',
    tableName: 'addresses',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      postal_code: {
        type: 'string',
        pluginOptions: {},
        maxLength: 2,
      },
      categories: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::category.category',
        inversedBy: 'addresses',
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
      },
      json: {
        type: 'json',
        pluginOptions: {},
      },
      slug: {
        type: 'uid',
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
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::address.address',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'api::category.category',
    singularName: 'category',
    tableName: 'categories',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
      },
      addresses: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::address.address',
        mappedBy: 'categories',
      },
      temps: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::temp.temp',
        mappedBy: 'categories',
      },
      datetime: {
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
        type: 'datetime',
      },
      date: {
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
        type: 'date',
      },
      relation_locales: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::relation-locale.relation-locale',
        mappedBy: 'categories',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'api::country.country',
    singularName: 'country',
    tableName: 'countries',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
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
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::country.country',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'api::homepage.homepage',
    singularName: 'homepage',
    tableName: 'homepages',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      title: {
        type: 'string',
        required: true,
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
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
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::homepage.homepage',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    singularName: 'kitchensinks_components',
    uid: 'kitchensinks_components',
    tableName: 'kitchensinks_components',
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
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
  },
  {
    uid: 'api::kitchensink.kitchensink',
    singularName: 'kitchensink',
    tableName: 'kitchensinks',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      short_text: {
        type: 'string',
      },
      long_text: {
        type: 'text',
      },
      rich_text: {
        type: 'richtext',
      },
      blocks: {
        type: 'blocks',
      },
      integer: {
        type: 'integer',
      },
      biginteger: {
        type: 'biginteger',
      },
      decimal: {
        type: 'decimal',
      },
      float: {
        type: 'float',
      },
      date: {
        type: 'date',
      },
      datetime: {
        type: 'datetime',
      },
      time: {
        type: 'time',
      },
      timestamp: {
        type: 'timestamp',
      },
      boolean: {
        type: 'boolean',
      },
      email: {
        type: 'email',
      },
      password: {
        type: 'password',
      },
      enumeration: {
        type: 'enumeration',
        enum: ['A', 'B', 'C', 'D', 'E'],
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
      },
      one_to_one_tag: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::tag.tag',
        private: true,
        inversedBy: 'one_to_one_kitchensink',
      },
      one_to_many_tags: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::tag.tag',
        mappedBy: 'many_to_one_kitchensink',
      },
      many_to_one_tag: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::tag.tag',
        inversedBy: 'one_to_many_kitchensinks',
      },
      many_to_many_tags: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::tag.tag',
        inversedBy: 'many_to_many_kitchensinks',
      },
      many_way_tags: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::tag.tag',
      },
      morph_to_one: {
        type: 'relation',
        relation: 'morphToOne',
      },
      morph_to_many: {
        type: 'relation',
        relation: 'morphToMany',
      },
      custom_field: {
        type: 'string',
        customField: 'plugin::color-picker.color',
      },
      custom_field_with_default_options: {
        type: 'string',
        regex: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
        customField: 'plugin::color-picker.color',
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
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::kitchensink.kitchensink',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'api::like.like',
    singularName: 'like',
    tableName: 'likes',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      author: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'plugin::users-permissions.user',
      },
      review: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::review.review',
        inversedBy: 'likes',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::like.like',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'api::menu.menu',
    singularName: 'menu',
    tableName: 'menus',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      description: {
        type: 'text',
      },
      menusections: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::menusection.menusection',
        mappedBy: 'menu',
      },
      restaurant: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::restaurant.restaurant',
        mappedBy: 'menu',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::menu.menu',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    singularName: 'menusections_components',
    uid: 'menusections_components',
    tableName: 'menusections_components',
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
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
  },
  {
    uid: 'api::menusection.menusection',
    singularName: 'menusection',
    tableName: 'menusections',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        required: true,
        minLength: 6,
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
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::menusection.menusection',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    singularName: 'relation_locales_components',
    uid: 'relation_locales_components',
    tableName: 'relation_locales_components',
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
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
  },
  {
    uid: 'api::relation-locale.relation-locale',
    singularName: 'relation-locale',
    tableName: 'relation_locales',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      categories: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::category.category',
        inversedBy: 'relation_locales',
      },
      title: {
        type: 'string',
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
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
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::relation-locale.relation-locale',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    singularName: 'restaurants_components',
    uid: 'restaurants_components',
    tableName: 'restaurants_components',
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
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
  },
  {
    uid: 'api::restaurant.restaurant',
    singularName: 'restaurant',
    tableName: 'restaurants',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
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
      },
      slug: {
        type: 'uid',
        targetField: 'name',
        pluginOptions: {},
      },
      priceRange: {
        enum: ['very_cheap', 'cheap', 'average', 'expensive', 'very_expensive'],
        type: 'enumeration',
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
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
      },
      address: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::address.address',
      },
      cover: {
        type: 'relation',
        relation: 'morphOne',
        target: 'plugin::upload.file',
        morphBy: 'related',
      },
      timestamp: {
        type: 'timestamp',
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
      },
      since: {
        type: 'date',
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
      },
      categories: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
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
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::restaurant.restaurant',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'api::review.review',
    singularName: 'review',
    tableName: 'reviews',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      comment: {
        type: 'text',
        required: true,
      },
      rating: {
        type: 'integer',
        required: true,
        min: 1,
        max: 5,
      },
      likes: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::like.like',
        mappedBy: 'review',
      },
      author: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'plugin::users-permissions.user',
      },
      restaurant: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::restaurant.restaurant',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::review.review',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'api::tag.tag',
    singularName: 'tag',
    tableName: 'tags',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      many_to_one_kitchensink: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::kitchensink.kitchensink',
        inversedBy: 'one_to_many_tags',
      },
      one_to_many_kitchensinks: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::kitchensink.kitchensink',
        mappedBy: 'many_to_one_tag',
      },
      many_to_many_kitchensinks: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::kitchensink.kitchensink',
        mappedBy: 'many_to_many_tags',
      },
      one_to_one_kitchensink: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::kitchensink.kitchensink',
        mappedBy: 'one_to_one_tag',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::tag.tag',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'api::temp.temp',
    singularName: 'temp',
    tableName: 'temps',
    attributes: {
      id: {
        type: 'increments',
      },
      documentId: {
        type: 'string',
      },
      name: {
        type: 'string',
        pluginOptions: {},
      },
      category: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::category.category',
      },
      categories: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::category.category',
        inversedBy: 'temps',
      },
      selfManyToMany: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::temp.temp',
        inversedBy: 'selfManyToManyInv',
      },
      selfManyToManyInv: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::temp.temp',
        inversedBy: 'selfManyToMany',
      },
      bidirectionalAddress: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::address.address',
        inversedBy: 'bidirectionalTemps',
        useJoinTable: false,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      publishedAt: {
        type: 'datetime',
        configurable: false,
        writable: true,
        visible: false,
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
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::temp.temp',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
  },
  {
    uid: 'default.temp',
    singularName: 'temp',
    tableName: 'components_default_temps',
    attributes: {
      id: {
        type: 'increments',
      },
      name: {
        type: 'string',
        required: true,
      },
      url: {
        type: 'string',
      },
    },
  },
  {
    uid: 'default.restaurantservice',
    singularName: 'restaurantservice',
    tableName: 'components_restaurantservices',
    attributes: {
      id: {
        type: 'increments',
      },
      name: {
        type: 'string',
        required: true,
        default: 'something',
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
      },
    },
  },
  {
    singularName: 'components_openingtimes_components',
    uid: 'components_openingtimes_components',
    tableName: 'components_openingtimes_components',
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
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
  },
  {
    uid: 'default.openingtimes',
    singularName: 'openingtimes',
    tableName: 'components_openingtimes',
    attributes: {
      id: {
        type: 'increments',
      },
      label: {
        type: 'string',
        required: true,
        default: 'something',
      },
      time: {
        type: 'string',
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
  },
  {
    uid: 'default.dish',
    singularName: 'dish',
    tableName: 'components_dishes',
    attributes: {
      id: {
        type: 'increments',
      },
      name: {
        type: 'string',
        required: false,
        default: 'My super dish',
      },
      description: {
        type: 'text',
      },
      price: {
        type: 'float',
      },
      picture: {
        type: 'relation',
        relation: 'morphOne',
        target: 'plugin::upload.file',
        morphBy: 'related',
      },
      very_long_description: {
        type: 'richtext',
      },
      categories: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::category.category',
      },
    },
  },
  {
    singularName: 'components_closingperiods_components',
    uid: 'components_closingperiods_components',
    tableName: 'components_closingperiods_components',
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
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
  },
  {
    uid: 'default.closingperiod',
    singularName: 'closingperiod',
    tableName: 'components_closingperiods',
    attributes: {
      id: {
        type: 'increments',
      },
      label: {
        type: 'string',
        default: 'toto',
      },
      start_date: {
        type: 'date',
        required: true,
      },
      end_date: {
        type: 'date',
        required: true,
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
  },
  {
    uid: 'default.car',
    singularName: 'car',
    tableName: 'components_default_cars',
    attributes: {
      id: {
        type: 'increments',
      },
      name: {
        type: 'string',
      },
    },
  },
  {
    uid: 'default.apple',
    singularName: 'apple',
    tableName: 'components_default_apples',
    attributes: {
      id: {
        type: 'increments',
      },
      name: {
        type: 'string',
        required: true,
      },
    },
  },
  {
    uid: 'blog.test-como',
    singularName: 'test-como',
    tableName: 'components_blog_test_comos',
    attributes: {
      id: {
        type: 'increments',
      },
      name: {
        type: 'string',
        default: 'toto',
      },
    },
  },
  {
    uid: 'basic.simple',
    singularName: 'simple',
    tableName: 'components_basic_simples',
    attributes: {
      id: {
        type: 'increments',
      },
      name: {
        type: 'string',
        required: true,
      },
      test: {
        type: 'string',
      },
    },
  },
  {
    uid: 'basic.relation',
    singularName: 'relation',
    tableName: 'components_basic_relations',
    attributes: {
      id: {
        type: 'increments',
      },
      categories: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
      },
    },
  },
  {
    uid: 'strapi::core-store',
    singularName: 'strapi_core_store_settings',
    tableName: 'strapi_core_store_settings',
    attributes: {
      id: {
        type: 'increments',
      },
      key: {
        type: 'string',
      },
      value: {
        type: 'text',
      },
      type: {
        type: 'string',
      },
      environment: {
        type: 'string',
      },
      tag: {
        type: 'string',
      },
    },
  },
  {
    uid: 'strapi::webhook',
    singularName: 'strapi_webhooks',
    tableName: 'strapi_webhooks',
    attributes: {
      id: {
        type: 'increments',
      },
      name: {
        type: 'string',
      },
      url: {
        type: 'text',
      },
      headers: {
        type: 'json',
      },
      events: {
        type: 'json',
      },
      enabled: {
        type: 'boolean',
      },
    },
  },
];
