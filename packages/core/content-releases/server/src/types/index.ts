import type createHomepageService from '../services/homepage';
import type { Release } from '../../../shared/contracts/releases';
import type { ReleaseService } from '../services/release';
import type { FindPageQuery, ReleaseActionService } from '../services/release-action';
import type createSchedulingService from '../services/scheduling';
import type { SettingsService } from '../services/settings';
import type createReleaseValidationService from '../services/validation';

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
 * The services are only registered when the `cms-content-releases` EE feature is enabled.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      // Registered only when the `cms-content-releases` EE feature is enabled, so a CE application, or a
      // license without the feature, resolves them to `undefined`.
      // TODO @Nico Redesign as a real opt-in to licensed features, so applications that have the
      // feature can drop `undefined`, instead of every application seeing it.
      /**
       * The releases settings, written by the settings service under the `core` type. A
       * `defaultTimezone` left `undefined` is dropped by the JSON encoding, so the key may be
       * missing. Stored whatever the license, so it is not `undefined` like the services.
       */
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

      interface Stores {
        'core_content-releases_settings': { defaultTimezone?: string | null | undefined };
      }

      interface PackageServices {
        'plugin::content-releases.homepage': Services['homepage'] | undefined;
        'plugin::content-releases.release': Services['release'] | undefined;
        'plugin::content-releases.release-action': Services['release-action'] | undefined;
        'plugin::content-releases.release-validation': Services['release-validation'] | undefined;
        'plugin::content-releases.scheduling': Services['scheduling'] | undefined;
        'plugin::content-releases.settings': Services['settings'] | undefined;
      }
    }
  }
}
