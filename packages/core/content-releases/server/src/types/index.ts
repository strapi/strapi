import type createHomepageService from '../services/homepage';
import type { ReleaseService } from '../services/release';
import type { ReleaseActionService } from '../services/release-action';
import type createSchedulingService from '../services/scheduling';
import type { SettingsService } from '../services/settings';
import type createReleaseValidationService from '../services/validation';

/** Content Releases services by name, as registered by the plugin. */
export type Services = {
  homepage: ReturnType<typeof createHomepageService>;
  release: ReleaseService;
  'release-action': ReleaseActionService;
  'release-validation': ReturnType<typeof createReleaseValidationService>;
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
