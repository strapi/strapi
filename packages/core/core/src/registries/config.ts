import type { ConfigProvider } from '@strapi/types';
import { get, set, has, isString, type PropertyName } from 'lodash';
import type { LoadedStrapi } from '../Strapi';

type Config = Record<string, unknown>;

export default (initialConfig = {}, strapi?: Partial<LoadedStrapi>): ConfigProvider => {
  const _config: Config = { ...initialConfig }; // not deep clone because it would break some config

  // Accessing model configs with dot (.) was deprecated between v4->v5, but to avoid a major breaking change
  // we will still support certain namespaces, currently only 'plugin.'
  const transformDeprecatedPaths = (path: PropertyName) => {
    if (isString(path) && path.startsWith('plugin.')) {
      const newPath = path.replace('plugin.', 'plugin::');

      // strapi logger may not be loaded yet, so fall back to console
      (strapi?.log?.info || console.info)(
        `Using dot notation for model config namespaces is deprecated, for example "plugin::myplugin" should be used instead of "plugin.myplugin". Modifying requested path ${path} to ${newPath}`
      );
      return newPath;
    }

    return path;
  };

  return {
    ..._config, // TODO: to remove
    get(path: PropertyName, defaultValue?: unknown) {
      return get(_config, transformDeprecatedPaths(path), defaultValue);
    },
    set(path: PropertyName, val: unknown) {
      set(_config, transformDeprecatedPaths(path), val);
      return this;
    },
    has(path: PropertyName) {
      return has(_config, path);
    },
  };
};
