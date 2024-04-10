import { Permission } from '@strapi/admin/strapi-admin';

import type { ComponentsDictionary, Schema } from '../hooks/useDocument';

const testData = {
  contentType: {
    uid: 'api::test.test',
    apiID: 'test',
    isDisplayed: true,
    kind: 'collectionType',
    modelName: 'test',
    globalId: 'Test',
    modelType: 'contentType',
    info: {
      displayName: 'Test',
      singularName: 'test',
      pluralName: 'tests',
    },
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
  } satisfies Schema,
  components: {
    'compos.sub-compo': {
      uid: 'compos.sub-compo',
      isDisplayed: true,
      category: 'compos',
      modelType: 'component',
      apiID: 'compos.sub-compo',
      modelName: 'sub-compo',
      globalId: 'SubCompo',
      info: {
        displayName: 'Sub compo',
      },
      attributes: {
        id: { type: 'integer' },
        name: { type: 'string' },
        password: { type: 'password' },
      },
    },
    'compos.test-compo': {
      uid: 'compos.test-compo',
      category: 'compos',
      isDisplayed: true,
      modelType: 'component',
      apiID: 'compos.test-compo',
      modelName: 'test-compo',
      globalId: 'TestCompo',
      info: {
        displayName: 'Test compo',
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
    },
  } satisfies ComponentsDictionary,
  modifiedData: {
    createdAt: '2020-04-28T13:22:13.033Z',
    dz: [
      { __component: 'compos.sub-compo', id: 7, name: 'name', password: 'password' },
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
    properties: {},
    conditions: [],
  },
  {
    id: 39,
    action: 'plugin::users-permissions.roles.update',
    subject: null,
    properties: {},
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
] satisfies Permission[];

export { testData, permissions };
