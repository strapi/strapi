import type { Schema } from '@strapi/types';

const contentType: Schema.ContentType = {
  uid: 'api::test.test',
  attributes: {
    createdAt: { type: 'timestamp' },
    dz: { type: 'dynamiczone', components: ['compos.test-compo', 'compos.sub-compo'] },
    id: { type: 'integer' },
    name: { type: 'string' },
    notrepeatable: {
      type: 'component',
      repeatable: false,
      component: 'compos.test-compo',
    },
    password: { type: 'password' },
    repeatable: { type: 'component', repeatable: true, component: 'compos.test-compo' },
    updatedAt: { type: 'timestamp' },
  },
  modelType: 'contentType',
  kind: 'collectionType',
  modelName: 'test',
  globalId: 'Test',
  info: {
    singularName: 'test',
    pluralName: 'tests',
    displayName: 'test',
  },
};

const components: Record<string, Schema.Component> = {
  'compos.sub-compo': {
    category: 'default',
    modelName: 'sub-compo',
    globalId: 'SubCompo',
    info: {
      displayName: 'sub-compo',
    },
    attributes: {
      id: { type: 'integer' },
      name: { type: 'string' },
      password: { type: 'password' },
    },
    modelType: 'component',
    uid: 'compos.sub-compo',
  },
  'compos.test-compo': {
    category: 'default',
    modelName: 'test-compo',
    globalId: 'TestCompo',
    info: {
      displayName: 'test-compo',
    },
    attributes: {
      id: { type: 'integer' },
      name: { type: 'string' },
      password: { type: 'password' },
      subcomponotrepeatable: {
        type: 'component',
        repeatable: false,
        component: 'compos.sub-compo',
      },
      subrepeatable: {
        type: 'component',
        repeatable: true,
        component: 'compos.sub-compo',
      },
    },
    modelType: 'component',
    uid: 'compos.test-compo',
  },
};

