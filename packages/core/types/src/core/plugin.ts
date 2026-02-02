import type { Module, Route, Router } from '.';

export type Plugin = Omit<Module, 'routes'> & {
  routes: Route[] | Record<string, Router>;
  [key: string]: any;
};
