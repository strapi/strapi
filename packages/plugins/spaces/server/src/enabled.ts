import { ENABLE_ENV_VAR, LICENSE_FEATURE } from '../../shared/constants';

/**
 * Whether this project may use Spaces.
 *
 * The feature is Enterprise, and normally comes from the licence. The
 * environment variable exists because the licence feature is rolled out
 * separately from the code: it lets a project with an Enterprise licence turn
 * Spaces on ahead of that, and it does not let a Community project in.
 */
export const isEnabled = (): boolean => {
  if (!strapi.ee.isEE) {
    return false;
  }

  if (strapi.ee.features.isEnabled(LICENSE_FEATURE)) {
    return true;
  }

  return process.env[ENABLE_ENV_VAR]?.toLowerCase() === 'true';
};
