import { Permission } from '@strapi/helper-plugin';

interface PermissionMap {
  main: Permission[];
  create: Permission[];
  update: Permission[];
  delete: Permission[];
  createAction: Permission[];
}

export const PERMISSIONS: PermissionMap = {
  main: [
    {
      id: 293,
      action: 'plugin::content-releases.read',
      subject: null,
      conditions: [],
      actionParameters: [],
      properties: {},
    },
  ],
  create: [
    {
      id: 294,
      action: 'plugin::content-releases.create',
      subject: null,
      conditions: [],
      actionParameters: [],
      properties: {},
    },
  ],
  update: [
    {
      id: 295,
      action: 'plugin::content-releases.update',
      subject: null,
      conditions: [],
      actionParameters: [],
      properties: {},
    },
  ],
  delete: [
    {
      id: 296,
      action: 'plugin::content-releases.delete',
      subject: null,
      conditions: [],
      actionParameters: [],
      properties: {},
    },
  ],
  createAction: [
    {
      id: 297,
      action: 'plugin::content-releases.create-action',
      subject: null,
      conditions: [],
      actionParameters: [],
      properties: {},
    },
  ],
};
