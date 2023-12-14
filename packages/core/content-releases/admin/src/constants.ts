import { Permission as StrapiPermission } from '@strapi/helper-plugin';

type Permission = Pick<StrapiPermission, 'action' | 'subject'>;
interface PermissionMap {
  main: Permission[];
  create: Permission[];
  update: Permission[];
  delete: Permission[];
  createAction: Permission[];
  deleteAction: Permission[];
  publish: Permission[];
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
  deleteAction: [
    {
      action: 'plugin::content-releases.delete-action',
      subject: null,
    },
  ],
  publish: [
    {
      action: 'plugin::content-releases.publish',
      subject: null,
    },
  ],
};
