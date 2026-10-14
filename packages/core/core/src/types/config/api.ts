import type { Core } from '@strapi/types';

type RestConfig = NonNullable<Core.Config.Api['rest']>;

/**
 * The `api` config that `strapi.config.get('api')` returns, with loader defaults.
 * Input type, what applications write in `config/api.ts`: {@link Core.Config.Api}.
 * `loadConfiguration` (`src/configuration/index.ts`) merges `defaultConfig.api` under the user config,
 * so `rest` and `rest.prefix` (`'/api'`) are always defined. Other fields stay as in the input type.
 */
export type Api = Omit<Core.Config.Api, 'rest'> & {
  rest: RestConfig & Required<Pick<RestConfig, 'prefix'>>;
};
