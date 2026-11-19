import type { Core } from '@strapi/types';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'content-type-builder',
    },
  ] as const;

  // The declared permission action IDs match the registered actions.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type ActionIds = Core.Assert<
    Core.SameNames<
      Core.PermissionActionId<(typeof actions)[number]>,
      Extract<Core.RegisteredPermissionAction, `plugin::content-type-builder.${string}`>
    >
  >;
  await strapi.service('admin::permission').actionProvider.registerMany(actions);
};
