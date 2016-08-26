/*
 *
 * LanguageProvider actions
 *
 */

import {
  REGISTER_PLUGIN,
} from './constants';

export function registerPlugin(newPlugin) {
  return {
    type: REGISTER_PLUGIN,
    plugin: newPlugin,
  };
}
