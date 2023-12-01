import { Permission } from '@strapi/helper-plugin';

interface PermissionMap {
  main: Permission[];
  create: Permission[];
  read: Permission[];
  update: Permission[];
  delete: Permission[];
  createAction: Permission[];
}

export const PERMISSIONS: PermissionMap = {
  main: [
    {
      action: 'plugin::content-releases.read',
      subject: null,
    },
  ],
  create: [
    {
      action: 'plugin::content-releases.create',
      subject: null,
    },
  ],
  update: [
    {
      action: 'plugin::content-releases.update',
      subject: null,
    },
  ],
  read: [
    {
      action: 'plugin::content-releases.read',
      subject: null,
    },
  ],
  delete: [
    {
      action: 'plugin::content-releases.delete',
      subject: null,
    },
  ],
  createAction: [
    {
      action: 'plugin::content-releases.create-action',
      subject: null,
    },
  ],
};
