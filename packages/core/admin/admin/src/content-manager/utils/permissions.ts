import { Permission } from '@strapi/helper-plugin';

const generatePermissionsObject = (uid: string) => {
  // TODO: Why are the content-manager permissions hardcoded here?
  const permissions = {
    create: [{ action: 'plugin::content-manager.explorer.create', subject: null }],
    delete: [{ action: 'plugin::content-manager.explorer.delete', subject: null }],
    publish: [{ action: 'plugin::content-manager.explorer.publish', subject: null }],
    read: [{ action: 'plugin::content-manager.explorer.read', subject: null }],
    update: [{ action: 'plugin::content-manager.explorer.update', subject: null }],
  } satisfies Record<string, Permission[]>;

  return Object.entries(permissions).reduce<Record<string, Permission[]>>((acc, [key, value]) => {
    acc[key] = value.map((perm) => ({ ...perm, subject: uid }));

    return acc;
  }, {});
};

export { generatePermissionsObject };
