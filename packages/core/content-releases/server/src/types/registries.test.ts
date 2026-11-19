// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type { Controllers } from './controllers';
import type homepageController from '../controllers/homepage';
import type releaseController from '../controllers/release';
import type releaseActionController from '../controllers/release-action';
import type settingsController from '../controllers/settings';

// Each controller implements exactly the actions of its contract. The map check in
// `../controllers/index.ts` catches missing actions only: imported objects escape the excess
// property check.
/* eslint-disable @typescript-eslint/no-unused-vars */
type HomepageActions = Core.Assert<
  Core.SameNames<keyof ReturnType<typeof homepageController>, keyof Controllers['homepage']>
>;
type ReleaseActions = Core.Assert<
  Core.SameNames<keyof typeof releaseController, keyof Controllers['release']>
>;
type ReleaseActionActions = Core.Assert<
  Core.SameNames<keyof typeof releaseActionController, keyof Controllers['release-action']>
>;
type SettingsActions = Core.Assert<
  Core.SameNames<keyof typeof settingsController, keyof Controllers['settings']>
>;
/* eslint-enable @typescript-eslint/no-unused-vars */

declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

// Controllers only exist with the `cms-content-releases` feature.
strapi.controller('plugin::content-releases.release')?.findPage(context, next);
strapi.plugin('content-releases').controller('release-action')?.createMany(context, next);
strapi.controller('plugin::content-releases.settings')?.update satisfies
  Core.ControllerHandler | undefined;
strapi.controller('plugin::content-releases.homepage')?.getUpcomingReleases satisfies
  Core.ControllerHandler | undefined;
// @ts-expect-error The controller may be undefined.
strapi.controller('plugin::content-releases.release').publish(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.plugin('content-releases').controller('settings')?.findOne(context, next);

(() => ({
  // @ts-expect-error The factory is checked against the registered contract.
  getUpcomingReleases: { data: [] },
})) satisfies Core.ControllerFactory<'plugin::content-releases.homepage'>;

({
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/:releaseId/actions/bulk',
      handler: 'release-action.createMany',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-releases.create-action'] },
          },
        ],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::content-releases'>;
({
  type: 'admin',
  // @ts-expect-error Route actions are checked against the controller contracts.
  routes: [{ method: 'GET', path: '/', handler: 'release.findMany' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::content-releases'>;
({
  type: 'admin',
  // @ts-expect-error `| undefined` registry entries have no actions: routes use `Controllers`.
  routes: [{ method: 'GET', path: '/', handler: 'release.findPage' }],
}) satisfies Core.RouterInputFor<
  Core.RegisteredFor<Strapi.Registries.PackageControllers, 'plugin::content-releases'>,
  'plugin::content-releases'
>;