const testData = {
  contentType,
  components,
  modifiedData: {
    createdAt: '2020-04-28T13:22:13.033Z',
    dz: [
      {
        __component: 'compos.sub-compo',
        id: 7,
        name: 'name',
        password: 'password',
      },
      {
        id: 4,
        name: 'name',
        password: 'password',
        subcomponotrepeatable: null,
        subrepeatable: [],
        __component: 'compos.test-compo',
      },
      {
        id: 5,
        name: 'name',
        password: 'password',
        subcomponotrepeatable: { id: 9, name: 'name', password: 'password' },
        subrepeatable: [{ id: 8, name: 'name', password: 'password' }],
        __component: 'compos.test-compo',
      },
      {
        id: 6,
        name: null,
        password: null,
        subcomponotrepeatable: null,
        subrepeatable: [],
        __component: 'compos.test-compo',
      },
    ],
    id: 1,
    name: 'name',
    notrepeatable: {
      id: 1,
      name: 'name',
      password: 'password',
      subcomponotrepeatable: { id: 4, name: 'name', password: 'password' },
      subrepeatable: [
        { id: 1, name: 'name', password: 'password' },
        { id: 2, name: 'name', password: 'password' },
        { id: 3, name: 'name', password: 'password' },
      ],
    },
    password: 'password',
    repeatable: [
      {
        id: 2,
        name: 'name',
        password: 'password',
        subrepeatable: [{ id: 5, name: 'name', password: 'password' }],
        subcomponotrepeatable: { id: 6, name: 'name', password: 'password' },
      },
      {
        id: 3,
        name: 'name',
        password: 'password',
        subrepeatable: [],
        subcomponotrepeatable: null,
      },
    ],
    updatedAt: '2020-04-28T13:22:13.033Z',
  },
  expectedModifiedData: {
    createdAt: '2020-04-28T13:22:13.033Z',
    dz: [
      { __component: 'compos.sub-compo', id: 7, name: 'name' },
      {
        id: 4,
        name: 'name',
        subcomponotrepeatable: null,
        subrepeatable: [],
        __component: 'compos.test-compo',
      },
      {
        id: 5,
        name: 'name',
        subcomponotrepeatable: { id: 9, name: 'name' },
        subrepeatable: [{ id: 8, name: 'name' }],
        __component: 'compos.test-compo',
      },
      {
        id: 6,
        name: null,
        subcomponotrepeatable: null,
        subrepeatable: [],
        __component: 'compos.test-compo',
      },
    ],
    id: 1,
    name: 'name',
    notrepeatable: {
      id: 1,
      name: 'name',
      subcomponotrepeatable: { id: 4, name: 'name' },
      subrepeatable: [
        { id: 1, name: 'name' },
        { id: 2, name: 'name' },
        { id: 3, name: 'name' },
      ],
    },
    repeatable: [
      {
        id: 2,
        name: 'name',
        subrepeatable: [{ id: 5, name: 'name' }],
        subcomponotrepeatable: { id: 6, name: 'name' },
      },
      {
        id: 3,
        name: 'name',
        subrepeatable: [],
        subcomponotrepeatable: null,
      },
    ],
    updatedAt: '2020-04-28T13:22:13.033Z',
  },
  expectedNoFieldsModifiedData: {
    dz: [
      {
        __component: 'compos.sub-compo',
        name: 'name',
        password: 'password',
      },
      {
        name: 'name',
        password: 'password',
        subcomponotrepeatable: null,
        subrepeatable: [],
        __component: 'compos.test-compo',
      },
      {
        name: 'name',
        password: 'password',
        subcomponotrepeatable: { name: 'name', password: 'password' },
        subrepeatable: [{ name: 'name', password: 'password' }],
        __component: 'compos.test-compo',
      },
      {
        name: null,
        password: null,
        subcomponotrepeatable: null,
        subrepeatable: [],
        __component: 'compos.test-compo',
      },
    ],
    name: 'name',
    createdAt: '2020-04-28T13:22:13.033Z',
    updatedAt: '2020-04-28T13:22:13.033Z',
    notrepeatable: {
      name: 'name',
      password: 'password',
      subcomponotrepeatable: { name: 'name', password: 'password' },
      subrepeatable: [
        { name: 'name', password: 'password' },
        { name: 'name', password: 'password' },
        { name: 'name', password: 'password' },
      ],
    },
    password: 'password',
    repeatable: [
      {
        name: 'name',
        password: 'password',
        subrepeatable: [{ name: 'name', password: 'password' }],
        subcomponotrepeatable: { name: 'name', password: 'password' },
      },
      {
        name: 'name',
        password: 'password',
        subrepeatable: [],
        subcomponotrepeatable: null,
      },
    ],
  },
};

const permissions = [
  {
    id: 11,
    action: 'plugin::content-manager.explorer.read',
    subject: 'api::article.article',
    properties: {
      fields: ['name', 'description'],
    },
    conditions: ['admin::is-creator'],
  },
  {
    id: 12,
    action: 'plugin::content-manager.explorer.update',
    subject: 'api::article.article',
    properties: {
      fields: ['name', 'description'],
    },
    conditions: ['admin::is-creator'],
  },
  {
    id: 22,
    action: 'plugin::content-manager.explorer.read',
    subject: 'plugin::users-permissions.user',
    properties: {
      fields: [
        'username',
        'email',
        'provider',
        'password',
        'resetPasswordToken',
        'confirmed',
        'blocked',
        'role',
      ],
    },
    conditions: [],
  },
  {
    id: 24,
    action: 'plugin::content-manager.explorer.update',
    subject: 'plugin::users-permissions.user',
    properties: {
      fields: [
        'username',
        'email',
        'provider',
        'password',
        'resetPasswordToken',
        'confirmed',
        'blocked',
        'role',
      ],
    },
    conditions: [],
  },
  {
    id: 28,
    action: 'plugin::upload.read',
    subject: null,
    properties: {
      fields: null,
    },
    conditions: [],
  },
  {
    id: 39,
    action: 'plugin::users-permissions.roles.update',
    subject: null,
    properties: {
      fields: null,
    },
    conditions: [],
  },

  {
    id: 63,
    action: 'plugin::content-manager.explorer.read',
    subject: 'api::article.article',
    properties: {
      fields: ['name', 'description', 'test'],
    },
    conditions: [],
  },
];

export { permissions, testData };
