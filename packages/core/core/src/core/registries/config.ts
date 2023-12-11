import type { ConfigProvider } from '@strapi/types';
import _, { PropertyName } from 'lodash';

type Config = Record<string, unknown>;

export default (initialConfig = {}): ConfigProvider => {
  const _config: Config = { ...initialConfig }; // not deep clone because it would break some config

  return {
    ..._config, // TODO: to remove
    get(path: PropertyName, defaultValue?: unknown) {
      return _.get(_config, path, defaultValue);
    },
    set(path: PropertyName, val: unknown) {
      _.set(_config, path, val);
      return this;
    },
    has(path: PropertyName) {
      return _.has(_config, path);
    },
  };
};
