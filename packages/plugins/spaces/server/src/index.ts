import bootstrap from './bootstrap';
import config from './config';
import contentTypes from './content-types';
import controllers from './controllers';
import destroy from './destroy';
import { isEnabled } from './enabled';
import hidden from './hidden';
import register from './register';
import routes from './routes';
import services from './services';

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
    // The column stays; the attribute is kept out of sight. See `./hidden`.
    return { ...always, bootstrap: hidden };
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
