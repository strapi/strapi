// TODO: this should be called user
const admin = [
  {
    id: 169,
    action: 'admin::provider-login.read',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 170,
    action: 'admin::provider-login.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 171,
    action: 'admin::marketplace.read',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 174,
    action: 'admin::webhooks.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 175,
    action: 'admin::webhooks.read',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 176,
    action: 'admin::webhooks.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 177,
    action: 'admin::webhooks.delete',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 178,
    action: 'admin::users.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 179,
    action: 'admin::users.read',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 180,
    action: 'admin::users.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 181,
    action: 'admin::users.delete',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 182,
    action: 'admin::roles.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 183,
    action: 'admin::roles.read',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 184,
    action: 'admin::roles.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 185,
    action: 'admin::roles.delete',
    subject: null,
    properties: {},
    conditions: [],
  },
];

const app = {
  contentManager: {
    main: [],
    collectionTypesConfigurations: [
      {
        action: 'plugin::content-manager.collection-types.configure-view',
        subject: null,
      },
    ],
    componentsConfigurations: [
      {
        action: 'plugin::content-manager.components.configure-layout',
        subject: null,
      },
    ],
    singleTypesConfigurations: [
      {
        action: 'plugin::content-manager.single-types.configure-view',
        subject: null,
      },
    ],
  },
  marketplace: {
    main: [{ action: 'admin::marketplace.read', subject: null }],
    read: [{ action: 'admin::marketplace.read', subject: null }],
  },
  settings: {
    roles: {
      main: [
        { action: 'admin::roles.create', subject: null },
        { action: 'admin::roles.update', subject: null },
        { action: 'admin::roles.read', subject: null },
        { action: 'admin::roles.delete', subject: null },
      ],
      create: [{ action: 'admin::roles.create', subject: null }],
      delete: [{ action: 'admin::roles.delete', subject: null }],
      read: [{ action: 'admin::roles.read', subject: null }],
      update: [{ action: 'admin::roles.update', subject: null }],
    },
    users: {
      main: [
        { action: 'admin::users.create', subject: null },
        { action: 'admin::users.read', subject: null },
        { action: 'admin::users.update', subject: null },
        { action: 'admin::users.delete', subject: null },
      ],
      create: [{ action: 'admin::users.create', subject: null }],
      delete: [{ action: 'admin::users.delete', subject: null }],
      read: [{ action: 'admin::users.read', subject: null }],
      update: [{ action: 'admin::users.update', subject: null }],
    },
    webhooks: {
      main: [
        { action: 'admin::webhooks.create', subject: null },
        { action: 'admin::webhooks.read', subject: null },
        { action: 'admin::webhooks.update', subject: null },
        { action: 'admin::webhooks.delete', subject: null },
      ],
      create: [{ action: 'admin::webhooks.create', subject: null }],
      delete: [{ action: 'admin::webhooks.delete', subject: null }],
      read: [
        { action: 'admin::webhooks.read', subject: null },
        // NOTE: We need to check with the API
        { action: 'admin::webhooks.update', subject: null },
        { action: 'admin::webhooks.delete', subject: null },
      ],
      update: [{ action: 'admin::webhooks.update', subject: null }],
    },
    'api-tokens': {
      main: [{ action: 'admin::api-tokens.access', subject: null }],
      create: [{ action: 'admin::api-tokens.create', subject: null }],
      delete: [{ action: 'admin::api-tokens.delete', subject: null }],
      read: [{ action: 'admin::api-tokens.read', subject: null }],
      update: [{ action: 'admin::api-tokens.update', subject: null }],
      regenerate: [{ action: 'admin::api-tokens.regenerate', subject: null }],
    },
    'transfer-tokens': {
      main: [{ action: 'admin::transfer.tokens.access', subject: null }],
      create: [{ action: 'admin::transfer.tokens.create', subject: null }],
      delete: [{ action: 'admin::transfer.tokens.delete', subject: null }],
      read: [{ action: 'admin::transfer.tokens.read', subject: null }],
      update: [{ action: 'admin::transfer.tokens.update', subject: null }],
      regenerate: [{ action: 'admin::transfer.tokens.regenerate', subject: null }],
    },
    'project-settings': {
      read: [{ action: 'admin::project-settings.read', subject: null }],
      update: [{ action: 'admin::project-settings.update', subject: null }],
    },
  },
};

type Admin = typeof admin;
type App = typeof app;

export { admin, Admin, app, App };
