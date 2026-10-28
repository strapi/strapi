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
  // `as const` makes the list readonly, and the action provider takes a mutable array.
  type ActionInputs = Parameters<
    Core.ServiceFor<'admin::permission'>['actionProvider']['registerMany']
  >[0];

  await strapi
    .service('admin::permission')
    .actionProvider.registerMany(actions as unknown as ActionInputs);
};
