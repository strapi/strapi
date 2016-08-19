import { registerPlugin as registerPluginAction } from './containers/App/actions';
import { dispatch } from './app';

/**
 * Public Strapi object exposed to the `window` object
 */

/**
 * Register a plugin
 *
 * @param params
 */
const registerPlugin = (params) => {
  dispatch(registerPluginAction(params));
};

export {
  registerPlugin,
};
