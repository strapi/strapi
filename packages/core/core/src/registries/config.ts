import type { Core } from '@strapi/types';
import { get, set, has, isString, isNumber, isArray, type PropertyPath } from 'lodash';

type Config = Record<string, unknown>;

export default (
  initialConfig = {},
  strapi?: Core.Strapi | Core.LoadedStrapi
): Core.ConfigProvider => {
  const _config: Config = { ...initialConfig }; // not deep clone because it would break some config

  // Accessing model configs with dot (.) was deprecated between v4->v5, but to avoid a major breaking change
  // we will still support certain namespaces, currently only 'plugin.'
  const transformPathString = (path: string) => {
    if (path.startsWith('plugin.')) {
      const newPath = path.replace('plugin.', 'plugin::');

      // strapi logger may not be loaded yet, so fall back to console
      (strapi?.log?.warn ?? console.warn)(
        `Using dot notation for model config namespaces is deprecated, for example "plugin::myplugin" should be used instead of "plugin.myplugin". Modifying requested path ${path} to ${newPath}`
      );
      return newPath;
    }

    return path;
  };

  const transformDeprecatedPaths = (path: PropertyPath): PropertyPath => {
    if (isString(path)) {
      return transformPathString(path);
    }
    if (isArray(path)) {
      // if the path is not joinable, we won't apply our deprecation support
      if (path.some((part) => !(isString(part) || isNumber(part)))) {
        return path;
      }

      return transformPathString(path.join('.'));
    }

    return path;
  };

  return {
    ..._config, // TODO: to remove
    get(path: PropertyPath, defaultValue?: unknown) {
      return get(_config, transformDeprecatedPaths(path), defaultValue);
    },
    set(path: PropertyPath, val: unknown) {
      set(_config, transformDeprecatedPaths(path), val);
      return this;
    },
    has(path: PropertyPath) {
      return has(_config, transformDeprecatedPaths(path));
    },
  };
};
