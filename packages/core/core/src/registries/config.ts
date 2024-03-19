import type { ConfigProvider, LoadedStrapi, Strapi } from '@strapi/types';
import { get, set, has, isString, type PropertyName, type PropertyPath } from 'lodash';
import { isArray } from 'lodash/fp';

type Config = Record<string, unknown>;

export default (initialConfig = {}, strapi?: Strapi | LoadedStrapi): ConfigProvider => {
  const _config: Config = { ...initialConfig }; // not deep clone because it would break some config

  // Accessing model configs with dot (.) was deprecated between v4->v5, but to avoid a major breaking change
  // we will still support certain namespaces, currently only 'plugin.'
  const transformPathString = (path: PropertyName) => {
    if (isString(path) && path.startsWith('plugin.')) {
      const newPath = path.replace('plugin.', 'plugin::');

      // strapi logger may not be loaded yet, so fall back to console
      (strapi?.log?.warn ?? console.warn)(
        `Using dot notation for model config namespaces is deprecated, for example "plugin::myplugin" should be used instead of "plugin.myplugin". Modifying requested path ${path} to ${newPath}`
      );
      return newPath;
    }

    return path;
  };

  const transformDeprecatedPaths = (path: PropertyPath | PropertyName) => {
    if (isString(path)) {
      return transformPathString(path);
    }
    if (isArray(path)) {
      return path.map((name) => transformPathString(name));
    }

    return path;
  };

  return {
    ..._config, // TODO: to remove
    get(path: PropertyPath | PropertyName, defaultValue?: unknown) {
      return get(_config, transformDeprecatedPaths(path), defaultValue);
    },
    set(path: PropertyPath | PropertyName, val: unknown) {
      set(_config, transformDeprecatedPaths(path), val);
      return this;
    },
    has(path: PropertyPath | PropertyName) {
      return has(_config, path);
    },
  };
};
