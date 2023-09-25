import type { Common } from '..';

export type Plugin = Omit<Common.Module, 'routes'> & {
  routes: Common.Route[] | Record<string, Common.Router>;
  [key: string]: any;
};
