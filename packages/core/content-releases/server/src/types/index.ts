import type createHomepageService from '../services/homepage';
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
      interface PackageServices {
        'plugin::content-releases.homepage': Services['homepage'];
        'plugin::content-releases.release': Services['release'];
        'plugin::content-releases.release-action': Services['release-action'];
        'plugin::content-releases.release-validation': Services['release-validation'];
        'plugin::content-releases.scheduling': Services['scheduling'];
        'plugin::content-releases.settings': Services['settings'];
      }
    }
  }
}
