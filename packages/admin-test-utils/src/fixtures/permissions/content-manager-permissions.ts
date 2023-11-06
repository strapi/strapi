const contentManager = [
  {
    id: 2817,
    action: 'plugin::content-manager.single-types.configure-view',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2818,
    action: 'plugin::content-manager.collection-types.configure-view',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2819,
    action: 'plugin::content-manager.components.configure-layout',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'plugin::content-manager.explorer.create',
    subject: 'foo',
    properties: {
      fields: ['f1'],
    },
    conditions: [],
  },
  {
    action: 'plugin::content-manager.explorer.create',
    subject: 'foo',
    properties: {
      fields: ['f2'],
    },
    conditions: [],
  },
  {
    action: 'plugin::content-manager.explorer.read',
    subject: 'foo',
    properties: {
      fields: ['f1'],
    },
    conditions: [],
  },
  {
    action: 'plugin::content-manager.explorer.delete',
    subject: 'bar',
  },
  {
    action: 'plugin::content-manager.explorer.update',
    subject: 'bar',
    properties: {
      fields: ['f1'],
    },
    conditions: [],
  },
];

type ContentManager = typeof contentManager;

export { contentManager, ContentManager };
