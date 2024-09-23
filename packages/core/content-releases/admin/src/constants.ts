import type { Permission as StrapiPermission } from '@strapi/admin/strapi-admin';

export const PERMISSIONS = {
  main: [
    {
      action: 'plugin::content-releases.read',
      subject: null,
      id: '',
      actionParameters: {},
      properties: {},
      conditions: [],
    },
  ],
  create: [
    {
      action: 'plugin::content-releases.create',
      subject: null,
      id: '',
      actionParameters: {},
      properties: {},
      conditions: [],
    },
  ],
  update: [
    {
      action: 'plugin::content-releases.update',
      subject: null,
      id: '',
      actionParameters: {},
      properties: {},
      conditions: [],
    },
  ],
  delete: [
    {
      action: 'plugin::content-releases.delete',
      subject: null,
      id: '',
      actionParameters: {},
      properties: {},
      conditions: [],
    },
  ],
  createAction: [
    {
      action: 'plugin::content-releases.create-action',
      subject: null,
      id: '',
      actionParameters: {},
      properties: {},
      conditions: [],
    },
  ],
  deleteAction: [
    {
      action: 'plugin::content-releases.delete-action',
      subject: null,
      id: '',
      actionParameters: {},
      properties: {},
      conditions: [],
    },
  ],
  publish: [
    {
      action: 'plugin::content-releases.publish',
      subject: null,
      id: '',
      actionParameters: {},
      properties: {},
      conditions: [],
    },
  ],
} satisfies Record<string, StrapiPermission[]>;

export const PERMISSIONS_SETTINGS = {
  read: [
    {
      action: 'plugin::content-releases.settings.read',
      subject: null,
      id: '',
      actionParameters: {},
      properties: {},
      conditions: [],
    },
  ],
  update: [
    {
      action: 'plugin::content-releases.settings.update',
      subject: null,
      id: '',
      actionParameters: {},
      properties: {},
      conditions: [],
    },
  ],
} satisfies Record<string, StrapiPermission[]>;
