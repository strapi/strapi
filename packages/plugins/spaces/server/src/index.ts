import { ENABLE_ENV_VAR, LICENSE_FEATURE } from '../../shared/constants';
import bootstrap from './bootstrap';
import config from './config';
import contentTypes from './content-types';
import controllers from './controllers';
import destroy from './destroy';
import register from './register';
import routes from './routes';
import services from './services';

/**
 * Whether this project may use Spaces.
 *
 * The feature is Enterprise, and normally comes from the licence. The
 * environment variable exists because the licence feature is rolled out
 * separately from the code: it lets a project with an Enterprise licence turn
 * Spaces on ahead of that, and it does not let a Community project in.
 */
const isEnabled = (): boolean => {
  if (!strapi.ee.isEE) {
    return false;
  }

  if (strapi.ee.features.isEnabled(LICENSE_FEATURE)) {
    return true;
  }

  return process.env[ENABLE_ENV_VAR]?.toLowerCase() === 'true';
};

/**
 * The schema is registered whether or not the feature is on.
 *
 * Schema sync removes columns it is not told about, so a project whose licence
 * lapses would lose the `space` column on every content type — and with it any
 * record of which tenant owned what. Merging every tenant's data together is
 * not something a licence check should be able to do, so the columns stay and
 * only the enforcement is switched off.
 */
const always = { register, contentTypes, config };

const getPlugin = () => {
  if (!isEnabled()) {
    return always;
  }

  return {
    ...always,
    bootstrap,
    destroy,
    controllers,
    routes,
    services,
  };
};

export default getPlugin();
