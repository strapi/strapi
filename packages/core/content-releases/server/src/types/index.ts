import type { Core } from '@strapi/types';
import type { Controllers } from './controllers';
import type createHomepageService from '../services/homepage';
import type { Release } from '../../../shared/contracts/releases';
import type { ReleaseService } from '../services/release';
import type { FindPageQuery, ReleaseActionService } from '../services/release-action';
import type createSchedulingService from '../services/scheduling';
import type { SettingsService } from '../services/settings';
import type createReleaseValidationService from '../services/validation';

export type * from './controllers';

type ReleaseValidationImplementation = ReturnType<typeof createReleaseValidationService>;

/**
 * The `release-validation` service. Updates may omit `scheduledAt`, which the check accepts at
 * runtime; the implementation keeps its published develop parameter type.
 */
type ReleaseValidationService = Omit<
  ReleaseValidationImplementation,
  'validateScheduledAtIsLaterThanNow'
> & {
  validateScheduledAtIsLaterThanNow(
    scheduledAt:
      | Parameters<ReleaseValidationImplementation['validateScheduledAtIsLaterThanNow']>[0]
      | undefined
  ): ReturnType<ReleaseValidationImplementation['validateScheduledAtIsLaterThanNow']>;
};

/**
 * The `release-action` service. The controller groups a page by its query's `sort`, so the `action`
 * grouping arrives as `type`; the implementation keeps its published develop parameter type.
 */
type ReleaseActionServiceContract = Omit<ReleaseActionService, 'groupActions'> & {
  groupActions(
    actions: Parameters<ReleaseActionService['groupActions']>[0],
    groupBy?: Parameters<ReleaseActionService['groupActions']>[1] | FindPageQuery['sort']
  ): ReturnType<ReleaseActionService['groupActions']>;
};

/** Content Releases services by name, as registered by the plugin. */
export type Services = {
  homepage: ReturnType<typeof createHomepageService>;
  release: ReleaseService;
  'release-action': ReleaseActionServiceContract;
  'release-validation': ReleaseValidationService;
  scheduling: ReturnType<typeof createSchedulingService>;
  settings: SettingsService;
};

/**
 * Default contracts loaded with the Content Releases server types.
 * The services and controllers are only registered when the `cms-content-releases` EE feature is
 * enabled.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * The outcome of a release publish, emitted by the release service and forwarded to webhooks.
       * `isPublished` tells the two payloads apart: the published release, or the error that stopped
       * the publish. Emitted whatever the license, like the store row.
       */
      interface Events {
        'releases.publish': [
          | { isPublished: true; error: undefined; release: Release }
          | { isPublished: false; error: unknown; release: undefined },
        ];
      }

      /**
       * The releases settings, written by the settings service under the `core` type. A
       * `defaultTimezone` left `undefined` is dropped by the JSON encoding, so the key may be
       * missing. Stored whatever the license, so it is not `undefined` like the services.
       */
      interface Stores {
        'core_content-releases_settings': { defaultTimezone?: string | null | undefined };
      }

      // Registered only when the `cms-content-releases` EE feature is enabled: `undefined` unless
      // the application lists the feature in `licensedFeatures`, `T | undefined` in package and
      // plugin programs.
      interface PackageServices {
        'plugin::content-releases.homepage': Core.Licensed<
          'cms-content-releases',
          Services['homepage']
        >;
        'plugin::content-releases.release': Core.Licensed<
          'cms-content-releases',
          Services['release']
        >;
        'plugin::content-releases.release-action': Core.Licensed<
          'cms-content-releases',
          Services['release-action']
        >;
        'plugin::content-releases.release-validation': Core.Licensed<
          'cms-content-releases',
          Services['release-validation']
        >;
        'plugin::content-releases.scheduling': Core.Licensed<
          'cms-content-releases',
          Services['scheduling']
        >;
        'plugin::content-releases.settings': Core.Licensed<
          'cms-content-releases',
          Services['settings']
        >;
      }

      // Registered with the services (`index.ts`), under the same feature.
      interface PackageControllers {
        'plugin::content-releases.homepage': Core.Licensed<
          'cms-content-releases',
          Controllers['homepage']
        >;
        'plugin::content-releases.release': Core.Licensed<
          'cms-content-releases',
          Controllers['release']
        >;
        'plugin::content-releases.release-action': Core.Licensed<
          'cms-content-releases',
          Controllers['release-action']
        >;
        'plugin::content-releases.settings': Core.Licensed<
          'cms-content-releases',
          Controllers['settings']
        >;
      }

      /**
       * Registered in `register` (`constants.ts`), only when the `cms-content-releases` EE feature
       * is enabled: without it, these IDs are absent at runtime.
       */
      interface PermissionActions {
        'plugin::content-releases.read': true;
        'plugin::content-releases.create': true;
        'plugin::content-releases.update': true;
        'plugin::content-releases.delete': true;
        'plugin::content-releases.publish': true;
        'plugin::content-releases.delete-action': true;
        'plugin::content-releases.create-action': true;
        'plugin::content-releases.settings.read': true;
        'plugin::content-releases.settings.update': true;
      }
    }
  }
}
